// Boutique : panier, commande, formulaires. Dépend de config.js, catalog.js, api.js
(() => {
  const G = window.GLORY, Api = window.Api, fmt = window.fmt, CAT = window.CATALOG;
  const $ = (s) => document.querySelector(s);
  const MAX_QTY = 10;
  const SHIP = "expedition";                       // valeur du choix « autre ville »

  const find = (id) => CAT.find((p) => p.id === id);
  const colorOf = (id, name) => find(id).colors.find((c) => c.name === name);
  let cart = Api.read("gh_cart", [])
    .filter((l) => l && find(l.p) && colorOf(l.p, l.c))
    .map((l) => ({ p: l.p, c: l.c, q: Math.max(1, Math.min(MAX_QTY, parseInt(l.q, 10) || 1)) }));
  let stock = null;           // { produit: { coloris: n } } si Supabase est configuré
  let sending = false;

  const save = () => { Api.write("gh_cart", cart); render(); };
  const count = () => cart.reduce((n, l) => n + l.q, 0);
  const subtotal = () => cart.reduce((s, l) => s + find(l.p).price * l.q, 0);
  const available = (p, c) => (stock && stock[p] && c in stock[p] ? stock[p][c] : Infinity);

  // Livraison : frais de la commune choisie, null tant qu'elle n'est pas connue ou en cas d'expédition
  const zones = G.delivery.zones;
  const zoneValue = () => ($("#zone") ? $("#zone").value : "");
  const fee = () => { const z = zones.find((x) => x.name === zoneValue()); return z ? z.fee : null; };
  const minFee = Math.min(...zones.map((z) => z.fee)), maxFee = Math.max(...zones.map((z) => z.fee));

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("on"), 2600);
  }

  // ---------- Panier ----------
  function add(p, c, q) {
    const room = available(p, c);
    const line = cart.find((l) => l.p === p && l.c === c);
    const have = line ? line.q : 0;
    const next = Math.min(have + q, MAX_QTY, room);
    if (next <= have) { toast(room <= have ? "Stock insuffisant pour ce coloris." : `Maximum ${MAX_QTY} exemplaires par article.`); return; }
    if (line) line.q = next; else cart.push({ p, c, q: next });
    save();
    openCart(); // le panier s'ouvre aussitôt : un seul clic de plus pour commander
  }
  function setQty(i, q) {
    const l = cart[i];
    q = Math.min(q, MAX_QTY, available(l.p, l.c));
    if (q <= 0) cart.splice(i, 1); else l.q = q;
    save();
  }

  function openCart() {
    $("#overlay").hidden = false;
    $("#cart").classList.add("open");
    $("#cart").setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    $("#cartClose").focus();
  }
  function closeCart() {
    $("#cart").classList.remove("open");
    $("#cart").setAttribute("aria-hidden", "true");
    $("#overlay").hidden = true;
    document.body.classList.remove("lock");
  }

  function lineHtml(l, i) {
    const p = find(l.p), col = colorOf(l.p, l.c);
    const li = document.createElement("li");
    li.className = "line";
    li.innerHTML = `<img alt="" loading="lazy"><div class="line-body"><p class="line-name"></p><p class="line-sub"></p>
      <div class="qty-sm"><button type="button" aria-label="Moins">−</button><span></span><button type="button" aria-label="Plus">+</button></div></div>
      <div class="line-end"><span class="line-price"></span><button type="button" class="line-del" aria-label="Retirer du panier">Retirer</button></div>`;
    li.querySelector("img").src = col.image;
    li.querySelector(".line-name").textContent = p.short;
    li.querySelector(".line-sub").textContent = `Coloris ${l.c} · ${fmt(p.price)}`;
    const [minus, plus] = li.querySelectorAll(".qty-sm button");
    li.querySelector(".qty-sm span").textContent = l.q;
    minus.addEventListener("click", () => setQty(i, l.q - 1));
    plus.addEventListener("click", () => setQty(i, l.q + 1));
    li.querySelector(".line-price").textContent = fmt(p.price * l.q);
    li.querySelector(".line-del").addEventListener("click", () => setQty(i, 0));
    return li;
  }

  function render() {
    const n = count();
    const badge = $("#cartCount");
    badge.textContent = n;
    badge.hidden = n === 0;
    const list = $("#cartList");
    list.innerHTML = "";
    cart.forEach((l, i) => list.append(lineHtml(l, i)));
    $("#cartEmpty").hidden = n > 0;
    $("#cartFoot").hidden = n === 0;
    $("#cartSub").textContent = fmt(subtotal());
    $("#cartDelivery").textContent = `${fmt(minFee)} à ${fmt(maxFee)} selon la commune`;
    if ($("#checkout").open) updateTotals();
  }

  // ---------- Fiche produit : quantité, ajout, stock ----------
  let qty = 1;
  const qtyEl = $("#qty");
  function setQtyUi(n) {
    qty = Math.max(1, Math.min(MAX_QTY, n));
    qtyEl.textContent = qty;
  }
  $("#qtyMinus").addEventListener("click", () => setQtyUi(qty - 1));
  $("#qtyPlus").addEventListener("click", () => setQtyUi(qty + 1));
  $("#add").addEventListener("click", () => {
    const s = window.currentSel;
    if (!s) return;
    add(s.id, s.color, qty);
  });
  function updateStock() {
    const s = window.currentSel;
    if (!s) return;
    const n = available(s.id, s.color);
    const note = $("#stockNote"), btn = $("#add");
    btn.disabled = n <= 0;
    btn.textContent = n <= 0 ? "Épuisé" : "Ajouter au panier";
    note.hidden = !(n <= 5 && n !== Infinity);
    note.textContent = n <= 0 ? "Ce coloris est momentanément épuisé. Écrivez-nous pour être prévue du retour." : `Plus que ${n} en stock`;
    setQtyUi(1);
  }

  // ---------- Commande ----------
  const dlg = $("#checkout");

  function updateTotals() {
    const ul = $("#sumList");
    ul.innerHTML = "";
    cart.forEach((l) => {
      const li = document.createElement("li");
      li.innerHTML = `<span></span><b></b>`;
      li.querySelector("span").textContent = `${l.q} × ${find(l.p).short} · ${l.c}`;
      li.querySelector("b").textContent = fmt(find(l.p).price * l.q);
      ul.append(li);
    });
    const z = zoneValue(), f = fee(), sub = subtotal();
    $("#sumSub").textContent = fmt(sub);
    $("#sumDelivery").textContent = f !== null ? fmt(f) : z === SHIP ? "À confirmer (expédition)" : "Choisissez votre commune";
    $("#sumTotal").textContent = f !== null ? fmt(sub + f) : `${fmt(sub)} + livraison`;
    $("#cityWrap").hidden = z !== SHIP;
    $("#cityIn").required = z === SHIP;
  }

  function openCheckout() {
    if (!cart.length) return;
    closeCart();
    $("#orderForm").hidden = false;
    $("#done").hidden = true;
    $("#formError").hidden = true;
    updateTotals();
    if (!dlg.open) dlg.showModal();
  }

  function paymentsUi() {
    const box = $("#payList");
    G.payments.forEach((m, i) => {
      const lab = document.createElement("label");
      lab.className = "opt";
      lab.innerHTML = `<input type="radio" name="payment" required><span><b></b><small></small></span>`;
      const input = lab.querySelector("input");
      input.value = m.id;
      input.checked = i === 0;
      lab.querySelector("b").textContent = m.label;
      lab.querySelector("small").textContent = m.hint;
      box.append(lab);
    });
  }

  function zonesUi() {
    const sel = $("#zone");
    zones.forEach((z) => {
      const o = document.createElement("option");
      o.value = z.name;
      o.textContent = `${z.name} · ${fmt(z.fee)}`;
      sel.append(o);
    });
    const o = document.createElement("option");
    o.value = SHIP;
    o.textContent = G.delivery.shippingLabel;
    sel.append(o);
    sel.addEventListener("change", updateTotals);
  }

  function whatsappMessage(num, f, order, res) {
    const lines = cart.map((l) => `• ${l.q} × ${find(l.p).short} (${l.c}) — ${fmt(find(l.p).price * l.q)}`);
    const pay = G.payments.find((m) => m.id === order.payment).label;
    const ship = order.customer.zone === SHIP;
    return [
      `Bonjour Glory Home, voici ma commande ${num}.`, "", ...lines, "",
      ship ? `Total articles : ${fmt(res.total)} (frais d'expédition à confirmer)` : `Livraison : ${fmt(res.delivery)} · Total : ${fmt(res.total)}`,
      `Paiement : ${pay}`, "",
      `Nom : ${f.name}`, `Téléphone : ${f.phone}`, `Commune : ${ship ? "Expédition – " + f.city : f.zone}`, `Adresse : ${f.address}`,
      f.notes ? `Précisions : ${f.notes}` : "",
    ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
  }

  $("#orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending || !cart.length) return;
    const fd = new FormData(e.target);
    if (fd.get("website")) return; // champ piège anti-robots
    const f = Object.fromEntries(["name", "phone", "email", "zone", "city", "address", "notes"].map((k) => [k, String(fd.get(k) || "").trim()]));
    const err = $("#formError");
    err.hidden = true;
    if (Api.digits(f.phone).length < 8 || Api.digits(f.phone).length > 15) {
      err.textContent = "Entrez un numéro de téléphone valide (8 à 15 chiffres).";
      err.hidden = false;
      return;
    }
    if (f.zone !== SHIP) f.city = f.zone;
    const order = { customer: f, payment: fd.get("payment"), items: cart.map(({ p, c, q }) => ({ p, c, q })) };
    sending = true;
    const btn = $("#submitOrder");
    btn.disabled = true;
    btn.textContent = "Envoi en cours…";
    try {
      const res = await Api.createOrder(order);
      const msg = whatsappMessage(res.number, f, order, res);
      $("#doneNum").textContent = res.number;
      $("#doneTotal").textContent = f.zone === SHIP ? `${fmt(res.total)} + frais d'expédition` : fmt(res.total);
      $("#doneWa").href = `https://wa.me/${G.whatsapp}?text=${encodeURIComponent(msg)}`;
      $("#orderForm").hidden = true;
      $("#done").hidden = false;
      cart = [];
      save();
      e.target.reset();
    } catch (ex) {
      err.textContent = ex.message || "Votre commande n'a pas pu être envoyée. Réessayez ou écrivez-nous sur WhatsApp.";
      err.hidden = false;
    } finally {
      sending = false;
      btn.disabled = false;
      btn.textContent = "Confirmer la commande";
    }
  });

  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  $("#checkoutClose").addEventListener("click", () => dlg.close());
  $("#doneClose").addEventListener("click", () => dlg.close());

  // ---------- Formulaires : newsletter et contact ----------
  async function handle(form, fn, okMsg) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get("website")) return;
      const out = form.querySelector(".form-msg");
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      out.className = "form-msg";
      try {
        await fn(fd);
        out.textContent = okMsg;
        out.classList.add("ok");
        form.reset();
      } catch (ex) {
        out.textContent = /duplicate|23505/i.test(ex.message) ? okMsg : "L'envoi a échoué. Réessayez dans un instant.";
        if (/duplicate|23505/i.test(ex.message)) out.classList.add("ok"); else out.classList.add("bad");
      } finally {
        btn.disabled = false;
      }
    });
  }
  handle($("#newsletter"), (fd) => Api.subscribe(String(fd.get("email")).trim().toLowerCase()), "Merci, vous êtes inscrite.");
  handle($("#contactForm"), (fd) => Api.sendMessage({
    name: String(fd.get("name")).trim(), contact: String(fd.get("contact")).trim(), message: String(fd.get("message")).trim(),
  }), "Message envoyé. Nous vous répondons très vite.");

  // ---------- Liens et coordonnées ----------
  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  $("#goCheckout").addEventListener("click", openCheckout);
  $("#keepShopping").addEventListener("click", closeCart);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#cart").classList.contains("open")) closeCart(); });
  $("#mail").href = `mailto:${G.email}`;
  document.querySelectorAll("[data-phone]").forEach((a) => { a.href = `https://wa.me/${G.whatsapp}`; a.target = "_blank"; a.rel = "noopener"; a.textContent = G.phoneDisplay; });
  document.querySelectorAll("[data-mail]").forEach((a) => { a.href = `mailto:${G.email}`; a.textContent = G.email; });
  $("#waNews").href = `https://wa.me/${G.whatsapp}?text=${encodeURIComponent("Bonjour Glory Home, je souhaite être informée de vos prochains arrivages.")}`;
  $("#coNote").textContent = G.deliveryNote;
  if (G.instagram) $("#insta").href = G.instagram; else $("#insta").hidden = true;

  paymentsUi();
  zonesUi();
  render();
  window.Shop = { add, openCart, updateStock };
  Api.stock().then((s) => { stock = s; updateStock(); render(); }).catch(() => { /* stock non disponible : on n'empêche pas la vente */ });
  updateStock();
})();
