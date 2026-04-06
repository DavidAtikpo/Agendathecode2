import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { getStripe } from '@/app/lib/stripe';
import { getBillingBaseUrl } from '@/app/lib/billing-url';

export const runtime = 'nodejs';

export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: sessionId } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'Aucun abonnement Stripe associé à ce compte.' },
      { status: 400 }
    );
  }

  const base = getBillingBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${base}/`,
  });

  return NextResponse.json({ url: portal.url });
}
