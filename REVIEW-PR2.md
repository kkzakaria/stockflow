# Revue de code — PR #2 : Week 2 Core Business Modules

## Vue d'ensemble

Cette PR implémente les modules métier fondamentaux de StockFlow : catégories, produits, mouvements de stock, et calcul du PUMP. Le volume est conséquent (32 fichiers, ~5200 lignes), mais le code est bien structuré et cohérent. Les corrections déjà appliquées dans le commit `d538e48` montrent une bonne attention aux retours.

**Verdict global : Approuvé avec remarques** — Bon travail d'ensemble. Les points ci-dessous sont principalement des améliorations à envisager, avec quelques bugs réels à corriger.

---

## Critiques (à corriger)

### C1 — Race condition sur la vérification d'unicité SKU

**Fichiers :** `src/routes/api/v1/products/+server.ts:117-123`, `src/routes/(app)/products/new/+page.server.ts:44-49`

La vérification d'unicité du SKU se fait via un `SELECT` suivi d'un `INSERT` sans transaction. Entre les deux requêtes, un autre processus peut insérer le même SKU. Le constraint `UNIQUE` est déjà présent dans le schéma, mais le code ne gère pas le cas d'erreur de contrainte SQL — si le `SELECT` passe mais qu'un concurrent insère entre-temps, le `INSERT` lancera une erreur SQLite non attrapée au lieu d'un 409 propre.

**Suggestion :** Encapsuler dans un try/catch sur l'INSERT et attraper `SQLITE_CONSTRAINT_UNIQUE` pour retourner un 409.

### C2 — Filtrage warehouse côté JS au lieu de SQL dans product detail API

**Fichier :** `src/routes/api/v1/products/[id]/+server.ts:37-40`

```ts
const filteredStock =
    warehouseIds === null
        ? warehouseStock
        : warehouseStock.filter((s) => warehouseIds.includes(s.warehouseId));
```

Le filtrage se fait côté JS après avoir chargé **tout** le stock depuis la DB. Pour un produit présent dans beaucoup d'entrepôts, on charge des données inutiles. Plus important, cela signifie que les données brutes d'entrepôts non autorisés transitent en mémoire côté serveur. Mieux vaut ajouter la condition `WHERE warehouseId IN (...)` directement dans la requête SQL.

Le même pattern existe dans `src/routes/(app)/products/[id]/+page.server.ts:36-39`.

### C3 — `updateProductSchema` n'exige aucun champ

**Fichier :** `src/lib/validators/product.ts:14`

```ts
export const updateProductSchema = createProductSchema.partial().omit({ sku: true });
```

Contrairement à `updateCategorySchema` qui a un `.refine()` pour exiger au moins un champ, `updateProductSchema` accepte un objet vide `{}`. Cela permet un PUT qui ne modifie rien (sauf `updatedAt`), ce qui est probablement involontaire. Ajouter un `.refine()` similaire.

### C4 — Le `type` du mouvement (GET) est casté sans validation

**Fichier :** `src/routes/api/v1/movements/+server.ts:38-39`

```ts
if (type)
    conditions.push(eq(movements.type, type as 'in' | 'out' | 'adjustment_in' | 'adjustment_out'));
```

Le query param `type` est directement casté sans validation. Une valeur invalide (ex: `?type=foo`) ne causera pas d'erreur SQL, mais produira silencieusement un résultat vide. Il serait préférable de valider avec `MOVEMENT_TYPES.includes(type)` et retourner un 400 si invalide.

Le même pattern existe dans `src/routes/(app)/movements/+page.server.ts:42-44`.

---

## Améliorations suggérées

### I1 — Duplication de la logique de stock agrégé

Le code de calcul du stock agrégé par produit (avec `stockMap`, `stockConditions`, etc.) est quasi-identique entre :
- `src/routes/api/v1/products/+server.ts:48-89`
- `src/routes/(app)/products/+page.server.ts:44-85`

Envisager l'extraction dans une fonction utilitaire (`getStockMapForProducts(productIds, warehouseIds)`) pour éviter la duplication (~40 lignes dupliquées).

### I2 — `formatQuantity` — pluriel français simpliste

**Fichier :** `src/lib/utils/format.ts:21`

```ts
return `${qty.toLocaleString('fr-FR')} ${unit}${qty > 1 && unit === 'unité' ? 's' : ''}`;
```

