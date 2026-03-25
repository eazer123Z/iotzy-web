function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-page');
            if (!target) return;
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.style.display = 'none');
            const targetSec = document.getElementById(target);
            if (targetSec) targetSec.style.display = 'flex';
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (window.innerWidth <= 1024) {
                sidebar?.classList.remove('show');
                overlay?.classList.remove('show');
                document.body.style.overflow = '';
            }
            if (target === 'logs') loadLogs();
            if (target === 'automation') if (typeof renderAutomationView === 'function') renderAutomationView();
            localStorage.setItem('iotzy-last-tab', target);
        });
    });
    const lastTab = localStorage.getItem('iotzy-last-tab') || 'dashboard';
    const lastItem = document.querySelector(`.nav-item[data-page="${lastTab}"]`);
    if (lastItem) lastItem.click();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const isShowing = sidebar.classList.contains('show');
    if (!isShowing) {
        sidebar.classList.add('show');
        overlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('show');
        overlay?.classList.remove('show');
        document.body.style.overflow = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    const btn = document.getElementById('sidebarToggle');
    if (btn) btn.onclick = toggleSidebar;
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.onclick = toggleSidebar;
});
