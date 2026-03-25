import { NextRequest, NextResponse } from 'next/server';
import translate from 'google-translate-api-next';

// 1. 빌드 타임 에러 방지
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetLang = formData.get('targetLang') as string;
 

    if (!file) {
      return NextResponse.json({ error: "파일이 업로드되지 않았습니다." }, { status: 400 });
    }
 
    
    // 2. API Key 체크 (느낌표 제거 및 안전한 호출)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("서버 설정 오류: API Key가 없습니다.");
    }

    // 1. ElevenLabs STT
    const sttFormData = new FormData();
    sttFormData.append('file', file);
    sttFormData.append('model_id', 'scribe_v1');

    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey }, // ! 대신 변수 사용
      body: sttFormData,
    });

    if (!sttResponse.ok) throw new Error("음성 인식(STT)에 실패했습니다.");
    
    const { text: originalText } = await sttResponse.json();

    // 2. 무료 번역
    const translationRes = await translate(originalText, { to: targetLang });
    const translatedText = translationRes.text;

    // 3. ElevenLabs TTS
    const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/CwhRBWXzGAHq8TQ4Fs17', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey, // ! 대신 변수 사용
      },
      body: JSON.stringify({
        text: translatedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.json();
      const message = errorBody.detail?.status === 'quota_exceeded' 
        ? "API 사용 한도를 초과했습니다." 
        : "음성 합성 중 오류가 발생했습니다.";
      throw new Error(message);
    }
    
    const dubbedAudioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(dubbedAudioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error: any) {
    console.error('Dubbing Route Error:', error.message);
    return NextResponse.json({ error: error.message || "알 수 없는 오류 발생" }, { status: 500 });
  }
}