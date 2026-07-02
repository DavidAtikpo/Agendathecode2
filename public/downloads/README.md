# Dossier de distribution APK

Placez ici le fichier `neurix.apk` (build release signé) pour qu'il soit servi
publiquement à `https://neurix.qrthecode2.com/downloads/neurix.apk` et proposé
au téléchargement depuis la page `/download`.

## Générer le build

```bash
cd agenda_flutter
flutter build apk --release
```

Le fichier généré se trouve dans :

```
agenda_flutter/build/app/outputs/flutter-apk/app-release.apk
```

Copiez-le ici en le renommant `neurix.apk` :

```bash
cp agenda_flutter/build/app/outputs/flutter-apk/app-release.apk agenda/public/downloads/neurix.apk
```

## Ne pas oublier

Après chaque nouvelle release, mettez aussi à jour
`agenda/app/lib/app-release-config.ts` (`latestVersion`, `latestBuildNumber`,
et éventuellement `minSupportedBuildNumber` si la mise à jour doit être
obligatoire) afin que l'application informe les utilisateurs des anciennes
versions.
