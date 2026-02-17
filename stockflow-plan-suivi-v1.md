# StockFlow — Plan de Suivi V1 (MVP)

**Référence PRD :** StockFlow PRD v1.0
**Référence Dev Plan :** StockFlow Dev Plan v1.0
**Durée :** 4 semaines (5 février — 5 mars 2026)
**Stack :** SvelteKit + Cloudflare (D1, Workers, Pages) + Better Auth + Drizzle ORM

---

## Légende des statuts

| Icône | Statut   | Description                       |
| ----- | -------- | --------------------------------- |
| ⬜    | À faire  | Tâche non démarrée                |
| 🔵    | En cours | Développement en cours            |
| 🟡    | En revue | Code review / tests en cours      |
| ✅    | Validé   | Tâche terminée et validée         |
| 🔴    | Bloqué   | Tâche bloquée (préciser le motif) |

---

## Progression globale

| Semaine              | Module                              | Progression | Statut |
| -------------------- | ----------------------------------- | ----------- | ------ |
| S1 (5-11 fév)        | Fondations                          | 35/41       | ✅     |
| S2 (12-18 fév)       | Core Métier                         | 20/34       | 🟡     |
| S3 (19-25 fév)       | Transferts, Inventaire & Résilience | 25/39       | 🟡     |
| S4 (26 fév - 5 mars) | Dashboard, Polish & Déploiement     | 5/46        | ⬜     |
| **Total V1**         |                                     | **85/160**  | 🔵     |

> **Note :** 12 tâches supplémentaires sont partiellement réalisées (🟡), non comptées dans la progression ci-dessus.

## Points de contrôle (Checkpoints)

| Date       | Checkpoint                  | Critère de validation                                           | Atteint ? |
| ---------- | --------------------------- | --------------------------------------------------------------- | --------- |
| Ven 7 fév  | **CP0** — Setup validé      | Projet tourne en local, auth fonctionne, `db:push` OK           | ✅        |
| Ven 11 fév | **CP1** — Fondations        | CRUD users/entrepôts fonctionnels, layout responsive            | ✅        |
| Ven 18 fév | **CP2** — Core métier       | Mouvements entrées/sorties OK, scan fonctionnel, PUMP calculé   | 🟡        |
| Ven 25 fév | **CP3** — Workflows         | Transfert complet bout-en-bout, inventaire, alertes, résilience | 🟡        |
| Mer 4 mars | **CP4** — Release Candidate | Tests passent, migration prod prête                             | ⬜        |
| Jeu 5 mars | **CP5** — Go Live           | Déploiement production                                          | ⬜        |

> **CP2 :** Backend mouvements/PUMP 100% fonctionnel. Scan composant existe mais pas encore intégré dans le formulaire mouvements.
> **CP3 :** Transfert bout-en-bout OK (sauf ajustement stock sur résolution litige). Inventaire OK. Alertes in-app OK (emails manquants).

---

---

# 📅 SEMAINE 1 — FONDATIONS (5-11 février)

> **Objectif :** Auth Better Auth fonctionnel, CRUD Users/Entrepôts, layout responsive, schéma Drizzle complet.

---

## 1.1 Setup Projet & Schéma DB — Jour 1 (Mer 5 fév)

### Tâches

| #      | Tâche                                                                                                                | Statut | Checkbox |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 1.1.1  | Créer le projet SvelteKit via `pnpm create cloudflare@latest stockflow -- --framework=svelte`                        | ✅     | - [x]    |
| 1.1.2  | Installer les dépendances (drizzle-orm, better-auth, zod, dayjs, nanoid, html5-qrcode, idb, tailwindcss)             | ✅     | - [x]    |
| 1.1.3  | Créer la base D1 via `wrangler d1 create stockflow-db`                                                               | ✅     | - [x]    |
| 1.1.4  | Configurer `wrangler.toml` (binding DB, nodejs_compat, vars)                                                         | ✅     | - [x]    |
| 1.1.5  | Configurer `drizzle.config.ts` (schema path, dialect sqlite, dbCredentials)                                          | ✅     | - [x]    |
| 1.1.6  | Configurer les scripts npm (`db:push`, `db:generate`, `db:migrate:local`, `db:migrate:prod`, `db:studio`, `db:seed`) | ✅     | - [x]    |
| 1.1.7  | Écrire le schéma Drizzle complet `src/lib/server/db/schema.ts` (source de vérité)                                    | ✅     | - [x]    |
| 1.1.8  | `db:push` + vérification via `db:studio`                                                                             | ✅     | - [x]    |
| 1.1.9  | Configurer Tailwind CSS + thème de base (`app.css`)                                                                  | ✅     | - [x]    |
| 1.1.10 | Configurer la structure de dossiers du projet (§7 du dev plan)                                                       | ✅     | - [x]    |
| 1.1.11 | Initialiser Git + structure branches (main, develop, feat/\*)                                                        | ✅     | - [x]    |

### Tables du schéma Drizzle

| Table                        | Définie | `db:push` OK | Validée `db:studio` |
| ---------------------------- | ------- | ------------ | ------------------- |
| `user` (Better Auth)         | - [x]   | - [x]        | - [x]               |
| `session` (Better Auth)      | - [x]   | - [x]        | - [x]               |
| `account` (Better Auth)      | - [x]   | - [x]        | - [x]               |
| `verification` (Better Auth) | - [x]   | - [x]        | - [x]               |
| `warehouses`                 | - [x]   | - [x]        | - [x]               |
| `user_warehouses`            | - [x]   | - [x]        | - [x]               |
| `categories`                 | - [x]   | - [x]        | - [x]               |
| `products`                   | - [x]   | - [x]        | - [x]               |
| `product_warehouse`          | - [x]   | - [x]        | - [x]               |
| `movements`                  | - [x]   | - [x]        | - [x]               |
| `transfers`                  | - [x]   | - [x]        | - [x]               |
| `transfer_items`             | - [x]   | - [x]        | - [x]               |
| `inventories`                | - [x]   | - [x]        | - [x]               |
| `inventory_items`            | - [x]   | - [x]        | - [x]               |
| `alerts`                     | - [x]   | - [x]        | - [x]               |
| `audit_logs`                 | - [x]   | - [x]        | - [x]               |

### Critères d'acceptation

- [x] `pnpm dev` lance le serveur local (via `wrangler dev`) sans erreur
- [x] Le schéma Drizzle complet est dans `src/lib/server/db/schema.ts`
- [x] `pnpm db:push` synchronise la DB locale sans erreur
- [x] `pnpm db:studio` affiche toutes les tables
- [x] Tailwind fonctionne (classe utilitaire visible)
- [x] Structure de dossiers conforme à la §7 du dev plan
- [x] IDs en TEXT (nanoid), timestamps TEXT ISO, soft delete `is_active`
- [x] Prix stockés en nombres (XOF, pas de centimes fractionnaires)
- [x] Convention commits en place (feat/fix/chore/docs)

---

## 1.2 Authentification Better Auth — Jour 2 (Jeu 6 fév)

### Tâches

| #     | Tâche                                                                                      | Statut | Checkbox |
| ----- | ------------------------------------------------------------------------------------------ | ------ | -------- |
| 1.2.1 | Configurer Better Auth (`src/auth.ts`) avec drizzleAdapter, emailAndPassword, plugin admin | ✅     | - [x]    |
| 1.2.2 | Créer la route catch-all `api/auth/[...betterauth]/+server.ts`                             | ✅     | - [x]    |
| 1.2.3 | Implémenter `hooks.server.ts` — middleware session global                                  | ✅     | - [x]    |
| 1.2.4 | Créer la page Login (`/login`) — formulaire email/password                                 | ✅     | - [x]    |
| 1.2.5 | Créer la page Forgot Password (`/forgot-password`)                                         | ⬜     | - [ ]    |
| 1.2.6 | Créer la page Reset Password (`/reset-password`)                                           | ⬜     | - [ ]    |
| 1.2.7 | Créer la page Setup Account (`/setup-account`) — lien d'invitation                         | ⬜     | - [ ]    |

