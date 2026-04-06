export type BillingInterval = 'month' | 'year';

/** Ligne Checkout Stripe (abonnement) — compatible `checkout.sessions.create`. */
export type ProCheckoutLineItem =
  | { price: string; quantity: number }
  | {
      quantity: number;
      price_data: {
        currency: string;
        product_data: { name: string };
        unit_amount: number;
        recurring: { interval: BillingInterval };
      };
    };

function parsePositiveInt(raw: string | undefined): number | null {
  if (raw === undefined || raw === '') return null;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function normalizeCurrency(raw: string | undefined): string {
  const c = (raw ?? 'eur').trim().toLowerCase();
  return c.length === 3 ? c : 'eur';
}

function normalizeInterval(raw: string | undefined): BillingInterval {
  const i = (raw ?? 'month').trim().toLowerCase();
  return i === 'year' ? 'year' : 'month';
}

/** Libellé affiché (EUR/USD : centimes → unités majeures). */
export function formatProPriceLabel(
  unitAmountSmallest: number,
  currencyCode: string,
  interval: BillingInterval
): string {
  const currency = currencyCode.toUpperCase();
  const zeroDecimal = new Set([
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
  ]);
  const major = zeroDecimal.has(currency.toLowerCase())
    ? unitAmountSmallest
    : unitAmountSmallest / 100;
  const fmt = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  });
  const suffix = interval === 'year' ? '/ an' : '/ mois';
  return `${fmt.format(major)}${suffix}`;
}

export type ProCheckoutLineItemResult =
  | { ok: true; lineItem: ProCheckoutLineItem }
  | { ok: false; error: string; status: number };

/**
 * Soit `STRIPE_PRICE_ID_PRO` (price_…) — prix créé dans le Dashboard Stripe,
 * soit `STRIPE_PRO_UNIT_AMOUNT` + devise / période — prix défini dans l’app.
 */
export function getProCheckoutLineItem(): ProCheckoutLineItemResult {
  const priceId = process.env.STRIPE_PRICE_ID_PRO?.trim();

  if (priceId) {
    if (!priceId.startsWith('price_')) {
      return {
        ok: false,
        status: 400,
        error:
          'STRIPE_PRICE_ID_PRO doit commencer par price_ (ID Stripe), ou retirez-le et utilisez STRIPE_PRO_UNIT_AMOUNT.',
      };
    }
    return {
      ok: true,
      lineItem: { price: priceId, quantity: 1 },
    };
  }

  const unitAmount = parsePositiveInt(process.env.STRIPE_PRO_UNIT_AMOUNT);
  if (unitAmount === null) {
    return {
      ok: false,
      status: 503,
      error:
        'Tarif Pro non configuré : définissez STRIPE_PRO_UNIT_AMOUNT (montant en plus petite unité, ex. centimes pour EUR : 999 = 9,99 €) ou STRIPE_PRICE_ID_PRO.',
    };
  }

  const currency = normalizeCurrency(process.env.STRIPE_PRO_CURRENCY);
  const interval = normalizeInterval(process.env.STRIPE_PRO_INTERVAL);
  const name = (process.env.STRIPE_PRO_PRODUCT_NAME ?? 'Agenda Pro').trim() || 'Agenda Pro';

  return {
    ok: true,
    lineItem: {
      quantity: 1,
      price_data: {
        currency,
        product_data: { name },
        unit_amount: unitAmount,
        recurring: { interval },
      },
    },
  };
}

export function getProPricingForDisplay(): {
  label: string | null;
  configured: boolean;
} {
  const priceId = process.env.STRIPE_PRICE_ID_PRO?.trim();
  if (priceId?.startsWith('price_')) {
    return { label: null, configured: true };
  }

  const unitAmount = parsePositiveInt(process.env.STRIPE_PRO_UNIT_AMOUNT);
  if (unitAmount === null) {
    return { label: null, configured: false };
  }

  const currency = normalizeCurrency(process.env.STRIPE_PRO_CURRENCY);
  const interval = normalizeInterval(process.env.STRIPE_PRO_INTERVAL);
  return {
    configured: true,
    label: formatProPriceLabel(unitAmount, currency, interval),
  };
}
