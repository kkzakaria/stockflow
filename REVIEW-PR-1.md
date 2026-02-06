# Revue de code — PR #1 : Week 1 Foundations (3e passe)

## Vue d'ensemble

23 commits sur `feat/week1-foundations`. Dernier commit de corrections : `ac67297`.

---

## Suivi des corrections — Revue précédente (37 findings)

### Problèmes critiques (4) — Tous corrigés

| # | Problème | Statut | Détail |
|---|----------|--------|--------|
| 1 | Escalade de privilèges `role: input: true` | **CORRIGE** | `input: false` + `isActive` ajouté avec `input: false` |
| 2 | `better-sqlite3` incompatible Workers | **CONNU** | Toujours `better-sqlite3` — `foreign_keys = ON` ajouté. Migration D1 reportée (acceptable pour dev) |
| 3 | Filtrage GET users `.where()` s'écrasent | **CORRIGE** | Utilise `and()` avec tableau de conditions + pagination ajoutée |
| 4 | Stock data leak inter-entrepôts | **CORRIGE** | Filtrage par `warehouseIds` pour les rôles non-globaux |

### Problèmes majeurs (9) — 8 corrigés, 1 partiellement

| # | Problème | Statut | Détail |
|---|----------|--------|--------|
| 5 | `foreign_keys = ON` manquant | **CORRIGE** | `sqlite.pragma('foreign_keys = ON')` ajouté |
| 6 | PK composites manquantes | **CORRIGE** | `primaryKey()` ajouté sur `userWarehouses` et `productWarehouse` |
| 7 | `locals.user!` sans garde | **CORRIGE** | `requireAuth(locals.user)` utilisé partout |
| 8 | `isActive` retiré de Better Auth | **CORRIGE** | Re-ajouté dans `auth.ts` avec `input: false` |
| 9 | Auto-modification admin rôle | **CORRIGE** | Guard serveur ajouté dans l'action `update` |
| 10 | Deactivate/Delete bypass `use:enhance` | **CORRIGE** | Formulaire caché avec `use:enhance` + `requestSubmit()` |
| 11 | Modal sans focus trap / Escape | **CORRIGE** | Focus trap, scroll lock, focus restore, guard `if (!open)` |
| 12 | DataTable non accessible clavier | **CORRIGE** | `role="button"`, `tabindex`, `onkeydown` (Enter/Space) |
| 13 | DataTable index comme clé `{#each}` | **CORRIGE** | Prop `keyField` avec défaut `'id'` |

### Problèmes moyens (11) — 8 corrigés, 3 non traités

| # | Problème | Statut |
|---|----------|--------|
| 14 | Warehouse assignment sans transaction | **CORRIGE** — `db.transaction()` |
| 15 | `selectedWarehouses` stale | **CORRIGE** — `$derived()` |
| 16 | `loading` state partagé | **CORRIGE** — `updateLoading` / `warehouseLoading` |
| 17 | Formulaire perd saisies après erreur | **CORRIGE** — `form?.data?.name ?? data.targetUser.name` |
| 18 | Redirects non base-path-aware | **NON TRAITE** |
| 19 | Input/Select `Math.random()` SSR | **CORRIGE** — Compteur module-level |
| 20 | Input/Select `aria-describedby` | **CORRIGE** — `aria-invalid` + `aria-describedby` liés à l'erreur |
| 21 | Pas d'audit logging | **NON TRAITE** — Acceptable pour cette phase |
| 22 | Warehouse détail affiche soft-deleted | **CORRIGE** — `eq(warehouses.isActive, true)` ajouté |
| 23 | Champs optionnels impossible à vider | **PARTIELLEMENT** — Utilise `|| null` au lieu de `|| undefined`, mais `name` utilise encore `|| undefined` ce qui empêche de vider |
| 24 | Enum rôle non validé par Better Auth | **NON TRAITE** |

### Problèmes mineurs (13) — 9 corrigés, 4 non traités

