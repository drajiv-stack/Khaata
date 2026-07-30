# 03 — Data Model

Target database: **PostgreSQL 16**. Types below are Postgres types. `numeric(14,2)` is used
for all money — never `float`, never `real`.

---

## 1. Why double-entry, in plain language

Your objective is to be able to say *"the system says the bank balance should be ₹4,12,000."*
For that sentence to be true, every rupee that leaves one place must arrive somewhere else,
recorded in the same breath.

If entries are just a flat list — *"deposited 50,000"* — then nothing forces cash to go down
when the bank goes up. A staff member records the deposit but forgets to reduce cash, and now
both balances are wrong and nothing in the system knows it.

Double-entry means each transaction has at least two **lines**, and the lines must sum to
zero. Cash deposit of ₹50,000:

| Account | Debit | Credit |
|---|---:|---:|
| Bank — SBI Current | 50,000.00 | |
| Cash in hand | | 50,000.00 |

The system refuses to save it if those don't balance. The result is that a balance is never
stored as a number someone typed — it is always **computed by summing the lines**, so it
cannot silently drift.

**The person entering data never sees any of this.** They choose "Deposited cash into bank",
type 50,000, pick the bank, and press save. The template generates the two lines. Debits and
credits appear nowhere in the user interface except the Owner's advanced ledger view.

### Sign convention

Each line stores a single signed `amount`:

- Positive = debit (money into this account / value increases for asset accounts)
- Negative = credit (money out of this account)

Balance of an account = `SUM(amount)` over all lines belonging to posted transactions, plus
the opening balance. For liability accounts (supplier payable) and receivables the sign is
handled at display time so the Owner sees a natural "you owe ₹X" / "they owe you ₹X".

Constraint enforced by the database: for every `transaction_id`, `SUM(amount) = 0`.

---

## 2. Entity relationship overview

```
                          ┌──────────────┐
                          │    users     │
                          └──────┬───────┘
                                 │ authored
          ┌──────────────────────┼─────────────────────────┐
          │                      │                         │
   ┌──────▼───────┐      ┌───────▼────────┐        ┌───────▼────────┐
   │  documents   │      │  transactions  │        │   audit_log    │
   └──────┬───────┘      └───────┬────────┘        └────────────────┘
          │ attached to          │ has 2..n
          └──────────────►┌──────▼──────────┐
                          │ transaction_    │
                          │     lines       │
                          └──────┬──────────┘
                                 │ posts to
                          ┌──────▼───────┐
                          │   accounts   │◄──────┐
                          └──────┬───────┘       │ subject of
                                 │               │
                    ┌────────────┴──────┐  ┌─────┴──────────────┐
                    │ customer_profiles │  │ reconciliations    │
                    │ supplier_profiles │  └─────┬──────────────┘
                    └───────────────────┘        │ matches
                                          ┌──────▼──────────────┐
                                          │ reconciliation_items│
                                          └─────────────────────┘

   Optional Phase 3:  products ─ nozzles ─ meter_readings ─ daily_rates ─ tank_dips
```

---

## 3. Core tables

### 3.1 `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text unique not null | login identifier |
| `full_name` | text not null | shown as entry author |
| `password_hash` | text not null | argon2id |
| `role` | text not null | `OWNER` \| `OPERATOR` |
| `is_active` | boolean not null default true | deactivate, never delete |
| `totp_secret` | text null | optional 2FA |
| `failed_login_count` | int not null default 0 | |
| `locked_until` | timestamptz null | |
| `last_login_at` | timestamptz null | |
| `created_at` / `updated_at` | timestamptz | |

### 3.2 `accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text unique | short code e.g. `CASH-01`, `BANK-SBI` |
| `name` | text not null | display name |
| `type` | text not null | `CASH` \| `BANK` \| `DIGITAL_SETTLEMENT` \| `SUPPLIER` \| `CUSTOMER` \| `INCOME` \| `EXPENSE` \| `OWNER_EQUITY` |
| `normal_side` | text not null | `DEBIT` for assets/expenses, `CREDIT` for liabilities/income/equity — drives display sign |
| `opening_balance` | numeric(14,2) not null default 0 | |
| `opening_date` | date not null | go-live date |
| `is_active` | boolean not null default true | |
| `reconcile_required` | boolean not null default false | true for cash, bank, digital, supplier |
| `variance_amber_threshold` | numeric(14,2) null | per-account colour thresholds |
| `variance_red_threshold` | numeric(14,2) null | |
| `notes` | text null | |
| `created_at` / `updated_at` | timestamptz | |

