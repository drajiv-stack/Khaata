# 07 — Handoff Brief for a Developer or AI Builder

Two things here. **Section A** is a prompt you can paste directly into Claude Code, Cursor, or
another AI coding agent, together with the other documents in this folder. **Section B** is
what to send a human developer if you hire one.

---

# SECTION A — Prompt for an AI coding agent

> Copy everything between the lines below, and attach or paste documents 01–05 from this
> folder alongside it. Work through it phase by phase — do not ask the agent to build all of
> it in one go.

---

**PROJECT: PumpLedger — account verification system for a retail petrol pump**

You are building a cloud application for the owner of a single petrol pump in India. Its
purpose is verification: staff record financial entries, and the owner needs to check those
entries against reality. It is not a billing system and not a replacement for the
accountant's books.

**Attached documents (read all before writing code):**
- `01-project-brief.md` — scope and objectives
- `02-functional-requirements.md` — numbered requirements FR-001 onward
- `03-data-model.md` — database schema and the double-entry ledger design
- `04-screens-and-wireframes.md` — every screen, laid out
- `05-technical-architecture.md` — stack, hosting, security, testing priorities

**Stack (already decided — do not substitute):**
Next.js 15 App Router · TypeScript · PostgreSQL 16 · Prisma · Auth.js credentials provider ·
Tailwind + shadcn/ui · Cloudflare R2 (S3-compatible) for files · deployed on Railway.

**Non-negotiable rules:**

1. **Double-entry ledger.** Every transaction has two or more lines summing to exactly zero,
   enforced by a deferred database constraint trigger, not only in application code. Balances
   are always computed by summing lines — never stored in a column on `accounts`.
2. **No floating point for money.** Postgres `numeric(14,2)`, Prisma `Decimal`, end to end.
   A rupee value must never pass through a JavaScript `number`.
3. **Posted transactions are immutable.** No edit, no delete, through any code path. Corrections
   are made by generating a linked reversal entry. Enforce this with a database trigger too.
4. **The user never sees "debit" or "credit".** Entry happens through the 12 templates in
   document 03 §5. Each form shows a plain-language preview of the effect on both balances
   before saving — see the wireframe in document 04 §4.
5. **Nothing extracted from a document auto-posts.** Every upload goes to a review queue where
   a human sees the image beside the editable fields and approves.
6. **Uploaded files are never deleted or overwritten.** Private bucket, signed URLs only,
   versioning on.
7. **The audit log is append-only.** The application's database role must have INSERT and
   SELECT on `audit_log` and no UPDATE or DELETE. Set the grants up explicitly.
8. **Indian conventions.** `Intl.NumberFormat('en-IN')` digit grouping (1,84,250), ₹ symbol,
   Asia/Kolkata display timezone with UTC storage, April–March financial year.

**Build order — complete and confirm each phase before moving on:**

- **Phase 0:** repo, Railway deploy, Postgres, Auth.js login with a seeded Owner, R2 bucket,
  nightly `pg_dump` cron to R2, and a tested restore procedure documented in the README.
- **Phase 1:** the ledger. Schema, both triggers, seeded chart of accounts, opening balances,
  all 12 templates with preview boxes, posting and reversal, dashboard, account drill-down,
  customer and supplier ledgers, audit log screen. Plus the test suite in document 05 §9.
- **Phase 2:** documents. Upload with camera support, R2 storage with hashing and duplicate
  detection, vision-model extraction returning strict JSON with per-field confidence, review
  queue, reconciliation with a live "still unexplained" figure, the four core reports, Excel
  and PDF export.
- **Phase 3 (only if asked):** nozzle meter readings, daily rate table, tank dips,
  stock-adjusted margin.

**Design direction:** deliberately sparse. The dashboard shows large balance figures and very
little else — detail is one click down. Colour is reserved for status (green matched, amber
attention, red problem); nothing decorative. Tabular numerals so columns align. Minimum
44×44px touch targets, because entries get made on a phone at a fuel counter. Follow
document 04 §12.

**Write tests for these before considering a phase done:** every template produces correctly
balanced lines to the correct accounts; balances match a hand-calculated 30-transaction
fixture; reversal restores every balance exactly; the database rejects unbalanced
transactions; posted transactions cannot be mutated; Operator role cannot reach reversal,
reconciliation, the audit log, or profit reports (tested server-side).

