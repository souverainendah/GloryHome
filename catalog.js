// Catalogue : source unique pour le site. Pour ajouter un produit, ajouter un objet ci-dessous
// et déposer les photos (fond blanc) dans images/. Les prix sont en F (nombres entiers).
window.fmt = (n) => Number(n).toLocaleString("fr-FR").replace(/[  ]/g, " ") + " F";

window.CATALOG = [
  {
    id: "eclat", num: "N° 01", name: "Le sac <em class=\"name\">« Éclat »</em>", short: "Le sac « Éclat »", price: 20000,
    desc: "Un sac structuré à l'allure de grande maison. Sa finition vernie effet croco capte la lumière, ses deux anses rigides s'ornent d'embouts dorés et d'une breloque en trèfle. À la main ou en bandoulière, il accompagne du bureau à la soirée.",
    specs: [
      ["Matière", "Finition vernie effet croco, brillante"],
      ["Détails", "Métal doré et breloque trèfle"],
      ["Porté", "Deux anses rigides et bandoulière amovible"],
      ["Intérieur", "Spacieux, fermeture zippée"],
    ],
    colors: [
      { name: "Noir",      hex: "#15120f", image: "images/eclat-noir.jpg" },
      { name: "Émeraude",  hex: "#0f3b2e", image: "images/eclat-emeraude.jpg" },
      { name: "Bleu nuit", hex: "#14275f", image: "images/eclat-nuit.jpg" },
      { name: "Bronze",    hex: "#7a4a22", image: "images/eclat-bronze.jpg" },
      { name: "Bordeaux",  hex: "#6e1426", image: "images/eclat-bordeaux.jpg" },
    ],
  },
  {
    id: "t", num: "N° 02", name: "Le sac <em class=\"name\">« T »</em>", short: "Le sac « T »", price: 15000,
    desc: "Un sac à rabat à la ligne épurée, pensé pour durer et se marier à tout. Son fermoir en « T » argenté, véritable signature, ferme le rabat d'un seul geste. Souple et structuré à la fois, il épouse l'épaule avec élégance.",
    specs: [
      ["Matière", "Finition grainée, douce au toucher"],
      ["Fermoir", "« T » métal argenté, ouverture facile"],
      ["Porté", "Anse main et bandoulière réglable (selon coloris)"],
      ["Intérieur", "Spacieux : téléphone, portefeuille, clés, maquillage"],
    ],
    colors: [
      { name: "Ivoire",     hex: "#efeae1", image: "images/sac-ivoire.jpg" },
      { name: "Chocolat",   hex: "#5a2f22", image: "images/sac-chocolat.jpg" },
      { name: "Pistache",   hex: "#d9e0b4", image: "images/sac-pistache.jpg" },
      { name: "Gris perle", hex: "#b4b6ba", image: "images/sac-gris.jpg" },
      { name: "Bordeaux",   hex: "#8c1d2c", image: "images/sac-bordeaux.jpg" },
    ],
  },
];
