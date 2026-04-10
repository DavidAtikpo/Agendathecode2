import { NextResponse } from 'next/server';
import { getProPricingForDisplay } from '@/app/lib/billing-pro-config';
import { PRO_SUBSCRIPTION_SALES_ENABLED } from '@/app/lib/feature-flags';

export const runtime = 'nodejs';

/** Libellé prix Pro pour l’UI (sans secret). */
export async function GET() {
  if (!PRO_SUBSCRIPTION_SALES_ENABLED) {
    return NextResponse.json({ proPriceLabel: null, checkoutConfigured: false });
  }
  const { label, configured } = getProPricingForDisplay();
  return NextResponse.json({
    proPriceLabel: label,
    checkoutConfigured: configured,
  });
}
