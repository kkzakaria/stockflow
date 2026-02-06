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
| S1 (5-11 fév)        | Fondations                          | 30/30       | 🟡     |
| S2 (12-18 fév)       | Core Métier                         | \_\_\_/32   | ⬜     |
| S3 (19-25 fév)       | Transferts, Inventaire & Résilience | \_\_\_/36   | ⬜     |
| S4 (26 fév - 5 mars) | Dashboard, Polish & Déploiement     | \_\_\_/38   | ⬜     |
| **Total V1**         |                                     | **30/136**  | 🔵     |

## Points de contrôle (Checkpoints)

| Date       | Checkpoint                  | Critère de validation                                           | Atteint ? |
| ---------- | --------------------------- | --------------------------------------------------------------- | --------- |
| Ven 7 fév  | **CP0** — Setup validé      | Projet tourne en local, auth fonctionne, `db:push` OK           | 🟡        |
| Ven 11 fév | **CP1** — Fondations        | CRUD users/entrepôts fonctionnels, layout responsive            | 🟡        |
| Ven 18 fév | **CP2** — Core métier       | Mouvements entrées/sorties OK, scan fonctionnel, PUMP calculé   | ⬜        |
| Ven 25 fév | **CP3** — Workflows         | Transfert complet bout-en-bout, inventaire, alertes, résilience | ⬜        |
| Mer 4 mars | **CP4** — Release Candidate | Tests passent, migration prod prête                             | ⬜        |
| Jeu 5 mars | **CP5** — Go Live           | Déploiement production                                          | ⬜        |

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
| 1.3.6 | Créer les composants UI de base (Button, Input, Modal, Toast, Badge, Card, DataTable, Pagination, Skeleton, EmptyState, ConfirmModal)  | ⬜     | - [ ]    |

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
- [ ] Composants UI utilisent Tailwind, mobile-first

**🏁 CP0 — L'app tourne, l'auth fonctionne, le layout est en place.**

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
| 1.4.7 | UI : page `/users` — liste avec filtres et recherche                            | ⬜     | - [ ]    |
| 1.4.8 | UI : page `/users/new` — formulaire création + invitation email                 | ⬜     | - [ ]    |
| 1.4.9 | UI : page `/users/[id]` — fiche détail + édition inline                         | ⬜     | - [ ]    |

### Critères d'acceptation

- [x] Seul un admin peut accéder à la gestion des utilisateurs
- [x] Création déclenche un email d'invitation (Better Auth)
- [x] Email unique validé côté serveur (Zod)
- [x] Attribution de l'un des 6 rôles via liste déroulante
- [x] Assignation multi-entrepôts via multi-sélection
- [x] Désactivation empêche la connexion (is_active = 0)
- [x] Liste paginée et filtrable (rôle, statut, entrepôt)
- [ ] Responsive : tableau desktop → cards mobile

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
| 1.5.6 | UI : page `/warehouses` — liste cards (nom, adresse, nb produits, valeur)         | ⬜     | - [ ]    |
| 1.5.7 | UI : page `/warehouses/new` — formulaire création                                 | ⬜     | - [ ]    |
| 1.5.8 | UI : page `/warehouses/[id]` — fiche détail + onglets (stock, mouvements, équipe) | ⬜     | - [ ]    |

### Critères d'acceptation

- [x] Seul un admin peut créer/modifier/supprimer un entrepôt
- [x] Un entrepôt a : nom, adresse, contact, statut (is_active)
- [x] La liste est filtrée selon les permissions de l'utilisateur connecté
- [x] Les rôles globaux voient tous les entrepôts ; les autres uniquement les entrepôts assignés
- [x] Un entrepôt avec du stock ne peut pas être supprimé (erreur explicite)
- [ ] Le détail affiche le résumé du stock par produit
- [ ] Cards responsive (empilées en mobile)

**User stories couvertes :** WH-01, WH-02, WH-03, WH-04

**🏁 CP1 — CRUD users/entrepôts fonctionnels, layout responsive OK.**

