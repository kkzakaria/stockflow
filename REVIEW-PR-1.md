# Revue de code — PR #1 : Week 1 Foundations (4e passe)

## Vue d'ensemble

24 commits sur `feat/week1-foundations`. Dernier commit : `a5b5ac8`.

---

## Vérification des 4 issues restantes (N1-N4)

### N1. Création user non atomique + redirect fragile — CORRIGE

**Avant :**
```ts
try {
    const result = await auth.api.signUpEmail({ ... });
    await db.update(user).set({ role }).where(eq(user.id, result.user.id));
    redirect(303, `/users/${result.user.id}`);
} catch (e) {
    if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 303) {
        throw e; // ← fragile
    }
}
```

**Après :**
```ts
try {
    const result = await auth.api.signUpEmail({ ... });
    createdUserId = result.user.id;
    if (parsed.data.role !== 'viewer') {
        await db.update(user).set({ role }).where(eq(user.id, createdUserId));
    }
    redirect(303, `/users/${createdUserId}`);
} catch (e) {
    if (isRedirect(e)) throw e;  // ← isRedirect() de SvelteKit
    if (createdUserId) {
        await db.update(user).set({ isActive: false }).where(eq(user.id, createdUserId));
    }
}
```

- `isRedirect()` remplace le pattern fragile de détection manuelle
- Cleanup en cas d'échec : l'user partiellement créé est désactivé

**Note :** La désactivation est un bon compromis, mais idéalement une suppression complète (`db.delete`) serait plus propre car l'user n'a jamais été fonctionnel. Cependant, la désactivation est acceptable car elle est cohérente avec le pattern soft-delete du projet.

### N2. `roleFilter` non validé dans l'API — CORRIGE

```ts
if (roleFilter) {
    if (!ROLES.includes(roleFilter as (typeof ROLES)[number])) {
        error(400, { message: `Invalid role filter: ${roleFilter}` });
    }
    conditions.push(eq(user.role, roleFilter as Role));
}
```

Validation runtime avec `ROLES.includes()` avant le cast + erreur 400 explicite.

**Note mineure :** Le message d'erreur expose la valeur brute `roleFilter` dans la réponse. En production, éviter de refléter l'input utilisateur dans les erreurs (risque XSS si le message est rendu en HTML côté client). Préférer un message générique : `'Filtre de rôle invalide'`.

### N3. Delete warehouse sans check transferts — CORRIGE

```ts
const activeStatuses = ['pending', 'approved', 'shipped'] as const;
const activeTransfer = await db.query.transfers.findFirst({
    where: and(
        inArray(transfers.status, [...activeStatuses]),
        sql`(${transfers.sourceWarehouseId} = ${params.id} OR ${transfers.destinationWarehouseId} = ${params.id})`
    )
});
if (activeTransfer) {
    return fail(409, { deleteError: 'Impossible de supprimer un entrepot avec des transferts en cours.' });
}
```

Vérifie les transferts `pending`, `approved` et `shipped` avant soft-delete. L'ajout de `approved` au-delà de ce qui avait été demandé est pertinent.

### N4. Stock admins inclut soft-deleted — CORRIGE

```ts
.from(productWarehouse)
.innerJoin(products, eq(productWarehouse.productId, products.id))
// ...
.where(eq(products.isActive, true))
```

`innerJoin` sur `products` + filtre `isActive = true` appliqué dans les **deux** branches (admin global ET rôles restreints). Les stats stock de la page détail warehouse ont aussi reçu le même fix.

---

## Bilan final complet

### Toutes les issues depuis le début (37 originales + 6 nouvelles = 43)

| Statut | Nombre | % |
|--------|--------|---|
| **Corrigé** | **34** | 79% |
| **Partiellement corrigé** | **3** | 7% |
| **Non traité (acceptable)** | **6** | 14% |
| **Bloquant** | **0** | 0% |

### Issues partiellement corrigées (follow-up)

| # | Issue | Détail |
|---|-------|--------|
| 23 | Champs optionnels warehouse | `name` utilise `|| undefined` (ne peut être vidé) |
| 33 | Labels i18n | Props configurables mais pas de vrai système i18n |
| 34 | Cookie hardening | `cookiePrefix` OK, pas de `secure`/`sameSite` explicit |

### Issues non traitées (backlog)

| # | Issue | Priorité |
|---|-------|----------|
| 18 | Redirects serveur non base-path-aware | Moyen |
| 21 | Pas d'audit logging | Moyen |
| 24 | Enum rôle non validé côté Better Auth | Moyen |
| 36 | Pas de rate limiting auth | Mineur |
| N5 | Confirm password state | Mineur |
| N6 | `closeLabel` en anglais par défaut | Mineur |

---

## Verdict final

**APPROUVE**

Plus aucun problème bloquant ni critique. Les 43 issues identifiées au total ont été traitées à 79%, avec le reste classé en follow-up acceptable. Les corrections sont propres, bien implémentées, et montrent une bonne compréhension des problèmes signalés.

Les issues restantes sont mineures et peuvent être traitées dans des PRs ultérieures sans risque pour la stabilité ou la sécurité de la base de code.
