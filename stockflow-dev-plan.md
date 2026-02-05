# StockFlow — Plan de Développement

**Version :** 1.0  
**Date :** 5 février 2026  
**Référence :** PRD StockFlow v1.0  
**Durée :** 4 semaines (5 février — 5 mars 2026)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis et Setup initial](#2-prérequis-et-setup-initial)
3. [Semaine 1 — Fondations](#3-semaine-1--fondations)
4. [Semaine 2 — Modules métier core](#4-semaine-2--modules-métier-core)
5. [Semaine 3 — Transferts, Inventaire & Résilience](#5-semaine-3--transferts-inventaire--résilience)
6. [Semaine 4 — Dashboard, Polish & Déploiement](#6-semaine-4--dashboard-polish--déploiement)
7. [Architecture des fichiers cible](#7-architecture-des-fichiers-cible)
8. [Conventions de code](#8-conventions-de-code)
9. [Stratégie de tests](#9-stratégie-de-tests)
10. [Checklist de déploiement](#10-checklist-de-déploiement)
11. [Dépendances et librairies](#11-dépendances-et-librairies)

---

## 1. Vue d'ensemble

### 1.1 Planning macro

```
Semaine 1 (S1)         Semaine 2 (S2)         Semaine 3 (S3)         Semaine 4 (S4)
5-11 fév               12-18 fév              19-25 fév              26 fév - 5 mars
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  FONDATIONS  │──────▶│  CORE MÉTIER │──────▶│  TRANSFERTS  │──────▶│   POLISH &   │
│              │       │              │       │  INVENTAIRE  │       │  DÉPLOIEMENT │
│ • Setup      │       │ • Produits   │       │ • Workflow   │       │ • Dashboard  │
│ • Auth       │       │ • Stock svc  │       │ • Litiges    │       │ • Logs UI    │
│ • Schéma DB  │       │ • Mouvements │       │ • Inventaire │       │ • Mobile     │
│ • Users CRUD │       │ • Scan       │       │ • Alertes    │       │ • Migrations │
│ • Entrepôts  │       │ • PUMP       │       │ • Résilience │       │ • Tests E2E  │
│ • Layout UI  │       │              │       │              │       │ • Deploy     │
└──────────────┘       └──────────────┘       └──────────────┘       └──────────────┘
```

### 1.2 Dépendances entre semaines

```
S1: Auth + Users + Entrepôts + Layout
         │
         ▼
S2: Produits ──▶ Stock Service ──▶ Mouvements + Scan + PUMP
         │                │
         ▼                ▼
S3: Transferts (dépend de Produits + Stock) + Inventaire + Alertes + Résilience
         │
         ▼
S4: Dashboard (dépend de tout) + Logs UI + Polish + Deploy
```

### 1.3 Points de contrôle (Checkpoints)

| Date | Checkpoint | Critère de validation |
|------|-----------|----------------------|
| **Ven 7 fév** | CP0 — Setup validé | Projet tourne en local, auth fonctionne, `db:push` OK |
| **Ven 11 fév** | CP1 — Fondations | CRUD users/entrepôts fonctionnels, layout responsive |
| **Ven 18 fév** | CP2 — Core métier | Mouvements entrées/sorties OK, scan fonctionnel, PUMP calculé |
| **Ven 25 fév** | CP3 — Workflows | Transfert complet bout-en-bout, inventaire, alertes |
| **Mer 4 mars** | CP4 — Release Candidate | Tests passent, migration prod prête |
| **Jeu 5 mars** | CP5 — Go Live | Déploiement production |

---

## 2. Prérequis et Setup initial

### 2.1 Outils et comptes requis

| Outil | Version | Usage |
|-------|---------|-------|
| Node.js | ≥ 20 LTS | Runtime |
| pnpm | ≥ 9 | Package manager (recommandé pour la vitesse) |
| Wrangler CLI | ≥ 3 | CLI Cloudflare |
| Compte Cloudflare Pro | Actif | Hébergement, D1, Workers |
| Git | ≥ 2.40 | Versioning |
| VS Code | Latest | IDE (extensions Svelte, Tailwind, Drizzle) |

### 2.2 Setup projet (Jour 1, matin)

**Étape 1 — Création du projet SvelteKit :**

```bash
pnpm create cloudflare@latest stockflow -- --framework=svelte
cd stockflow
```

**Étape 2 — Installation des dépendances :**

```bash
# Core
pnpm add drizzle-orm better-auth

# Dev
pnpm add -D drizzle-kit @types/better-sqlite3 better-sqlite3
pnpm add -D tailwindcss @tailwindcss/vite

# Utilitaires
pnpm add zod           # Validation
pnpm add dayjs         # Dates
pnpm add nanoid        # IDs courts

# Scan codes-barres
pnpm add html5-qrcode

# Résilience (semaine 3 mais installer maintenant)
pnpm add idb           # IndexedDB wrapper
```

**Étape 3 — Configuration Cloudflare D1 :**

```bash
# Créer la base de données
wrangler d1 create stockflow-db

# Noter le database_id retourné et l'ajouter dans wrangler.toml
```

**Étape 4 — Configuration wrangler.toml :**

```toml
name = "stockflow"
compatibility_date = "2026-02-05"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "stockflow-db"
database_id = "<ID_RETOURNÉ>"

[vars]
BETTER_AUTH_URL = "http://localhost:5173"
```

**Étape 5 — Drizzle config :**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<db-id>/db.sqlite',
  },
});
```

**Étape 6 — Scripts package.json :**

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "vite build",
    "preview": "wrangler dev",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply stockflow-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply stockflow-db --remote",
    "db:studio": "drizzle-kit studio",
    "db:seed": "wrangler d1 execute stockflow-db --local --file=./drizzle/seed.sql",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Étape 7 — Premier `db:push` et validation :**

```bash
# Créer le schéma minimal (users Better Auth)
# puis :
pnpm db:push
pnpm dev
# Vérifier que l'app tourne sur http://localhost:5173
```

### 2.3 Structure Git

```
main              ← Production (protégé)
├── develop       ← Intégration continue
│   ├── feat/auth
│   ├── feat/products
│   ├── feat/movements
│   ├── feat/transfers
│   ├── feat/inventory
│   ├── feat/dashboard
│   └── fix/xxx
```

**Convention de commits :**
```
feat(module): description courte
fix(module): description du bug corrigé
chore: tâche technique
docs: documentation
```

---

## 3. Semaine 1 — Fondations

**Objectif :** Auth fonctionnel, CRUD Users/Entrepôts, layout responsive, schéma DB complet.

### 3.1 Jour 1 (Mercredi 5 fév) — Setup & Schéma DB

| Heure | Tâche | Livrable |
|-------|-------|----------|
| Matin | Setup projet complet (§2.2) | Projet tourne en local |
| Matin | Écrire le schéma Drizzle complet (`schema.ts`) | Toutes les tables définies |
| AM | `db:push` + vérification via `db:studio` | DB locale synchronisée |
| AM | Configurer Tailwind CSS + thème de base | Fichier `app.css` avec variables |

**Fichier clé — `src/lib/server/db/schema.ts` :**

```typescript
// Ce fichier sera la source de vérité pour toute la DB
// Contient : user (Better Auth), session, account, verification,
// warehouses, categories, products, product_warehouse,
// movements, transfers, transfer_items,
// inventories, inventory_items, alerts, audit_logs, user_warehouses
```

### 3.2 Jour 2 (Jeudi 6 fév) — Better Auth

| Heure | Tâche | Livrable |
|-------|-------|----------|
| Matin | Configurer Better Auth (`src/auth.ts`) | Config email/password + plugins admin |
| Matin | Route catch-all `api/auth/[...betterauth]` | Endpoints auth auto-générés |
| AM | `hooks.server.ts` — middleware session | Session validée sur chaque requête |
| AM | Page login (`/login`) | Formulaire email/password fonctionnel |
| AM | Page forgot/reset password | Flux de reset complet |

**Fichier clé — `src/auth.ts` :**

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '$lib/server/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true },
  plugins: [admin()],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24,      // refresh chaque jour
  },
});
```

**Fichier clé — `src/hooks.server.ts` :**

```typescript
import { auth } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  // Protection des routes (app)
  if (event.url.pathname.startsWith('/(app)') && !session) {
    throw redirect(302, '/login');
  }

  return resolve(event);
};
```

### 3.3 Jour 3 (Vendredi 7 fév) — Middleware Autorisation + Layout

| Heure | Tâche | Livrable |
|-------|-------|----------|
| Matin | Middleware RBAC (`src/lib/server/auth/rbac.ts`) | Vérification rôle + scope entrepôt |
| Matin | Helper `requireRole()`, `requireWarehouse()` | Fonctions réutilisables |
| AM | Layout principal desktop (`+layout.svelte`) | Sidebar + header + slot |
| AM | Layout mobile (bottom nav) | Navigation responsive |
| AM | Composants UI de base (Button, Input, Modal, Toast, Badge) | Librairie de composants |

**CP0 — Checkpoint : l'app tourne, l'auth fonctionne, le layout est en place.**

**Fichier clé — `src/lib/server/auth/rbac.ts` :**

```typescript
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

type Role = 'admin' | 'admin_manager' | 'manager' | 'user' | 'admin_viewer' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  admin_manager: 80,
  manager: 60,
  user: 40,
  admin_viewer: 20,
  viewer: 10,
};

const GLOBAL_SCOPE_ROLES: Role[] = ['admin', 'admin_manager', 'admin_viewer'];

export function requireRole(userRole: Role, minRole: Role) {
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
    throw error(403, 'Accès non autorisé');
  }
}

export function hasGlobalScope(role: Role): boolean {
  return GLOBAL_SCOPE_ROLES.includes(role);
}

export async function requireWarehouseAccess(userId: string, warehouseId: string, role: Role) {
  if (hasGlobalScope(role)) return;

  const access = await db.query.userWarehouses.findFirst({
    where: (uw, { and, eq }) =>
      and(eq(uw.userId, userId), eq(uw.warehouseId, warehouseId)),
  });

  if (!access) throw error(403, 'Accès non autorisé à cet entrepôt');
}

export function canWrite(role: Role): boolean {
  return !['admin_viewer', 'viewer'].includes(role);
}

export function canManage(role: Role): boolean {
  return ['admin', 'admin_manager', 'manager'].includes(role);
}

export function canApprove(role: Role): boolean {
  return ['admin', 'admin_manager'].includes(role);
}
```

### 3.4 Jours 4-5 (Lundi-Mardi 10-11 fév) — CRUD Users & Entrepôts

**Jour 4 — CRUD Utilisateurs :**

| Tâche | Route | Méthode |
|-------|-------|---------|
| Liste utilisateurs | `GET /api/v1/users` | Tableau paginé, recherche |
| Créer utilisateur (invitation) | `POST /api/v1/users` | Formulaire + envoi email |
| Détail utilisateur | `GET /api/v1/users/[id]` | Fiche complète |
| Modifier utilisateur | `PUT /api/v1/users/[id]` | Rôle, entrepôts, statut |
| Désactiver utilisateur | `DELETE /api/v1/users/[id]` | Soft delete |
| Assigner entrepôts | `PUT /api/v1/users/[id]/warehouses` | Multi-sélection |

**Pages UI :**
```
/users              → Liste avec filtres (rôle, statut, entrepôt)
/users/new          → Formulaire création + invitation email
/users/[id]         → Fiche détail + édition inline
```

**Jour 5 — CRUD Entrepôts :**

| Tâche | Route | Méthode |
|-------|-------|---------|
| Liste entrepôts | `GET /api/v1/warehouses` | Filtrée par permissions |
| Créer entrepôt | `POST /api/v1/warehouses` | Admin only |
| Détail entrepôt | `GET /api/v1/warehouses/[id]` | Infos + résumé stock |
| Modifier entrepôt | `PUT /api/v1/warehouses/[id]` | Admin only |
| Désactiver entrepôt | `DELETE /api/v1/warehouses/[id]` | Soft delete |

**Pages UI :**
```
/warehouses         → Liste cards (nom, adresse, nb produits, valeur)
/warehouses/new     → Formulaire création
/warehouses/[id]    → Fiche détail + onglets (stock, mouvements, équipe)
```

**CP1 — Checkpoint : CRUD users/entrepôts fonctionnels, layout responsive OK.**

---

## 4. Semaine 2 — Modules métier core

**Objectif :** Produits, mouvements avec transactions atomiques, calcul PUMP, scan codes-barres.

### 4.1 Jours 6-7 (Mercredi-Jeudi 12-13 fév) — CRUD Produits

**Jour 6 — Backend Produits :**

| Tâche | Détail |
|-------|--------|
| API CRUD produits | Endpoints REST complets |
| Validation Zod | Schémas de validation (SKU unique, prix ≥ 0, etc.) |
| CRUD catégories | Arbre hiérarchique (parent_id) |
| Config stock/entrepôt | Seuil minimum par produit/entrepôt |

**Schéma de validation :**

```typescript
// src/lib/validators/product.ts
import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default('unité'),
  purchasePrice: z.number().min(0).default(0),
  salePrice: z.number().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
});

export const updateProductWarehouseSchema = z.object({
  minStock: z.number().int().min(0).nullable(),
});
```

**Jour 7 — Frontend Produits :**

**Pages UI :**
```
/products              → Liste tableau/cards avec recherche, filtres catégorie/entrepôt
/products/new          → Formulaire création (SKU, nom, prix, catégorie, seuils)
/products/[id]         → Fiche détail avec :
                          - Onglet Infos : attributs, prix
                          - Onglet Stock : quantité par entrepôt + PUMP
                          - Onglet Mouvements : historique filtrable
                          - Onglet Config : seuils par entrepôt
/products/[id]/edit    → Formulaire modification
```

**Composants spécifiques :**
```
<ProductCard />        → Card produit (SKU, nom, stock total, alerte)
<StockByWarehouse />   → Tableau stock par entrepôt avec indicateurs
<ProductSearch />      → Barre de recherche avec autocomplete
<CategoryTree />       → Sélecteur de catégorie hiérarchique
```

### 4.2 Jour 8 (Vendredi 14 fév) — Service Stock + PUMP

**Le cœur du système — `src/lib/server/services/stock.ts` :**

| Fonction | Responsabilité |
|----------|---------------|
| `recordMovement()` | Entrée/sortie atomique + calcul PUMP |
| `getStockByWarehouse()` | Stock d'un produit par entrepôt |
| `getStockConsolidated()` | Stock total d'un produit tous entrepôts |
| `getValuation()` | Valorisation stock (qté × PUMP) |
| `checkMinStock()` | Vérifie seuils et déclenche alertes |

**Implémentation détaillée du service :**

```typescript
// src/lib/server/services/stock.ts
import { db } from '$lib/server/db';
import { movements, productWarehouse, products } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { alertService } from './alerts';
import { auditService } from './audit';

export const stockService = {

  async recordMovement(data: {
    productId: string;
    warehouseId: string;
    type: 'in' | 'out' | 'adjustment_in' | 'adjustment_out';
    quantity: number;
    reason: string;
    userId: string;
    reference?: string;
    purchasePrice?: number;
  }) {
    const isOut = data.type === 'out' || data.type === 'adjustment_out';
    const delta = isOut ? -data.quantity : data.quantity;

    return await db.transaction(async (tx) => {

      // 1. Vérification stock suffisant (sorties)
      if (isOut) {
        const [current] = await tx.select()
          .from(productWarehouse)
          .where(and(
            eq(productWarehouse.productId, data.productId),
            eq(productWarehouse.warehouseId, data.warehouseId)
          ));

        if (!current || current.quantity < data.quantity) {
          throw new Error('INSUFFICIENT_STOCK');
        }
      }

      // 2. Écriture du mouvement
      const [movement] = await tx.insert(movements).values({
        productId: data.productId,
        warehouseId: data.warehouseId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        reference: data.reference,
        userId: data.userId,
      }).returning();

      // 3. Mise à jour stock + PUMP
      const isEntry = data.type === 'in' || data.type === 'adjustment_in';
      const purchasePrice = data.purchasePrice ?? 0;

      await tx.insert(productWarehouse).values({
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: Math.max(0, data.quantity),
        pump: isEntry ? purchasePrice : 0,
      }).onConflictDoUpdate({
        target: [productWarehouse.productId, productWarehouse.warehouseId],
        set: {
          quantity: sql`MAX(0, ${productWarehouse.quantity} + ${delta})`,
          pump: isEntry
            ? sql`CASE
                WHEN (${productWarehouse.quantity} + ${data.quantity}) > 0
                THEN ((${productWarehouse.quantity} * ${productWarehouse.pump})
                     + (${data.quantity} * ${purchasePrice}))
                     / (${productWarehouse.quantity} + ${data.quantity})
                ELSE ${purchasePrice}
              END`
            : productWarehouse.pump,
          updatedAt: sql`datetime('now')`,
        },
      });

      return movement;
    });
  },

  async getStockByWarehouse(productId: string) {
    return db.select({
      warehouseId: productWarehouse.warehouseId,
      quantity: productWarehouse.quantity,
      pump: productWarehouse.pump,
      minStock: productWarehouse.minStock,
      valuation: sql<number>`${productWarehouse.quantity} * ${productWarehouse.pump}`,
    })
    .from(productWarehouse)
    .where(eq(productWarehouse.productId, productId));
  },

  async checkAndAlertMinStock(productId: string, warehouseId: string) {
    const [pw] = await db.select()
      .from(productWarehouse)
      .where(and(
        eq(productWarehouse.productId, productId),
        eq(productWarehouse.warehouseId, warehouseId)
      ));

    if (!pw) return;

    // Seuil = min_stock entrepôt OU min_stock global du produit
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, productId));

    const threshold = pw.minStock ?? product?.minStock ?? 0;

    if (pw.quantity <= threshold) {
      await alertService.createStockAlert(productId, warehouseId, pw.quantity, threshold);
    }
  },
};
```

**Tests unitaires du service stock :**

```typescript
// src/lib/server/services/stock.test.ts
describe('stockService', () => {
  test('entrée stock : quantité incrémentée', async () => { ... });
  test('entrée stock : PUMP recalculé correctement', async () => { ... });
  test('sortie stock : quantité décrémentée', async () => { ... });
  test('sortie stock : PUMP inchangé', async () => { ... });
  test('sortie stock insuffisant : erreur INSUFFICIENT_STOCK', async () => { ... });
  test('stock à 0 puis entrée : PUMP = prix achat', async () => { ... });
  test('alerte stock minimum déclenchée', async () => { ... });
  test('transaction atomique : rollback si erreur', async () => { ... });
  test('concurrence : deux mouvements simultanés', async () => { ... });
});
```

### 4.3 Jours 9-10 (Lundi-Mardi 17-18 fév) — Mouvements + Scan

**Jour 9 — Module Mouvements :**

| Tâche | Détail |
|-------|--------|
| API mouvements | `POST /api/v1/movements` (utilise `stockService`) |
| Liste mouvements | `GET /api/v1/movements` avec filtres |
| Audit log auto | Chaque mouvement loggé dans `audit_logs` |
| Post-mouvement | Vérification seuil minimum → alerte si nécessaire |

**Pages UI :**
```
/movements              → Historique global (filtres : date, produit, entrepôt, type)
/movements/new          → Formulaire rapide :
                            1. Sélection entrepôt (pré-filtré par rôle)
                            2. Scan ou recherche produit
                            3. Type (entrée/sortie)
                            4. Quantité + motif
                            5. Prix d'achat (si entrée)
                            6. Référence optionnelle (n° bon)
```

**Composants spécifiques :**
```
<MovementForm />        → Formulaire optimisé mobile (gros boutons, champs larges)
<MovementTimeline />    → Historique visuel d'un produit
<ReasonSelect />        → Sélecteur de motif (prédéfinis + libre)
```

**Jour 10 — Scan Codes-barres :**

| Tâche | Détail |
|-------|--------|
| Composant `<BarcodeScanner />` | Wrapper html5-qrcode avec UI |
| Intégration formulaire mouvements | Scan → recherche produit → pré-remplissage |
| Gestion permissions caméra | Demande explicite + fallback gracieux |
| Mode scan continu | Option pour scanner plusieurs produits |

**Implémentation du composant scanner :**

```svelte
<!-- src/lib/components/scan/BarcodeScanner.svelte -->
<script lang="ts">
  import { Html5Qrcode } from 'html5-qrcode';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  export let continuous = false;

  const dispatch = createEventDispatcher<{ scan: string; error: string }>();

  let scanner: Html5Qrcode;
  let scanning = false;

  onMount(async () => {
    scanner = new Html5Qrcode('scanner-region');
  });

  async function startScan() {
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (code) => {
          dispatch('scan', code);
          if (!continuous) stopScan();
        },
        () => {} // ignore errors silently during scan
      );
      scanning = true;
    } catch (err) {
      dispatch('error', 'Caméra non disponible');
    }
  }

  async function stopScan() {
    if (scanning) {
      await scanner.stop();
      scanning = false;
    }
  }

  onDestroy(() => stopScan());
</script>

<div class="scanner-container">
  <div id="scanner-region"></div>
  {#if !scanning}
    <button on:click={startScan} class="btn-scan">
      📷 Scanner un code-barres
    </button>
  {:else}
    <button on:click={stopScan} class="btn-stop">
      ⏹ Arrêter le scan
    </button>
  {/if}
</div>
```

**CP2 — Checkpoint : mouvements entrées/sorties fonctionnels, scan OK, PUMP calculé.**

---

## 5. Semaine 3 — Transferts, Inventaire & Résilience

**Objectif :** Workflow de transfert complet, module inventaire, alertes, résilience réseau.

### 5.1 Jours 11-12 (Mercredi-Jeudi 19-20 fév) — Transferts

**Jour 11 — Backend Transferts :**

| Tâche | Détail |
|-------|--------|
| API création transfert | Validation : produits existent, stock source suffisant |
| API approbation/rejet | Rôle `admin` / `admin_manager` requis |
| API expédition | Décrémente stock source via `stockService` |
| API réception | Incrémente stock destination + gestion écarts |
| API réception partielle | Si qté_reçue < qté_envoyée → statut `partially_received` |
| API litige | Notification auto admin gestionnaire |
| API résolution litige | Ajustement stock + clôture |
| API annulation | Avant expédition uniquement |

**Machine à états du transfert :**

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │ APPROVED │         │ REJECTED │
        └────┬─────┘         └──────────┘
             │
             ▼
        ┌──────────┐
        │ SHIPPED  │◄─────────────────────┐
        └────┬─────┘                      │
             │                            │
    ┌────────┼────────┐                   │
    ▼                 ▼                   │
┌──────────┐  ┌───────────────┐    ┌──────────┐
│ RECEIVED │  │  PARTIALLY    │───▶│ DISPUTED │
└──────────┘  │  RECEIVED     │    └────┬─────┘
              └───────────────┘         │
                                        ▼
                                  ┌──────────┐
                                  │ RESOLVED │
                                  └──────────┘

   Depuis PENDING ou APPROVED :
        ┌──────────┐
        │CANCELLED │
        └──────────┘
```

**Transitions autorisées :**

| De → Vers | Qui | Conditions |
|-----------|-----|------------|
| pending → approved | admin, admin_manager | — |
| pending → rejected | admin, admin_manager | Motif obligatoire |
| pending → cancelled | gestionnaire source | — |
| approved → shipped | gestionnaire source | Stock source vérifié |
| approved → cancelled | admin, admin_manager | — |
| shipped → received | gestionnaire destination | qté_reçue = qté_envoyée |
| shipped → partially_received | gestionnaire destination | qté_reçue < qté_envoyée, anomaly_notes obligatoire |
| partially_received → disputed | auto | Notification admin gestionnaire |
| disputed → resolved | admin, admin_manager | Ajustement stock, commentaire |

**Jour 12 — Frontend Transferts :**

**Pages UI :**
```
/transfers              → Liste avec filtres (statut, entrepôt, date)
                          + Vue Kanban optionnelle par statut
/transfers/new          → Formulaire :
                            1. Entrepôt source + destination
                            2. Ajout produits (scan ou recherche)
                            3. Quantités demandées
                            4. Notes
/transfers/[id]         → Détail avec :
                            - Timeline visuelle du workflow
                            - Liste produits + quantités (demandé/envoyé/reçu)
                            - Actions contextuelles selon statut et rôle
                            - Zone commentaires/anomalies
```

**Composants spécifiques :**
```
<TransferTimeline />     → Visualisation des étapes (stepper)
<TransferActions />      → Boutons contextuels (approuver, rejeter, expédier, etc.)
<TransferItemsTable />   → Tableau produits avec colonnes demandé/envoyé/reçu
<DisputeBanner />        → Bandeau d'alerte si litige en cours
```

### 5.2 Jour 13 (Vendredi 21 fév) — Inventaire

| Tâche | Détail |
|-------|--------|
| Création session d'inventaire | Sélection entrepôt + produits concernés (tous ou filtre catégorie) |
| Saisie des comptages | Interface mobile-friendly, scan pour sélectionner le produit |
| Calcul écarts | Stock système vs compté, calcul automatique |
| Validation inventaire | Par gestionnaire : ajuste le stock via `stockService` (adjustment) |
| Historique | Liste des inventaires passés avec résumé des écarts |

**Pages UI :**
```
/inventory              → Liste des sessions (en cours, terminées)
/inventory/new          → Création : choix entrepôt, produits
/inventory/[id]         → Session en cours :
                            - Grille de saisie (produit | stock système | compté | écart)
                            - Scan produit pour naviguer dans la grille
                            - Validation finale avec récapitulatif
```

**Flux d'inventaire :**

```
1. Gestionnaire crée une session
   → Statut : "en_cours"
   → system_quantity est snapshot du stock actuel

2. Utilisateurs saisissent les comptages
   → Sur mobile avec scan
   → counted_quantity rempli produit par produit

3. Gestionnaire visualise les écarts
   → difference = counted_quantity - system_quantity
   → Mise en évidence des écarts significatifs

4. Gestionnaire valide
   → Pour chaque écart ≠ 0 : mouvement adjustment via stockService
   → Statut : "validé"
   → Audit log avec détail de tous les ajustements
```

### 5.3 Jour 14 (Lundi 24 fév) — Alertes

| Tâche | Détail |
|-------|--------|
| Service alertes (`alertService`) | Création, lecture, marquage lu |
| Alerte stock minimum | Trigger après chaque mouvement via `stockService` |
| Alerte transfert | Trigger sur changement de statut |
| Alerte litige | Trigger sur réception partielle |
| Centre de notifications UI | Page `/alerts` + badge header |
| Envoi emails | Cloudflare Email Workers, templates simples |

**Service alertes :**

```typescript
// src/lib/server/services/alerts.ts
export const alertService = {

  async createStockAlert(productId: string, warehouseId: string, current: number, threshold: number) {
    // 1. Vérifier qu'une alerte identique non lue n'existe pas déjà
    // 2. Créer l'alerte pour les users concernés (gestionnaires de l'entrepôt + admins)
    // 3. Envoyer email si préférence activée
  },

  async createTransferAlert(transferId: string, type: string, targetUserIds: string[]) {
    // Alerte pour approbation, expédition, réception, litige
  },

  async markAsRead(alertId: string, userId: string) { ... },
  async markAllAsRead(userId: string) { ... },
  async getUnreadCount(userId: string): Promise<number> { ... },
  async getUserAlerts(userId: string, page: number, limit: number) { ... },
};
```

**Composant notification header :**
```
<NotificationBell />     → Icône cloche + badge compteur
                          → Dropdown 5 dernières alertes
                          → Lien vers /alerts
```

### 5.4 Jour 15 (Mardi 25 fév) — Résilience réseau

| Tâche | Détail |
|-------|--------|
| Store de connectivité | Svelte store réactif online/offline |
| Queue IndexedDB | Stocker les opérations en attente |
| Service de synchronisation | Retry automatique à la reconnexion |
| Indicateur UI | Bandeau offline + badge pending |
| Protection formulaires | Sauvegarde état formulaire en cas de perte réseau |

**Architecture de la résilience :**

```typescript
// src/lib/stores/network.ts
import { writable, derived } from 'svelte/store';

export const isOnline = writable(navigator.onLine);

// Écouter les événements réseau
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => isOnline.set(true));
  window.addEventListener('offline', () => isOnline.set(false));
}
```

```typescript
// src/lib/services/offline-queue.ts
import { openDB } from 'idb';

const DB_NAME = 'stockflow-offline';
const STORE_NAME = 'pending-operations';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    },
  });
}

export const offlineQueue = {

  async enqueue(operation: {
    url: string;
    method: string;
    body: unknown;
    timestamp: string;
  }) {
    const db = await getDB();
    await db.add(STORE_NAME, operation);
  },

  async flush() {
    const db = await getDB();
    const ops = await db.getAll(STORE_NAME);

    for (const op of ops) {
      try {
        const res = await fetch(op.url, {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.body),
        });

        if (res.ok) {
          await db.delete(STORE_NAME, op.id);
        } else if (res.status >= 500) {
          break; // Serveur indisponible, arrêter le flush
        } else {
          // Erreur 4xx : opération invalide, notifier et supprimer
          await db.delete(STORE_NAME, op.id);
          // TODO: notifier l'utilisateur de l'échec
        }
      } catch {
        break; // Réseau indisponible
      }
    }
  },

  async getPendingCount(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAME);
  },
};