---

---

# 📅 SEMAINE 2 — MODULES MÉTIER CORE (12-18 février)

> **Objectif :** Produits, mouvements avec transactions atomiques, calcul PUMP, scan codes-barres.

---

## 2.1 CRUD Produits (Backend) — Jour 6 (Mer 12 fév)

### Tâches

| #     | Tâche                                                                               | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------- | ------ | -------- |
| 2.1.1 | API : endpoints CRUD produits (`/api/v1/products`)                                  | ⬜     | - [ ]    |
| 2.1.2 | API : endpoints CRUD catégories (arbre hiérarchique parent_id)                      | ⬜     | - [ ]    |
| 2.1.3 | Schémas validation Zod (createProductSchema, updateProductWarehouseSchema)          | ⬜     | - [ ]    |
| 2.1.4 | API : recherche/filtre produits (SKU, nom, catégorie, entrepôt)                     | ⬜     | - [ ]    |
| 2.1.5 | API : configuration stock minimum par produit/entrepôt (product_warehouse.minStock) | ⬜     | - [ ]    |

### Critères d'acceptation

- [ ] Un produit a : SKU (unique), nom, description, catégorie, unité, prix achat, prix vente (XOF), min_stock
- [ ] Les prix sont en nombres XOF (pas de centimes fractionnaires)
- [ ] Validation Zod côté serveur (SKU unique, prix ≥ 0, champs requis)
- [ ] Catégories supportent 1 niveau de hiérarchie (parent_id)
- [ ] Stock minimum configurable globalement (products.min_stock) et par entrepôt (product_warehouse.minStock)

**User stories couvertes :** PROD-01, PROD-02, PROD-03, PROD-04, PROD-07

---

## 2.2 CRUD Produits (Frontend) — Jour 7 (Jeu 13 fév)

### Tâches

| #     | Tâche                                                                                     | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| 2.2.1 | UI : page `/products` — liste tableau/cards avec recherche, filtres catégorie/entrepôt    | ⬜     | - [ ]    |
| 2.2.2 | UI : page `/products/new` — formulaire création (SKU, nom, prix, catégorie, seuils)       | ⬜     | - [ ]    |
| 2.2.3 | UI : page `/products/[id]` — fiche détail avec onglets (Infos, Stock, Mouvements, Config) | ⬜     | - [ ]    |
| 2.2.4 | UI : page `/products/[id]/edit` — formulaire modification                                 | ⬜     | - [ ]    |
| 2.2.5 | Composant `<ProductCard />` — card produit (SKU, nom, stock total, alerte)                | ⬜     | - [ ]    |
| 2.2.6 | Composant `<StockByWarehouse />` — tableau stock par entrepôt avec indicateurs            | ⬜     | - [ ]    |
| 2.2.7 | Composant `<ProductSearch />` — barre de recherche avec autocomplete                      | ⬜     | - [ ]    |
| 2.2.8 | Composant `<CategoryTree />` — sélecteur de catégorie hiérarchique                        | ⬜     | - [ ]    |

### Critères d'acceptation

- [ ] Recherche fonctionne sur SKU, nom, catégorie
- [ ] Détail produit montre stock par entrepôt + total + PUMP + valorisation (XOF)
- [ ] Prix affichés en XOF avec séparateur de milliers (via `formatXOF()`)
- [ ] Liste paginée (20 produits/page), triable
- [ ] Responsive : tableau desktop → cards mobile
- [ ] Onglet Config permet de paramétrer le seuil par entrepôt

**User stories couvertes :** PROD-05, PROD-06

---

## 2.3 Service Stock + PUMP — Jour 8 (Ven 14 fév)

> **Le cœur du système — `src/lib/server/services/stock.ts`**

### Tâches