Index: `(type, is_active)`.

### 3.3 `customer_profiles` (1:1 with an account of type `CUSTOMER`)

| Column | Type | Notes |
|---|---|---|
| `account_id` | uuid PK FK → accounts | |
| `contact_person` | text | |
| `phone` | text | |
| `vehicle_refs` | text null | fleet/vehicle numbers, free text |
| `credit_limit` | numeric(14,2) null | |
| `credit_days` | int null | |
| `address` | text null | |

### 3.4 `supplier_profiles` (1:1 with an account of type `SUPPLIER`)

| Column | Type | Notes |
|---|---|---|
| `account_id` | uuid PK FK → accounts | |
| `company_name` | text | e.g. Indian Oil Corporation Ltd |
| `dealer_code` | text null | your outlet/dealer code |
| `contact_person` | text null | |
| `phone` | text null | |

### 3.5 `transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `txn_number` | bigserial unique | human-readable sequential number |
| `txn_date` | date not null | when the event actually happened |
| `template` | text not null | which entry template produced it — see §5 |
| `narration` | text null | free text |
| `reference` | text null | invoice no. / cheque no. / UTR |
| `status` | text not null | `DRAFT` \| `POSTED` \| `REVERSED` |
| `reverses_transaction_id` | uuid null FK → transactions | set on a reversal entry |
| `reversed_by_transaction_id` | uuid null FK → transactions | set on the original when reversed |
| `source` | text not null | `MANUAL` \| `DOCUMENT_REVIEW` \| `AUTO_APPROVED` \| `ADJUSTMENT` \| `OPENING` |
| `created_by` | uuid FK → users | |
| `posted_by` | uuid null FK → users | |
| `created_at` | timestamptz not null | the posting timestamp |
| `posted_at` | timestamptz null | |
| `is_backdated` | boolean generated | true when `posted_at::date - txn_date > 3 days` |

Indexes: `(txn_date)`, `(status)`, `(created_by)`, `(template)`.

### 3.6 `transaction_lines`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `transaction_id` | uuid not null FK → transactions ON DELETE RESTRICT | |
| `account_id` | uuid not null FK → accounts | |
| `amount` | numeric(14,2) not null | signed: + debit, − credit. `<> 0` enforced |
| `line_narration` | text null | |
| `is_reconciled` | boolean not null default false | |
| `reconciliation_id` | uuid null FK → reconciliations | |

Indexes: `(account_id, transaction_id)`, `(reconciliation_id)`.

**Balance constraint.** Enforce `SUM(amount) = 0` per transaction with a deferred constraint
trigger that fires at commit, so multi-line inserts are allowed within a transaction.

```sql
CREATE OR REPLACE FUNCTION assert_txn_balanced() RETURNS trigger AS $$
DECLARE s numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO s
    FROM transaction_lines WHERE transaction_id = NEW.transaction_id;
  IF s <> 0 THEN
    RAISE EXCEPTION 'Transaction % is unbalanced by %', NEW.transaction_id, s;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_txn_balanced
  AFTER INSERT OR UPDATE ON transaction_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_txn_balanced();
```

**Immutability.** Add a trigger that raises an exception on `UPDATE` or `DELETE` of any line
belonging to a transaction whose status is `POSTED`. Corrections happen by reversal only
(FR-025).

### 3.7 `documents`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `original_filename` | text not null | |
| `storage_key` | text not null unique | object storage path |
| `mime_type` | text not null | |
| `size_bytes` | bigint not null | |
| `sha256` | text not null | duplicate detection (FR-043) |
| `doc_type` | text null | `PURCHASE_INVOICE` \| `BANK_STATEMENT` \| `DEPOSIT_SLIP` \| `CUSTOMER_RECEIPT` \| `SETTLEMENT_STATEMENT` \| `EXPENSE_BILL` \| `CASH_MEMO` \| `OTHER` |
| `status` | text not null | `UPLOADED` \| `EXTRACTING` \| `PENDING_REVIEW` \| `APPROVED` \| `REJECTED` \| `FAILED` |
| `extracted_json` | jsonb null | raw structured output from extraction |
| `extraction_confidence` | numeric(4,3) null | overall 0–1 |
| `extraction_model` | text null | which model/version did it, for later comparison |
| `extraction_error` | text null | |
| `rejection_reason` | text null | |
| `uploaded_by` | uuid FK → users | |
| `uploaded_at` | timestamptz not null | |
| `reviewed_by` | uuid null FK → users | |
| `reviewed_at` | timestamptz null | |
| `superseded_by_document_id` | uuid null FK → documents | re-uploads never overwrite |

