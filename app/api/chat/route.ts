import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

export const runtime = 'nodejs';

const AI_CREDITS_PER_MESSAGE = 1;

type ChatTier = 'guest' | 'free' | 'pro';

interface UserCreditInfo {
  tier: ChatTier;
  userId: string | null;
  aiCredits: number;
  aiCreditsExpiresAt: Date | null;
}

async function resolveUserInfo(): Promise<UserCreditInfo> {
  const userId = await getSessionUserId();
  if (!userId) return { tier: 'guest', userId: null, aiCredits: 0, aiCreditsExpiresAt: null };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, aiCredits: true, aiCreditsExpiresAt: true },
  });
  if (!user) return { tier: 'guest', userId: null, aiCredits: 0, aiCreditsExpiresAt: null };

  const tier: ChatTier = user.plan === 'pro' ? 'pro' : 'free';

  // Expire credits lazily if past expiration date
  let aiCredits = user.aiCredits;
  if (user.aiCreditsExpiresAt && user.aiCreditsExpiresAt < new Date() && aiCredits > 0) {
    await prisma.user.update({ where: { id: userId }, data: { aiCredits: 0 } });
    aiCredits = 0;
  }

  return { tier, userId, aiCredits, aiCreditsExpiresAt: user.aiCreditsExpiresAt };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Clé Anthropic manquante côté serveur.' }, { status: 503 });
  }

  try {
    const { messages, context } = await request.json();
    const { tier, userId, aiCredits } = await resolveUserInfo();

    // Guests and logged-in users without credits cannot chat
    if (!userId) {
      return NextResponse.json(
        { error: 'Connectez-vous pour utiliser l\'assistant IA.', code: 'NOT_AUTHENTICATED' },
        { status: 401 },
      );
    }

    if (aiCredits < AI_CREDITS_PER_MESSAGE) {
      return NextResponse.json(
        { error: 'Crédits insuffisants. Achetez des crédits pour continuer.', code: 'NO_CREDITS', creditsRemaining: 0 },
        { status: 402 },
      );
    }

    const client = new Anthropic({ apiKey });
    const maxTokens = tier === 'pro' ? 2500 : 1500;

    const tierHint =
      tier === 'pro'
        ? `L'utilisateur a un abonnement Neurix Pro : réponses plus complètes et structurées lorsque c'est pertinent ; tu peux proposer des listes à puces et des étapes concrètes.`
        : `L'utilisateur est en version standard : reste utile et concis.`;

    const systemPrompt = `Tu es l'assistant IA de Neurix (idées, notes et tâches en équipe).

${tierHint}

Tu aides à :
- Développer et enrichir les idées et notes
- Organiser et prioriser les tâches
- Trouver des liens entre les contenus
- Proposer des actions concrètes

Contexte actuel de l'application :
${context}

Réponds en français.`;

    // Deduct credit before calling Claude (prevents abuse on error retry)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { aiCredits: { decrement: AI_CREDITS_PER_MESSAGE } },
      select: { aiCredits: true },
    });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    return NextResponse.json({
      message: text,
      tier,
      creditsRemaining: updatedUser.aiCredits,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
