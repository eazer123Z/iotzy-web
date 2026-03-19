<!-- ═══ ADMIN PANEL PAGE (PREMIUM OVERHAUL) ═══ -->
<div id="view-admin" class="view hidden">
    <!-- Header: High-Fidelity Glass Header -->
    <div class="view-header premium-header">
        <div class="view-title-group">
            <h2 class="view-title"><i class="fas fa-shield-check neon-cyan"></i> Central Control</h2>
            <p class="view-sub">System Administration & User Governance</p>
        </div>
        <div class="view-actions">
            <button class="btn-primary neon-btn" onclick="openAddUserModal()">
                <i class="fas fa-plus-circle"></i> <span>Add Operator</span>
            </button>
        </div>
    </div>

    <style>
        /* 💎 Bespoke Admin Design System */
        :root {
            --glass-bg: rgba(15, 23, 42, 0.75);
            --glass-border: rgba(56, 189, 248, 0.15);
            --neon-cyan: #22d3ee;
            --neon-glow: 0 0 15px rgba(34, 211, 238, 0.3);
        }

        .premium-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
        }
        
        .neon-cyan { color: var(--neon-cyan); filter: drop-shadow(0 0 5px var(--neon-cyan)); }
        
        /* 📊 Premium Stats */
        .admin-stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .glass-stat-card {
            background: var(--surface-2);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: var(--r-lg);
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all var(--t);
        }
        .glass-stat-card:hover { 
            transform: translateY(-4px);
            border-color: var(--border-2);
            box-shadow: var(--shadow-md);
        }
        .stat-icon-box {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }
        .stat-icon-box.cyan { background: var(--a-dim); color: var(--a); }
        .stat-icon-box.green { background: var(--green-dim); color: var(--green); }
        .stat-icon-box.amber { background: var(--amber-dim); color: var(--amber); }

        /* 🔍 Search & Actions Bar */
        .admin-actions-bar {
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: var(--r);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .admin-search-wrapper {
            position: relative;
            flex: 1;
            min-width: 200px;
        }
        .admin-search-wrapper i {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--ink-4);
        }
        .admin-search-input {
            width: 100%;
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 10px 10px 10px 38px;
            color: var(--ink);
            font-size: 13px;
            outline: none;
            transition: all var(--t);
        }
        .admin-search-input:focus {
            border-color: var(--a);
            box-shadow: var(--a-glow);
        }

        /* 📑 The Glass Table */
        .glass-table-container {
            overflow-x: auto;
            border-radius: var(--r);
            border: 1px solid var(--border);
            background: var(--surface);
        }
        .glass-table {
            width: 100%;
            border-collapse: collapse;
        }
        .glass-table th {
            text-align: left;
            padding: 16px 20px;
            background: rgba(255,255,255,0.03);
            color: var(--ink-4);
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 1px;
            border-bottom: 1px solid var(--border);
        }
        .glass-table td {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.02);
            font-size: 13px;
            transition: background var(--t);
        }
        .glass-table tr:hover td {
            background: rgba(255,255,255,0.02);
        }

        /* User Identity */
        .user-id-box { display: flex; align-items: center; gap: 12px; }
        .user-avatar-hex { 
            width: 36px; height: 36px; 
            background: linear-gradient(135deg, var(--sky-700), var(--sky-900));
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 800; font-size: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .user-meta-name { font-weight: 700; color: var(--ink); display: block; }
        .user-meta-email { font-size: 11px; color: var(--ink-5); display: block; }

        /* Status Pills */
        .neon-pill {
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .neon-pill.active { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52, 211, 153, 0.2); }
        .neon-pill.inactive { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248, 113, 113, 0.2); }

        /* Action Buttons */
        .admin-action-btn {
            width: 32px; height: 32px;
            border-radius: 8px;
            display: inline-flex; align-items: center; justify-content: center;
            border: 1px solid var(--border);
            background: var(--surface-3);
            color: var(--ink-3);
            cursor: pointer;
            transition: all var(--t);
        }
        .admin-action-btn:hover { background: var(--surface-4); transform: scale(1.1); color: var(--ink); }
        .admin-action-btn.view:hover { border-color: var(--a); color: var(--a); }
        .admin-action-btn.edit:hover { border-color: var(--amber); color: var(--amber); }
        .admin-action-btn.delete:hover { border-color: var(--red); color: var(--red); }
        
        /* 🔥 FIX: Visibility artifacts */
        .modal:not(.show) { display: none !important; }
    </style>

    <!-- Stats Section -->
    <div class="admin-stats-row">
        <div class="glass-stat-card">
            <div class="stat-icon-box cyan"><i class="fas fa-users-crown"></i></div>
            <div>
                <div id="adminTotalUsers" class="stat-value" style="font-size: 1.5rem; font-weight: 800;">0</div>
                <div class="stat-label" style="font-size: 11px; color: var(--ink-4);">Total Operators</div>
            </div>
        </div>
        <div class="glass-stat-card">
            <div class="stat-icon-box green"><i class="fas fa-user-check"></i></div>
            <div>
                <div id="adminActiveUsers" class="stat-value" style="font-size: 1.5rem; font-weight: 800;">0</div>
                <div class="stat-label" style="font-size: 11px; color: var(--ink-4);">Active Sessions</div>
            </div>
        </div>
        <div class="glass-stat-card">
            <div class="stat-icon-box amber"><i class="fas fa-user-shield"></i></div>
            <div>
                <div id="adminInactiveUsers" class="stat-value" style="font-size: 1.5rem; font-weight: 800;">0</div>
                <div class="stat-label" style="font-size: 11px; color: var(--ink-4);">Restricted Accounts</div>
            </div>
        </div>
    </div>

    <!-- Actions Bar -->
    <div class="admin-actions-bar">
        <div class="admin-search-wrapper">
            <i class="fas fa-search"></i>
            <input type="text" id="adminUserSearch" class="admin-search-input" placeholder="Search by name, email or ID..." oninput="filterAdminUsers(this.value)">
        </div>
        <div style="display:flex; gap:8px">
            <button class="btn-ghost" style="padding: 8px 12px; font-size: 12px" onclick="filterAdminByRole('all')">All</button>
            <button class="btn-ghost" style="padding: 8px 12px; font-size: 12px" onclick="filterAdminByRole('admin')">Admins</button>
            <button class="btn-ghost" style="padding: 8px 12px; font-size: 12px" onclick="filterAdminByRole('user')">Users</button>
        </div>
    </div>

    <!-- Table Section -->
    <div class="glass-table-container">
        <table class="glass-table">
            <thead>
                <tr>
                    <th>Identity</th>
                    <th>Email Address</th>
                    <th>Assets Control</th>
                    <th>Authority</th>
                    <th>Status</th>
                    <th>Last Access</th>
                    <th style="text-align:right">Management</th>
                </tr>
            </thead>
            <tbody id="adminUserTableBody">
                <tr><td colspan="7" style="text-align:center;padding:80px;color:var(--ink-5)"><i class="fas fa-spinner-third fa-spin" style="font-size:1.5rem"></i><br><br>Synchronizing data...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal: Add/Edit User -->
