// Page d'accueil : bannière, fiche produit, collection. Données : catalog.js ; panier : shop.js
const products = window.CATALOG.slice().sort((a, b) => a.num.localeCompare(b.num));
const fmt = window.fmt;
const WHATSAPP = window.GLORY.whatsapp;

const $ = (s) => document.querySelector(s);
const stageImg = $("#stageImg"), stageTag = $("#stageTag");
const swatches = $("#swatches"), colorName = $("#colorName"), grid = $("#grid");
const tabs = $("#tabs"), mNum = $("#mNum"), mName = $("#mName"), mPrice = $("#mPrice"), mDesc = $("#mDesc"), specs = $("#specs");
let p = 0, c = 0;

const waLink = (text) => `https://wa.me/${WHATSAPP}${text ? "?text=" + encodeURIComponent(text) : ""}`;

function renderModel() {
  const m = products[p];
  mNum.textContent = `${m.num} · Le sac`;
  mName.innerHTML = m.name;
  mPrice.textContent = fmt(m.price);
  mDesc.textContent = m.desc;
  specs.innerHTML = "";
  m.specs.forEach(([k, v]) => {
    const li = document.createElement("li");
    const s = document.createElement("span");
    s.textContent = k;
    li.append(s, v);
    specs.append(li);
  });
  swatches.innerHTML = "";
  m.colors.forEach((col, i) => {
    const b = document.createElement("button");
    b.className = "swatch";
    b.style.setProperty("--c", col.hex);
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", col.name);
    b.addEventListener("click", () => select(p, i));
    swatches.append(b);
  });
  tabs.querySelectorAll("button").forEach((b, i) => {
    b.classList.toggle("on", i === p);
    b.setAttribute("aria-selected", i === p);
  });
}

function select(pi, ci, scroll) {
  const modelChanged = pi !== p;
  p = pi;
  const m = products[p];
  c = (ci + m.colors.length) % m.colors.length;
  const col = m.colors[c];
  if (modelChanged) renderModel();
  stageImg.classList.add("swap");
  setTimeout(() => {
    stageImg.src = col.image;
    stageImg.alt = `${m.short} coloris ${col.name}`;
    stageImg.classList.remove("swap");
  }, 220);
  stageTag.textContent = `${m.short} — ${col.name}`;
  colorName.textContent = col.name;
  swatches.querySelectorAll("button").forEach((b, k) => {
    b.setAttribute("aria-checked", k === c);
    b.classList.toggle("on", k === c);
  });
  window.currentSel = { id: m.id, color: col.name };
  if (window.Shop) window.Shop.updateStock();
  if (scroll) document.getElementById("sac").scrollIntoView({ behavior: "smooth" });
}

// Onglets des modèles
products.forEach((m, i) => {
  const b = document.createElement("button");
  b.setAttribute("role", "tab");
  b.textContent = `${m.num} · ${m.short}`;
  b.addEventListener("click", () => select(i, 0));
  tabs.append(b);
});

// Grille de la collection : un groupe par modèle
products.forEach((m, pi) => {
  const head = document.createElement("h3");
  head.className = "group-title reveal";
  head.innerHTML = `<span class="tab">${m.num}</span> ${m.name}`;
  grid.append(head);
  const row = document.createElement("div");
  row.className = "row";
  m.colors.forEach((col, ci) => {
    const card = document.createElement("article");
    card.className = "card reveal";
    card.style.transitionDelay = `${ci * 70}ms`;
    const fig = document.createElement("div");
    fig.className = "card-img";
    const img = document.createElement("img");
    img.src = col.image; img.alt = `${m.short} ${col.name}`; img.loading = "lazy";
    fig.append(img);
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `<h4></h4><span class="price-tag"></span>`;
    info.querySelector("h4").textContent = col.name;
    info.querySelector(".price-tag").textContent = fmt(m.price);
    card.append(fig, info);
    card.tabIndex = 0;
    card.addEventListener("click", () => select(pi, ci, true));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") select(pi, ci, true); });
    row.append(card);
  });
  grid.append(row);
});

