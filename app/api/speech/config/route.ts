import { NextResponse } from 'next/server';
import { isGoogleSpeechConfigured } from '@/app/lib/google-speech';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ enabled: isGoogleSpeechConfigured() });
}
