# 04 — Screens and Wireframes

Wireframes are layout sketches, not visual designs. They fix *what goes where* and *what each
control does*. Colours, fonts and spacing are decided at build time using the guidance in §12.

**Navigation structure**

```
Login
 └─ Dashboard  ← the home screen, and where the Owner spends most time
     ├─ Account ledger (drill-down from any balance)
     ├─ New entry
     ├─ Upload
     ├─ Review queue         ← the daily workflow for documents
     ├─ Reconcile
     ├─ Customers ─ Customer statement
     ├─ Supplier ledger
     ├─ Documents library
     ├─ Reports
     ├─ Audit log            (Owner only)
     └─ Settings             (Owner only)
```

---

## 1. Login

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                  PumpLedger                      │
│           Account verification system            │
│                                                  │
│   Email     [_______________________________]    │
│   Password  [_______________________________]    │
│                                                  │
│              [       Sign in       ]             │
│                                                  │
│   Forgot password? Contact the owner.            │
└──────────────────────────────────────────────────┘
```

Notes: no self-registration, no public sign-up link. Failed attempts show a generic message
("Email or password is incorrect") — never reveal which was wrong. Lockout message after 5
failures per FR-004.

---

## 2. Dashboard — the main screen

This is the screen the whole project is for. Big numbers, minimal chrome. Everything else is
one click away.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ PumpLedger        Tue 29 Jul 2026            [+ New entry] [↑ Upload]  ⚙  ▾   │
├───────────────────────────────────────────────────────────────────────────────┤
│ ⚠  6 documents awaiting review   ·   Bank not verified for 9 days   ·   ›     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                     │
│  │ CASH IN HAND            │  │ BANK — CURRENT A/C      │                     │
│  │                         │  │                         │                     │
│  │    ₹ 1,84,250           │  │    ₹ 6,12,480           │                     │
│  │                         │  │                         │                     │
│  │ Actual  ₹ 1,84,250      │  │ Actual  ₹ 6,09,980      │                     │
│  │ ● Matched · verified    │  │ ▲ Short ₹ 2,500         │                     │
│  │   today                 │  │   verified 9 days ago   │                     │
│  └─────────────────────────┘  └─────────────────────────┘                     │
│                                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                     │
│  │ DIGITAL — AWAITING      │  │ OIL COMPANY — PAYABLE   │                     │
│  │ SETTLEMENT              │  │                         │                     │
│  │    ₹ 47,900             │  │    ₹ 8,40,000           │                     │
│  │                         │  │                         │                     │
│  │ UPI 31,400 · Card 16,500│  │ Actual  ₹ 8,40,000      │                     │
│  │ ● Normal (T+1)          │  │ ● Matched · 2 days ago  │                     │
│  └─────────────────────────┘  └─────────────────────────┘                     │
│                                                                               │
│  ┌───────────────────────────────────────────────────────┐                    │
│  │ CREDIT CUSTOMERS — RECEIVABLE                          │                   │
│  │    ₹ 3,26,700          across 18 customers             │                   │
│  │    Over 60 days: ₹ 48,200  (3 customers)         [›]   │                   │
│  └───────────────────────────────────────────────────────┘                    │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│  TODAY                                                                        │
│  Collected  ₹ 2,14,300     Cash 1,10,000 · Digital 62,300 · Credit 42,000     │
│  Purchases  ₹ 0            Expenses ₹ 3,400        Entries posted: 14         │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Card anatomy** (applies to every balance card):

| Element | Rule |
|---|---|
| Label | Small, uppercase, muted |
| Book balance | The largest text on the screen. This is the system's calculated figure |
| Actual balance | Smaller, below. Last figure entered during reconciliation |
| Status line | ● green = matched · ▲ amber = variance within threshold · ■ red = variance above threshold |
| Verified age | "verified today" / "verified 9 days ago", turns amber past 7 days (FR-062) |
| Whole card | Clickable → opens that account's ledger |

**Mobile:** cards stack in one column, full width, numbers stay large. Alert strip becomes a
badge on a bell icon.

---

## 3. Account ledger (drill-down)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ‹ Dashboard          BANK — CURRENT ACCOUNT                                    │
│                                                                               │
│ Book balance  ₹ 6,12,480      Actual  ₹ 6,09,980      Variance  ▲ ₹ 2,500     │
│                                                     [ Reconcile this account ] │
├───────────────────────────────────────────────────────────────────────────────┤
│ [ 01 Jul – 29 Jul ▾ ]  [ Search narration / amount / ref ]      [ Export ▾ ]   │
├──────────┬────────────────────────────┬──────────┬──────────┬────────┬───────┤
│ Date     │ Narration                  │      In  │     Out  │Balance │ ✓  📎 │
├──────────┼────────────────────────────┼──────────┼──────────┼────────┼───────┤
│ 29 Jul   │ Cash deposit — slip 4471   │  1,50,000│          │6,12,480│ ○  📎 │
│ 28 Jul   │ Paid IOCL — UTR 8891203    │          │ 5,00,000 │4,62,480│ ✓  📎 │
│ 28 Jul   │ UPI settlement 27 Jul      │    58,940│          │9,62,480│ ✓     │
│ 27 Jul   │ Electricity bill           │          │   12,300 │9,03,540│ ✓  📎 │
│ ...      │                            │          │          │        │       │
├──────────┴────────────────────────────┴──────────┴──────────┴────────┴───────┤
│ Showing 42 entries · 3 unreconciled                    Opening 01 Jul: ₹4,90,120│
└───────────────────────────────────────────────────────────────────────────────┘
```