$("#prev").addEventListener("click", () => select(p, c - 1));
$("#next").addEventListener("click", () => select(p, c + 1));
$("#wa").href = waLink("Bonjour Glory Home, j'aimerais avoir des informations.");
$("#year").textContent = new Date().getFullYear();
renderModel();
select(0, 0);

// En-tête : ombre au défilement
const header = $("#header");
const onScroll = () => header.classList.toggle("solid", window.scrollY > 40);
onScroll();
addEventListener("scroll", onScroll, { passive: true });

// Accueil : prix et clic sur un modèle
document.querySelectorAll("[data-price]").forEach((el) => {
  el.textContent = fmt(products.find((m) => m.id === el.dataset.price).price);
});
document.querySelectorAll("[data-go]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    select(products.findIndex((m) => m.id === a.dataset.go), 0, true);
  });
});

// Bannière : deux vitrines côte à côte, on glisse de l'une à l'autre
const track = $(".slides"), slides = [...document.querySelectorAll(".slide")], sws = [...document.querySelectorAll(".sw")];
const prevBtn = $("#heroPrev"), nextBtn = $("#heroNext");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let cur = 0, touched = false;

function mark(i) {
  cur = i;
  slides.forEach((s, k) => s.classList.toggle("is-active", k === cur));
  sws.forEach((b, k) => { b.classList.toggle("is-active", k === cur); b.setAttribute("aria-selected", k === cur); });
  prevBtn.disabled = cur === 0;
  nextBtn.disabled = cur === slides.length - 1;
}
const goTo = (i) => {
  touched = true;
  const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
  track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
};
// La vitrine active est celle dont le centre est le plus proche du centre de la bannière
track.addEventListener("scroll", () => {
  const mid = track.scrollLeft + track.clientWidth / 2;
  const i = slides.reduce((best, s, k) => (Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid) < Math.abs(slides[best].offsetLeft + slides[best].offsetWidth / 2 - mid) ? k : best), 0);
  if (i !== cur) mark(i);
}, { passive: true });
sws.forEach((b) => b.addEventListener("click", () => goTo(+b.dataset.i)));
prevBtn.addEventListener("click", () => goTo(cur - 1));
nextBtn.addEventListener("click", () => goTo(cur + 1));
addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, select")) return;
  if (e.key === "ArrowRight" && scrollY < innerHeight / 2) goTo(cur + 1);
  if (e.key === "ArrowLeft" && scrollY < innerHeight / 2) goTo(cur - 1);
});

// Souris : on attrape la scène et on la tire, comme au doigt
let drag = null;
track.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("a, button")) return;
  drag = { x: e.clientX, left: track.scrollLeft, moved: false };
});
addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) < 6) return;
  drag.moved = true;
  touched = true;
  track.classList.add("dragging");
  track.scrollLeft = drag.left - dx;
});
addEventListener("pointerup", () => {
  if (!drag) return;
  const moved = drag.moved, dx = track.scrollLeft - drag.left;
  drag = null;
  track.classList.remove("dragging");
  if (moved) goTo(Math.abs(dx) > 60 ? cur + (dx > 0 ? 1 : -1) : cur);
});

// Au chargement, la scène glisse un peu vers la gauche puis revient : on comprend qu'il y en a une autre
if (!reduced) {
  setTimeout(() => {
    if (touched || track.scrollLeft > 4) return;
    track.style.scrollSnapType = "none";
    track.scrollTo({ left: 90, behavior: "smooth" });
    setTimeout(() => {
      track.scrollTo({ left: 0, behavior: "smooth" });
      setTimeout(() => { track.style.scrollSnapType = ""; }, 700);
    }, 900);
  }, 1600);
}
mark(0);

// Menu mobile
const burger = $("#burger"), nav = $("#nav");
burger.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  burger.setAttribute("aria-expanded", open);
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") { document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false); }
});

// Apparition au défilement
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
