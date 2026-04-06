import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();

    const systemPrompt = `Tu es un assistant intelligent intégré dans une application de gestion d'idées et de tâches appelée "Agenda". Tu aides les utilisateurs à :
- Développer et enrichir leurs idées et notes
- Organiser et prioriser leurs tâches
- Trouver des connexions entre différentes idées
- Rappeler des idées passées pertinentes
- Suggérer des améliorations et nouvelles pistes

Contexte actuel de l'application :
${context}

Réponds de manière concise et utile, en français. Tu peux proposer des actions concrètes (créer une tâche, développer une idée, etc.).`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1000,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
