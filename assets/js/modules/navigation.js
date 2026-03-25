function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .bn-item');
  const sections = document.querySelectorAll('.view');
  
  function openPage(pageId) {
    if (!pageId) return;
    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(i => i.classList.remove('active'));
    
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    
    document.querySelectorAll(`[data-page="${pageId}"]`).forEach(i => i.classList.add('active'));
    
    const title = document.querySelector(`.nav-item[data-page="${pageId}"] .nav-label`)?.textContent || "Dashboard";
    const titleEl = document.getElementById('currentPageTitle');
    const breadEl = document.getElementById('breadcrumbCurrent');
    if (titleEl) titleEl.textContent = title;
    if (breadEl) breadEl.textContent = title;
    
    if (pageId === 'logs' && typeof loadLogs === 'function') loadLogs();
    if (pageId === 'automation' && typeof renderAutomationView === 'function') renderAutomationView();
    
    localStorage.setItem('iotzy-last-tab', pageId);
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      openPage(item.getAttribute('data-page'));
    });
  });

  function navigateTo(pageId) {
    openPage(pageId);
  }

  window.openPage = openPage;
  window.navigateTo = navigateTo;
  const lastTab = localStorage.getItem('iotzy-last-tab') || 'dashboard';
  openPage(lastTab);
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});
