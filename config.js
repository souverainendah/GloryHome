// Réglages de la boutique : à modifier ici, sans toucher au reste du code.
window.GLORY = {
  whatsapp: "2250153052985",            // format international sans "+"
  phoneDisplay: "+225 01 53 05 29 85",
  email: "gloryhome89@gmail.com",
  instagram: "",                        // lien complet du compte Instagram
  // Supabase : laisser vide = mode démo (commandes enregistrées seulement dans ce navigateur)
  supabase: { url: "", anonKey: "" },
  deliveryFee: 0,                       // frais de livraison en F (0 = communiqués à la confirmation)
  deliveryNote: "Les frais et le délai de livraison vous sont confirmés par message avant l'expédition.",
  payments: [
    { id: "livraison", label: "Paiement à la livraison", hint: "Vous payez à la réception de votre colis." },
  ],
};
