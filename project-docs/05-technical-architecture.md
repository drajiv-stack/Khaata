# 05 — Technical Architecture

---

## 1. Guiding principles

1. **Boring, well-documented technology.** One person is building and maintaining this. Every
   choice below is something a developer or an AI coding assistant can work with without
   obscure knowledge.
2. **One deployable unit.** Frontend and backend in a single application. No microservices, no
   separate API repo, no message queues. The volume does not justify it and each moving part
   is another thing to keep alive.
3. **No vendor lock-in.** Standard Postgres, standard S3-compatible storage, standard Node.
   If Railway changes its pricing, the whole thing moves elsewhere in a day.
4. **The ledger is the source of truth.** No balance is ever stored as a typed number.

---

## 2. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | Type safety matters most in code handling money |
| Framework | **Next.js 15** (App Router) | Frontend and backend in one deployable. Server Actions remove the need for a hand-written REST layer. Excellent AI-assistant support |
| Database | **PostgreSQL 16** | Exact `numeric` arithmetic, real constraints, triggers for the balance rule |
| ORM | **Prisma** | Readable schema file, safe migrations, good tooling |
| Auth | **Auth.js (NextAuth)**, credentials provider | Self-hosted, no per-user cost, sessions in the database |
| UI | **Tailwind CSS + shadcn/ui** | Fast to build, accessible components out of the box |
| Charts | **Recharts** | One trend line is all that's needed |
| Tables/exports | TanStack Table; **ExcelJS** for .xlsx; **@react-pdf/renderer** or Puppeteer for PDF |
| File storage | **Cloudflare R2** (S3-compatible) | Generous free allowance, and — importantly — no charge for downloading your own files |
| Extraction | **Vision LLM with structured output** (see §5) | Handles mixed, messy Indian receipts far better than traditional OCR |
| Background jobs | Next.js route handler + a lightweight queue table in Postgres, or Railway cron | Extraction runs asynchronously; no separate queue service needed at this volume |
| Error tracking | Sentry free tier | Optional but worth it |
| Repo | Private **GitHub** repository | As requested |

### Why not a separate backend?

At this volume, splitting into a React frontend plus an Express API doubles the deployment
surface and the number of things that can break, for no benefit. Next.js keeps it to one
service, one deploy, one set of environment variables.

---

## 3. Hosting — the recommendation and the reasoning

You asked for Railway or Render, and for it to be free or near-free. Here's the honest
position, which is worth checking against current pricing pages before committing, as these
plans change:

| Option | Reality | Verdict |
|---|---|---|
| **Railway** | Hobby plan, roughly $5/month, includes usage credit; managed Postgres in the same project; deploys on git push; persistent volumes available | **Recommended.** Simplest path. Managed database with backups, no cold starts |
| **Render** | Free web service tier exists but sleeps after inactivity and cold-starts slowly; free Postgres instances have historically been time-limited | Workable, but the cold start is irritating on a screen you open several times a day |
| **Fly.io** | Generous, cheap, but more configuration and you manage more yourself | Good fallback |
| **Vercel + Neon Postgres** | Genuinely free tiers, excellent performance. But Vercel's free Hobby plan is intended for non-commercial use — a business tool arguably doesn't qualify | Fine for prototyping; check the terms before running the business on it |

**Recommendation: Railway (app + Postgres) with Cloudflare R2 for file storage.**

Roughly ₹450–900 per month all-in, which is within your budget and buys you a database that
is backed up and doesn't sleep. Truly zero-cost hosting for something holding your financial
records is a false economy — free tiers get deprecated, and the one thing you cannot afford to
lose is the data.

### Deployment topology

```
        GitHub (private repo)
              │  push to main
              ▼
   ┌──────────────────────────┐
   │        Railway           │
   │  ┌────────────────────┐  │
   │  │  Next.js service   │  │◄──── HTTPS ──── Owner's browser / phone
   │  │  (app + API)       │  │
   │  └─────────┬──────────┘  │
   │            │             │
   │  ┌─────────▼──────────┐  │
   │  │  PostgreSQL 16     │  │
   │  │  (managed, backed  │  │
   │  │   up nightly)      │  │
   │  └────────────────────┘  │
   │  ┌────────────────────┐  │
   │  │ Cron: nightly      │──┼──────► backup copy to R2
   │  │ pg_dump            │  │
   │  └────────────────────┘  │
   └──────────┬───────────────┘
              │  signed URLs, server-side keys only
              ▼
   ┌──────────────────────────┐        ┌────────────────────────┐
   │  Cloudflare R2 bucket    │        │  Vision LLM API        │
   │  (private, versioned)    │        │  (document extraction) │
   └──────────────────────────┘        └────────────────────────┘
```

