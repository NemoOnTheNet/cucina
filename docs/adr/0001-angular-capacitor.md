# ADR-0001 — Angular + Capacitor plutôt que React Native

**Statut** : accepté · **Date** : 2026-08-26

## Contexte

Cucina doit être une application **mobile** (usage en magasin et en cuisine), testable gratuitement par un foyer, avec la possibilité d'aller plus loin ensuite. Le dépôt existant était un scaffold Angular 21. React Native (Expo) et Flutter ont été envisagés.

## Décision

**Angular 21 + Capacitor.**

## Raisons

- Une seule base de code produit à la fois le **web installable (PWA)** et, plus tard, un `.apk` / `.ipa` — sans réécriture.
- **Distribution immédiate et gratuite** à la famille : un lien. Pas d'Expo Go à installer, pas de compte Apple à 99 $/an, pas de store à attendre pour tester.
- Le produit est fait de **listes, formulaires et texte**. Rien ici n'exige du rendu natif : ni animation complexe, ni carte, ni traitement d'image lourd.
- Compétence existante en Angular/TypeScript côté humain, donc code relisible et corrigeable.

## Conséquences

- L'ergonomie mobile est **notre responsabilité** : zones tactiles, safe areas, retour haptique, gestes. Rien n'est offert par le framework. Les conventions CSS l'imposent explicitement.
- L'accès natif (appareil photo, préférences, barre système) passe par des plugins Capacitor, donc reste dépendant de leur qualité.
- Si un jour le ressenti « web dans une WebView » devient bloquant, la migration vers du natif serait une **réécriture de l'UI** — mais `domain/` et le schéma de données, eux, resteraient valides. C'est précisément pourquoi l'architecture isole les règles métier.

## Alternatives écartées

- **React Native (Expo)** : meilleur ressenti natif, mais on jetait Angular, et tester en famille imposait Expo Go ou des builds signés. Trop de friction pour un produit dont la valeur est ailleurs.
- **Flutter** : excellent résultat, mais Dart et tout son écosystème à apprendre, pour un gain nul sur ce type d'app.
- **Angular web pur, sans Capacitor** : identique aujourd'hui, mais ferme la porte au natif. Ajouter Capacitor coûte quasiment rien maintenant et beaucoup plus tard.
