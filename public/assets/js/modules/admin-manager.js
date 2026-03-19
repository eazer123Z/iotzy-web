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
                    <div style="display:flex;align-items:center;gap:12px">
                        <div class="user-avatar" style="width:32px;height:32px;font-size:12px">${u.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="font-weight:600">${u.username}</div>
                            <div style="font-size:11px;opacity:.6">${u.full_name || '-'}</div>
                        </div>
                    </div>
                </td>
                <td>${u.email || '-'}</td>
                <td><span class="badge badge-${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role.toUpperCase()}</span></td>
                <td>
                    <span class="status-pill status-${u.is_active ? 'online' : 'offline'}">
                        ${u.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                </td>
                <td>${u.last_login ? new Date(u.last_login).toLocaleString('id-ID') : 'Belum pernah'}</td>
                <td>
                    <div class="table-actions">
                        <button class="icon-btn" onclick="AdminManager.editUser(${u.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn" style="color:var(--danger)" onclick="AdminManager.deleteUser(${u.id})" title="Hapus"><i class="fas fa-trash"></i></button>
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
    }
};

// Global hooks for HTML
window.openAddUserModal = () => AdminManager.openAddModal();
window.loadAdminUsers = () => AdminManager.loadUsers();
window.handleAdminUserSubmit = (e) => AdminManager.handleSubmit(e);