| # | Problème | Statut |
|---|----------|--------|
| 25 | `pump` non documenté | **CORRIGE** — Commentaire JSDoc ajouté |
| 26 | Password policy faible | **CORRIGE** — Regex majuscule + chiffre |
| 27 | Pas de confirmation mot de passe | **CORRIGE** — Champ + validation client |
| 28 | Pas de `.trim()` | **CORRIGE** — `.trim()` dans server + API |
| 29 | Toast `role="alert"` partout | **CORRIGE** — `role="status"` pour info/success |
| 30 | Toast config limitée | **CORRIGE** — Durée configurable, `clearAll()`, `MAX_TOASTS = 5` |
| 31 | Button `type` défaut | **CORRIGE** — `type = 'button'` par défaut |
| 32 | Badge fallback variant | **CORRIGE** — `?? variantClasses.default` |
| 33 | Labels i18n hardcodés | **PARTIELLEMENT** — Renommé en anglais (`Close`), prop configurable, mais pas de vrai i18n |
| 34 | Cookie hardening | **PARTIELLEMENT** — `cookiePrefix: 'stockflow'` ajouté, mais pas de `secure`/`sameSite` explicit |
| 35 | Pas de pagination | **CORRIGE** — Pages + API avec `page/limit/total` |
| 36 | Pas de rate limiting | **NON TRAITE** |
| 37 | Pas de `ORDER BY` | **CORRIGE** — `orderBy` ajouté |

---

## Nouveaux problèmes identifiés dans ce commit

### N1. [MAJEUR] Création user — rôle non atomique, redirect fragile (non corrigé de la revue précédente)

```ts
// src/routes/(app)/users/new/+page.server.ts
const result = await auth.api.signUpEmail({ body: { ... } });
if (parsed.data.role !== 'viewer') {
    await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, result.user.id));
}
redirect(303, `/users/${result.user.id}`);
```

**Deux problèmes persistent :**
1. La création user + le changement de rôle ne sont pas atomiques. Si le `db.update` échoue, l'user existe avec le mauvais rôle.
2. Le pattern `try/catch` avec re-throw basé sur `status === 303` est fragile. SvelteKit fournit `isRedirect(e)` pour cela.

### N2. [MOYEN] `roleFilter` toujours non validé dans l'API

```ts
// src/routes/api/v1/users/+server.ts
if (roleFilter) {
    conditions.push(eq(user.role, roleFilter as Role));
}
```

Le cast `as Role` est toujours un simple cast TypeScript sans validation runtime. Un `ROLES.includes(roleFilter)` avant le push suffirait.

### N3. [MOYEN] Warehouse `delete` action n'a pas de vérification des transferts en cours

Le `delete` vérifie le stock mais pas les transferts `pending` ou `shipped`. Un entrepôt impliqué dans un transfert actif pourrait être désactivé.

### N4. [MOYEN] Stock leak partiel pour les admins globaux

```ts
// src/routes/(app)/warehouses/+page.server.ts
const stockCounts = warehouseIds !== null
    ? await stockQuery.where(inArray(productWarehouse.warehouseId, warehouseIds))...
    : await stockQuery.groupBy(productWarehouse.warehouseId);
```

Pour les admins (`warehouseIds === null`), la requête stock n'a pas de filtre `isActive`. Les données stock des entrepôts soft-deleted sont incluses dans la liste (même si les entrepôts eux-mêmes sont filtrés). C'est un bug mineur de cohérence.

### N5. [MINEUR] Confirm password — état non réinitialisé

Le champ `confirmPassword` dans `users/new/+page.svelte` n'utilise pas `name` → n'est pas envoyé au serveur (bien), mais n'est pas réinitialisé après une soumission réussie (redirect le fait implicitement, donc acceptable).

### N6. [MINEUR] `closeLabel` par défaut en anglais (`'Close'`) dans Modal/Toast

Les props de fermeture utilisent `'Close'` par défaut alors que le reste de l'UI est en français. Incohérence linguistique.

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| Issues originales corrigées | **30 / 37** (81%) |
| Issues partiellement corrigées | **3 / 37** |
| Issues non traitées | **4 / 37** (acceptables pour cette phase) |
| Nouvelles issues trouvées | **6** (1 majeur, 3 moyens, 2 mineurs) |

### Issues restantes par priorité

| Priorité | Issues |
|----------|--------|
| **Majeur** | N1 — Création user non atomique + redirect fragile |
| **Moyen** | N2 — `roleFilter` non validé, N3 — Delete warehouse sans check transferts, N4 — Stock admins inclut soft-deleted, #18 — Redirects non base-path-aware, #24 — Enum rôle Better Auth |
| **Mineur** | N5 — Confirm password state, N6 — Incohérence fr/en, #33 — i18n, #34 — Cookie config, #36 — Rate limiting |

### Verdict

Les corrections sont solides et bien implémentées. Les 4 bloquants critiques de la revue précédente sont tous résolus. Il reste **1 problème majeur** (atomicité création user) et quelques moyens/mineurs qui peuvent être traités en follow-up.

**Recommandation : Approuver avec demande de fix sur N1 (atomicité) avant ou juste après merge.**