| #     | Tâche                                                                      | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------- | ------ | -------- |
| 2.3.1 | Implémenter `stockService.recordMovement()` — transaction atomique Drizzle | ⬜     | - [ ]    |
| 2.3.2 | Implémenter le calcul PUMP SQL dans `onConflictDoUpdate`                   | ⬜     | - [ ]    |
| 2.3.3 | Implémenter `stockService.getStockByWarehouse()`                           | ⬜     | - [ ]    |
| 2.3.4 | Implémenter `stockService.getStockConsolidated()`                          | ⬜     | - [ ]    |
| 2.3.5 | Implémenter `stockService.getValuation()` (qté × PUMP)                     | ⬜     | - [ ]    |
| 2.3.6 | Implémenter `stockService.checkAndAlertMinStock()`                         | ⬜     | - [ ]    |
| 2.3.7 | Tests unitaires du service stock (9 cas minimum)                           | ⬜     | - [ ]    |

### Règles PUMP à implémenter

| Événement                | Impact PUMP                       | Implémenté | Testé |
| ------------------------ | --------------------------------- | ---------- | ----- |
| Entrée (achat/réception) | Recalculé via formule             | - [ ]      | - [ ] |
| Sortie (vente/perte)     | Inchangé                          | - [ ]      | - [ ] |
| Transfert expédition     | Inchangé (PUMP suit le produit)   | - [ ]      | - [ ] |
| Transfert réception      | Recalculé (destination)           | - [ ]      | - [ ] |
| Ajustement (+)           | Recalculé avec prix achat courant | - [ ]      | - [ ] |
| Ajustement (-)           | Inchangé                          | - [ ]      | - [ ] |
| Stock à 0 puis entrée    | PUMP = prix d'achat               | - [ ]      | - [ ] |

### Tests unitaires requis

| Test                                                   | Statut |
| ------------------------------------------------------ | ------ |
| Entrée stock : quantité incrémentée                    | - [ ]  |
| Entrée stock : PUMP recalculé correctement             | - [ ]  |
| Sortie stock : quantité décrémentée                    | - [ ]  |
| Sortie stock : PUMP inchangé                           | - [ ]  |
| Sortie stock insuffisant : erreur `INSUFFICIENT_STOCK` | - [ ]  |
| Stock à 0 puis entrée : PUMP = prix achat              | - [ ]  |
| Alerte stock minimum déclenchée                        | - [ ]  |
| Transaction atomique : rollback si erreur              | - [ ]  |
| Concurrence : deux mouvements simultanés               | - [ ]  |

### Critères d'acceptation

- [ ] Formule PUMP : `((Stock_actuel × PUMP_actuel) + (Qté_reçue × Prix_achat)) / (Stock_actuel + Qté_reçue)`
- [ ] Calcul PUMP fait en SQL dans la DB (pas côté JS) pour la fiabilité
- [ ] `onConflictDoUpdate` pour upsert atomique sur product_warehouse
- [ ] Vérification stock suffisant DANS la transaction (pas de race condition)
- [ ] Rollback complet si erreur partielle
- [ ] Alerte auto si stock passe sous le seuil minimum après mouvement
- [ ] 9 tests unitaires passent

**User stories couvertes :** MOV-06

---

## 2.4 Module Mouvements — Jour 9 (Lun 17 fév)

### Tâches

| #     | Tâche                                                                                                                              | Statut | Checkbox |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 2.4.1 | API : `POST /api/v1/movements` — création mouvement (utilise `stockService`)                                                       | ⬜     | - [ ]    |
| 2.4.2 | API : `GET /api/v1/movements` — historique avec filtres (date, produit, entrepôt, type, utilisateur)                               | ⬜     | - [ ]    |
| 2.4.3 | Audit log automatique pour chaque mouvement                                                                                        | ⬜     | - [ ]    |
| 2.4.4 | Post-mouvement : vérification seuil minimum → alerte si nécessaire                                                                 | ⬜     | - [ ]    |
| 2.4.5 | UI : page `/movements` — historique global avec filtres                                                                            | ⬜     | - [ ]    |
| 2.4.6 | UI : page `/movements/new` — formulaire rapide (entrepôt → scan/recherche → type → qté → motif → prix achat si entrée → référence) | ⬜     | - [ ]    |
| 2.4.7 | Composant `<MovementForm />` — optimisé mobile (gros boutons, champs larges)                                                       | ⬜     | - [ ]    |
| 2.4.8 | Composant `<MovementTimeline />` — historique visuel d'un produit                                                                  | ⬜     | - [ ]    |
| 2.4.9 | Composant `<ReasonSelect />` — sélecteur de motif (prédéfinis + libre)                                                             | ⬜     | - [ ]    |

