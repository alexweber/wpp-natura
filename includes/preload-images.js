const imagesToPreload = [
  "assets/bg-linhas.png",
  "assets/linkedin.png",
  "assets/photos/adrian-rios.jpg",
  "assets/photos/agustina-zbogar.jpg",
  "assets/photos/ailin-baldi.jpg",
  "assets/photos/alexis-ospina.jpg",
  "assets/photos/ana-rocha.jpg",
  "assets/photos/andre-gola.jpg",
  "assets/photos/andre-laurentino.jpg",
  "assets/photos/ariane-polvani.jpg",
  "assets/photos/aricio-fortes.jpg",
  "assets/photos/daniele-marques.jpg",
  "assets/photos/denon-oliveira.jpg",
  "assets/photos/diego-medvedocky.jpg",
  "assets/photos/eduardo-marques.jpg",
  "assets/photos/fernanda-gutierrez.jpg",
  "assets/photos/fernanda-peka.jpg",
  "assets/photos/fernando-plata.png",
  "assets/photos/foto-padrao.png",
  "assets/photos/francisco-camacho.png",
  "assets/photos/frederico-teixeira.jpg",
  "assets/photos/gaston-potasz.jpg",
  "assets/photos/gonzalo-montana-fernandez.jpg",
  "assets/photos/heitor-piffer.jpg",
  "assets/photos/ignacio-flotta.jpg",
  "assets/photos/ingrid-coelho.png",
  "assets/photos/jaime-mandelbaum.jpg",
  "assets/photos/joao-gandara.jpg",
  "assets/photos/juan-manuel-gaitan.jpg",
  "assets/photos/juan-pablo-garcia.jpg",
  "assets/photos/juan-ure.jpg",
  "assets/photos/juliana-martins.jpg",
  "assets/photos/layana-leonardo.jpg",
  "assets/photos/luis-madruga-enriquez.jpg",
  "assets/photos/luiza-sa.jpg",
  "assets/photos/manir-fadel.jpg",
  "assets/photos/marco-bezerra.png",
  "assets/photos/maria-lujan-donaire.png",
  "assets/photos/mariana-horta.jpg",
  "assets/photos/marie-julie-gerbauld.jpg",
  "assets/photos/milagros-garcia.jpg",
  "assets/photos/mire-espinoza.png",
  "assets/photos/nicolas-lugo.jpg",
  "assets/photos/nicolas-vara.jpg",
  "assets/photos/piero-oliveri.jpg",
  "assets/photos/rafael-donato.jpg",
  "assets/photos/rafael-pitanguy.jpg",
  "assets/photos/rafael-reina.jpg",
  "assets/photos/raquel-chavez.jpg",
  "assets/photos/renato-zandona.jpg",
  "assets/photos/renzo-rossi.jpg",
  "assets/photos/ricardo-mendoza.jpg",
  "assets/photos/ricardo-porto.jpg",
  "assets/photos/roberta-harada.jpg",
  "assets/photos/romina-rivero.png",
  "assets/photos/santiago-morello.jpg",
  "assets/photos/sebastian-mir.jpg",
  "assets/photos/shingo-sato.jpg",
  "assets/photos/sofia-cursach.jpg",
  "assets/photos/sussy-navia.jpg",
  "assets/photos/teco-cipriano.jpg",
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
