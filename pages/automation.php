
      <!-- ════════════ AUTOMATION ════════════ -->
      <div id="view-automation" class="view hidden">
        <div class="view-header">
          <div>
            <h2 class="view-title">Aturan Otomasi</h2>
            <p class="view-sub">Aturan otomatis berbasis sensor — template siap pakai atau buat manual</p>
          </div>
          <div class="view-actions">
            <button onclick="renderAutomationView()" class="btn-ghost small"><i class="fas fa-refresh"></i> Perbarui</button>
          </div>
        </div>
        <div id="automationGrid" class="automation-grid"></div>
        <div id="emptyAutomation" class="empty-state hidden">
          <i class="fas fa-sliders"></i>
          <p>Belum ada sensor</p>
          <div class="hint">Tambahkan sensor terlebih dahulu agar aturan otomasi tersedia</div>
          <button onclick="switchPage('sensors', document.querySelector('[data-page=sensors]'))" class="btn-primary" style="margin-top:8px">
            <i class="fas fa-plus"></i> Tambah Sensor
          </button>
        </div>
      </div>