### Critères d'acceptation

- [ ] Types de mouvements : `in`, `out`, `adjustment_in`, `adjustment_out`
- [ ] Motif obligatoire (achat, vente, perte, ajustement, retour, autre)
- [ ] Référence optionnelle (n° bon de livraison)
- [ ] Prix d'achat requis pour les entrées (calcul PUMP)
- [ ] Confirmation avant validation (récapitulatif)
- [ ] Entrepôt pré-filtré selon le rôle de l'utilisateur
- [ ] Historique filtrable et paginé
- [ ] Interface mobile permet saisie rapide

**User stories couvertes :** MOV-01, MOV-02, MOV-03, MOV-04, MOV-05

---

## 2.5 Scan Codes-barres — Jour 10 (Mar 18 fév)

### Tâches

| #     | Tâche                                                                                  | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------------------- | ------ | -------- |
| 2.5.1 | Composant `<BarcodeScanner />` — wrapper html5-qrcode avec UI                          | ⬜     | - [ ]    |
| 2.5.2 | Intégration dans le formulaire mouvements (scan → recherche produit → pré-remplissage) | ⬜     | - [ ]    |
| 2.5.3 | Gestion permissions caméra (demande explicite + fallback gracieux)                     | ⬜     | - [ ]    |
| 2.5.4 | Mode scan continu (option pour scanner plusieurs produits)                             | ⬜     | - [ ]    |
| 2.5.5 | Fallback saisie manuelle SKU                                                           | ⬜     | - [ ]    |

### Critères d'acceptation

- [ ] Ouverture caméra arrière (`facingMode: 'environment'`)
- [ ] Scan reconnaît les codes-barres/QR et affiche la fiche produit
- [ ] Scan → formulaire mouvement pré-rempli avec le produit
- [ ] Si scan échoue → champ de saisie manuelle SKU disponible
- [ ] Mode scan continu pour inventaire (scan plusieurs produits à la suite)
- [ ] Fonctionne sur Chrome Android et Safari iOS
- [ ] Taux de scan réussi > 90% (critère de succès PRD)

**User stories couvertes :** SCAN-01, SCAN-02, SCAN-03, SCAN-04

**🏁 CP2 — Mouvements entrées/sorties fonctionnels, scan OK, PUMP calculé.**

---

---

# 📅 SEMAINE 3 — TRANSFERTS, INVENTAIRE & RÉSILIENCE (19-25 février)

> **Objectif :** Workflow de transfert complet (incluant litiges), module inventaire, alertes, résilience réseau.

---

## 3.1 Transferts Backend — Jour 11 (Mer 19 fév)

### Tâches

| #      | Tâche                                                                                                              | Statut | Checkbox |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| 3.1.1  | API : `POST /api/v1/transfers` — création demande (validation stock source suffisant)                              | ⬜     | - [ ]    |
| 3.1.2  | API : `POST /api/v1/transfers/[id]/approve` — approbation (admin/admin_manager)                                    | ⬜     | - [ ]    |
| 3.1.3  | API : `POST /api/v1/transfers/[id]/reject` — rejet avec motif obligatoire                                          | ⬜     | - [ ]    |
| 3.1.4  | API : `POST /api/v1/transfers/[id]/ship` — expédition (décrémente stock source via `stockService`)                 | ⬜     | - [ ]    |
| 3.1.5  | API : `POST /api/v1/transfers/[id]/receive` — réception complète (incrémente stock destination)                    | ⬜     | - [ ]    |
| 3.1.6  | API : `POST /api/v1/transfers/[id]/receive` — réception partielle (qté_reçue < qté_envoyée → `partially_received`) | ⬜     | - [ ]    |
| 3.1.7  | API : notification litige auto → admin gestionnaire si réception partielle                                         | ⬜     | - [ ]    |
| 3.1.8  | API : `POST /api/v1/transfers/[id]/resolve` — résolution litige (ajustement stock + commentaire)                   | ⬜     | - [ ]    |
| 3.1.9  | API : `POST /api/v1/transfers/[id]/cancel` — annulation (avant expédition uniquement)                              | ⬜     | - [ ]    |
| 3.1.10 | Service `transfers.ts` — machine à états complète                                                                  | ⬜     | - [ ]    |

