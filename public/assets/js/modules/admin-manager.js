/**
 * public/assets/js/modules/admin-manager.js
 * Manajemen Pengguna dari sisi Admin Panel
 */

const AdminManager = {
    users: [],

    async init() {
        console.log('[IoTzy Admin] Initializing...');
    },

    async loadUsers() {
        const tbody = document.getElementById('adminUserTableBody');
        if (!tbody) return;

        try {
            const res = await apiPost('admin_get_users');
            if (res.success) {
                this.users = res.data;
                this.renderUsers();
                this.updateStats();
            } else {
                showToast(res.error || 'Gagal memuat daftar user', 'error');
            }
        } catch (e) {
            console.error('[Admin] Load users error:', e);
        }
    },

    renderUsers() {
        const tbody = document.getElementById('adminUserTableBody');
        if (!this.users.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:rgba(255,255,255,.4)">Tidak ada data pengguna.</td></tr>';
            return;
        }

        tbody.innerHTML = this.users.map(u => `
            <tr>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar">${u.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="user-name-text">${u.full_name || u.username}</div>
                            <div class="user-sub-text">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px">
                        <span class="admin-stat-pill device"><i class="fas fa-microchip"></i> ${u.device_count || 0} Device</span>
                        <span class="admin-stat-pill sensor"><i class="fas fa-signal"></i> ${u.sensor_count || 0} Sensor</span>
                    </div>
                </td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>
                    <span class="status-indicator ${u.is_active ? 'active' : 'inactive'}"></span>
                    ${u.is_active ? 'Aktif' : 'Nonaktif'}
                </td>
                <td>${u.last_login ? formatDate(u.last_login) : '<span style="opacity:0.4">Belum pernah</span>'}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" onclick="viewAdminUserDetails(${u.id}, '${u.username}')" title="Liat Detail Setup">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editAdminUser(${u.id})" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${u.role !== 'admin' ? `
                        <button class="action-btn delete" onclick="deleteAdminUser(${u.id}, '${u.username}')" title="Hapus User">
                            <i class="fas fa-trash-alt"></i>
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
        document.getElementById('userModalTitle').textContent = 'Tambah User Baru';
        document.getElementById('adminTargetUserId').value = '';
        document.getElementById('adminUserForm').reset();
        document.getElementById('adminUsername').disabled = false;
        document.getElementById('adminEmailGroup').style.display = 'block';
        openModal('modal-user');
    },

    editUser(id) {
        const user = this.users.find(u => u.id == id);
        if (!user) return;

        document.getElementById('userModalTitle').textContent = 'Edit User: ' + user.username;
        document.getElementById('adminTargetUserId').value = user.id;
        document.getElementById('adminUsername').value = user.username;
        document.getElementById('adminUsername').disabled = true;
        document.getElementById('adminEmail').value = user.email || '';
        document.getElementById('adminFullName').value = user.full_name || '';
        document.getElementById('adminRole').value = user.role;
        document.getElementById('adminIsActive').checked = user.is_active == 1;
        
        // Sembunyikan email group saat edit untuk simplicity (opsional) atau biarkan ada.
        // Kita biarkan ada tapi password jadi opsional.
        
        openModal('modal-user');
    },

    async handleSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('adminTargetUserId').value;
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
            if (res.success) {
                showToast(res.message, 'success');
                closeModal('modal-user');
                this.loadUsers();
            } else {
                showToast(res.error, 'error');
            }
        } catch (e) {
            showToast('Terjadi kesalahan sinkronisasi', 'error');
        }
    },

    async deleteUser(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus user ini secara permanen? Seluruh data terkait (perangkat, sensor, log) juga akan terhapus.')) return;

        try {
            const res = await apiPost('admin_delete_user', { id: id });
            if (res.success) {
                showToast(res.message, 'success');
                this.loadUsers();
            } else {
                showToast(res.error, 'error');
            }
        } catch (e) {
            showToast('Gagal menghapus user', 'error');
        }
    },

    async viewUserDetails(id, username) {
        document.getElementById('detailUserLabel').textContent = username;
        const container = document.getElementById('userDetailContent');
        container.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.5"><i class="fas fa-spinner fa-spin"></i> Memuat detail...</div>';
        openModal('modal-user-detail');

        try {
            const res = await apiPost('admin_get_user_details', { id });
            if (!res.success) throw new Error(res.error);

            const { devices, sensors } = res.data;
            let html = '';

            // Devices Section
            html += `<div class="detail-section">
                <h4><i class="fas fa-microchip"></i> Daftar Perangkat (${devices.length})</h4>`;
            if (devices.length === 0) {
                html += '<div style="opacity:0.5; font-size:12px; padding:10px">Tidak ada perangkat.</div>';
            } else {
                devices.forEach(d => {
                    html += `
                        <div class="detail-item">
                            <div>
                                <div class="detail-name">${d.name}</div>
                                <div class="detail-meta">${d.type}</div>
                            </div>
                            <div class="detail-meta" style="text-align:right">
                                <span class="status-indicator ${d.status === 'online' ? 'active' : 'inactive'}"></span>
                                ${d.status}
                            </div>
                        </div>`;
                });
            }
            html += `</div>`;

            // Sensors Section
            html += `<div class="detail-section">
                <h4><i class="fas fa-signal"></i> Daftar Sensor (${sensors.length})</h4>`;
            if (sensors.length === 0) {
                html += '<div style="opacity:0.5; font-size:12px; padding:10px">Tidak ada sensor.</div>';
            } else {
                sensors.forEach(s => {
                    html += `
                        <div class="detail-item">
                            <div>
                                <div class="detail-name">${s.name}</div>
                                <div class="detail-meta">${s.type}</div>
                            </div>
                            <div class="detail-meta" style="text-align:right; font-weight:700; color:var(--primary)">
                                ${s.value} ${s.unit}
                            </div>
                        </div>`;
                });
            }
            html += `</div>`;

            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<div style="color:var(--danger);padding:20px;text-align:center">${e.message}</div>`;
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
