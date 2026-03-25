<div id="camera_cv" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-brain"></i> Computer Vision</h3>
      <p>Konfigurasi parameter kecerdasan buatan dan deteksi objek cerdas.</p>
    </div>
  </div>

  <div class="cv-config-grid">
    <div class="card glass">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-user-secret"></i> Deteksi Objek</span>
      </div>
      <div class="card-body">
        <div class="cv-config-item">
          <label>Filter Orang</label>
          <input type="checkbox" checked class="form-switch">
        </div>
        <div class="cv-config-item">
          <label>Threshold Keyakinan (Confidence)</label>
          <input type="range" min="0" max="100" value="60" class="form-range">
        </div>
      </div>
    </div>

    <div class="card glass">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-lightbulb"></i> Analisis Cahaya</span>
      </div>
      <div class="card-body">
        <div class="cv-config-item">
          <label>Auto-Brightness Correction</label>
          <input type="checkbox" class="form-switch">
        </div>
        <div class="cv-config-item">
          <label>Sensitivitas Cahaya Rendah</label>
          <input type="range" min="0" max="100" value="45" class="form-range">
        </div>
      </div>
    </div>
  </div>
  
  <div class="cv-actions-footer">
    <button class="btn-primary" onclick="openPage('camera')">
      <i class="fas fa-camera"></i> Buka Kamera untuk Kalibrasi
    </button>
  </div>
</div>
