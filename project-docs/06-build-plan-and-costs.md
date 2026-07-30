# 06 — Build Plan and Costs

---

## 1. Phasing strategy

The temptation is to build everything and launch once. Don't. Phase 1 alone — a working
ledger with a dashboard — already answers your core question, and using it for a few weeks
will change what you want from Phase 2. Build it, use it on real data, then extend.

| Phase | Delivers | Effort (solo, AI-assisted) |
|---|---|---|
| **0 — Foundation** | Repo, hosting, database, login, deploy pipeline | 2–3 days |
| **1 — Ledger and dashboard** | The core system. Manual entry, balances, ledgers, audit log | 6–8 days |
| **2 — Documents and reconciliation** | Upload, extraction, review queue, reconciliation, reports | 8–10 days |
| **3 — Meters and stock (optional)** | Nozzle readings, rates, tank dips, true margin | 4–5 days |
| **4 — Later, if wanted** | Bank statement import, WhatsApp reminders, multi-outlet | — |

Total for Phases 0–2: roughly **16–21 working days** of solo effort with AI assistance. At a
few hours an evening, that's about six to eight weeks. Building it full-time, about a month.

---

## 2. Phase 0 — Foundation (2–3 days)

**Goal:** a deployed, empty, logged-in application. Nothing useful yet, but the whole pipeline
proven end to end.

- [ ] Private GitHub repository created, `.gitignore` and `.env.example` in the first commit
- [ ] Next.js + TypeScript + Tailwind + shadcn/ui scaffolded
- [ ] Railway project created; Postgres provisioned; auto-deploy on push to `main`
- [ ] Prisma connected, first migration applied
- [ ] Auth.js login working with a seeded Owner account
- [ ] Role check enforced server-side on a protected page
- [ ] Cloudflare R2 bucket created (private), credentials in Railway environment variables
- [ ] Nightly `pg_dump` cron writing to R2 — **set this up now, not later**
- [ ] Restore from that dump tested locally and steps written into the README

**Exit test:** you can log in on your phone over the internet, and last night's backup can be
restored into a local database.

---

## 3. Phase 1 — Ledger and dashboard (6–8 days)

**Goal:** the system can hold every account, record every transaction manually, and show you
correct balances. This is the spine; everything later hangs off it.

- [ ] Schema: `accounts`, `transactions`, `transaction_lines`, `audit_log`, profiles (doc 03)
- [ ] Balance constraint trigger and immutability trigger, with tests proving both fire
- [ ] Seed the default chart of accounts (doc 03 §7)
- [ ] Opening balance entry screen, Owner-only, lockable (FR-005)
- [ ] The 12 transaction templates with their forms and the **"after saving" preview box**
- [ ] Posting, reversal, draft status
- [ ] Dashboard with the big-number cards (screen 2)
- [ ] Account ledger drill-down with date filter and search (screen 3)
- [ ] Customer list and customer statement (screen 8)
- [ ] Supplier ledger
- [ ] Audit log screen, Owner-only (screen 11)
- [ ] Indian number formatting and Asia/Kolkata timezone helpers, used everywhere
- [ ] Ledger test suite (doc 05 §9, items 1–6)

**Exit test:** enter one week of real historical transactions by hand. Every dashboard balance
matches what you calculate on paper. Reversing an entry returns every balance exactly.

> **Go live at the end of Phase 1.** Start using it for real. Documents can wait; a working
> ledger you're actually using is worth more than a perfect system three months away.

---

## 4. Phase 2 — Documents and reconciliation (8–10 days)

**Goal:** stop typing figures off pieces of paper, and start proving balances against
statements.

- [ ] Upload screen: multi-file, drag-drop, phone camera capture, retry on failure (screen 5)
- [ ] R2 upload, hashing, duplicate detection, thumbnail generation, EXIF stripping
- [ ] `documents` and `document_links` tables; document state machine
- [ ] Extraction worker: vision model call, strict JSON schema, validation, confidence scoring
- [ ] Review queue with image beside editable fields, zoom and rotate (screen 6)
- [ ] Approve → post transaction and link the document permanently
- [ ] Reject with reason, file retained
- [ ] Documents library with filters and full-size viewer (screen 9)
- [ ] Reconciliation screen with live "still unexplained" figure (screen 7)
- [ ] Cash denomination counter
- [ ] Reconciliation history per account
- [ ] Reports: purchase register, sales register, profit summary, customer outstanding
- [ ] Excel and PDF export
- [ ] Alerts strip on the dashboard