Indexes: `(status)`, `(uploaded_at)`, `(doc_type)`, `(sha256)`.

### 3.8 `document_links` (many-to-many: a document can back several transactions, and vice versa)

| Column | Type |
|---|---|
| `document_id` | uuid FK → documents |
| `transaction_id` | uuid FK → transactions |
| PK | (`document_id`, `transaction_id`) |

### 3.9 `reconciliations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid not null FK → accounts | |
| `period_start` | date not null | |
| `statement_date` | date not null | the "as at" date |
| `book_balance` | numeric(14,2) not null | computed and frozen at completion |
| `actual_balance` | numeric(14,2) not null | entered by Owner from statement or count |
| `variance` | numeric(14,2) generated | `book_balance - actual_balance` |
| `status` | text not null | `IN_PROGRESS` \| `COMPLETED` \| `COMPLETED_WITH_VARIANCE` |
| `explanation` | text null | required when closed with a variance |
| `adjustment_transaction_id` | uuid null FK → transactions | if the Owner posted an adjustment |
| `denomination_json` | jsonb null | optional cash note count (FR-087) |
| `performed_by` | uuid FK → users | |
| `completed_at` | timestamptz null | |
| `created_at` | timestamptz | |

Unique index: `(account_id, statement_date)`.

### 3.10 `audit_log`

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `occurred_at` | timestamptz not null default now() | |
| `user_id` | uuid null FK → users | null for system actions |
| `action` | text not null | `CREATE` \| `POST` \| `REVERSE` \| `UPDATE` \| `APPROVE` \| `REJECT` \| `LOGIN` \| `LOGIN_FAILED` \| `LOGOUT` \| `RECONCILE` \| `EXPORT` |
| `entity_type` | text not null | `transaction` \| `document` \| `account` \| `user` \| `reconciliation` \| `session` |
| `entity_id` | text null | |
| `before_json` | jsonb null | |
| `after_json` | jsonb null | |
| `ip_address` | inet null | |
| `user_agent` | text null | |

Indexes: `(occurred_at desc)`, `(user_id)`, `(entity_type, entity_id)`.

**Protection:** the application's database role must have `INSERT` and `SELECT` on
`audit_log` but **no `UPDATE` or `DELETE`**. Grant those only to a separate admin role used
for maintenance. This is what makes the log genuinely trustworthy rather than merely a table.

---

## 4. Optional Phase 3 tables (meter readings and stock)

### `products`
`id`, `name` (MS / HSD / XP-95 / lubricant), `unit` (`LITRE` / `PIECE`), `is_active`.

### `daily_rates`
`id`, `product_id`, `effective_date`, `sale_rate` numeric(10,3), `purchase_rate`
numeric(10,3), `created_by`, `created_at`. Unique on (`product_id`, `effective_date`).

### `nozzles`
`id`, `du_name` (dispensing unit label), `nozzle_label`, `product_id`, `is_active`.

### `meter_readings`
`id`, `nozzle_id`, `reading_date`, `shift` (`DAY` / `NIGHT` / `FULL`), `opening_reading`
numeric(12,2), `closing_reading` numeric(12,2), `testing_litres` numeric(10,2),
`sold_litres` generated, `rate_applied`, `expected_amount` generated, `recorded_by`,
`created_at`. Unique on (`nozzle_id`, `reading_date`, `shift`). Check constraint:
`closing_reading >= opening_reading`.

### `tank_dips`
`id`, `tank_label`, `product_id`, `dip_date`, `measured_litres`, `book_litres`,
`variance_litres` generated, `recorded_by`.

### `stock_movements`
`id`, `product_id`, `movement_date`, `direction` (`IN` / `OUT`), `litres`, `rate`,
`transaction_id` (link to the purchase or sale entry), `source`.

---

## 5. Transaction templates — the lines each one generates

This table is the contract between the user interface and the ledger. A developer
implementing entry screens should follow it exactly.

