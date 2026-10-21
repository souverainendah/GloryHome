# Glory Home

Boutique en ligne de vêtements et accessoires féminins. Site statique (HTML, CSS, JavaScript) avec un back-office Supabase. Aucune étape de compilation.

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `script.js` | Boutique : accueil, fiche produit, collection |
| `shop.js` | Panier, commande, newsletter, contact |
| `catalog.js` | Produits, prix, coloris (source unique) |
| `config.js` | Réglages : WhatsApp, email, Supabase, paiements, livraison |
| `api.js` | Accès aux données (Supabase ou mode démo local) |
| `admin.html`, `admin.js` | Administration : commandes, stock, messages, inscrits |
| `supabase/schema.sql` | Base de données, sécurité et fonctions |
| `cgv.html`, `mentions-legales.html`, `confidentialite.html`, `livraison-retours.html` | Pages légales (champs jaunes à compléter) |

## Mode démo et mode réel
Tant que `supabase.url` et `supabase.anonKey` sont vides dans `config.js`, le site fonctionne en mode démo : le panier et les commandes restent dans le navigateur. L'administration affiche alors les commandes de ce navigateur.

## Mise en service
1. **Supabase** : créer un projet, ouvrir l'éditeur SQL, coller et exécuter `supabase/schema.sql`.
   Dans Authentication > Providers > Email, désactiver « Allow new users to sign up ».
   Créer votre utilisateur (Authentication > Users), puis exécuter : `insert into admins (user_id) select id from auth.users where email = 'VOTRE_EMAIL';`
2. **config.js** : renseigner `supabase.url` et `supabase.anonKey` (clé « anon / publishable », jamais la clé « service_role »), le numéro WhatsApp, l'email et l'Instagram.
3. **GitHub** : créer un dépôt, y envoyer ce dossier.
4. **Vercel** : importer le dépôt (framework « Other », aucun build). Chaque envoi sur GitHub redéploie le site.
5. Remplacer `www.gloryhome.example` par votre vrai domaine dans `index.html`, `robots.txt` et `sitemap.xml`.
6. Compléter les champs jaunes des pages légales.

## Ajouter un produit
Ajouter un objet dans `catalog.js`, déposer les photos (fond blanc) dans `images/`, puis ajouter le produit et ses coloris dans la base (tables `products` et `variants`, ou `insert` dans `schema.sql`).

## Sécurité
- Les prix et le stock sont vérifiés côté serveur dans `create_order` : un client ne peut pas modifier un prix.
- Les clients n'ont aucun droit de lecture sur les commandes ; seul un administrateur (table `admins`) y accède.
- Les formulaires ont un champ piège contre les robots. Pour un trafic important, ajouter une protection supplémentaire (Cloudflare Turnstile, par exemple).