**Exit test:** photograph a real oil company invoice on your phone, and within two minutes it
is a posted transaction with the image attached and the supplier balance updated. Then
reconcile a bank account against a real statement and reach zero unexplained.

---

## 5. Phase 3 — Meters and stock (4–5 days, optional but recommended)

**Goal:** verify that recorded collections match the fuel that physically left the tanks.

- [ ] Products, daily rate table, dispensing units and nozzles
- [ ] Meter reading entry — phone-friendly, large numeric inputs, validation (FR-076)
- [ ] Computed sold litres and expected sale value per nozzle per day
- [ ] Daily comparison: expected sale value vs recorded collections, with the difference shown
- [ ] Tank dip entry and book-vs-measured stock variance
- [ ] Stock-adjusted margin on the profit report, replacing the caveat

**Exit test:** a deliberately understated day's collection shows up as a shortfall on the
comparison screen, attributed to the correct nozzle.

---

## 6. Running costs

| Item | Monthly | Notes |
|---|---|---|
| Railway Hobby (app + Postgres) | ~$5 (₹430) | Verify current pricing before committing |
| Cloudflare R2 storage | ₹0 rising to ~₹40 | Free allowance covers roughly year one |
| Vision model API (extraction) | ₹100–300 | Scales with document count; likely at the lower end |
| Domain name (optional) | ~₹80 | Only if you want a custom address |
| Error tracking (Sentry free) | ₹0 | Optional |
| **Total** | **₹530 – ₹850** | Under your ₹1,000 target |

**One-time:** nothing, if you build it yourself. If you hire out Phases 0–2, expect a market
rate for roughly three to four weeks of a competent full-stack developer's time.

**Cost risk:** the vision API is the only variable. It's metered per document. If uploads
spike unexpectedly, set a monthly spend cap on the API key and an alert. At one outlet this is
very unlikely to matter.

---

## 7. Go-live checklist

Before you start relying on the system:

- [ ] Opening balances entered for every account, from a real statement or count, all dated to
      the same go-live date, and confirmed
- [ ] Opening balances printed or screenshotted and filed — if a dispute arises in six months,
      you'll want the starting point on record
- [ ] Backup restore tested and the procedure written down
- [ ] Owner password strong and stored in a password manager; 2FA enabled if built
- [ ] Operator account created only when you actually want staff entering data
- [ ] One full week run in parallel with your existing method, comparing daily — do not cut
      over on trust
- [ ] Variance thresholds set to sensible rupee amounts for your outlet
- [ ] Camera upload tested on the actual phone that will be used, on the outlet's connection

---

## 8. What to watch in the first month

| Signal | What it tells you | What to do |
|---|---|---|
| Extraction accuracy per document type | Which paperwork the model reads reliably | Enable auto-approval only for the types that prove out (FR-052) |
| Time to enter a day's transactions | Whether the templates fit how you actually work | Reorder or reword templates; add missing ones |
| Recurring variance on one account | Either a real leak or a systematic entry error | Investigate the pattern — this is the system doing its job |
| Backdated entry flags | Staff recording late, in bulk | Address the process, not the software |
| Reconciliations going stale | The habit isn't forming | Reduce friction, or set a weekly reminder |

---

## 9. Decisions still open

Answer these before Phase 1 starts. Each affects the build.

1. **Nozzle meter module — in or out?** Recommended in, at Phase 3.
2. **Operator role — enable at go-live or later?** Recommended later; start with your own
   login only, add staff once you trust the entry flow.
3. **How many bank accounts** and how many **digital payment providers** are actually in use?
4. **Roughly how many credit customers** need to be set up at go-live?
5. **Go-live date** — this fixes the opening balance date, so pick a clean month start.
6. **Building it yourself, or handing off?** If handing off, document 07 is the brief to give
   them.
