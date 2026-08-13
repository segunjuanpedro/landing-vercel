/* =========================================================================
   VISOR 3D — configuración editable
   Cambiá estos valores para ajustar el modelo, el entorno y el material
   sin tocar la lógica de abajo.
   ========================================================================= */
const VIEWER_CONFIG = {

  // Contenedor donde se monta el visor (ver id="glb-viewer" en el HTML)
  containerId: 'glb-viewer',


    // Muestra el lado interno de los polígonos
  showBackSide: true,
  // Modelo .glb a mostrar. Si queda en null, se arma un modelo de
  // referencia por código (una esfera de vidrio) para no depender de un archivo.
  // Si el archivo GLB contiene animaciones, el visor las reproducirá.
  glbUrl: 'assets/terrario.gltf',
  // ej: glbUrl: 'assets/modelo-animado.glb',

  // Animación
  animationClipName: null, // nombre exacto del clip a reproducir, o null para usar el primero
  animationIndex: 0,      // índice de la animación a reproducir si no se define animationClipName
  animationLoop: true,     // true = reproduce la animación en bucle
  animationPingPong: true, // true = usa ping-pong en lugar de repeat normal
  animationRepeatCount: undefined, // número de repeticiones; undefined = infinito si loop=true, 0 si loop=false
  animationTimeScale: 1,

  // Entorno / HDRI — mejora mucho los reflejos en vidrio y metal.
  // Podés usar un .hdr o directamente una imagen equirectangular (.jpg/.png).
  hdriUrl: 'assets/hdri2.hdr',
  // ej: hdriUrl: 'assets/estudio.hdr',
  useEnvAsBackground: true, // true = se ve el HDRI como fondo, no solo como reflejo

  // Fondo — "solid" usa backgroundColor. "transparent" deja ver lo que
  // haya detrás del visor en la página (el color de --surface-alt de la sección).
  backgroundMode: 'solid', // 'solid' | 'transparent'
  backgroundColor: '#936f62', // coincide con --surface-alt del sitio

  // Cámara / interacción
  autoRotate: true,
  autoRotateSpeed: 1.1,
  enableZoom: true,
  enablePan: true,
  minDistance: 1,
  maxDistance: 6,
  exposure: 0.4,

  // Luces
  ambientIntensity: 0,
  keyLightIntensity: 0,
  fillLightIntensity: 0,
  rimLightIntensity: 0,

  // Vidrio — se aplica sobre los materiales que matcheen glassMaterialMatch.
  // Si el modelo no tiene ningún material que matchee, no se aplica nada.
  glass: {
    enabled: true,
    applyToAll: false,                    // true = todo el modelo se ve como vidrio
    materialMatch: /glass|vidrio|cristal/i,
    transmission: 1,
    roughness: 0.05,
    thickness: 0.5,
    ior: 1.5,
    tint: '#000000'
  }
};

/* =========================================================================
   LÓGICA DEL VISOR — no hace falta tocar esto para ajustar la apariencia
   ========================================================================= */
