import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

export const runtime = 'nodejs';

/** Coût en crédits pour une analyse de réunion (plus intensive qu'un message de chat) */
const MEETING_CREDITS_COST = 5;

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

  // Check and deduct credits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true, aiCreditsExpiresAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  // Lazy expiry
  let credits = user.aiCredits;
  if (user.aiCreditsExpiresAt && user.aiCreditsExpiresAt < new Date() && credits > 0) {
    await prisma.user.update({ where: { id: userId }, data: { aiCredits: 0 } });
    credits = 0;
  }

  if (credits < MEETING_CREDITS_COST) {
    return NextResponse.json(
      {
        error: `Crédits insuffisants. Cette analyse coûte ${MEETING_CREDITS_COST} crédits (vous en avez ${credits}).`,
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

  // Deduct credits before the API call
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { aiCredits: { decrement: MEETING_CREDITS_COST } },
    select: { aiCredits: true },
  });

  const client = new Anthropic({ apiKey });

  const prompt = `Tu es un assistant expert en analyse de réunions professionnelles.
Analyse cette transcription et retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après.

Date et heure : ${meetingDate ?? 'non précisée'}
${meetingTitle ? `Titre fourni : ${meetingTitle}` : ''}

Transcription :
"""
${transcript.trim()}
"""

Retourne ce JSON exact (toutes les clés sont requises, utilise [] si vide) :
{
  "title": "Titre concis de la réunion (déduit du contenu)",
  "summary": "Résumé global en 3 à 5 phrases claires",
  "duration_estimate": "Durée estimée ou mentionnée, ou null",
  "participants": ["Noms ou rôles des participants mentionnés"],
  "keyPoints": ["Point clé 1", "Point clé 2"],
  "decisions": ["Décision prise 1", "Décision prise 2"],
  "actionItems": [
    { "who": "Personne responsable", "what": "Action à réaliser", "deadline": "Échéance ou null" }
  ],
  "nextMeeting": "Date ou description de la prochaine réunion, ou null",
  "notes": "Autres observations importantes, ou null"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const analysis = JSON.parse(cleaned);
      return NextResponse.json({ analysis, creditsRemaining: updated.aiCredits });
    } catch {
      return NextResponse.json({ analysis: null, rawText: raw, creditsRemaining: updated.aiCredits });
    }
  } catch (e: unknown) {
    // Refund credits on Claude API failure
    await prisma.user.update({
      where: { id: userId },
      data: { aiCredits: { increment: MEETING_CREDITS_COST } },
    });
    console.error('[meeting/analyze]', e);
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
