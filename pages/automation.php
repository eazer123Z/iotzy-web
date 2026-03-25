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
  <div id="automationRulesGrid" class="automation-grid"></div>
  <div id="emptyAutomation" class="empty-state hidden">
    <i class="fas fa-microchip"></i>
    <p>Belum ada aturan otomatisasi</p>
    <button class="btn-primary" onclick="openAddRuleModal()">Buat Aturan Baru</button>
  </div>
</div>
