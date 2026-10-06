const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// =========================================================
// PROYECTOS EN LÍNEA — para sumar uno nuevo, agregá un objeto al array.
//
//   nombre       título de la tarjeta
//   url          link del botón "Visitar sitio". Si queda en null no se muestra el botón.
//   dominio      texto de la barra del navegador (si es null se usa el nombre)
//   descripcion  párrafo de la tarjeta
//   chips        tecnologías / features
//   color        color de la sombra del botón
//   captura      ruta a la captura (se recorta en 16:10 mostrando la parte de arriba).
//                Puede ser una captura de página completa. Si es null se muestra
//                un rectángulo de color con el nombre (placeholder.fondo / .texto)
// =========================================================
const PROJECTS = [
  {
    nombre: 'PlumAh!',
    url: 'https://plumah.com.ar/',
    dominio: 'plumah.com.ar',
    descripcion: 'Sitio para una marca fabricante de abanicos. Incluye un editor 3D donde cada cliente diseña su abanico con su estampa y su logo, y envía el diseño para cotizar.',
    chips: ['Editor 3D', 'Cards 3D interactivas', 'Panel de admin', 'Tiendanube'],
    color: '#C4006A',
    captura: 'assets/images/proyectos/plumah.webp',
    placeholder: { fondo: '#C4006A', texto: '#FFFFFF' }
  },
  {
    nombre: 'Remeritas',
    url: 'https://remeritas.com.ar',
    dominio: 'remeritas.com.ar',
    descripcion: 'Plataforma donde cada persona abre su tienda de remeras estampadas. El diseño se ve sobre un modelo 3D a medida que se edita, y cada tienda tiene su propio subdominio.',
    chips: ['Visor 3D en vivo', 'Tiendas con subdominio', 'Planes de suscripción', 'Marketplace curado'],
    color: '#0E7C8A',
    captura: 'assets/images/proyectos/remeritas.webp',
    placeholder: { fondo: '#E8F4F5', texto: '#0B5E69' }
  }
];

(function renderProjects(){
  const list = document.getElementById('project-list');
  if (!list) return;

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const arrow = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';

  list.innerHTML = PROJECTS.map(p => {
    const screen = p.captura
      ? `<img src="${esc(p.captura)}" alt="Captura de ${esc(p.nombre)}" loading="lazy">`
      : `<strong style="color:${esc(p.placeholder.texto)}">${esc(p.nombre)}</strong>`;
    const screenStyle = p.captura ? '' : ` style="background:${esc(p.placeholder.fondo)}"`;
    const button = p.url
      ? `<a class="btn btn-on-dark" href="${esc(p.url)}" target="_blank" rel="noopener" style="--btn-shadow:${esc(p.color)}">Visitar sitio ${arrow}<span class="visually-hidden"> (se abre en otra pestaña)</span></a>`
      : '';

    return `
      <article class="project">
        <div class="project-media">
          <div class="browser" aria-hidden="${p.captura ? 'false' : 'true'}">
            <div class="browser-bar"><i></i><i></i><i></i><span class="browser-url">${esc(p.dominio || p.nombre)}</span></div>
            <div class="browser-screen"${screenStyle}>${screen}</div>
          </div>
        </div>
        <div class="project-info">
          <span class="label label--ok"><span class="dot dot--light"></span>En línea</span>
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.descripcion)}</p>
          <ul class="chips">${p.chips.map(c => `<li class="chip">${esc(c)}</li>`).join('')}</ul>
          ${button}
        </div>
      </article>`;
  }).join('');
})();