- `✓` column: reconciled marker. `○` = not yet matched to a statement.
- `📎` opens the attached document image in an overlay.
- Clicking a row expands it: full detail, author, posted timestamp, both sides of the entry,
  history, and — for the Owner — a **Reverse this entry** action.

---

## 4. New entry

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back                      NEW ENTRY                                          │
├───────────────────────────────────────────────────────────────────────────────┤
│  What happened?                                                                │
│                                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │  Cash sale   │ │ Digital sale │ │ Credit sale  │ │  Customer    │          │
│  │              │ │              │ │              │ │   payment    │          │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │   Purchase   │ │  Pay oil     │ │ Deposit cash │ │  Withdraw    │          │
│  │  from company│ │   company    │ │   to bank    │ │   from bank  │          │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                           │
│  │  Settlement  │ │   Expense    │ │  Owner /     │                           │
│  │   received   │ │              │ │   capital    │                           │
│  └──────────────┘ └──────────────┘ └──────────────┘                           │
└───────────────────────────────────────────────────────────────────────────────┘
```

Selecting one opens the form for that template. Example — **Deposit cash to bank**:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back                DEPOSIT CASH TO BANK                                     │
│                                                                               │
│   Date            [ 29 / 07 / 2026 ]                                          │
│   Amount          [ ₹ 1,50,000                    ]                           │
│   Into account    [ Bank — Current A/C        ▾ ]                             │
│   Slip / ref no.  [ 4471                          ]                           │
│   Note            [ Evening deposit                ]                          │
│                                                                               │
│   Attach document [ 📷 Take photo ] [ 📁 Choose file ]                         │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────┐             │
│   │ After saving:                                               │             │
│   │   Cash in hand      ₹ 1,84,250  →  ₹ 34,250                 │             │
│   │   Bank — Current    ₹ 4,62,480  →  ₹ 6,12,480               │             │
│   └─────────────────────────────────────────────────────────────┘             │
│                                                                               │
│                        [ Cancel ]   [   Save entry   ]                        │
└───────────────────────────────────────────────────────────────────────────────┘
```

**The preview box is important.** It shows the effect on both balances *before* saving, in
plain language. It's how a non-accountant catches a mistake, and it's how the double-entry
model becomes visible without ever using the words "debit" or "credit". Every template form
must have it.