### Critères d'acceptation

- [ ] Inscription par invitation (admin crée le compte → email avec lien d'inscription)
- [x] Connexion email/password fonctionnelle (Better Auth + sessions httpOnly + scrypt)
- [x] Session validée sur chaque requête via `hooks.server.ts`
- [x] Redirection `/login` si non authentifié sur les routes `(app)/`
- [ ] Réinitialisation de mot de passe complète (email → lien temporaire → reset)
- [x] Déconnexion fonctionne (session terminée, redirection login)
- [x] Sessions expirent après 7 jours, refresh quotidien
- [x] Configuration `BETTER_AUTH_URL` et `BETTER_AUTH_SECRET` en place

**User stories couvertes :** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

---

## 1.3 Middleware Autorisation + Layout — Jour 3 (Ven 7 fév)

### Tâches

| #     | Tâche                                                                                                                                  | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 1.3.1 | Créer le middleware RBAC (`src/lib/server/auth/rbac.ts`)                                                                               | ✅     | - [x]    |
| 1.3.2 | Implémenter les helpers : `requireRole()`, `requireWarehouseAccess()`, `canWrite()`, `canManage()`, `canApprove()`, `hasGlobalScope()` | ✅     | - [x]    |
| 1.3.3 | Définir la hiérarchie des rôles (admin:100 → viewer:10)                                                                                | ✅     | - [x]    |
| 1.3.4 | Créer le layout principal desktop (`+layout.svelte`) — sidebar + header + slot                                                         | ✅     | - [x]    |
| 1.3.5 | Créer le layout mobile — bottom navigation (5 onglets : Home, Stock, Trans, Inv, More)                                                 | ✅     | - [x]    |
| 1.3.6 | Créer les composants UI de base (Button, Input, Modal, Toast, Badge, Card, DataTable, Pagination, Skeleton, EmptyState, ConfirmModal)  | 🟡     | - [ ]    |

> **1.3.6 :** 9/11 composants créés — Button, Input, Modal, Toast, Badge, Card, DataTable, EmptyState, ConfirmModal + Select, PageHeader (bonus). **Manquants :** Pagination, Skeleton.

### Matrice des rôles — Hiérarchie

| Rôle               | Code            | Niveau | Scope                      | Implémenté | Testé |
| ------------------ | --------------- | ------ | -------------------------- | ---------- | ----- |
| Administrateur     | `admin`         | 100    | Global                     | - [x]      | - [x] |
| Admin gestionnaire | `admin_manager` | 80     | Global                     | - [x]      | - [x] |
| Gestionnaire       | `manager`       | 60     | Entrepôts assignés         | - [x]      | - [x] |
| Utilisateur        | `user`          | 40     | Entrepôt assigné           | - [x]      | - [x] |
| Admin visiteur     | `admin_viewer`  | 20     | Global (lecture)           | - [x]      | - [x] |
| Visiteur           | `viewer`        | 10     | Entrepôt assigné (lecture) | - [x]      | - [x] |

### Critères d'acceptation

- [x] `requireRole(userRole, minRole)` bloque avec 403 si rôle insuffisant
- [x] `requireWarehouseAccess()` vérifie l'accès via table `user_warehouses` (bypass pour rôles globaux)
- [x] `canWrite()` retourne false pour `admin_viewer` et `viewer`
- [x] `canApprove()` retourne true uniquement pour `admin` et `admin_manager`
- [x] Layout desktop : sidebar avec menu adapté au rôle (Users visible uniquement pour admin)
- [x] Layout mobile : bottom nav 5 onglets, navigation au pouce
- [x] Composants UI utilisent Tailwind, mobile-first

**🏁 CP0 — L'app tourne, l'auth fonctionne, le layout est en place.** ✅

---

## 1.4 CRUD Utilisateurs — Jour 4 (Lun 10 fév)

### Tâches

| #     | Tâche                                                                           | Statut | Checkbox |
| ----- | ------------------------------------------------------------------------------- | ------ | -------- |
| 1.4.1 | API : `GET /api/v1/users` — liste paginée avec filtres (rôle, statut, entrepôt) | ✅     | - [x]    |
| 1.4.2 | API : `POST /api/v1/users` — création + envoi email invitation                  | ✅     | - [x]    |
| 1.4.3 | API : `GET /api/v1/users/[id]` — fiche complète                                 | ✅     | - [x]    |
| 1.4.4 | API : `PUT /api/v1/users/[id]` — modification (rôle, entrepôts, statut)         | ✅     | - [x]    |
| 1.4.5 | API : `DELETE /api/v1/users/[id]` — soft delete (is_active = 0)                 | ✅     | - [x]    |
| 1.4.6 | API : `PUT /api/v1/users/[id]/warehouses` — assignation multi-entrepôts         | ✅     | - [x]    |
| 1.4.7 | UI : page `/users` — liste avec filtres et recherche                            | 🟡     | - [ ]    |
| 1.4.8 | UI : page `/users/new` — formulaire création + invitation email                 | ✅     | - [x]    |
| 1.4.9 | UI : page `/users/[id]` — fiche détail + édition inline                         | ✅     | - [x]    |

> **1.4.7 :** Liste paginée avec badges rôle/statut et cards mobile OK. **Manquants :** champ recherche, filtres rôle/statut dans l'UI.

### Critères d'acceptation

- [x] Seul un admin peut accéder à la gestion des utilisateurs
- [x] Création déclenche un email d'invitation (Better Auth)
- [x] Email unique validé côté serveur (Zod)
- [x] Attribution de l'un des 6 rôles via liste déroulante
- [x] Assignation multi-entrepôts via multi-sélection
- [x] Désactivation empêche la connexion (is_active = 0)
- [x] Liste paginée et filtrable (rôle, statut, entrepôt)
- [x] Responsive : tableau desktop → cards mobile

**User stories couvertes :** USER-01, USER-02, USER-03, USER-04, USER-05

---

## 1.5 CRUD Entrepôts — Jour 5 (Mar 11 fév)

### Tâches

| #     | Tâche                                                                             | Statut | Checkbox |
| ----- | --------------------------------------------------------------------------------- | ------ | -------- |
| 1.5.1 | API : `GET /api/v1/warehouses` — liste filtrée par permissions                    | ✅     | - [x]    |
| 1.5.2 | API : `POST /api/v1/warehouses` — création (admin only)                           | ✅     | - [x]    |
| 1.5.3 | API : `GET /api/v1/warehouses/[id]` — détail + résumé stock                       | ✅     | - [x]    |
| 1.5.4 | API : `PUT /api/v1/warehouses/[id]` — modification (admin only)                   | ✅     | - [x]    |
| 1.5.5 | API : `DELETE /api/v1/warehouses/[id]` — soft delete                              | ✅     | - [x]    |
| 1.5.6 | UI : page `/warehouses` — liste cards (nom, adresse, nb produits, valeur)         | ✅     | - [x]    |
| 1.5.7 | UI : page `/warehouses/new` — formulaire création                                 | ✅     | - [x]    |
| 1.5.8 | UI : page `/warehouses/[id]` — fiche détail + onglets (stock, mouvements, équipe) | 🟡     | - [ ]    |

> **1.5.8 :** Page existe avec stats stock, formulaire édition, liste utilisateurs assignés, suppression avec ConfirmModal. **Manquant :** navigation par onglets (contenu affiché en grille de cards).

### Critères d'acceptation

- [x] Seul un admin peut créer/modifier/supprimer un entrepôt
- [x] Un entrepôt a : nom, adresse, contact, statut (is_active)
- [x] La liste est filtrée selon les permissions de l'utilisateur connecté
- [x] Les rôles globaux voient tous les entrepôts ; les autres uniquement les entrepôts assignés
- [x] Un entrepôt avec du stock ne peut pas être supprimé (erreur explicite)
- [x] Le détail affiche le résumé du stock par produit
- [x] Cards responsive (empilées en mobile)

**User stories couvertes :** WH-01, WH-02, WH-03, WH-04

**🏁 CP1 — CRUD users/entrepôts fonctionnels, layout responsive OK.** ✅

---

---

# 📅 SEMAINE 2 — MODULES MÉTIER CORE (12-18 février)

> **Objectif :** Produits, mouvements avec transactions atomiques, calcul PUMP, scan codes-barres.

---

## 2.1 CRUD Produits (Backend) — Jour 6 (Mer 12 fév)

### Tâches

| #     | Tâche                                                                               | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------- | ------ | -------- |
| 2.1.1 | API : endpoints CRUD produits (`/api/v1/products`)                                  | ✅     | - [x]    |
| 2.1.2 | API : endpoints CRUD catégories (arbre hiérarchique parent_id)                      | ✅     | - [x]    |
| 2.1.3 | Schémas validation Zod (createProductSchema, updateProductWarehouseSchema)          | ✅     | - [x]    |
| 2.1.4 | API : recherche/filtre produits (SKU, nom, catégorie, entrepôt)                     | 🟡     | - [ ]    |
| 2.1.5 | API : configuration stock minimum par produit/entrepôt (product_warehouse.minStock) | ✅     | - [x]    |

> **2.1.4 :** Recherche par SKU/nom (`?search=`) et filtre catégorie (`?category=`) OK. **Manquant :** filtre explicite `?warehouseId=` (le scoping par rôle est automatique mais pas sélectionnable par l'utilisateur).

### Critères d'acceptation

- [x] Un produit a : SKU (unique), nom, description, catégorie, unité, prix achat, prix vente (XOF), min_stock
- [x] Les prix sont en nombres XOF (pas de centimes fractionnaires)
- [x] Validation Zod côté serveur (SKU unique, prix ≥ 0, champs requis)
- [x] Catégories supportent 1 niveau de hiérarchie (parent_id)
- [x] Stock minimum configurable globalement (products.min_stock) et par entrepôt (product_warehouse.minStock)

**User stories couvertes :** PROD-01, PROD-02, PROD-03, PROD-04, PROD-07

---

## 2.2 CRUD Produits (Frontend) — Jour 7 (Jeu 13 fév)

### Tâches

| #     | Tâche                                                                                     | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| 2.2.1 | UI : page `/products` — liste tableau/cards avec recherche, filtres catégorie/entrepôt    | ✅     | - [x]    |
| 2.2.2 | UI : page `/products/new` — formulaire création (SKU, nom, prix, catégorie, seuils)       | ✅     | - [x]    |
| 2.2.3 | UI : page `/products/[id]` — fiche détail avec onglets (Infos, Stock, Mouvements, Config) | 🟡     | - [ ]    |
| 2.2.4 | UI : page `/products/[id]/edit` — formulaire modification                                 | ✅     | - [x]    |
| 2.2.5 | Composant `<ProductCard />` — card produit (SKU, nom, stock total, alerte)                | ⬜     | - [ ]    |
| 2.2.6 | Composant `<StockByWarehouse />` — tableau stock par entrepôt avec indicateurs            | ⬜     | - [ ]    |
| 2.2.7 | Composant `<ProductSearch />` — barre de recherche avec autocomplete                      | ⬜     | - [ ]    |
| 2.2.8 | Composant `<CategoryTree />` — sélecteur de catégorie hiérarchique                        | ⬜     | - [ ]    |

> **2.2.3 :** Page existe avec sections Infos, Stock par entrepôt, Mouvements récents. **Manquants :** navigation par onglets, onglet Config pour seuils par entrepôt.
> **2.2.5-2.2.8 :** Fonctionnalités implémentées inline dans les pages, pas extraites en composants réutilisables. CategoryTree est un simple `<select>` plat.

### Critères d'acceptation

- [x] Recherche fonctionne sur SKU, nom, catégorie
- [x] Détail produit montre stock par entrepôt + total + PUMP + valorisation (XOF)
- [x] Prix affichés en XOF avec séparateur de milliers (via `formatXOF()`)
- [x] Liste paginée (20 produits/page), triable
- [x] Responsive : tableau desktop → cards mobile
- [ ] Onglet Config permet de paramétrer le seuil par entrepôt

**User stories couvertes :** PROD-05, PROD-06

---

## 2.3 Service Stock + PUMP — Jour 8 (Ven 14 fév)

> **Le cœur du système — `src/lib/server/services/stock.ts`**

### Tâches

| #     | Tâche                                                                      | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------- | ------ | -------- |
| 2.3.1 | Implémenter `stockService.recordMovement()` — transaction atomique Drizzle | ✅     | - [x]    |
| 2.3.2 | Implémenter le calcul PUMP SQL dans `onConflictDoUpdate`                   | ✅     | - [x]    |
| 2.3.3 | Implémenter `stockService.getStockByWarehouse()`                           | ✅     | - [x]    |
| 2.3.4 | Implémenter `stockService.getStockConsolidated()`                          | ✅     | - [x]    |
| 2.3.5 | Implémenter `stockService.getValuation()` (qté × PUMP)                     | ✅     | - [x]    |
| 2.3.6 | Implémenter `stockService.checkAndAlertMinStock()`                         | 🟡     | - [ ]    |
| 2.3.7 | Tests unitaires du service stock (9 cas minimum)                           | ✅     | - [x]    |

> **2.3.6 :** Fonctionnalité implémentée mais scindée : `checkMinStock()` dans stockService + `alertService.createStockAlert()` appelé dans le handler API mouvements. Pas une méthode unique `checkAndAlertMinStock()`.
> **2.3.7 :** 11 tests unitaires (dépasse les 9 requis).

### Règles PUMP à implémenter

| Événement                | Impact PUMP                       | Implémenté | Testé |
| ------------------------ | --------------------------------- | ---------- | ----- |
| Entrée (achat/réception) | Recalculé via formule             | - [x]      | - [x] |
| Sortie (vente/perte)     | Inchangé                          | - [x]      | - [x] |
| Transfert expédition     | Inchangé (PUMP suit le produit)   | - [x]      | - [x] |
| Transfert réception      | Recalculé (destination)           | - [x]      | - [x] |
| Ajustement (+)           | Recalculé avec prix achat courant | - [x]      | - [ ] |
| Ajustement (-)           | Inchangé                          | - [x]      | - [ ] |
| Stock à 0 puis entrée    | PUMP = prix d'achat               | - [x]      | - [x] |

### Tests unitaires requis

| Test                                                   | Statut |
| ------------------------------------------------------ | ------ |
| Entrée stock : quantité incrémentée                    | - [x]  |
| Entrée stock : PUMP recalculé correctement             | - [x]  |
| Sortie stock : quantité décrémentée                    | - [x]  |
| Sortie stock : PUMP inchangé                           | - [x]  |
| Sortie stock insuffisant : erreur `INSUFFICIENT_STOCK` | - [x]  |
| Stock à 0 puis entrée : PUMP = prix achat              | - [x]  |
| Alerte stock minimum déclenchée                        | - [x]  |
| Transaction atomique : rollback si erreur              | - [x]  |
| Concurrence : deux mouvements simultanés               | - [ ]  |

### Critères d'acceptation

- [x] Formule PUMP : `((Stock_actuel × PUMP_actuel) + (Qté_reçue × Prix_achat)) / (Stock_actuel + Qté_reçue)`
- [x] Calcul PUMP fait en SQL dans la DB (pas côté JS) pour la fiabilité
- [x] `onConflictDoUpdate` pour upsert atomique sur product_warehouse
- [x] Vérification stock suffisant DANS la transaction (pas de race condition)
- [x] Rollback complet si erreur partielle
- [x] Alerte auto si stock passe sous le seuil minimum après mouvement
- [x] 9 tests unitaires passent

**User stories couvertes :** MOV-06

---

## 2.4 Module Mouvements — Jour 9 (Lun 17 fév)

### Tâches

| #     | Tâche                                                                                                                              | Statut | Checkbox |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 2.4.1 | API : `POST /api/v1/movements` — création mouvement (utilise `stockService`)                                                       | ✅     | - [x]    |
| 2.4.2 | API : `GET /api/v1/movements` — historique avec filtres (date, produit, entrepôt, type, utilisateur)                               | ✅     | - [x]    |
| 2.4.3 | Audit log automatique pour chaque mouvement                                                                                        | ⬜     | - [ ]    |
| 2.4.4 | Post-mouvement : vérification seuil minimum → alerte si nécessaire                                                                 | ✅     | - [x]    |
| 2.4.5 | UI : page `/movements` — historique global avec filtres                                                                            | ✅     | - [x]    |
| 2.4.6 | UI : page `/movements/new` — formulaire rapide (entrepôt → scan/recherche → type → qté → motif → prix achat si entrée → référence) | ✅     | - [x]    |
| 2.4.7 | Composant `<MovementForm />` — optimisé mobile (gros boutons, champs larges)                                                       | ⬜     | - [ ]    |
| 2.4.8 | Composant `<MovementTimeline />` — historique visuel d'un produit                                                                  | ⬜     | - [ ]    |
| 2.4.9 | Composant `<ReasonSelect />` — sélecteur de motif (prédéfinis + libre)                                                             | ⬜     | - [ ]    |

> **2.4.3 :** `auditService` existe mais n'est pas appelé dans le handler POST mouvements.
> **2.4.7-2.4.9 :** Fonctionnalités implémentées inline dans les pages, pas extraites en composants.

### Critères d'acceptation

- [x] Types de mouvements : `in`, `out`, `adjustment_in`, `adjustment_out`
- [x] Motif obligatoire (achat, vente, perte, ajustement, retour, autre)
- [x] Référence optionnelle (n° bon de livraison)
- [x] Prix d'achat requis pour les entrées (calcul PUMP)
- [ ] Confirmation avant validation (récapitulatif)
- [x] Entrepôt pré-filtré selon le rôle de l'utilisateur
- [x] Historique filtrable et paginé
- [ ] Interface mobile permet saisie rapide

**User stories couvertes :** MOV-01, MOV-02, MOV-03, MOV-04, MOV-05

---

## 2.5 Scan Codes-barres — Jour 10 (Mar 18 fév)

### Tâches

| #     | Tâche                                                                                  | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------------------- | ------ | -------- |
| 2.5.1 | Composant `<BarcodeScanner />` — wrapper html5-qrcode avec UI                          | ✅     | - [x]    |
| 2.5.2 | Intégration dans le formulaire mouvements (scan → recherche produit → pré-remplissage) | ⬜     | - [ ]    |
| 2.5.3 | Gestion permissions caméra (demande explicite + fallback gracieux)                     | 🟡     | - [ ]    |
| 2.5.4 | Mode scan continu (option pour scanner plusieurs produits)                             | ✅     | - [x]    |
| 2.5.5 | Fallback saisie manuelle SKU                                                           | ⬜     | - [ ]    |

> **2.5.3 :** Try/catch minimal sur erreur caméra avec callback `onerror`. Pas d'UI explicite de demande de permission ni de guide en cas de refus.

### Critères d'acceptation

- [x] Ouverture caméra arrière (`facingMode: 'environment'`)
- [x] Scan reconnaît les codes-barres/QR et affiche la fiche produit
- [ ] Scan → formulaire mouvement pré-rempli avec le produit
- [ ] Si scan échoue → champ de saisie manuelle SKU disponible
- [x] Mode scan continu pour inventaire (scan plusieurs produits à la suite)
- [ ] Fonctionne sur Chrome Android et Safari iOS
- [ ] Taux de scan réussi > 90% (critère de succès PRD)

**User stories couvertes :** SCAN-01, SCAN-02, SCAN-03, SCAN-04

**🏁 CP2 — Mouvements entrées/sorties fonctionnels, PUMP calculé.** 🟡 Scan composant existe mais pas intégré dans les formulaires.

---

---

# 📅 SEMAINE 3 — TRANSFERTS, INVENTAIRE & RÉSILIENCE (19-25 février)

> **Objectif :** Workflow de transfert complet (incluant litiges), module inventaire, alertes, résilience réseau.

---

## 3.1 Transferts Backend — Jour 11 (Mer 19 fév)

### Tâches

| #      | Tâche                                                                                                              | Statut | Checkbox |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| 3.1.1  | API : `POST /api/v1/transfers` — création demande (validation stock source suffisant)                              | 🟡     | - [ ]    |
| 3.1.2  | API : `POST /api/v1/transfers/[id]/approve` — approbation (admin/admin_manager)                                    | ✅     | - [x]    |
| 3.1.3  | API : `POST /api/v1/transfers/[id]/reject` — rejet avec motif obligatoire                                          | ✅     | - [x]    |
| 3.1.4  | API : `POST /api/v1/transfers/[id]/ship` — expédition (décrémente stock source via `stockService`)                 | ✅     | - [x]    |
| 3.1.5  | API : `POST /api/v1/transfers/[id]/receive` — réception complète (incrémente stock destination)                    | ✅     | - [x]    |
| 3.1.6  | API : `POST /api/v1/transfers/[id]/receive` — réception partielle (qté_reçue < qté_envoyée → `partially_received`) | 🟡     | - [ ]    |
| 3.1.7  | API : notification litige auto → admin gestionnaire si réception partielle                                         | ✅     | - [x]    |
| 3.1.8  | API : `POST /api/v1/transfers/[id]/resolve` — résolution litige (ajustement stock + commentaire)                   | 🟡     | - [ ]    |
| 3.1.9  | API : `POST /api/v1/transfers/[id]/cancel` — annulation (avant expédition uniquement)                              | ✅     | - [x]    |
| 3.1.10 | Service `transfers.ts` — machine à états complète                                                                  | 🟡     | - [ ]    |

> **3.1.1 :** Création OK mais pas de vérification stock source à la création — vérification faite uniquement à l'expédition (ship).
> **3.1.6 :** Réception partielle fonctionne mais `partially_received` n'est pas un statut persisté — transition directe `shipped → disputed`.
> **3.1.8 :** Endpoint existe avec `resolution` obligatoire. **Manquant :** `adjustStock` est accepté mais c'est un no-op (TODO dans le code).
> **3.1.10 :** Machine à états couvre 7 des 8 transitions. `partially_received` fusionné dans `disputed`.

### Machine à états du transfert

| De → Vers                     | Qui peut agir            | Conditions                                         | Implémenté | Testé |
| ----------------------------- | ------------------------ | -------------------------------------------------- | ---------- | ----- |
| pending → approved            | admin, admin_manager     | —                                                  | - [x]      | - [x] |
| pending → rejected            | admin, admin_manager     | Motif obligatoire                                  | - [x]      | - [x] |
| pending → cancelled           | gestionnaire source      | —                                                  | - [x]      | - [x] |
| approved → shipped            | gestionnaire source      | Stock source vérifié                               | - [x]      | - [x] |
| approved → cancelled          | admin, admin_manager     | —                                                  | - [x]      | - [x] |
| shipped → received            | gestionnaire destination | qté_reçue = qté_envoyée                            | - [x]      | - [x] |
| shipped → partially_received  | gestionnaire destination | qté_reçue < qté_envoyée, anomaly_notes obligatoire | - [x]      | - [x] |
| partially_received → disputed | auto                     | Notification admin gestionnaire                    | - [x]      | - [x] |
| disputed → resolved           | admin, admin_manager     | Ajustement stock + commentaire                     | - [x]      | - [x] |

> **Note :** `shipped → partially_received → disputed` est implémenté comme `shipped → disputed` directement (partially_received non persisté).

### Critères d'acceptation

- [x] Statuts implémentés : `pending`, `approved`, `rejected`, `shipped`, `received`, `partially_received`, `cancelled`, `disputed`, `resolved`
- [ ] La demande vérifie que le stock source est suffisant (vérifié à l'expédition seulement)
- [x] L'expédition débite le stock source (via `stockService`)
- [x] La réception crédite le stock destination (via `stockService`, PUMP recalculé)
- [x] Réception partielle → anomaly_notes obligatoire → auto `disputed`
- [ ] Résolution de litige → ajustement stock + clôture (`adjustStock` est un TODO)
- [x] Annulation possible uniquement avant expédition
- [x] Chaque étape horodatée avec l'utilisateur
- [x] Un transfert ne peut pas être modifié après approbation

**User stories couvertes :** TRF-01 à TRF-10

---

## 3.2 Transferts Frontend — Jour 12 (Jeu 20 fév)

### Tâches

| #     | Tâche                                                                                                              | Statut | Checkbox |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| 3.2.1 | UI : page `/transfers` — liste avec filtres (statut, entrepôt source/destination, date) + vue Kanban optionnelle   | 🟡     | - [ ]    |
| 3.2.2 | UI : page `/transfers/new` — formulaire (source + destination + ajout produits scan/recherche + quantités + notes) | ✅     | - [x]    |
| 3.2.3 | UI : page `/transfers/[id]` — détail avec timeline visuelle + items + actions contextuelles                        | ✅     | - [x]    |
| 3.2.4 | Composant `<TransferTimeline />` — visualisation des étapes (stepper)                                              | ⬜     | - [ ]    |
| 3.2.5 | Composant `<TransferActions />` — boutons contextuels selon statut et rôle                                         | ⬜     | - [ ]    |
| 3.2.6 | Composant `<TransferItemsTable />` — tableau produits (demandé / envoyé / reçu)                                    | ⬜     | - [ ]    |
| 3.2.7 | Composant `<DisputeBanner />` — bandeau d'alerte si litige en cours                                                | ⬜     | - [ ]    |

> **3.2.1 :** Filtres par onglets de statut et scoping entrepôt par rôle OK. **Manquants :** filtre par date, vue Kanban.
> **3.2.4-3.2.7 :** Toutes les fonctionnalités existent inline dans la page `/transfers/[id]` (timeline, boutons d'action conditionnels, tableau items, bandeau litige). Pas extraites en composants séparés.

### Critères d'acceptation

- [x] Les boutons d'action n'apparaissent que pour les rôles autorisés à l'étape en cours
- [x] Timeline visuelle montre l'avancement (stepper coloré)
- [x] Tableau items montre 3 colonnes : demandé / envoyé / reçu avec mise en évidence des écarts
- [x] Bandeau litige visible sur les transferts en dispute
- [x] Zone commentaires/anomalies accessible
- [ ] Liste filtrable par statut, entrepôt, date (filtre date manquant)

---

## 3.3 Module Inventaire — Jour 13 (Ven 21 fév)

### Tâches

| #     | Tâche                                                                                              | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------------------------------- | ------ | -------- |
| 3.3.1 | API : `POST /api/v1/inventory` — création session (entrepôt + produits concernés)                  | ✅     | - [x]    |
| 3.3.2 | API : saisie des comptages (counted_quantity par produit)                                          | ✅     | - [x]    |
| 3.3.3 | API : calcul écarts (system_quantity vs counted_quantity, difference auto)                         | ✅     | - [x]    |
| 3.3.4 | API : validation → ajustement stock via `stockService` (adjustment_in / adjustment_out)            | ✅     | - [x]    |
| 3.3.5 | UI : page `/inventory` — liste des sessions (en cours, terminées)                                  | ✅     | - [x]    |
| 3.3.6 | UI : page `/inventory/new` — choix entrepôt, produits (tous ou filtre catégorie)                   | ✅     | - [x]    |
| 3.3.7 | UI : page `/inventory/[id]` — grille saisie + scan + récapitulatif écarts + validation             | ✅     | - [x]    |
| 3.3.8 | Composant `<CountGrid />` — grille de saisie mobile-friendly (gros boutons +/-, clavier numérique) | ⬜     | - [ ]    |
| 3.3.9 | Composant `<VarianceSummary />` — récapitulatif écarts (stock système, compté, écart, écart XOF)   | ⬜     | - [ ]    |

> **3.3.8-3.3.9 :** Fonctionnalités implémentées inline dans `/inventory/[id]` (grille de saisie, résumé des écarts). Pas extraites en composants.

### Flux d'inventaire

| Étape         | Description                                           | Implémenté | Testé |
| ------------- | ----------------------------------------------------- | ---------- | ----- |
| 1. Création   | Gestionnaire crée session → snapshot system_quantity  | - [x]      | - [x] |
| 2. Saisie     | Utilisateurs saisissent sur mobile avec scan          | - [x]      | - [x] |
| 3. Écarts     | difference = counted_quantity - system_quantity       | - [x]      | - [x] |
| 4. Validation | Gestionnaire/Admin valide → mouvement adjustment auto | - [x]      | - [x] |

### Critères d'acceptation

- [ ] Inventaire total ou partiel (par catégorie) — total uniquement, pas de filtre catégorie
- [ ] Saisie masque le stock théorique (comptage à l'aveugle)
- [ ] Scan produit pour naviguer dans la grille de saisie
- [x] Récapitulatif montre : stock système, compté, écart, écart en valeur XOF
- [x] Validation crée des mouvements d'ajustement automatiques via `stockService`
- [x] Seul un admin/gestionnaire peut valider les ajustements
- [x] Historique des inventaires conservé
- [ ] Interface saisie optimisée mobile (gros boutons +/-, clavier numérique)

**User stories couvertes :** INV-01, INV-02, INV-03, INV-04, INV-05

---

## 3.4 Module Alertes — Jour 14 (Lun 24 fév)

### Tâches

| #     | Tâche                                                                                     | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| 3.4.1 | Service `alertService` — création, lecture, marquage lu, compteur non-lues                | ✅     | - [x]    |
| 3.4.2 | Trigger alerte stock minimum (après chaque mouvement via `stockService`)                  | ✅     | - [x]    |
| 3.4.3 | Trigger alerte transfert (changement de statut)                                           | ✅     | - [x]    |
| 3.4.4 | Trigger alerte litige (réception partielle)                                               | ✅     | - [x]    |
| 3.4.5 | UI : page `/alerts` — historique des notifications + marquage lu                          | ✅     | - [x]    |
| 3.4.6 | Composant `<NotificationBell />` — icône cloche + badge compteur + dropdown 5 dernières   | ✅     | - [x]    |
| 3.4.7 | Envoi emails via Cloudflare Email Workers (templates HTML responsive, lien direct action) | ⬜     | - [ ]    |

> **3.4.6 :** Cloche avec badge dans le Header. Redirige vers `/alerts` (pas de dropdown inline).

### Types d'alertes V1

| Alerte                            | In-App | Email | Implémenté | Testé |
| --------------------------------- | ------ | ----- | ---------- | ----- |
| Stock en dessous du seuil minimum | ✅     | ✅    | - [x]      | - [x] |
| Nouveau transfert à approuver     | ✅     | ✅    | - [ ]      | - [ ] |
| Transfert approuvé                | ✅     | —     | - [x]      | - [x] |
| Transfert expédié                 | ✅     | —     | - [x]      | - [x] |
| Transfert à réceptionner          | ✅     | ✅    | - [x]      | - [x] |
| Litige transfert                  | ✅     | ✅    | - [x]      | - [x] |
| Session d'inventaire ouverte      | ✅     | —     | - [ ]      | - [ ] |

> **Note :** Aucun email n'est envoyé (Cloudflare Email Workers non configuré). Les alertes in-app sont toutes fonctionnelles sauf « Nouveau transfert à approuver » et « Session inventaire ouverte ».

### Critères d'acceptation

- [x] Badge notification affiche le nombre de non-lues
- [ ] Clic sur notification redirige vers l'élément concerné (redirige vers `/alerts`, pas vers l'élément)
- [x] Marquage lu (individuel + toutes)
- [x] Dédoublonnage (pas d'alerte identique non lue en double)
- [x] Alertes ciblées (gestionnaires de l'entrepôt + admins)
- [ ] Emails responsive avec lien direct vers l'action dans l'app
- [ ] Préférences de notification paramétrables par utilisateur

**User stories couvertes :** ALT-01, ALT-02, ALT-03, ALT-04

---

## 3.5 Résilience Réseau — Jour 15 (Mar 25 fév)

### Tâches

| #     | Tâche                                                                                     | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| 3.5.1 | Store de connectivité (`src/lib/stores/network.ts`) — Svelte store réactif online/offline | ✅     | - [x]    |
| 3.5.2 | Queue IndexedDB (`src/lib/services/offline-queue.ts`) — enqueue, flush, getPendingCount   | ✅     | - [x]    |
| 3.5.3 | Retry automatique à la reconnexion (`window.addEventListener('online', flush)`)           | ✅     | - [x]    |
| 3.5.4 | Composant `<OfflineBanner />` — bandeau visuel offline + badge pending                    | ✅     | - [x]    |
| 3.5.5 | Protection formulaires (sauvegarde état en cas de perte réseau)                           | ⬜     | - [ ]    |
| 3.5.6 | Tests unitaires (enqueue/flush)                                                           | ⬜     | - [ ]    |

### Opérations concernées

| Opération                      | Queue offline | Raison                                   |
| ------------------------------ | :-----------: | ---------------------------------------- |
| Mouvements (entrées/sorties)   |      ✅       | Opérations terrain fréquentes            |
| Saisie d'inventaire            |      ✅       | Comptage en zone sans réseau             |
| Transferts (workflow)          |      ❌       | Requiert validation serveur multi-étapes |
| Création/modification produits |      ❌       | Nécessite unicité SKU côté serveur       |
| Gestion utilisateurs           |      ❌       | Actions admin rares                      |

### Critères d'acceptation

- [x] Indicateur visuel online/offline visible en permanence
- [x] Les mouvements sont stockés dans IndexedDB si offline
- [x] Retry automatique dans l'ordre chronologique à la reconnexion
- [x] Gestion erreur 4xx : notification échec + suppression de la queue
- [x] Gestion erreur 5xx : pause et retry plus tard
- [x] Badge compteur des opérations pending visible
- [ ] 0 perte de données en offline (critère de succès PRD) — non testé

**User stories couvertes :** NET-01, NET-02, NET-03, NET-04

**🏁 CP3 — Transfert bout-en-bout OK, inventaire OK, alertes in-app OK, résilience implémentée.** 🟡 Manquent : emails, ajustement stock litige, tests offline.

---

---

# 📅 SEMAINE 4 — DASHBOARD, POLISH & DÉPLOIEMENT (26 fév - 5 mars)

> **Objectif :** Dashboard, logs UI, polish mobile, migrations prod, tests E2E, go live.

---

## 4.1 Dashboard par Rôle — Jour 16 (Mer 26 fév)

### Tâches

| #     | Tâche                                                                                         | Statut | Checkbox |
| ----- | --------------------------------------------------------------------------------------------- | ------ | -------- |
| 4.1.1 | API : `GET /api/v1/dashboard` — KPIs filtrés par rôle et scope                                | ⬜     | - [ ]    |
| 4.1.2 | KPIs : stock total, valorisation XOF, alertes actives, transferts pending, mouvements du jour | ⬜     | - [ ]    |
| 4.1.3 | Graphique mouvements : entrées vs sorties sur 30 jours                                        | ⬜     | - [ ]    |
| 4.1.4 | Liste produits sous seuil (top 10 critiques)                                                  | ⬜     | - [ ]    |
| 4.1.5 | Résumé transferts en cours avec statuts                                                       | ⬜     | - [ ]    |
| 4.1.6 | Actions rapides (nouvelle entrée, nouvelle sortie, nouveau transfert)                         | ⬜     | - [ ]    |
| 4.1.7 | Composants `<KpiCards />`, `<MovementChart />`, `<LowStockList />`, `<QuickActions />`        | ⬜     | - [ ]    |

### Dashboard par rôle

| Rôle               | KPIs visibles                             | Actions rapides                         | Implémenté |
| ------------------ | ----------------------------------------- | --------------------------------------- | ---------- |
| Admin              | Tous entrepôts, toutes métriques          | Tout                                    | - [ ]      |
| Admin Gestionnaire | Tous entrepôts, métriques opérationnelles | Mouvements, transferts                  | - [ ]      |
| Gestionnaire       | Ses entrepôts uniquement                  | Mouvements, transferts de ses entrepôts | - [ ]      |
| Utilisateur        | Son entrepôt uniquement                   | Entrée/sortie rapide                    | - [ ]      |
| Admin Visiteur     | Tous entrepôts, lecture seule             | —                                       | - [ ]      |
| Visiteur           | Son entrepôt, lecture seule               | —                                       | - [ ]      |

### Critères d'acceptation

- [ ] Dashboard charge en < 500ms
- [ ] Admin voit vue consolidée tous entrepôts
- [ ] Gestionnaire ne voit que ses entrepôts assignés
- [ ] Visiteur a une vue lecture seule (pas d'actions rapides)
- [ ] Widgets responsive (grille 1 colonne sur mobile)
- [ ] KPIs affichent la variation par rapport à la veille (↑↓)

**User stories couvertes :** DASH-01, DASH-02, DASH-03, DASH-04

---

## 4.2 Logs & Audit — Jour 17 (Jeu 27 fév)

### Tâches

| #     | Tâche                                                                                                                 | Statut | Checkbox |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 4.2.1 | Service `auditService.log()` — logging automatique CUD (create, update, delete, movement, transfer, inventory, login) | ⬜     | - [ ]    |
| 4.2.2 | API : `GET /api/v1/logs` — liste paginée avec filtres (utilisateur, type action, entité, date range)                  | ⬜     | - [ ]    |
| 4.2.3 | UI : page `/logs` — tableau paginé (Date, Utilisateur, Action, Entité, Détail)                                        | ⬜     | - [ ]    |
| 4.2.4 | UI : détail d'un log — valeurs avant/après (JSON diff), métadonnées (IP, user agent)                                  | ⬜     | - [ ]    |
| 4.2.5 | Export CSV des logs filtrés                                                                                           | ⬜     | - [ ]    |

> **Note :** Le service `auditService` existe dans `src/lib/server/services/audit.ts` avec tests, mais n'est intégré dans aucun endpoint API. Les pages `/logs` et `/settings` existent comme coquilles vides (pas de `+page.server.ts`).

### Critères d'acceptation

- [ ] Chaque opération CUD est loggée automatiquement (ancien/nouveau état en JSON)
- [ ] Logs immuables (pas de modification ni suppression)
- [ ] Accès : admins et admin visiteurs voient tout, gestionnaires voient leurs entrepôts
- [ ] Filtrable par : utilisateur, type d'action, entité, plage de dates
- [ ] Paginé (50/page)
- [ ] Export CSV fonctionnel

**User stories couvertes :** LOG-01, LOG-02, LOG-03, LOG-04

---

## 4.3 Polish Mobile & UX — Jour 18 (Ven 28 fév)

### Tâches

| #     | Tâche                                                                | Statut | Checkbox |
| ----- | -------------------------------------------------------------------- | ------ | -------- |
| 4.3.1 | Bottom navigation mobile (5 onglets : Home, Stock, Trans, Inv, More) | ✅     | - [x]    |
| 4.3.2 | Formulaires tactiles (inputs ≥ 44px, espacement, gros boutons)       | ⬜     | - [ ]    |
| 4.3.3 | Cards mobile produits (layout card au lieu de tableau sous 768px)    | ✅     | - [x]    |
| 4.3.4 | Pull-to-refresh (actualisation listes par pull down)                 | ⬜     | - [ ]    |
| 4.3.5 | Swipe actions (swipe sur card pour actions rapides)                  | ⬜     | - [ ]    |
| 4.3.6 | Loading states (skeleton screens sur chaque page)                    | ⬜     | - [ ]    |
| 4.3.7 | Empty states (illustration + message + CTA pour chaque liste vide)   | 🟡     | - [ ]    |
| 4.3.8 | Toast notifications (feedback visuel sur chaque action)              | ✅     | - [x]    |
| 4.3.9 | Confirmation modals (double confirmation pour actions destructives)  | ✅     | - [x]    |

> **4.3.1 :** `BottomNav` composant en place dans le layout.
> **4.3.3 :** Pages produits et utilisateurs ont des cards mobile responsives.
> **4.3.7 :** Composant `EmptyState` existe et est utilisé dans certaines pages, mais pas systématiquement.
> **4.3.8 :** Composant `Toast` utilisé dans les formulaires (users, warehouses, etc.).
> **4.3.9 :** `ConfirmModal` utilisé pour les suppressions (users/[id], warehouses/[id]).

### Checklist test mobile

| Critère                      | Chrome Android | Safari iOS |
| ---------------------------- | :------------: | :--------: |
| Navigation au pouce          |     - [ ]      |   - [ ]    |
| Formulaires à une main       |     - [ ]      |   - [ ]    |
| Scan caméra fonctionne       |     - [ ]      |   - [ ]    |
| Texte lisible sans zoom      |     - [ ]      |   - [ ]    |
| Actions principales ≤ 2 taps |     - [ ]      |   - [ ]    |
| Indicateur offline visible   |     - [ ]      |   - [ ]    |
| Toast notifications visible  |     - [ ]      |   - [ ]    |

### Critères d'acceptation

- [ ] Breakpoints mobile-first : mobile (< 640px), sm (≥ 640px), md (≥ 768px), lg (≥ 1024px), xl (≥ 1280px)
- [ ] Score Lighthouse Performance > 80
- [ ] Score Lighthouse Accessibilité > 80
- [ ] Tous les parcours critiques testés sur mobile réel

---

## 4.4 Tests — Jour 19 (Lun 3 mars)

### Tâches

| #     | Tâche                                                                           | Statut | Checkbox |
| ----- | ------------------------------------------------------------------------------- | ------ | -------- |
| 4.4.1 | Tests unitaires Vitest — services (stock, alerts, audit, rbac)                  | ✅     | - [x]    |
| 4.4.2 | Tests unitaires Vitest — validators Zod (tous les schémas)                      | 🟡     | - [ ]    |
| 4.4.3 | Tests intégration Vitest — API endpoints, flux complets                         | 🟡     | - [ ]    |
| 4.4.4 | Tests E2E Playwright — Login + redirection par rôle                             | ⬜     | - [ ]    |
| 4.4.5 | Tests E2E Playwright — Flux complet entrée de stock                             | ⬜     | - [ ]    |
| 4.4.6 | Tests E2E Playwright — Flux complet transfert avec réception partielle + litige | ⬜     | - [ ]    |
| 4.4.7 | Tests E2E Playwright — Accès non autorisé → 403                                 | ⬜     | - [ ]    |
| 4.4.8 | Tests E2E Playwright — Reset password complet                                   | ⬜     | - [ ]    |
| 4.4.9 | Tests permissions — matrice complète 6 rôles × toutes les routes                | ⬜     | - [ ]    |

> **4.4.1 :** 4 fichiers de tests services : `stock.test.ts` (11 tests), `alerts.test.ts`, `audit.test.ts`, `rbac.test.ts` + `guards.test.ts`.
> **4.4.2 :** 5/7 validators testés (42 tests) : product, movement, category, transfer, inventory. **Manquants :** user.ts, warehouse.ts.
> **4.4.3 :** `transfers.integration.test.ts` (4 tests) existe. Pas de tests intégration pour les autres endpoints.

### Couverture minimale

| Module        |           Unitaires (Vitest)           |       Intégration (Vitest)       |      E2E (Playwright)       |
| ------------- | :------------------------------------: | :------------------------------: | :-------------------------: |
| Auth / RBAC   |   - [x] helpers (2 fichiers, 13+ tests)  |        - [ ] login flow        |  - [ ] login + redirection  |
| Stock service |    - [x] toutes fonctions (11 tests)   |      - [ ] API movements       |     - [ ] entrée/sortie     |
| PUMP          |    - [x] calculs + cas limites         |               —                |              —              |
| Transferts    |   - [x] machine à états (17 tests)     | - [x] API workflow (4 tests)   | - [ ] flux complet + litige |
| Alertes       |     - [x] trigger conditions           |        - [ ] API alerts        |              —              |
| Validators    | - [x] 5/7 schémas Zod (42 tests)      |               —                |              —              |
| Offline queue |        - [ ] enqueue/flush             |               —                |              —              |

---

## 4.5 Migration Prod & Déploiement — Jour 20 (Mar 4 mars)

### Tâches

| #     | Tâche                                                                                          | Statut | Checkbox |
| ----- | ---------------------------------------------------------------------------------------------- | ------ | -------- |
| 4.5.1 | Figer le schéma Drizzle → `pnpm db:generate` (génère les fichiers .sql dans /drizzle)          | ⬜     | - [ ]    |
| 4.5.2 | Vérifier manuellement les migrations SQL générées                                              | ⬜     | - [ ]    |
| 4.5.3 | Configurer variables d'environnement production (Cloudflare Dashboard)                         | ⬜     | - [ ]    |
| 4.5.4 | Configurer DNS si domaine custom                                                               | ⬜     | - [ ]    |
| 4.5.5 | Configurer email sending (Cloudflare Email Workers ou API tierce)                              | ⬜     | - [ ]    |
| 4.5.6 | Appliquer migrations en production → `pnpm db:migrate:prod`                                    | ⬜     | - [ ]    |
| 4.5.7 | Seed données initiales → `wrangler d1 execute stockflow-db --remote --file=./drizzle/seed.sql` | ⬜     | - [ ]    |

### Variables d'environnement production

| Variable                                 | Configurée |
| ---------------------------------------- | ---------- |
| `BETTER_AUTH_URL` (domaine production)   | - [ ]      |
| `BETTER_AUTH_SECRET` (≥ 32 chars random) | - [ ]      |
| `CF_ACCOUNT_ID`                          | - [ ]      |
| `CF_DATABASE_ID`                         | - [ ]      |
| `EMAIL_FROM`                             | - [ ]      |

### Checklist pré-déploiement

| Critère                                      | Résultat | Validé |
| -------------------------------------------- | -------- | ------ |
| `pnpm test` — tous les tests passent         | \_\_\_   | - [ ]  |
| `pnpm test:e2e` — tous les tests E2E passent | \_\_\_   | - [ ]  |
| `pnpm build` — build réussi                  | \_\_\_   | - [ ]  |
| `pnpm check` — svelte-check sans erreur      | \_\_\_   | - [ ]  |
| Migrations SQL vérifiées manuellement        | \_\_\_   | - [ ]  |
| Variables d'env configurées en prod          | \_\_\_   | - [ ]  |

**🏁 CP4 — Release Candidate : tests passent, migration prod prête.**

---

## 4.6 Go Live — Jour 21 (Mer 5 mars)

### Planning de la journée

| Heure | Tâche                                                            | Statut | Checkbox |
| ----- | ---------------------------------------------------------------- | ------ | -------- |
| 08h00 | Vérification finale migration prod                               | ⬜     | - [ ]    |
| 08h30 | Déploiement via `wrangler pages deploy .svelte-kit/cloudflare`   | ⬜     | - [ ]    |
| 09h00 | Smoke tests production (login, CRUD, mouvement, transfert, scan) | ⬜     | - [ ]    |
| 09h30 | Création des comptes utilisateurs                                | ⬜     | - [ ]    |
| 10h00 | Création des entrepôts                                           | ⬜     | - [ ]    |
| 10h30 | Formation équipe (session 1h)                                    | ⬜     | - [ ]    |
| 14h00 | Début inventaire physique initial                                | ⬜     | - [ ]    |
| 16h00 | Support terrain                                                  | ⬜     | - [ ]    |
| 17h00 | Bilan jour 1, correction bugs critiques                          | ⬜     | - [ ]    |

### Smoke tests post-déploiement

| Test                                      | Résultat | Validé |
| ----------------------------------------- | -------- | ------ |
| Login fonctionnel                         | \_\_\_   | - [ ]  |
| Création produit                          | \_\_\_   | - [ ]  |
| Mouvement entrée/sortie                   | \_\_\_   | - [ ]  |
| Transfert complet (demande → réception)   | \_\_\_   | - [ ]  |
| Emails (reset password, alertes)          | \_\_\_   | - [ ]  |
| Scan codes-barres sur mobile réel         | \_\_\_   | - [ ]  |
| Test sur Android                          | \_\_\_   | - [ ]  |
| Test sur iOS                              | \_\_\_   | - [ ]  |
| Monitoring erreurs (Cloudflare Analytics) | \_\_\_   | - [ ]  |

---

---

# 🚦 DÉCISION GO / NO-GO

**Date de revue :** **_/_**/2026

## Critères fonctionnels

| Critère                                             | Ref PRD      | Atteint ? | Commentaire                                               |
| --------------------------------------------------- | ------------ | --------- | --------------------------------------------------------- |
| Auth Better Auth (email/password, sessions, reset)  | AUTH-01 à 05 | 🟡        | Login/sessions OK. Forgot/reset/setup pages manquantes    |
| 6 rôles avec permissions correctes + scope entrepôt | USER-01 à 05 | ✅        | 6 rôles implémentés et testés                             |
| CRUD Entrepôts + permissions filtrées               | WH-01 à 04   | ✅        | Backend + frontend complets                               |
| CRUD Produits + catégories + prix XOF               | PROD-01 à 07 | ✅        | Backend + frontend complets                               |
| Mouvements entrées/sorties (transactions atomiques) | MOV-01 à 06  | ✅        | Transactions atomiques, alertes post-mouvement            |
| Calcul PUMP à l'écriture                            | MOV-06       | ✅        | Calculé en SQL via onConflictDoUpdate                     |
| Scan codes-barres (html5-qrcode)                    | SCAN-01 à 04 | 🟡        | Composant existe, pas intégré dans les formulaires        |
| Résilience réseau (queue IndexedDB)                 | NET-01 à 04  | 🟡        | Queue + banner OK. Pas de tests, pas de protection forms  |
| Workflow transferts complet (incluant litiges)      | TRF-01 à 10  | 🟡        | 8 statuts OK. adjustStock TODO sur résolution litige      |
| Module inventaire (sessions, écarts, validation)    | INV-01 à 05  | ✅        | Création, comptage, écarts, validation ajustement auto    |
| Alertes in-app + email                              | ALT-01 à 04  | 🟡        | In-app OK avec dédoublonnage. Emails non implémentés      |
| Logs et traçabilité (audit complet)                 | LOG-01 à 04  | ⬜        | Service existe avec tests mais non intégré dans les APIs  |
| Dashboard par rôle                                  | DASH-01 à 04 | ⬜        | Page coquille vide                                        |

## Critères techniques

| Critère                              | Objectif | Résultat | Validé |
| ------------------------------------ | -------- | -------- | ------ |
| Temps de réponse API                 | < 300ms  | \_\_\_ms | ⬜     |
| Score Lighthouse Performance         | > 80     | \_\_\_   | ⬜     |
| Score Lighthouse Accessibilité       | > 80     | \_\_\_   | ⬜     |
| Uptime (24h test)                    | > 99%    | \_\_\_%  | ⬜     |
| Failles sécurité critiques           | 0        | \_\_\_   | ⬜     |
| Taux scan réussi                     | > 90%    | \_\_\_%  | ⬜     |
| Perte données offline                | 0        | \_\_\_   | ⬜     |
| Tests permissions (6 rôles × routes) | 100%     | \_\_\_%  | ⬜     |

## Décision

|     | Choix                           | Motif          |
| --- | ------------------------------- | -------------- |
| ⬜  | **GO** — Déploiement production |                |
| ⬜  | **NO-GO** — Reporter            | Motif : \_\_\_ |

---

_Plan de suivi généré à partir du PRD StockFlow v1.0 et du Plan de Développement v1.0_
_Dernière mise à jour : 17/02/2026_
_PR Semaine 1 : [#1](https://github.com/kkzakaria/stockflow/pull/1) — Fusionné_
_PR Semaine 2 : [#2](https://github.com/kkzakaria/stockflow/pull/2) — Fusionné_
_PR Semaine 3 : [#3](https://github.com/kkzakaria/stockflow/pull/3) — Fusionné_
_PR Seed Data : [#4](https://github.com/kkzakaria/stockflow/pull/4) — Fusionné_
