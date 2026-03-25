/**
 * assets/js/modules/ai-chat.js
 * ───
 * Modul Antarmuka Chatbot AI IoTzy.
 * Menangani interaksi chat, pengiriman perintah NL ke backend,
 * visualisasi respon pembicaraan, dan eksekusi instruksi UI dari AI.
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ── Referensi elemen DOM ── */
    const chatBtn   = document.getElementById('aiChatBtn');
    const chatModal = document.getElementById('aiChatModal');
    const chatClose = document.getElementById('aiChatClose');
    const chatClear = document.getElementById('aiChatClear');
    const chatInput = document.getElementById('aiChatInput');
    const chatSend  = document.getElementById('aiChatSend');
    const chatBody  = document.getElementById('aiChatBody');

    if (!chatBtn || !chatModal) return;

    // Timeout harus lebih panjang dari CURLOPT_TIMEOUT di PHP (120s)
    const FETCH_TIMEOUT_MS = 130_000;

    /* ── Tampilkan tombol chat setelah load ── */
    window.addEventListener('load', () => {
        setTimeout(() => {
            chatBtn.classList.remove('hidden');
            chatBtn.style.opacity = '1';
        }, 500);
    });

    /* ── Toggle modal ── */
    chatBtn.addEventListener('click', () => {
        openModal('aiChatModal');
        if (chatModal.classList.contains('show')) {
            chatInput.focus();
            loadChatHistory();
        }
    });

    chatClose.addEventListener('click', () => {
        closeModal('aiChatModal');
        chatModal.classList.remove('active');
        chatBtn.classList.remove('active');
    });

    // Auto-load history 2 detik setelah halaman siap
    setTimeout(loadChatHistory, 2000);

    /* ── Load Riwayat Chat dari Server ── */
    async function loadChatHistory() {
        if (chatBody.getAttribute('data-loaded') === 'true') return;

        try {
            const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
            const res  = await fetch(`${base}/api/data_router.php?action=get_ai_chat_history`, {
                headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success && Array.isArray(data.history) && data.history.length > 0) {
                data.history.forEach(chat => appendMessage(chat.message, chat.sender));
                chatBody.setAttribute('data-loaded', 'true');
                scrollToBottom();
            }
        } catch (e) {
            console.warn('[IoTzy AI] Gagal memuat riwayat chat:', e);
        }
    }

    /* ── Hapus Riwayat ── */
    if (chatClear) {
        chatClear.addEventListener('click', async () => {
            if (!confirm('Hapus seluruh riwayat percakapan dengan AI?')) return;
            try {
                const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
                const res = await fetch(`${base}/api/data_router.php?action=delete_chat_history`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (data.success) {
                    chatBody.innerHTML = `
                        <div class="chat-bubble bot">
                            Riwayat dihapus. Ada yang bisa saya bantu? 😊
                        </div>`;
                    chatBody.setAttribute('data-loaded', 'false');
                    showToast('Riwayat chat berhasil dihapus', 'success');
                } else {
                    showToast(data.error || 'Gagal menghapus riwayat', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Gagal terhubung ke server', 'error');
            }
        });
    }

    /* ── Event Listener Kirim Pesan ── */
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    /* ── Kirim Pesan ke Backend ── */
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value    = '';
        chatInput.disabled = true;
        chatSend.disabled  = true;
        chatSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const loadingBubble = createLoadingBubble();
        chatBody.appendChild(loadingBubble);
        scrollToBottom();

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
            const response = await fetch(`${base}/api/data_router.php?action=ai_chat_process`, {
                method:  'POST',
                signal:  controller.signal,
                credentials: "include",
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': CSRF_TOKEN,
                },
                body: JSON.stringify({
                    message: text,
                    session_start: (typeof STATE !== 'undefined') ? STATE.sessionStart : null,
                    cv_state: (typeof STATE !== 'undefined') ? {
                        active: STATE.camera?.active || false,
                        personCount: STATE.cv?.personCount || 0,
                        brightness: STATE.cv?.brightness || 0,
                        lightCondition: STATE.cv?.lightCondition || 'unknown'
                    } : null
                }),
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            loadingBubble.remove();

            if (data.success) {
                const botText = data.data?.response_text
                             || data.response_text
                             || data.message
                             || 'Perintah telah diproses.';

                appendMessage(botText, 'bot');

                const uiAction = data.data?.ui_action || data.ui_action || 'none';
                if (uiAction && uiAction !== 'none') {
                    handleUIAction(uiAction);
                }

                const states = data.data?.execution?.device_states || {};
                for (const [id, val] of Object.entries(states)) {
                    if (typeof applyDeviceState === 'function') {
                        applyDeviceState(id, (val === 1), "AI Assistant (Sync)");
                    }
                }

                const executed = data.data?.execution?.executed || [];
                executed.forEach(ex => {
                    if (ex.startsWith("cv_action:")) {
                        const act = ex.split(":")[1];
                        if (act === "load_model" && typeof initializeCV === 'function') {
                            initializeCV();
                        } else if (act === "start_detection" && typeof startCVDetection === 'function') {
                            startCVDetection();
                        } else if (act === "stop_detection" && typeof stopCVDetection === 'function') {
                            stopCVDetection();
                        }
                    }
                    if (ex.startsWith("nav:")) {
                        const p = ex.split(":")[1];
                        handleUIAction('navigate_' + p);
                    }
                    if (ex === "reset_all") {
                        if (typeof showToast === 'function') showToast("Sistem berhasil di-reset!", "success");
                        setTimeout(() => window.location.reload(), 1500);
                    }
                    if (["profile", "thresholds", "builtin", "mqtt", "telegram"].includes(ex)) {
                        if (typeof showToast === 'function') showToast("Pengaturan diperbarui", "success");
                    }
                    if (ex === "camera:1" && !STATE.camera.active) {
                        if (typeof toggleCameraFocus === 'function') toggleCameraFocus();
                    }
                    if (ex === "camera:0" && STATE.camera.active) {
                        if (typeof toggleCameraFocus === 'function') toggleCameraFocus();
                    }
                });

                setTimeout(refreshDeviceData, 500);

            } else {
                const errMsg = data.error || 'Terjadi kesalahan yang tidak diketahui.';
                appendMessage(`⚠️ ${errMsg}`, 'bot error');
            }

        } catch (err) {
            clearTimeout(timeoutId);
            loadingBubble.remove();

            if (err.name === 'AbortError') {
                appendMessage(
                    '⏳ AI sedang berpikir keras tapi membutuhkan waktu lebih lama dari biasanya. '
                  + 'Perintah Anda sudah saya terima — mungkin sedang diproses di latar belakang. '
                  + 'Coba cek halaman yang relevan atau kirim perintah lagi ya! 🙏',
                    'bot'
                );
            } else {
                appendMessage(
                    `🌐 Gagal terhubung ke server: ${err.message}. Periksa koneksi internet Anda.`,
                    'bot error'
                );
            }
            console.error('[IoTzy AI] Fetch error:', err);

        } finally {
            chatInput.disabled = false;
            chatSend.disabled  = false;
            chatSend.innerHTML = '<i class="fas fa-paper-plane"></i>';
            chatInput.focus();
        }
    }

    /* ── Buat bubble loading dengan animasi titik ── */
    function createLoadingBubble() {
        const bubble  = document.createElement('div');
        bubble.className = 'chat-bubble bot loading-bubble';

        bubble.innerHTML = `
            <span class="ai-thinking-label">AI sedang berpikir</span>
            <span class="ai-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>`;

        if (!document.getElementById('ai-dots-style')) {
            const style = document.createElement('style');
            style.id    = 'ai-dots-style';
            style.textContent = `
                .ai-dots span {
                    animation: ai-dot-blink 1.4s infinite;
                    opacity: 0;
                    font-size: 1.4em;
                    line-height: 1;
                }
                .ai-dots span:nth-child(2) { animation-delay: 0.2s; }
                .ai-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes ai-dot-blink {
                    0%,80%,100% { opacity: 0; }
                    40%         { opacity: 1; }
                }
                .ai-thinking-label { font-size: 0.85em; opacity: 0.7; margin-right: 2px; }
            `;
            document.head.appendChild(style);
        }

        return bubble;
    }

    /* ── Tambah bubble chat ke UI ── */
    function appendMessage(text, sender) {
        if (!text || String(text).trim() === '') return null;

        const esc = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const html = esc(text).replace(/\n/g, '<br>');

        const bubble       = document.createElement('div');
        bubble.className   = `chat-bubble ${sender}`;
        bubble.innerHTML   = html;
        chatBody.appendChild(bubble);
        scrollToBottom();
        return bubble;
    }

    function scrollToBottom() {
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    /* ── Tangani instruksi UI dari AI ── */
    function handleUIAction(action) {
        if (action === 'refresh') {
            setTimeout(() => window.location.reload(), 800);
            return;
        }
        if (action.startsWith('navigate_')) {
            const page = action.replace('navigate_', '');
            if (typeof navigateTo === 'function') {
                setTimeout(() => navigateTo(page), 400);
            } else if (typeof loadPage === 'function') {
                setTimeout(() => loadPage(page), 400);
            }
        }
    }

    /* ── Refresh data perangkat setelah aksi ── */
    function refreshDeviceData() {
        if (typeof syncDevicesFromServer    === 'function') syncDevicesFromServer();
        if (typeof syncSensorsFromServer    === 'function') syncSensorsFromServer();
        if (typeof syncAutomationFromServer === 'function') syncAutomationFromServer();
        if (typeof syncCVConfigFromServer   === 'function') syncCVConfigFromServer();

        ['fetchOverviewData', 'refreshDevices', 'loadDashboard'].forEach(fn => {
            if (typeof window[fn] === 'function') {
                try { window[fn](); } catch {}
            }
        });
    }

});
