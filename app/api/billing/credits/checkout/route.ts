import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { getStripe } from '@/app/lib/stripe';
import { getBillingBaseUrl } from '@/app/lib/billing-url';

export const runtime = 'nodejs';

/** Prix unitaire d'un pack (en centimes USD) */
const PACK_PRICE_CENTS = 500; // $5
/** Crédits accordés par pack */
const CREDITS_PER_PACK = 2500;
const MIN_PACKS = 1;
const MAX_PACKS = 100;

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Paiement non configuré (STRIPE_SECRET_KEY manquant).' },
      { status: 503 },
    );
  }

  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: sessionId } });
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  // Parse quantity from body (default 1)
  let quantity = 1;
  try {
    const body = await request.json();
    const q = parseInt(String(body.quantity ?? '1'), 10);
    if (!Number.isNaN(q) && q >= MIN_PACKS && q <= MAX_PACKS) {
      quantity = q;
    }
  } catch {
    // no body or invalid JSON — use default quantity 1
  }

  const totalCredits = CREDITS_PER_PACK * quantity;
  const totalCents = PACK_PRICE_CENTS * quantity;
  const base = getBillingBaseUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: totalCents,
            product_data: {
              name: `Neurix IA — ${totalCredits.toLocaleString('fr-FR')} crédits`,
              description: `${totalCredits.toLocaleString('fr-FR')} messages avec l'assistant IA Claude. Validité 1 an.`,
            },
          },
        },
      ],
      success_url: `${base}/?billing=credits_success`,
      cancel_url: `${base}/?billing=cancel`,
      metadata: {
        userId: user.id,
        purpose: 'ai_credits',
        credits: String(totalCredits),
      },
      client_reference_id: user.id,
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
    console.error('[billing/credits/checkout]', e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
