<div id="automation" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-robot"></i> Automation Engine</h3>
      <p>Otomatisasi cerdas berdasarkan sensor dan kondisi lingkungan.</p>
    </div>
    <div class="v-actions">
      <button class="btn-primary" onclick="openAddRuleModal()">
        <i class="fas fa-plus"></i> Buat Aturan Baru
      </button>
    </div>
  </div>
  <!-- ID harus 'automationGrid' agar sesuai dengan automation-ui.js renderAutomationView() -->
  <div id="automationGrid" class="automation-grid"></div>
  <div id="emptyAutomation" class="empty-state hidden">
    <i class="fas fa-sliders"></i>
    <p>Belum ada aturan otomatisasi. Tambah aturan berdasarkan sensor atau jadwal.</p>
    <button class="btn-primary" onclick="openAddRuleModal()">Buat Aturan Baru</button>
  </div>
</div>