<div id="modal-user" class="modal">
  <div class="modal-content" style="max-width:500px">
    <div class="modal-header">
      <h3 id="adminModalTitle">Operator Identity</h3>
      <button class="close-btn" onclick="closeModal('modal-user')">&times;</button>
    </div>
    <form id="adminUserForm" onsubmit="handleAdminUserSubmit(event)">
      <input type="hidden" id="adminUserId">
      <div class="modal-body">
        <div class="grid-2">
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="adminUsername" class="form-control" placeholder="e.g. jdoe" required>
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="adminFullName" class="form-control" placeholder="John Doe">
            </div>
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="adminEmail" class="form-control" placeholder="john@example.com" required>
        </div>
        <div class="form-group">
          <label id="adminPassLabel">Password</label>
          <input type="password" id="adminPassword" class="form-control" placeholder="Keep empty to leave unchanged">
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label>Access Level</label>
                <select id="adminRole" class="form-control">
                    <option value="user">Operator (User)</option>
                    <option value="admin">Executive (Admin)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Account Status</label>
                <div style="padding-top:10px">
                    <label class="toggle-wrapper">
                        <input type="checkbox" id="adminIsActive" class="toggle-input" checked>
                        <span class="toggle-track"></span>
                        <span style="font-size:12px; margin-left:10px">Active</span>
                    </label>
                </div>
            </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-ghost" onclick="closeModal('modal-user')">Discard</button>
        <button type="submit" class="btn-primary" id="adminUserSubmitBtn">Confirm Changes</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: User Insights -->
<div id="modal-user-detail" class="modal">
  <div class="modal-content" style="max-width:650px">
    <div class="modal-header">
        <div style="display:flex; align-items:center; gap:12px">
            <div class="stat-icon-box cyan" style="width:40px;height:40px"><i class="fas fa-fingerprint"></i></div>
            <div>
                <h3 id="detailUserLabel" style="margin:0">Setup Analysis</h3>
                <p style="font-size:11px; opacity:0.6; margin:0">Comprehensive asset and sensor report</p>
            </div>
        </div>
      <button class="close-btn" onclick="closeModal('modal-user-detail')">&times;</button>
    </div>
    <div class="modal-body" id="userDetailContent">
        <div style="text-align:center;padding:40px;opacity:0.5">Fetching insights...</div>
    </div>
    <div class="modal-footer">
      <button class="btn-primary" onclick="closeModal('modal-user-detail')">Acknowledge</button>
    </div>
  </div>
</div>
