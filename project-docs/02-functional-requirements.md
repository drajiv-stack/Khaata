# 02 — Functional Requirements

Requirements are numbered `FR-nnn` and grouped by module. Each carries a priority:

- **M** — Must have. Phase 1. The system is not usable without it.
- **S** — Should have. Phase 2.
- **C** — Could have. Phase 3, optional.
- **W** — Won't have this time. Recorded so it isn't forgotten.

Acceptance criteria are written as things a tester can actually check.

---

## A. Access and users

| ID | Pri | Requirement |
|---|---|---|
| FR-001 | M | The system shall require email/username and password to access any page other than the login page. |
| FR-002 | M | The system shall support two roles: **Owner** and **Operator**, with permissions as defined in document 01 §4. |
| FR-003 | M | The system shall record every login attempt (success and failure) with timestamp and IP address. |
| FR-004 | S | The system shall lock an account for 15 minutes after 5 consecutive failed login attempts. |
| FR-005 | M | The system shall provide an Owner-only, one-time **opening balance** entry for each account, dated to the go-live date. Once confirmed, opening balances become read-only and can only be changed by a dated adjustment entry that appears in the audit log. |
| FR-006 | S | The Owner shall be able to create, deactivate and reset the password of Operator users. Users are never deleted, only deactivated, so their historic entries retain an author. |
| FR-007 | C | The system shall support optional two-factor authentication (TOTP app) for the Owner account. |

**Acceptance — FR-005:** Entering an opening cash balance of ₹50,000 and posting no other
transactions results in a dashboard cash balance of exactly ₹50,000, and the opening entry is
visible in the cash account ledger dated to go-live.

---

## B. Chart of accounts

| ID | Pri | Requirement |
|---|---|---|
| FR-010 | M | The system shall maintain a list of accounts, each with: name, type, opening balance, active flag, and optional notes. |
| FR-011 | M | Account types shall be: `CASH`, `BANK`, `DIGITAL_SETTLEMENT`, `SUPPLIER`, `CUSTOMER`, `INCOME`, `EXPENSE`, `OWNER_EQUITY`. |
| FR-012 | M | The system shall allow the Owner to add, rename and deactivate accounts. An account with any posted transaction cannot be deleted, only deactivated. |
| FR-013 | M | The system shall ship with a default chart of accounts appropriate to a petrol pump (listed in document 03 §7) so the Owner is not starting from an empty screen. |
| FR-014 | M | Customer accounts shall additionally carry: contact person, phone, vehicle/fleet reference, credit limit, and credit period in days. |
| FR-015 | M | Supplier accounts shall additionally carry: company name, dealer/outlet code, and contact. |
| FR-016 | S | The system shall warn (not block) when posting a credit sale that would take a customer past their credit limit or whose oldest invoice is past their credit period. |

---

## C. Transactions and the ledger

| ID | Pri | Requirement |
|---|---|---|
| FR-020 | M | Every transaction shall consist of a header (date, type, narration, author, status) and two or more lines, where total debits equal total credits. The system shall reject any unbalanced transaction. |
| FR-021 | M | Users shall never be required to understand debits and credits. Entry shall be through **transaction templates** that ask plain questions and generate the correct lines internally. |
| FR-022 | M | The following templates shall be provided: <br>1. Cash sale <br>2. Digital sale (UPI/card/wallet) <br>3. Credit sale to customer <br>4. Payment received from customer <br>5. Fuel/stock purchase from oil company (on credit) <br>6. Payment made to oil company <br>7. Cash deposited into bank <br>8. Cash withdrawn from bank <br>9. Digital settlement received into bank <br>10. Expense paid (cash or bank) <br>11. Owner drawing / capital introduced <br>12. Adjustment / correction entry (Owner only) |
| FR-023 | M | Every transaction shall store both the **transaction date** (the date the event happened) and the **posted timestamp** (when it was entered into the system). Both shall be visible. |
| FR-024 | M | A transaction shall have status `DRAFT`, `POSTED`, or `REVERSED`. Only `POSTED` transactions affect balances. |
| FR-025 | M | Posted transactions shall not be editable or deletable. A correction is made by creating a **reversal** — an automatically generated opposite entry linked to the original — and then entering the correct transaction. Both remain visible in the ledger. |
| FR-026 | M | The Owner shall be able to reverse any posted transaction; an Operator shall not. |
| FR-027 | M | Every transaction shall support attaching one or more uploaded documents. |
| FR-028 | S | The system shall flag on the dashboard any transaction posted more than 3 days after its transaction date ("backdated entry"). |
| FR-029 | S | The system shall support a free-text narration and an optional reference number (invoice no., cheque no., UTR) per transaction. |
| FR-030 | S | The system shall prevent posting into a period the Owner has marked as **closed**, unless the Owner reopens it. |

