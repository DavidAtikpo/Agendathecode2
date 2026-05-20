import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

export const runtime = 'nodejs';

const MEETING_CREDITS_COST = 3;

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans .env' },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true, aiCreditsExpiresAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  let credits = user.aiCredits;
  if (user.aiCreditsExpiresAt && user.aiCreditsExpiresAt < new Date() && credits > 0) {
    await prisma.user.update({ where: { id: userId }, data: { aiCredits: 0 } });
    credits = 0;
  }

  if (credits < MEETING_CREDITS_COST) {
    return NextResponse.json(
      {
        error: `Crédits insuffisants. Cette opération coûte ${MEETING_CREDITS_COST} crédits (vous en avez ${credits}).`,
        code: 'NO_CREDITS',
        creditsRemaining: credits,
        creditsRequired: MEETING_CREDITS_COST,
      },
      { status: 402 },
    );
  }

  let body: { transcript?: string; meetingDate?: string; meetingTitle?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const { transcript, meetingDate, meetingTitle } = body;
  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'Transcription vide' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { aiCredits: { decrement: MEETING_CREDITS_COST } },
    select: { aiCredits: true },
  });

  const client = new Anthropic({ apiKey });

  const prompt = `Tu es un assistant expert en rédaction de compte-rendus professionnels.

Ta tâche est de mettre en forme la transcription ci-dessous. Règles strictes :
1. Supprime les répétitions, les hésitations ("euh", "donc", "ben", "voilà"), les phrases inachevées.
2. Écris UN GRAND TITRE sur la première ligne (sans # ni préfixe).
3. Divise le contenu en sections logiques avec des sous-titres précédés de ## (exemple : ## Présentation des participants).
4. Garde TOUT le contenu important, ne résume pas.
5. Corrige l'orthographe et la grammaire.
6. Retourne UNIQUEMENT le texte mis en forme — aucun commentaire, aucune explication avant ou après.
7. Langue : français.

Date : ${meetingDate ?? 'non précisée'}
${meetingTitle ? `Titre suggéré : ${meetingTitle}` : ''}

Transcription brute :
"""
${transcript.trim()}
"""`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ text, creditsRemaining: updated.aiCredits });
  } catch (e: unknown) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiCredits: { increment: MEETING_CREDITS_COST } },
    });
    console.error('[meeting/analyze]', e);
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
