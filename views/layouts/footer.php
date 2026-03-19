<?php

?>

<!-- Toast container -->
<div id="toastContainer"></div>

<!-- AI Chat Floating Action Button & Modal -->
<div class="ai-chat-btn hidden" id="aiChatBtn" title="Tanya AI untuk Automasi">
    <i class="fas fa-robot"></i>
</div>

<div class="ai-chat-modal hidden" id="aiChatModal">
    <div class="ai-chat-header">
        <span><i class="fas fa-robot"></i> IoTzy AI Assistant</span>
        <div class="ai-chat-header-actions">
            <button class="ai-chat-clear" id="aiChatClear" title="Hapus Riwayat">
                <i class="fas fa-broom"></i>
            </button>
            <button class="ai-chat-close" id="aiChatClose" title="Tutup">
                <i class="fas fa-times"></i>
            </button>
        </div>
    </div>
    <div class="ai-chat-body" id="aiChatBody">
        <div class="chat-bubble bot">
            Halo! Saya asisten AI untuk sistem IoT Anda. Anda bisa perintahkan saya seperti:<br><i>"Matikan semua lampu teras jam 11 malam"</i> atau <i>"Kalau suhu di atas 30 derajat jalankan kipas"</i>.<br><br>Ada yang bisa saya bantu hari ini?
        </div>
    </div>
    <div class="ai-chat-footer">
        <input type="text" id="aiChatInput" class="ai-chat-input" placeholder="Tulis instruksi automasi..." autocomplete="off">
        <button class="ai-chat-send" id="aiChatSend" title="Kirim">
            <i class="fas fa-paper-plane"></i>
        </button>
    </div>
</div>

<!-- PHP data injection — field sensitif sudah difilter di getUserSettings() -->
<script>
const APP_BASE     = '<?= APP_URL ?>';
const CSRF_TOKEN   = '<?= htmlspecialchars(generateCsrfToken()) ?>';
const PHP_USER     = <?= json_encode($user,                     JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>;
const PHP_SETTINGS = <?= json_encode($safeSettings,             JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>;
const PHP_DEVICES  = <?= json_encode(array_values($devices),    JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>;
const PHP_SENSORS  = <?= json_encode(array_values($sensors),    JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>;
</script>

<script src="https://cdn.jsdelivr.net/npm/gridstack@10.0.1/dist/gridstack-all.js"></script>

<!-- 🔥 FIX: Gunakan APP_URL untuk semua script lokal -->
<script src="<?= APP_URL ?>/public/assets/js/app.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/navigation.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/mqtt-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/device-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/sensor-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/cv-config.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/cv-detector.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/light-analyzer.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/automation-engine.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/cv-ui.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= APP_URL ?>/public/assets/js/modules/ai-chat.js?v=<?= APP_VERSION ?>"></script>
<?php if (isAdmin()): ?>
<script src="<?= APP_URL ?>/public/assets/js/modules/admin-manager.js?v=<?= APP_VERSION ?>"></script>
<?php endif; ?>

</body>
</html>
