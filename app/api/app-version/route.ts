import { NextResponse } from 'next/server';
import { getAppReleaseInfo } from '@/app/lib/app-release-config';
import { getPublicSiteBaseUrl } from '@/app/lib/site-base-url';

export const runtime = 'nodejs';

/**
 * Endpoint public (pas d'auth) — l'app mobile l'appelle au démarrage pour savoir
 * si une mise à jour est disponible / obligatoire.
 *
 * `GET /api/app-version?platform=android`
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  const info = getAppReleaseInfo(platform);

  const downloadUrl = info.downloadUrl.startsWith('http')
    ? info.downloadUrl
    : `${getPublicSiteBaseUrl()}${info.downloadUrl}`;

  return NextResponse.json({
    latestVersion: info.latestVersion,
    latestBuildNumber: info.latestBuildNumber,
    minSupportedBuildNumber: info.minSupportedBuildNumber,
    downloadUrl,
    notes: info.notes ?? null,
  });
}