### Machine à états du transfert

| De → Vers                     | Qui peut agir            | Conditions                                         | Implémenté | Testé |
| ----------------------------- | ------------------------ | -------------------------------------------------- | ---------- | ----- |
| pending → approved            | admin, admin_manager     | —                                                  | - [ ]      | - [ ] |
| pending → rejected            | admin, admin_manager     | Motif obligatoire                                  | - [ ]      | - [ ] |
| pending → cancelled           | gestionnaire source      | —                                                  | - [ ]      | - [ ] |
| approved → shipped            | gestionnaire source      | Stock source vérifié                               | - [ ]      | - [ ] |
| approved → cancelled          | admin, admin_manager     | —                                                  | - [ ]      | - [ ] |
| shipped → received            | gestionnaire destination | qté_reçue = qté_envoyée                            | - [ ]      | - [ ] |
| shipped → partially_received  | gestionnaire destination | qté_reçue < qté_envoyée, anomaly_notes obligatoire | - [ ]      | - [ ] |
| partially_received → disputed | auto                     | Notification admin gestionnaire                    | - [ ]      | - [ ] |
| disputed → resolved           | admin, admin_manager     | Ajustement stock + commentaire                     | - [ ]      | - [ ] |

### Critères d'acceptation

- [ ] Statuts implémentés : `pending`, `approved`, `rejected`, `shipped`, `received`, `partially_received`, `cancelled`, `disputed`, `resolved`
- [ ] La demande vérifie que le stock source est suffisant
- [ ] L'expédition débite le stock source (via `stockService`)
- [ ] La réception crédite le stock destination (via `stockService`, PUMP recalculé)
- [ ] Réception partielle → anomaly_notes obligatoire → statut `partially_received` → auto `disputed`
- [ ] Résolution de litige → ajustement stock + clôture
- [ ] Annulation possible uniquement avant expédition
- [ ] Chaque étape horodatée avec l'utilisateur
- [ ] Un transfert ne peut pas être modifié après approbation

**User stories couvertes :** TRF-01 à TRF-10

---

## 3.2 Transferts Frontend — Jour 12 (Jeu 20 fév)

### Tâches

| #     | Tâche                                                                                                              | Statut | Checkbox |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| 3.2.1 | UI : page `/transfers` — liste avec filtres (statut, entrepôt source/destination, date) + vue Kanban optionnelle   | ⬜     | - [ ]    |
| 3.2.2 | UI : page `/transfers/new` — formulaire (source + destination + ajout produits scan/recherche + quantités + notes) | ⬜     | - [ ]    |
| 3.2.3 | UI : page `/transfers/[id]` — détail avec timeline visuelle + items + actions contextuelles                        | ⬜     | - [ ]    |
| 3.2.4 | Composant `<TransferTimeline />` — visualisation des étapes (stepper)                                              | ⬜     | - [ ]    |
| 3.2.5 | Composant `<TransferActions />` — boutons contextuels selon statut et rôle                                         | ⬜     | - [ ]    |
| 3.2.6 | Composant `<TransferItemsTable />` — tableau produits (demandé / envoyé / reçu)                                    | ⬜     | - [ ]    |
| 3.2.7 | Composant `<DisputeBanner />` — bandeau d'alerte si litige en cours                                                | ⬜     | - [ ]    |

