# app 
https://stocknews1.vercel.app/

# FinanceAI Stock & SIP Dashboard

React + Vite dashboard that pairs live market news with your saved Stocks/SIPs, summarizes the impact using Groq AI, and stores portfolio picks in Supabase. Finnhub powers market data and mfapi.in drives SIP search.

## Features
- Email/password auth via Supabase; per-user asset list stored in `user_assets`.
- Portfolio dashboard with add/delete for Stocks (Finnhub search) and SIPs (mfapi search).
- One-click AI portfolio outlook based on the latest Finnhub news headlines.
- Stock Strategy / SIP Strategy tabs: loads 10 fresh articles, then Groq AI returns impact + next smart move for your holdings.
- Clean Vite + React 19 stack with linting and fast dev server.

## Tech Stack
- React 19, Vite
- Supabase Auth + Database
- Groq SDK (client-side for now)
- Finnhub News & Symbol Search, mfapi.in SIP search
- ESLint (core, react-hooks, react-refresh)

## Prerequisites
- Node.js 18+ (recommended)
- Finnhub API key
- Groq API key
- Supabase project (URL + anon public key)

## Setup
1) Install dependencies:
```bash
npm install
```
2) Create `.env.local` in `stock-dashboard/`:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FINNHUB_API_KEY=your_finnhub_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```
> Note: `VITE_GROQ_API_KEY` is used in the browser (`dangerouslyAllowBrowser: true`). For production, move Groq calls to a backend to keep the key secret.

3) Provision Supabase table `user_assets` (example schema):
```sql
create table public.user_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type in ('Stock','SIP')),
  asset_name text not null,
  created_at timestamptz not null default now()
);
create index on public.user_assets (user_id);
```
Ensure row-level security and policies permit users to read/write only their own rows.

## Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview build output
- `npm run lint` — lint the project

## Usage
- Start the app with `npm run dev` and open the shown localhost URL.
- Sign in/sign up via Supabase Auth UI.
- Dashboard tab: search and add Stocks (Finnhub) or SIPs (mfapi), remove with the ❌ button, and click “Refresh AI Summary” for a portfolio outlook.
- Stock Strategy / SIP Strategy tabs: auto-fetch 10 latest articles, then Groq AI returns "Impact on Your Portfolio" and "Next Smart Move" tailored to your saved assets.

## API & Data Notes
- Finnhub and mfapi requests are called directly from the browser; mind rate limits.
- Groq requests run client-side; avoid exposing sensitive keys in production.
- Supabase stores per-user assets; ensure RLS is configured before going live.

## Troubleshooting
- AI errors or empty responses: verify `VITE_GROQ_API_KEY` and check browser console.
- Finnhub 401/429: confirm `VITE_FINNHUB_API_KEY` and rate limits.
- Blank auth/session: ensure Supabase URL/anon key are correct and allowed origins include your dev URL.
- No search results: Finnhub requires ≥2 chars; SIP search requires ≥3 chars.

## Roadmap
- Move Groq calls to a backend proxy to hide keys.
- Add persisted AI history and user notes.
- Add deployment guide (Vercel/Netlify) once backend proxy exists.

## License
Add your license here (not yet specified).
