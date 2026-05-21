# Frontend Engineering Assignment

**Time to complete:** 72 hours

**Submission:** GitHub repo link + short Loom walkthrough (5 min max)

---

## About 8x

8x is building testing infrastructure for performance marketers. We're not a typical influencer marketing agency or UGC marketplace.

### What we do

We launch and manage networks of fresh TikTok and Instagram accounts on behalf of brands. Instead of working with established influencers, we coordinate 20-50 creators per client who each start brand-new accounts and post UGC content daily about the client's product.

**Why fresh accounts?** The algorithm favors new accounts—they get disproportionate reach in their first weeks. By orchestrating many fresh accounts simultaneously, we generate massive organic impressions at a fraction of traditional paid media costs.

### Our stack

- **Frontend:** Next.js, React, Tailwind
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **Payments:** Stripe Connect
- **Infra:** AWS, Vercel

---

## The Assignment

### Overview

Recreate [babiceva.ai](https://babiceva.ai/) — an AI video/image generation tool.

> **Starter repo:** https://github.com/bigowash/8x-hiring-template

Fork the repo and build as much as you can in 72 hours. We're not expecting full functionality — we're looking for clean code, clear thinking, and production awareness.

---

### Local Setup

The template uses Supabase, which runs entirely locally via Docker. No cloud accounts or API keys needed.

**Requirements:** Node.js, pnpm, Docker

**Steps:**

1. Fork and clone the repo
2. `pnpm install`
3. `supabase start` (spins up local Postgres, Auth, etc.)
4. Copy the local keys it prints to `.env.local`
5. Run migrations: `supabase db reset`
6. `pnpm dev`

Everything runs on your machine. No external accounts required.

---

## Reference: What babiceva.ai does

### Homepage
- Hero section with CTA
- Gallery of example outputs
- Navigation (Home, AI Tools dropdown, Pricing)
- Sign in / Sign up

### AI Tools (dropdown)
- Video Generation
- Image Generator
- AI Dress Changer
- AI Car Changer
- AI Person Replacer

### Video Generation page (core tool)
- Model selector (Google Veo 3.1 / OpenAI Sora 2)
- Aspect ratio toggle (16:9 / 9:16)
- Options: Remove watermark, Generate from images
- Character/avatar selection
- Prompt input field
- Preview panel with examples

### Other tool pages
- File upload zones (drag & drop, 5MB limit)
- Before/after examples
- Login-gated functionality

### Subscription flow
- Pricing page with Free / Pro tiers
- Checkout flow (fake — no real payments)
- Features gated by subscription tier

---

## Part 1: Setup & Orientation (30 min)

1. Fork the starter repo and get it running locally (including local Supabase)
2. In your README, note:
   - Any issues during setup and how you resolved them
   - Initial observations about the codebase

---

## Part 2: Core Build (3-4 hours)

Build as much of the app as you can.

### Must have

- Homepage with hero, navigation, and example gallery
- Auth flows using Supabase Auth:
  - Sign up (email/password)
  - Sign in
  - Sign out
  - Protected routes (redirect to sign in if not authenticated)
- At least one functional AI tool page (e.g., Video Generation) with:
  - Form inputs (selectors, toggles, text area)
  - Clean component structure
  - Proper state management
  - Loading/submitting states
- Routing between pages
- Different UI states for: logged out → logged in (free) → logged in (pro)

### Nice to have

- Fake subscription flow:
  - Pricing page with tiers
  - "Subscribe" button → fake checkout UI
  - On success → write `subscription_tier: 'pro'` to Supabase
  - Gate features based on tier (e.g., "Upgrade to Pro to remove watermark")
- Additional tool pages
- File upload handling (drag & drop — doesn't need to persist)
- Mock AI API calls (simulate delay → return placeholder response)
- Dark theme styling to match

### Don't worry about

- Real AI generation APIs (mock responses are fine)
- Real payment processing (fake the flow, just persist the tier)
- Mobile responsiveness (desktop-first is fine)

---

## Part 3: Production Readiness (1 hour)

Review your code as if it's going to production tomorrow.

- **Error handling:** What happens when auth or API calls fail?
- **Loading states:** Is the UX clear during async operations?
- **Edge cases:** Empty states, invalid inputs, session expiry, etc.
- **Code hygiene:** No console.logs, dead code, or leftover comments

In your README, add a section: **"What I'd improve with more time"**

---

## Part 4: Walkthrough (30 min)

Record a Loom (5 min max) covering:

1. Quick demo of what you built
2. Walk through one piece of code you're proud of — explain *why* you made those decisions
3. One thing you'd do differently if starting over

---

## What We're Looking For

- **Does it work?** We'll clone it, run `supabase start`, and test locally.
- **Code quality:** Clean components, sensible structure, no dead code.
- **Production mindset:** Error handling, loading states, edge cases considered.
- **Understanding:** Can you explain your decisions? We'll ask "why" in the follow-up call.

> **Using AI tools is encouraged** (Claude Code is ideal). But you need to understand what you're shipping. If you can't explain it, don't include it.

---

## Submission

1. Fork the starter repo
2. Push to GitHub
3. Include Loom link (video demo) in your README
4. Reply to the email with your repo link

---

## README Should Include

- What you built (brief summary)
- Issues you ran into and how you solved them
- What you'd improve with more time

---

**Questions?** Email theo@epistemy.io

Good luck!

---

## Final Tips

- Ship, don't polish endlessly
- Use PRs and commit often (we look at git history)
- Explain your reasoning
- Have fun
