// Suivi de commande
(() => {
  const Api = window.Api, fmt = window.fmt;
  const STEPS = [
    ["nouvelle", "Commande reçue"],
    ["confirmee", "Commande confirmée"],
    ["preparation", "En préparation"],
    ["expediee", "Expédiée"],
    ["livree", "Livrée"],
  ];
  const form = document.getElementById("trackForm"), out = document.getElementById("trackResult");

  const show = (html) => { out.innerHTML = html; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function render(num, o) {
    if (!o) return show(`<p class="form-error">Aucune commande ne correspond à ces informations. Vérifiez le numéro et le téléphone.</p>`);
    if (o.status === "annulee") return show(`<h2>Commande ${esc(num)}</h2><p>Cette commande a été annulée. Écrivez-nous si vous avez une question.</p>`);
    const idx = Math.max(0, STEPS.findIndex(([k]) => k === o.status));
    const steps = STEPS.map(([, label], i) => `<li class="${i <= idx ? "done-s" : ""} ${i === idx ? "now" : ""}">${label}</li>`).join("");
    const items = (o.items || []).map((i) => `<li>${esc(i.qty)} × ${esc(i.product_name)} · ${esc(i.color)}</li>`).join("");
    show(`<h2>Commande ${esc(num)}</h2><ol class="steps-track">${steps}</ol><ul class="legal">${items}</ul><p><b>Total : ${fmt(o.total)}</b></p>`);
  }

  async function search(num, phone) {
    show("<p>Recherche en cours…</p>");
    try { render(num, await Api.trackOrder(num, phone)); }
    catch { show(`<p class="form-error">Le suivi est momentanément indisponible. Réessayez dans un instant.</p>`); }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    search(String(fd.get("n")).trim(), String(fd.get("phone")).trim());
  });

  // Numéro prérempli depuis le lien de confirmation ou depuis la dernière commande de cet appareil
  const q = new URLSearchParams(location.search).get("n");
  const mine = Api.read("gh_orders", []);
  const demo = Api.read("gh_demo_orders", []);
  if (q) form.elements.n.value = q;
  const known = demo.find((o) => o.number === q) || mine.find((o) => o.number === q);
  if (known && known.phone) { form.elements.phone.value = known.phone; if (q) search(q, known.phone); }
})();
