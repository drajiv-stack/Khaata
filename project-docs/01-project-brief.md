# 01 — Project Brief

**Project:** PumpLedger — account verification system for a retail petroleum outlet
**Version:** 1.0 (draft for review)
**Date:** 29 July 2026

---

## 1. Background

The business is a single retail petroleum outlet (petrol pump). Day-to-day money moves
through five separate pools, and each is currently tracked by staff making manual entries:

- physical cash at the counter and in the safe
- one or more bank accounts
- digital collections (UPI, cards, wallets) which arrive in a settlement cycle, not instantly
- the oil marketing company account, against which fuel is purchased on credit
- credit customers — fleet operators, local businesses, regulars — who buy now and pay later

The owner has no independent way to confirm that what staff have recorded matches what
actually happened. Errors and omissions surface late, and tracing them back to a specific
day or transaction is slow.

## 2. Objective

Give the owner a single screen that answers one question at any moment:

> **For each account, what does the system say the balance should be, what does the bank
> statement or cash count actually say, and where exactly is the difference coming from?**

Everything else in this specification exists to serve that question.

## 3. Success criteria

The project has succeeded if, six weeks after go-live:

| # | Criterion | How it's measured |
|---|---|---|
| SC-1 | Owner can see all five balance types on one screen in under 5 seconds | Dashboard load time; single screen, no scrolling on desktop |
| SC-2 | Any variance between book and actual balance can be traced to candidate transactions in under 2 minutes | Reconciliation screen lists unmatched items |
| SC-3 | Recording a day's transactions takes under 10 minutes | Timed by the person doing entry |
| SC-4 | Every posted transaction has an identifiable author and timestamp | Audit log completeness check |
| SC-5 | Every uploaded document is retrievable months later, linked to its transaction | Spot-check of old entries |
| SC-6 | Monthly running cost stays under ₹1,000 | Railway + storage + OCR invoices |

## 4. Users

| Role | Who | What they can do |
|---|---|---|
| **Owner** | You | Everything: post, edit, reverse, reconcile, view audit log, manage accounts and users, run all reports |
| **Operator** | Pump/office staff (optional, enable later) | Upload documents, create draft entries, view their own entries. Cannot edit posted entries, cannot reconcile, cannot see the audit log, cannot see profit reports |

Two roles only. No approval chains, no departments, no branch hierarchy.

## 5. Scope — in

1. Chart of accounts covering cash, bank, digital settlement, supplier, customer, income and expense.
2. Transaction entry via simple templates (cash sale, credit sale, purchase, payment, deposit, expense, etc.).
3. Document upload — camera photo, gallery image, or PDF — from phone or desktop.
4. Automatic extraction of amount, date, party and document type from uploaded images.
5. A review queue where extracted figures are checked against the image side by side and corrected before posting.
6. Permanent, immutable storage of every uploaded file with upload timestamp and uploader identity.
7. Balance computation per account, live, from the ledger.
8. Reconciliation: owner enters the actual closing balance from a statement or cash count; system shows the variance and the items making it up.
9. Customer outstanding balances and ageing; supplier outstanding balance.
10. Reports: purchase register, sales register split by cash / credit / digital, customer outstanding, profit summary.
11. Full audit log of every create, edit, reverse and login.
12. Export of any report to Excel and PDF.

## 6. Scope — out (deliberately)

These are excluded to keep the build small, fast and cheap. Each can be added later.

| Excluded | Why | Could be added in |
|---|---|---|
| Customer-facing billing / invoice printing at the pump | You have existing process; this is a monitoring tool | Phase 4 |
| Automated bank feed / statement API integration | Costly, needs bank approval; manual statement entry is adequate at this volume | Phase 4 |
| Direct integration with pump automation hardware or DU controllers | Hardware-dependent, expensive, out of proportion to the problem | Phase 4 |
| Statutory GST/VAT return preparation | Your accountant already does this; duplicating it creates risk | Not planned |
| Payroll, attendance, HR | Different problem | Not planned |
| Multi-outlet consolidation | You have one outlet | Phase 4 — the data model already supports it |
| Mobile app (native iOS/Android) | The web app will work well on a phone browser, including camera upload | Not planned |
| Sharing data directly with the bank | You confirmed this is not required — it's for internal monitoring only | Not planned |

