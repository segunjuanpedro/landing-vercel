document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-slider]").forEach(slider => {
    const range = slider.querySelector('input[type="range"]');
    const afterImage = slider.querySelector(".after");

    if (!range || !afterImage) return;

    range.addEventListener("input", () => {
      afterImage.style.clipPath = `inset(0 ${100 - range.value}% 0 0)`;
    });
  });
});