Validation: amount must be greater than zero; date cannot be in the future; a cash payment
cannot take cash negative without an explicit confirmation.

---

## 5. Upload

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back                      UPLOAD DOCUMENTS                                   │
│                                                                               │
│   ┌───────────────────────────────────────────────────────────────┐           │
│   │                                                               │           │
│   │            Drag files here, or                                │           │
│   │                                                               │           │
│   │       [ 📷 Take photo ]     [ 📁 Choose files ]                │           │
│   │                                                               │           │
│   │   JPG, PNG, HEIC, PDF · up to 15 MB each · multiple allowed   │           │
│   └───────────────────────────────────────────────────────────────┘           │
│                                                                               │
│   Uploading                                                                   │
│   ▸ IOCL_invoice_29jul.jpg      ████████████░░░  78%                          │
│   ▸ deposit_slip_4471.jpg       ✓ uploaded — reading…                         │
│   ▸ bijli_bill.pdf              ✓ ready for review                            │
│   ▸ IMG_2231.jpg                ⚠ already uploaded on 21 Jul — [view] [keep]   │
│                                                                               │
│                                  [ Go to review queue (7) → ]                 │
└───────────────────────────────────────────────────────────────────────────────┘
```

Mobile behaviour: "Take photo" opens the camera directly. Uploads continue if the user
navigates away. On a failed upload the file stays queued with a **Retry** button — never
silently discarded (NFR-10).

---

## 6. Review queue — the daily workflow

The most-used screen after the dashboard. Image left, extracted data right, on one screen.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back      REVIEW QUEUE            Document 1 of 7        [ Skip ]  [ ‹ › ]   │
├────────────────────────────────────┬──────────────────────────────────────────┤
│                                    │  Document type                            │
│                                    │  [ Purchase invoice (oil company)  ▾ ]    │
│      ┌──────────────────────┐      │                                           │
│      │                      │      │  Date          [ 29/07/2026 ]      ● high │
│      │                      │      │  Invoice no.   [ INV-88213 ]       ● high │
│      │   scanned invoice    │      │  Party         [ Indian Oil Corp ▾ ] ● high│
│      │       image          │      │  Product       [ HSD (Diesel)    ▾ ] ◐ med │
│      │                      │      │  Quantity      [ 12,000 ] litres   ● high │
│      │                      │      │  Rate          [ ₹ 82.40 ]        ◐ med  │
│      │                      │      │  Total amount  [ ₹ 9,88,800 ]     ● high │
│      │                      │      │                                           │
│      └──────────────────────┘      │  ⚠ Rate confidence is low — please check  │
│                                    │     against the image before approving.   │
│   [ ⊕ zoom ] [ ⊖ ] [ ↻ rotate ]    │                                           │
│   [ open full size ]               │  Creates: Purchases ₹9,88,800              │
│                                    │           Oil company payable +₹9,88,800   │
│   Uploaded by Ramesh                │                                           │
│   29 Jul 2026, 6:42 pm             │  Note [                              ]    │
│                                    │                                           │
│                                    │  [ Reject ]        [ Approve & post ]     │
└────────────────────────────────────┴──────────────────────────────────────────┘
```

Rules:
- Every field is editable. The extraction is a suggestion, never a decision (FR-047).
- Confidence per field: ● high / ◐ medium / ○ low. Low-confidence fields highlighted and, if
  configured, required to be touched before approval can proceed.
- The "Creates:" line states the ledger effect in plain words before approval.
- **Reject** asks for a reason and keeps the file stored — it does not delete anything.
- Keyboard shortcuts for speed: `A` approve, `R` reject, `→` next.
- On a phone, the image sits on top and the fields below, with a sticky "Approve" bar.

---

