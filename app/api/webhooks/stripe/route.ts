import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/app/lib/prisma';
import { getStripe } from '@/app/lib/stripe';

export const runtime = 'nodejs';

function isActiveStatus(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing';
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 });
  }

  const raw = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Signature invalide';
    console.error('[stripe webhook]', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (!userId) break;

        // Credits purchase (one-time payment)
        if (session.metadata?.purpose === 'ai_credits') {
          const creditsToAdd = parseInt(session.metadata.credits ?? '2500', 10);
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);

          const current = await prisma.user.findUnique({
            where: { id: userId },
            select: { aiCredits: true, aiCreditsExpiresAt: true, stripeCustomerId: true },
          });

          // If existing credits not yet expired, stack on top; otherwise reset expiry
          const now = new Date();
          const existingValid =
            current &&
            current.aiCreditsExpiresAt &&
            current.aiCreditsExpiresAt > now &&
            current.aiCredits > 0;

          await prisma.user.update({
            where: { id: userId },
            data: {
              aiCredits: existingValid
                ? { increment: creditsToAdd }
                : creditsToAdd,
              aiCreditsExpiresAt: existingValid
                ? current!.aiCreditsExpiresAt
                : expiresAt,
              ...(customerId && !current?.stripeCustomerId
                ? { stripeCustomerId: customerId }
                : {}),
            },
          });
          break;
        }

        // Pro subscription purchase
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (customerId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId ?? null,
              plan: 'pro',
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!user) break;

        const active = isActiveStatus(sub.status);
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        const endsAt = periodEnd ? new Date(periodEnd * 1000) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: active ? 'pro' : 'free',
            stripeSubscriptionId: sub.id,
            subscriptionEndsAt: active ? endsAt : endsAt,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'free',
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (e: unknown) {
    console.error('[stripe webhook handler]', e);
    return NextResponse.json({ error: 'Erreur traitement' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
