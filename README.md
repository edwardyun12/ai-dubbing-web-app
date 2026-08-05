# 🎙️ AI Dubbing Web App

> Upload an audio or video file and get it automatically dubbed into the language of your choice.

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)
[![Turso](https://img.shields.io/badge/Turso-4FF8D2?style=flat&logo=turso&logoColor=black)](https://turso.tech/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=flat)](https://elevenlabs.io/)

---

## 🌐 Live service
* **Deployed URL**: https://ai-dubbing-web-app-assignment.vercel.app
* **GitHub Repository**: https://github.com/edwardyun12/ai-dubbing-web-app

---

## 📌 Overview

https://github.com/user-attachments/assets/e77a38d9-8ecb-4010-aff0-bfc8d9d80cf3

An AI dubbing web app built with heavy use of coding agents (Claude Code, Google Gemini).

When a user uploads an audio or video file, it's processed automatically through this pipeline:

1. Extract and transcribe speech from the uploaded file — **ElevenLabs API**
2. Translate the transcript into the target language — **Google Translate API**
3. Select and configure an AI voice suited to the target language — **ElevenLabs Voice Library**
4. Synthesize the translated text into speech in the target language — **ElevenLabs API**
5. Play back and download the dubbed result

---

## ✨ Features

### 🔊 Voice dubbing
- Upload an audio or video file
- Choose target language and voice type (male/female, calm/energetic, and other AI voice options)
- Outputs a dubbed audio/video file (up to 1 minute; longer files are auto-cropped)
- Play back and download the result

### 🔐 Account management (whitelist-based access control)
- Google OAuth login
- Only whitelisted emails can use the service
- Unauthorized users are blocked with an explanatory message
- Whitelisted member data is stored in **Turso DB**

### 🚀 Deployment automation
- Automatic **Vercel** deployment on every push to GitHub

---

## 🛠️ Tech stack

| Category | Technology |
|------|------|
| Framework | Next.js |
| Deployment | Vercel |
| Database | Turso |
| Voice API | ElevenLabs |
| Translation | Google Translate API |
| Auth | Google OAuth |
| Source control | GitHub |

---

## ⚙️ Running locally

### 1. Prerequisites

Sign up for the following services and get API keys.

| Service | Purpose | Link |
|--------|------|------|
| GitHub | Source control and deploy trigger | https://github.com |
| Vercel | Web hosting (free tier) | https://vercel.com |
| Turso | Database (free tier) | https://turso.tech |
| ElevenLabs | Speech transcription and synthesis API (free tier) | https://elevenlabs.io |

### 2. Clone the repo

```bash
git clone https://github.com/edwardyun12/ai-dubbing-web-app.git
cd ai-dubbing-web-app
```

### 3. Set environment variables

Create a `.env.local` file with:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.


## 🤖 Working with coding agents

This project made heavy use of coding agents, in the spirit of DevRel's core practice — **"build it yourself and share the experience."**
Development ran on a Q&A loop with the agents, from early architecture decisions through implementing NextAuth + Turso DB authentication,
and used their real-time guidance to work through issues like environment-variable security and Next.js client-component constraints (e.g. Suspense boundaries).

Beyond code generation, I asked for detailed line-by-line explanations and comments and went through repeated rounds of refactoring
to keep the codebase readable and maintainable.

### Agents used
- **Claude Code** — wrote the bulk of the codebase and implemented core functionality, including the more complex business logic and the first draft of this README.
- **Google Gemini, AntiGravity** — handled detailed debugging, documentation polish, and general optimization of the implemented code. Cross-checking between agents caught issues neither would have caught alone.

### Notes on working with agents

- **Be specific about requirements**: spelling out exact input/output specs produces more accurate code.
- **Break work into steps**: requesting one feature at a time gets better results than asking for everything at once.
- **Review before committing**: always read through agent-written code before committing it to Git.
- **Paste errors verbatim**: pasting the raw error log, not a paraphrase, gets faster fixes.

> 💡 What matters more than a polished first pass is **the process of working through problems together with the agent**.

## 📝 License

Built as a take-home assignment for the ESTsoft AI Translation Team DevRel Internship.
