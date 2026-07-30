# TFGen

Générateur interne de fichiers `.tfvars` Terraform à partir de templates
(RG, Storage, NSG/ASG, VM Windows Marketplace/Custom, VM Linux) et de fiches
FIS Excel (onglet « synthèse » lu en clé/valeur).

## Fonctionnement

1. **Gestion des templates** (`/templates/new`, `/templates/:id`) : chaque
   template définit une catégorie de ressource, un contenu `.tf` de référence
   (optionnel, informatif) et une liste de variables avec nom, type, valeur
   par défaut, description, et si elle est requise.
2. **Génération** (`/generate`) :
   - sélection du template
   - upload de la fiche FIS `.xlsx` → lecture de l'onglet « synthèse »
     (ou premier onglet à défaut) en paires clé/valeur
   - correspondance automatique entre les clés extraites et les noms de
     variables du template (normalisées en snake_case, sans accents)
   - tableau de revue éditable, valeur par défaut vs valeur trouvée
   - génération du `.tfvars`, surlignage en vert des variables dont la
     valeur diffère du défaut
   - téléchargement du fichier

## Installation locale (dev)

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

## Déploiement sur ton VPS (Dokploy)

1. Pousse ce dossier dans un dépôt Git (ou upload direct dans Dokploy).
2. Crée une base PostgreSQL (tu peux réutiliser ton instance existante,
   ou en créer une dédiée via Dokploy).
3. Dans Dokploy, crée une nouvelle application de type **Dockerfile**,
   pointant sur ce dépôt.
4. Renseigne les variables d'environnement (`DATABASE_URL`, `TFGEN_PASSWORD`,
   `TFGEN_SECRET`).
5. Ajoute le domaine `tfgen.digitalstack.cloud` (ou autre) avec le label
   Traefik habituel de tes autres apps (`travelai`, `folio`).
6. Au premier déploiement, exécute `npx prisma db push` dans le conteneur
   (ou ajoute-le en étape de build) pour créer le schéma en base.
7. Connecte-toi avec le mot de passe défini dans `TFGEN_PASSWORD`.

## Notes sur le mapping des variables

Le nom de variable dans un template (ex. `rg_name`, `location`,
`storage_sku`) doit correspondre à la clé de la fiche FIS **une fois
normalisée** : minuscules, sans accents, espaces remplacés par `_`.
Par exemple une cellule « Nom du Resource Group » devient la clé
`nom_du_resource_group` — pense à nommer tes variables de template en
conséquence, ou à harmoniser le libellé des fiches FIS.

## Pistes d'évolution

- Édition du mapping clé Excel ↔ nom de variable directement dans l'UI
  (au lieu de compter uniquement sur la normalisation automatique)
- Génération d'un `.tf` complet (pas seulement `.tfvars`) en combinant
  plusieurs templates (RG + Storage + NSG dans un même export .zip)
- Historique des générations par ressource avec recherche
- Auth via Authentik au lieu du mot de passe partagé
