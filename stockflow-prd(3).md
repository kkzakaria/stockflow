# StockFlow — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 5 février 2026  
**Auteur:** [À compléter]  
**Statut:** Draft

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Vision et objectifs](#2-vision-et-objectifs)
3. [Personas utilisateurs](#3-personas-utilisateurs)
4. [Rôles et permissions](#4-rôles-et-permissions)
5. [Périmètre fonctionnel V1](#5-périmètre-fonctionnel-v1)
6. [User Stories V1](#6-user-stories-v1)
7. [Architecture technique](#7-architecture-technique)
8. [Modèle de données](#8-modèle-de-données)
9. [Spécifications API](#9-spécifications-api)
10. [Interface utilisateur](#10-interface-utilisateur)
11. [Notifications et alertes](#11-notifications-et-alertes)
12. [Roadmap](#12-roadmap)
13. [Critères de succès](#13-critères-de-succès)
14. [Risques et mitigations](#14-risques-et-mitigations)
15. [Annexes](#15-annexes)

---

## 1. Résumé exécutif

### 1.1 Contexte

L'entreprise utilise actuellement une solution de gestion de stock qui ne répond plus aux besoins opérationnels :
- Absence de gestion multi-entrepôts
- Pas de suivi des transferts entre entrepôts
- Aucune version mobile pour les équipes terrain

### 1.2 Solution proposée

**StockFlow** est une application web moderne de gestion de stock multi-entrepôts, construite avec Svelte et hébergée sur l'infrastructure Cloudflare (Workers, D1, Pages). L'application offre :
- Gestion complète du stock sur plusieurs entrepôts
- Workflow de transfert avec validation
- Interface responsive pour usage mobile
- Traçabilité complète des opérations
- Système d'alertes multi-canal

### 1.3 Chiffres clés

| Métrique | Valeur |
|----------|--------|
| Entrepôts | ~10 (extensible) |
| Produits | ~3 000 |
| Mouvements/jour | ~500 |
| Utilisateurs simultanés | ~20 |
| Délai V1 | 4 semaines |

### 1.4 Stack technique

- **Frontend:** SvelteKit
- **Backend:** Cloudflare Workers
- **Base de données:** Cloudflare D1 (SQLite)
- **Authentification:** Better Auth (email/password, sessions, RBAC)
- **ORM:** Drizzle ORM (adapter D1)
- **Hébergement:** Cloudflare Pages + Workers
- **Abonnement:** Cloudflare Pro

---

## 2. Vision et objectifs

### 2.1 Vision

> Offrir à l'équipe un outil centralisé, rapide et accessible partout pour piloter le stock en temps réel, avec une traçabilité complète et des workflows adaptés aux opérations multi-sites.

### 2.2 Objectifs stratégiques

| Objectif | Indicateur de succès |
|----------|---------------------|
| Centraliser la gestion du stock | 100% des entrepôts gérés dans StockFlow |
| Fluidifier les transferts | Temps de traitement d'un transfert < 24h |
| Mobilité terrain | 80% des opérations terrain faites sur mobile |
| Traçabilité | 100% des mouvements tracés avec horodatage |
| Fiabilité du stock | Écart inventaire < 2% |

### 2.3 Principes directeurs

1. **Mobile-first** — L'interface doit être parfaitement utilisable sur smartphone
2. **Performance** — Temps de réponse < 200ms grâce à l'edge computing
3. **Simplicité** — UX intuitive, courbe d'apprentissage minimale
4. **Extensibilité** — Architecture API-first pour les futures intégrations
5. **Traçabilité** — Chaque action est loguée et auditable

---

## 3. Personas utilisateurs

### 3.1 Amadou — Administrateur système

- **Rôle:** Admin
- **Responsabilités:** Configuration globale, gestion des utilisateurs, supervision
- **Besoins:** Vue d'ensemble sur tous les entrepôts, rapports consolidés, gestion des accès
- **Frustrations:** Manque de visibilité globale, difficultés à auditer les actions

### 3.2 Fatou — Responsable logistique

- **Rôle:** Admin gestionnaire
- **Responsabilités:** Coordination des stocks entre entrepôts, validation des transferts
- **Besoins:** Approuver/rejeter les demandes de transfert, voir les niveaux de stock partout
- **Frustrations:** Processus de transfert manuel et non traçable

### 3.3 Moussa — Chef d'entrepôt

- **Rôle:** Gestionnaire
- **Responsabilités:** Gestion quotidienne de son entrepôt
- **Besoins:** Enregistrer entrées/sorties, initier des transferts, faire des inventaires
- **Frustrations:** Pas d'outil mobile pour travailler dans l'entrepôt

### 3.4 Awa — Magasinière

- **Rôle:** Utilisateur
- **Responsabilités:** Opérations terrain (réception, préparation, expédition)
- **Besoins:** Saisie rapide des mouvements sur mobile, consultation du stock
- **Frustrations:** Doit retourner au bureau pour chaque saisie

### 3.5 Ibrahim — Contrôleur de gestion

- **Rôle:** Admin visiteur
- **Responsabilités:** Suivi financier et reporting
- **Besoins:** Consultation des valorisations de stock, export de données
- **Frustrations:** Données dispersées, pas de vue consolidée

### 3.6 Koné — Auditeur externe

- **Rôle:** Visiteur
- **Responsabilités:** Vérification ponctuelle
- **Besoins:** Accès lecture seule à un entrepôt spécifique
- **Frustrations:** Processus d'accès aux données complexe

---

## 4. Rôles et permissions

### 4.1 Matrice des permissions

| Permission | Admin | Admin Gestionnaire | Gestionnaire | Utilisateur | Admin Visiteur | Visiteur |
|------------|:-----:|:------------------:|:------------:|:-----------:|:--------------:|:--------:|
| **Utilisateurs** |
| Créer/modifier/supprimer utilisateurs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assigner rôles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assigner entrepôts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Entrepôts** |
| Créer/modifier/supprimer entrepôts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Voir tous les entrepôts | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Voir entrepôts assignés | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Produits** |
| Créer produits | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modifier produits | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ |
| Supprimer produits | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir produits (tous) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Voir produits (assignés) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Mouvements** |
| Créer mouvements (tous) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer mouvements (assignés) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Voir mouvements (tous) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Voir mouvements (assignés) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Transferts** |
| Initier transfert | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approuver transfert | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Expédier transfert | ✅ | ✅ | ✅** | ❌ | ❌ | ❌ |
| Réceptionner transfert | ✅ | ✅ | ✅** | ❌ | ❌ | ❌ |
| **Inventaires** |
| Créer inventaire | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Participer inventaire | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider inventaire | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Paramètres** |
| Configuration système | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gérer catégories produits | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Logs & Rapports** |
| Voir logs (tous) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Voir logs (assignés) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exporter données | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

*\* Utilisateur : modification limitée (quantités lors des mouvements)*  
*\*\* Gestionnaire : uniquement pour son entrepôt (source ou destination)*

### 4.2 Portée des données

| Rôle | Portée |
|------|--------|
| Admin | Globale |
| Admin Gestionnaire | Globale |
| Gestionnaire | Entrepôt(s) assigné(s) |
| Utilisateur | Entrepôt assigné |
| Admin Visiteur | Globale (lecture) |
| Visiteur | Entrepôt assigné (lecture) |

---

## 5. Périmètre fonctionnel V1

### 5.1 Dans le périmètre V1 ✅

#### Module Authentification
- Inscription par invitation (admin crée le compte)
- Connexion email / mot de passe (Better Auth)
- Gestion des sessions (Better Auth + Drizzle + D1)
- Réinitialisation de mot de passe par email
- Déconnexion

#### Module Utilisateurs
- CRUD utilisateurs
- Attribution des rôles
- Assignation aux entrepôts
- Activation/désactivation de comptes

#### Module Entrepôts
- CRUD entrepôts
- Informations : nom, adresse, contact, statut
- Configuration du stock minimum par produit/entrepôt

#### Module Produits
- CRUD produits
- Attributs : SKU, nom, description, catégorie, unité
- Prix d'achat et prix de vente (XOF)
- Stock minimum global et par entrepôt
- Catégorisation des produits

#### Module Stock
- Visualisation du stock par entrepôt
- Visualisation du stock consolidé
- Stock en temps réel
- Valorisation du stock via **PUMP calculé à l'écriture**
- Formule : PUMP_nouveau = ((Stock_actuel × PUMP_actuel) + (Qté_reçue × Prix_achat)) / (Stock_actuel + Qté_reçue)
- Le PUMP ne change pas lors des sorties, seule la valeur totale diminue

#### Module Mouvements
- Entrées de stock (réception, ajustement+)
- Sorties de stock (vente, ajustement-, perte)
- Historique des mouvements avec filtres
- Motif obligatoire pour chaque mouvement
- **Transactions atomiques** via Drizzle (service stock.ts centralisé)
- **Calcul PUMP à l'écriture** : mise à jour du prix moyen pondéré à chaque entrée

#### Module Scan Codes-barres
- Scan via caméra smartphone (librairie html5-qrcode)
- Recherche instantanée du produit après scan
- Intégration dans les flux : mouvements, inventaire, transferts
- Saisie manuelle du SKU en fallback

#### Module Résilience Réseau
- Détection perte de connexion (navigator.onLine + heartbeat)
- Queue locale des opérations en attente (IndexedDB)
- Retry automatique à la reconnexion
- Indicateur visuel de l'état de connexion
- Prévention de la perte de données formulaire

#### Module Transferts
- Workflow complet en 4 étapes :
  1. **Demande** : création par gestionnaire source
  2. **Approbation** : validation par admin/admin gestionnaire
  3. **Expédition** : confirmation départ par entrepôt source
  4. **Réception** : confirmation arrivée par entrepôt destination
- Annulation possible avant expédition
- **Réception partielle** : gestion des écarts quantité reçue vs expédiée
- **Notification litige** : alerte automatique à l'admin gestionnaire si quantité_reçue < quantité_expédiée
- Commentaire d'anomalie obligatoire en cas d'écart
- Statuts : pending, approved, rejected, shipped, received, partially_received, cancelled, disputed

#### Module Inventaire
- Création de session d'inventaire
- Saisie des comptages
- Calcul automatique des écarts
- Validation et ajustement du stock
- Historique des inventaires

#### Module Alertes
- Alertes stock minimum
- Notification in-app
- Notification email

#### Module Logs
- Journal de toutes les opérations
- Filtres : date, utilisateur, type, entrepôt
- Détail de chaque action (avant/après)

#### API REST
- Endpoints documentés pour futures intégrations
- Authentification API (tokens)
- Rate limiting

#### Interface
- Design responsive (mobile-first)
- Dashboard adapté au rôle
- Navigation intuitive

### 5.2 Hors périmètre V1 ❌ (versions futures)

| Fonctionnalité | Version cible |
|----------------|---------------|
| Génération étiquettes codes-barres | V2 |
| Dates de péremption | V2 |
| Zones/emplacements dans entrepôts | V2 |
| Notifications push | V2 |
| Notifications WhatsApp | V2 |
| Rapports avancés | V2 |
| Mode hors-ligne complet (Service Workers) | V3 |
| Intégration POS | V3 |
| Intégration facturation | V3 |
| Module comptabilité | V3+ |
| Numéros de lot/série | V3 |
| Multi-devises | V3+ |

---

## 6. User Stories V1

### 6.1 Authentification

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| AUTH-01 | En tant qu'utilisateur, je veux me connecter avec email/mot de passe | Must | Formulaire login, validation, redirection dashboard |
| AUTH-02 | En tant qu'utilisateur, je veux être redirigé vers mon dashboard selon mon rôle | Must | Dashboard personnalisé par rôle |
| AUTH-03 | En tant qu'utilisateur, je veux me déconnecter | Must | Session terminée, redirection login |
| AUTH-04 | En tant qu'admin, je veux créer un compte pour un utilisateur (invitation) | Must | Email envoyé avec lien d'inscription |
| AUTH-05 | En tant qu'utilisateur, je veux réinitialiser mon mot de passe | Must | Email avec lien temporaire, expiration 1h |
| AUTH-06 | En tant qu'utilisateur, je veux changer mon mot de passe | Should | Ancien mot de passe requis |

### 6.2 Gestion des utilisateurs

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| USER-01 | En tant qu'admin, je veux créer un nouvel utilisateur | Must | Formulaire complet, validation email unique |
| USER-02 | En tant qu'admin, je veux assigner un rôle à un utilisateur | Must | Liste déroulante des 6 rôles |
| USER-03 | En tant qu'admin, je veux assigner un ou plusieurs entrepôts à un utilisateur | Must | Multi-sélection entrepôts |
| USER-04 | En tant qu'admin, je veux désactiver un utilisateur | Must | Compte inactif, connexion impossible |
| USER-05 | En tant qu'admin, je veux voir la liste des utilisateurs | Must | Tableau avec filtres et recherche |

### 6.3 Gestion des entrepôts

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| WH-01 | En tant qu'admin, je veux créer un entrepôt | Must | Nom, adresse, contact requis |
| WH-02 | En tant qu'admin, je veux modifier un entrepôt | Must | Tous champs éditables |
| WH-03 | En tant qu'admin, je veux désactiver un entrepôt | Must | Entrepôt masqué, stock conservé |
| WH-04 | En tant qu'utilisateur autorisé, je veux voir mes entrepôts | Must | Liste filtrée selon permissions |

### 6.4 Gestion des produits

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| PROD-01 | En tant que gestionnaire, je veux créer un produit | Must | SKU unique, tous champs requis |
| PROD-02 | En tant que gestionnaire, je veux définir les prix d'achat/vente | Must | Montants en XOF, décimales |
| PROD-03 | En tant que gestionnaire, je veux définir un stock minimum global | Must | Quantité numérique |
| PROD-04 | En tant que gestionnaire, je veux définir un stock minimum par entrepôt | Must | Override du minimum global |
| PROD-05 | En tant qu'utilisateur, je veux rechercher un produit | Must | Recherche par SKU, nom, catégorie |
| PROD-06 | En tant qu'utilisateur, je veux voir le détail d'un produit | Must | Tous attributs + stock par entrepôt |
| PROD-07 | En tant que gestionnaire, je veux catégoriser les produits | Should | Catégories hiérarchiques |

### 6.5 Mouvements de stock

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| MOV-01 | En tant qu'utilisateur, je veux enregistrer une entrée de stock | Must | Produit, qté, motif, date |
| MOV-02 | En tant qu'utilisateur, je veux enregistrer une sortie de stock | Must | Contrôle stock suffisant via transaction atomique |
| MOV-03 | En tant qu'utilisateur, je veux ajouter un motif à chaque mouvement | Must | Liste de motifs + champ libre |
| MOV-04 | En tant qu'utilisateur, je veux voir l'historique des mouvements | Must | Filtres date, produit, type |
| MOV-05 | En tant que visiteur, je veux voir les mouvements (lecture seule) | Must | Pas de bouton d'action |
| MOV-06 | En tant qu'utilisateur, le PUMP doit être recalculé à chaque entrée | Must | Formule PUMP appliquée, valeur stockée dans product_warehouse |

### 6.6 Scan codes-barres

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| SCAN-01 | En tant qu'utilisateur mobile, je veux scanner un code-barres pour trouver un produit | Must | Ouverture caméra, scan, affichage fiche produit |
| SCAN-02 | En tant qu'utilisateur, je veux scanner un produit pour enregistrer une entrée/sortie rapide | Must | Scan → formulaire pré-rempli avec le produit |
| SCAN-03 | En tant qu'utilisateur, je veux saisir le SKU manuellement si le scan échoue | Must | Champ de saisie en fallback |
| SCAN-04 | En tant qu'utilisateur, je veux scanner plusieurs produits à la suite lors d'un inventaire | Should | Mode scan continu |

### 6.7 Résilience réseau

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| NET-01 | En tant qu'utilisateur, je veux voir l'état de ma connexion dans l'app | Must | Indicateur visuel online/offline |
| NET-02 | En tant qu'utilisateur, je veux que mes saisies soient conservées si je perds la connexion | Must | Queue locale IndexedDB, aucune perte de données |
| NET-03 | En tant qu'utilisateur, je veux que mes opérations en attente soient envoyées automatiquement à la reconnexion | Must | Retry automatique, notification de succès/échec |
| NET-04 | En tant qu'utilisateur, je veux voir les opérations en attente de synchronisation | Should | Badge compteur + liste des opérations pending |

### 6.8 Transferts entre entrepôts

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| TRF-01 | En tant que gestionnaire, je veux créer une demande de transfert | Must | Source, destination, produits, qtés |
| TRF-02 | En tant qu'admin gestionnaire, je veux approuver une demande | Must | Bouton approuver/rejeter, commentaire |
| TRF-03 | En tant qu'admin gestionnaire, je veux rejeter une demande avec motif | Must | Motif obligatoire |
| TRF-04 | En tant que gestionnaire source, je veux confirmer l'expédition | Must | Date expédition, stock source décrémenté |
| TRF-05 | En tant que gestionnaire destination, je veux confirmer la réception | Must | Qté reçue, écart éventuel |
| TRF-06 | En tant qu'utilisateur, je veux suivre le statut d'un transfert | Must | Timeline visuelle du workflow |
| TRF-07 | En tant que gestionnaire, je veux annuler un transfert avant expédition | Should | Statut annulé, stock inchangé |
| TRF-08 | En tant que gestionnaire destination, je veux signaler une réception partielle | Must | Saisie qté reçue ≠ qté expédiée, commentaire anomalie obligatoire |
| TRF-09 | En tant qu'admin gestionnaire, je veux être notifié d'un litige de transfert | Must | Alerte auto si qté_reçue < qté_expédiée, email + in-app |
| TRF-10 | En tant qu'admin gestionnaire, je veux résoudre un litige de transfert | Should | Validation de l'écart, ajustement de stock, clôture du litige |

### 6.9 Inventaire

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| INV-01 | En tant que gestionnaire, je veux créer une session d'inventaire | Must | Date, entrepôt, produits concernés |
| INV-02 | En tant qu'utilisateur, je veux saisir les quantités comptées | Must | Interface mobile-friendly |
| INV-03 | En tant que gestionnaire, je veux voir les écarts calculés | Must | Stock système vs compté |
| INV-04 | En tant que gestionnaire, je veux valider l'inventaire | Must | Ajustement automatique du stock |
| INV-05 | En tant qu'admin, je veux voir l'historique des inventaires | Must | Date, entrepôt, écarts |

### 6.10 Alertes

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| ALT-01 | En tant qu'utilisateur, je veux être alerté quand un stock passe sous le minimum | Must | Notification in-app |
| ALT-02 | En tant qu'utilisateur, je veux recevoir les alertes par email | Must | Email automatique |
| ALT-03 | En tant qu'utilisateur, je veux voir toutes mes alertes dans l'app | Must | Centre de notifications |
| ALT-04 | En tant qu'utilisateur, je veux marquer une alerte comme lue | Should | Statut lu/non lu |

### 6.11 Logs et traçabilité

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| LOG-01 | En tant qu'admin, je veux voir le journal de toutes les actions | Must | Liste chronologique |
| LOG-02 | En tant qu'admin, je veux filtrer les logs | Must | Par date, user, type, entrepôt |
| LOG-03 | En tant qu'admin, je veux voir le détail d'une action | Must | Valeurs avant/après |
| LOG-04 | En tant que gestionnaire, je veux exporter les logs | Should | Format CSV |

### 6.12 Dashboard

| ID | User Story | Priorité | Critères d'acceptation |
|----|------------|----------|------------------------|
| DASH-01 | En tant qu'admin, je veux voir un dashboard global | Must | KPIs tous entrepôts |
| DASH-02 | En tant que gestionnaire, je veux voir le dashboard de mon entrepôt | Must | KPIs entrepôt assigné |
| DASH-03 | En tant qu'utilisateur, je veux voir les alertes actives | Must | Badge compteur |
| DASH-04 | En tant qu'utilisateur, je veux voir les transferts en cours | Must | Liste des transferts pending |

---

## 7. Architecture technique

### 7.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │   Cloudflare    │    │        Cloudflare Workers           │ │
│  │     Pages       │───▶│        (API + SvelteKit)            │ │
│  │   (Frontend)    │    │                                     │ │
│  │   SvelteKit     │    │  ┌────────────┐ ┌───────────────┐  │ │
│  └─────────────────┘    │  │Better Auth │ │ Business Logic│  │ │
│                         │  │(Auth+RBAC) │ │  (API REST)   │  │ │
│                         │  └─────┬──────┘ └───────┬───────┘  │ │
│                         └────────┼────────────────┼──────────┘ │
│                                  │                │            │
│                         ┌────────┴────────────────┴──────────┐ │
│                         │          Drizzle ORM               │ │
│                ┌────────▼────────┐              ┌────────────▼┐│
│                │  Cloudflare D1  │              │     KV      ││
│                │   (Database)    │              │   (Cache)   ││
│                └─────────────────┘              └─────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Stack technique détaillé

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | SvelteKit | Performance, SSR, intégration native Cloudflare |
| **Styling** | Tailwind CSS | Utility-first, responsive, productivité |
| **UI Components** | Skeleton UI ou custom | Composants Svelte-natifs |
| **Backend API** | Cloudflare Workers | Edge computing, latence minimale |
| **Base de données** | Cloudflare D1 | SQLite serverless, intégré Workers |
| **Cache** | Cloudflare KV | Sessions, cache fréquent |
| **Auth** | Better Auth | Email/password, RBAC, plugins admin/organisation |
| **ORM** | Drizzle ORM | TypeScript, zero-dep, adapter D1 natif |
| **Email** | Cloudflare Email Workers | Notifications email |
| **Hosting** | Cloudflare Pages | Déploiement automatique, preview |

### 7.3 Structure du projet

```
stockflow/
├── src/
│   ├── lib/
│   │   ├── components/        # Composants Svelte réutilisables
│   │   │   ├── ui/           # Boutons, inputs, modals...
│   │   │   ├── layout/       # Header, sidebar, footer
│   │   │   ├── products/     # Composants produits
│   │   │   ├── movements/    # Composants mouvements
│   │   │   ├── transfers/    # Composants transferts
│   │   │   └── inventory/    # Composants inventaire
│   │   ├── server/           # Code serveur uniquement
│   │   │   ├── db/           # Drizzle schema (schema.ts) + seed
│   │   │   ├── auth/         # Better Auth config + helpers
│   │   │   └── services/     # Business logic (stock.ts, etc.)
│   │   ├── stores/           # Svelte stores (état global)
│   │   ├── utils/            # Helpers, formatters
│   │   └── types/            # TypeScript types
│   ├── routes/
│   │   ├── (app)/            # Routes authentifiées
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── warehouses/
│   │   │   ├── movements/
│   │   │   ├── transfers/
│   │   │   ├── inventory/
│   │   │   ├── users/
│   │   │   ├── alerts/
│   │   │   ├── logs/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/[...betterauth]/  # Better Auth handler
│   │   │   └── v1/                    # API REST endpoints
│   │   └── (auth)/           # Login, reset password, setup account
│   └── app.html
├── src/auth.ts               # Better Auth configuration
├── static/
├── drizzle/                  # Drizzle migrations (générées pour la prod)
├── drizzle.config.ts         # Drizzle Kit config (push dev / migrate prod)
├── wrangler.toml             # Config Cloudflare
├── svelte.config.js
├── tailwind.config.js
└── package.json
```

### 7.4 Sécurité

| Aspect | Implémentation |
|--------|----------------|
| Authentification | Better Auth (email/password, sessions httpOnly, scrypt) |
| Autorisation | Middleware vérifiant rôle + scope entrepôt |
| HTTPS | Forcé par Cloudflare |
| CORS | Configuré strictement |
| Rate Limiting | Cloudflare + Workers |
| Validation | Zod côté serveur |
| SQL Injection | Requêtes préparées D1 |
| XSS | Sanitization + CSP headers |
| CSRF | SvelteKit protection native |

### 7.5 Service Stock — Transactions atomiques

Toutes les opérations de stock passent par un service centralisé (`src/lib/server/services/stock.ts`) utilisant les transactions Drizzle pour garantir l'atomicité.

```typescript
// src/lib/server/services/stock.ts (simplifié)
export const stockService = {
  async recordMovement(data: {
    productId: string;
    warehouseId: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason: string;
    userId: string;
    purchasePrice?: number; // Requis pour les entrées (calcul PUMP)
  }) {
    return await db.transaction(async (tx) => {
      const delta = data.type === 'out' ? -data.quantity : data.quantity;

      // Vérification stock suffisant (sorties)
      if (data.type === 'out') {
        const [current] = await tx.select()
          .from(product_warehouse)
          .where(and(
            eq(product_warehouse.productId, data.productId),
            eq(product_warehouse.warehouseId, data.warehouseId)
          ));
        if (!current || current.quantity < data.quantity) {
          throw new Error("Stock insuffisant");
        }
      }

      // Écriture mouvement
      await tx.insert(movements).values({ ...data });

      // Mise à jour stock + PUMP (ON CONFLICT pour initialisation)
      await tx.insert(product_warehouse)
        .values({ ...initialValues })
        .onConflictDoUpdate({
          target: [product_warehouse.productId, product_warehouse.warehouseId],
          set: {
            quantity: sql`${product_warehouse.quantity} + ${delta}`,
            pump: data.type === 'in'
              ? sql`((${product_warehouse.quantity} * ${product_warehouse.pump})
                  + (${data.quantity} * ${data.purchasePrice}))
                  / (${product_warehouse.quantity} + ${data.quantity})`
              : product_warehouse.pump,
            updatedAt: new Date().toISOString(),
          },
        });
    });
  }
};
```

**Principes clés :**
- Atomicité : si une écriture échoue, tout est rollback
- Intégrité : contrôle de stock dans la transaction (pas de race condition)
- PUMP : calcul SQL côté DB (plus sûr et performant que côté JS)
- Performance : `onConflictDoUpdate` évite un SELECT + INSERT/UPDATE séparé

### 7.6 Calcul PUMP (Prix Unitaire Moyen Pondéré)

**Formule appliquée à chaque entrée de stock :**

```
PUMP_nouveau = ((Stock_actuel × PUMP_actuel) + (Qté_reçue × Prix_achat)) / (Stock_actuel + Qté_reçue)
```

| Événement | Impact PUMP |
|-----------|-------------|
| Entrée (achat/réception) | Recalculé selon la formule |
| Sortie (vente/perte) | Inchangé |
| Transfert expédition | Inchangé (le PUMP suit le produit) |
| Transfert réception | Le PUMP de l'entrepôt destination est recalculé |
| Ajustement (+) | Recalculé avec le prix d'achat courant |
| Ajustement (-) | Inchangé |

**Valorisation du stock :**
- Par entrepôt : `Σ (quantité × PUMP)` pour chaque produit
- Globale : somme des valorisations de tous les entrepôts

### 7.7 Résilience réseau

Architecture de la queue locale pour les opérations offline-tolerant :

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Formulaire  │────▶│   Queue      │────▶│   API        │
│  (Svelte)    │     │  (IndexedDB) │     │  (Workers)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │  navigator.onLine  │   Retry auto        │
       │◄───────────────────│   sur reconnexion   │
       │                    ▼                     │
  ┌──────────┐      ┌──────────────┐     ┌──────────────┐
  │ Indicateur│     │  Opérations  │     │  Confirmation│
  │ visuel    │     │  pending     │     │  serveur     │
  └──────────┘      └──────────────┘     └──────────────┘
```

**Flux :**
1. L'utilisateur soumet un formulaire
2. L'opération est stockée dans IndexedDB immédiatement
3. Tentative d'envoi au serveur
4. Si échec réseau → opération reste en queue, indicateur offline affiché
5. À la reconnexion → retry automatique dans l'ordre chronologique
6. Succès → suppression de la queue, toast de confirmation

**Opérations concernées (V1) :** Mouvements (entrées/sorties), saisie d'inventaire

**Opérations NON concernées (requièrent validation serveur) :** Transferts (workflow multi-étapes), création/modification produits, gestion utilisateurs

### 7.8 Stratégie de gestion du schéma DB (Drizzle Kit)

Pour accélérer le développement, deux modes de synchronisation du schéma sont utilisés selon l'environnement :

| Environnement | Commande | Stratégie |
|---------------|----------|-----------|
| **Développement local** | `drizzle-kit push` | Push direct du schéma → DB locale, sans fichiers de migration |
| **Staging / Production** | `drizzle-kit generate` + `drizzle-kit migrate` | Génération de migrations SQL versionnées, appliquées via wrangler |

**Configuration Drizzle Kit :**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  ...(process.env.NODE_ENV === 'production'
    ? {
        // Production : migrations via wrangler d1 migrations apply
        driver: 'd1-http',
        dbCredentials: {
          accountId: process.env.CF_ACCOUNT_ID!,
          databaseId: process.env.CF_DATABASE_ID!,
          token: process.env.CF_D1_TOKEN!,
        },
      }
    : {
        // Dev : push direct sur la DB locale D1
        dbCredentials: {
          url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<db-id>/db.sqlite',
        },
      }),
});
```

**Scripts npm recommandés :**

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply stockflow-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply stockflow-db --remote",
    "db:studio": "drizzle-kit studio",
    "db:seed": "wrangler d1 execute stockflow-db --local --file=./drizzle/seed.sql"
  }
}
```

**Workflow développeur :**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DÉVELOPPEMENT (Semaines 1-3)                 │
│                                                                 │
│  1. Modifier schema.ts                                         │
│  2. npm run db:push          ← Sync immédiat, pas de migration │
│  3. Tester                                                     │
│  4. Itérer librement sur le schéma                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    PRÉ-PRODUCTION (Semaine 4)                  │
│                                                                 │
│  1. Figer le schéma                                            │
│  2. npm run db:generate      ← Génère les fichiers .sql       │
│  3. Vérifier les migrations générées                           │
│  4. npm run db:migrate:prod  ← Applique sur D1 distant        │
│  5. Déployer l'application                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    POST-LANCEMENT (V1+)                         │
│                                                                 │
│  Toujours utiliser generate + migrate pour les changements     │
│  de schéma en production. Le push direct est interdit.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Avantages de cette approche :**
- **Gain de temps massif** en dev : pas de fichiers de migration à gérer pendant l'itération rapide du schéma
- **Drizzle Studio** (`npm run db:studio`) pour explorer la DB visuellement pendant le dev
- **Sécurité en prod** : migrations versionnées, revue possible avant application, rollback traçable
- **Compatible Better Auth** : `npx @better-auth/cli generate` produit le schéma Drizzle, ensuite `db:push` le synchronise immédiatement

---

## 8. Modèle de données

### 8.1 Diagramme entité-relation

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    user      │       │  warehouses  │       │  categories  │
│ (Better Auth)│       ├──────────────┤       ├──────────────┤
├──────────────┤       │ id (PK)      │       │ id (PK)      │
│ id (PK)      │       │ name         │       │ name         │
│ email        │       │ address      │       │ parent_id    │
│ name         │       │ contact      │       │ created_at   │
│ role         │       │ is_active    │       └──────────────┘
│ is_active    │       │ created_at   │              │
│ created_at   │       │ updated_at   │              │
│ updated_at   │       └──────┬───────┘              │
└──────┬───────┘              │                      │
       │                      │                      │
       ├────────────────┐     │                      │
       │                │     │                      │
       ▼                │     │                      │
┌──────────────┐        │     │                      │
│   session    │        │     │                      │
│ (Better Auth)│        │     │                      │
├──────────────┤        │     │                      │
│ id (PK)      │        │     │                      │
│ userId (FK)  │        │     │                      │
│ expiresAt    │        │     │                      │
│ token        │        │     │                      │
└──────────────┘        │     │                      │
                        │     │                      │
       │    ┌───────────┴─────┴──────────────┐      │
       │    │                                │      │
       ▼    ▼                                ▼      ▼
┌──────────────────┐                 ┌──────────────────┐
│ user_warehouses  │                 │     products     │
├──────────────────┤                 ├──────────────────┤
│ user_id (FK)     │                 │ id (PK)          │
│ warehouse_id(FK) │                 │ sku              │
└──────────────────┘                 │ name             │
                                     │ description      │
                                     │ category_id (FK) │
       ┌─────────────────────────────│ unit             │
       │                             │ purchase_price   │
       │                             │ sale_price       │
       │                             │ min_stock        │
       │                             │ is_active        │
       ▼                             │ created_at       │
┌──────────────────┐                 │ updated_at       │
│ product_warehouse│                 └────────┬─────────┘
├──────────────────┤                          │
│ product_id (FK)  │◄─────────────────────────┘
│ warehouse_id(FK) │
│ quantity         │
│ min_stock        │
│ updated_at       │
└──────────────────┘
       │
       │         ┌──────────────────┐
       │         │    movements     │
       │         ├──────────────────┤
       └────────▶│ id (PK)          │
                 │ product_id (FK)  │
                 │ warehouse_id(FK) │
                 │ type             │
                 │ quantity         │
                 │ reason           │
                 │ reference        │
                 │ user_id (FK)     │
                 │ created_at       │
                 └──────────────────┘

┌──────────────────┐       ┌──────────────────────┐
│    transfers     │       │   transfer_items     │
├──────────────────┤       ├──────────────────────┤
│ id (PK)          │───────│ transfer_id (FK)     │
│ source_wh (FK)   │       │ product_id (FK)      │
│ dest_wh (FK)     │       │ quantity_requested   │
│ status           │       │ quantity_sent        │
│ requested_by(FK) │       │ quantity_received    │
│ approved_by (FK) │       └──────────────────────┘
│ requested_at     │
│ approved_at      │
│ shipped_at       │
│ received_at      │
│ notes            │
└──────────────────┘

┌──────────────────┐       ┌──────────────────────┐
│   inventories    │       │   inventory_items    │
├──────────────────┤       ├──────────────────────┤
│ id (PK)          │───────│ inventory_id (FK)    │
│ warehouse_id(FK) │       │ product_id (FK)      │
│ status           │       │ system_quantity      │
│ created_by (FK)  │       │ counted_quantity     │
│ validated_by(FK) │       │ difference           │
│ created_at       │       │ counted_by (FK)      │
│ validated_at     │       │ counted_at           │
└──────────────────┘       └──────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│     alerts       │       │    audit_logs    │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ type             │       │ user_id (FK)     │
│ product_id (FK)  │       │ action           │
│ warehouse_id(FK) │       │ entity_type      │
│ message          │       │ entity_id        │
│ is_read          │       │ old_values       │
│ user_id (FK)     │       │ new_values       │
│ created_at       │       │ ip_address       │
│ read_at          │       │ created_at       │
└──────────────────┘       └──────────────────┘
```

### 8.2 Tables détaillées

> **Note :** La source de vérité est `src/lib/server/db/schema.ts` (schéma Drizzle).
> Les tables ci-dessous sont présentées en SQL pour la lisibilité. En développement, `drizzle-kit push` synchronise le schéma automatiquement. Les fichiers de migration SQL ne sont générés qu'en semaine 4 pour la production.

#### Tables Better Auth (auto-générées)

Better Auth génère automatiquement ses tables via `npx @better-auth/cli generate`. Le schéma est géré par Drizzle ORM.

```sql
-- Tables gérées par Better Auth (ne pas modifier manuellement)
CREATE TABLE user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    emailVerified INTEGER DEFAULT 0,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'admin_manager', 'manager', 'user', 'admin_viewer', 'viewer')),
    is_active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE session (
    id TEXT PRIMARY KEY,
    expiresAt TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TEXT,
    refreshTokenExpiresAt TEXT,
    scope TEXT,
    password TEXT,  -- hash scrypt pour email/password
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);
```

#### Tables métier (custom)

#### warehouses
```sql
CREATE TABLE warehouses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    address TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

#### products
```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES categories(id),
    unit TEXT NOT NULL DEFAULT 'unité',
    purchase_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

#### product_warehouse (stock par entrepôt)
```sql
CREATE TABLE product_warehouse (
    product_id TEXT NOT NULL REFERENCES products(id),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER,  -- NULL = utiliser min_stock du produit
    pump REAL DEFAULT 0,  -- Prix Unitaire Moyen Pondéré (XOF)
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (product_id, warehouse_id)
);
```

#### movements
```sql
CREATE TABLE movements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL REFERENCES products(id),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT,  -- Numéro de facture, bon, etc.
    user_id TEXT NOT NULL REFERENCES user(id),
    created_at TEXT DEFAULT (datetime('now'))
);
```

#### transfers
```sql
CREATE TABLE transfers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    source_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    destination_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'shipped', 'received', 'partially_received', 'cancelled', 'disputed')),
    requested_by TEXT NOT NULL REFERENCES user(id),
    approved_by TEXT REFERENCES user(id),
    shipped_by TEXT REFERENCES user(id),
    received_by TEXT REFERENCES user(id),
    requested_at TEXT DEFAULT (datetime('now')),
    approved_at TEXT,
    rejected_at TEXT,
    shipped_at TEXT,
    received_at TEXT,
    notes TEXT,
    rejection_reason TEXT,
    dispute_reason TEXT,
    dispute_resolved_by TEXT REFERENCES user(id),
    dispute_resolved_at TEXT
);
```

#### transfer_items
```sql
CREATE TABLE transfer_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity_requested INTEGER NOT NULL,
    quantity_sent INTEGER,
    quantity_received INTEGER,
    anomaly_notes TEXT  -- Obligatoire si quantity_received < quantity_sent
);
```

### 8.3 Index recommandés

```sql
-- Performance des recherches produits
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);

-- Performance auth (Better Auth gère ses propres index)
CREATE INDEX idx_user_role ON user(role);
CREATE INDEX idx_user_active ON user(is_active);

-- Performance des mouvements
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_warehouse ON movements(warehouse_id);
CREATE INDEX idx_movements_date ON movements(created_at);
CREATE INDEX idx_movements_type ON movements(type);

-- Performance des transferts
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_source ON transfers(source_warehouse_id);
CREATE INDEX idx_transfers_dest ON transfers(destination_warehouse_id);

-- Performance des alertes
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_read ON alerts(is_read);

-- Performance des logs
CREATE INDEX idx_logs_user ON audit_logs(user_id);
CREATE INDEX idx_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_logs_date ON audit_logs(created_at);
```

---

## 9. Spécifications API

### 9.1 Conventions

| Aspect | Convention |
|--------|------------|
| Base URL | `/api/v1` |
| Format | JSON |
| Auth | Better Auth (cookie session httpOnly) |
| Pagination | `?page=1&limit=20` |
| Filtres | Query params `?status=active&warehouse=xxx` |
| Tri | `?sort=name&order=asc` |
| Erreurs | `{ "error": { "code": "...", "message": "..." } }` |

### 9.2 Endpoints principaux

#### Authentification (Better Auth — auto-géré)
```
POST /api/auth/sign-up/email      # Inscription (via invitation admin)
POST /api/auth/sign-in/email      # Connexion email/mot de passe
POST /api/auth/sign-out           # Déconnexion
GET  /api/auth/get-session        # Session courante
POST /api/auth/forget-password    # Demande reset mot de passe
POST /api/auth/reset-password     # Reset avec token
POST /api/auth/change-password    # Changer mot de passe
```

#### Utilisateurs (API custom)
```
GET  /api/v1/auth/me              # Profil utilisateur courant (enrichi avec rôle + entrepôts)
```

#### Utilisateurs
```
GET    /api/v1/users              # Liste (admin only)
POST   /api/v1/users              # Créer (admin only)
GET    /api/v1/users/:id          # Détail
PUT    /api/v1/users/:id          # Modifier (admin only)
DELETE /api/v1/users/:id          # Désactiver (admin only)
PUT    /api/v1/users/:id/warehouses  # Assigner entrepôts
```

#### Entrepôts
```
GET    /api/v1/warehouses         # Liste (filtrée par permissions)
POST   /api/v1/warehouses         # Créer (admin only)
GET    /api/v1/warehouses/:id     # Détail
PUT    /api/v1/warehouses/:id     # Modifier (admin only)
DELETE /api/v1/warehouses/:id     # Désactiver (admin only)
GET    /api/v1/warehouses/:id/stock    # Stock de l'entrepôt
GET    /api/v1/warehouses/:id/movements # Mouvements de l'entrepôt
```

#### Produits
```
GET    /api/v1/products           # Liste avec stock
POST   /api/v1/products           # Créer
GET    /api/v1/products/:id       # Détail avec stock par entrepôt
PUT    /api/v1/products/:id       # Modifier
DELETE /api/v1/products/:id       # Désactiver
GET    /api/v1/products/:id/movements  # Historique mouvements
PUT    /api/v1/products/:id/warehouses/:whId  # Config stock/entrepôt
```

#### Catégories
```
GET    /api/v1/categories         # Arbre des catégories
POST   /api/v1/categories         # Créer
PUT    /api/v1/categories/:id     # Modifier
DELETE /api/v1/categories/:id     # Supprimer
```

#### Mouvements
```
GET    /api/v1/movements          # Liste avec filtres
POST   /api/v1/movements          # Créer entrée/sortie
GET    /api/v1/movements/:id      # Détail
```

#### Transferts
```
GET    /api/v1/transfers          # Liste avec filtres
POST   /api/v1/transfers          # Créer demande
GET    /api/v1/transfers/:id      # Détail avec items
PUT    /api/v1/transfers/:id/approve   # Approuver
PUT    /api/v1/transfers/:id/reject    # Rejeter
PUT    /api/v1/transfers/:id/ship      # Expédier
PUT    /api/v1/transfers/:id/receive   # Réceptionner
PUT    /api/v1/transfers/:id/cancel    # Annuler
PUT    /api/v1/transfers/:id/dispute   # Signaler litige (réception partielle)
PUT    /api/v1/transfers/:id/resolve   # Résoudre litige
```

#### Inventaires
```
GET    /api/v1/inventories        # Liste
POST   /api/v1/inventories        # Créer session
GET    /api/v1/inventories/:id    # Détail avec items
PUT    /api/v1/inventories/:id/items/:itemId  # Saisir comptage
PUT    /api/v1/inventories/:id/validate       # Valider
```

#### Alertes
```
GET    /api/v1/alerts             # Liste utilisateur
PUT    /api/v1/alerts/:id/read    # Marquer comme lu
PUT    /api/v1/alerts/read-all    # Tout marquer comme lu
```

#### Logs
```
GET    /api/v1/logs               # Liste avec filtres (admin)
GET    /api/v1/logs/:id           # Détail
GET    /api/v1/logs/export        # Export CSV
```

#### Dashboard
```
GET    /api/v1/dashboard          # KPIs selon rôle
GET    /api/v1/dashboard/stock-value     # Valorisation
GET    /api/v1/dashboard/low-stock       # Produits sous seuil
GET    /api/v1/dashboard/recent-movements # Mouvements récents
```

### 9.3 Exemple de réponses

#### GET /api/v1/products/:id
```json
{
  "id": "abc123",
  "sku": "PRD-001",
  "name": "Filtre à huile",
  "description": "Filtre à huile universel",
  "category": {
    "id": "cat1",
    "name": "Pièces détachées"
  },
  "unit": "unité",
  "purchase_price": 5000,
  "sale_price": 7500,
  "min_stock": 10,
  "total_stock": 150,
  "stock_value": 750000,
  "warehouses": [
    {
      "warehouse_id": "wh1",
      "warehouse_name": "Entrepôt Principal",
      "quantity": 100,
      "min_stock": 20
    },
    {
      "warehouse_id": "wh2",
      "warehouse_name": "Entrepôt Nord",
      "quantity": 50,
      "min_stock": null
    }
  ],
  "is_active": true,
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-04T15:30:00Z"
}
```

#### GET /api/v1/transfers/:id
```json
{
  "id": "trf123",
  "source_warehouse": {
    "id": "wh1",
    "name": "Entrepôt Principal"
  },
  "destination_warehouse": {
    "id": "wh2",
    "name": "Entrepôt Nord"
  },
  "status": "shipped",
  "timeline": {
    "requested": {
      "at": "2026-02-01T09:00:00Z",
      "by": { "id": "u1", "name": "Moussa" }
    },
    "approved": {
      "at": "2026-02-01T10:30:00Z",
      "by": { "id": "u2", "name": "Fatou" }
    },
    "shipped": {
      "at": "2026-02-02T08:00:00Z",
      "by": { "id": "u1", "name": "Moussa" }
    },
    "received": null
  },
  "items": [
    {
      "product": { "id": "p1", "sku": "PRD-001", "name": "Filtre à huile" },
      "quantity_requested": 20,
      "quantity_sent": 20,
      "quantity_received": null
    }
  ],
  "notes": "Urgent pour client"
}
```

---

## 10. Interface utilisateur

### 10.1 Principes de design

| Principe | Application |
|----------|-------------|
| Mobile-first | Design conçu d'abord pour mobile |
| Consistance | Composants et patterns réutilisés |
| Accessibilité | Contraste, tailles, navigation clavier |
| Feedback | États loading, success, error visibles |
| Efficacité | Actions fréquentes en 1-2 clics |

### 10.2 Écrans principaux

#### Dashboard
- KPIs en cards (stock total, valeur, alertes, transferts pending)
- Graphique mouvements récents
- Liste alertes actives
- Actions rapides selon rôle

#### Liste produits
- Tableau responsive (cards sur mobile)
- Recherche instantanée
- Filtres : catégorie, entrepôt, statut stock
- Indicateur visuel stock bas
- Actions inline : voir, éditer

#### Détail produit
- Informations générales
- Stock par entrepôt (tableau)
- Historique mouvements (timeline)
- Actions : entrée, sortie, modifier

#### Mouvements
- Formulaire simplifié mobile
- Sélection produit avec recherche
- Type (entrée/sortie)
- Quantité, motif
- Confirmation visuelle

#### Transferts
- Liste avec statuts colorés
- Détail avec timeline visuelle
- Actions contextuelles selon statut
- Vue Kanban optionnelle

#### Inventaire
- Liste par entrepôt
- Saisie en grille
- Écarts mis en évidence
- Validation avec récapitulatif

### 10.3 Navigation

```
┌─────────────────────────────────────┐
│  ☰  StockFlow         🔔  👤       │  ← Header
├─────────────────────────────────────┤
│                                     │
│  [Contenu principal]                │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  🏠   📦   🔄   📋   ⚙️            │  ← Bottom nav (mobile)
│ Home Stock Trans Inv  More          │
└─────────────────────────────────────┘
```

**Sidebar desktop :**
- Dashboard
- Produits
- Entrepôts
- Mouvements
- Transferts
- Inventaires
- Alertes
- Logs (si permission)
- Utilisateurs (si admin)
- Paramètres

### 10.4 États et feedback

| État | Implémentation |
|------|----------------|
| Loading | Skeleton screens, spinners |
| Empty | Illustration + message + CTA |
| Error | Toast notification + retry |
| Success | Toast + animation subtile |
| Confirmation | Modal pour actions critiques |

---

## 11. Notifications et alertes

### 11.1 Types d'alertes V1

| Type | Trigger | Canaux |
|------|---------|--------|
| Stock bas | Stock < minimum | In-app, Email |
| Transfert à approuver | Nouvelle demande | In-app, Email |
| Transfert approuvé | Approbation | In-app |
| Transfert expédié | Expédition | In-app |
| Transfert à réceptionner | Arrivée | In-app, Email |
| **Litige transfert** | **Qté reçue < qté expédiée** | **In-app, Email** |
| Inventaire en cours | Création session | In-app |

### 11.2 Préférences utilisateur

Chaque utilisateur pourra configurer :
- Activation/désactivation par type
- Canaux préférés par type
- Fréquence (immédiat, digest quotidien)

### 11.3 Implémentation email

Via **Cloudflare Email Workers** :
- Templates HTML responsive
- Lien direct vers l'action
- Désinscription en un clic

---

## 12. Roadmap

### 12.1 V1 — MVP (4 semaines)

**Semaine 1 — Fondations :**
- [ ] Setup projet (SvelteKit + Cloudflare + Drizzle ORM)
- [ ] Authentification Better Auth (email/password, sessions, reset password)
- [ ] Schéma Drizzle complet + `db:push` pour itération rapide (pas de migrations manuelles)
- [ ] Middleware autorisation (rôles + scope entrepôt)
- [ ] CRUD Utilisateurs + assignation rôles/entrepôts
- [ ] CRUD Entrepôts

**Semaine 2 — Modules métier core :**
- [ ] CRUD Produits + catégories
- [ ] Service stock.ts (transactions atomiques Drizzle)
- [ ] Module Mouvements (entrées/sorties avec calcul PUMP à l'écriture)
- [ ] Scan codes-barres (html5-qrcode, intégration formulaires mouvements)
- [ ] Validation stock suffisant dans les transactions

**Semaine 3 — Transferts & Inventaire :**
- [ ] Module Transferts (workflow 4 étapes complet)
- [ ] Réception partielle + notification litige
- [ ] Module Inventaire (sessions de comptage, écarts, validation)
- [ ] Module Alertes (stock minimum, in-app + email)
- [ ] Résilience réseau (queue IndexedDB, retry automatique, indicateur visuel)

**Semaine 4 — Dashboard, polish & déploiement :**
- [ ] Dashboard par rôle (KPIs, graphiques, actions rapides)
- [ ] Logs et traçabilité (interface + filtres + export CSV)
- [ ] Centre de notifications
- [ ] Responsive mobile polish (bottom nav, cards, formulaires tactiles)
- [ ] Figer le schéma + `db:generate` pour créer les migrations prod
- [ ] Tests end-to-end
- [ ] `db:migrate:prod` + déploiement production Cloudflare
- [ ] Seed données initiales (entrepôts, admin, catégories)
- [ ] Documentation utilisateur

### 12.2 V2 — Enrichissement (6 semaines après V1)

- [ ] Génération et impression d'étiquettes codes-barres
- [ ] Dates de péremption (alertes, FIFO automatique)
- [ ] Notifications push (PWA)
- [ ] Notifications WhatsApp (via API Business)
- [ ] Rapports et exports avancés (PDF, Excel)
- [ ] Zones/emplacements dans entrepôts
- [ ] Recherche avancée avec filtres combinés
- [ ] Tableaux de bord analytiques (tendances, prévisions)

### 12.3 V3 — Intégrations (12 semaines après V1)

- [ ] Mode hors-ligne complet (Service Workers, sync bidirectionnelle)
- [ ] API POS (réception des ventes)
- [ ] API Facturation (génération auto)
- [ ] Numéros de lot/série
- [ ] Multi-devises
- [ ] Application mobile native (optionnel, PWA prioritaire)

### 12.4 V4+ — Évolutions

- [ ] Module comptabilité simplifié
- [ ] Prévisions de stock (ML)
- [ ] Commandes fournisseurs automatiques
- [ ] Multi-entreprises (SaaS)

---

## 13. Critères de succès

### 13.1 Critères de lancement V1

| Critère | Objectif | Mesure |
|---------|----------|--------|
| Fonctionnalités | 100% user stories "Must" | Checklist |
| Performance | Temps de réponse < 300ms | Monitoring |
| Fiabilité | Uptime > 99% | Cloudflare Analytics |
| Mobile | Score Lighthouse > 80 | Audit |
| Sécurité | 0 faille critique | Audit sécurité |
| Scan | Taux de scan réussi > 90% | Tests terrain |
| Résilience | 0 perte de données en offline | Tests déconnexion |

### 13.2 KPIs post-lancement

| KPI | Baseline | Objectif M+3 |
|-----|----------|--------------|
| Adoption | 0% | 100% équipe |
| Mouvements tracés | 0% | 100% |
| Temps traitement transfert | N/A | < 24h |
| Écart inventaire | N/A | < 2% |
| Satisfaction utilisateurs | N/A | > 4/5 |

---

## 14. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Complexité scan codes-barres mobile | Moyenne | Moyen | POC html5-qrcode en semaine 1, fallback saisie manuelle |
| Limites D1 (volume/concurrence) | Moyenne | Moyen | Transactions atomiques, monitoring, plan migration Turso si besoin |
| Adoption utilisateurs | Moyenne | Élevé | Formation, documentation, support dédié, scan facilite l'adoption |
| Complexité workflow transferts + litiges | Moyenne | Moyen | Prototypage UX avant dev, tests scénarios complets |
| CPU hashing passwords (Workers) | Faible | Moyen | Plan Pro = 30s CPU/req, scrypt ~80ms OK |
| Performance mobile terrain | Moyenne | Moyen | Queue IndexedDB, tests en conditions réelles (signal faible) |
| Calcul PUMP (cas limites) | Faible | Moyen | Tests unitaires exhaustifs, stock à 0 = reset PUMP au prix d'achat |
| Conflits queue offline | Faible | Élevé | Résolution serveur fait autorité, notification conflit à l'utilisateur |

---

## 15. Annexes

### 15.1 Glossaire

| Terme | Définition |
|-------|------------|
| SKU | Stock Keeping Unit — identifiant unique produit |
| PUMP | Prix Unitaire Moyen Pondéré |
| FIFO | First In First Out — méthode de valorisation |
| XOF | Code ISO du Franc CFA |
| D1 | Base de données SQLite serverless de Cloudflare |
| KV | Key-Value store de Cloudflare |
| Better Auth | Librairie d'authentification TypeScript, remplaçante de Lucia |
| Drizzle ORM | ORM TypeScript léger, compatible D1 |
| scrypt | Algorithme de hashing de mots de passe utilisé par Better Auth |
| html5-qrcode | Librairie JS pour lire codes-barres/QR via caméra navigateur |
| IndexedDB | Base de données locale navigateur pour la queue offline |
| Transaction atomique | Opération DB tout-ou-rien (rollback si échec partiel) |
| drizzle-kit push | Commande synchronisant le schéma Drizzle directement en DB sans migration |

### 15.2 Références

- [Documentation SvelteKit](https://kit.svelte.dev/docs)
- [Better Auth](https://www.better-auth.com/)
- [Better Auth - SvelteKit Integration](https://www.better-auth.com/docs/integrations/svelte-kit)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Drizzle Kit — Push & Migrations](https://orm.drizzle.team/docs/kit-overview)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### 15.3 Contacts

| Rôle | Nom | Contact |
|------|-----|---------|
| Product Owner | [À compléter] | |
| Tech Lead | [À compléter] | |
| Designer | [À compléter] | |

---

**Document rédigé le :** 5 février 2026  
**Prochaine révision :** Après validation V1
