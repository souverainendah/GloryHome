// Page d'accueil : bannière, fiche produit, collection. Données : catalog.js ; panier : shop.js
const products = window.CATALOG.slice().sort((a, b) => a.num.localeCompare(b.num));
const fmt = window.fmt;
const WHATSAPP = window.GLORY.whatsapp;

const $ = (s) => document.querySelector(s);
const stageImg = $("#stageImg"), stageTag = $("#stageTag");
const swatches = $("#swatches"), colorName = $("#colorName"), orderBtn = $("#order"), grid = $("#grid");
const tabs = $("#tabs"), mNum = $("#mNum"), mName = $("#mName"), mPrice = $("#mPrice"), mDesc = $("#mDesc"), specs = $("#specs");
let p = 0, c = 0;

const waLink = (text) => `https://wa.me/${WHATSAPP}${text ? "?text=" + encodeURIComponent(text) : ""}`;

function renderModel() {
  const m = products[p];
  mNum.textContent = `${m.num} · Nouvel arrivage`;
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
  orderBtn.href = waLink(`Bonjour, je souhaite commander ${m.short} Glory Home, coloris ${col.name} (${fmt(m.price)}).`);
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

// Bannière : les deux modèles défilent seuls, le sélecteur permet de choisir
const hero = $("#hero"), slides = [...document.querySelectorAll(".slide")], sws = [...document.querySelectorAll(".sw")];
const SLIDE_MS = 6000;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let cur = 0, timer = null;
hero.style.setProperty("--dur", `${SLIDE_MS}ms`);

function show(i) {
  cur = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle("is-active", k === cur));
  sws.forEach((b, k) => {
    b.classList.remove("is-active");
    b.setAttribute("aria-selected", k === cur);
  });
  void sws[cur].offsetWidth; // relance la barre de progression
  sws[cur].classList.add("is-active");
  const next = slides[(cur + 1) % slides.length];
  $("#hintName").textContent = next.querySelector(".name").textContent;
}
function play() {
  clearInterval(timer);
  if (reduced) return;
  hero.classList.remove("paused");
  timer = setInterval(() => show(cur + 1), SLIDE_MS);
}
function stop() { clearInterval(timer); hero.classList.add("paused"); }
sws.forEach((b) => b.addEventListener("click", () => { show(+b.dataset.i); play(); }));
hero.addEventListener("pointerenter", () => { if (matchMedia("(hover: hover)").matches) stop(); });
hero.addEventListener("pointerleave", () => { if (matchMedia("(hover: hover)").matches) { show(cur); play(); } });
const go = (d) => { show(cur + d); play(); };
$("#heroPrev").addEventListener("click", () => go(-1));
$("#heroNext").addEventListener("click", () => go(1));
$("#hint").addEventListener("click", () => go(1));
// Glisser (doigt ou souris) pour changer de modèle
let x0 = null;
hero.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
hero.addEventListener("pointerup", (e) => {
  if (x0 === null) return;
  const dx = e.clientX - x0;
  x0 = null;
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
});
hero.addEventListener("pointercancel", () => { x0 = null; });
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : (show(cur), play())));
show(0);
play();

// Poussière de lumière dans l'arrière-plan
const motes = $("#motes");
if (!reduced) {
  for (let i = 0; i < 16; i++) {
    const m = document.createElement("span");
    const s = 3 + Math.random() * 5;
    m.className = "mote";
    m.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${9 + Math.random() * 12}s;animation-delay:${-Math.random() * 18}s`;
    motes.append(m);
  }
}

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