### Critères d'acceptation

- [ ] Les boutons d'action n'apparaissent que pour les rôles autorisés à l'étape en cours
- [ ] Timeline visuelle montre l'avancement (stepper coloré)
- [ ] Tableau items montre 3 colonnes : demandé / envoyé / reçu avec mise en évidence des écarts
- [ ] Bandeau litige visible sur les transferts en dispute
- [ ] Zone commentaires/anomalies accessible
- [ ] Liste filtrable par statut, entrepôt, date

---

## 3.3 Module Inventaire — Jour 13 (Ven 21 fév)

### Tâches

| #     | Tâche                                                                                              | Statut | Checkbox |
| ----- | -------------------------------------------------------------------------------------------------- | ------ | -------- |
| 3.3.1 | API : `POST /api/v1/inventory` — création session (entrepôt + produits concernés)                  | ⬜     | - [ ]    |
| 3.3.2 | API : saisie des comptages (counted_quantity par produit)                                          | ⬜     | - [ ]    |
| 3.3.3 | API : calcul écarts (system_quantity vs counted_quantity, difference auto)                         | ⬜     | - [ ]    |
| 3.3.4 | API : validation → ajustement stock via `stockService` (adjustment_in / adjustment_out)            | ⬜     | - [ ]    |
| 3.3.5 | UI : page `/inventory` — liste des sessions (en cours, terminées)                                  | ⬜     | - [ ]    |
| 3.3.6 | UI : page `/inventory/new` — choix entrepôt, produits (tous ou filtre catégorie)                   | ⬜     | - [ ]    |
| 3.3.7 | UI : page `/inventory/[id]` — grille saisie + scan + récapitulatif écarts + validation             | ⬜     | - [ ]    |
| 3.3.8 | Composant `<CountGrid />` — grille de saisie mobile-friendly (gros boutons +/-, clavier numérique) | ⬜     | - [ ]    |
| 3.3.9 | Composant `<VarianceSummary />` — récapitulatif écarts (stock système, compté, écart, écart XOF)   | ⬜     | - [ ]    |

### Flux d'inventaire

| Étape         | Description                                           | Implémenté | Testé |
| ------------- | ----------------------------------------------------- | ---------- | ----- |
| 1. Création   | Gestionnaire crée session → snapshot system_quantity  | - [ ]      | - [ ] |
| 2. Saisie     | Utilisateurs saisissent sur mobile avec scan          | - [ ]      | - [ ] |
| 3. Écarts     | difference = counted_quantity - system_quantity       | - [ ]      | - [ ] |
| 4. Validation | Gestionnaire/Admin valide → mouvement adjustment auto | - [ ]      | - [ ] |

### Critères d'acceptation