**Acceptance — FR-025:** After posting a ₹10,000 cash sale and then reversing it, the cash
balance returns to its prior value, the ledger shows both the original and the reversal, and
neither can be removed from the screen.

---

## D. Document upload and extraction

| ID | Pri | Requirement |
|---|---|---|
| FR-040 | M | Users shall be able to upload documents from a phone camera, phone gallery, or desktop file picker. Accepted formats: JPG, PNG, HEIC, WebP, PDF. Maximum 15 MB per file. |
| FR-041 | M | Multiple files shall be uploadable in one action. |
| FR-042 | M | Every uploaded file shall be stored permanently with: original filename, stored file key, file hash, size, uploader identity, upload timestamp, and document type. Files shall never be overwritten or deleted; superseded files are marked as such. |
| FR-043 | M | The system shall compute a hash of each file on upload and warn if an identical file has already been uploaded (duplicate protection). |
| FR-044 | M | Each uploaded document shall pass through the states: `UPLOADED` → `EXTRACTING` → `PENDING_REVIEW` → `APPROVED` or `REJECTED`. |
| FR-045 | M | The system shall automatically attempt to extract from each image: document type, document date, total amount, party name, reference/invoice number, and — where present — line items, quantity in litres, rate per litre, and product name. |
| FR-046 | M | The system shall recognise at minimum these document types: fuel purchase invoice from the oil company, bank statement or deposit slip, customer payment receipt, digital settlement statement, expense bill, and cash memo. |
| FR-047 | M | Extraction results shall never post automatically in Phase 1. Every extracted document lands in a **review queue** for human confirmation. |
| FR-048 | M | The review screen shall display the original image on one side and the editable extracted fields on the other, on the same screen, with the ability to zoom and rotate the image. |
| FR-049 | M | Each extracted field shall carry a confidence indicator. Fields below a configurable threshold shall be visually highlighted for attention. |
| FR-050 | M | On approval, the system shall create the corresponding transaction, post it, and permanently link the document to it. |
| FR-051 | M | On rejection, the document shall remain stored with a rejection reason, and shall not create any transaction. |
| FR-052 | S | The Owner shall be able to enable auto-approval for a specific document type once its extraction accuracy is trusted, with a minimum confidence threshold. Auto-approved entries shall be tagged as such and listed separately for spot-checking. |
| FR-053 | S | Any document shall be viewable and downloadable in full resolution from the transaction it is attached to, and from a searchable document library. |
| FR-054 | S | The document library shall be filterable by date range, document type, uploader, status, and linked account. |
| FR-055 | C | The system shall support uploading a multi-page PDF bank statement and extracting all rows as candidate matches for reconciliation. |

**Acceptance — FR-048:** On a 1366×768 desktop screen, a reviewer can read the amount on the
image and the extracted amount field without scrolling or switching tabs.

---

## E. Balances and dashboard

| ID | Pri | Requirement |
|---|---|---|
| FR-060 | M | The dashboard shall display, as large primary numbers, the current book balance of: total cash, each bank account, digital collections awaiting settlement, total payable to the oil company, and total receivable from credit customers. |
| FR-061 | M | Each balance shall display alongside it the last known **actual** balance and the **variance**, colour-coded: green when zero, amber when small, red when material. Thresholds configurable by the Owner. |
| FR-062 | M | Each balance card shall show the age of the last reconciliation ("verified 2 days ago") and turn amber when that exceeds 7 days. |
| FR-063 | M | Clicking any balance shall open that account's full ledger: date, narration, reference, debit, credit, running balance, author, attached document indicator. |
| FR-064 | M | Any ledger view shall be filterable by date range and searchable by narration, amount, or reference. |
| FR-065 | S | The dashboard shall show today's activity summary: number of transactions posted, total collected in cash / digital / credit, and documents awaiting review. |
| FR-066 | S | The dashboard shall show an alerts strip: documents pending review, backdated entries, accounts unreconciled beyond threshold, customers over credit limit. |
| FR-067 | S | The dashboard shall include a 30-day trend line for cash and bank balance. |
| FR-068 | M | The dashboard shall be readable on a phone: cards stack vertically, numbers remain large. |

