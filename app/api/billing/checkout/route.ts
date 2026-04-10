import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { getStripe } from '@/app/lib/stripe';
import { getBillingBaseUrl } from '@/app/lib/billing-url';
import { getProCheckoutLineItem } from '@/app/lib/billing-pro-config';
import { PRO_SUBSCRIPTION_SALES_ENABLED } from '@/app/lib/feature-flags';

export const runtime = 'nodejs';

export async function POST() {
  if (!PRO_SUBSCRIPTION_SALES_ENABLED) {
    return NextResponse.json(
      { error: 'L’abonnement Pro n’est pas encore disponible à la souscription.' },
      { status: 403 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Paiement non configuré (STRIPE_SECRET_KEY manquant).' },
      { status: 503 }
    );
  }

  const line = getProCheckoutLineItem();
  if (!line.ok) {
    return NextResponse.json({ error: line.error }, { status: line.status });
  }

  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: sessionId } });
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  const base = getBillingBaseUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [line.lineItem],
      success_url: `${base}/?billing=success`,
      cancel_url: `${base}/?billing=cancel`,
      metadata: { userId: user.id },
      client_reference_id: user.id,
      allow_promotion_codes: true,
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Session Stripe invalide' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const message =
      e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
        ? (e as { message: string }).message
        : 'Erreur Stripe';
    console.error('[billing/checkout]', e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
