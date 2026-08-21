(function () {
  const ASSET_HDRI = 'assets/HDRI.hdr'; // compartido entre los 3 modelos

  // Config centralizada: un modelo por objeto. "editableMaterialName" es el material
  // que el usuario puede re-texturar en ESE modelo (puede variar de uno a otro).
  // Ajustar rutas y nombre de material si no coinciden con los archivos reales.
  const MODELS = [
    {
      id: 'sweater',
      label: 'Sweater',
      model: 'assets/sweater.gltf',
      baseTexture: 'assets/tex_sweater.png',
      editableMaterialName: 'Tela',
      scaleMultiplier: 1, // ajustar a ojo si se ve muy chico/grande frente a los otros
      cameraDistance: 2.2, // qué tan lejos arranca la cámara (más alto = más lejos)
      cameraHeight: 0.6,   // a qué altura relativa del modelo apunta la cámara (0 = base, 1 = arriba)
    },
    {
      id: 'paraguas',
      label: 'Paraguas',
      model: 'assets/paraguas.gltf',
      baseTexture: 'assets/tex_paraguas.png',
      editableMaterialName: 'Tela',
      scaleMultiplier: 2,
      cameraDistance: 2.2,
      cameraHeight: 0.6,
    },
    {
      id: 'taza',
      label: 'Taza',
      model: 'assets/taza.gltf',
      baseTexture: 'assets/tex_taza.png',
      editableMaterialName: 'estampa', // ajustar si el material del vaso se llama distinto
      scaleMultiplier: 0.3,
      cameraDistance: 2.2,
      cameraHeight: 2,
    },
  ];
  const DEFAULT_MODEL_ID = 'sweater';

  const viewer = document.getElementById('viewer');
  const loadingEl = document.getElementById('loading');

  // ---------- Escena base ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 1.4, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  viewer.appendChild(renderer.domElement);

  // Luz de relleno además del HDRI, para que la prenda tenga un brillo definido
  const keyLight = new THREE.DirectionalLight(0xffffff, 0);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 1.2;
  controls.maxDistance = 6;
  controls.update();

  // ---------- Fondo: oscuro por defecto, toggle a claro ----------
  let currentBgMode = 'dark';
  const BG_COLORS = { light: 0xe8e6df, dark: 0x0f0f10 };

  function setBackgroundMode(mode) {
    currentBgMode = mode;
    scene.background = new THREE.Color(BG_COLORS[mode]);
  }
  scene.background = new THREE.Color(BG_COLORS.dark); // arranca oscuro sin esperar al HDRI

  // ---------- HDRI fijo: solo ilumina y da reflejos, no se puede elegir como fondo ----------
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  new THREE.RGBELoader().load(ASSET_HDRI, (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    scene.environment = envMap; // ilumina y da reflejos siempre, con cualquier fondo elegido
    hdrTexture.dispose();
    pmremGenerator.dispose();
  }, undefined, (err) => {
    console.error('No se pudo cargar el HDRI:', err);
  });

  // ---------- Modelo activo ----------
  let currentModelRoot = null;   // objeto 3D actualmente en escena
  let currentModelConfig = null; // config del modelo activo
  let editableMaterials = [];    // solo el/los materiales editables del modelo activo
  let currentTexture = null;     // textura THREE activa

  function frameObject(obj, scaleMultiplier, cameraDistance, cameraHeight) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = (1.6 / maxDim) * (scaleMultiplier || 1);
    obj.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(obj);
    const center2 = box2.getCenter(new THREE.Vector3());
    obj.position.sub(center2);
    const height2 = box2.getSize(new THREE.Vector3()).y;
    obj.position.y += height2 / 2;
    controls.target.set(0, height2 * 0.5, 0);
    camera.position.set(0, height2 * (cameraHeight ?? 0.6), height2 * (cameraDistance ?? 2.2) + 1);
    controls.update();
  }

  // Devuelve todos los materiales únicos del modelo (sin filtrar).
  function collectAllMaterials(root) {
    const seen = new Set();
    const list = [];
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (seen.has(mat.uuid)) return;
        seen.add(mat.uuid);
        list.push(mat);
      });
    });
    return list;
  }

  function applyTextureToGarment(texture) {
    texture.flipY = false; // convención de UV de glTF
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    editableMaterials.forEach((mat) => {
      mat.map = texture;
      if (mat.color) mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });
    currentTexture = texture;
  }

  // Libera geometrías, materiales y texturas del modelo saliente para no dejar memoria colgada.
  function disposeModel(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
    });
  }

  // Carga (o cambia a) el modelo indicado por su config. Saca el anterior de escena si existe.
  function loadModel(config) {
    loadingEl.textContent = 'Cargando modelo…';
    loadingEl.classList.remove('hidden');

    new THREE.GLTFLoader().load(
      config.model,
      (gltf) => {
        if (currentModelRoot) {
          scene.remove(currentModelRoot);
          disposeModel(currentModelRoot);
        }

        const model = gltf.scene;
        scene.add(model);
        frameObject(model, config.scaleMultiplier, config.cameraDistance, config.cameraHeight);

        const allMaterials = collectAllMaterials(model);
        allMaterials.forEach((mat) => {
          mat.side = THREE.DoubleSide; // se tienen que ver los dos lados de cada polígono siempre
          mat.needsUpdate = true;
        });

        editableMaterials = allMaterials.filter((mat) => mat.name === config.editableMaterialName);
        if (editableMaterials.length === 0) {
          console.warn(
            'No se encontró ningún material llamado "' + config.editableMaterialName + '" en "' + config.id + '". Nombres disponibles:',
            allMaterials.map((m) => m.name)
          );
        }

        currentModelRoot = model;
        currentModelConfig = config;
        currentTexture = null;

        new THREE.TextureLoader().load(
          config.baseTexture,
          (baseTex) => {
            applyTextureToGarment(baseTex);
            loadingEl.classList.add('hidden');
          },
          undefined,
          (err) => {
            console.error('No se pudo cargar la textura base:', err);
            loadingEl.classList.add('hidden');
          }
        );
      },
      undefined,
      (err) => {
        console.error('No se pudo cargar el modelo:', err);
        loadingEl.textContent = 'No se pudo cargar el modelo.';
      }
    );
  }

  const initialConfig = MODELS.find((m) => m.id === DEFAULT_MODEL_ID) || MODELS[0];
  loadModel(initialConfig);

  // ---------- Selector de modelo ----------
  const modelButtons = document.querySelectorAll('[data-model-id]');
  modelButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modelId;
      if (currentModelConfig && id === currentModelConfig.id) return;
      const config = MODELS.find((m) => m.id === id);
      if (!config) return;
      modelButtons.forEach((b) => b.classList.toggle('active', b === btn));
      loadModel(config);
    });
  });

  // ---------- Cambiar / restaurar textura ----------
  const textureInput = document.getElementById('textureInput');
  document.getElementById('btnTexture').addEventListener('click', () => textureInput.click());

  textureInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        applyTextureToGarment(tex);
        URL.revokeObjectURL(url);
      },
      undefined,
      () => {
        alert('No se pudo leer esa imagen. Probá con .png, .jpg o .webp');
        URL.revokeObjectURL(url);
      }
    );
    e.target.value = '';
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!currentModelConfig) return;
    new THREE.TextureLoader().load(currentModelConfig.baseTexture, applyTextureToGarment);
  });

  // ---------- Descargar la textura activa ----------
  document.getElementById('btnDownload').addEventListener('click', () => {
    if (!currentTexture || !currentTexture.image) {
      alert('Todavía no hay una textura cargada.');
      return;
    }
    const img = currentTexture.image;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) {
      alert('La imagen todavía no terminó de cargar, probá de nuevo en un segundo.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) { alert('No se pudo generar el archivo.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const modelId = currentModelConfig ? currentModelConfig.id : 'modelo';
      a.download = 'textura-' + modelId + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  });

  // ---------- Rotación automática on/off ----------
  const btnAutoRotate = document.getElementById('btnAutoRotate');
  btnAutoRotate.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAutoRotate.classList.toggle('active', controls.autoRotate);
    btnAutoRotate.setAttribute('data-tooltip', 'Rotación automática: ' + (controls.autoRotate ? 'activada' : 'desactivada'));
  });

  // ---------- Fondo: un solo botón que alterna claro/oscuro ----------
  const BG_ICONS = {
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
  };
  const btnBgToggle = document.getElementById('btnBgToggle');
  function renderBgToggle() {
    btnBgToggle.innerHTML = BG_ICONS[currentBgMode];
    btnBgToggle.setAttribute('data-tooltip', 'Fondo: ' + (currentBgMode === 'dark' ? 'oscuro' : 'claro'));
  }
  setBackgroundMode('dark');
  renderBgToggle();
  btnBgToggle.addEventListener('click', () => {
    setBackgroundMode(currentBgMode === 'dark' ? 'light' : 'dark');
    renderBgToggle();
  });

  // ---------- Modal de info ---------- 
  const infoOverlay = document.getElementById('infoOverlay');
  const btnInfo = document.getElementById('btnInfo');
  const btnInfoClose = document.getElementById('btnInfoClose');

  function openInfoModal() {
    infoOverlay.classList.add('visible');
  }
  function closeInfoModal() {
    infoOverlay.classList.remove('visible');
  }

  btnInfo.addEventListener('click', openInfoModal);
  btnInfoClose.addEventListener('click', closeInfoModal);
  infoOverlay.addEventListener('click', (e) => {
    if (e.target === infoOverlay) closeInfoModal(); // clic afuera del modal
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeInfoModal();
  });

  // ---------- Loop y resize ----------
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();