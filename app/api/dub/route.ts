import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetLang = formData.get('targetLang') as string;

    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    // 1. ElevenLabs STT (음성 추출 및 전사) [cite: 24]
    const sttFormData = new FormData();
    sttFormData.append('file', file);
    sttFormData.append('model_id', 'scribe_v1');

    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
      body: sttFormData,
    });
    const { text: originalText } = await sttResponse.json();

    // 2. 번역 (OpenAI 사용) [cite: 25]
    const translation = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Translate this to ${targetLang}: ${originalText}` }],
    });
    const translatedText = translation.choices[0].message.content;

    // 3. ElevenLabs TTS (음성 합성) [cite: 26]
    const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text: translatedText,
        model_id: 'eleven_multilingual_v2',
      }),
    });

    const dubbedAudioBuffer = await ttsResponse.arrayBuffer();

    // 4. 결과물 반환 [cite: 27]
    return new NextResponse(dubbedAudioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "처리 중 오류 발생" }, { status: 500 });
  }
}