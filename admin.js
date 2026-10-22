// Espace administration : commandes, produits et stock, messages, inscrits.
// Mode démo (sans Supabase) : lit les données enregistrées dans ce navigateur.
(() => {
  const Api = window.Api, G = window.GLORY, fmt = window.fmt, CAT = window.CATALOG;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const STATUS = { nouvelle: "Nouvelle", confirmee: "Confirmée", preparation: "En préparation", expediee: "Expédiée", livree: "Livrée", annulee: "Annulée" };
  const PAY = Object.fromEntries(G.payments.map((p) => [p.id, p.label]));
  const SKEY = "gh_admin_session";
  const store = {
    get: () => { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch { return null; } },
    set: (v) => { try { v ? sessionStorage.setItem(SKEY, JSON.stringify(v)) : sessionStorage.removeItem(SKEY); } catch { /* stockage indisponible */ } },
  };
  let session = store.get();
  let orders = [], products = [], variants = [], msgs = [], subs = [];

  const call = (path, opt = {}) => Api.rest(path, { ...opt, token: session && session.access_token });

  async function login() {
    const err = $("#loginErr");
    err.hidden = true;
    try {
      const r = await fetch(G.supabase.url + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: G.supabase.anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: $("#email").value.trim(), password: $("#pwd").value }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error("Email ou mot de passe incorrect.");
      session = { access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 };
      store.set(session);
      $("#pwd").value = "";
      start();
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  }

  async function load() {
    if (Api.live) {
      [orders, products, variants, msgs, subs] = await Promise.all([
        call("/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=500"),
        call("/rest/v1/products?select=*&order=sort"),
        call("/rest/v1/variants?select=*&order=id"),
        call("/rest/v1/messages?select=*&order=created_at.desc&limit=200"),
        call("/rest/v1/subscribers?select=*&order=created_at.desc&limit=500"),
      ]);
      orders = orders.map((o) => ({ ...o, items: o.order_items }));
    } else {
      orders = Api.read("gh_demo_orders", []);
      msgs = Api.read("gh_demo_msgs", []);
      subs = Api.read("gh_demo_subs", []).map((email) => ({ email, created_at: "" }));
      products = CAT.map((p) => ({ id: p.id, name: p.short, price: p.price }));
      variants = CAT.flatMap((p) => p.colors.map((c) => ({ product_id: p.id, color: c.name, stock: null })));
    }
  }

  function kpis() {
    const live = orders.filter((o) => o.status !== "annulee");
    const today = new Date().toISOString().slice(0, 10);
    const cells = [
      ["Nouvelles commandes", orders.filter((o) => o.status === "nouvelle").length],
      ["Commandes aujourd'hui", orders.filter((o) => (o.created_at || "").slice(0, 10) === today).length],
      ["Chiffre d'affaires", fmt(live.reduce((s, o) => s + o.total, 0))],
      ["À livrer", orders.filter((o) => ["confirmee", "preparation", "expediee"].includes(o.status)).length],
      ["Messages", msgs.length],
    ];
    $("#kpis").innerHTML = cells.map(([l, v]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
  }

  function renderOrders() {
    const q = $("#q").value.trim().toLowerCase(), f = $("#statusFilter").value;
    const rows = orders.filter((o) => (!f || o.status === f) &&
      (!q || [o.number, o.customer_name, o.phone, o.city].join(" ").toLowerCase().includes(q)));
    $("#orders").innerHTML = rows.length ? rows.map((o) => {
      const wa = "https://wa.me/" + Api.digits(o.phone);
      const items = (o.items || []).map((i) => `${esc(i.qty)} × ${esc(i.product_name)} (${esc(i.color)})`).join("<br>");
      const opts = Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === o.status ? "selected" : ""}>${v}</option>`).join("");
      return `<tr><td><span class="num">${esc(o.number)}</span><br><span class="muted">${esc(new Date(o.created_at).toLocaleString("fr-FR"))}</span></td>
        <td><b>${esc(o.customer_name)}</b><br><a href="tel:${esc(o.phone.replace(/[^+\d]/g, ''))}">${esc(o.phone)}</a> · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a><br><span class="muted">${esc(o.city)} · ${esc(o.address)}</span>${o.notes ? `<br><span class="muted">« ${esc(o.notes)} »</span>` : ""}</td>
        <td>${items}</td><td><b>${fmt(o.total)}</b></td><td>${esc(PAY[o.payment] || o.payment)}</td>
        <td><span class="pill ${o.status}">${STATUS[o.status]}</span><br><select data-n="${esc(o.number)}" aria-label="Changer le statut">${opts}</select></td></tr>`;
    }).join("") : `<tr><td colspan="6" class="empty-row">Aucune commande.</td></tr>`;
  }

  async function setStatus(number, status) {
    if (Api.live) await call(`/rest/v1/orders?number=eq.${encodeURIComponent(number)}`, { method: "PATCH", body: { status }, headers: { Prefer: "return=minimal" } });
    else {
      const all = Api.read("gh_demo_orders", []);
      const o = all.find((x) => x.number === number);
      if (o) o.status = status;
      Api.write("gh_demo_orders", all);
    }
    await refresh();
  }

  function renderProducts() {
    $("#prodNote").textContent = Api.live ? "Modifiez le prix ou le stock puis cliquez sur Enregistrer. Les clientes voient les changements immédiatement." : "Mode démo : le stock n'est pas suivi. Connectez Supabase pour gérer prix et stock.";
    $("#prods").innerHTML = products.map((p) => {
      const vs = variants.filter((v) => v.product_id === p.id).map((v) =>
        `<label class="muted">${esc(v.color)} <input class="num-in" type="number" min="0" data-v="${esc(v.color)}" value="${v.stock ?? ""}" ${Api.live ? "" : "disabled"}></label>`).join(" ");
      return `<tr><td><b>${esc(p.name)}</b></td><td><input class="num-in" type="number" min="0" data-price value="${p.price}" ${Api.live ? "" : "disabled"}></td><td style="display:flex;gap:12px;flex-wrap:wrap">${vs}</td>
        <td>${Api.live ? `<button class="btn" data-save="${esc(p.id)}" type="button">Enregistrer</button>` : ""}</td></tr>`;
    }).join("");
  }

  async function saveProduct(id, row) {
    const price = parseInt(row.querySelector("[data-price]").value, 10);
    await call(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { price }, headers: { Prefer: "return=minimal" } });
    for (const inp of row.querySelectorAll("[data-v]")) {
      await call(`/rest/v1/variants?product_id=eq.${encodeURIComponent(id)}&color=eq.${encodeURIComponent(inp.dataset.v)}`, { method: "PATCH", body: { stock: parseInt(inp.value, 10) || 0 }, headers: { Prefer: "return=minimal" } });
    }
    await refresh();
  }

  function renderOthers() {
    $("#msgs").innerHTML = msgs.length ? msgs.map((m) => `<tr><td class="muted">${esc(new Date(m.created_at).toLocaleString("fr-FR"))}</td><td>${esc(m.name)}</td><td>${esc(m.contact)}</td><td>${esc(m.message)}</td></tr>`).join("") : `<tr><td colspan="4" class="empty-row">Aucun message.</td></tr>`;
    $("#subs").innerHTML = subs.length ? subs.map((s) => `<tr><td>${esc(s.email)}</td><td class="muted">${s.created_at ? esc(new Date(s.created_at).toLocaleDateString("fr-FR")) : ""}</td></tr>`).join("") : `<tr><td colspan="2" class="empty-row">Aucun inscrit.</td></tr>`;
  }

  function exportCsv() {
    const head = ["Numéro", "Date", "Statut", "Nom", "Téléphone", "Ville", "Adresse", "Articles", "Total", "Paiement"];
    const cell = (v) => { const t = String(v ?? ""); return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`; };
    const lines = orders.map((o) => [o.number, o.created_at, STATUS[o.status], o.customer_name, o.phone, o.city, o.address,
      (o.items || []).map((i) => `${i.qty}x ${i.product_name} ${i.color}`).join(" | "), o.total, PAY[o.payment] || o.payment].map(cell).join(";"));
    const blob = new Blob(["﻿" + [head.map(cell).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `commandes-glory-home-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function refresh() { await load(); kpis(); renderOrders(); renderProducts(); renderOthers(); }

  async function start() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    $("#mode").textContent = Api.live ? "Connecté à Supabase" : "Mode démo (données de ce navigateur)";
    $("#mode").classList.toggle("live", Api.live);
    $("#logout").hidden = !Api.live;
    $("#statusFilter").innerHTML = `<option value="">Tous les statuts</option>` + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    try { await refresh(); }
    catch (e) {
      if (Api.live) { store.set(null); session = null; $("#app").hidden = true; $("#login").hidden = false; $("#loginErr").textContent = "Accès refusé ou session expirée. Reconnectez-vous avec un compte administrateur."; $("#loginErr").hidden = false; }
    }
  }

  $("#loginBtn").addEventListener("click", login);
  $("#pwd").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
  $("#logout").addEventListener("click", () => { store.set(null); location.reload(); });
  $("#q").addEventListener("input", renderOrders);
  $("#statusFilter").addEventListener("change", renderOrders);
  $("#csv").addEventListener("click", exportCsv);
  $("#orders").addEventListener("change", (e) => { if (e.target.dataset.n) setStatus(e.target.dataset.n, e.target.value); });
  $("#prods").addEventListener("click", (e) => { if (e.target.dataset.save) saveProduct(e.target.dataset.save, e.target.closest("tr")); });
  $("#tabsbar").addEventListener("click", (e) => {
    if (!e.target.dataset.t) return;
    document.querySelectorAll("#tabsbar button").forEach((b) => b.classList.toggle("on", b === e.target));
    ["orders", "products", "messages", "subs"].forEach((t) => { $("#t-" + t).hidden = t !== e.target.dataset.t; });
  });

  if (!Api.live) start();
  else if (session && session.expires_at > Date.now()) start();
  else $("#login").hidden = false;
})();
