// Couche de données : Supabase si configuré (config.js), sinon mode démo en stockage local.
(() => {
  const G = window.GLORY, S = G.supabase || {};
  const live = !!(S.url && S.anonKey);

  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

  async function rest(path, { method = "GET", body, token, headers } = {}) {
    const r = await fetch(S.url + path, {
      method,
      headers: { apikey: S.anonKey, Authorization: "Bearer " + (token || S.anonKey), "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) {
      let m = "";
      try { m = (await r.json()).message || ""; } catch { /* corps vide */ }
      throw new Error(m || "Erreur " + r.status);
    }
    return r.status === 204 ? null : r.json();
  }

  const digits = (s) => String(s || "").replace(/\D/g, "");
  const localNumber = () => "GH-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 10000)).padStart(4, "0");

  window.Api = {
    live, read, write, rest, digits,

    // Stock par produit et coloris : { eclat: { Noir: 4, … } } ou null (mode démo, stock non suivi)
    async stock() {
      if (!live) return null;
      const rows = await rest("/rest/v1/variants?select=product_id,color,stock");
      const out = {};
      rows.forEach((v) => { (out[v.product_id] ||= {})[v.color] = v.stock; });
      return out;
    },

    // order : { customer:{name,phone,email,city,address,notes}, payment, items:[{p,c,q}] }
    async createOrder(order) {
      if (live) {
        const res = await rest("/rest/v1/rpc/create_order", { method: "POST", body: { payload: order } });
        const mine = read("gh_orders", []);
        mine.unshift({ number: res.number, total: res.total, date: new Date().toISOString(), phone: order.customer.phone });
        write("gh_orders", mine.slice(0, 20));
        return res;
      }
      const cat = window.CATALOG;
      const items = order.items.map((i) => {
        const p = cat.find((x) => x.id === i.p);
        return { product_id: i.p, product_name: p.short, color: i.c, qty: i.q, unit_price: p.price };
      });
      const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
      const z = G.delivery.zones.find((x) => x.name === order.customer.zone);
      const dfee = z ? z.fee : 0, ship = order.customer.zone === "expedition";
      const rec = {
        number: localNumber(), status: "nouvelle", created_at: new Date().toISOString(),
        customer_name: order.customer.name, phone: order.customer.phone, email: order.customer.email || "",
        city: ship ? "Expédition : " + order.customer.city : order.customer.zone, address: order.customer.address, notes: order.customer.notes || "",
        payment: order.payment, subtotal, delivery: dfee, total: subtotal + dfee, items,
      };
      const all = read("gh_demo_orders", []);
      all.unshift(rec);
      write("gh_demo_orders", all);
      return { number: rec.number, total: rec.total, delivery: dfee };
    },

    async trackOrder(number, phone) {
      number = String(number).trim().toUpperCase();
      if (live) return rest("/rest/v1/rpc/track_order", { method: "POST", body: { p_number: number, p_phone: phone } });
      const o = read("gh_demo_orders", []).find((x) => x.number === number && digits(x.phone).slice(-8) === digits(phone).slice(-8));
      return o ? { status: o.status, created_at: o.created_at, total: o.total, items: o.items } : null;
    },

    async subscribe(email) {
      if (live) return rest("/rest/v1/subscribers", { method: "POST", body: { email }, headers: { Prefer: "return=minimal" } });
      const all = read("gh_demo_subs", []);
      if (!all.includes(email)) all.push(email);
      write("gh_demo_subs", all);
    },

    async sendMessage(m) {
      if (live) return rest("/rest/v1/messages", { method: "POST", body: m, headers: { Prefer: "return=minimal" } });
      const all = read("gh_demo_msgs", []);
      all.unshift({ ...m, created_at: new Date().toISOString() });
      write("gh_demo_msgs", all);
    },
  };
})();