// =========================================================
// LOTTIE — animación de la tarjeta "02 · Animación"
// Hover: la tapa se presiona. Click / Enter: se abre el regalo.
// Con prefers-reduced-motion no hay animación de hover, solo al hacer click.
// =========================================================
(function initLottie(){
  const el = document.getElementById('lottie-sample');
  if (!el || typeof lottie === 'undefined') return;

  const animation = lottie.loadAnimation({
    container: el,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'assets/lottie.json'
  });

  const SEGMENTS = {
    idle: [0, 1],
    hoverIn: [0, 25],   // tapa presionándose
    click: [25, 267]
  };

  let isLocked = false;
  let currentAction = null; // 'click' | 'hover' | 'idle'

  animation.addEventListener('DOMLoaded', () => {
    animation.setSubframe(false);
    currentAction = 'idle';
    animation.playSegments(SEGMENTS.idle, true);
  });

  if (!prefersReducedMotion) {
    el.addEventListener('mouseenter', () => {
      if (isLocked) return;
      currentAction = 'hover';
      animation.setDirection(1);
      animation.playSegments([animation.currentFrame, SEGMENTS.hoverIn[1]], true);
    });

    el.addEventListener('mouseleave', () => {
      if (isLocked) return;
      currentAction = 'idle';
      animation.setDirection(-1);
      animation.playSegments([animation.currentFrame, SEGMENTS.hoverIn[0]], true);
    });
  }

  // Es un <button>, así que el click también cubre Enter / Espacio
  el.addEventListener('click', () => {
    if (isLocked) return;
    isLocked = true;
    currentAction = 'click';
    animation.setDirection(1); // fuerza dirección, evita heredar -1 del hover
    animation.playSegments(SEGMENTS.click, true);
  });

  animation.addEventListener('complete', () => {
    if (currentAction === 'click') {
      isLocked = false;
      currentAction = 'idle';
      animation.setDirection(1);
      animation.playSegments(SEGMENTS.idle, true);
    }
  });
})();

// =========================================================
// PLANES — indicador de puntos del carrusel mobile
// =========================================================
(function initPlanDots(){
  const track = document.getElementById('plan-grid');
  const dotsWrap = document.getElementById('plan-dots');
  if (!track || !dotsWrap) return;

  // Orden visual (en mobile la tarjeta destacada va primero con CSS order)
  const cards = () => [...track.children].sort((a, b) => a.offsetLeft - b.offsetLeft);

  const dots = cards().map((card, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Ver plan ${i + 1} de ${track.children.length}`);
    dotsWrap.appendChild(b);
    return b;
  });

  function update(){
    const ordered = cards();
    const start = track.getBoundingClientRect().left;
    let current = 0, best = Infinity;
    ordered.forEach((card, i) => {
      const d = Math.abs(card.getBoundingClientRect().left - start);
      if (d < best) { best = d; current = i; }
    });
    // Si se llegó al final del scroll, el último queda activo
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) current = ordered.length - 1;
    dots.forEach((d, i) => d.setAttribute('aria-current', i === current ? 'true' : 'false'));
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    const card = cards()[i];
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }));

  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// =========================================================
// CONTACTO — POST a /api/contacto (Vercel + Resend)
// =========================================================
(function initContactForm(){
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button.textContent;

  function setStatus(type, text){
    status.className = 'form-status' + (type ? ` is-${type}` : '');
    status.textContent = text;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      const invalid = form.querySelector(':invalid');
      setStatus('error', invalid.type === 'email' && invalid.value
        ? 'Revisá el email, parece que tiene un error.'
        : 'Completá nombre, email y qué querés hacer.');
      invalid.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'Enviando…';
    setStatus('pending', 'Enviando tu mensaje…');

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus('ok', '¡Gracias! Recibí tu mensaje y te respondo pronto.');
        form.reset();
      } else {
        setStatus('error', result.error || 'No se pudo enviar. Probá de nuevo o escribime a contacto@juanpedro.com.ar.');
      }
    } catch (err) {
      setStatus('error', 'No se pudo enviar. Probá de nuevo o escribime a contacto@juanpedro.com.ar.');
    } finally {
      button.disabled = false;
      button.textContent = buttonLabel;
    }
  });
})();

// ---------- Título de pestaña: animación ASCII cuando la pestaña está oculta ----------
(function initTabAttention(){
  const originalTitle = document.title;
  const frames = ['┏(•ᴗ•)┛', '┗(•ᴗ•)┓'];
  let frameIndex = 0;
  let timer = null;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      frameIndex = 0;
      timer = setInterval(() => {
        document.title = frames[frameIndex % frames.length];
        frameIndex++;
      }, 100);
    } else {
      clearInterval(timer);
      document.title = originalTitle;
    }
  });
})();
