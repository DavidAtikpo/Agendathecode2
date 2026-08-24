import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/app/lib/auth';
import {
  isGoogleSpeechConfigured,
  transcribeWithGoogleSpeech,
  type GoogleSpeechEncoding,
} from '@/app/lib/google-speech';

export const runtime = 'nodejs';

const ALLOWED_ENCODINGS = new Set<GoogleSpeechEncoding>([
  'LINEAR16',
  'WEBM_OPUS',
  'OGG_OPUS',
]);

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (!isGoogleSpeechConfigured()) {
    return NextResponse.json(
      { error: 'Google Speech API non configurée (GOOGLE_SPEECH_API_KEY)' },
      { status: 503 },
    );
  }

  let body: {
    audio?: string;
    encoding?: GoogleSpeechEncoding;
    sampleRateHertz?: number;
    languageCode?: string;
    alternativeLanguageCodes?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const audio = body.audio?.trim();
  if (!audio) {
    return NextResponse.json({ error: 'Audio manquant' }, { status: 400 });
  }

  const encoding = body.encoding ?? 'LINEAR16';
  if (!ALLOWED_ENCODINGS.has(encoding)) {
    return NextResponse.json({ error: 'Encodage audio non supporté' }, { status: 400 });
  }

  const sampleRateHertz = body.sampleRateHertz ?? (encoding === 'LINEAR16' ? 16000 : 48000);
  const languageCode = body.languageCode?.trim() || 'fr-FR';
  const alternativeLanguageCodes = Array.isArray(body.alternativeLanguageCodes)
    ? body.alternativeLanguageCodes.filter((c): c is string => typeof c === 'string')
    : undefined;

  try {
    const transcript = await transcribeWithGoogleSpeech({
      audioBase64: audio,
      encoding,
      sampleRateHertz,
      languageCode,
      alternativeLanguageCodes,
    });
    return NextResponse.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur transcription';
    console.error('[speech/transcribe]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
