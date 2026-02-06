# Revue de code — PR #1 : Week 1 Foundations

## Vue d'ensemble

Cette PR pose les fondations du projet StockFlow : schéma DB (16 tables), authentification via Better Auth, système RBAC à 6 rôles, endpoints API CRUD (users + warehouses), bibliothèque de composants UI, pages CRUD complètes (users + warehouses), et layout responsive.

**22 commits**, **~88 fichiers modifiés**, **~15 600 ajouts**.

---

## Points positifs

- **Schéma DB bien structuré** : Relations Drizzle propres, indexes pertinents, `onDelete: cascade`.
- **RBAC bien pensé** : Hiérarchie de rôles claire avec séparation global scope / warehouse scope.
- **Soft delete** sur users et warehouses — bonne pratique.
- **Validation Zod** côté serveur sur tous les endpoints.
- **Bibliothèque UI complète** : 11 composants réutilisables (Button, Modal, DataTable, Toast, etc.).
- **Pages CRUD fonctionnelles** : Users et Warehouses avec formulaires de création, édition, détail.
- **Layout responsive** avec sidebar desktop + bottom nav mobile.
- **Toast store** avec helpers typés (`toast.success()`, `toast.error()`).

---

## Problèmes critiques (bloquants)

### 1. [CRITIQUE] Escalade de privilèges — `role` avec `input: true` dans auth.ts

```ts
// src/lib/server/auth.ts
role: {
    type: 'string',
    required: false,
    defaultValue: 'viewer',
    input: true  // ⚠️ DANGEREUX
}
```

Avec `input: true`, **n'importe quel utilisateur peut s'enregistrer comme `admin`** en incluant `role: "admin"` dans le body de la requête d'inscription. C'est une vulnérabilité d'escalade de privilèges.

**Fix** : Mettre `input: false`. Les changements de rôle doivent passer par un endpoint admin dédié.

### 2. [CRITIQUE] `better-sqlite3` incompatible avec Cloudflare Workers — toujours pas corrigé

```ts
// src/lib/server/db/index.ts
import Database from 'better-sqlite3';
const sqlite = new Database(env.DATABASE_URL);
```

Le nouveau commit ajoute du monkey-patching sur le prototype de `Statement` pour contourner les incompatibilités de type avec Better Auth, mais le problème fondamental reste : `better-sqlite3` est un module natif Node.js qui **crashera au déploiement** sur Workers.

De plus, le monkey-patching :
- Mutate globalement le prototype de tous les `Statement`
- Ne gère pas les structures imbriquées (tableaux de bind params)
- Risque de corruption silencieuse si une colonne attend un timestamp integer

### 3. [CRITIQUE] Filtrage GET users cassé — les `.where()` s'écrasent

```ts
// src/routes/api/v1/users/+server.ts
if (roleFilter) query = query.where(eq(user.role, roleFilter as Role));
if (activeFilter) query = query.where(eq(user.isActive, activeFilter === 'true'));
```

Le second `.where()` écrase le premier. Utiliser `and()` pour combiner.

### 4. [CRITIQUE] Requête stock leaks data inter-entrepôts

```ts
// src/routes/(app)/warehouses/+page.server.ts
const stockCounts = await db
    .select({ warehouseId, productCount, totalQuantity, totalValue })
    .from(productWarehouse)
    .groupBy(productWarehouse.warehouseId); // ← Pas de WHERE sur les warehouses autorisés
```

La requête récupère les données financières de **tous** les entrepôts, même ceux auxquels l'utilisateur n'a pas accès.

---

## Problèmes majeurs

### 5. [MAJEUR] `foreign_keys = ON` manquant — les FK ne sont pas appliquées

SQLite désactive les clés étrangères par défaut. Sans `sqlite.pragma('foreign_keys = ON')`, toutes les contraintes FK définies dans le schéma sont **ignorées au niveau DB**.

### 6. [MAJEUR] `userWarehouses` et `productWarehouse` sans PK composite

Pas de clé primaire composite ni d'index unique — doublons possibles.

### 7. [MAJEUR] `locals.user!` — assertion non-null sans garde

Toutes les pages server utilisent `locals.user!.role as Role` au lieu de `requireAuth(locals.user)`. Si l'authentification échoue, on obtient un crash `TypeError` (500) au lieu d'un 401 propre. La fonction `requireAuth` existe dans `guards.ts` mais **n'est jamais utilisée** dans les pages.

### 8. [MAJEUR] `isActive` retiré de Better Auth mais toujours dans le schéma

Le champ `isActive` a été supprimé de `auth.ts` mais reste dans `schema.ts`. Better Auth ne l'inclura plus dans l'objet session user → `user.isActive` sera `undefined`, rendant la vérification de désactivation impossible.

### 9. [MAJEUR] Pas de protection contre l'auto-modification admin

L'action `update` user n'empêche pas un admin de rétrograder son propre rôle. L'UI masque le bouton (client-side), mais un POST direct contourne cette protection.

### 10. [MAJEUR] Deactivate/Delete bypasse `use:enhance` et CSRF

```ts
// Users [id] et Warehouses [id]
const form = document.createElement('form');
form.method = 'POST';
form.action = '?/deactivate';
document.body.appendChild(form);
form.submit();
```