(function(){
  const container = document.getElementById(VIEWER_CONFIG.containerId);
  if (!container) return;

  const scene = new THREE.Scene();

  if (VIEWER_CONFIG.backgroundMode === 'transparent') {
    scene.background = null; // deja ver lo que haya detrás del canvas en la página
  } else {
    scene.background = new THREE.Color(VIEWER_CONFIG.backgroundColor);
  }

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 1000);
  camera.position.set(3.2, 1.6, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const clock = new THREE.Clock();
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = VIEWER_CONFIG.exposure;
  container.appendChild(renderer.domElement);


  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Controles: solo rotar y zoom, sin panel ni UI adicional
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = VIEWER_CONFIG.enableZoom;
  controls.enablePan = VIEWER_CONFIG.enablePan;
  controls.minDistance = VIEWER_CONFIG.minDistance;
  controls.maxDistance = VIEWER_CONFIG.maxDistance;
  controls.autoRotate = VIEWER_CONFIG.autoRotate;
  controls.autoRotateSpeed = VIEWER_CONFIG.autoRotateSpeed;
  controls.update();

  let modelRoot = null;
  let mixer = null;
  let activeAction = null;

  function disposeMixer(){
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(modelRoot);
      mixer = null;
      activeAction = null;
    }
  }

  function pickAnimationClip(animations){
    if (!animations || animations.length === 0) return null;
    if (VIEWER_CONFIG.animationClipName) {
      const named = animations.find(a => a.name === VIEWER_CONFIG.animationClipName);
      if (named) return named;
    }
    if (typeof VIEWER_CONFIG.animationIndex === 'number' && animations[VIEWER_CONFIG.animationIndex]) {
      return animations[VIEWER_CONFIG.animationIndex];
    }
    return animations[0];
  }

  function setupAnimation(animations){
    disposeMixer();
    const clip = pickAnimationClip(animations);
    if (!clip) return;
    mixer = new THREE.AnimationMixer(modelRoot);
    activeAction = mixer.clipAction(clip);
    activeAction.reset();
    activeAction.setEffectiveTimeScale(VIEWER_CONFIG.animationTimeScale);
    if (VIEWER_CONFIG.animationLoop) {
      const repeat = typeof VIEWER_CONFIG.animationRepeatCount === 'number'
        ? Math.max(1, VIEWER_CONFIG.animationRepeatCount)
        : Infinity;
      const loopMode = VIEWER_CONFIG.animationPingPong ? THREE.LoopPingPong : THREE.LoopRepeat;
      activeAction.setLoop(loopMode, repeat);
    } else {
      activeAction.setLoop(THREE.LoopOnce, 0);
      activeAction.clampWhenFinished = true;
    }
    activeAction.play();
  }

  function makeGlassMaterial(baseColor){
    const g = VIEWER_CONFIG.glass;
    return new THREE.MeshPhysicalMaterial({
      color: baseColor || new THREE.Color(g.tint),
      transparent: true,
      opacity: 0.4,
      transmission: g.transmission,
      roughness: g.roughness,
      thickness: g.thickness,
      ior: g.ior,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      metalness: 0
    });
  }

  function makeGlassMaterial(baseColor){
    const g = VIEWER_CONFIG.glass;
    return new THREE.MeshPhysicalMaterial({
      color: baseColor || new THREE.Color(g.tint),
      side: VIEWER_CONFIG.showBackSide ? THREE.DoubleSide : THREE.FrontSide,
      transparent: true,
      opacity: 0.4,
      transmission: g.transmission,
      roughness: g.roughness,
      thickness: g.thickness,
      ior: g.ior,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      metalness: 0
    });
  }

  // Recorre el modelo y aplica vidrio a los materiales que matcheen
  function applyGlass(root){
    if (!VIEWER_CONFIG.glass.enabled) return;
    const cache = new Map();
    root.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

      mats.forEach(mat => {
        if (VIEWER_CONFIG.showBackSide) {
          mat.side = THREE.DoubleSide;
        }
      });

      const newMats = mats.map(mat => {
        const name = (mat.name || '').toLowerCase();
        const isGlass = VIEWER_CONFIG.glass.applyToAll || VIEWER_CONFIG.glass.materialMatch.test(name) || mat.transparent === true;
        if (!isGlass) return mat;
        if (!cache.has(mat.uuid)) {
          const baseColor = mat.color ? mat.color.clone() : null;
          cache.set(mat.uuid, makeGlassMaterial(baseColor));
        }
        return cache.get(mat.uuid);
      });

      obj.material = Array.isArray(obj.material) ? newMats : newMats[0];
    });
  }

  function frameObject(obj){
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.6 / maxDim;
    obj.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(obj);
    const center2 = box2.getCenter(new THREE.Vector3());
    obj.position.sub(center2);
    const size2 = box2.getSize(new THREE.Vector3());
    obj.position.y += size2.y / 2;
    controls.target.set(0, size2.y * 0.4, 0);
    camera.position.set(1.8, size2.y * 0.8 + 0.8, 2.6);
    controls.update();
  }

  // Modelo de referencia por código: se usa si no se definió VIEWER_CONFIG.glbUrl.
  // Reemplazalo por tu propio .glb apenas lo tengas.
  function loadPlaceholderModel(){
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 40), makeGlassMaterial(new THREE.Color('#ffffff')));
    sphere.position.y = 0.55;
    group.add(sphere);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.9, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: 0xC9B078, roughness: 1 })
    );
    base.position.y = -0.45;
    group.add(base);
    modelRoot = group;
    scene.add(group);
    frameObject(group);
  }

  function loadModel(url){
    const loader = new THREE.GLTFLoader();
    loader.load(url, (gltf) => {
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeMixer();
      }
      modelRoot = gltf.scene;
      applyGlass(modelRoot);
      scene.add(modelRoot);
      frameObject(modelRoot);
      setupAnimation(gltf.animations);
    }, undefined, (err) => {
      console.error('No se pudo cargar el modelo, se muestra el de referencia.', err);
      loadPlaceholderModel();
    });
  }

  function loadEnvironment(url){
    const isHDR = /\.hdr$/i.test(url);
    const onTexture = (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      texture.dispose();
      scene.environment = envMap;
      if (VIEWER_CONFIG.useEnvAsBackground) scene.background = envMap;
    };
    if (isHDR) new THREE.RGBELoader().load(url, onTexture);
    else new THREE.TextureLoader().load(url, (t) => { t.encoding = THREE.sRGBEncoding; onTexture(t); });
  }

  // Carga inicial
  if (VIEWER_CONFIG.glbUrl) loadModel(VIEWER_CONFIG.glbUrl);
  else loadPlaceholderModel();

  if (VIEWER_CONFIG.hdriUrl) loadEnvironment(VIEWER_CONFIG.hdriUrl);

  // Resize: el visor sigue el tamaño de su contenedor, no el de la ventana
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    controls.update(); // controls.update() también avanza el auto-rotate
    renderer.render(scene, camera);
  }
  animate();
})();