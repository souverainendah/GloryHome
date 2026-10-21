// Réglages de la boutique : à modifier ici, sans toucher au reste du code.
window.GLORY = {
  whatsapp: "00000000000",              // format international sans "+" (ex. 2250700000000)
  email: "contact@gloryhome.example",
  instagram: "",                        // lien complet du compte Instagram
  // Supabase : laisser vide = mode démo (commandes enregistrées seulement dans ce navigateur)
  supabase: { url: "", anonKey: "" },
  deliveryFee: 0,                       // frais de livraison en F (0 = communiqués à la confirmation)
  deliveryNote: "Les frais et le délai de livraison vous sont confirmés par message avant l'expédition.",
  payments: [
    { id: "livraison", label: "Paiement à la livraison", hint: "Vous payez à la réception de votre colis." },
    { id: "mobile", label: "Mobile Money (Wave, Orange Money…)", hint: "Nous vous envoyons les instructions de paiement sur WhatsApp." },
  ],
};
