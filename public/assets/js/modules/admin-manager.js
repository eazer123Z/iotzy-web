/**
 * public/assets/js/modules/admin-manager.js
 * Manajemen Pengguna dari sisi Admin Panel
 */

const AdminManager = {
    users: [],

    async init() {
        console.log('[IoTzy Admin] Initializing...');
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    },

    async loadUsers() {
        try {
            const res = await apiPost('admin_get_users');
            if (res && res.success) {
                this.users = res.data;
                this.applyFilters();
                this.updateStats();
            } else {
                throw new Error(res?.error || 'Gagal memuat daftar operator');
            }
        } catch (e) {
            console.error('Admin Load Error:', e);
            const tbody = document.getElementById('adminUserTableBody');
            let errorMsg = e.message;
            if (errorMsg.includes('HTTP 401')) errorMsg = 'Sesi berakhir. Silakan login ulang.';
            if (errorMsg.includes('HTTP 403')) errorMsg = 'Akses ditolak. Fitur ini hanya untuk Administrator.';
            
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--red)"><i class="fas fa-exclamation-triangle"></i> ${errorMsg}</td></tr>`;
        }
    },

    applyFilters() {
        this.filteredUsers = this.users.filter(u => {
            const matchesQuery = !this.currentQuery || 
                u.username.toLowerCase().includes(this.currentQuery.toLowerCase()) ||
                (u.full_name && u.full_name.toLowerCase().includes(this.currentQuery.toLowerCase())) ||
                u.email.toLowerCase().includes(this.currentQuery.toLowerCase());
            
            const matchesRole = this.currentFilter === 'all' || u.role === this.currentFilter;
            
            return matchesQuery && matchesRole;
        });
        this.renderUsers();
    },

    setSearch(query) {
        this.currentQuery = query;
        this.applyFilters();
    },

    setRoleFilter(role) {
        this.currentFilter = role;
        this.applyFilters();
    },

    renderUsers() {
        const tbody = document.getElementById('adminUserTableBody');
        if (!tbody) return;

        if (!this.filteredUsers.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:80px;color:var(--ink-5)">No matching operators found.</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredUsers.map(u => `
            <tr>
                <td>
                    <div class="user-id-box">
                        <div class="user-avatar-hex">${u.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <span class="user-meta-name">${u.full_name || u.username}</span>
                            <span class="user-meta-email">@${u.username}</span>
                        </div>
                    </div>
                </td>
                <td><span style="font-family:var(--mono); font-size:12px; opacity:0.7">${u.email}</span></td>
                <td>
                    <div style="display:flex; gap:6px">
                        <span class="admin-stat-pill device" style="font-size:10px; padding:3px 8px"><i class="fas fa-microchip"></i> ${u.device_count || 0}</span>
                        <span class="admin-stat-pill sensor" style="font-size:10px; padding:3px 8px"><i class="fas fa-signal"></i> ${u.sensor_count || 0}</span>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${u.role}" style="font-size:9px; font-weight:800; padding:2px 8px; border-radius:4px">
                        ${u.role === 'admin' ? 'EXECUTIVE' : 'OPERATOR'}
                    </span>
                </td>
                <td>
                    <span class="neon-pill ${u.is_active ? 'active' : 'inactive'}">
                        <i class="fas ${u.is_active ? 'fa-check-double' : 'fa-ban'}"></i>
                        ${u.is_active ? 'Active' : 'Restricted'}
                    </span>
                </td>
                <td>
                    <span style="font-size:11px; color:var(--ink-4)">
                        <i class="fas fa-clock-rotate-left" style="font-size:10px"></i>
                        ${u.last_login ? this.formatDate(u.last_login) : 'Never'}
                    </span>
                </td>
                <td>
                    <div style="display:flex; gap:8px; justify-content:flex-end">
                        <button class="admin-action-btn view" onclick="viewAdminUserDetails(${u.id}, '${u.username}')" title="Insight Analysis">
                            <i class="fas fa-chart-user"></i>
                        </button>
                        <button class="admin-action-btn edit" onclick="editAdminUser(${u.id})" title="Modify Identity">
                            <i class="fas fa-user-pen"></i>
                        </button>
                        ${u.role !== 'admin' ? `
                        <button class="admin-action-btn delete" onclick="deleteAdminUser(${u.id}, '${u.username}')" title="Revoke Access">
                            <i class="fas fa-user-xmark"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    updateStats() {
        const total = this.users.length;
        const active = this.users.filter(u => u.is_active).length;
        const inactive = total - active;

        document.getElementById('adminTotalUsers').textContent = total;
        document.getElementById('adminActiveUsers').textContent = active;
        document.getElementById('adminInactiveUsers').textContent = inactive;
    },

    openAddModal() {
        document.getElementById('adminModalTitle').textContent = 'Register New Operator';
        document.getElementById('adminUserId').value = '';
        document.getElementById('adminUserForm').reset();
        document.getElementById('adminUsername').disabled = false;
        document.getElementById('adminPassLabel').textContent = 'Initial Password';
        document.getElementById('adminPassword').placeholder = 'Min. 8 characters';
        openModal('modal-user');
    },

    editUser(id) {
        const user = this.users.find(u => u.id == id);
        if (!user) return;

        document.getElementById('adminModalTitle').textContent = 'Modify Operator: ' + user.username;
        document.getElementById('adminUserId').value = user.id;
        document.getElementById('adminUsername').value = user.username;
        document.getElementById('adminUsername').disabled = true;
        document.getElementById('adminEmail').value = user.email || '';
        document.getElementById('adminFullName').value = user.full_name || '';
        document.getElementById('adminRole').value = user.role;
        document.getElementById('adminIsActive').checked = user.is_active == 1;
        document.getElementById('adminPassLabel').textContent = 'Update Password';
        document.getElementById('adminPassword').placeholder = 'Leave blank to keep current';
        
        openModal('modal-user');
    },

    async handleSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('adminUserId').value;
        const data = {
            id: id,
            username: document.getElementById('adminUsername').value,
            email: document.getElementById('adminEmail').value,
            full_name: document.getElementById('adminFullName').value,
            role: document.getElementById('adminRole').value,
            is_active: document.getElementById('adminIsActive').checked ? 1 : 0,
            password: id ? document.getElementById('adminPassword').value : (document.getElementById('adminPassword').value || '12345678')
        };

        const action = id ? 'admin_update_user' : 'admin_add_user';
        
        try {
            const res = await apiPost(action, data);
            if (res && res.success) {
                showToast(res.message, 'success');
                closeModal('modal-user');
                this.loadUsers();
            } else {
                showToast(res?.error || 'Gagal menyimpan data', 'error');
            }
        } catch (e) {
            showToast('Terjadi kesalahan sinkronisasi', 'error');
        }
    },

    async deleteUser(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus user ini secara permanen? Seluruh data terkait (perangkat, sensor, log) juga akan terhapus.')) return;

        try {
            const res = await apiPost('admin_delete_user', { id: id });
            if (res && res.success) {
                showToast(res.message, 'success');
                this.loadUsers();
            } else {
                showToast(res?.error || 'Gagal menghapus user', 'error');
            }
        } catch (e) {
            showToast('Gagal menghapus user', 'error');
        }
    },

    async viewUserDetails(id, username) {
        this.currentViewUserId = id; // Store for asset deletion
        document.getElementById('detailUserLabel').textContent = username;
        const container = document.getElementById('userDetailContent');
        container.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.5"><i class="fas fa-spinner fa-spin"></i> Memuat detail...</div>';
        openModal('modal-user-detail');

        try {
            const res = await apiPost('admin_get_user_details', { id });
            if (res && !res.success) throw new Error(res.error || 'Detail tidak ditemukan');
            if (!res) throw new Error('Sinkronisasi gagal');

            const { devices, sensors } = res.data;
            let html = '';

            // Devices Section
            html += `<div class="detail-section">
                <h4 style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center">
                    <span><i class="fas fa-microchip"></i> Daftar Perangkat (${devices.length})</span>
                </h4>`;
            if (devices.length === 0) {
                html += '<div style="opacity:0.5; font-size:12px; padding:10px">Tidak ada perangkat tersambung.</div>';
            } else {
                devices.forEach(d => {
                    html += `
                        <div class="detail-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border)">
                            <div style="flex:1">
                                <div class="detail-name" style="font-weight:700">${d.name}</div>
                                <div class="detail-meta" style="font-size:11px; opacity:0.6">${d.type} · <span class="status-indicator ${d.status === 'online' ? 'active' : 'inactive'}"></span> ${d.status}</div>
                            </div>
                            <button class="admin-action-btn delete" onclick="deleteUserAsset(${id}, 'device', ${d.id})" title="Hapus Perangkat">
                                <i class="fas fa-trash-alt" style="font-size:11px"></i>
                            </button>
                        </div>`;
                });
            }
            html += `</div>`;

            // Sensors Section
            html += `<div class="detail-section" style="margin-top:20px">
                <h4 style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center">
                    <span><i class="fas fa-signal"></i> Daftar Sensor (${sensors.length})</span>
                </h4>`;
            if (sensors.length === 0) {
                html += '<div style="opacity:0.5; font-size:12px; padding:10px">Tidak ada sensor terdeteksi.</div>';
            } else {
                sensors.forEach(s => {
                    html += `
                        <div class="detail-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border)">
                            <div style="flex:1">
                                <div class="detail-name" style="font-weight:700">${s.name}</div>
                                <div class="detail-meta" style="font-size:11px; opacity:0.6">${s.type} · <span style="color:var(--a)">${s.value} ${s.unit}</span></div>
                            </div>
                            <button class="admin-action-btn delete" onclick="deleteUserAsset(${id}, 'sensor', ${s.id})" title="Hapus Sensor">
                                <i class="fas fa-trash-alt" style="font-size:11px"></i>
                            </button>
                        </div>`;
                });
            }
            html += `</div>`;

            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<div style="color:var(--danger);padding:20px;text-align:center">${e.message}</div>`;
        }
    },

    async deleteUserAsset(userId, type, assetId) {
        if (!confirm(`Hapus ${type === 'device' ? 'perangkat' : 'sensor'} ini secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
        
        const action = type === 'device' ? 'admin_delete_user_device' : 'admin_delete_user_sensor';
        const data = type === 'device' ? { device_id: assetId } : { sensor_id: assetId };

        try {
            const res = await apiPost(action, data);
            if (res && res.success) {
                showToast(res.message, 'success');
                // Refresh detail modal
                this.viewUserDetails(userId, document.getElementById('detailUserLabel').textContent);
                this.loadUsers(); // Refresh main list to update counts
            } else {
                showToast(res?.error || 'Gagal menghapus aset', 'error');
            }
        } catch (e) {
            showToast('Gagal sinkronisasi penghapusan', 'error');
        }
    }
};

// Global hooks for HTML
window.openAddUserModal = () => AdminManager.openAddModal();
window.loadAdminUsers = () => AdminManager.loadUsers();
window.handleAdminUserSubmit = (e) => AdminManager.handleSubmit(e);
window.editAdminUser = (id) => AdminManager.editUser(id);
window.deleteAdminUser = (id, username) => AdminManager.deleteUser(id, username);
window.viewAdminUserDetails = (id, username) => AdminManager.viewUserDetails(id, username);
window.deleteUserAsset = (uid, type, aid) => AdminManager.deleteUserAsset(uid, type, aid);
window.filterAdminUsers = (q) => AdminManager.setSearch(q);
window.filterAdminByRole = (r) => AdminManager.setRoleFilter(r);