**Design constraint (from the requirements interview):** the dashboard is deliberately sparse.
Big numbers, minimal detail, no dense tables above the fold. Detail lives one click down.

---

## F. Reconciliation

| ID | Pri | Requirement |
|---|---|---|
| FR-080 | M | The Owner shall be able to open a reconciliation for any account by entering: the statement/count date and the actual closing balance. |
| FR-081 | M | The system shall display, for that account and period: opening book balance, transactions in the period, closing book balance, the entered actual balance, and the variance. |
| FR-082 | M | The system shall list every transaction in the period with a tick box, so the Owner can mark items as matched to the statement. |
| FR-083 | M | The system shall show a live "remaining variance" figure that updates as items are ticked, so the Owner can see exactly which unticked items explain the difference. |
| FR-084 | M | On completion, the reconciliation shall be saved with date, actual balance, variance, who performed it, and which transactions were matched. Reconciled transactions shall be marked and shown as such in the ledger. |
| FR-085 | M | If a variance remains, the Owner shall be able to either close the reconciliation with a written explanation, or post an adjustment entry (which is itself logged as an adjustment). |
| FR-086 | S | The system shall keep a history of all past reconciliations per account, viewable with their variances, so a pattern of recurring shortfalls becomes visible. |
| FR-087 | S | For cash, the reconciliation screen shall offer an optional denomination counter (number of ₹500 / ₹200 / ₹100 / ₹50 / ₹20 / ₹10 notes and coins) that totals automatically. |
| FR-088 | C | The system shall suggest probable matches between statement lines and book entries by amount and date proximity. |

**Acceptance — FR-083:** Given a book balance of ₹1,00,000, an actual balance of ₹95,000, and
one unticked transaction of ₹5,000, the remaining variance shall read ₹0 once that item is
identified as the unmatched cause.

---

## G. Customers and supplier

| ID | Pri | Requirement |
|---|---|---|
| FR-090 | M | The system shall show a list of credit customers with outstanding balance, credit limit, and days since oldest unpaid item. |
| FR-091 | M | Each customer shall have a statement view: all sales and payments, with running balance, exportable to PDF. |
| FR-092 | M | The system shall produce an ageing report bucketing customer outstanding into 0–30, 31–60, 61–90 and 90+ days. |
| FR-093 | M | The system shall maintain a running account with the oil company: purchases increase the payable, payments reduce it, showing the current outstanding. |
| FR-094 | S | The Owner shall be able to reconcile the supplier account against the oil company's own statement, using the same reconciliation flow as bank accounts. |
| FR-095 | C | The system shall allow generating a WhatsApp-ready or printable outstanding reminder for a customer. |

---

## H. Reports

| ID | Pri | Requirement |
|---|---|---|
| FR-100 | M | **Purchase register** — all purchases in a date range: date, invoice number, product, quantity in litres, rate, amount, payment status. With totals. |
| FR-101 | M | **Sales register** — all sales in a date range, split into cash, digital, and credit, with totals per category and a grand total. |
| FR-102 | M | **Profit summary** — for a date range: total sales, total purchases, gross margin, operating expenses, net figure. With the stock-movement caveat stated on the report itself (see note below). |
| FR-103 | M | **Customer outstanding** — as at a date, with ageing. |
| FR-104 | M | Every report shall be exportable to Excel (.xlsx) and PDF. |
| FR-105 | S | **Daily summary** — one page per day: opening balances, collections by mode, purchases, expenses, closing balances, variances. |
| FR-106 | S | **Cash movement report** — every cash in and out for a period, with running balance. |
| FR-107 | S | Reports shall be runnable for preset ranges (today, this week, this month, last month, this financial year) as well as a custom range. |
| FR-108 | C | Month-on-month comparison of sales, purchases and margin. |

**Note on FR-102 (important):** true profit for a fuel outlet depends on closing stock
valuation, since fuel bought in one month is often sold in the next. Without stock tracking,
the profit figure is *sales minus purchases minus expenses for the period*, which is a cash
margin, not accounting profit. The report must display this caveat in plain words. If you
want accurate margin, we add the stock module (FR-070+), which is why it's recommended.

