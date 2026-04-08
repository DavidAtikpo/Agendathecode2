import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatTier = 'guest' | 'free' | 'pro';

async function resolveChatTier(): Promise<ChatTier> {
  const userId = await getSessionUserId();
  if (!userId) return 'guest';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) return 'guest';
  return user.plan === 'pro' ? 'pro' : 'free';
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();
    const tier = await resolveChatTier();

    const defaultModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    const proModel = process.env.OPENAI_MODEL_PRO?.trim();
    const model = tier === 'pro' && proModel ? proModel : defaultModel;

    const maxTokens = tier === 'pro' ? 2500 : tier === 'free' ? 1200 : 800;

    const tierHint =
      tier === 'pro'
        ? `L'utilisateur a un abonnement Neurix Pro : réponses plus complètes et structurées lorsque c'est pertinent ; tu peux proposer des listes à puces et des étapes concrètes.`
        : tier === 'free'
          ? `L'utilisateur est en version gratuite : reste utile mais plutôt concis par défaut.`
          : `Visiteur non connecté (session locale) : réponses courtes et directes.`;

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

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
      tier,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
