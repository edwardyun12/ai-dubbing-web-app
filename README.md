# 🎙️ AI 더빙 웹 서비스

> 오디오 또는 비디오 파일을 업로드하면 원하는 언어로 자동 더빙해주는 웹 서비스

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)
[![Turso](https://img.shields.io/badge/Turso-4FF8D2?style=flat&logo=turso&logoColor=black)](https://turso.tech/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=flat)](https://elevenlabs.io/)

---

## 🌐 배포된 서비스 URL
* **배포 URL**: https://ai-dubbing-web-app-assignment.vercel.app
* **GitHub Repository**: https://github.com/edwardyun12/ai-dubbing-web-app

---

## 📌 서비스 소개

https://github.com/user-attachments/assets/e77a38d9-8ecb-4010-aff0-bfc8d9d80cf3


이 서비스는 **코딩 에이전트(Claude Code, Google Gemini)를 적극 활용**하여 구축한 AI 더빙 웹 서비스입니다.

사용자가 오디오 또는 비디오 파일을 업로드하면 다음 흐름으로 자동 처리됩니다:

1. 업로드된 파일에서 음성 추출 및 전사 — **ElevenLabs API**
2. 전사된 텍스트를 타겟 언어로 번역 — **Google Translate API**
3. 타겟 언어에 적합한 AI 목소리 선택 및 설정 — **ElevenLabs Voice Library**
4. 번역된 텍스트를 타겟 언어 음성으로 합성 — **ElevenLabs API**
5. 더빙된 결과물 재생 및 다운로드 제공

---

## ✨ 주요 기능

### 🔊 음성 더빙
- 오디오 또는 비디오 파일 업로드
- 타겟 언어 및 목소리 타입 선택 (남성/여성, 차분한/활기찬 등 다양한 AI 음성 지원)
- 더빙된 오디오/비디오 파일 출력 (최대 1분, 초과 시 자동 크롭 후 처리)
- 결과물 재생 및 다운로드

### 🔐 회원 관리 (화이트리스트 기반 접근 제어)
- Google OAuth 로그인
- 허용된 이메일만 서비스 이용 가능
- 미허가 사용자 접근 차단 (안내 메시지 표시)
- 허용 회원 데이터는 **Turso DB**에 저장

### 🚀 배포 자동화
- GitHub 커밋 & 푸시 시 **Vercel 자동 배포** 연동

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js |
| 배포 | Vercel |
| 데이터베이스 | Turso |
| 음성 API | ElevenLabs |
| 번역 | Google Translate API |
| 인증 | Google OAuth |
| 코드 저장소 | GitHub |

---

## ⚙️ 로컬 실행 방법

### 1. 사전 준비

아래 서비스에 가입하고 API 키를 발급받으세요.

| 서비스 | 용도 | 링크 |
|--------|------|------|
| GitHub | 코드 저장 및 배포 트리거 | https://github.com |
| Vercel | 웹 서비스 배포 (무료 플랜) | https://vercel.com |
| Turso | 데이터베이스 (무료 플랜) | https://turso.tech |
| ElevenLabs | 음성 전사 및 음성 합성 API (무료 플랜) | https://elevenlabs.io |

### 2. 저장소 클론

```bash
git clone https://github.com/edwardyun12/ai-dubbing-web-app.git
cd ai-dubbing-web-app
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 아래 값을 입력하세요:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. 패키지 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하세요.


## 🤖 코딩 에이전트 활용 방법 및 노하우

본 프로젝트는 코딩 에이전트를 적극 활용하여 DevRel의 핵심 역량인 **"직접 만들고 공유하는 경험"**을 실천했습니다.  
초기 아키텍처 설계부터 NextAuth와 Turso DB를 연동하는 복잡한 인증 로직 구현까지 에이전트와의 질의응답을 기반으로 개발을 진행했으며,  
환경 변수 보안 설정과 Next.js의 클라이언트 컴포넌트 제약(Suspense 이슈 등)과 같은 문제들을 실시간 가이드를 통해 효율적으로 해결했습니다.  

또한 단순한 코드 생성을 넘어 각 코드 라인에 대한 상세한 설명과 주석 작성을 요청하고, 반복적인 리팩토링을 수행함으로써  
가독성과 유지보수성이 높은 코드 구조를 구축했습니다.

### 활용한 에이전트
- **Claude Code** — 프로젝트의 전체적인 코드 베이스 작성 및 기능 구현을 담당했습니다. 특히 복잡한 비즈니스 로직 설계와 README.md의 초기 초안 작성을 수행했습니다.
- **Google Gemini, AntiGravity** — 구현된 코드의 세부 디버깅, 문서화 보완, 그리고 그 외 전반적인 최적화 작업을 수행했습니다.  에이전트 간의 교차 검증을 통해 코드의 안정성을 높였습니다.

### 활용 노하우
 
- **명확한 요구사항 전달**: 입출력 스펙을 구체적으로 명시하면 더 정확한 코드가 생성됩니다.
- **단계별 요청**: 전체 기능을 한 번에 요청하기보다, 기능 단위로 나눠 요청하면 결과가 좋습니다.
- **에이전트 검토 후 커밋**: 에이전트가 작성한 코드를 직접 리뷰한 뒤 Git에 커밋하는 습관을 유지하세요.
- **에러 메시지 그대로 전달**: 오류 발생 시 에러 로그를 그대로 붙여넣으면 빠르게 해결됩니다.

> 💡 코드의 완성도보다 **에이전트와 협업하며 문제를 해결하는 과정**이 중요합니다.

## 📝 라이선스

본 프로젝트는 ESTsoft AI Translation Team DevRel 인턴 채용 과제로 제작되었습니다.
