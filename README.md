# Maghrebia Assistant — Frontend (`botfront`)

Next.js (App Router) + TypeScript + Tailwind frontend for the Maghrebia
conversational assistant. It provides the authentication views (split-screen
login / register), session-protected routing, the chat experience with a
conversation-history sidebar and composer, and a voice mode at `/voice`.

## Prerequisites

- **Node.js 18.18+** (or 20+)
- The **backend** (`flaskback`) running at `http://localhost:5000`

## 1. Install dependencies

```bash
npm install
```

## 2. Configure the backend URL (optional)

The app calls the backend at `http://localhost:5000` by default. To point it
elsewhere, create `.env.local`:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## 3. Run the development server

```bash
npm run dev
```

Open **http://localhost:3000**. The home and settings pages require a session,
so you'll be redirected to `/login` — register an account at `/register`, then
sign in.

## Routes

- `/login`, `/register` — public auth views (redirect home if already signed in)
- `/` — chat (history sidebar + composer); protected
- `/settings` — preferences; protected
- `/voice` — voice mode (speech-to-text via the Web Speech API; TTS is a
  deferred Gemini seam); protected

## Scripts

```bash
npm run dev      # start the dev server (http://localhost:3000)
npm run build    # production build
npm run start    # serve the production build
npm run test     # run the Vitest suite (unit + property-based)
npm run lint     # lint
```

## Notes

- Conversation history is persisted per signed-in user in the browser
  (`localStorage`) — there is no backend store for it yet.
- Voice text-to-speech is not wired; `src/lib/voice/tts.ts` is the integration
  seam for Gemini TTS.
