# Petrol Pump Account Verification System — Documentation Pack

**Working project name:** PumpLedger
**Prepared:** 29 July 2026
**Prepared for:** Owner of a single-outlet retail petroleum outlet (petrol pump)
**Status:** Planning / pre-build. Nothing has been built yet. These documents are the blueprint.

---

## What this pack is

Seven documents that together describe exactly what to build, how the data should be
structured, what each screen looks like, and how to host it. They are written so that a
developer — human or AI — can pick them up and start work without needing to interview you
again.

| # | Document | What it covers | Who reads it |
|---|---|---|---|
| 00 | **This file** | Index, summary of decisions, how to use the pack | You |
| 01 | `01-project-brief.md` | Objectives, scope, what is deliberately excluded, glossary | You + developer |
| 02 | `02-functional-requirements.md` | Numbered list of every feature (FR-001 …) with acceptance criteria | Developer, QA |
| 03 | `03-data-model.md` | Database tables, relationships, the double-entry ledger design | Developer |
| 04 | `04-screens-and-wireframes.md` | Every screen, laid out, with field-by-field notes | Developer, you |
| 05 | `05-technical-architecture.md` | Stack, hosting on Railway, OCR, file storage, security, backups | Developer |
| 06 | `06-build-plan-and-costs.md` | Phased delivery plan, effort estimate, monthly running cost | You |
| 07 | `07-ai-builder-handoff-prompt.md` | A ready-to-paste brief for Claude Code or another AI builder | You |

**Read in this order:** 01 → 04 → 06. Those three tell you whether this is the system you
want. Documents 02, 03, 05 are the technical detail — skim them, but they exist mainly for
whoever builds it.

---

## Summary of what you asked for

- A **cloud application** for one petrol pump.
- Purpose is **verification and monitoring**, not day-to-day billing. Staff record entries;
  you check that those entries match reality.
- Balances to track: **cash**, **bank**, **online/digital collections**, **oil company
  (supplier) account**, and **credit customer accounts**.
- **Photo upload** of receipts, invoices and statements, with the system reading the
  figures off the image automatically, and you correcting anything it gets wrong.
- **Every uploaded image is stored permanently** and viewable later, with a date/time stamp.
- **A full log** of who entered what and when.
- Dashboard should show **big, clear numbers** — not dense tables.
- Reports on **purchases, cash sales, credit sales, and profit**.
- **Free or near-free** to run. Hosted on Railway. Solo build, GitHub for the code.

---

## Five decisions taken on your behalf (change any of them if you disagree)

**1. The ledger will be double-entry.**
Every transaction moves money out of one account and into another. A cash deposit reduces
cash and increases bank, in the same entry. This is the only reliable way to make the
sentence *"the system says your bank balance should be ₹X"* actually mean something. Staff
never see debits and credits — they pick a transaction type like "Deposited cash into bank"
and the system does the rest. Detail in document 03.

**2. Two user roles, not one.**
You said only you need access. The system will still separate **Owner** from **Operator**,
because your whole objective is checking someone else's entries — and that only works if
their entries are stamped with their name. Start with just your own login if you like; the
second role is there when you want it. Only the Owner can edit a posted entry, run
reconciliation, or see the audit log.

**3. Nothing an OCR reads goes straight into the accounts.**
Uploaded documents land in a **review queue**. You see the image on the left, the figures
the system extracted on the right, you correct and approve. Only then does it hit the
ledger. Over the first few weeks this also tells us how accurate the extraction is on your
particular paperwork. Once you trust it for a given document type, high-confidence
extractions can be set to auto-approve.

**4. Entries are never deleted.**
A wrong entry is reversed by a second, opposite entry, and both stay on record. If entries
could be silently deleted, the audit trail you're building this system for would be
worthless.

**5. This is a management tool, not your statutory books.**
Keep whatever your accountant uses (Tally or similar) as the official record for tax
filing. This system is your independent check on it. Fuel products in India sit outside GST
under state VAT while lubricants and shop goods are under GST — the tax treatment is worth
confirming with your accountant before we add any tax computation. Document 01 covers this.

---

## One thing worth adding that we didn't discuss

For a petrol pump, the single most powerful verification isn't the cash count — it's the
**nozzle meter reading**. Opening reading, closing reading, minus testing volume, times the
day's rate, gives you the exact sale value for that nozzle. Compare that to what staff
recorded as collected, and any shortfall is visible immediately, per nozzle, per shift.

It's about a day of extra build work. I've specified it as an **optional Phase 3 module**
(FR-070 onward) so you can decide later. If you only ever build one extra thing, build this.

---

## What happens next

1. Read documents 01, 04 and 06.
2. Mark anything that's wrong or missing — the requirement IDs (FR-001 etc.) make that easy
   to reference.
3. Send corrections back and I'll revise the pack.
4. Once it's right, hand document 07 plus this folder to whoever is building it.
