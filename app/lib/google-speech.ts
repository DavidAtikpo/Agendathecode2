export type GoogleSpeechEncoding = 'LINEAR16' | 'WEBM_OPUS' | 'OGG_OPUS';

export function isGoogleSpeechConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SPEECH_API_KEY?.trim());
}

function normalizeLanguageCode(code: string): string {
  const c = code.trim();
  if (!c) return 'fr-FR';
  if (c.includes('-')) return c;
  if (c.toLowerCase() === 'fr') return 'fr-FR';
  if (c.toLowerCase() === 'en') return 'en-US';
  return c;
}

/** Rejette les hallucinations anglaises quand la langue demandée est le français. */
function filterWrongLanguage(text: string, languageCode: string): string {
  const lang = normalizeLanguageCode(languageCode);
  if (!lang.startsWith('fr')) return text;

  const sample = text.trim();
  if (sample.length < 12) return text;

  const lower = sample.toLowerCase();
  const englishHints =
    /\b(the|and|you|was|were|this|that|with|have|from|what|when|where|how|why|okay|well|just|like|thank|thanks|hello|please|sorry|maybe|really|think|know|want|need|going|would|could|should|because|about|into|over|after|before|yeah|yes|no)\b/g;
  const frenchHints =
    /\b(le|la|les|de|du|des|un|une|je|tu|il|elle|nous|vous|ils|elles|est|sont|avec|pour|dans|sur|pas|plus|très|bien|donc|alors|mais|ou|où|que|qui|quoi|comment|pourquoi|merci|bonjour|réunion|aujourd|demain|hier|c'est|n'est|d'|l'|qu')\b/g;

  const en = (lower.match(englishHints) ?? []).length;
  const fr = (lower.match(frenchHints) ?? []).length;

  if (en >= 3 && fr === 0) return '';
  if (en >= 2 && fr <= 1 && sample.length < 40) return '';

  return text;
}

export async function transcribeWithGoogleSpeech(params: {
  audioBase64: string;
  encoding: GoogleSpeechEncoding;
  sampleRateHertz: number;
  languageCode: string;
  alternativeLanguageCodes?: string[];
}): Promise<string> {
  const key = process.env.GOOGLE_SPEECH_API_KEY?.trim();
  if (!key) {
    throw new Error('Google Speech API non configurée');
  }

  const { audioBase64, encoding, sampleRateHertz, alternativeLanguageCodes } = params;
  const languageCode = normalizeLanguageCode(params.languageCode);

  if (!audioBase64?.trim()) {
    return '';
  }

  const config: Record<string, unknown> = {
    encoding,
    sampleRateHertz,
    languageCode,
    enableAutomaticPunctuation: true,
    // Blocs courts (~8 s) : modèle adapté aux phrases courtes, pas latest_long.
    model: 'latest_short',
    maxAlternatives: 1,
  };

  // Évite la détection bilingue sur de courts blocs (source fréquente d'hallucinations EN).
  if (alternativeLanguageCodes?.length) {
    config.alternativeLanguageCodes = alternativeLanguageCodes
      .map(normalizeLanguageCode)
      .filter(c => c !== languageCode)
      .slice(0, 1);
  }

  const res = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        audio: { content: audioBase64 },
      }),
    },
  );

  const raw = await res.text();
  if (!res.ok) {
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      message = parsed.error?.message ?? raw;
    } catch {
      /* keep raw */
    }

    // Certains projets n'activent pas latest_short — repli sans modèle explicite.
    if (message.includes('model') && config.model) {
      const retryConfig = { ...config };
      delete retryConfig.model;
      const retry = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: retryConfig,
            audio: { content: audioBase64 },
          }),
        },
      );
      const retryRaw = await retry.text();
      if (retry.ok) {
        const data = JSON.parse(retryRaw) as {
          results?: { alternatives?: { transcript?: string; confidence?: number }[] }[];
        };
        return extractTranscript(data, languageCode);
      }
    }

    throw new Error(message || `Google Speech HTTP ${res.status}`);
  }

  let data: { results?: { alternatives?: { transcript?: string; confidence?: number }[] }[] };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error('Réponse Google Speech invalide');
  }

  return extractTranscript(data, languageCode);
}

function extractTranscript(
  data: { results?: { alternatives?: { transcript?: string; confidence?: number }[] }[] },
  languageCode: string,
): string {
  const parts: string[] = [];

  for (const r of data.results ?? []) {
    const alt = r.alternatives?.[0];
    if (!alt) continue;
    const transcript = alt.transcript?.trim();
    if (!transcript) continue;

    if (typeof alt.confidence === 'number' && alt.confidence < 0.35) {
      continue;
    }

    const filtered = filterWrongLanguage(transcript, languageCode);
    if (filtered) parts.push(filtered);
  }

  return parts.join(' ').trim();
}