| # | Template | What the user is asked | Debit (+) | Credit (−) |
|---|---|---|---|---|
| 1 | **Cash sale** | date, amount, (optional product) | Cash in hand | Sales income |
| 2 | **Digital sale** | date, amount, which provider | Digital settlement (that provider) | Sales income |
| 3 | **Credit sale** | date, customer, amount, invoice ref | Customer account | Sales income |
| 4 | **Customer payment received** | date, customer, amount, mode | Cash / Bank / Digital (per mode) | Customer account |
| 5 | **Purchase from oil company** | date, invoice no., product, litres, rate, amount | Purchases (expense) | Supplier account |
| 6 | **Payment to oil company** | date, amount, from which account, reference | Supplier account | Bank / Cash |
| 7 | **Cash deposited into bank** | date, amount, which bank, slip ref | Bank | Cash in hand |
| 8 | **Cash withdrawn from bank** | date, amount, which bank | Cash in hand | Bank |
| 9 | **Digital settlement received** | date, gross amount, charges, which bank | Bank (net) + Charges (expense) | Digital settlement |
| 10 | **Expense paid** | date, expense head, amount, paid from | Expense account | Cash / Bank |
| 11 | **Owner drawing** | date, amount, from | Owner equity | Cash / Bank |
| 11b | **Capital introduced** | date, amount, into | Cash / Bank | Owner equity |
| 12 | **Adjustment** (Owner only) | date, two accounts, amount, mandatory reason | chosen account | chosen account |

Template 9 is the one people get wrong: a ₹10,000 UPI collection may arrive as ₹9,980 after
charges. The template asks for gross and net, books the ₹20 difference to a charges expense
account, and clears the digital settlement account fully. Without this, the digital balance
never returns to zero and slowly accumulates phantom money.

---

## 6. How balances are computed

```sql
-- Book balance of an account as at a date
SELECT a.opening_balance + COALESCE(SUM(l.amount), 0) AS book_balance
FROM accounts a
LEFT JOIN transaction_lines l ON l.account_id = a.id
LEFT JOIN transactions t ON t.id = l.transaction_id
     AND t.status = 'POSTED'
     AND t.txn_date <= :as_at_date
WHERE a.id = :account_id
GROUP BY a.id, a.opening_balance;
```

At this data volume that query is instant with no caching. Do not add a stored
`current_balance` column on `accounts` — a stored balance is exactly the kind of number that
drifts out of agreement with the transactions behind it, which is the problem this system is
meant to solve. If performance ever becomes an issue (it won't at one outlet), add a
materialised view refreshed on posting, never a hand-maintained column.

---

## 7. Default chart of accounts to seed

| Code | Name | Type | Normal side |
|---|---|---|---|
| `CASH-01` | Cash in hand (counter) | CASH | DEBIT |
| `CASH-02` | Cash in safe | CASH | DEBIT |
| `BANK-01` | Bank — current account | BANK | DEBIT |
| `DIG-UPI` | UPI collections (awaiting settlement) | DIGITAL_SETTLEMENT | DEBIT |
| `DIG-CARD` | Card collections (awaiting settlement) | DIGITAL_SETTLEMENT | DEBIT |
| `SUP-OMC` | Oil company account | SUPPLIER | CREDIT |
| `INC-FUEL` | Fuel sales | INCOME | CREDIT |
| `INC-OTHER` | Other sales (lubricants, shop) | INCOME | CREDIT |
| `EXP-PURCH` | Fuel purchases | EXPENSE | DEBIT |
| `EXP-SAL` | Staff salaries | EXPENSE | DEBIT |
| `EXP-ELEC` | Electricity | EXPENSE | DEBIT |
| `EXP-MAINT` | Maintenance and repairs | EXPENSE | DEBIT |
| `EXP-CHRG` | Bank and payment charges | EXPENSE | DEBIT |
| `EXP-MISC` | Miscellaneous expenses | EXPENSE | DEBIT |
| `EQ-OWNER` | Owner's capital / drawings | OWNER_EQUITY | CREDIT |

Credit customer accounts are created individually as they're added.

---

## 8. Data retention

- Transactions, lines, audit log: **retain indefinitely**. Never purged by the application.
- Documents: retain indefinitely. Consider moving files older than 3 years to cheaper cold
  storage; keep the database rows regardless.
- Sessions: expire after 12 hours of inactivity; session records purged after 90 days.
- Backups: 30 days rolling, plus one monthly snapshot retained for 12 months.
