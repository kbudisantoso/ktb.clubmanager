# Domain Model: ktb.clubmanager

**Status:** Draft
**Last Updated:** 2026-01-22
**Approval:** Required before MVP implementation

This document defines the ubiquitous language for ktb.clubmanager - the German terms used in club management, accounting, and banking. It also documents business invariants that code must enforce.

**Primary source for entity structure:** prisma/schema.prisma

---

## 1. Glossary: Accounting Terms (SKR42)

German accounting terminology based on the DATEV SKR42 standard for non-profit organizations.

### Core Concepts

| German Term | English | Definition |
|-------------|---------|------------|
| **Kontenrahmen** | Chart of Accounts | Standardized structure for organizing accounts |
| **SKR42** | Standard Chart 42 | DATEV standard for German non-profits (5-digit codes, since 2025) |
| **Kontenklasse** | Account Class | Top-level grouping (0-9) |
| **Konto** | Account | Individual account in the chart of accounts |
| **Buchungssatz** | Journal Entry | A balanced accounting transaction |
| **Buchung** | Posting/Transaction | Recording of a financial event |
| **Buchungszeile** | Transaction Line | Single debit or credit within a transaction |
| **Soll** | Debit | Left side of T-account |
| **Haben** | Credit | Right side of T-account |
| **Bilanz** | Balance Sheet | Statement of assets and liabilities |
| **GuV** | Income Statement | Gewinn- und Verlustrechnung (P&L) |
| **Festschreibung** | Finalization/Lock | Process of making transactions immutable |
| **Korrekturbuchung** | Correction Entry | Reversal + new entry to fix finalized transactions |
| **Monatsabschluss** | Monthly Close | Finalizes all transactions in a month |
| **Jahresabschluss** | Yearly Close | Finalizes all transactions in fiscal year |

### Tax Spheres (Spharen)

Non-profit organizations in Germany must separate activities into four tax spheres:

| German Term | English | Definition |
|-------------|---------|------------|
| **Sphare** | Tax Sphere | Categories for non-profit taxation |
| **Ideeller Bereich** | Charitable Activities | Core non-profit mission (Sphere 1) |
| **Vermogensverwaltung** | Asset Management | Passive income like interest, rent (Sphere 2) |
| **Zweckbetrieb** | Mission-Related Business | Tax-exempt commercial activity (Sphere 3) |
| **Wirtschaftlicher Geschaftsbetrieb** | Commercial Business | Taxable business operations (Sphere 4) |

### SKR42 Account Classes

| Class | German | English | Type |
|-------|--------|---------|------|
| 0 | Anlagevermogen | Fixed Assets | ASSET |
| 1 | Umlaufvermogen | Current Assets | ASSET |
| 2 | Eigenkapitalkonten | Equity | LIABILITY (accounting convention) |
| 3 | Fremdkapitalkonten | Liabilities | LIABILITY |
| 4 | Einnahmen | Income/Revenue | INCOME |
| 5-6 | Ausgaben | Expenses | EXPENSE |
| 7 | Weitere Einnahmen/Ausgaben | Other Income/Expenses | INCOME/EXPENSE |
| 9 | Vortragskonten | Statistical/Carry-forward | (Special) |

---

## 2. Glossary: Club/Membership Terms

German terminology for club administration and member management.

| German Term | English | Definition |
|-------------|---------|------------|
| **Verein** | Club/Association | Legal entity under German BGB (Civil Code) |
| **Mitglied** | Member | Person belonging to the club |
| **Mitgliedschaft** | Membership | The relationship and period of membership |
| **Mitgliedsbeitrag** | Membership Fee | Periodic dues owed by a member |
| **Beitragskategorie** | Fee Category | Group with same fee amount (Adult, Child, Family, Senior) |
| **Beitragsordnung** | Fee Schedule | Club rules governing fee amounts and collection |
| **Beitragsabrechnung** | Fee Billing | Process of calculating and collecting fees |
| **Haushalt** | Household | Family or address grouping for billing purposes |
| **Familienbeitrag** | Family Fee | Reduced rate for entire family (household) |
| **Mitgliedsnummer** | Member Number | Unique identifier assigned to a member |
| **Eintrittsdatum** | Join Date | Date when member joined the club |
| **Austrittsdatum** | Leave Date | Date when member left the club |

---

## 3. Glossary: SEPA Terms

German banking terminology for SEPA direct debit processing.

| German Term | English | Definition |
|-------------|---------|------------|
| **Lastschrift** | Direct Debit | Bank collection method pulling funds from payer |
| **SEPA-Basislastschrift** | SEPA Core Direct Debit | Consumer direct debit with 8-week return right |
| **Mandat** | Mandate | Written authorization for direct debit |
| **Mandatsreferenz** | Mandate Reference | Unique ID per mandate (max 35 alphanumeric chars) |
| **Glaubiger-ID** | Creditor Identifier | Club's unique SEPA ID (issued by Bundesbank) |
| **Vorabankuendigung** | Pre-Notification | Required notice 14 days before debit execution |
| **pain.008** | Payment Initiation | XML format for direct debit files |
| **IBAN** | Int'l Bank Account Number | Standardized account identifier |
| **BIC** | Bank Identifier Code | Bank routing code (SWIFT code) |
| **Erstlastschrift** | First Direct Debit | First collection under a new mandate |
| **Folgelastschrift** | Recurring Direct Debit | Subsequent collections under existing mandate |
| **Rucklastschrift** | Returned Direct Debit | Collection returned by payer's bank |

