# Lecture fluide et récitation sur page complète

## Lecture audio
- Conserver les enregistrements officiels et tous les récitateurs actuels.
- Préparer le verset suivant pendant la lecture du verset courant, au lieu d’attendre sa fin pour charger l’audio.
- Enchaîner sans chevaucher les récitations ; garder le verset actif, le défilement, les commandes, les répétitions et la playlist synchronisés.
- Préserver les téléchargements existants et la lecture hors ligne.

**Limite :** cette solution supprime l’attente de chargement entre deux versets, mais ne peut garantir zéro silence sur tous les téléphones. Les pauses présentes dans l’enregistrement restent intactes. Une sourate audio complète ne sera pas substituée sans repères de versets vérifiés pour le même enregistrement.

## Mode Réciter
- Afficher la première page de la sourate à son ouverture, avec son titre et le texte arabe disposé en continu, comme une page de Mushaf.
- Lorsqu’un verset est choisi, afficher sa page complète et le mettre en évidence ; toucher un autre verset permet de le sélectionner.
- Ajouter les commandes page précédente/suivante et le numéro officiel de page.
- Conserver la reconnaissance vocale, les couleurs mot par mot et le bilan pour le verset sélectionné.
- Utiliser uniquement le texte et les numéros de pages fournis par api.alquran.cloud ; ne pas inventer ou réécrire le texte coranique.
- Présenter une mise en page adaptée à l’écran, sans prétendre reproduire les lignes exactes d’une édition imprimée.

## Détails techniques
- Préchargement audio avec annulation des requêtes devenues inutiles et libération des URL temporaires.
- Étendre les données des versets avec leur numéro de page officiel et ajouter la lecture d’une page entière depuis la même API, avec cache local compatible avec le fonctionnement existant.
- Traduire les nouvelles commandes en français, anglais et arabe, avec prise en charge droite-à-gauche.

## Vérifications
- Tests des transitions, du changement de piste, des répétitions et de la sélection de page.
- Vérifier dans le navigateur la lecture de plusieurs versets, le défilement synchronisé et le choix d’un verset dans une page complète.
- Contrôler les écrans étroits et l’arabe ; signaler séparément ce qui nécessite un vrai iPhone ou Android.
- Aucun changement d’architecture mobile, aucune publication et aucun envoi GitHub.
