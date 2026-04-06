import { NextResponse } from 'next/server';
import { getProPricingForDisplay } from '@/app/lib/billing-pro-config';

export const runtime = 'nodejs';

/** Libellé prix Pro pour l’UI (sans secret). */
export async function GET() {
  const { label, configured } = getProPricingForDisplay();
  return NextResponse.json({
    proPriceLabel: label,
    checkoutConfigured: configured,
  });
}
