// Whisper transcription endpoint. Accepts a single audio file
// uploaded as multipart/form-data under the field "audio" and
// returns { text } from OpenAI's whisper-1 model. Auth-gated to
// the current Supabase user; abuse mitigation is the 25 MB
// upload cap (Whisper's hard limit) plus the 60-second clip
// cap enforced client-side. Soft cost rails — this is voice
// input for chat, not bulk transcription.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Transcription not configured' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
  }

  const audio = form.get('audio');
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: 'Empty audio file' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
  }

  // Whisper expects a File-like with a name + extension hint so it
  // can pick the right decoder. MediaRecorder typically emits
  // audio/webm or audio/mp4 depending on browser; the OpenAI SDK
  // accepts the Blob directly when wrapped as a File with a name.
  const audioBlob: Blob = audio;
  const file =
    audioBlob instanceof File
      ? audioBlob
      : new File([audioBlob], 'recording.webm', {
          type: audioBlob.type || 'audio/webm',
        });

  const openai = new OpenAI({ apiKey });
  try {
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text',
    });
    // SDK returns a string when response_format is 'text'.
    const text = typeof result === 'string' ? result : (result as { text?: string }).text ?? '';
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Transcription failed' },
      { status: 500 },
    );
  }
}
