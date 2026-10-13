(() => {
  const key = 'diesel-theme';
  let theme = 'dark';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {}
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e3024' : '#f3f6f2');
  };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn theme-toggle';
    const update = () => {
      const dark = theme === 'dark';
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dark ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>' : '<path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/>'}</svg>`;
      button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
      button.title = button.getAttribute('aria-label');
    };
    button.onclick = () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, theme); } catch {}
      apply();
      update();
    };
    update();
    const mount = () => {
      const notifications = document.querySelector('#notifications');
      const header = document.querySelector('.field-header');
      if (notifications) {
        if (notifications.nextElementSibling !== button) notifications.after(button);
      } else if (header) {
        if (button.parentElement !== header) header.append(button);
      } else if (button.isConnected) button.remove();
    };
    mount();
    // The application rebuilds its header when navigating or syncing.
    new MutationObserver(mount).observe(document.querySelector('#app') || document.body, {childList:true,subtree:true});
    window.addEventListener('storage', event => {
      if (event.key === key) {
        theme = event.newValue === 'light' ? 'light' : 'dark';
        apply();
        update();
      }
    });
  });
})();
