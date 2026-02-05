# Revue de code — PR #1 : Week 1 Foundations

## Vue d'ensemble

Cette PR pose les fondations du projet StockFlow : schéma DB complet (16 tables), authentification via Better Auth, système RBAC à 6 rôles, endpoints API CRUD (users + warehouses), et UI de base (layout responsive avec sidebar/header/bottom nav, page de login).

**16 commits**, **60 fichiers modifiés**, **~13 800 ajouts**.

---

## Points positifs

- **Schéma DB bien structuré** : Relations Drizzle propres, indexes pertinents (sur les FK, les filtres fréquents), utilisation correcte de `onDelete: cascade`.
- **RBAC bien pensé** : Hiérarchie de rôles claire avec séparation global scope / warehouse scope. Les helpers (`canWrite`, `canManage`, `canApprove`, `hasGlobalScope`) sont simples et testés.
- **Soft delete** sur users et warehouses — bonne pratique pour un système de gestion de stock.
- **Validation Zod** côté serveur sur tous les endpoints.
- **Garde d'accès warehouse** : `requireWarehouseAccess` vérifie correctement l'accès par entrepôt pour les rôles non-globaux.
- **Tests unitaires** pour RBAC et guards — couverture de base correcte.
- **Layout responsive** avec sidebar desktop + bottom nav mobile.

---

## Problèmes à corriger

### 1. [Critique] `db/index.ts` utilise `better-sqlite3` au lieu de D1

```ts
// src/lib/server/db/index.ts
import Database from 'better-sqlite3';
const client = new Database(env.DATABASE_URL);
```

Le projet cible Cloudflare Workers (cf. `wrangler.jsonc`), mais `better-sqlite3` est un module natif Node.js qui **ne fonctionnera pas** en production sur Workers. Il faudrait utiliser **D1** avec `drizzle-orm/d1` et un binding Cloudflare, ou au minimum une configuration conditionnelle dev/prod.

### 2. [Critique] Filtrage GET users cassé — les conditions `where` s'écrasent

```ts
// src/routes/api/v1/users/+server.ts (GET)
let query = db.select().from(user).$dynamic();
if (roleFilter) {
    query = query.where(eq(user.role, roleFilter as Role));
}
if (activeFilter !== null && activeFilter !== undefined) {
    query = query.where(eq(user.isActive, activeFilter === 'true'));
}
```

**Problème** : Les deux `.where()` ne se combinent pas — le second écrase le premier. Il faudrait utiliser `and()` pour combiner les conditions, ou construire un tableau de conditions :

```ts
const conditions = [];
if (roleFilter) conditions.push(eq(user.role, roleFilter));
if (activeFilter !== null) conditions.push(eq(user.isActive, activeFilter === 'true'));
const users = await db.select().from(user).where(and(...conditions));
```

### 3. [Majeur] Pas de validation du `roleFilter` dans GET users

Le paramètre `roleFilter` est casté directement en `Role` sans validation : `roleFilter as Role`. Un attaquant pourrait injecter n'importe quelle valeur. Valider avec le schéma Zod `ROLES`.

### 4. [Majeur] `userWarehouses` n'a pas de clé primaire composite

```ts
export const userWarehouses = sqliteTable('user_warehouses', {
    userId: text('user_id')...,
    warehouseId: text('warehouse_id')...
});
```

Il manque une clé primaire composite `(userId, warehouseId)` ou un `uniqueIndex` pour éviter les doublons d'assignation.

### 5. [Majeur] `productWarehouse` n'a pas de clé primaire composite

Même problème — pas de PK composite ni d'index unique sur `(productId, warehouseId)`.

### 6. [Mineur] Champ `pump` dans `productWarehouse` non documenté

```ts
pump: real('pump').default(0),
```

Ce champ n'est référencé nulle part et son nom n'est pas explicite. S'il s'agit du PUMP (prix unitaire moyen pondéré / CUMP), le renommer en `averageCost` ou `cump` avec un commentaire.

---

## Suggestions d'amélioration

### 7. `requireAuth` devrait vérifier `isActive`

Actuellement, un utilisateur désactivé (`isActive: false`) peut toujours s'authentifier et accéder aux ressources. Ajouter une vérification dans `requireAuth` ou dans le hook `handleAuth`.

### 8. Header — le menu dropdown ne se ferme pas au clic extérieur

Il n'y a pas de gestion du clic en dehors du menu pour le fermer. Utiliser `use:clickOutside` ou un event listener sur `window`.

### 9. Le `DELETE` warehouse ne vérifie pas les transferts en cours

Un entrepôt avec des transferts `pending` ou `shipped` pourrait être désactivé, causant des incohérences.

### 10. Manque de pagination sur les endpoints GET list

`GET /api/v1/users` et `GET /api/v1/warehouses` retournent tous les résultats sans pagination. À ajouter pour éviter des problèmes de performance.

### 11. Les tests ne couvrent pas `requireWarehouseAccess` ni `getUserWarehouseIds`

Seul `requireAuth` est testé. Les deux fonctions async qui font des requêtes DB devraient avoir des tests avec des mocks.

### 12. Timestamps stockés en `text`

Stocker les dates en `text` avec `datetime('now')` fonctionne, mais les comparaisons/tris de dates seront plus complexes qu'avec des timestamps UNIX en `integer`. Documenter ce choix.

### 13. Login — pas de rate limiting

Le endpoint Better Auth `/api/auth/[...all]` ne semble pas avoir de protection contre le brute force.

---

## Résumé

| Catégorie | Verdict |
|-----------|---------|
| Architecture DB | Solide, quelques PK manquantes |
| Auth / RBAC | Bien pensé, vérifier `isActive` |
| API endpoints | Fonctionnels mais bug de filtrage |
| UI / Layout | Bonne base responsive |
| Tests | Couverture minimale, à étoffer |
| Prêt pour prod | Non — nécessite migration D1 |

**Verdict global** : Bonnes fondations, mais **3 correctifs bloquants** avant merge :
1. Migration du driver DB vers D1 pour Cloudflare Workers
2. Fix du filtrage combiné dans GET `/api/v1/users`
3. Ajout de PK composites sur `userWarehouses` et `productWarehouse`
