// Réglages de la boutique : à modifier ici, sans toucher au reste du code.
window.GLORY = {
  whatsapp: "2250153052985",            // format international sans "+"
  phoneDisplay: "+225 01 53 05 29 85",
  email: "gloryhome89@gmail.com",
  instagram: "",                        // lien complet du compte Instagram
  // Supabase : laisser vide = mode démo (commandes enregistrées seulement dans ce navigateur)
  supabase: { url: "", anonKey: "" },
  // Frais de livraison par commune (en F). Doivent rester identiques à la table delivery_zones de Supabase.
  delivery: {
    zones: [
      { name: "Abatta", fee: 1500 }, { name: "Bingerville", fee: 1500 }, { name: "Faya", fee: 1500 },
      { name: "Angré", fee: 1500 }, { name: "Cocody", fee: 1500 },
      { name: "Koumassi", fee: 2000 }, { name: "Port-Bouët", fee: 2000 }, { name: "Yopougon", fee: 2000 },
      { name: "Abobo", fee: 2000 }, { name: "Marcory", fee: 2000 }, { name: "Treichville", fee: 2000 },
    ],
    shippingLabel: "Autre ville (expédition)",
  },
  deliveryNote: "Livraison à Abidjan selon votre commune. Pour une expédition hors d'Abidjan, les frais vous sont confirmés par téléphone.",
  payments: [
    { id: "livraison", label: "Paiement à la livraison", hint: "Vous payez à la réception de votre colis." },
  ],
};
