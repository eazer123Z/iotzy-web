<!-- ═══ ADMIN PANEL PAGE ═══ -->
<div id="view-admin" class="view hidden">
  <div class="view-header">
    <div class="view-title-group">
      <h2 class="view-title"><i class="fas fa-shield-halved"></i> Admin Panel</h2>
      <p class="view-sub">Manajemen Pengguna &amp; Kontrol Sistem Terpusat</p>
    </div>
    <div class="view-actions">
      <button class="btn-primary" onclick="openAddUserModal()">
        <i class="fas fa-user-plus"></i> Tambah User
      </button>
      <button class="btn-ghost" onclick="loadAdminUsers()" title="Refresh Data">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>
  </div>

  <style>
    /* Admin UI Standardized Overrides */
    #view-admin .log-table th { color: var(--ink-5); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    #view-admin .log-table td { color: var(--ink-2); font-size: 13px; vertical-align: middle; }
    
    .admin-stat-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: var(--surface-2);
        border-radius: var(--r-sm);
        font-size: 11px;
        font-weight: 700;
        border: 1px solid var(--border);
    }
    .admin-stat-pill.device { color: var(--a); background: var(--a-dim); }
    .admin-stat-pill.sensor { color: var(--green); background: var(--green-dim); }

    .user-info-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar-small { width: 32px; height: 32px; border-radius: 50%; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; color: var(--a); border: 1px solid var(--border); }
    .user-name-text { font-weight: 700; color: var(--ink); }
    .user-sub-text { font-size: 11px; color: var(--ink-4); }

    /* Modal Contextual Fixes */
    .modal-content {
        background: var(--surface) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        border: 1px solid var(--border-2) !important;
        box-shadow: var(--shadow-xl) !important;
    }
    
    .form-control {
        background: var(--surface-2) !important;
        border: 1px solid var(--border) !important;
        color: var(--ink) !important;
    }

    /* Detail Modal Styles */
    .detail-section { margin-bottom: 20px; background: var(--surface-2); border-radius: var(--r); padding: 18px; border: 1px solid var(--border); }
    .detail-section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--ink-4); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .detail-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .detail-item:last-child { border: none; }
    .detail-name { font-weight: 700; font-size: 13px; color: var(--ink); }
    .detail-meta { font-size: 11px; color: var(--ink-4); }
  </style>

  <!-- User Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon purple"><i class="fas fa-users"></i></div>
      <div class="stat-body">
        <div id="adminTotalUsers" class="stat-value">0</div>
        <div class="stat-label">Total Pengguna</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i class="fas fa-user-check"></i></div>
      <div class="stat-body">
        <div id="adminActiveUsers" class="stat-value">0</div>
        <div class="stat-label">User Aktif</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><i class="fas fa-user-slash"></i></div>
      <div class="stat-body">
        <div id="adminInactiveUsers" class="stat-value">0</div>
        <div class="stat-label">User Non-aktif</div>
      </div>
    </div>
  </div>

  <!-- User Management Table Wrapper -->
  <div class="log-table-wrapper" style="margin-top:20px">
    <table class="log-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Setup</th>
          <th>Role</th>
          <th>Status</th>
          <th>Login Terakhir</th>
          <th style="width:120px; text-align:right">Modifikasi</th>
        </tr>
      </thead>
      <tbody id="adminUserTableBody">
        <tr><td colspan="7" style="text-align:center;padding:60px;color:var(--ink-5)"><i class="fas fa-spinner fa-spin"></i> Memuat data pengguna...</td></tr>
      </tbody>
    </table>
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
