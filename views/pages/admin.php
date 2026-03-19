<!-- ═══ ADMIN PANEL PAGE ═══ -->
<div id="view-admin" class="view hidden">
  <div class="content-header">
    <div class="header-title">
      <i class="fas fa-shield-halved"></i>
      <div>
        <h2>Admin Panel</h2>
        <p>Manajemen Pengguna &amp; Kontrol Sistem</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" onclick="openAddUserModal()">
        <i class="fas fa-user-plus"></i> Tambah User
      </button>
      <button class="icon-btn" onclick="loadAdminUsers()" title="Refresh Data">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>
  </div>

  <style>
    /* Premium Admin UI Overrides */
    #page-admin .data-table { border-collapse: separate; border-spacing: 0 8px; background: transparent; }
    #page-admin .data-table tr { background: var(--surface-2); border-radius: var(--r); transition: var(--t); }
    #page-admin .data-table tr:hover { background: var(--surface-3); transform: translateY(-1px); }
    #page-admin .data-table th { background: transparent; padding: 12px 20px; color: var(--ink-5); border: none; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; }
    #page-admin .data-table td { padding: 16px 20px; border: none; font-size: 13px; color: var(--ink-2); }
    #page-admin .data-table td:first-child { border-top-left-radius: var(--r); border-bottom-left-radius: var(--r); }
    #page-admin .data-table td:last-child { border-top-right-radius: var(--r); border-bottom-right-radius: var(--r); }
    
    .admin-stat-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: var(--surface-3);
        border-radius: var(--r-sm);
        font-size: 11px;
        font-weight: 700;
        border: 1px solid var(--border);
    }
    .admin-stat-pill.device { color: var(--a); background: var(--a-dim); border-color: var(--a-dim); }
    .admin-stat-pill.sensor { color: var(--green); background: var(--green-dim); border-color: var(--green-dim); }

    /* Detail Modal Styles */
    .detail-section { margin-bottom: 20px; background: var(--surface-4); border-radius: var(--r); padding: 18px; border: 1px solid var(--border); }
    .detail-section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--ink-4); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .detail-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .detail-item:last-child { border: none; }
    .detail-name { font-weight: 700; font-size: 13px; color: var(--ink); }
    .detail-meta { font-size: 11px; color: var(--ink-4); }

    /* Modal Styling Fix */
    .modal-content {
        background: var(--sb-bg) !important;
        backdrop-filter: blur(24px) !important;
        border: 1px solid var(--border-2) !important;
        box-shadow: var(--shadow-lg) !important;
        border-radius: var(--r-xl) !important;
    }
    .modal-header h3 { font-weight: 800; color: var(--ink); }
    
    #adminUserForm .form-control {
        background: var(--surface-2) !important;
        border: 1px solid var(--border) !important;
        color: var(--ink) !important;
        border-radius: var(--r-sm) !important;
        font-size: 13px !important;
    }
    #adminUserForm .form-control:focus {
        border-color: var(--a) !important;
        box-shadow: var(--a-glow) !important;
    }
    #adminUserForm label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--ink-4);
        margin-bottom: 8px;
    }
  </style>

  <!-- User Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(var(--primary-rgb),.1);color:var(--primary)"><i class="fas fa-users"></i></div>
      <div class="stat-info">
        <span class="stat-label">Total Pengguna</span>
        <h3 id="adminTotalUsers">0</h3>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(46,213,115,.1);color:#2ed573"><i class="fas fa-user-check"></i></div>
      <div class="stat-info">
        <span class="stat-label">User Aktif</span>
        <h3 id="adminActiveUsers">0</h3>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(255,71,87,.1);color:#ff4757"><i class="fas fa-user-slash"></i></div>
      <div class="stat-info">
        <span class="stat-label">User Non-aktif</span>
        <h3 id="adminInactiveUsers">0</h3>
      </div>
    </div>
  </div>

  <!-- User Management Table -->
  <div class="card" style="margin-top:24px">
    <div class="card-header">
      <h3 class="card-title">Daftar Pengguna Sistem</h3>
    </div>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Setup</th>
            <th>Role</th>
            <th>Status</th>
            <th>Login Terakhir</th>
            <th style="width:100px">Aksi</th>
          </tr>
        </thead>
        <tbody id="adminUserTableBody">
          <!-- Data users akan dimuat via JS -->
          <tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,.4)">Memuat data...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Tambah/Edit User -->
<div id="modal-user" class="modal">
  <div class="modal-content" style="max-width:500px">
    <div class="modal-header">
      <h3 id="userModalTitle">Tambah User Baru</h3>
      <button class="close-btn" onclick="closeModal('modal-user')">&times;</button>
    </div>
    <form id="adminUserForm" onsubmit="handleAdminUserSubmit(event)">
      <input type="hidden" id="adminTargetUserId" value="">
      
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="adminUsername" class="form-control" placeholder="username" required>
      </div>
      
      <div id="adminEmailGroup" class="form-group">
        <label>Email</label>
        <input type="email" id="adminEmail" class="form-control" placeholder="user@example.com" required>
      </div>

      <div id="adminPassGroup" class="form-group">
        <label>Password</label>
        <input type="password" id="adminPassword" class="form-control" placeholder="Minimal 8 karakter">
        <small style="color:rgba(255,255,255,.4);display:block;margin-top:4px">Kosongkan jika tidak ingin mengubah password (saat edit).</small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="adminFullName" class="form-control" placeholder="Nama Lengkap">
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="adminRole" class="form-control">
            <option value="user">User Biasa</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="switch-label">
          <span>Status Akun Aktif</span>
          <label class="switch">
            <input type="checkbox" id="adminIsActive" checked>
            <span class="slider round"></span>
          </label>
        </label>
      </div>

      <div class="modal-actions" style="margin-top:24px">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-user')">Batal</button>
        <button type="submit" class="btn btn-primary" id="adminUserSubmitBtn">Simpan</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Detail User -->
<div id="modal-user-detail" class="modal">
  <div class="modal-content" style="max-width:600px">
    <div class="modal-header">
      <h3><i class="fas fa-info-circle"></i> Detail Setup User: <span id="detailUserLabel">...</span></h3>
      <button class="close-btn" onclick="closeModal('modal-user-detail')">&times;</button>
    </div>
    <div class="modal-body" style="padding-top:10px">
      <div id="userDetailContent">
          <!-- Content will be injected via JS -->
          <div style="text-align:center;padding:40px;opacity:0.5">Memuat data detail...</div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal('modal-user-detail')">Tutup</button>
    </div>
  </div>
</div>