// Auto-flush à la reconnexion
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => offlineQueue.flush());
}
```

**CP3 — Checkpoint : transfert bout-en-bout OK, inventaire OK, alertes OK, résilience testée.**

---

## 6. Semaine 4 — Dashboard, Polish & Déploiement

**Objectif :** Dashboard, logs UI, polish mobile, migrations prod, tests, go live.

### 6.1 Jour 16 (Mercredi 26 fév) — Dashboard

| Tâche | Détail |
|-------|--------|
| API dashboard | `GET /api/v1/dashboard` — KPIs filtrés par rôle et scope |
| KPIs principaux | Stock total, valorisation (XOF), alertes actives, transferts pending |
| Graphique mouvements | Entrées vs sorties sur 30 jours (barres) |
| Produits sous seuil | Liste top 10 produits critiques |
| Transferts en cours | Résumé avec statuts |
| Actions rapides | Boutons : nouvelle entrée, nouvelle sortie, nouveau transfert |

**Dashboard par rôle :**

| Rôle | KPIs visibles | Actions rapides |
|------|---------------|-----------------|
| Admin | Tous entrepôts, toutes métriques | Tout |
| Admin Gestionnaire | Tous entrepôts, métriques opérationnelles | Mouvements, transferts |
| Gestionnaire | Ses entrepôts uniquement | Mouvements, transferts de ses entrepôts |
| Utilisateur | Son entrepôt uniquement | Entrée/sortie rapide |
| Admin Visiteur | Tous entrepôts, lecture seule | — |
| Visiteur | Son entrepôt, lecture seule | — |

**API Dashboard — réponse type :**

```typescript
// GET /api/v1/dashboard
interface DashboardResponse {
  kpis: {
    totalProducts: number;
    totalStockValue: number;     // XOF
    activeAlerts: number;
    pendingTransfers: number;
    todayMovements: number;
  };
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    warehouseId: string;
    warehouseName: string;
    currentQty: number;
    threshold: number;
  }>;
  recentMovements: Array<{ ... }>;   // 10 derniers
  pendingTransfers: Array<{ ... }>;  // En attente d'action
  movementsTrend: Array<{            // 30 derniers jours
    date: string;
    entrées: number;
    sorties: number;
  }>;
}
```

### 6.2 Jour 17 (Jeudi 27 fév) — Logs UI & Audit

| Tâche | Détail |
|-------|--------|
| Service audit (`auditService`) | Log automatique de chaque action |
| Page `/logs` | Liste paginée avec filtres avancés |
| Détail d'un log | Valeurs avant/après (JSON diff) |
| Export CSV | Téléchargement des logs filtrés |

**Service d'audit :**

```typescript
// src/lib/server/services/audit.ts
export const auditService = {

  async log(data: {
    userId: string;
    action: 'create' | 'update' | 'delete' | 'movement' | 'transfer' | 'inventory' | 'login';
    entityType: 'product' | 'warehouse' | 'user' | 'movement' | 'transfer' | 'inventory' | 'alert';
    entityId: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress,
    });
  },
};
```

**Page UI Logs :**
```
/logs                   → Tableau paginé :
                            Colonnes : Date | Utilisateur | Action | Entité | Détail
                            Filtres : date range, utilisateur, type action, entrepôt
                            Bouton Export CSV
