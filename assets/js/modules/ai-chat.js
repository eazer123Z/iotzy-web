/**
 * public/assets/js/modules/ai-chat.js
 * ───
 * Modul Antarmuka Chatbot AI IoTzy.
 * Menangani interaksi chat, pengiriman perintah NL ke backend,
 * visualisasi respon pembicaraan, dan eksekusi instruksi UI dari AI.
 *
 * Changelog v2:
 *  - DOMPurify dengan fallback escape untuk XSS prevention
 *  - Fast-track simpan history ke server (fire-and-forget)
 *  - buildCvStatePayload() dengan sanitasi nilai
 *  - requestAIWithRetry() dengan exponential backoff
 *  - waitForMqttSync() berbasis event iotzy:mqtt-publish
 *  - Validasi panjang pesan di sisi klien
 *  - Timeout JS disesuaikan dengan PHP (120s)
 *  - Retry JS tidak double-retry dengan retry PHP
 */

function initAiChatModule() {
    if (window.__IOTZY_AI_CHAT_READY) return;
    window.__IOTZY_AI_CHAT_READY = true;

    /* ── Referensi elemen DOM ── */
    const chatBtn   = document.getElementById('aiChatBtn');
    const chatModal = document.getElementById('aiChatModal');
    const chatClose = document.getElementById('aiChatClose');
    const chatClear = document.getElementById('aiChatClear');
    const chatInput = document.getElementById('aiChatInput');
    const chatSend  = document.getElementById('aiChatSend');
    const chatBody  = document.getElementById('aiChatBody');

    if (!chatBtn || !chatModal) return;

    /* ── Konstanta ── */
    const FETCH_TIMEOUT_MS        = 120_000; // Selaras dengan PHP AI_TIMEOUT_SECONDS
    const MAX_CHAT_MESSAGE_LENGTH = 2000;    // Selaras dengan PHP AI_CHAT_MAX_MESSAGE_LEN
    // Retry hanya 1x di JS — PHP sudah retry di sisi server (AI_MAX_RETRIES=3)
    // Sehingga worst case = 1 JS retry × 3 PHP retries = 3 API call, bukan 9
    const AI_JS_RETRY_MAX         = 1;

    /* ════════════════════════════════════════════════════
       INIT: Tampilkan tombol setelah halaman load
       ════════════════════════════════════════════════════ */
    chatBtn.classList.remove('hidden');
    chatBtn.style.opacity = '1';

    /* ════════════════════════════════════════════════════
       MODAL TOGGLE
       ════════════════════════════════════════════════════ */
    chatBtn.addEventListener('click', () => {
        openModal('aiChatModal');
        loadChatHistory();
        chatInput.focus();
        setTimeout(() => { chatBody.scrollTop = chatBody.scrollHeight; }, 0);
    });

    chatClose.addEventListener('click', () => {
        closeModal('aiChatModal');
        chatModal.classList.remove('active');
        chatBtn.classList.remove('active');
    });

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
                    chatBody.innerHTML = `<div class="chat-bubble bot">Riwayat dihapus. Ada yang bisa saya bantu? 😊</div>`;
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

    /* ════════════════════════════════════════════════════
       HELPER: Normalisasi teks untuk matching perangkat
       ════════════════════════════════════════════════════ */
    function normalizeText(v) {
        return String(v || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    }

    /* ════════════════════════════════════════════════════
       HELPER: Cari perangkat berdasarkan query teks
       ════════════════════════════════════════════════════ */
    function findDeviceByQuery(query) {
        const q       = normalizeText(query);
        const devices = Object.values((window.STATE && window.STATE.devices) || {});
        if (!q || !devices.length) return null;

        const scored = devices.map(d => {
            const name = normalizeText(d.name || '');
            const type = normalizeText(d.type || d.template_device_type || '');
            let score  = 0;
            if (name === q)           score += 100;
            if (name.includes(q))     score += 70;
            q.split(' ').forEach(t => { if (t && name.includes(t)) score += 10; });
            if (q.includes('lamp')  && (type.includes('light') || name.includes('lamp')))  score += 20;
            if (q.includes('kipas') && (type.includes('fan')   || name.includes('kipas'))) score += 20;
            if (q.includes('kunci') && (type.includes('lock')  || name.includes('kunci'))) score += 20;
            return { d, score };
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

        return scored[0]?.d || null;
    }

    /* ════════════════════════════════════════════════════
       FAST COMMAND HANDLER (tanpa round-trip ke AI)
       ════════════════════════════════════════════════════ */
    function fastHandleCommand(rawText) {
        const text = normalizeText(rawText);
        if (!text) return { handled: false };

        const isOnCmd     = /^(nyalakan|hidupkan|turn on|on)\b/.test(text);
        const isOffCmd    = /^(matikan|turn off|off)\b/.test(text);
        const isStatusCmd = /^(cek status|status|check status)\b/.test(text) || /\bstatus\b/.test(text);

        if (isOnCmd || isOffCmd) {
            const target    = text.replace(/^(nyalakan|hidupkan|matikan|turn on|turn off|on|off)\b/, '').trim();
            const turnOn    = isOnCmd;
            const allTarget = /\b(semua|all)\b/.test(target);
            const devicesObj = (window.STATE && window.STATE.devices) || {};
            const ids        = Object.keys(devicesObj);

            if (!ids.length) return { handled: true, reply: 'Belum ada perangkat yang bisa dikontrol.' };

            if (allTarget) {
                const list = Object.values(devicesObj).filter(d => {
                    const n = normalizeText(d.name || '');
                    const t = normalizeText(d.type || d.template_device_type || '');
                    if (target.includes('lamp') || target.includes('lampu')) return t.includes('light') || n.includes('lamp');
                    if (target.includes('kipas')) return t.includes('fan') || n.includes('kipas');
                    return true;
                });
                list.forEach(d => {
                    if (typeof toggleDeviceState === 'function') toggleDeviceState(String(d.id), turnOn);
                });
                return { handled: true, refresh: true, reply: `${turnOn ? 'Menyalakan' : 'Mematikan'} ${list.length} perangkat secara instan.` };
            }

            const device = findDeviceByQuery(target);
            if (!device) return { handled: true, reply: `Perangkat "${target || 'tersebut'}" tidak ditemukan.` };
            if (typeof toggleDeviceState === 'function') toggleDeviceState(String(device.id), turnOn);
            return { handled: true, refresh: true, reply: `${device.name} langsung ${turnOn ? 'dinyalakan' : 'dimatikan'}.` };
        }

        if (isStatusCmd) {
            const target     = text.replace(/^(cek status|status|check status)\b/, '').trim();
            const devicesObj = (window.STATE && window.STATE.devices) || {};
            const states     = (window.STATE && window.STATE.deviceStates) || {};
            const ids        = Object.keys(devicesObj);

            if (!ids.length) return { handled: true, reply: 'Belum ada perangkat terdaftar.' };

            if (!target || /\b(semua|all)\b/.test(target)) {
                const lines = ids.slice(0, 8).map(id => {
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
       HELPER: Build cv_state payload dengan sanitasi
       ════════════════════════════════════════════════════ */
    function buildCvStatePayload() {
        const lightConditions = ['unknown', 'dark', 'dim', 'normal', 'bright'];
        const rawCondition    = String(window.STATE?.cv?.lightCondition || 'unknown').toLowerCase();
        return {
            is_active:       !!(window.STATE?.camera?.active),
            model_loaded:    !!(window.STATE?.cv?.modelLoaded),
            person_count:    Math.max(0, Math.min(100, parseInt(window.STATE?.cv?.personCount   || 0, 10))),
            brightness:      Math.max(0, Math.min(100, parseInt(window.STATE?.cv?.brightness    || 0, 10))),
            light_condition: lightConditions.includes(rawCondition) ? rawCondition : 'unknown',
        };
    }

    /* ════════════════════════════════════════════════════
       HELPER: Retry request ke AI dengan exponential backoff
       Catatan: Hanya 1x retry di JS karena PHP sudah retry 3x.
       Total worst-case: 1 JS retry × 3 PHP retries = 3 API call.
       ════════════════════════════════════════════════════ */
    async function requestAIWithRetry(payload) {
        let lastData = null;
        for (let attempt = 1; attempt <= AI_JS_RETRY_MAX + 1; attempt++) {
            const data = await apiPost('ai_chat_process', payload, {
                key:     `ai_chat_${Date.now()}_${attempt}`,
                timeout: FETCH_TIMEOUT_MS,
                refresh: false,
            });
            lastData     = data;
            const err    = String(data?.error || '');
            const isTimeout = /(timeout|timed out|aborted|HTTP 504)/i.test(err);
            if (!isTimeout || attempt > AI_JS_RETRY_MAX) return data;
            const delay = Math.min(8000, Math.pow(2, attempt - 1) * 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return lastData;
    }

    /* ════════════════════════════════════════════════════
       HELPER: Tunggu MQTT publish selesai sebelum refresh UI
       ════════════════════════════════════════════════════ */
    async function waitForMqttSync(deviceIds) {
        const ids    = (deviceIds || []).map(id => String(id));
        if (!ids.length) return;
        const topics = ids.map(id => window.STATE?.deviceTopics?.[id]?.pub).filter(Boolean);
        if (!topics.length) return;

        await new Promise(resolve => {
            const pending = new Set(topics);
            const timeout = setTimeout(() => {
                window.removeEventListener('iotzy:mqtt-publish', onPublish);
                resolve();
            }, 1500);
            const onPublish = event => {
                const topic = event?.detail?.topic;
                if (!topic) return;
                pending.delete(topic);
                if (pending.size === 0) {
                    clearTimeout(timeout);
                    window.removeEventListener('iotzy:mqtt-publish', onPublish);
                    resolve();
                }
            };
            window.addEventListener('iotzy:mqtt-publish', onPublish);
        });
    }

    /* ════════════════════════════════════════════════════
       KIRIM PESAN KE BACKEND
       ════════════════════════════════════════════════════ */
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Validasi panjang pesan di sisi klien
        if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
            appendMessage(`Pesan terlalu panjang. Maksimal ${MAX_CHAT_MESSAGE_LENGTH} karakter.`, 'bot error');
            return;
        }

        appendMessage(text, 'user');
        chatInput.value    = '';
        chatInput.disabled = true;
        chatSend.disabled  = true;
        chatSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Fast handler — langsung eksekusi tanpa AI
        const fast = fastHandleCommand(text);
        if (fast.handled) {
            appendMessage(fast.reply, 'bot');
            // Simpan ke history server secara async (fire-and-forget)
            apiPost('ai_chat_fast_track', { message: text, reply: fast.reply }, {
                key:     `ai_fast_track_${Date.now()}`,
                timeout: 10_000,
                refresh: false,
            }).catch(() => {});

            if (fast.refresh) {
                setTimeout(() => {
                    if (typeof refreshDeviceData    === 'function') refreshDeviceData();
                    if (typeof syncAllFromServer    === 'function') syncAllFromServer(true);
                }, 0);
            }
            resetInputState();
            return;
        }

        const loadingBubble = createLoadingBubble();
        chatBody.appendChild(loadingBubble);
        scrollToBottom();

        try {
            const cvStatePayload = buildCvStatePayload();
            const data = await requestAIWithRetry({
                message:       text,
                session_start: (typeof STATE !== 'undefined') ? STATE.sessionStart : null,
                cv_state:      cvStatePayload,
            });

            loadingBubble.remove();

            if (data && data.success === true) {
                const botText = data.data?.response_text || data.response_text || data.message || 'Perintah telah diproses.';
                appendMessage(botText, 'bot');

                // UI action dari AI (navigasi, refresh)
                const uiAction = data.data?.ui_action || data.ui_action || 'none';
                if (uiAction && uiAction !== 'none') handleUIAction(uiAction);

                // Sinkronisasi state perangkat dari hasil eksekusi AI
                const states = data.data?.execution?.device_states || {};
                for (const [id, val] of Object.entries(states)) {
                    if (typeof applyDeviceState === 'function') {
                        applyDeviceState(id, val === 1, 'AI Assistant (Sync)');
                    }
                }

                // Eksekusi tindakan lanjutan (CV, navigasi, reset, kamera)
                const executed = data.data?.execution?.executed || [];
                executed.forEach(ex => {
                    if (ex.startsWith('cv_action:')) {
                        const act = ex.split(':')[1];
                        if (act === 'load_model'      && typeof initializeCV        === 'function') initializeCV();
                        if (act === 'start_detection' && typeof startCVDetection    === 'function') startCVDetection();
                        if (act === 'stop_detection'  && typeof stopCVDetection     === 'function') stopCVDetection();
                    }
                    if (ex.startsWith('nav:')) handleUIAction('navigate_' + ex.split(':')[1]);
                    if (ex === 'reset_all') {
                        if (typeof showToast === 'function') showToast('Sistem berhasil di-reset!', 'success');
                        setTimeout(() => window.location.reload(), 1500);
                    }
                    if (['profile', 'thresholds', 'builtin', 'mqtt', 'telegram'].includes(ex)) {
                        if (typeof showToast === 'function') showToast('Pengaturan diperbarui', 'success');
                    }
                    if (ex === 'camera:1' && !window.STATE?.camera?.active && typeof toggleCameraFocus === 'function') toggleCameraFocus();
                    if (ex === 'camera:0' &&  window.STATE?.camera?.active && typeof toggleCameraFocus === 'function') toggleCameraFocus();
                });

                // Tunggu MQTT publish selesai lalu refresh UI
                await waitForMqttSync(Object.keys(states));
                refreshDeviceData();
                if (typeof syncAllFromServer === 'function') syncAllFromServer(true);

            } else {
                const raw      = String(data?.error || '');
                const isTimeout = /(timeout|timed out|aborted|HTTP 504)/i.test(raw);
                const friendly  = isTimeout
                    ? '⏳ Permintaan AI melewati batas waktu. Sistem sudah mencoba ulang otomatis, silakan kirim ulang jika masih gagal.'
                    : (raw || 'Terjadi kesalahan yang tidak diketahui.');
                appendMessage(friendly, 'bot error');
            }

        } catch (err) {
            loadingBubble.remove();
            appendMessage(
                `🌐 Gagal terhubung ke server: ${err.message}. Periksa koneksi internet Anda.`,
                'bot error'
            );
            console.error('[IoTzy AI] Fetch error:', err);

        } finally {
            resetInputState();
        }
    }

    /* ════════════════════════════════════════════════════
       HELPER: Reset state input setelah kirim
       ════════════════════════════════════════════════════ */
    function resetInputState() {
        chatInput.disabled = false;
        chatSend.disabled  = false;
        chatSend.innerHTML = '<i class="fas fa-paper-plane"></i>';
        chatInput.focus();
    }

    /* ════════════════════════════════════════════════════
       HELPER: Buat bubble loading dengan animasi titik
       ════════════════════════════════════════════════════ */
    function createLoadingBubble() {
        const bubble       = document.createElement('div');
        bubble.className   = 'chat-bubble bot loading-bubble';
        bubble.innerHTML   = `
            <span class="ai-thinking-label">AI sedang berpikir</span>
            <span class="ai-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>`;

        if (!document.getElementById('ai-dots-style')) {
            const style       = document.createElement('style');
            style.id          = 'ai-dots-style';
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
                    0%, 80%, 100% { opacity: 0; }
                    40%           { opacity: 1; }
                }
                .ai-thinking-label { font-size: 0.85em; opacity: 0.7; margin-right: 2px; }
            `;
            document.head.appendChild(style);
        }
        return bubble;
    }

    /* ════════════════════════════════════════════════════
       HELPER: Tambah bubble chat ke UI
       Menggunakan DOMPurify jika tersedia, fallback ke escape manual.
       ════════════════════════════════════════════════════ */
    function appendMessage(text, sender) {
        if (!text || String(text).trim() === '') return null;

        const raw  = String(text).replace(/\n/g, '<br>');
        const html = (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function')
            ? window.DOMPurify.sanitize(raw, {
                ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'code', 'br'],
                ALLOWED_ATTR: [],
                FORBID_TAGS: ['style', 'script', 'svg', 'math'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
            })
            : raw.replace(/[<>&'"]/g, ch => ({
                '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;',
            }[ch]));

        const bubble     = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = html;
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
            if (typeof refreshDeviceData === 'function') refreshDeviceData();
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

    /* ════════════════════════════════════════════════════
       HELPER: Refresh data perangkat setelah aksi AI
       ════════════════════════════════════════════════════ */
    async function refreshDeviceData() {
        if (typeof syncAllFromServer === 'function') {
            await syncAllFromServer(true, {
                includeAnalytics: true,
                includeCamera: true,
                includeCameraSettings: true,
            });
            if (typeof syncAutomationFromServer === 'function') {
                await syncAutomationFromServer();
            }
            return;
        }

        if (typeof syncDevicesFromServer === 'function') await syncDevicesFromServer();
        if (typeof syncSensorsFromServer === 'function') await syncSensorsFromServer();
        if (typeof syncAutomationFromServer === 'function') await syncAutomationFromServer();
        if (typeof syncCVConfigFromServer === 'function') await syncCVConfigFromServer();
    }

}

window.initAiChatModule = initAiChatModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiChatModule);
} else {
    initAiChatModule();
}
