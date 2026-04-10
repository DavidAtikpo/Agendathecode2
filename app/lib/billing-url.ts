import { getPublicSiteBaseUrl } from '@/app/lib/site-base-url';

/** Base publique (sans slash final), alignée sur OAuth / domaine custom. */
export function getBillingBaseUrl(): string {
  return getPublicSiteBaseUrl();
}
