import { NextRequest, NextResponse } from 'next/server';
import translate from 'google-translate-api-next';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const targetLang = formData.get('targetLang') as string;
    const voiceId = formData.get('voiceId') as string || 'CwhRBWXzGAHq8TQ4Fs17'; // 기본 목소리

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: "파일이 업로드되지 않았거나 형식이 잘못되었습니다." }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("서버 설정 오류: API Key가 없습니다.");

    // 1. ElevenLabs STT
    const sttFormData = new FormData();
    sttFormData.append('file', file);
    sttFormData.append('model_id', 'scribe_v1');

    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: sttFormData,
    });

    if (!sttResponse.ok) throw new Error("음성 인식(STT)에 실패했습니다.");
    const { text: originalText } = await sttResponse.json();

    // 2. 무료 번역
    const translationRes = await translate(originalText, { to: targetLang });
    const translatedText = translationRes.text;

    // 3. ElevenLabs TTS (선택된 voiceId 사용)
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: translatedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.json();
      throw new Error(errorBody.detail?.status === 'quota_exceeded' ? "한도 초과" : "음성 합성 실패");
    }
    
    const dubbedAudioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(dubbedAudioBuffer, {
      headers: { 
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="dubbed.mp3"'
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 에러가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}