**Start by:** reading all five documents, then producing (a) the complete `schema.prisma`,
(b) the two trigger migrations as raw SQL, and (c) a seed script for the default chart of
accounts in document 03 §7. Show me those three before writing any UI.

---

# SECTION B — Brief for a human developer

**What it is:** an internal financial verification tool for a single petrol pump in India.
One owner, optionally one operator. Low transaction volume. Not a product, not multi-tenant.

**Why it exists:** the owner has no independent way to confirm that staff-recorded entries
match actual bank, cash, digital, supplier and customer balances.

**Scope:** Phases 0–2 in document 06. Roughly 16–21 days of solo full-stack work with AI
assistance. Phase 3 is optional and quoted separately.

**Supplied:** this documentation folder — brief, full numbered requirements, complete data
model with SQL for the critical constraints, wireframes for every screen, and an architecture
decision record.

**Expected deliverables:**
1. Private GitHub repository, with a README a new developer can follow to run it locally.
2. Deployed and working on Railway with a managed Postgres instance.
3. Prisma schema and migrations, including the balance-constraint and immutability triggers.
4. Automated nightly database backup to separate object storage, plus a **documented and
   demonstrated restore**.
5. Test suite covering the seven areas in document 05 §9.
6. A short handover session covering deployment, environment variables, backup and restore.

**Questions worth asking before quoting:**
- Which vision model for extraction, and who pays for the API usage?
- Is the nozzle meter module (Phase 3) in or out?
- Who owns the Railway, Cloudflare and API accounts? *(Answer: the owner. Always the owner.
  Never a developer's personal account.)*
- What happens to opening-balance data entry — who does it, and when?

**Red flags to watch for in a proposal:** storing balances in a column instead of computing
them; using `float` or `double` for money; allowing edits to posted entries; putting
documents in a public bucket; skipping the backup restore test; proposing a microservice
architecture for one petrol pump.

---

## Appendix — the extraction JSON schema

Give this to whoever builds the extraction step. The vision model should be instructed to
return exactly this shape and nothing else.

```json
{
  "document_type": "PURCHASE_INVOICE | BANK_STATEMENT | DEPOSIT_SLIP | CUSTOMER_RECEIPT | SETTLEMENT_STATEMENT | EXPENSE_BILL | CASH_MEMO | OTHER",
  "document_date": "YYYY-MM-DD or null",
  "reference_number": "string or null",
  "party_name": "string or null",
  "matched_account_code": "string or null, only if it matches a supplied known account",
  "currency": "INR",
  "total_amount": "decimal string or null",
  "line_items": [
    {
      "description": "string",
      "product": "MS | HSD | XP | LUBRICANT | OTHER | null",
      "quantity_litres": "decimal string or null",
      "rate": "decimal string or null",
      "amount": "decimal string or null"
    }
  ],
  "payment_mode": "CASH | UPI | CARD | CHEQUE | NEFT_RTGS | UNKNOWN",
  "confidence": {
    "document_type": 0.0,
    "document_date": 0.0,
    "reference_number": 0.0,
    "party_name": 0.0,
    "total_amount": 0.0
  },
  "notes": "anything unclear, illegible, or worth flagging to the reviewer",
  "legibility": "GOOD | POOR | UNREADABLE"
}
```

**Instructions to include in the extraction prompt:**
- Return `null` for any field that cannot be read with reasonable certainty. Never guess a
  number.
- Match `party_name` against the supplied list of known customer and supplier accounts and
  return the matching `matched_account_code`; return `null` if there is no confident match
  rather than inventing one.
- Amounts as plain decimal strings without currency symbols, commas, or spaces.
- Dates in ISO format. Indian documents commonly use DD/MM/YYYY — interpret accordingly, and
  lower the confidence score if the order is genuinely ambiguous.
- Return JSON only. No explanation, no markdown fences.

**Server-side validation after every extraction** (do not trust the model's own confidence
alone): the date must be real and not in the future; the amount must parse as a decimal;
where quantity and rate are both present, quantity × rate should agree with the total to
within a rupee or two — if it doesn't, force the confidence down and flag the document for
close review.