## 7. Constraints

- **Budget:** free tier or near-free. Target under ₹1,000/month all-in.
- **Team:** one person building it, possibly with AI assistance. Code on GitHub.
- **Hosting:** Railway (chosen — see document 05 for the reasoning).
- **Volume:** single outlet. Assume up to 100 transactions and 60 document uploads per day at
  the outside — in practice far fewer. Any modern stack handles this comfortably; nothing in
  the design needs to be optimised for scale.
- **Devices:** desktop browser for review and reporting; mobile browser for photo upload.
- **Connectivity:** assume the outlet has usable but not always fast internet. Uploads must
  tolerate a slow connection and resume or retry.

## 8. Key risks

| Risk | Impact | How it's handled |
|---|---|---|
| OCR misreads Indian receipts — thermal print, handwriting, poor light | Wrong figures enter the accounts | Nothing auto-posts. Human review queue with the image alongside. Confidence score shown per field. |
| Owner stops doing reconciliation after the novelty wears off | System drifts from reality; becomes useless | Dashboard shows "last reconciled" age per account and turns amber past 7 days. Reconciliation is 3 clicks, not a process. |
| Staff enter transactions late or in bulk at month end | Defeats the purpose | Entry date and posting timestamp are stored separately and both shown. A "backdated entry" flag appears on the dashboard. |
| Uploaded images lost or storage bill grows | Loss of audit trail | Object storage with versioning, plus nightly database backup. Images compressed on upload. Cost modelled in document 06. |
| Railway free tier limits change or the service sleeps | Downtime | Stack is standard Postgres + Node; portable to Render, Fly.io or a VPS in under a day. No proprietary lock-in. |
| Opening balances entered wrong at go-live | Every balance is off by a constant from day one | Formal opening-balance step, owner-only, locked after confirmation, with a printed record. See FR-005. |

## 9. Glossary

| Term | Meaning here |
|---|---|
| **Account** | Any pool of money the system tracks: a bank account, the cash drawer, a credit customer, the oil company, an expense head |
| **Book balance** | What the system calculates the balance to be, from all posted transactions |
| **Actual balance** | What the bank statement, cash count, or supplier statement says |
| **Variance** | Book balance minus actual balance. The number this whole system exists to surface |
| **Posted** | A transaction that has been approved and now affects balances |
| **Draft** | A transaction created but not yet approved; does not affect balances |
| **Reversal** | An equal and opposite entry used to cancel a posted transaction. Both remain visible |
| **Settlement** | Money collected by card/UPI that the payment provider has since transferred to your bank |
| **OMC** | Oil Marketing Company — the supplier (IOCL, BPCL, HPCL, etc.) |
| **DU / nozzle** | Dispensing unit and its individual nozzles; each has a cumulative meter |
| **Ageing** | Breakdown of customer outstanding by how long it has been unpaid (0–30, 31–60, 61–90, 90+ days) |
| **Reconciliation** | The act of comparing book balance to actual balance and explaining the difference |

## 10. Assumptions to confirm

Please confirm or correct these before build starts:

1. Fuel products sold: petrol (MS), diesel (HSD), and possibly premium variants. Any CNG,
   lubricants, or shop/convenience sales? *(Affects the product list, not the architecture.)*
2. Number of bank accounts in active use: assumed **one**.
3. Digital payments: are UPI, card and wallet collections settled into the same bank account,
   and roughly how many days behind? Assumed **T+1 to T+2, one settlement account**.
4. Approximate number of active credit customers: assumed **under 50**.
5. Currency ₹ (INR), timezone Asia/Kolkata, financial year April–March. Assumed **yes**.
6. Do you want the nozzle meter reading module (section in document 02, FR-070+)? Assumed
   **optional, Phase 3**.
