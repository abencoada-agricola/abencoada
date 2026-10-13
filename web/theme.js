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
    button.className = 'btn theme-toggle';
    const update = () => {
      const dark = theme === 'dark';
      button.textContent = dark ? '☀ Tema claro' : '☾ Tema escuro';
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
    document.body.append(button);
    window.addEventListener('storage', event => {
      if (event.key === key) {
        theme = event.newValue === 'light' ? 'light' : 'dark';
        apply();
        update();
      }
    });
  });
})();
