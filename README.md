<div align="center">

# fix.autodun.com

**AI-powered vehicle fix assistant for UK drivers**

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Claude AI](https://img.shields.io/badge/Claude_AI-D97757?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

🌐 **[fix.autodun.com](https://fix.autodun.com)** — live and free to use

</div>

---

## Overview

**fix.autodun.com** is a free, AI-powered vehicle fix assistant hub built for UK drivers. It combines Claude's language and vision capabilities with a clean, purpose-built interface to help drivers diagnose breakdowns, decode warning lights, appeal parking fines, and check whether a used car is fairly priced — all without needing to book a mechanic or pay for advice.

Every result includes a thumbs up / down feedback mechanism. That feedback is stored in Supabase as structured ML training data, building a dataset to train future Autodun AI models on real-world UK vehicle problems.

This project is built and maintained by a solo UK-based founder as part of the broader [Autodun](https://autodun.com) platform.

---

## Live Demo

> 🔗 [https://fix.autodun.com](https://fix.autodun.com)

No login required. Works on mobile and desktop.

---

## Features

### 🔧 Breakdown Assistant
Describe any vehicle problem and receive a structured AI diagnosis in seconds.

- Input: vehicle make, model, year, mileage, driveability status, and problem description
- Output: likely cause, severity rating (Critical / High / Medium / Low), whether it's safe to drive, immediate action steps, what to tell your mechanic, and a UK repair cost estimate
- Powered by Claude with a domain-specific mechanic system prompt

### ⚠️ Warning Light Decoder
Three input methods for maximum flexibility:

| Method | Description |
|--------|-------------|
| 📷 **Photo Upload** | Upload a dashboard photo — Claude Vision identifies the light and explains it |
| ⊞ **Grid Picker** | Tap any of 16 common warning lights (oil, ABS, airbag, DPF, TPMS, etc.) |
| 🔌 **OBD Code** | Enter a fault code (e.g. `P0300`) for a full technical breakdown |

Output includes: what the light means, severity, whether it's safe to drive, likely causes, repair steps, UK cost estimate, and a mechanic tip.

### 📋 Parking Fine Appeal Generator
Generates formal, ready-to-send UK appeal letters based on the circumstances of the fine.

- Supports both council PCNs and private parking charges
- Structured form: vehicle reg, date, location, reason on notice, grounds for appeal
- Output references relevant legislation: Traffic Management Act 2004, Protection of Freedoms Act 2012, BPA / IPC Codes of Practice, POPLA / IAS appeal procedures
- One-click **Copy Letter** button on the result

### 💰 Fair Price Checker
Two modes for evaluating a used car's price:

**📋 Text Details mode:**
- Paste any UK listing text for instant analysis
- Paste an AutoTrader / eBay Motors URL → a structured helper form appears (AutoTrader is login-protected; the form captures make, model, year, mileage, price, seller type, and extras)
- Output: GREAT DEAL / FAIR PRICE / OVERPRICED / UNDERPRICED verdict, green flags, red flags, fair market value, negotiation tips, and a pre-purchase checklist

**📷 Photo Valuation mode:**
- Upload any car photo (exterior works best)
- Claude Vision identifies the make, model, approximate year, and trim level
- Output: vehicle identified, condition rating (Excellent / Good / Fair / Poor), estimated UK market value range, key price factors, and a buying / selling tip

### 🧠 ML Feedback System
Every result screen includes a feedback bar:

> *"Was this helpful? Your feedback trains the Autodun AI"* 👍 👎

- Thumbs up / down vote captured on click
- Optional free-text comment (submitted on Enter or Send)
- Each feedback row inserted into Supabase with: `tool`, `vote`, `note`, `result_summary` (first 200 chars), `created_at`
- Builds a labelled training dataset of real UK vehicle queries and AI responses for future fine-tuning

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org) — App Router, Server Components, API Routes |
| AI | [Anthropic Claude API](https://anthropic.com) (`claude-sonnet-4-20250514`) with Vision |
| Database | [Supabase](https://supabase.com) (PostgreSQL) — ML feedback storage |
| Deployment | [Vercel](https://vercel.com) |
| Styling | Pure CSS — custom design system, no Tailwind, no CSS-in-JS |
| Font | [Inter](https://fonts.google.com/specimen/Inter) via `next/font/google` |

### Design System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#070f1a` | Page background |
| Card | `#111f33` | Surface / card background |
| Green | `#00d48a` | Primary CTA, active states, section headings |
| Blue | `#2979ff` | Focus states, selected items |
| Orange | `#ff9500` | Medium severity, warnings |
| Red | `#ff4444` | Critical severity, error states |
| Yellow | `#ffd60a` | Low/medium severity badges |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)
- A [Supabase](https://supabase.com) project with the `fix_feedback` table (schema below)

### Installation

```bash
# Clone the repository
git clone https://github.com/kamrangul87/fix-autodun-com.git
cd fix-autodun-com/app

# Install dependencies
npm install

# Copy the example env file and fill in your keys
cp .env.local.example .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env.local` file in the `app/` directory:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key — used server-side only in `/api/claude` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key for client-side inserts |

> **Note:** `ANTHROPIC_API_KEY` is accessed only in the `app/api/claude/route.js` server-side route and is never exposed to the browser. The Supabase keys use the `NEXT_PUBLIC_` prefix because feedback is inserted directly from the client.

---

## Supabase Schema

Run this in the Supabase SQL editor to create the feedback table:

```sql
create table fix_feedback (
  id             uuid primary key default gen_random_uuid(),
  tool           text not null,
  vote           text not null check (vote in ('up', 'down')),
  note           text,
  result_summary text,
  created_at     timestamptz not null default now()
);
```

---

## ML Training Data Pipeline

```
User submits query
       │
       ▼
Claude generates result (via /api/claude proxy)
       │
       ▼
Result displayed to user
       │
       ▼
User clicks 👍 or 👎  (optionally adds comment)
       │
       ▼
Supabase insert → fix_feedback table
  ├── tool           ("breakdown" | "lights" | "appeal" | "price")
  ├── vote           ("up" | "down")
  ├── note           (free-text comment or null)
  ├── result_summary (first 200 chars of AI response)
  └── created_at     (timestamp)
       │
       ▼
Labelled dataset → future fine-tuning of Autodun AI
```

This creates a continuously growing, human-labelled dataset of:
- Real UK vehicle breakdown queries + AI diagnoses
- Warning light lookups + explanations
- Parking fine details + appeal letters
- Car listing analyses + price verdicts

---

## Architecture

```
fix.autodun.com (Next.js 14 — App Router)
│
├── app/
│   ├── page.js              ← Single-page hub (client component)
│   │   ├── BreakdownAssistant
│   │   ├── WarningLightDecoder  (photo / grid / OBD)
│   │   ├── ParkingFineAppeal
│   │   └── FairPriceChecker    (text / photo)
│   │
│   ├── api/claude/route.js  ← Server-side Anthropic proxy
│   │   └── POST /api/claude     (keeps API key server-side)
│   │
│   ├── lib/supabase.js      ← Supabase client
│   ├── globals.css          ← Full design system
│   └── layout.js            ← Inter font + metadata
│
└── Deployed on Vercel
```

**Key architectural decisions:**

- All Anthropic API calls are proxied through `/api/claude` — the API key never reaches the browser
- Vision requests (base64 images) are sent through the same proxy route, keeping the interface uniform
- Feedback inserts go directly from the browser to Supabase using the anon key (safe — row-level security can be added to restrict to inserts only)
- No global state management library — React `useState` per component is sufficient for this use case
- No CSS framework — the design system is ~600 lines of hand-written CSS variables, utility classes, and component styles

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Built by

**Kamran** — solo founder and developer, based in the UK.

Part of the [Autodun](https://autodun.com) platform — building AI tools for UK drivers and the automotive industry.

- 🌐 [autodun.com](https://autodun.com)
- 💻 [github.com/kamrangul87](https://github.com/kamrangul87)

---

<div align="center">
<sub>Built with ❤️ in the UK · Powered by Claude AI · Free to use</sub>
</div>
