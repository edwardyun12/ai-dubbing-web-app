'use client';

import { useState } from 'react';

export default function DubbingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('en');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      alert("파일을 선택해주세요!");
      return;
    }
    setLoading(true);
    setResultUrl(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetLang', targetLang);

    try {
      const res = await fetch('/api/dub', { 
        method: 'POST', 
        body: formData 
      });

      if (res.ok) {
        const blob = await res.blob();
        setResultUrl(URL.createObjectURL(blob));
      } else {
        const errorData = await res.json();
        alert("실패: " + errorData.error);
      }
    } catch (error) {
      console.error(error);
      alert("서버 통신 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-10 flex flex-col items-center font-sans">
      <div className="max-w-md w-full border border-gray-200 p-8 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">AI Video Dubbing</h1>
        <p className="text-sm text-gray-500 mb-8">영상을 업로드하면 다른 언어로 더빙해줍니다.</p>
        
        <div className="space-y-6">
          {/* 파일 업로드 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">파일 업로드 (MP4, MP3)</label>
            <input 
              type="file" 
              accept="video/*,audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* 언어 선택 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">변경할 언어</label>
            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en">영어 (English)</option>
              <option value="ja">일본어 (Japanese)</option>
              <option value="ko">한국어 (Korean)</option>
              <option value="es">스페인어 (Spanish)</option>
            </select>
          </div>

          {/* 시작 버튼 */}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-bold transition-colors ${
              loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? '더빙 생성 중...' : '더빙 시작하기'}
          </button>
        </div>

        {/* 결과 플레이어 */}
        {resultUrl && (
          <div className="mt-10 border-t pt-6 text-center">
            <p className="text-sm font-bold text-green-600 mb-4">✅ 더빙 완료!</p>
            <audio src={resultUrl} controls className="w-full mb-4" />
            <a 
              href={resultUrl} 
              download="dubbed_audio.mp3" 
              className="inline-block text-sm text-blue-600 font-medium hover:underline"
            >
              결과 파일 저장하기
            </a>
          </div>
        )}
      </div>
    </main>
  );
}