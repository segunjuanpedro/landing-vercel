// ---------- Lottie: animación cargada desde un archivo ----------
// Cambiá esta ruta por la de tu archivo .json en assets/
const LOTTIE_PATH = 'assets/lottie.json';

const animation = lottie.loadAnimation({
  container: document.getElementById('lottie-sample'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: LOTTIE_PATH
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

const el = document.getElementById('lottie-sample');

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
// ---------- Carrito: actualiza contador y estado del carrito ----------
const selectedItems = new Set();
const cartAnimation = document.getElementById('cartAnimation');
const cartCountEl = document.getElementById('cartCount');
const cartBtn = document.getElementById('cartBtn');

// Preload cart images and use a single <img> element to avoid flicker
const CART_IMAGE_PATHS = [
  'assets/images/carrito0.png',
  'assets/images/carrito1.png',
  'assets/images/carrito2.png',
  'assets/images/carrito3.png'
];
const _cartPreloads = CART_IMAGE_PATHS.map(p => { const i = new Image(); i.src = p; return i; });

let cartIconImg = cartAnimation.querySelector('img');
if (!cartIconImg) {
  cartIconImg = document.createElement('img');
  cartIconImg.alt = 'Carrito';
  cartIconImg.classList.add('cart-icon');
  cartAnimation.innerHTML = '';
  cartAnimation.appendChild(cartIconImg);
}
// make image visible when loaded
cartIconImg.addEventListener('load', () => cartIconImg.classList.add('loaded'));

function toggleCartItem(productId){
  if(selectedItems.has(productId)){
    selectedItems.delete(productId);
  } else if(selectedItems.size < 3){
    selectedItems.add(productId);
  }
  updateCart();
  cartBtn.classList.add('active');
  setTimeout(() => cartBtn.classList.remove('active'), 180);
}
function updateCart(){
  const count = selectedItems.size;
  const state = count === 0 ? 'empty' : count.toString();
  cartAnimation.classList.remove('state-empty','state-1','state-2','state-3');
  cartAnimation.classList.add(`state-${state}`);
  // Mostrar imagen según la cantidad (assets/images/carrito0.png .. carrito3.png)
  const imgCount = Math.max(0, Math.min(3, count));
  const imgSrc = CART_IMAGE_PATHS[imgCount];
  // swap src on the single <img> element (preloaded) to avoid flicker
  cartIconImg.classList.remove('loaded');
  cartIconImg.src = imgSrc;
  cartIconImg.alt = `Carrito (${count})`;



  document.querySelectorAll('.toggle-btn').forEach(button => {
    const productId = button.dataset.product;
    const active = selectedItems.has(productId);
    button.textContent = active ? 'Quitar' : 'Agregar';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}

cartBtn.addEventListener('mouseenter', () => cartAnimation.classList.add('hover'));
cartBtn.addEventListener('mouseleave', () => cartAnimation.classList.remove('hover'));
cartBtn.addEventListener('mousedown', () => cartAnimation.classList.add('active'));
cartBtn.addEventListener('mouseup', () => cartAnimation.classList.remove('active'));

updateCart();

// ---------- Nav mobile: scroll suave a secciones ----------
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', function(e){
    const target = document.querySelector(this.getAttribute('href'));
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth'});
    }
  });
});