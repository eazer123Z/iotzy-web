</div>

<!-- Toast container -->
<div id="toastContainer"></div>

<!-- AI Chat Floating Action Button & Modal -->
<div class="ai-chat-btn" id="aiChatBtn" title="Tanya AI untuk Automasi" 
     onclick="this.classList.toggle('active'); document.getElementById('aiChatModal').classList.toggle('active');">
    <i class="fas fa-robot"></i>
</div>

<div class="ai-chat-modal" id="aiChatModal">
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
            Halo! Saya asisten AI untuk sistem IoT Anda. Ada yang bisa saya bantu hari ini?
        </div>
    </div>
    <div class="ai-chat-footer">
        <input type="text" id="aiChatInput" class="ai-chat-input" placeholder="Tulis instruksi automasi..." autocomplete="off">
        <button class="ai-chat-send" id="aiChatSend" title="Kirim">
            <i class="fas fa-paper-plane"></i>
        </button>
    </div>
</div>

<?php include 'modals.php'; ?>

<script>
  const APP_BASE     = '<?= rtrim(APP_URL, "/") ?>';
  const PHP_USER     = <?= json_encode($user ?? []) ?>;
  const PHP_SETTINGS = <?= json_encode($settings ?? []) ?>;
  const PHP_DEVICES  = <?= json_encode($devices ?? []) ?>;
  const PHP_SENSORS  = <?= json_encode($sensors ?? []) ?>;
  const PHP_CV_STATE = <?= json_encode($cvState ?? []) ?>;
</script>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Core Orchestrator -->
<script src="<?= ASSET_URL ?>/js/app.js?v=<?= APP_VERSION ?>"></script>

<!-- Modul Fungsional -->
<script src="<?= ASSET_URL ?>/js/modules/navigation.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/overview-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/mqtt-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/device-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/sensor-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/log-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/schedule-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/automation-engine.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/automation-ui.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/camera-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/cv-config.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/cv-detector.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/light-analyzer.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/cv-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/cv-ui.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/settings-manager.js?v=<?= APP_VERSION ?>"></script>
<script src="<?= ASSET_URL ?>/js/modules/ai-chat.js?v=<?= APP_VERSION ?>"></script>

</body>
</html>