### Environments

- **Production** — Railway project `pumpledger-prod`, custom domain optional.
- **Local development** — Docker Compose with Postgres, or a second free Neon database.
- No separate staging environment. At this size it's overhead; test locally, deploy to
  production, keep the backup restore tested.

---

## 4. File storage design

- Bucket is **private**. No public read access. Ever.
- Object key pattern: `docs/{yyyy}/{mm}/{document_uuid}.{ext}` — never the original filename,
  which may contain user-controlled characters.
- The application generates **short-lived signed URLs** (5–15 minutes) when a user needs to
  view a document (NFR-04).
- On upload: validate MIME type by inspecting file content, not just the extension; strip EXIF
  location data; generate a compressed thumbnail for list views; keep the original untouched.
- HEIC (iPhone photos) converted to JPEG for display, original retained.
- Bucket **versioning enabled** and object lifecycle set to never expire. Deletion disabled at
  the bucket policy level so a bug in the application cannot destroy the archive.
- Storage estimate: ~500 KB per compressed photo × 60/day × 365 = about **11 GB/year**. Well
  within R2's free allowance for year one; a few tens of rupees a month thereafter.

---

## 5. Document extraction

### Approach

Traditional OCR (Tesseract) reads characters but doesn't understand structure — it will hand
you a soup of text from a faded thermal receipt and leave you to guess which number is the
total. A **vision-capable LLM asked for structured JSON output** handles varied layouts,
handwriting, rotation and poor lighting far better, and it can classify the document type at
the same time.

### Flow

```
Upload → store original in R2 → create documents row (status UPLOADED)
   → enqueue extraction job
   → job: fetch image, downscale to ~1600px long edge, send to vision model
          with a strict JSON schema + the list of known customers/suppliers
   → parse and validate response (dates real? amount numeric? party matches a known account?)
   → store extracted_json + per-field confidence, status PENDING_REVIEW
   → human reviews (screen 6) → APPROVED → create + post transaction
```

### Prompt design notes for the developer

- Send a **strict output schema** and instruct the model to return JSON only.
- Include the current list of customer and supplier names so the model can match a party to an
  existing account rather than inventing a new spelling each time.
- Ask for a per-field confidence value, not just an overall one. Field-level confidence is what
  drives the highlighting on the review screen (FR-049).
- Require `null` rather than a guess when a field isn't legible. A confident wrong number is
  much worse than an admitted blank.
- Validate everything on return: amount parses as a decimal, date is real and not in the
  future, quantity × rate is within a rupee or two of the stated total (a strong self-check on
  fuel invoices).
- Store the model name and version in `extraction_model` so accuracy can be compared when
  models change.
- Cost at this volume is small — roughly ₹0.50–₹2 per document, so around ₹100–300/month at
  60 documents a day, less in practice.

### Fallback

If extraction fails or returns low confidence across the board, the document still lands in
the review queue with empty fields and the image displayed. The user types the details in
manually. **Extraction failing must never block getting the entry recorded.**

---

## 6. Security

| Area | Measure |
|---|---|
| Transport | HTTPS only, HSTS enabled, no mixed content |
| Passwords | argon2id (or bcrypt cost ≥ 12). Never logged, never emailed |
| Sessions | httpOnly, Secure, SameSite=Lax cookies. 12-hour idle expiry. Database-backed so sessions can be revoked |
| Authorisation | Checked **server-side on every request**, per role. Hiding a button in the UI is not security |
| Rate limiting | On login and upload endpoints |
| File access | Signed URLs only, short expiry, never a public bucket |
| Uploads | Content-type sniffing, size cap, extension allowlist, EXIF stripped |
| SQL | Prisma parameterised queries throughout. No string-concatenated SQL |
| Secrets | Railway environment variables only. Never committed. `.env` in `.gitignore` from the first commit |
| Audit integrity | Application database role has INSERT/SELECT on `audit_log`, no UPDATE/DELETE (see document 03 §3.10) |
| Data deletion | Application-level deletes disabled on transactions, lines, documents and audit entries. Reversal and soft-flags only |
| Dependencies | Dependabot enabled on the GitHub repo |
| Access | Only two accounts exist. 2FA available for the Owner (FR-007) |

