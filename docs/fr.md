# IPMA

La météo officielle du **Portugal** — continent, Madère et Açores — dans Gladys, par
l’[IPMA](https://www.ipma.pt) (Instituto Português do Mar e da Atmosfera), le service météo
portugais : prévisions, observations des stations, avertissements météo, indice UV et risque
d’incendie. Pour la maison de famille là-bas, ou tout simplement pour vivre au Portugal.

L’intégration lit les données ouvertes et gratuites de l’IPMA : pas de compte, pas de clé d’API.
Elle est sans lien avec l’IPMA.

> Développée sans instance Gladys réelle et sans accès réseau à l’IPMA : elle a été construite et
> testée sur de vraies réponses de l’IPMA publiées par la bibliothèque `pyipma`. Vos retours
> bienvenus — ouvrez une issue sur GitHub si une valeur vous semble fausse.

## Ce que vous obtenez

- **Un appareil par lieu** (une commune, parmi les 423 lieux de prévision de l’IPMA), nommé
  `IPMA <lieu>`, avec :
  - la température, l’humidité, la pression, le vent et la pluie actuels de la **station météo la
    plus proche** ;
  - le **minimum et le maximum**, la **probabilité de pluie** et le **temps** d’aujourd’hui et de
    demain ;
  - le **vent** (force et direction) et l’**indice UV** du jour ;
  - le **risque d’incendie** du jour (continent seulement) ;
  - le **niveau d’avertissement** (vert, jaune, orange, rouge) et les **avertissements** en cours,
    en toutes lettres.
- Un **widget de tableau de bord** : prévisions à 5 jours avec icônes, température en direct, UV,
  risque d’incendie et avertissements.
- Un **déclencheur de scène** « Avertissement météo IPMA émis », avec le niveau, le phénomène et la
  période.

Tout est en lecture seule : rien dans Gladys ne peut modifier quoi que ce soit à l’IPMA.

## Prérequis

- Gladys **5.2.0** ou plus récent.
- Un accès Internet de Gladys vers `api.ipma.pt` (HTTPS).
- Rien d’autre : ni compte, ni clé.

## Configuration

### Réglages

| Réglage                       | Rôle                                                                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lieu                          | Le lieu IPMA à suivre : une commune du Portugal continental, de Madère ou des Açores (noms portugais, avec le district ou l’île).                                                                              |
| Autres lieux                  | Facultatif. D’autres lieux, séparés par des virgules : `Funchal, Ponta Delgada, Lagoa (Faro)`. Les noms sont reconnus sans accents ni majuscules ; ajoutez le district si un nom est ambigu. 10 lieux au plus. |
| Fréquence de mise à jour      | 15 minutes, 30 minutes (par défaut) ou 1 heure.                                                                                                                                                                |
| Langue des noms et des textes | Langue des noms de fonctionnalités des nouveaux appareils, des textes du temps et des avertissements, et des variables de scène. Français par défaut.                                                          |

Ouvrez ensuite l’onglet **Découverte** et ajoutez l’appareil de chaque lieu. Les valeurs arrivent
en quelques secondes.

### Lieu le plus proche d’une maison

Le bouton **Utiliser le lieu le plus proche d’une maison** choisit le lieu IPMA le plus proche
d’une maison de Gladys et l’enregistre comme lieu principal. Gladys demande, à l’installation, de
partager la position des maisons avec l’intégration : elle n’est lue que lorsque vous appuyez sur
ce bouton, et n’est jamais écrite dans les journaux. Une maison à plus de 60 km de tout lieu IPMA
(une maison en France, par exemple) est refusée : l’IPMA ne couvre que le Portugal.

## L’appareil

| Fonctionnalité                            | Type dans Gladys      | Source                                                                           |
| ----------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| Température (station)                     | température, °C       | station IPMA la plus proche (à 50 km au plus), dernier relevé horaire des 3 h    |
| Humidité (station)                        | humidité, %           | même station                                                                     |
| Pression (station)                        | pression, hPa         | même station (toutes ne la mesurent pas)                                         |
| Vent (station)                            | vitesse, km/h         | même station                                                                     |
| Pluie dernière heure (station)            | précipitations, mm/h  | même station (toutes n’ont pas de pluviomètre)                                   |
| Min / Max aujourd’hui, Min / Max demain   | minimum / maximum, °C | prévision IPMA du lieu                                                           |
| Probabilité de pluie aujourd’hui / demain | compteur, %           | prévision IPMA                                                                   |
| Temps aujourd’hui / demain                | texte                 | type de temps IPMA, traduit (« Pluie faible ou bruine »)                         |
| Vent aujourd’hui                          | texte                 | classe et direction du vent IPMA (« Modéré, NO »)                                |
| Indice UV                                 | indice UV             | prévision IPMA, maximum du jour                                                  |
| Risque d’incendie (1-5)                   | compteur              | RCM de l’IPMA : 1 réduit, 2 modéré, 3 élevé, 4 très élevé, 5 maximum (continent) |
| Niveau d’avertissement                    | niveau de risque      | avertissement le plus fort en cours : 0 aucun (vert), 1 jaune, 2 orange, 3 rouge |
| Avertissements météo                      | texte                 | « Orange : Mer agitée · Jaune : Vent », ou le prochain avertissement à venir     |

Le niveau d’avertissement utilise la pastille **risque** de Gladys : vert, jaune, orange, rouge —
les couleurs de l’IPMA. Une valeur que l’IPMA ne donne pas (pas de station proche, pas de prévision
UV ce jour-là) n’est simplement pas mise à jour. Les textes du temps suivent la langue de la
configuration ; les noms des fonctionnalités sont fixés à l’ajout de l’appareil.

## Widget de tableau de bord

Ajoutez le widget **Prévisions IPMA** à un tableau de bord et choisissez le lieu (vide : le
premier). Il affiche :

- la station utilisée et l’heure de son dernier relevé ;
- la température en direct, l’indice UV, le risque d’incendie et le niveau d’avertissement ;
- les avertissements pas encore terminés (en cours ou à venir), avec le texte de l’IPMA (en
  portugais) d’un appui ;
- cinq jours : temps avec son icône, minimum / maximum, probabilité de pluie.

## Déclencheur de scène

**Avertissement météo IPMA émis** se déclenche une fois pour chaque avertissement que l’IPMA émet
pour un lieu — souvent la veille de son début. Un avertissement relevé d’un niveau (de jaune à
orange) se déclenche à nouveau. Un redémarrage de l’intégration ne redéclenche pas les mêmes
avertissements.

Filtres : le lieu (appareil), les niveaux (jaune, orange, rouge), les phénomènes (pluie, orages,
vent, mer agitée, fortes chaleurs, grand froid, neige, brouillard, autre).

Variables pour les actions suivantes de la scène :

| Variable           | Exemple                          |
| ------------------ | -------------------------------- |
| `location`         | `Aveiro`                         |
| `level`            | `orange`                         |
| `level_label`      | `Orange`                         |
| `phenomenon`       | `coastal`                        |
| `phenomenon_label` | `Mer agitée`                     |
| `starts_at`        | `2022-07-29T05:00:00.000Z`       |
| `ends_at`          | `2022-07-29T20:00:00.000Z`       |
| `active`           | `false` (pas encore commencé)    |
| `description`      | le texte de l’IPMA, en portugais |

## Boutons de configuration

- **Utiliser le lieu le plus proche d’une maison** : voir plus haut.
- **Tester l’IPMA maintenant** : lit l’IPMA pour chaque lieu configuré (ajouté à Gladys ou non) et
  dit ce qui est revenu : température de la station, minimum et maximum du jour, nombre
  d’avertissements, noms de lieux inconnus, fichiers injoignables.

## Exemples de scènes

- **Tempête sur la maison de famille** : déclencheur « Avertissement météo IPMA émis », lieu
  Aveiro, niveaux orange et rouge → envoyer un message construit avec les variables
  `level_label`, `phenomenon_label` et `location` : « Avertissement IPMA Orange à Aveiro : Mer
  agitée ».
- **Canicule** : déclencheur « Avertissement météo IPMA émis », phénomène fortes chaleurs →
  rappeler au voisin d’arroser le jardin.
- **Risque d’incendie** : quand la fonctionnalité « Risque d’incendie (1-5) » dépasse 3 →
  notification « pas de barbecue aujourd’hui ».
- **Probabilité de pluie** : chaque soir à 20 h, si « Probabilité de pluie demain » dépasse 70 % →
  fermer le store.

## Données et rafraîchissement

L’intégration se rafraîchit elle-même (elle ne dépend pas du sondage de Gladys) : toutes les 15,
30 ou 60 minutes, elle lit cinq fichiers de l’IPMA — les stations (une fois par jour), les
observations des dernières 24 heures, les avertissements, le risque d’incendie du jour, et une
prévision par lieu. Ces fichiers couvrent tout le pays : dix lieux coûtent dix fichiers de
prévision plus quatre fichiers communs par rafraîchissement. L’IPMA ne publie pas de quota pour ses
données ouvertes ; l’intégration reste très en deçà de ce que charge son propre site. Rien n’est lu
pour un lieu dont l’appareil n’est pas ajouté à Gladys.

L’IPMA met à jour ses prévisions plusieurs fois par jour, ses stations une fois par heure et ses
avertissements au besoin. Une valeur inchangée est renvoyée à Gladys toutes les 6 heures, pour
qu’elle n’affiche jamais « Pas de valeur récente ». Les données sont © IPMA, réutilisées selon ses
conditions de données ouvertes, avec mention de la source.

## Dépannage

- **« Choisissez un lieu dans la configuration »** : aucun lieu n’est choisi — choisissez-en un,
  ou utilisez le bouton de la maison.
- **« L’IPMA ne répond pas »** : aucun fichier de l’IPMA n’a pu être lu. Vérifiez que Gladys
  accède à Internet, puis appuyez sur **Tester l’IPMA maintenant**. L’intégration réessaie à chaque
  rafraîchissement et le dit dans ses journaux quand l’IPMA répond de nouveau.
- **Les valeurs de la station restent vides** : aucune station IPMA à moins de 50 km n’a envoyé de
  relevé depuis 3 heures (fréquent sur les petites îles). Les prévisions fonctionnent toujours.
- **Un lieu des « Autres lieux » est ignoré** : le nom est inconnu — vérifiez l’orthographe, ou
  ajoutez le district : `Lagoa (Faro)`. Le bouton **Tester l’IPMA maintenant** liste les noms
  inconnus.
- **Plus de détails** : réglez `LOG_LEVEL=debug` sur l’intégration pour voir chaque
  rafraîchissement dans ses journaux.

## Limites

- Portugal seulement (continent, Madère, Açores) : l’IPMA ne couvre rien d’autre.
- Pas de risque d’incendie à Madère et aux Açores : l’IPMA ne le prévoit que pour le continent.
- Le fichier de prévision utilisé est celui du site de l’IPMA (`public-data`), comme l’intégration
  Home Assistant ; l’IPMA peut le changer sans prévenir.
- L’IPMA rédige ses avertissements en portugais : le niveau et le phénomène sont traduits, le texte
  libre ne l’est pas.
- Sans lien avec l’IPMA. Développée sans instance Gladys réelle : retours bienvenus.
