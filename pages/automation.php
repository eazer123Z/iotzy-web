<div id="automation" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <span class="view-kicker">Dashboard IoT</span>
      <h3><i class="fas fa-robot"></i> Rules Engine</h3>
      <p>Otomatisasi cerdas berdasarkan sensor, jadwal, dan kondisi lingkungan.</p>
    </div>
    <div class="v-actions">
      <button class="btn-primary" onclick="openAddRuleModal()">
        <i class="fas fa-plus"></i> Buat Aturan Baru
      </button>
    </div>
  </div>
  <div id="automationGrid" class="automation-grid"></div>
  <div id="emptyAutomation" class="empty-state hidden">
    <i class="fas fa-sliders"></i>
    <p>Belum ada aturan otomatisasi. Tambah aturan berdasarkan sensor atau jadwal.</p>
    <button class="btn-primary" onclick="openAddRuleModal()">Buat Aturan Baru</button>
  </div>
</div>
