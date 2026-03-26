import { NextRequest, NextResponse } from 'next/server';
import translate from 'google-translate-api-next';

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const targetLang = formData.get('targetLang') as string;
    const voiceId = formData.get('voiceId') as string || 'CwhRBWXzGAHq8TQ4Fs17';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: "파일이 업로드되지 않았거나 형식이 잘못되었습니다." }, { status: 400 });
    }

    const fileSize = (file as File).size;
    if (fileSize > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일이 너무 큽니다. 4MB 이하 파일을 사용해주세요." },
        { status: 413 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("서버 설정 오류: API Key가 없습니다.");

    const sttFormData = new FormData();
    sttFormData.append('file', file);
    sttFormData.append('model_id', 'scribe_v1');
    sttFormData.append('timestamps_response', 'true');

    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: sttFormData,
    });
    if (!sttResponse.ok) throw new Error("음성 인식(STT)에 실패했습니다.");

    const sttData = await sttResponse.json();
    const originalText = sttData.text;
    const words = sttData.words || [];

    const chunks: { text: string, start: number }[] = [];
    if (words.length === 0) {
      chunks.push({ text: originalText, start: 0 });
    } else {
      let currentChunkText = "";
      let currentChunkStart = words[0].start;
      let lastWordEnd = words[0].end;
      for (const w of words) {
        if (w.type !== 'word') continue;
        if (w.start - lastWordEnd > 1.5 && currentChunkText.trim().length > 0) {
          chunks.push({ text: currentChunkText.trim(), start: currentChunkStart });
          currentChunkStart = w.start;
          currentChunkText = w.text;
        } else {
          currentChunkText += (currentChunkText ? " " : "") + w.text;
        }
        lastWordEnd = w.end;
      }
      if (currentChunkText.trim()) {
        chunks.push({ text: currentChunkText.trim(), start: currentChunkStart });
      }
    }

    const audioChunks: { audioBase64: string, start: number }[] = [];
    for (const chunk of chunks) {
      if (!chunk.text) continue;
      const translationRes = await translate(chunk.text, { to: targetLang });
      const translatedText = translationRes.text;
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
      const base64Audio = Buffer.from(dubbedAudioBuffer).toString('base64');
      audioChunks.push({ audioBase64: base64Audio, start: chunk.start });
    }

    return NextResponse.json({ chunks: audioChunks });

  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 에러가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