/logs/[id]              → Détail : diff avant/après, métadonnées (IP, user agent)
```

### 6.3 Jour 18 (Vendredi 28 fév) — Polish Mobile & UX

| Tâche | Détail |
|-------|--------|
| Bottom navigation mobile | 5 onglets (Home, Stock, Transferts, Inventaire, Plus) |
| Formulaires tactiles | Taille inputs ≥ 44px, espacement, gros boutons |
| Cards mobile produits | Layout card au lieu de tableau sous 768px |
| Pull-to-refresh | Actualisation listes par pull down |
| Swipe actions | Swipe sur card pour actions rapides (éditer, supprimer) |
| Loading states | Skeleton screens sur chaque page |
| Empty states | Illustrations + CTA pour chaque liste vide |
| Toast notifications | Feedback visuel sur chaque action |
| Confirmation modals | Double confirmation pour actions destructives |

**Breakpoints responsive :**

```css
/* Stratégie mobile-first */
/* Default : mobile (< 640px) */
/* sm: ≥ 640px  — Tablette portrait */
/* md: ≥ 768px  — Tablette paysage */
/* lg: ≥ 1024px — Desktop */
/* xl: ≥ 1280px — Grand écran */
```

**Test mobile checklist :**
- [ ] Navigation fonctionne au pouce
- [ ] Formulaires utilisables à une main
- [ ] Scan caméra fonctionne sur Android + iOS Safari
- [ ] Texte lisible sans zoom
- [ ] Actions principales accessibles en ≤ 2 taps
- [ ] Indicateur offline visible
- [ ] Toast notifications visibles sur petit écran

### 6.4 Jours 19-20 (Lundi-Mardi 3-4 mars) — Tests & Migration prod

**Jour 19 — Tests :**

| Type | Outil | Couverture |
|------|-------|------------|
| Unitaires | Vitest | Services (stock, alerts, audit, rbac) |
| Composants | Vitest + Testing Library | Formulaires, scanner, composants critiques |
| Intégration | Vitest | API endpoints, flux complets |
| E2E | Playwright | Scénarios utilisateurs critiques |

**Scénarios E2E prioritaires :**

```typescript
// tests/e2e/movements.spec.ts
test('Flux complet : entrée de stock', async ({ page }) => {
  // 1. Login en tant que gestionnaire
  // 2. Naviguer vers mouvements
  // 3. Créer une entrée (saisie SKU manuelle)
  // 4. Vérifier que le stock est incrémenté
  // 5. Vérifier que le PUMP est recalculé
  // 6. Vérifier le log dans l'historique
});