## 7. Reconcile

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back            RECONCILE — BANK — CURRENT ACCOUNT                           │
│                                                                               │
│   Statement date      [ 28 / 07 / 2026 ]                                      │
│   Closing balance     [ ₹ 6,09,980            ]   ← from your bank statement   │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────┐             │
│   │  Book balance      ₹ 6,12,480                               │             │
│   │  Statement         ₹ 6,09,980                               │             │
│   │  Difference        ₹    2,500      ▲                        │             │
│   │  Still unexplained ₹    2,500      ← updates as you tick     │             │
│   └─────────────────────────────────────────────────────────────┘             │
│                                                                               │
│   Tick each entry that appears on your statement:                             │
│                                                                               │
│   ☑  28 Jul  Paid IOCL — UTR 8891203              ₹ 5,00,000 out              │
│   ☑  28 Jul  UPI settlement 27 Jul                ₹   58,940 in               │
│   ☐  27 Jul  Cheque 100234 — Sharma Transport     ₹    2,500 in   ← not shown │
│   ☑  27 Jul  Electricity bill                     ₹   12,300 out             │
│                                                                               │
│   [ Post an adjustment ]                       [ Save & close reconciliation ] │
└───────────────────────────────────────────────────────────────────────────────┘
```

The live "still unexplained" figure is the heart of this screen (FR-083). When it reaches
zero, the remaining unticked items *are* the explanation — an uncleared cheque, a deposit in
transit — and the Owner can close with confidence. If it doesn't reach zero, something is
genuinely wrong and the Owner closes with a written explanation or posts an adjustment.

For a **cash** account the top of the screen offers an optional denomination counter:

```
   ₹500 × [ 240 ] = 1,20,000     ₹200 × [ 85 ] = 17,000
   ₹100 × [ 380 ] =   38,000     ₹ 50 × [ 92 ] =  4,600
   ₹ 20 × [ 145 ] =    2,900     ₹ 10 × [ 175 ] =  1,750
   Coins            [ ₹ 0 ]                              Total  ₹ 1,84,250
```

---

## 8. Customers

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ CREDIT CUSTOMERS                    Total outstanding  ₹ 3,26,700   [+ Add]    │
├────────────────────────┬────────────┬──────────┬───────────┬─────────────────┤
│ Customer               │ Outstanding│  Limit   │ Oldest    │ Status          │
├────────────────────────┼────────────┼──────────┼───────────┼─────────────────┤
│ Sharma Transport       │   84,200   │  75,000  │  71 days  │ ■ Over limit    │
│ Verma Logistics        │   62,500   │ 1,00,000 │  22 days  │ ● OK            │
│ Municipal Corporation  │   48,000   │       —  │  94 days  │ ■ Very overdue  │
│ Gupta Travels          │   31,900   │  50,000  │  14 days  │ ● OK            │
│ …                                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Ageing:  0–30 ₹1,92,300  ·  31–60 ₹86,200  ·  61–90 ₹34,000  ·  90+ ₹14,200  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Clicking a customer opens their statement: every sale and payment with running balance,
attached documents, and an **Export statement (PDF)** button.

---

## 9. Documents library

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ DOCUMENTS                                                                      │
│ [ Date range ▾ ] [ Type ▾ ] [ Uploaded by ▾ ] [ Status ▾ ] [ Search ]         │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                  │
│  │ thumb│  │ thumb│  │ thumb│  │ thumb│  │ thumb│  │ thumb│                  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘                  │
│  29 Jul    29 Jul    28 Jul    28 Jul    27 Jul    27 Jul                     │
│  Invoice   Deposit   Receipt   Statement Expense   Invoice                    │
│  ✓ posted  ✓ posted  ⏳ review ✓ posted  ✗ rejected ✓ posted                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Clicking a thumbnail opens the full image with a side panel: upload time, uploader, file
size, extraction result, review history, and a link to the transaction it created.

---

## 10. Reports

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ REPORTS                                                                        │
│                                                                               │
│  Period  [ This month ▾ ]   or  [ 01/07/2026 ] to [ 29/07/2026 ]              │
│                                                                               │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐         │
│  │  Purchase register │ │  Sales register    │ │  Profit summary    │         │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘         │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐         │
│  │ Customer outstanding│ │  Daily summary     │ │  Cash movement     │         │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘         │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Profit summary** output:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ PROFIT SUMMARY                                    01 Jul – 29 Jul 2026        │
│                                                                               │
│   Sales                                                                       │
│     Cash sales                                              ₹  28,40,000      │
│     Digital sales                                           ₹  14,90,000      │
│     Credit sales                                            ₹   9,60,000      │
│                                                             ─────────────     │
│     Total sales                                             ₹  52,90,000      │
│                                                                               │
│   Purchases                                                 ₹  49,10,000      │
│                                                             ─────────────     │
│   Gross margin                                              ₹   3,80,000      │
│                                                                               │
│   Expenses                                                                    │
│     Salaries                        ₹ 96,000                                  │
│     Electricity                     ₹ 42,300                                  │
│     Bank & payment charges          ₹  8,900                                  │
│     Maintenance                     ₹ 21,400                                  │
│     Miscellaneous                   ₹ 11,200                                  │
│                                                             ₹   1,79,800      │
│                                                             ─────────────     │
│   Net                                                       ₹   2,00,200      │
│                                                                               │
│   ⓘ This compares money spent on purchases against money earned from sales    │
│     in the period. It does not account for fuel bought this month but sold    │
│     next month. For accounting profit, enable stock tracking.                 │
│                                                                               │
│                                      [ Export Excel ]  [ Export PDF ]         │
└───────────────────────────────────────────────────────────────────────────────┘
```