Formulaire créé dynamiquement → pas de `use:enhance`, reload complet, fuite DOM (jamais supprimé), erreurs non gérées par le toast system.

### 11. [MAJEUR] Modal — pas de focus trap + Escape handler toujours actif

Le `Modal.svelte` :
- N'a **pas de focus trap** → les utilisateurs peuvent Tab en dehors
- Le handler `Escape` est actif même quand le modal est fermé → appuyer Escape n'importe où déclenche `onclose()`
- Pas de scroll lock sur le body
- Pas de retour du focus à la fermeture

### 12. [MAJEUR] DataTable — éléments cliquables non accessibles au clavier

Les `<tr>` desktop et cards mobile utilisent `onclick` sur des éléments non-interactifs avec `svelte-ignore a11y_*` pour supprimer les warnings au lieu de les corriger. Aucun `tabindex`, `role`, ou `onkeydown`.

### 13. [MAJEUR] DataTable — index comme clé `{#each}`

```svelte
{#each data as item, i (i)}
```

L'index comme clé cause des bugs de réutilisation DOM lors de suppressions/réordonnements. Utiliser un `keyField` basé sur l'ID.

---

## Problèmes moyens

### 14. Warehouse assignment sans transaction

Delete-then-insert dans `[id]/+page.server.ts` sans `db.transaction()`. Si l'insert échoue, les assignments existants sont perdus.

### 15. `selectedWarehouses` stale après soumission

Le `SvelteSet` est initialisé une fois au mount et n'est pas re-dérivé après mise à jour des données.

### 16. `loading` state partagé entre formulaires

Un seul `loading = $state(false)` sert aux formulaires update ET warehouse assignment → les deux boutons passent en loading simultanément.

### 17. Formulaire d'édition perd les saisies après erreur validation

Les inputs utilisent `value={data.targetUser.name}` au lieu de `form?.data?.name ?? data.targetUser.name`.

### 18. Redirects serveur non base-path-aware

```ts
redirect(303, `/warehouses/${id}`); // ← Ignore le base path
```

Les redirects côté serveur utilisent des chemins absolus tandis que les navigations côté client utilisent `resolve()`.

### 19. Input/Select — `Math.random()` cause des mismatches SSR

Les ID auto-générés via `Math.random()` diffèrent entre serveur et client → mismatch d'hydration → association label/input cassée temporairement.

### 20. Input/Select — erreurs non liées via `aria-describedby`

Les messages d'erreur existent visuellement mais ne sont pas annoncés par les lecteurs d'écran.

### 21. Pas d'audit logging

Le schéma définit une table `auditLogs`, mais aucune opération CRUD (users, warehouses) n'y écrit.

### 22. Page détail warehouse affiche les warehouses soft-deleted

Pas de filtre `isActive = true` dans le load de `warehouses/[id]`.

### 23. Champs optionnels impossible à vider

`address`, `contactName`, `contactPhone` utilisent `|| undefined` → un champ rempli ne peut jamais être remis à vide.

### 24. Enum rôle non validé par Better Auth

Le type `'string'` dans auth.ts accepte n'importe quelle valeur, tandis que le schéma définit un enum restreint. Des rôles invalides peuvent être stockés.

---

## Problèmes mineurs

| # | Problème |
|---|----------|
| 25 | Champ `pump` non documenté dans `productWarehouse` |
| 26 | Password policy trop faible — `min(8)` sans complexité |
| 27 | Pas de confirmation de mot de passe dans user/new |
| 28 | Pas de `.trim()` sur les inputs name/email |
| 29 | Toast : tous les types utilisent `role="alert"` (même info) |
| 30 | Toast : durée non configurable, pas de `clearAll()`, pas de limite max |
| 31 | Button : pas de `type="button"` par défaut → `submit` dans les formulaires |
| 32 | Badge : pas de fallback pour variant invalide → `undefined` dans les classes |
| 33 | Labels i18n hardcodés en français (`"Fermer"`, `"Confirmer"`, `"Annuler"`) |
| 34 | Pas de session cookie hardening (`secure`, `httpOnly`, `sameSite`) |
| 35 | Pas de pagination sur les listes users et warehouses |
| 36 | Pas de rate limiting sur l'authentification |
| 37 | Pas de `ORDER BY` sur les requêtes de liste |

---

## Résumé

| Catégorie | Verdict |
|-----------|---------|
| Sécurité Auth | **Critique** — escalade de privilèges via `input: true` |
| Architecture DB | Non fonctionnelle sur Workers, FK non enforced |
| API endpoints | Bug de filtrage, pas de pagination |
| Pages Users | Fonctionnelles, mais bugs de state et d'accessibilité |
| Pages Warehouses | Fonctionnelles, fuite de données stock inter-entrepôts |
| Composants UI | Bonne base, accessibilité à corriger (Modal, DataTable) |
| Tests | Couverture minimale |

**Verdict global** : Les fonctionnalités sont bien construites, mais **4 correctifs bloquants** avant merge :

1. **`input: false`** sur le champ `role` dans `auth.ts` (escalade de privilèges)
2. **Migration DB** vers D1 / correction du driver pour Cloudflare Workers
3. **Fix filtrage** combiné dans GET `/api/v1/users` (`and()`)
4. **`foreign_keys = ON`** pragma + PK composites sur les tables de jointure
