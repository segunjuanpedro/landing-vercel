// =========================================================
// APPS_CONFIG — cargá acá cada app. Para agregar una nueva:
//   1. Creá una carpeta en assets/apps/<id-de-la-app>/
//   2. Poné ahí el .apk, el ícono, el banner y las imágenes de instrucciones
//   3. Copiá el objeto de ejemplo de abajo, editalo y agregalo al array
//
// Campos:
//   id           identificador único (sin espacios), se usa solo internamente
//   nombre       nombre de la app
//   tagline      descripción corta, se muestra en la card de la grilla
//   descripcion  descripción larga, se muestra dentro del modal
//   version      texto libre, ej. "1.2.0"
//   peso         texto libre, ej. "18 MB"
//   icono        ruta al ícono cuadrado (se ve en la card y en el modal)
//   banner       ruta a la imagen de banner (se ve arriba de la card y del modal)
//   apk          ruta al archivo .apk a descargar
//   instrucciones  array opcional de pasos: [{ texto, imagen }]
//                  "imagen" es opcional — dejalo en null si el paso no necesita foto
//
// Nota: las rutas son relativas a esta página (/apps/), por eso llevan "../"
// adelante de "assets/...".
//
// Ejemplo (descomentar y editar para publicar una app real):
//
// {
//   id: 'mi-app',
//   nombre: 'Mi App',
//   tagline: 'Una frase corta de qué hace',
//   descripcion: 'Acá va una descripción más completa de la app, qué resuelve y para quién es.',
//   version: '1.0.0',
//   peso: '15 MB',
//   icono: '../assets/apps/mi-app/icono.png',
//   banner: '../assets/apps/mi-app/banner.jpg',
//   apk: '../assets/apps/mi-app/mi-app.apk',
//   instrucciones: [
//     { texto: 'Descargá el archivo .apk con el botón de arriba.', imagen: null },
//     { texto: 'Abrí el archivo desde tus notificaciones o el explorador de archivos.', imagen: '../assets/apps/mi-app/paso2.png' },
//     { texto: 'Si Android avisa "origen desconocido", tocá Configuración y permitilo para instalar.', imagen: '../assets/apps/mi-app/paso3.png' }
//   ]
// }
// =========================================================
const APPS_CONFIG = [
  {
    id: 'launcher-juanpedro',
    nombre: 'LauncherJuanPedro',
    tagline: 'Para reducir el tiempo en pantalla',
    descripcion: 'Este launcher reemplaza la interfaz por defecto de Android por una lista simple de apps en orden aleatorio. Así se evita el gesto automático de abrir apps sin pensar. Manteniendo presionado un ícono, podés fijarlo en la parte superior u ocultarlo si no querés verlo. Atención: las apps se abren con doble clic, a propósito, para sumar una fricción extra antes de abrirlas.',
    version: '1.0.0',
    peso: '10 MB',
    icono: '../assets/apps/launcher/icon.svg',
    banner: '../assets/apps/launcher/banner.svg',
    apk: '../assets/apps/launcher/LauncherJuanPedro.apk',
    instrucciones: [
      { texto: 'Instalá la app. Ojo: no vas a ver un ícono nuevo para abrirla, y es normal — este launcher no se abre como una app común.', imagen: null },
      { texto: 'Andá a Ajustes → Aplicaciones.', imagen: null },
      { texto: 'Buscá y seleccioná "LauncherJuanPedro" en la lista de apps.', imagen: null },
      { texto: 'Tocá "Pantalla de inicio" y elegí LauncherJuanPedro como app de inicio predeterminada. Desde ese mismo menú podés revertirlo cuando quieras.', imagen: null }
    ]
  },
  {
    id: 'reloj-24hs',
    nombre: 'Reloj24hs',
    tagline: 'Organizador semanal',
    descripcion: 'Un reloj simple que muestra la hora en formato de 24hs, pero de una sola vuelta, pensado para visualizar el día completo y qué tiempo queda disponible.',
    version: '1.0.0',
    peso: '5 MB',
    icono: '../assets/apps/reloj-24hs/icon.png',
    banner: '../assets/apps/reloj-24hs/banner.png',
    apk: '../assets/apps/reloj-24hs/Reloj24hs.apk',
    instrucciones: [
      { texto: 'Descargá el archivo .apk con el botón de arriba.', imagen: null },
      { texto: 'Abrí el archivo descargado desde tus notificaciones o el explorador de archivos.', imagen: null },
      { texto: 'Si Android avisa "origen desconocido", tocá Configuración y permitilo para poder instalar.', imagen: null }
    ]
  }
];

// ---------- Render de la grilla ----------
const appsGrid = document.getElementById('appsGrid');

function renderApps(){
  if(APPS_CONFIG.length === 0){
    appsGrid.innerHTML = '<p class="apps-empty">Todavía no hay apps publicadas. ¡Volvé pronto!</p>';
    return;
  }

  appsGrid.innerHTML = '';
  APPS_CONFIG.forEach((app, index) => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver detalles de ${app.nombre}`);
    card.innerHTML = `
      <div class="app-card-banner"><img loading="lazy" src="${app.banner}" alt="${app.nombre}"></div>
      <div class="app-card-body">
        <img class="app-card-icon" loading="lazy" src="${app.icono}" alt="">
        <div class="app-card-info">
          <h3>${app.nombre}</h3>
          <p>${app.tagline}</p>
          <div class="app-card-meta"><span>v${app.version}</span><span>${app.peso}</span></div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openAppModal(index));
    card.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openAppModal(index); }
    });
    appsGrid.appendChild(card);
  });
}

// ---------- Modal ----------
const overlay = document.getElementById('appModalOverlay');
const modalBanner = document.getElementById('appModalBanner');
const modalIcon = document.getElementById('appModalIcon');
const modalTitle = document.getElementById('appModalTitle');
const modalMeta = document.getElementById('appModalMeta');
const modalDesc = document.getElementById('appModalDesc');
const modalDownload = document.getElementById('appModalDownload');
const modalInstructions = document.getElementById('appModalInstructions');
const modalClose = document.getElementById('appModalClose');

function openAppModal(index){
  const app = APPS_CONFIG[index];
  if(!app) return;

  modalBanner.src = app.banner;
  modalBanner.alt = app.nombre;
  modalIcon.src = app.icono;
  modalIcon.alt = '';
  modalTitle.textContent = app.nombre;
  modalMeta.innerHTML = `<span>v${app.version}</span><span>${app.peso}</span>`;
  modalDesc.textContent = app.descripcion;
  modalDownload.href = app.apk;

  const pasos = app.instrucciones || [];
  if(pasos.length === 0){
    modalInstructions.innerHTML = '';
  } else {
    modalInstructions.innerHTML = `
      <h3>Cómo instalarla</h3>
      ${pasos.map((paso, i) => `
        <div class="instruction-step">
          <span class="instruction-step-num">${i + 1}</span>
          <div class="instruction-step-content">
            <p>${paso.texto}</p>
            ${paso.imagen ? `<img loading="lazy" src="${paso.imagen}" alt="Paso ${i + 1} de instalación">` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }

  overlay.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeAppModal(){
  overlay.classList.remove('open');
  document.body.classList.remove('modal-open');
}

modalClose.addEventListener('click', closeAppModal);
overlay.addEventListener('click', (e) => {
  if(e.target === overlay) closeAppModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && overlay.classList.contains('open')) closeAppModal();
});

renderApps();