That caveat box is required, not optional (FR-102).

---

## 11. Audit log (Owner only)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ AUDIT LOG        [ User ▾ ] [ Action ▾ ] [ Date range ▾ ]      [ Export ]      │
├──────────────────┬──────────┬────────────────────────────────────────────────┤
│ 29 Jul 18:44:02  │ Ramesh   │ Uploaded document IOCL_invoice_29jul.jpg        │
│ 29 Jul 18:41:10  │ Owner    │ Approved document #221 → posted txn #1043       │
│ 29 Jul 18:12:55  │ Ramesh   │ Created draft txn #1042 (cash sale ₹22,000)     │
│ 29 Jul 17:03:19  │ Owner    │ Reversed txn #1038 — reason: duplicate entry    │
│ 29 Jul 09:02:44  │ Ramesh   │ Signed in — 49.36.xx.xx                         │
│ 28 Jul 22:15:07  │ —        │ Failed sign-in attempt — 103.21.xx.xx           │
└──────────────────┴──────────┴────────────────────────────────────────────────┘
```

Clicking any row expands the before/after values. Read-only for everyone, including the
Owner — there is no delete control anywhere on this screen (FR-112).

---

## 12. Visual design guidance

Since the brief was explicitly "not much detail, big numbers will be enough":

| Aspect | Direction |
|---|---|
| Density | Low. The dashboard should feel almost empty. Detail lives one click down |
| Type scale | Balance figures around 40–48px desktop, 32–36px mobile. Labels 11–12px uppercase, muted |
| Numerals | Tabular/monospaced figures so columns of numbers align. Indian digit grouping (1,84,250 — not 184,250) |
| Colour | Restrained neutral base. Colour reserved for status only: green matched, amber attention, red problem. No decorative colour |
| Currency | Always show ₹. Never abbreviate to "1.8L" on financial screens — exact figures only |
| Negative amounts | Shown in red with a minus sign, never in brackets, to avoid ambiguity |
| Touch targets | Minimum 44×44px — entries get made on a phone at a fuel counter |
| Contrast | WCAG AA minimum. Screens may be viewed on a phone in daylight |
| Empty states | Every list says what to do next, not just "no data" |
| Destructive actions | Reversal requires typing a reason. No one-tap irreversible action anywhere |
| Loading | Skeleton placeholders on the dashboard, never a blank screen with a spinner |
