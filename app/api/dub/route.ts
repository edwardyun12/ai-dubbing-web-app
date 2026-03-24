import { NextRequest, NextResponse } from 'next/server';
import translate from 'google-translate-api-next';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetLang = formData.get('targetLang') as string;

    if (!file) {
      return NextResponse.json({ error: "파일이 업로드되지 않았습니다." }, { status: 400 });
    }

    // 1. ElevenLabs STT
    const sttFormData = new FormData();
    sttFormData.append('file', file);
    sttFormData.append('model_id', 'scribe_v1');

    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
      body: sttFormData,
    });

    if (!sttResponse.ok) {
      const errorDetail = await sttResponse.text();
      throw new Error(`STT 실패: ${errorDetail}`);
    }
    const { text: originalText } = await sttResponse.json();
    console.log("전사된 텍스트:", originalText); // 디버깅용

    // 2. 무료 번역
    const translationRes = await translate(originalText, { to: targetLang });
    const translatedText = translationRes.text;
    console.log("번역된 텍스트:", translatedText); // 디버깅용

   // 3. ElevenLabs TTS (무료 계정 전용 기본 목소리 ID로 교체)
    const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/CwhRBWXzGAHq8TQ4Fs17', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text: translatedText,
        model_id: 'eleven_multilingual_v2', // 다국어 지원 (일본어 번역에 필수)
        voice_settings: { 
          stability: 0.5, 
          similarity_boost: 0.75 
        },
      }),
    });
    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.json();
      console.error("ElevenLabs TTS 에러 상세:", errorBody);
      
      // 만약 'quota_exceeded'가 포함되어 있다면 한도 초과입니다.
      const message = errorBody.detail?.status === 'quota_exceeded' 
        ? "ElevenLabs 무료 한도(글자 수)를 모두 사용했습니다." 
        : "음성 합성 중 오류가 발생했습니다.";
      throw new Error(message);
    }
    
    const dubbedAudioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(dubbedAudioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error: any) {
    console.error('전체 에러 로그:', error);
    return NextResponse.json({ error: error.message || "알 수 없는 오류 발생" }, { status: 500 });
  }
}