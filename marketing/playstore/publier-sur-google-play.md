# Publier Échec & Mat sur Google Play, étape par étape

Compte environ **3 semaines** entre la création du compte et la mise en ligne
publique, à cause de la phase de test imposée par Google (étape 5).

## 1. Créer le compte développeur

1. Va sur [play.google.com/console](https://play.google.com/console) avec ton
   compte Google.
2. Choisis un compte **personnel**, paie les frais d'inscription uniques
   (25 $ US) et vérifie ton identité (pièce d'identité et numéro de téléphone).

## 2. Créer ta clé de signature (une seule fois, à garder précieusement)

Google exige un fichier **AAB** signé avec ta clé (« clé d'importation »). Sans
elle, tu ne pourras plus mettre l'appli à jour : sauvegarde-la (clé USB, Drive…)
et note les mots de passe.

Sur un ordinateur où Java est installé (ou Android Studio, qui l'inclut) :

```bash
keytool -genkeypair -v -keystore upload.jks -alias echecetmat \
  -keyalg RSA -keysize 2048 -validity 10000
```

Le programme demande un mot de passe et ton nom : réponds simplement.

Convertis ensuite le fichier en texte (base64) :

- **Windows (PowerShell)** :
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks")) | Set-Content upload.txt`
- **Mac / Linux** : `base64 -w0 upload.jks > upload.txt` (sur Mac : `base64 -i upload.jks -o upload.txt`)

## 3. Donner la clé à GitHub pour qu'il fabrique l'AAB

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New
repository secret**, crée ces 4 secrets :

| Nom | Valeur |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | tout le contenu de `upload.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | le mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | `echecetmat` |
| `ANDROID_KEY_PASSWORD` | le mot de passe de la clé (souvent le même) |

Puis **Actions → Build Play Store (AAB) → Run workflow** *(ce bouton n'apparaît que lorsque le fichier du workflow est sur la branche principale du dépôt : fusionne d'abord cette branche)*. Au bout de 3 minutes,
télécharge l'artefact `echec-et-mat-playstore` : il contient le fichier `.aab`.

> Si l'artefact s'appelle `echec-et-mat-TEST-non-publiable`, c'est que les secrets
> sont absents ou mal nommés.

Chaque nouveau lancement produit un numéro de version plus grand, ce que Google
exige pour chaque mise à jour.

## 4. Créer l'application dans la Play Console

1. **Créer une application** → nom « Échec & Mat – Jeu d'échecs », langue
   française, type **Jeu**, **Gratuit**.
2. Remplis la fiche avec `fiche-play-store.md` (textes) et les images du dossier
   `playstore/`.
3. Réponds aux questionnaires « Contenu de l'application » (réponses suggérées
   dans `fiche-play-store.md`).
4. URL des règles de confidentialité : celle indiquée dans la fiche.

## 5. Test fermé obligatoire : 12 testeurs pendant 14 jours

Pour les nouveaux comptes personnels, Google exige un **test fermé avec au moins
12 testeurs inscrits pendant 14 jours d'affilée** avant d'autoriser la
publication publique. C'est le moment idéal pour mobiliser tes amis :

1. **Tests → Test fermé → Créer un canal**, importe l'AAB.
2. Ajoute les adresses Gmail de tes testeurs (amis, famille, club d'échecs :
   prévois-en 15 à 20, certains oublient).
3. Envoie-leur le lien d'inscription au test : ils doivent cliquer « Devenir
   testeur » puis installer l'appli depuis le Play Store, et la garder 14 jours.
4. Demande-leur de jouer quelques parties et de te faire des retours : Google
   regarde si l'appli est réellement utilisée.

Astuce : poste le `statut-defi-ami.png` sur WhatsApp avec le message « Qui veut
tester mon appli d'échecs avant tout le monde ? ».

## 6. Passer en production

Après les 14 jours : **Production → Créer une release**, réutilise l'AAB (ou un
nouveau), puis **Demander l'accès à la production** et réponds aux questions sur
ton test. La validation par Google prend en général de quelques jours à une
semaine.

Une fois en ligne, remplace « lien en bio » par le lien Play Store dans tes
profils TikTok et Instagram, et dans les descriptions de tes vidéos.

## En attendant le Play Store

Le fichier APK (onglet **Releases** du dépôt GitHub) s'installe directement : tu
peux déjà le partager par WhatsApp. Android demandera d'autoriser
« Installer des applications inconnues ».