// tests/e2e/transfers.spec.ts
test('Flux complet : transfert avec réception partielle', async ({ page }) => {
  // 1. Login gestionnaire source → créer demande
  // 2. Login admin → approuver
  // 3. Login gestionnaire source → expédier
  // 4. Login gestionnaire destination → réception partielle
  // 5. Vérifier statut "partially_received"
  // 6. Vérifier notification litige envoyée
  // 7. Login admin → résoudre litige
});

// tests/e2e/auth.spec.ts
test('Connexion + redirection par rôle', async ({ page }) => { ... });
test('Accès non autorisé → 403', async ({ page }) => { ... });
test('Reset password complet', async ({ page }) => { ... });
```

**Jour 20 — Migration production & déploiement :**

```bash
# 1. Figer le schéma
pnpm db:generate
# → Génère les fichiers .sql dans /drizzle

# 2. Vérifier les migrations
cat drizzle/*.sql  # Review manuel

# 3. Appliquer en production
pnpm db:migrate:prod

# 4. Seed des données initiales
wrangler d1 execute stockflow-db --remote --file=./drizzle/seed.sql
```

**Contenu du seed :**

```sql
-- drizzle/seed.sql

-- Admin par défaut
-- (Le mot de passe sera défini via Better Auth sign-up)
INSERT INTO user (id, name, email, role, is_active)
VALUES ('admin-001', 'Admin StockFlow', 'admin@entreprise.com', 'admin', 1);

-- Catégories de base
INSERT INTO categories (id, name, parent_id) VALUES
  ('cat-001', 'Pièces détachées', NULL),
  ('cat-002', 'Équipements', NULL),
  ('cat-003', 'Consommables', NULL),
  ('cat-004', 'Filtres', 'cat-001'),
  ('cat-005', 'Courroies', 'cat-001');

-- Entrepôts initiaux (à adapter)
-- INSERT INTO warehouses ...
```

### 6.5 Jour 21 (Mercredi 5 mars) — Go Live

| Heure | Tâche |
|-------|-------|
| 08h00 | Vérification finale migration prod |
| 08h30 | Déploiement application via `wrangler pages deploy` |
| 09h00 | Smoke tests en production (login, CRUD, mouvement, transfert) |
| 09h30 | Création des comptes utilisateurs |
| 10h00 | Création des entrepôts |
| 10h30 | Formation équipe (session 1h) |
| 14h00 | Début inventaire physique initial |
| 16h00 | Support terrain |
| 17h00 | Bilan jour 1, correction bugs critiques |

---

## 7. Architecture des fichiers cible

```
stockflow/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Input.svelte
│   │   │   │   ├── Modal.svelte
│   │   │   │   ├── Toast.svelte
│   │   │   │   ├── Badge.svelte
│   │   │   │   ├── Card.svelte
│   │   │   │   ├── DataTable.svelte
│   │   │   │   ├── Pagination.svelte
│   │   │   │   ├── Skeleton.svelte
│   │   │   │   ├── EmptyState.svelte
│   │   │   │   └── ConfirmModal.svelte
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.svelte
│   │   │   │   ├── Header.svelte
│   │   │   │   ├── BottomNav.svelte
│   │   │   │   ├── NotificationBell.svelte
│   │   │   │   └── OfflineBanner.svelte
│   │   │   ├── products/
│   │   │   │   ├── ProductCard.svelte
│   │   │   │   ├── ProductSearch.svelte
│   │   │   │   ├── StockByWarehouse.svelte
│   │   │   │   └── CategoryTree.svelte
│   │   │   ├── movements/
│   │   │   │   ├── MovementForm.svelte
│   │   │   │   ├── MovementTimeline.svelte
│   │   │   │   └── ReasonSelect.svelte
│   │   │   ├── transfers/
│   │   │   │   ├── TransferTimeline.svelte
│   │   │   │   ├── TransferActions.svelte
│   │   │   │   ├── TransferItemsTable.svelte
│   │   │   │   └── DisputeBanner.svelte
│   │   │   ├── inventory/
│   │   │   │   ├── CountGrid.svelte
│   │   │   │   └── VarianceSummary.svelte
│   │   │   ├── scan/
│   │   │   │   └── BarcodeScanner.svelte
│   │   │   └── dashboard/
│   │   │       ├── KpiCards.svelte
│   │   │       ├── MovementChart.svelte
│   │   │       ├── LowStockList.svelte
│   │   │       └── QuickActions.svelte
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts            # Source de vérité DB
│   │   │   │   ├── index.ts             # Export db instance
│   │   │   │   └── seed.sql             # Données initiales
│   │   │   ├── auth/
│   │   │   │   ├── index.ts             # Better Auth config
│   │   │   │   └── rbac.ts              # Helpers rôles/permissions
│   │   │   └── services/
│   │   │       ├── stock.ts             # Transactions atomiques + PUMP
│   │   │       ├── alerts.ts            # Gestion alertes multi-canal
│   │   │       ├── audit.ts             # Logging audit
│   │   │       ├── transfers.ts         # Logique workflow transfert
│   │   │       ├── inventory.ts         # Logique inventaire
│   │   │       └── email.ts             # Envoi emails (CF Email Workers)
│   │   ├── validators/
│   │   │   ├── product.ts
│   │   │   ├── movement.ts
│   │   │   ├── transfer.ts
│   │   │   ├── inventory.ts
│   │   │   ├── warehouse.ts
│   │   │   └── user.ts
│   │   ├── stores/
│   │   │   ├── network.ts               # État online/offline
│   │   │   ├── auth.ts                  # Session utilisateur
│   │   │   ├── notifications.ts         # Compteur alertes
│   │   │   └── offlineQueue.ts          # Queue des opérations pending
│   │   ├── services/
│   │   │   └── offline-queue.ts         # IndexedDB queue (client)
│   │   ├── utils/
│   │   │   ├── format.ts               # Formatters (XOF, dates, nombres)
│   │   │   ├── permissions.ts           # Helpers front (canWrite, etc.)
│   │   │   └── constants.ts             # Roles, motifs, unités...
│   │   └── types/
│   │       ├── auth.ts
│   │       ├── product.ts
│   │       ├── movement.ts
│   │       ├── transfer.ts
│   │       └── common.ts
│   ├── routes/
│   │   ├── (auth)/
│   │   │   ├── login/+page.svelte
│   │   │   ├── forgot-password/+page.svelte
│   │   │   ├── reset-password/+page.svelte
│   │   │   └── setup-account/+page.svelte
│   │   ├── (app)/
│   │   │   ├── +layout.svelte           # Layout principal (sidebar/bottom nav)
│   │   │   ├── +layout.server.ts        # Load session + user data
│   │   │   ├── dashboard/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts
│   │   │   ├── products/
│   │   │   │   ├── +page.svelte          # Liste
│   │   │   │   ├── +page.server.ts
│   │   │   │   ├── new/+page.svelte
│   │   │   │   ├── new/+page.server.ts
│   │   │   │   ├── [id]/+page.svelte     # Détail
│   │   │   │   ├── [id]/+page.server.ts
│   │   │   │   ├── [id]/edit/+page.svelte
│   │   │   │   └── [id]/edit/+page.server.ts
│   │   │   ├── warehouses/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts
│   │   │   │   ├── new/+page.svelte
│   │   │   │   ├── [id]/+page.svelte
│   │   │   │   └── [id]/+page.server.ts
│   │   │   ├── movements/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts
│   │   │   │   ├── new/+page.svelte
│   │   │   │   └── new/+page.server.ts
│   │   │   ├── transfers/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts
│   │   │   │   ├── new/+page.svelte
│   │   │   │   ├── new/+page.server.ts
│   │   │   │   ├── [id]/+page.svelte
│   │   │   │   └── [id]/+page.server.ts
│   │   │   ├── inventory/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts
│   │   │   │   ├── new/+page.svelte
│   │   │   │   └── [id]/+page.svelte
│   │   │   ├── users/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts
│   │   │   │   ├── new/+page.svelte
│   │   │   │   └── [id]/+page.svelte
│   │   │   ├── alerts/
│   │   │   │   └── +page.svelte
│   │   │   ├── logs/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts
│   │   │   └── settings/
│   │   │       └── +page.svelte
│   │   └── api/
│   │       ├── auth/[...betterauth]/
│   │       │   └── +server.ts
│   │       └── v1/
│   │           ├── users/+server.ts
│   │           ├── users/[id]/+server.ts
│   │           ├── warehouses/+server.ts
│   │           ├── warehouses/[id]/+server.ts
│   │           ├── products/+server.ts
│   │           ├── products/[id]/+server.ts
│   │           ├── movements/+server.ts
│   │           ├── transfers/+server.ts
│   │           ├── transfers/[id]/+server.ts
│   │           ├── transfers/[id]/[action]/+server.ts
│   │           ├── inventory/+server.ts
│   │           ├── inventory/[id]/+server.ts
│   │           ├── alerts/+server.ts
│   │           ├── logs/+server.ts
│   │           └── dashboard/+server.ts
│   ├── auth.ts                           # Better Auth config
│   ├── hooks.server.ts                   # Auth middleware global
│   ├── app.d.ts                          # Types globaux (Locals, Platform)
│   └── app.html
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── stock.test.ts
│   │   │   ├── alerts.test.ts
│   │   │   └── audit.test.ts
│   │   └── auth/
│   │       └── rbac.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       ├── movements.spec.ts
│       ├── transfers.spec.ts
│       └── inventory.spec.ts
├── static/
│   ├── favicon.png
│   └── manifest.json
├── drizzle/                              # Migrations générées (semaine 4)
│   └── seed.sql
├── drizzle.config.ts
├── wrangler.toml
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── playwright.config.ts
└── package.json
```

---

## 8. Conventions de code

### 8.1 TypeScript

| Convention | Règle |
|-----------|-------|
| Strictness | `strict: true` |
| Types | Interfaces pour les objets, types pour les unions |
| Null | Pas de `any`, utiliser `unknown` si nécessaire |
| Naming | camelCase variables/fonctions, PascalCase types/composants |

### 8.2 Svelte

| Convention | Règle |
|-----------|-------|
| Composants | Un fichier par composant, PascalCase |
| Props | Typées via `export let prop: Type` |
| Stores | Fichiers dédiés dans `src/lib/stores/` |
| Événements | `createEventDispatcher` avec types |

### 8.3 API

| Convention | Règle |
|-----------|-------|
| Codes HTTP | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal |
| Erreurs | `{ error: { code: string, message: string } }` |
| Pagination | `{ data: T[], meta: { page, limit, total } }` |
| Dates | ISO 8601 (UTC) |
| Montants | Nombres (pas de strings), en XOF |

### 8.4 Base de données

| Convention | Règle |
|-----------|-------|
| Tables | snake_case, pluriel (sauf `user` pour Better Auth) |
| Colonnes | snake_case |
| IDs | TEXT (nanoid ou UUID), jamais auto-increment |
| Timestamps | TEXT au format ISO, `datetime('now')` par défaut |
| Soft delete | `is_active INTEGER DEFAULT 1` |
| FK | Nommée `<entity>_id` |

### 8.5 Formatage XOF

```typescript
// src/lib/utils/format.ts
export function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// formatXOF(7500) → "7 500 FCFA"
```

---

## 9. Stratégie de tests

### 9.1 Pyramide de tests

```
        ╱╲
       ╱ E2E ╲        ← 5-10 scénarios critiques (Playwright)
      ╱────────╲
     ╱Intégration╲    ← API endpoints, flux complets (Vitest)
    ╱──────────────╲
   ╱    Unitaires    ╲ ← Services, validators, utils (Vitest)
  ╱────────────────────╲
```

### 9.2 Couverture minimale V1

| Module | Tests unitaires | Tests intégration | Tests E2E |
|--------|:--------------:|:-----------------:|:---------:|
| Auth | ✅ RBAC helpers | ✅ Login flow | ✅ Login + redirection |
| Stock service | ✅ Toutes les fonctions | ✅ API movements | ✅ Entrée/sortie |
| PUMP | ✅ Calculs + cas limites | — | — |
| Transferts | ✅ Machine à états | ✅ API workflow | ✅ Flux complet |
| Alertes | ✅ Trigger conditions | ✅ API alerts | — |
| Validators | ✅ Tous les schémas Zod | — | — |
| Offline queue | ✅ Enqueue/flush | — | — |

---

## 10. Checklist de déploiement

### 10.1 Pré-déploiement

- [ ] Tous les tests passent (`pnpm test && pnpm test:e2e`)
- [ ] Build réussi (`pnpm build`)
- [ ] `svelte-check` sans erreur (`pnpm check`)
- [ ] Schéma DB figé → `pnpm db:generate`
- [ ] Migrations SQL vérifiées manuellement
- [ ] Variables d'environnement configurées en prod (Cloudflare dashboard)
- [ ] `BETTER_AUTH_URL` pointe vers le domaine de production
- [ ] `BETTER_AUTH_SECRET` défini (≥ 32 caractères aléatoires)
- [ ] Email sending configuré (Cloudflare Email Workers ou API tierce)
- [ ] DNS configuré si domaine custom

### 10.2 Déploiement

```bash
# 1. Appliquer les migrations
pnpm db:migrate:prod

# 2. Seeder les données initiales
wrangler d1 execute stockflow-db --remote --file=./drizzle/seed.sql

# 3. Déployer l'application
wrangler pages deploy .svelte-kit/cloudflare

# 4. Vérifier le déploiement
curl https://stockflow.example.com/api/v1/dashboard
```

### 10.3 Post-déploiement

- [ ] Smoke test login
- [ ] Smoke test création produit + mouvement
- [ ] Smoke test transfert complet
- [ ] Vérifier les emails (reset password, alertes)
- [ ] Tester sur mobile réel (Android + iOS)
- [ ] Tester le scan codes-barres en conditions réelles
- [ ] Monitorer les erreurs (Cloudflare Analytics)
- [ ] Créer les comptes utilisateurs
- [ ] Créer les entrepôts
- [ ] Former les utilisateurs

### 10.4 Variables d'environnement production

```
BETTER_AUTH_URL=https://stockflow.example.com
BETTER_AUTH_SECRET=<random-32-chars>
CF_ACCOUNT_ID=<cloudflare-account-id>
CF_DATABASE_ID=<d1-database-id>
EMAIL_FROM=noreply@stockflow.example.com
```

---

## 11. Dépendances et librairies

### 11.1 Dépendances de production

| Package | Version | Usage |
|---------|---------|-------|
| `svelte` | ^5.x | Framework UI |
| `@sveltejs/kit` | ^2.x | Meta-framework |
| `@sveltejs/adapter-cloudflare` | ^5.x | Adapter déploiement |
| `drizzle-orm` | ^0.38.x | ORM / query builder |
| `better-auth` | ^1.x | Authentification |
| `zod` | ^3.x | Validation |
| `html5-qrcode` | ^2.x | Scan codes-barres |
| `idb` | ^8.x | IndexedDB wrapper (résilience) |
| `dayjs` | ^1.x | Manipulation dates |
| `nanoid` | ^5.x | Génération IDs |

### 11.2 Dépendances de développement

| Package | Version | Usage |
|---------|---------|-------|
| `drizzle-kit` | ^0.30.x | Migrations / push |
| `tailwindcss` | ^4.x | CSS utility-first |
| `@tailwindcss/vite` | ^4.x | Plugin Vite Tailwind |
| `typescript` | ^5.x | Typage |
| `vitest` | ^3.x | Tests unitaires + intégration |
| `@playwright/test` | ^1.x | Tests E2E |
| `better-sqlite3` | ^11.x | DB locale dev (pour Drizzle Kit) |
| `@types/better-sqlite3` | latest | Types |
| `wrangler` | ^3.x | CLI Cloudflare |

---

**Document rédigé le :** 5 février 2026  
**Prochaine mise à jour :** Après CP1 (11 février 2026)