Le pluriel ne fonctionne que pour `unit === 'unité'`. Si un produit a `unit = 'pièce'`, il n'y aura pas de pluriel. Envisager une logique plus générique ou ne pas gérer le pluriel côté format et le laisser à l'appelant.

### I3 — `checkMinStock` utilise `<=` au lieu de `<`

**Fichier :** `src/lib/server/services/stock.ts:153`

```ts
isBelowMin: (pw.quantity ?? 0) <= threshold
```

Un stock **égal** au seuil minimum est marqué comme "below min". Selon la sémantique métier, un stock de 20 avec un seuil min de 20 devrait probablement être considéré comme OK. Idem dans le frontend : `src/routes/(app)/products/+page.svelte:30`. À clarifier avec le métier.

### I4 — `BarcodeScanner` : typage `any` pour le scanner

**Fichier :** `src/lib/components/scan/BarcodeScanner.svelte:14`

```ts
let scanner: any = $state(null);
```

Le type `any` pourrait être remplacé par `Html5Qrcode | null` via un import de type. Cela améliorerait la sécurité de type.

### I5 — Pas de pagination pour `GET /api/v1/categories`

**Fichier :** `src/routes/api/v1/categories/+server.ts:13`

```ts
const allCategories = await db.select().from(categories);
```

Contrairement aux produits et mouvements, les catégories n'ont pas de pagination. Si le nombre de catégories reste limité, c'est acceptable, mais cela mérite d'être documenté comme choix conscient.

### I6 — Accents français manquants dans le frontend

Plusieurs labels dans les templates Svelte utilisent des caractères ASCII au lieu d'accents :
- `"Categorie"` → `"Catégorie"`
- `"Precedent"` → `"Précédent"`
- `"Creer"` → `"Créer"`
- `"Selectionner"` → `"Sélectionner"`
- `"Unite"` → `"Unité"`
- `"entrepot"` → `"entrepôt"`
- `"Quantite"` → `"Quantité"`
- `"enregistre"` → `"enregistré"`

C'est un problème d'UX pour une application francophone ciblant le marché XOF.

---

## Points positifs

1. **PUMP bien implémenté** — Le calcul du coût moyen pondéré via SQL atomique dans `stock.ts:72-80` est correct : la formule `((qty * pump) + (new_qty * price)) / (qty + new_qty)` avec le cas `ELSE price` pour un stock à zéro est conforme à la méthode comptable standard.

2. **Transactions synchrones** — L'utilisation de `db.transaction()` synchrone avec better-sqlite3 pour les mouvements de stock garantit l'atomicité de la chaîne vérification → insertion mouvement → mise à jour stock.

3. **Tests solides** — Les tests couvrent bien les cas limites du PUMP (première entrée, deuxième entrée, stock zéro puis re-entrée), les validators Zod (11 tests pour les mouvements), et le stock insuffisant.

4. **Safe delete des catégories** — Les vérifications en cascade (produits liés et sous-catégories) avant suppression d'une catégorie évitent les orphelins.

5. **Soft delete des produits** — L'utilisation de `isActive` plutôt qu'un DELETE physique est une bonne pratique pour un système de gestion de stock.

6. **Scoping warehouse cohérent** — L'application systématique du scope warehouse via `getUserWarehouseIds` est bien intégrée dans chaque endpoint (API et page server).

7. **Validation Zod avec refine** — La contrainte `purchasePrice` requis uniquement pour les entrées (`in` / `adjustment_in`) dans le validator de mouvement est élégante et bien testée.

8. **Responsive design** — Les pages Svelte offrent une vue table desktop et une vue cartes mobile, ce qui est pertinent pour une utilisation en entrepôt.

9. **Commit history propre** — Les 18 commits sont atomiques et bien nommés selon conventional commits.

---

## Résumé

| Catégorie | Compte |
|-----------|--------|
| Critiques (C) | 4 |
| Améliorations (I) | 6 |
| Points positifs | 9 |

Les critiques **C1** (race condition SKU) et **C2** (filtrage warehouse côté JS) sont les plus impactantes. C1 est une condition de course subtile mais réelle dans un contexte multi-utilisateur, et C2 charge des données d'entrepôts potentiellement non autorisés en mémoire serveur avant filtrage.
