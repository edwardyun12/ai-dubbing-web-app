# 🎙️ AI Video Dubbing Service (ESTsoft DevRel 과제)

본 프로젝트는 **코딩 에이전트(Gemini)**를 주도적으로 활용하여 구축한 **AI 음성 더빙 웹 서비스**입니다. [cite_start]사용자가 업로드한 영상/오디오의 음성을 추출하여 원하는 언어로 자연스럽게 더빙해주는 기능을 제공합니다. [cite: 7, 17]

## 🔗 서비스 링크
* [cite_start]**배포 URL**: [여기에 Vercel 배포 URL을 입력하세요] [cite: 4, 44]
* [cite_start]**GitHub Repository**: [여기에 레포지터리 주소 입력] [cite: 4]

## ✨ 주요 기능 (Key Features)

### [cite_start]1. AI 음성 더빙 (Voice Dubbing) [cite: 9, 15]
* [cite_start]**음성 추출 및 전사**: ElevenLabs API를 사용하여 업로드된 파일에서 음성을 추출하고 텍스트로 변환합니다. [cite: 24]
* [cite_start]**다국어 번역**: 전사된 텍스트를 사용자가 선택한 타겟 언어로 번역합니다. [cite: 25]
* [cite_start]**음성 합성 (TTS)**: 번역된 텍스트를 ElevenLabs API를 통해 타겟 언어 음성으로 합성합니다. [cite: 26]
* [cite_start]**결과물 제공**: 더빙이 완료된 결과물을 웹에서 재생하고 다운로드할 수 있습니다. [cite: 27]

### [cite_start]2. 화이트리스트 기반 회원 관리 [cite: 29, 30]
* [cite_start]**Google OAuth**: 보안이 강화된 구글 소셜 로그인을 구현했습니다. [cite: 32]
* [cite_start]**접근 제어**: **Turso Database**에 등록된 화이트리스트 이메일 사용자만 서비스 이용이 가능합니다. [cite: 33, 35]
* [cite_start]**비인가 차단**: 허용 리스트에 없는 사용자는 접근을 차단하고 안내 메시지를 표시합니다. [cite: 34]
* [cite_start]**필수 허용 계정**: `kts123@estsoft.com` 계정이 DB에 등록되어 즉시 테스트가 가능합니다. [cite: 36, 37]

## [cite_start]🛠 기술 스택 (Tech Stack) [cite: 42]
* [cite_start]**Framework**: Next.js (App Router) [cite: 16]
* [cite_start]**Authentication**: NextAuth.js (Google Provider) [cite: 32]
* [cite_start]**Database**: Turso (SQLite 기반 Edge DB) [cite: 12, 35]
* [cite_start]**AI API**: ElevenLabs (Transcription & Synthesis) [cite: 12]
* [cite_start]**Deployment**: Vercel (GitHub 연동 자동 배포) [cite: 12, 48]

## [cite_start]🚀 로컬 실행 방법 (Local Setup) [cite: 43]

1. **저장소 클론**
   ```bash
   git clone [your-repository-url]
   cd ai-video-dubbing

의존성 설치

Bash
npm install

   🤖 코딩 에이전트 활용 방법 및 노하우 본 프로젝트는 Gemini 코딩 에이전트를 적극 활용하여 DevRel의 핵심 역량인 "직접 만들고 공유하는" 과정을 실천했습니다. 에이전트 주도 개발: 초기 아키텍처 설계부터 NextAuth와 Turso DB를 연동하는 복잡한 인증 로직까지 에이전트와의 질의응답을 통해 구현했습니다. 효율적인 문제 해결: 환경 변수 보안 설정 및 Next.js 15의 클라이언트 컴포넌트 제약 사항(Suspense 이슈 등)을 에이전트의 실시간 가이드를 통해 해결했습니다.협업 노하우: 단순 코드 생성을 넘어 코드의 각 라인에 대한 상세한 주석 작성을 요청하여 유지보수성과 가독성을 극대화했습니다. 