**Not included and not needed here:** SOC2, penetration testing, SSO, encryption at rest
beyond what the platform provides by default. This is a single-outlet internal tool, and
security effort should be proportionate.

---

## 7. Backups and recovery

This is the part most solo projects skip and later regret.

- Railway's managed Postgres takes automated backups — confirm the retention period on your
  plan and don't assume it.
- **In addition**, a nightly cron job runs `pg_dump`, compresses it, and writes it to a
  separate R2 bucket with a 30-day rolling retention plus a monthly snapshot kept for a year
  (NFR-05). Two independent copies, two different providers.
- **Test the restore before go-live** (NFR-06). Restore last night's dump into a local
  database, log in, confirm balances match. Write down the steps. An untested backup is a
  hope, not a backup.
- Documents in R2 are protected by bucket versioning; deletion is disabled at policy level.
- Target recovery point: under 24 hours. Target recovery time: under 4 hours. Both are
  generous and entirely achievable at this size.

---

## 8. Repository layout

```
pumpledger/
├── README.md                  ← setup instructions (NFR-12)
├── .env.example
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                ← default chart of accounts (doc 03 §7)
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/dashboard/
│   │   ├── (app)/accounts/[id]/
│   │   ├── (app)/entry/[template]/
│   │   ├── (app)/upload/
│   │   ├── (app)/review/
│   │   ├── (app)/reconcile/[accountId]/
│   │   ├── (app)/customers/
│   │   ├── (app)/documents/
│   │   ├── (app)/reports/
│   │   ├── (app)/audit/
│   │   ├── (app)/settings/
│   │   └── api/
│   │       ├── upload/
│   │       ├── extract/       ← extraction worker endpoint
│   │       └── cron/backup/
│   ├── lib/
│   │   ├── ledger/            ← posting, reversal, balance queries
│   │   ├── templates/         ← the 12 transaction templates (doc 03 §5)
│   │   ├── extraction/        ← vision model client, schema, validation
│   │   ├── storage/           ← R2 client, signed URLs
│   │   ├── audit/             ← audit log writer
│   │   └── money.ts           ← decimal helpers, ₹ formatting, Indian grouping
│   ├── components/
│   └── auth.ts
└── tests/
    ├── ledger.test.ts         ← highest-value tests in the project
    └── templates.test.ts
```

---

## 9. Testing priorities

Full test coverage is not a sensible goal for a solo build. These specific areas are, because
a bug in them silently corrupts financial records:

1. **Every one of the 12 transaction templates** produces balanced lines hitting the correct
   accounts in the correct direction. (Table-driven test — one case per template.)
2. **Balance computation** matches a hand-calculated fixture across a scenario of 30 mixed
   transactions.
3. **Reversal** returns every affected balance exactly to its prior value.
4. **Unbalanced transactions are rejected** by the database, not just by the application.
5. **Posted transactions cannot be edited or deleted** through any code path.
6. **Money arithmetic** never touches floating point — verified by a test on values known to
   break floats (0.1 + 0.2, and a ₹1,00,000.05 style figure).
7. **Role permissions** — an Operator session cannot reach reversal, reconciliation, audit log
   or profit reports, tested at the server, not the UI.

---

## 10. Things the developer should get right early

- **Indian number formatting** (`1,84,250`, not `184,250`) — decide the helper on day one and
  use it everywhere. `Intl.NumberFormat('en-IN')` handles it.
- **Timezone** — store UTC, display Asia/Kolkata. A "day" boundary at a petrol pump running
  night shifts is a real source of confusion; be explicit about it.
- **Financial year** — April to March. Report presets must reflect this, not January–December.
- **Decimal handling** — Prisma's `Decimal` type end to end. The moment a rupee value passes
  through a JavaScript `number`, rounding errors begin.
- **Mobile camera upload** — test on an actual phone in week one, not week six. It is the
  feature most likely to behave differently from what the desktop suggests.
