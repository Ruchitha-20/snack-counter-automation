# Snack Counter Automation – Basic MVP

A small Node.js prototype for managing snack-box refills across Oslo and Bengaluru.

This version intentionally focuses only on the core workflow. It does **not** include authentication, deployment configuration, or chat integration.

## Included

- Report an empty snack box.
- Select an eligible volunteer fairly.
- Accept an assignment (only one volunteer can accept it).
- Expire an unaccepted assignment and offer it to another volunteer.
- Record a purchase while checking the office's monthly budget.
- Submit a simulated reimbursement claim.
- Show monthly spending separately by office and currency.
- Automated tests for fairness, concurrent acceptance, reassignment, duplicate reports, and budget limits.

## Not included

- Login, roles, or authentication.
- Deployment, Docker, cloud infrastructure, or CI/CD.
- Chat notifications or chat APIs.
- A real HR/reimbursement integration.
- Database persistence. The prototype uses in-memory data, so data resets when the process restarts.
- Currency conversion. NOK and INR totals are intentionally kept separate.

## Requirements

- Node.js 20 or later
- npm (comes with Node.js)

No third-party npm packages are required.

## Run the demo

From the project directory:

```bash
npm start
```

The demo creates an empty-box request, assigns and accepts a volunteer, records a purchase, submits a simulated reimbursement claim, and prints monthly totals.

## Run the tests

```bash
npm test
```

## Reset / inspect the sample data

```bash
npm run reset
```

This prints the clean sample data that is loaded whenever the app starts. Since the store is in memory, running the demo already starts with a fresh dataset.

## Project structure

```text
snack-counter-mvp/
├── README.md
├── package.json
├── src/
│   ├── lock.js
│   ├── seed-data.js
│   ├── store.js
│   └── snack-service.js
├── scripts/
│   ├── demo.js
│   └── reset.js
└── test/
    └── snack-service.test.js
```

## Basic workflow

```text
EMPTY BOX REPORTED
       |
       v
REFILL REQUEST CREATED
       |
       v
VOLUNTEER ASSIGNED
       |
       +---- Not accepted before expiry ----> ASSIGN TO NEXT VOLUNTEER
       |
       v
VOLUNTEER ACCEPTS
       |
       v
PURCHASE RECORDED (WITH BUDGET CHECK)
       |
       v
SIMULATED REIMBURSEMENT CLAIM SUBMITTED
```

## Business rules and assumptions

- Sample monthly budgets:
  - Oslo: 6,000 NOK
  - Bengaluru: 15,000 INR
- Sample purchase amounts are entered in the office's own currency.
- Volunteer selection prioritizes:
  1. Fewest completed refills.
  2. Oldest/never completed refill.
  3. Lowest employee ID as a stable tie-breaker.
- A volunteer with an active assignment is not selected for another assignment.
- An assignment expires after four hours if it is not accepted. This is a configurable prototype assumption, not a requirement specified in the exercise.
- A purchase cannot take the office over its monthly budget.
- A repeated empty-box report for a box with an active request returns the existing request instead of creating a duplicate.
- Monthly totals are grouped by office and currency. The app does not add NOK and INR together.
- Submitting a claim is not the same as receiving reimbursement. The prototype stops at `CLAIM_SUBMITTED`.

## Important implementation note

The acceptance lock is process-local and exists only to demonstrate the race condition in this single-process prototype. A production implementation should use a database transaction and constraints (for example, PostgreSQL row locking and a unique active-assignment constraint). The in-memory store is for demonstrating the workflow, not for production use.

## PostgreSQL table scripts

The repository also includes SQL scripts you can run directly in PostgreSQL. These create a separate `snack_counter` schema and the tables needed for the workflow.

Files:

- `scripts/postgres/001_create_tables.sql` – creates the tables, foreign keys, checks, and indexes.
- `scripts/postgres/002_seed_sample_data.sql` – inserts the sample Oslo and Bengaluru offices, volunteers, snack boxes, availability, and current-month budgets.

Run them in order:

```bash
psql -U <username> -d <database_name> -f scripts/postgres/001_create_tables.sql
psql -U <username> -d <database_name> -f scripts/postgres/002_seed_sample_data.sql
```

Or open each `.sql` file in pgAdmin Query Tool and execute it.

The SQL schema is included as a database design / persistence starting point. The JavaScript MVP still uses its in-memory store; it is not yet wired to PostgreSQL.
