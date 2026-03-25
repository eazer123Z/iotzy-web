</div>
<button id="aiChatBtn" class="ai-chat-btn hidden"><i class="fas fa-robot"></i></button>
<div id="aiChatModal" class="ai-chat-modal">
  <div class="chat-header">
    <div class="chat-title-group">
      <div class="chat-logo"><i class="fas fa-bolt"></i></div>
      <div class="chat-info">
        <h3>IoTzy AI</h3>
        <span class="chat-status">Smart Assistant</span>
      </div>
    </div>
    <div class="chat-actions">
      <button id="aiChatClear" class="chat-icon-btn" title="Hapus riwayat"><i class="fas fa-trash-can"></i></button>
      <button id="aiChatClose" class="chat-icon-btn"><i class="fas fa-xmark"></i></button>
    </div>
  </div>
  <div id="aiChatBody" class="chat-body"><div class="chat-bubble bot">Halo! Saya IoTzy AI. Apa yang bisa saya bantu hari ini? 😊</div></div>
  <div class="chat-footer">
    <textarea id="aiChatInput" placeholder="Ketik perintah..." rows="1"></textarea>
    <button id="aiChatSend" class="chat-send-btn"><i class="fas fa-paper-plane"></i></button>
  </div>
</div>
<?php include 'modals.php'; ?>
<script>
  var PHP_SETTINGS = <?= json_encode($settings ?? []) ?>;
  var PHP_DEVICES = <?= json_encode($devices ?? []) ?>;
  var PHP_SENSORS = <?= json_encode($sensors ?? []) ?>;
  var PHP_CV_STATE = <?= json_encode($cvState ?? []) ?>;
</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="<?= ASSET_URL ?>/js/app.js?v=<?= APP_VERSION ?>"></script>
</body>
</html>
