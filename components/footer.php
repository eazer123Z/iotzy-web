</div>

<!-- Toast container -->
<div id="toastContainer"></div>

<!-- AI Chat Floating Action Button & Modal -->
<div class="ai-chat-btn" id="aiChatBtn" title="Tanya AI untuk Automasi">
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
  const API_BASE     = APP_BASE + '/api/router.php';
  const IOTZY_RELEASE = '<?= APP_RELEASE ?>';
  const IOTZY_BUILD   = '<?= APP_BUILD ?>';
  const IOTZY_VERSION = '<?= APP_VERSION ?>';
  const PHP_USER     = <?= json_encode($user ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const PHP_SETTINGS = <?= json_encode($settings ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const PHP_DEVICES  = <?= json_encode($devices ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const PHP_SENSORS  = <?= json_encode($sensors ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const PHP_CV_STATE = <?= json_encode($cvState ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const PHP_CAMERA   = <?= json_encode($camera ?? null, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const PHP_CAMERA_SETTINGS = <?= json_encode($cameraSettings ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
</script>

<script defer src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>

<!-- Core Orchestrator -->
<script defer src="<?= iotzyAssetUrl('js/app.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/performance-optimizer.js') ?>"></script>

<!-- Modul Fungsional -->
<script defer src="<?= iotzyAssetUrl('js/modules/navigation.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/overview-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/mqtt-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/device-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/sensor-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/log-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/schedule-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/automation-engine.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/automation-ui.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/camera-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/camera-live.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/cv-config.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/cv-detector.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/light-analyzer.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/cv-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/cv-ui.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/settings-manager.js') ?>"></script>
<script defer src="<?= iotzyAssetUrl('js/modules/ai-chat.js') ?>"></script>

</body>
</html>
