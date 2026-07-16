# Z-Quiz

> AI-powered exam prep for Zambian learners.

Z-Quiz is a mobile-first learning and quiz platform that helps G7–G12 / GCE
students prepare for ECZ exams using past-paper questions, with AI doing the
heavy lifting on:

- **Semantic marking** — marks answers by meaning, not exact wording
- **Handwriting recognition** — snap a photo of maths/chem working, get it marked
- **AI tutor** — explain topics, generate practice questions, on demand

## Status

🚧 **v1 in development** — MCQ quizzes, subject/topic browsing, score tracking.
v2 (AI marking), v3 (handwriting), v4 (tutor) coming after.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (Postgres + Auth + Storage)
- **AI (v2+):** MiniMax M3
- **State:** Zustand (added in commit 3)

## Local setup

```bash
cp .env.example .env.local
# fill in real Supabase + MiniMax keys
npm install
npm run dev
```

App runs on http://localhost:3000.

## Project structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # login, signup
│   ├── (app)/        # auth-required app shell + pages
│   └── api/          # API routes (v2+ AI endpoints)
├── components/       # React components
│   ├── ui/
│   ├── quiz/
│   └── layout/
├── lib/
│   ├── supabase/     # Supabase clients (browser/server/admin)
│   ├── ai/           # AI wrappers (v2+)
│   ├── stores/       # Zustand stores
│   └── utils/
├── types/            # Generated database types
└── ...
supabase/
└── migrations/       # SQL migrations
```

## Roadmap

| Version | Features |
|---|---|
| **v1 (current)** | Auth, subjects, topics, MCQ quizzes, score tracking |
| v2 | AI semantic marking (essay, short answer) |
| v3 | Handwriting OCR for maths/chem |
| v4 | AI tutor (explain, generate questions) |

## License

Private — © DalisoT
