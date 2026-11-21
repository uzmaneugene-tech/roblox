// Show the requested panel even if a tool's module fails to load.
(function () {
  function route() {
    const sections = Array.from(document.querySelectorAll('main > section[id]'));
    const hash = location.hash.slice(1);
    const page = sections.some(section => section.id === hash) ? hash : 'home';
    for (const section of sections) section.hidden = section.id !== page;
    for (const link of document.querySelectorAll('nav a')) {
      const active = link.hash === '#' + page;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.documentElement.dataset.view = page;
    window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent('framecut:view', {detail: page}));
  }
  route();
  window.addEventListener('hashchange', route);
})();
