/**
 * public/assets/js/modules/ai-chat.js
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

    // Konstanta timeout — harus lebih panjang dari CURLOPT_TIMEOUT di PHP (120s)
    const FETCH_TIMEOUT_MS = 130_000; // 130 detik

    /* ── Tampilkan tombol chat setelah halaman load ── */
    window.addEventListener('load', () => {
        setTimeout(() => {
            chatBtn.classList.remove('hidden');
            chatBtn.style.opacity = '1';
        }, 500);
    });

    /* ── Toggle modal ── */
    chatBtn.addEventListener('click', () => {
        openModal('aiChatModal');
        // Pastikan history dimuat sekali dan selalu scroll ke pesan terbaru saat modal dibuka
        loadChatHistory();
        chatInput.focus();
        setTimeout(() => {
            if (typeof chatBody.scrollHeight === 'number') {
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }, 0);
    });

    chatClose.addEventListener('click', () => {
        closeModal('aiChatModal');
        chatModal.classList.remove('active');
        chatBtn.classList.remove('active');
    });

    // Auto-load history 2 detik setelah halaman siap
    setTimeout(loadChatHistory, 2000);

    /* ════════════════════════════════════════════════════
       LOAD RIWAYAT CHAT DARI SERVER
       ════════════════════════════════════════════════════ */
    async function loadChatHistory() {
        if (chatBody.getAttribute('data-loaded') === 'true') return;

        try {
            const data = await apiPost('get_ai_chat_history');

            if (data.success && Array.isArray(data.history) && data.history.length > 0) {
                data.history.forEach(chat => appendMessage(chat.message, chat.sender));
                chatBody.setAttribute('data-loaded', 'true');
                scrollToBottom();
            }
        } catch (e) {
            console.warn('[IoTzy AI] Gagal memuat riwayat chat:', e);
        }
    }

    /* ════════════════════════════════════════════════════
       HAPUS RIWAYAT
       ════════════════════════════════════════════════════ */
    if (chatClear) {
        chatClear.addEventListener('click', async () => {
            if (!confirm('Hapus seluruh riwayat percakapan dengan AI?')) return;
            try {
                const data = await apiPost('delete_chat_history');
                if (data && data.success) {
                    chatBody.innerHTML = `
                        <div class="chat-bubble bot">
                            Riwayat dihapus. Ada yang bisa saya bantu? 😊
                        </div>`;
                    chatBody.setAttribute('data-loaded', 'false');
                    showToast('Riwayat chat berhasil dihapus', 'success');
                } else {
                    showToast((data && data.error) || 'Gagal menghapus riwayat', 'error');
                }
            } catch (err) {
                console.error('[AI Chat Clear]', err);
                showToast('Gagal terhubung ke server', 'error');
            }
        });
    }

    /* ════════════════════════════════════════════════════
       EVENT LISTENER KIRIM PESAN
       ════════════════════════════════════════════════════ */
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function normalizeText(v) {
        return String(v || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    }

    function findDeviceByQuery(query) {
        const q = normalizeText(query);
        const devices = Object.values((window.STATE && window.STATE.devices) || {});
        if (!q || !devices.length) return null;
        const scored = devices.map((d) => {
            const name = normalizeText(d.name || '');
            const type = normalizeText(d.type || d.template_device_type || '');
            let score = 0;
            if (name === q) score += 100;
            if (name.includes(q)) score += 70;
            q.split(' ').forEach(t => { if (t && name.includes(t)) score += 10; });
            if (q.includes('lamp') && (type.includes('light') || name.includes('lamp'))) score += 20;
            if (q.includes('kipas') && (type.includes('fan') || name.includes('kipas'))) score += 20;
            if (q.includes('kunci') && (type.includes('lock') || name.includes('kunci'))) score += 20;
            return { d, score };
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
        return scored[0]?.d || null;
    }

    function fastHandleCommand(rawText) {
        const text = normalizeText(rawText);
        if (!text) return { handled: false };

        const isOnCmd = /^(nyalakan|hidupkan|turn on|on)\b/.test(text);
        const isOffCmd = /^(matikan|turn off|off)\b/.test(text);
        const isStatusCmd = /^(cek status|status|check status)\b/.test(text) || /\bstatus\b/.test(text);

        if (isOnCmd || isOffCmd) {
            const target = text.replace(/^(nyalakan|hidupkan|matikan|turn on|turn off|on|off)\b/, '').trim();
            const turnOn = isOnCmd;
            const allTarget = /\b(semua|all)\b/.test(target);
            const devicesObj = (window.STATE && window.STATE.devices) || {};
            const ids = Object.keys(devicesObj);

            if (!ids.length) {
                return { handled: true, reply: 'Belum ada perangkat yang bisa dikontrol.' };
            }

            if (allTarget) {
                const list = Object.values(devicesObj).filter(d => {
                    const n = normalizeText(d.name || '');
                    const t = normalizeText(d.type || d.template_device_type || '');
                    if (target.includes('lamp') || target.includes('lampu')) return t.includes('light') || n.includes('lamp');
                    if (target.includes('kipas')) return t.includes('fan') || n.includes('kipas');
                    return true;
                });
                list.forEach(d => {
                    const id = String(d.id);
                    if (typeof toggleDeviceState === 'function') toggleDeviceState(id, turnOn);
                });
                return { handled: true, refresh: true, reply: `${turnOn ? 'Menyalakan' : 'Mematikan'} ${list.length} perangkat secara instan.` };
            }

            const device = findDeviceByQuery(target);
            if (!device) {
                return { handled: true, reply: `Perangkat "${target || 'tersebut'}" tidak ditemukan.` };
            }
            const id = String(device.id);
            if (typeof toggleDeviceState === 'function') toggleDeviceState(id, turnOn);
            return { handled: true, refresh: true, reply: `${device.name} langsung ${turnOn ? 'dinyalakan' : 'dimatikan'}.` };
        }

        if (isStatusCmd) {
            const target = text.replace(/^(cek status|status|check status)\b/, '').trim();
            const devicesObj = (window.STATE && window.STATE.devices) || {};
            const states = (window.STATE && window.STATE.deviceStates) || {};
            const ids = Object.keys(devicesObj);
            if (!ids.length) return { handled: true, reply: 'Belum ada perangkat terdaftar.' };

            if (!target || /\b(semua|all)\b/.test(target)) {
                const lines = ids.slice(0, 8).map((id) => {
                    const d = devicesObj[id];
                    return `• ${d.name}: ${states[id] ? 'ON' : 'OFF'}`;
                });
                return { handled: true, reply: `Status cepat:\n${lines.join('\n')}` };
            }

            const d = findDeviceByQuery(target);
            if (!d) return { handled: true, reply: `Perangkat "${target}" tidak ditemukan.` };
            return { handled: true, reply: `${d.name} saat ini ${states[String(d.id)] ? 'ON' : 'OFF'}.` };
        }

        return { handled: false };
    }

    /* ════════════════════════════════════════════════════
       KIRIM PESAN KE BACKEND
       ════════════════════════════════════════════════════ */
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Tampilkan pesan user
        appendMessage(text, 'user');
        chatInput.value    = '';
        chatInput.disabled = true;
        chatSend.disabled  = true;
        chatSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const fast = fastHandleCommand(text);
        if (fast.handled) {
            appendMessage(fast.reply, 'bot');
            if (fast.refresh) {
                setTimeout(() => {
                    if (typeof refreshDeviceData === 'function') refreshDeviceData();
                    if (typeof syncAllFromServer === 'function') syncAllFromServer(true);
                }, 0);
            }
            chatInput.disabled = false;
            chatSend.disabled  = false;
            chatSend.innerHTML = '<i class="fas fa-paper-plane"></i>';
            chatInput.focus();
            return;
        }

        // Bubble loading animasi
        const loadingBubble = createLoadingBubble();
        chatBody.appendChild(loadingBubble);
        scrollToBottom();

        // AbortController untuk timeout manual
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const data = await apiPost('ai_chat_process', {
                message: text,
                session_start: (typeof STATE !== 'undefined') ? STATE.sessionStart : null,
                cv_state: (typeof STATE !== 'undefined') ? {
                    active: STATE.camera?.active || false,
                    personCount: STATE.cv?.personCount || 0,
                    brightness: STATE.cv?.brightness || 0,
                    lightCondition: STATE.cv?.lightCondition || 'unknown'
                } : null
            }, { key: `ai_chat_${Date.now()}`, timeout: FETCH_TIMEOUT_MS, refresh: false });
            
            clearTimeout(timeoutId);
            loadingBubble.remove();

            if (data && data.success === true) {
                // Ambil response_text dari dalam data.data (sesuai struktur PHP)
                const botText = data.data?.response_text
                             || data.response_text
                             || data.message
                             || 'Perintah telah diproses.';

                appendMessage(botText, 'bot');

                // Jalankan ui_action jika ada
                const uiAction = data.data?.ui_action || data.ui_action || 'none';
                if (uiAction && uiAction !== 'none') {
                    handleUIAction(uiAction);
                }

                // 🔥 FIX: Jalankan applyDeviceState untuk tiap hasil eksekusi AI
                const states = data.data?.execution?.device_states || {};
                for (const [id, val] of Object.entries(states)) {
                    if (typeof applyDeviceState === 'function') {
                        applyDeviceState(id, (val === 1), "AI Assistant (Sync)");
                    }
                }

                // 🔥 CV/Camera/Navigation Actions
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
                    if (ex === "profile" || ex === "thresholds" || ex === "builtin" || ex === "mqtt" || ex === "telegram") {
                        if (typeof showToast === 'function') showToast("Pengaturan diperbarui", "success");
                    }
                    if (ex === "camera:1" && !STATE.camera.active) {
                        if (typeof toggleCameraFocus === 'function') toggleCameraFocus();
                    }
                    if (ex === "camera:0" && STATE.camera.active) {
                        if (typeof toggleCameraFocus === 'function') toggleCameraFocus();
                    }
                });

                // Refresh data perangkat segera agar MQTT punya waktu broadcast
                setTimeout(refreshDeviceData, 100);

                // Paksa sinkronisasi full segera untuk menangkap perangkat/rule baru
                if (typeof syncAllFromServer === 'function') syncAllFromServer(true);

            } else {
                const raw = String(data && data.error || '');
                const friendly = /aborted/i.test(raw)
                  ? '⏳ Koneksi dibatalkan sebelum jawaban selesai. Coba kirim ulang pesan, atau tunggu sebentar.'
                  : (raw || 'Terjadi kesalahan yang tidak diketahui.');
                appendMessage(friendly, 'bot error');
            }

        } catch (err) {
            clearTimeout(timeoutId);
            loadingBubble.remove();

            if (err.name === 'AbortError') {
                // Timeout manual dari AbortController
                appendMessage(
                    '⏳ AI sedang berpikir keras tapi membutuhkan waktu lebih lama dari biasanya. '
                  + 'Perintah Anda sudah saya terima — mungkin sedang diproses di latar belakang. '
                  + 'Coba cek halaman yang relevan atau kirim perintah lagi ya! 🙏',
                    'bot'
                );
            } else {
                // Network error lainnya
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

    /* ════════════════════════════════════════════════════
       HELPER: Buat bubble loading dengan animasi titik
       ════════════════════════════════════════════════════ */
    function createLoadingBubble() {
        const bubble  = document.createElement('div');
        bubble.className = 'chat-bubble bot loading-bubble';

        // Animasi titik bergerak (CSS dots)
        bubble.innerHTML = `
            <span class="ai-thinking-label">AI sedang berpikir</span>
            <span class="ai-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>`;

        // Tambahkan style animasi jika belum ada
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

    /* ════════════════════════════════════════════════════
       HELPER: Tambah bubble chat ke UI
       ════════════════════════════════════════════════════ */
    function appendMessage(text, sender) {
        if (!text || String(text).trim() === '') return null;

        // Security: Whitelist tag HTML aman (b, i, u, code, br) 
        // Melindungi dari XSS sambil tetap mengizinkan formatting dasar.
        const esc = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        let html = esc(text)
            .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
            .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<b>$1</b>')
            .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
            .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, '<i>$1</i>')
            .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, '<em>$1</em>')
            .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>')
            .replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/gi, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        const bubble       = document.createElement('div');
        bubble.className   = `chat-bubble ${sender}`;
        bubble.innerHTML   = html;
        chatBody.appendChild(bubble);
        scrollToBottom();
        return bubble;
    }

    /* ════════════════════════════════════════════════════
       HELPER: Scroll ke bawah
       ════════════════════════════════════════════════════ */
    function scrollToBottom() {
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    /* ════════════════════════════════════════════════════
       HELPER: Tangani instruksi UI dari AI
       ════════════════════════════════════════════════════ */
    function handleUIAction(action) {
        if (action === 'refresh') {
            // Ganti reload dengan sinkronisasi pintar
            if (typeof refreshDeviceData === 'function') refreshDeviceData();
            if (typeof syncAllFromServer === 'function') syncAllFromServer(true);
            return;
        }
        if (action.startsWith('navigate_')) {
            const page = action.replace('navigate_', '');
            // Coba gunakan fungsi navigasi SPA jika tersedia
            if (typeof navigateTo === 'function') {
                setTimeout(() => navigateTo(page), 400);
            } else if (typeof loadPage === 'function') {
                setTimeout(() => loadPage(page), 400);
            }
            // Kalau tidak ada fungsi navigasi, biarkan — tidak error
        }
    }

    /* ════════════════════════════════════════════════════
       HELPER: Refresh data perangkat setelah aksi immediate
       ════════════════════════════════════════════════════ */
    function refreshDeviceData() {
        // Coba panggil fungsi sinkronisasi dari app.js
        if (typeof syncDevicesFromServer === 'function') syncDevicesFromServer();
        if (typeof syncSensorsFromServer === 'function') syncSensorsFromServer();
        if (typeof syncAutomationFromServer === 'function') syncAutomationFromServer();
        if (typeof syncCVConfigFromServer === 'function') syncCVConfigFromServer();

        // Fallback untuk fungsi lama jika ada
        ['fetchOverviewData', 'refreshDevices', 'loadDashboard'].forEach(fn => {
            if (typeof window[fn] === 'function') {
                try { window[fn](); } catch {}
            }
        });
    }

});
