

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
        if (chatModal.classList.contains('show')) {
            chatInput.focus();
            loadChatHistory();
        }
    });

    chatClose.addEventListener('click', () => {
        closeModal('aiChatModal');
    });

    // Auto-load history 2 detik setelah halaman siap
    setTimeout(loadChatHistory, 2000);

    /* ════════════════════════════════════════════════════
       LOAD RIWAYAT CHAT DARI SERVER
       ════════════════════════════════════════════════════ */
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

    /* ════════════════════════════════════════════════════
       HAPUS RIWAYAT
       ════════════════════════════════════════════════════ */
    if (chatClear) {
        chatClear.addEventListener('click', async () => {
            if (!confirm('Hapus seluruh riwayat percakapan dengan AI?')) return;
            try {
                const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
                await fetch(`${base}/api/data_router.php?action=delete_chat_history`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
                    credentials: 'include'
                });
                chatBody.innerHTML = `
                    <div class="chat-bubble bot">
                        Riwayat dihapus. Ada yang bisa saya bantu? 😊
                    </div>`;
                chatBody.setAttribute('data-loaded', 'false');
            } catch {
                showToast('Gagal menghapus riwayat', 'error');
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

        // Bubble loading animasi
        const loadingBubble = createLoadingBubble();
        chatBody.appendChild(loadingBubble);
        scrollToBottom();

        // AbortController untuk timeout manual
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
            const response = await fetch(`${base}/api/data_router.php`, {
                method:  'POST',
                signal:  controller.signal,
                credentials: "include", // 🔑 CRITICAL
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': CSRF_TOKEN,
                },
                body: JSON.stringify({
                    action:  'ai_chat_process',
                    command: text,
                }),
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            loadingBubble.remove();

            if (data.success) {
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

                // Refresh data perangkat jika ada aksi immediate
                const actions = data.data?.actions || [];
                if (actions.some(a => a.type === 'immediate')) {
                    refreshDeviceData();
                }

            } else {
                // Error dari server tapi HTTP OK
                const errMsg = data.error || 'Terjadi kesalahan yang tidak diketahui.';
                appendMessage(`⚠️ ${errMsg}`, 'bot error');
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

        // 🔥 FIX: Jangan escape HTML supaya tag seperti <b>, <i>, <br> dari AI bisa jalan.
        // Kita cukup bersihkan karakter yang benar-benar berbahaya jika perlu, 
        // tapi dalam konteks AI asisten internal, kita percayakan tag standar.
        let html = String(text)
            .replace(/\n/g, '<br>') // Konversi newline ke <br>
            .replace(/(?:^|<br>)\s*[-*•]\s+(.*)/g, '<br>• $1'); // Simple list formatting

        const bubble       = document.createElement('div');
        bubble.className   = `chat-bubble ${sender}`;
        bubble.innerHTML   = html; // Render sebagai HTML!
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
            setTimeout(() => window.location.reload(), 800);
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
        // Coba panggil fungsi refresh global yang umum digunakan
        ['fetchOverviewData', 'refreshDevices', 'loadDashboard'].forEach(fn => {
            if (typeof window[fn] === 'function') {
                try { window[fn](); } catch {}
            }
        });
    }

});