---

## 4. Entities

### 4.1 Core Entities (existing in schema)

Entities currently defined in `prisma/schema.prisma`:

| Entity | German | Description | Schema |
|--------|--------|-------------|--------|
| Club | Verein | Tenant organization, all data is scoped to a club | Yes |
| Member | Mitglied | Person belonging to a club | Yes |
| Account | Konto | Entry in the chart of accounts (SKR42) | Yes |

**Note:** See `prisma/schema.prisma` for complete field definitions and relationships.

### 4.2 Planned Entities (future phases)

Entities to be added during MVP development:

| Entity | German | Description | Phase |
|--------|--------|-------------|-------|
| User | Benutzer | Authentication identity (OIDC) | Phase 7 |
| UserClubRole | Vereinsrolle | Per-club permission assignment | Phase 9 |
| Household | Haushalt | Family/address grouping for members | Phase 10 |
| CustomField | Zusatzfeld | Club-specific custom field definition | Phase 11 |
| CustomFieldValue | Feldwert | Per-member custom field value | Phase 11 |
| FeeCategory | Beitragskategorie | Fee amount definition | Phase 12 |
| FeeAssignment | Beitragszuordnung | Member-to-fee link | Phase 12 |
| Transaction | Buchung | Balanced journal entry | Phase 13 |
| TransactionLine | Buchungszeile | Single debit or credit entry | Phase 13 |
| BankImport | Bankimport | Imported bank statement record | Phase 15 |
| SepaMandate | SEPA-Mandat | Direct debit authorization | Phase 16 |

---

## 5. Invariants: Double-Entry Bookkeeping

Business rules that code must enforce for correct accounting.

### Core Accounting Invariants

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **Balance Invariant** | Every transaction: sum(debits) = sum(credits) | Database constraint + application validation |
| **Festschreibung** | Transactions editable until finalized; after finalization, corrections via reversal entries only | Application logic + period locks |
| **No Orphan Lines** | Every TransactionLine belongs to exactly one Transaction | Foreign key constraint |
| **Account Required** | Every TransactionLine references a valid Account | Foreign key constraint |
| **Decimal Precision** | Financial amounts use Decimal, never Float | Prisma Decimal type |
| **Tenant Isolation** | Transactions reference accounts from same club only | Application logic + RLS |
| **Account Type Consistency** | Debit/Credit behavior depends on account type | Application logic |

### Debit/Credit Rules by Account Type

| Account Type | Debit Increases | Credit Increases |
|--------------|-----------------|------------------|
| ASSET | Balance | (Decreases) |
| LIABILITY | (Decreases) | Balance |
| INCOME | (Decreases) | Balance |
| EXPENSE | Balance | (Decreases) |

### Festschreibung (Finalization)

**Transactions can be edited until finalized.** Finalization happens through:

1. **Manual period lock** - Treasurer locks a specific date range
2. **Monthly close** - Monatsabschluss locks the month
3. **Yearly close** - Jahresabschluss locks the fiscal year

**After finalization (festgeschrieben):**
- Original transaction is immutable
- Corrections require Korrekturbuchung (reversal + new entry)
- Audit trail preserved via linked correction entries

This matches standard German bookkeeping practice (GoBD compliance).

---

## 6. Invariants: Membership

Business rules for member management.

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **Member-Club Scope** | Members belong to exactly one club | Foreign key + application logic |
| **Unique Email per Club** | Member email must be unique within club (if provided) | Unique constraint on (clubId, email) |
| **Status Transitions** | Only valid transitions allowed | Application logic |
| **Soft Delete** | Members are never hard-deleted | deletedAt field |

### Valid Status Transitions

```
PENDING -> ACTIVE     (application approved)
ACTIVE  -> INACTIVE   (temporary suspension)
INACTIVE -> ACTIVE    (reactivation)
ACTIVE  -> LEFT       (membership terminated)
```

**Invalid transitions:**
- PENDING -> LEFT (must be activated first or soft-deleted)
- LEFT -> ACTIVE (must create new membership record)

---

## 7. Invariants: SEPA

Business rules for SEPA direct debit processing.

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **Mandate Before Debit** | Cannot generate SEPA file for member without valid mandate | Application validation |
| **Pre-Notification Period** | 14 calendar days notice before SEPA execution (configurable) | Application logic |
| **Mandate Reference Format** | Max 35 characters, alphanumeric only | Validation constraint |
| **Creditor ID Required** | Club must have Glaubiger-ID to generate SEPA files | Application validation |
| **Valid IBAN** | Member IBAN must pass checksum validation | Application validation |

### Mandate Lifecycle

1. **Created** - Member signs mandate (date recorded)
2. **Active** - Mandate can be used for direct debits
3. **Revoked** - Member cancels mandate (no longer usable)
4. **Expired** - 36 months without use (SEPA rule)

---

## 8. References

- **Prisma Schema:** `prisma/schema.prisma` - Authoritative source for entity structure
- **SKR42 Standard:** [DATEV Official](https://www.datev.de/web/de/datev-shop/material/12901-datev-kontenrahmen-skr-42-vereine-stiftungen-ggmbh-bilanz/)
- **SEPA Specifications:** [Deutsche Bundesbank](https://www.bundesbank.de/action/de/613964/bbksearch?pageNumString=1)
- **German Civil Code (BGB):** Vereinsrecht (Association Law), sections 21-79

---

*Document: docs/DOMAIN.md*
*Phase: 05-plan-validation*
*Requires approval before MVP implementation begins*
