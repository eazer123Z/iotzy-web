<!-- ═══ ADMIN PANEL PAGE ═══ -->
<div id="page-admin" class="page-content" style="display:none">
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
            <th>Role</th>
            <th>Status</th>
            <th>Login Terakhir</th>
            <th style="width:100px">Aksi</th>
          </tr>
        </thead>
        <tbody id="adminUserTableBody">
          <!-- Data users akan dimuat via JS -->
          <tr><td colspan="6" style="text-align:center;padding:40px;color:rgba(255,255,255,.4)">Memuat data...</td></tr>
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