- [ ] Inventaire total ou partiel (par catégorie)
- [ ] Saisie masque le stock théorique (comptage à l'aveugle)
- [ ] Scan produit pour naviguer dans la grille de saisie
- [ ] Récapitulatif montre : stock système, compté, écart, écart en valeur XOF
- [ ] Validation crée des mouvements d'ajustement automatiques via `stockService`
- [ ] Seul un admin/gestionnaire peut valider les ajustements
- [ ] Historique des inventaires conservé
- [ ] Interface saisie optimisée mobile (gros boutons +/-, clavier numérique)

**User stories couvertes :** INV-01, INV-02, INV-03, INV-04, INV-05

---

## 3.4 Module Alertes — Jour 14 (Lun 24 fév)

### Tâches

| #     | Tâche                                                                                     | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| 3.4.1 | Service `alertService` — création, lecture, marquage lu, compteur non-lues                | ⬜     | - [ ]    |
| 3.4.2 | Trigger alerte stock minimum (après chaque mouvement via `stockService`)                  | ⬜     | - [ ]    |
| 3.4.3 | Trigger alerte transfert (changement de statut)                                           | ⬜     | - [ ]    |
| 3.4.4 | Trigger alerte litige (réception partielle)                                               | ⬜     | - [ ]    |
| 3.4.5 | UI : page `/alerts` — historique des notifications + marquage lu                          | ⬜     | - [ ]    |
| 3.4.6 | Composant `<NotificationBell />` — icône cloche + badge compteur + dropdown 5 dernières   | ⬜     | - [ ]    |
| 3.4.7 | Envoi emails via Cloudflare Email Workers (templates HTML responsive, lien direct action) | ⬜     | - [ ]    |

### Types d'alertes V1

| Alerte                            | In-App | Email | Implémenté | Testé |
| --------------------------------- | ------ | ----- | ---------- | ----- |
| Stock en dessous du seuil minimum | ✅     | ✅    | - [ ]      | - [ ] |
| Nouveau transfert à approuver     | ✅     | ✅    | - [ ]      | - [ ] |
| Transfert approuvé                | ✅     | —     | - [ ]      | - [ ] |
| Transfert expédié                 | ✅     | —     | - [ ]      | - [ ] |
| Transfert à réceptionner          | ✅     | ✅    | - [ ]      | - [ ] |
| Litige transfert                  | ✅     | ✅    | - [ ]      | - [ ] |
| Session d'inventaire ouverte      | ✅     | —     | - [ ]      | - [ ] |

### Critères d'acceptation

- [ ] Badge notification affiche le nombre de non-lues
- [ ] Clic sur notification redirige vers l'élément concerné
- [ ] Marquage lu (individuel + toutes)
- [ ] Dédoublonnage (pas d'alerte identique non lue en double)
- [ ] Alertes ciblées (gestionnaires de l'entrepôt + admins)
- [ ] Emails responsive avec lien direct vers l'action dans l'app
- [ ] Préférences de notification paramétrables par utilisateur

**User stories couvertes :** ALT-01, ALT-02, ALT-03, ALT-04

---

## 3.5 Résilience Réseau — Jour 15 (Mar 25 fév)

### Tâches

| #     | Tâche                                                                                     | Statut | Checkbox |
| ----- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| 3.5.1 | Store de connectivité (`src/lib/stores/network.ts`) — Svelte store réactif online/offline | ⬜     | - [ ]    |
| 3.5.2 | Queue IndexedDB (`src/lib/services/offline-queue.ts`) — enqueue, flush, getPendingCount   | ⬜     | - [ ]    |
| 3.5.3 | Retry automatique à la reconnexion (`window.addEventListener('online', flush)`)           | ⬜     | - [ ]    |
| 3.5.4 | Composant `<OfflineBanner />` — bandeau visuel offline + badge pending                    | ⬜     | - [ ]    |
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

- [ ] Indicateur visuel online/offline visible en permanence
- [ ] Les mouvements sont stockés dans IndexedDB si offline
- [ ] Retry automatique dans l'ordre chronologique à la reconnexion
- [ ] Gestion erreur 4xx : notification échec + suppression de la queue
- [ ] Gestion erreur 5xx : pause et retry plus tard
- [ ] Badge compteur des opérations pending visible
- [ ] 0 perte de données en offline (critère de succès PRD)

**User stories couvertes :** NET-01, NET-02, NET-03, NET-04

**🏁 CP3 — Transfert bout-en-bout OK, inventaire OK, alertes OK, résilience testée.**

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
| 4.3.1 | Bottom navigation mobile (5 onglets : Home, Stock, Trans, Inv, More) | ⬜     | - [ ]    |
| 4.3.2 | Formulaires tactiles (inputs ≥ 44px, espacement, gros boutons)       | ⬜     | - [ ]    |
| 4.3.3 | Cards mobile produits (layout card au lieu de tableau sous 768px)    | ⬜     | - [ ]    |
| 4.3.4 | Pull-to-refresh (actualisation listes par pull down)                 | ⬜     | - [ ]    |
| 4.3.5 | Swipe actions (swipe sur card pour actions rapides)                  | ⬜     | - [ ]    |
| 4.3.6 | Loading states (skeleton screens sur chaque page)                    | ⬜     | - [ ]    |
| 4.3.7 | Empty states (illustration + message + CTA pour chaque liste vide)   | ⬜     | - [ ]    |
| 4.3.8 | Toast notifications (feedback visuel sur chaque action)              | ⬜     | - [ ]    |
| 4.3.9 | Confirmation modals (double confirmation pour actions destructives)  | ⬜     | - [ ]    |

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
| 4.4.1 | Tests unitaires Vitest — services (stock, alerts, audit, rbac)                  | ⬜     | - [ ]    |
| 4.4.2 | Tests unitaires Vitest — validators Zod (tous les schémas)                      | ⬜     | - [ ]    |
| 4.4.3 | Tests intégration Vitest — API endpoints, flux complets                         | ⬜     | - [ ]    |
| 4.4.4 | Tests E2E Playwright — Login + redirection par rôle                             | ⬜     | - [ ]    |
| 4.4.5 | Tests E2E Playwright — Flux complet entrée de stock                             | ⬜     | - [ ]    |
| 4.4.6 | Tests E2E Playwright — Flux complet transfert avec réception partielle + litige | ⬜     | - [ ]    |
| 4.4.7 | Tests E2E Playwright — Accès non autorisé → 403                                 | ⬜     | - [ ]    |
| 4.4.8 | Tests E2E Playwright — Reset password complet                                   | ⬜     | - [ ]    |
| 4.4.9 | Tests permissions — matrice complète 6 rôles × toutes les routes                | ⬜     | - [ ]    |

### Couverture minimale

| Module        |     Unitaires (Vitest)      | Intégration (Vitest) |      E2E (Playwright)       |
| ------------- | :-------------------------: | :------------------: | :-------------------------: |
| Auth / RBAC   |        - [ ] helpers        |   - [ ] login flow   |  - [ ] login + redirection  |
| Stock service |   - [ ] toutes fonctions    | - [ ] API movements  |     - [ ] entrée/sortie     |
| PUMP          | - [ ] calculs + cas limites |          —           |              —              |
| Transferts    |    - [ ] machine à états    |  - [ ] API workflow  | - [ ] flux complet + litige |
| Alertes       |  - [ ] trigger conditions   |   - [ ] API alerts   |              —              |
| Validators    |   - [ ] tous schémas Zod    |          —           |              —              |
| Offline queue |     - [ ] enqueue/flush     |          —           |              —              |

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

| Critère                                             | Ref PRD      | Atteint ? | Commentaire |
| --------------------------------------------------- | ------------ | --------- | ----------- |
| Auth Better Auth (email/password, sessions, reset)  | AUTH-01 à 05 | ⬜        |             |
| 6 rôles avec permissions correctes + scope entrepôt | USER-01 à 05 | ⬜        |             |
| CRUD Entrepôts + permissions filtrées               | WH-01 à 04   | ⬜        |             |
| CRUD Produits + catégories + prix XOF               | PROD-01 à 07 | ⬜        |             |
| Mouvements entrées/sorties (transactions atomiques) | MOV-01 à 06  | ⬜        |             |
| Calcul PUMP à l'écriture                            | MOV-06       | ⬜        |             |
| Scan codes-barres (html5-qrcode)                    | SCAN-01 à 04 | ⬜        |             |
| Résilience réseau (queue IndexedDB)                 | NET-01 à 04  | ⬜        |             |
| Workflow transferts complet (incluant litiges)      | TRF-01 à 10  | ⬜        |             |
| Module inventaire (sessions, écarts, validation)    | INV-01 à 05  | ⬜        |             |
| Alertes in-app + email                              | ALT-01 à 04  | ⬜        |             |
| Logs et traçabilité (audit complet)                 | LOG-01 à 04  | ⬜        |             |
| Dashboard par rôle                                  | DASH-01 à 04 | ⬜        |             |

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
_Dernière mise à jour : 05/02/2026_
_PR Semaine 1 : [#1](https://github.com/kkzakaria/stockflow/pull/1) — En revue_
