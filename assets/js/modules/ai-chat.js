document.addEventListener('DOMContentLoaded', () => {
    const chatBtn   = document.getElementById('aiChatBtn');
    const chatModal = document.getElementById('aiChatModal');
    const chatClose = document.getElementById('aiChatClose');
    const chatClear = document.getElementById('aiChatClear');
    const chatInput = document.getElementById('aiChatInput');
    const chatSend  = document.getElementById('aiChatSend');
    const chatBody  = document.getElementById('aiChatBody');
    if (!chatBtn || !chatModal) return;
    const FETCH_TIMEOUT_MS = 130_000;

    window.addEventListener('load', () => { setTimeout(() => { chatBtn.classList.remove('hidden'); chatBtn.style.opacity = '1'; }, 500); });
    chatBtn.addEventListener('click', () => { openModal('aiChatModal'); if (chatModal.classList.contains('show')) { chatInput.focus(); loadChatHistory(); } });
    chatClose.addEventListener('click', () => { closeModal('aiChatModal'); chatModal.classList.remove('active'); chatBtn.classList.remove('active'); });
    setTimeout(loadChatHistory, 2000);

    async function loadChatHistory() {
        if (chatBody.getAttribute('data-loaded') === 'true') return;
        try {
            const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
            const res  = await fetch(`${base}/api/router.php?action=get_ai_chat_history`, { headers: { 'X-CSRF-TOKEN': CSRF_TOKEN }, credentials: 'include' });
            const data = await res.json();
            if (data.success && Array.isArray(data.history) && data.history.length > 0) {
                data.history.forEach(chat => appendMessage(chat.message, chat.sender));
                chatBody.setAttribute('data-loaded', 'true'); scrollToBottom();
            }
        } catch (e) { console.warn('[IoTzy AI] Gagal memuat riwayat chat:', e); }
    }

    if (chatClear) {
        chatClear.addEventListener('click', async () => {
            if (!confirm('Hapus seluruh riwayat percakapan?')) return;
            try {
                const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
                const res = await fetch(`${base}/api/router.php?action=delete_chat_history`, { method: 'POST', headers: { 'X-CSRF-TOKEN': CSRF_TOKEN }, credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    chatBody.innerHTML = `<div class="chat-bubble bot">Riwayat dihapus. Ada yang bisa saya bantu? 😊</div>`;
                    chatBody.setAttribute('data-loaded', 'false'); showToast('Riwayat chat dihapus', 'success');
                } else showToast(data.error || 'Gagal menghapus', 'error');
            } catch (err) { console.error(err); showToast('Gagal terhubung', 'error'); }
        });
    }

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    async function sendMessage() {
        const text = chatInput.value.trim(); if (!text) return;
        appendMessage(text, 'user');
        chatInput.value = ''; chatInput.disabled = true; chatSend.disabled = true;
        chatSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const loading = createLoadingBubble(); chatBody.appendChild(loading); scrollToBottom();
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : "");
            const res = await fetch(`${base}/api/router.php?action=ai_chat_process`, {
                method: 'POST', signal: controller.signal, credentials: "include",
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': CSRF_TOKEN },
                body: JSON.stringify({ message: text, session_start: (typeof STATE !== 'undefined') ? STATE.sessionStart : null, cv_state: (typeof STATE !== 'undefined') ? { active: STATE.camera?.active || false, personCount: STATE.cv?.personCount || 0, brightness: STATE.cv?.brightness || 0, lightCondition: STATE.cv?.lightCondition || 'unknown' } : null }),
            });
            clearTimeout(timeout); const data = await res.json(); loading.remove();
            if (data.success) {
                appendMessage(data.data?.response_text || data.response_text || data.message || 'Diproses.', 'bot');
                const ui = data.data?.ui_action || data.ui_action || 'none'; if (ui !== 'none') handleUIAction(ui);
                const s = data.data?.execution?.device_states || {};
                for (const [id, val] of Object.entries(s)) { if (typeof applyDeviceState === 'function') applyDeviceState(id, (val === 1), "AI Assistant (Sync)"); }
                const ex = data.data?.execution?.executed || [];
                ex.forEach(e => {
                    if (e.startsWith("cv_action:")) {
                        const a = e.split(":")[1];
                        if (a === "load_model" && typeof initializeCV === 'function') initializeCV();
                        else if (a === "start_detection" && typeof startCVDetection === 'function') startCVDetection();
                        else if (a === "stop_detection" && typeof stopCVDetection === 'function') stopCVDetection();
                    }
                    if (e.startsWith("nav:")) handleUIAction('navigate_' + e.split(":")[1]);
                    if (e === "reset_all") { showToast("Sistem di-reset!", "success"); setTimeout(() => window.location.reload(), 1500); }
                    if (e === "camera:1" && !STATE.camera.active && typeof toggleCameraFocus === 'function') toggleCameraFocus();
                    if (e === "camera:0" && STATE.camera.active && typeof toggleCameraFocus === 'function') toggleCameraFocus();
                });
                setTimeout(refreshData, 500);
            } else appendMessage(`⚠️ ${data.error || 'Error unknown'}`, 'bot error');
        } catch (err) {
            clearTimeout(timeout); loading.remove();
            if (err.name === 'AbortError') appendMessage('⏳ AI membutuhkan waktu lebih lama. Cek status perangkat nanti ya! 🙏', 'bot');
            else appendMessage(`🌐 Koneksi gagal: ${err.message}`, 'bot error');
        } finally { chatInput.disabled = false; chatSend.disabled = false; chatSend.innerHTML = '<i class="fas fa-paper-plane"></i>'; chatInput.focus(); }
    }

    function createLoadingBubble() {
        const b = document.createElement('div'); b.className = 'chat-bubble bot loading-bubble';
        b.innerHTML = `<span class="ai-thinking-label">AI sedang berpikir</span><span class="ai-dots"><span>.</span><span>.</span><span>.</span></span>`;
        if (!document.getElementById('ai-dots-style')) {
            const s = document.createElement('style'); s.id = 'ai-dots-style';
            s.textContent = `.ai-dots span { animation: ai-dot-blink 1.4s infinite; opacity: 0; font-size: 1.4em; } .ai-dots span:nth-child(2) { animation-delay: 0.2s; } .ai-dots span:nth-child(3) { animation-delay: 0.4s; } @keyframes ai-dot-blink { 0%,80%,100% { opacity: 0; } 40% { opacity: 1; } } .ai-thinking-label { font-size: 0.85em; opacity: 0.7; }`;
            document.head.appendChild(s);
        }
        return b;
    }

    function appendMessage(text, sender) {
        if (!text || !text.trim()) return null;
        const b = document.createElement('div'); b.className = `chat-bubble ${sender}`;
        b.innerHTML = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
        chatBody.appendChild(b); scrollToBottom(); return b;
    }
    function scrollToBottom() { chatBody.scrollTop = chatBody.scrollHeight; }
    function handleUIAction(a) { if (a === 'refresh') setTimeout(() => window.location.reload(), 800); else if (a.startsWith('navigate_')) { const p = a.replace('navigate_', ''); if (typeof navigateTo === 'function') setTimeout(() => navigateTo(p), 400); } }
    function refreshData() { ['fetchOverviewData', 'refreshDevices', 'loadDashboard'].forEach(fn => { if (typeof window[fn] === 'function') try { window[fn](); } catch {} }); }
});
