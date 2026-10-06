// Nav compartido por todas las páginas del sitio (home, /apps/, /politica-de-privacidad/).
// - Menú mobile a pantalla completa: aria-expanded, trampa de foco y cierre con Esc.
// - Chip activo en el link de la sección visible (solo en páginas con secciones ancladas).

// ---------- Menú mobile ----------
(function initMobileMenu(){
  const menu = document.getElementById('mobile-menu');
  const openBtn = document.querySelector('.nav-toggle[aria-controls="mobile-menu"]');
  if (!menu || !openBtn) return;

  const FOCUSABLE = 'a[href], button:not([disabled])';

  function open(){
    menu.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    menu.querySelector('[data-menu-close]').focus();
    document.addEventListener('keydown', onKeydown);
  }

  function close({ restoreFocus = true } = {}){
    menu.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);
    if (restoreFocus) openBtn.focus();
  }

  function onKeydown(e){
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...menu.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  openBtn.addEventListener('click', open);
  menu.querySelector('[data-menu-close]').addEventListener('click', () => close());
  // Al elegir un link, se cierra el menú y se deja seguir la navegación al ancla
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => close({ restoreFocus: false })));

  // Si se agranda la ventana con el menú abierto, se cierra solo
  matchMedia('(min-width: 761px)').addEventListener('change', (e) => {
    if (e.matches && !menu.hidden) close({ restoreFocus: false });
  });
})();

// ---------- Link activo según la sección visible ----------
(function initActiveSection(){
  const links = [...document.querySelectorAll('.nav-links a[href^="#"], .mobile-menu-links a[href^="#"]')];
  const ids = [...new Set(links.map(a => a.getAttribute('href').slice(1)))];
  const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;

  function setActive(id){
    links.forEach(a => {
      const active = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  // Una sección cuenta como visible cuando cruza una franja cerca del tercio superior de la pantalla
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
      else if (entry.target === sections[0] && entry.boundingClientRect.top > 0) setActive(null);
    });
  }, { rootMargin: '-35% 0px -60% 0px' });

  sections.forEach(s => observer.observe(s));
})();
