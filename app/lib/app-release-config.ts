/**
 * Source de vérité pour la version publiée de l'app mobile Neurix.
 *
 * À chaque nouvelle release Android :
 * 1. Incrémenter `versionCode`/`build-number` dans `agenda_flutter/pubspec.yaml`
 *    (ex. `1.0.1+7`) et builder l'APK (`flutter build apk --release`).
 * 2. Déposer le fichier dans `agenda/public/downloads/neurix.apk` (écrase l'ancien).
 * 3. Mettre à jour `latestVersion` / `latestBuildNumber` ci-dessous avec les mêmes
 *    valeurs que le pubspec (`version: X.Y.Z+buildNumber`).
 * 4. Si l'update corrige un problème bloquant / casse la compatibilité avec les
 *    anciennes versions, relever `minSupportedBuildNumber` pour forcer la mise à jour.
 */
export type AppReleaseInfo = {
  /** Nom de version affiché (ex. "1.0.0"). */
  latestVersion: string;
  /** Doit correspondre au build-number Flutter (`versionCode` Android). */
  latestBuildNumber: number;
  /**
   * Version minimale acceptée : toute app avec un buildNumber < ce nombre
   * affichera un écran de mise à jour obligatoire (bloquant).
   */
  minSupportedBuildNumber: number;
  /** Lien de téléchargement direct de l'APK (ou de la page de téléchargement). */
  downloadUrl: string;
  /** Notes affichées dans le dialogue de mise à jour (optionnel). */
  notes?: string;
};

export const APP_RELEASES: Record<'android' | 'ios', AppReleaseInfo> = {
  android: {
    latestVersion: '1.0.0',
    latestBuildNumber: 6,
    // Android 7.0 (API 24) minimum — voir agenda_flutter/android/app/build.gradle.kts.
    minSupportedBuildNumber: 1,
    downloadUrl: '/download',
    notes: 'Dernière version disponible avec les correctifs et nouveautés récentes.',
  },
  ios: {
    latestVersion: '1.0.0',
    latestBuildNumber: 6,
    minSupportedBuildNumber: 1,
    downloadUrl: '/download',
  },
};

export function getAppReleaseInfo(platform: string | null): AppReleaseInfo {
  if (platform === 'ios') return APP_RELEASES.ios;
  return APP_RELEASES.android;
}