---

## I. Audit and history

| ID | Pri | Requirement |
|---|---|---|
| FR-110 | M | The system shall record an immutable audit entry for every: transaction created, posted, reversed; document uploaded, approved, rejected; account created or modified; reconciliation performed; user created or modified; login and logout. |
| FR-111 | M | Each audit entry shall record: who, what action, which record, before value, after value, timestamp, and IP address. |
| FR-112 | M | The audit log shall be viewable by the Owner only, filterable by user, date range, and action type, and shall not be editable or deletable from within the application by anyone. |
| FR-113 | S | Any record's own history shall be viewable from that record ("show history" on a transaction). |
| FR-114 | S | The audit log shall be exportable to Excel. |

---

## J. Optional — meter readings and stock (Phase 3, recommended)

This module is what turns the system from *"the numbers staff gave me are internally
consistent"* into *"the numbers staff gave me match the fuel that physically left the tanks."*

| ID | Pri | Requirement |
|---|---|---|
| FR-070 | C | The system shall hold a register of dispensing units and nozzles, each mapped to a product. |
| FR-071 | C | For each day (or shift), a user shall record per nozzle: opening meter reading, closing meter reading, and testing/calibration volume returned to tank. |
| FR-072 | C | The system shall compute sold litres = closing − opening − testing, and expected sale value = sold litres × the product rate for that day. |
| FR-073 | C | The system shall compare expected sale value against the total collections recorded for that day (cash + digital + credit) and display the difference prominently. |
| FR-074 | C | The system shall hold a daily product rate table, since pump rates change frequently. |
| FR-075 | C | The system shall record tank dip readings and compute book stock vs measured stock per product, showing gain/loss in litres. |
| FR-076 | C | Meter readings shall be enterable from a phone with large numeric inputs, and shall reject a closing reading lower than the opening reading. |

**Acceptance — FR-073:** If nozzles show 1,000 litres of diesel sold at ₹90.00 and staff have
recorded ₹88,000 in total collections, the screen shall show a shortfall of ₹2,000 for that
day, attributable to that nozzle set.

---

## K. Non-functional requirements

| ID | Pri | Requirement |
|---|---|---|
| NFR-01 | M | Dashboard shall load in under 3 seconds on a 4G connection. |
| NFR-02 | M | All traffic over HTTPS. No credentials or documents transmitted unencrypted. |
| NFR-03 | M | Passwords stored using a modern password hash (argon2id or bcrypt cost ≥ 12). Never stored or logged in plain text. |
| NFR-04 | M | Uploaded documents shall be served only through short-lived signed URLs, never from a public bucket. |
| NFR-05 | M | The database shall be backed up daily, with backups retained for at least 30 days, stored separately from the primary database. |
| NFR-06 | M | A restore from backup shall be tested at least once before go-live and documented. |
| NFR-07 | M | All monetary values stored as exact decimal (never floating point). All amounts in INR to 2 decimal places. |
| NFR-08 | M | All timestamps stored in UTC, displayed in Asia/Kolkata. |
| NFR-09 | M | The application shall be fully usable on a phone browser, including camera capture. |
| NFR-10 | S | The system shall remain functional and readable when a slow upload fails, showing a clear retry rather than losing the entry. |
| NFR-11 | S | Application errors shall be logged with enough context to diagnose, without logging document contents or credentials. |
| NFR-12 | M | The codebase shall live in a private GitHub repository with README setup instructions sufficient for a new developer to run it locally. |

---

## L. Won't have (recorded, not planned)

| ID | Requirement | Reason |
|---|---|---|
| FR-900 (W) | Direct bank API integration | Cost and access barriers; manual statement entry adequate |
| FR-901 (W) | Pump automation / DU controller integration | Hardware dependency, disproportionate cost |
| FR-902 (W) | GST/VAT return filing | Accountant's domain; duplication creates risk |
| FR-903 (W) | Multi-outlet consolidation | Single outlet. Data model leaves room for it |
| FR-904 (W) | Native mobile apps | Responsive web is sufficient |
| FR-905 (W) | Sharing data externally with bank or auditor portals | Explicitly not required — internal monitoring only |
