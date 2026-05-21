const imagesToPreload = [
  "assets/bg-linhas.png",
  "assets/linkedin.png",
  "assets/photos/foto-padrao.png",
];
const preloadedImages = [];

const preloadImage = (src) => {
  const image = new Image();
  image.decoding = "async";
  image.loading = "eager";
  image.src = src;
  preloadedImages.push(image);
  return image;
};

const preloadImages = () => {
  imagesToPreload.map(preloadImage);
};

if (document.readyState === "complete") {
  preloadImages();
} else {
  window.addEventListener("load", preloadImages, { once: true });
}
