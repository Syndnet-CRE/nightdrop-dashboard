# Deal-State Row Counts — Phase 0.2

**Purpose:** finalize the `df_deals_sent.stage` migration backfill
mapping based on real production row counts, not guessed mapping.

**Action required:** Brady runs the SQL below against
`$DATABASE_WRITE_URL` (the Neon production write endpoint) and pastes
results into the "Results" section.

---

## SQL to run

```sql
-- 1. Top-level breakdown by deal_state
SELECT deal_state, COUNT(*) AS n
FROM df_deals_sent
GROUP BY deal_state
ORDER BY n DESC;

-- 2. Cross-tab against status for clarity
SELECT deal_state, status, COUNT(*) AS n
FROM df_deals_sent
GROUP BY deal_state, status
ORDER BY deal_state, n DESC;

-- 3. Sanity: total row count
SELECT COUNT(*) AS total FROM df_deals_sent;

-- 4. Sample 5 rows per distinct deal_state for spot-check
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY deal_state ORDER BY sent_at DESC) AS rn
  FROM df_deals_sent
)
SELECT id, deal_state, status, feedback, saved_at, sent_at
FROM ranked
WHERE rn <= 5
ORDER BY deal_state, sent_at DESC;
```

Run via psql:
```bash
psql "$DATABASE_WRITE_URL" -f /tmp/deal-state-counts.sql
```

Or via DataGrip / pgAdmin — paste into a query tab and run.

---

## Results

_(Paste output here, then we lock the mapping below.)_

### Q1 — `deal_state` breakdown

| deal_state | n |
|---|---|
| ? | ? |

### Q2 — `deal_state` × `status`

| deal_state | status | n |
|---|---|---|
| ? | ? | ? |

### Q3 — Total

| total |
|---|
| ? |

### Q4 — Sample spot-checks

_(Paste 5 sample rows per deal_state.)_

---

## Proposed mapping (final, pending counts)

To be filled in after counts arrive. Initial proposal (likely
revised by the counts):

| `deal_state` | → | `stage` |
|---|---|---|
| `active` | → | `New` (or `Researching` if status indicates active review) |
| `loi` | → | `Negotiating` |
| `dead` | → | `Passed` |
| `archived` | → | `Closed` |
| (NULL, if any) | → | `New` (default per migration's NOT NULL DEFAULT clause) |

---

## Migration SQL (skeleton — finalized after mapping locks)

```sql
-- migrations/050_df_deals_sent_stage.sql
BEGIN;

ALTER TABLE df_deals_sent
  ADD COLUMN stage TEXT NOT NULL DEFAULT 'New'
  CHECK (stage IN ('New', 'Researching', 'Contacted', 'Negotiating', 'Passed', 'Closed'));

CREATE INDEX idx_df_deals_sent_stage ON df_deals_sent (stage);

-- Backfill from deal_state (locked after Q1/Q2 results):
UPDATE df_deals_sent SET stage = 'Negotiating' WHERE deal_state = 'loi';
UPDATE df_deals_sent SET stage = 'Passed'      WHERE deal_state = 'dead';
UPDATE df_deals_sent SET stage = 'Closed'      WHERE deal_state = 'archived';
-- 'active' rows already have stage='New' from the DEFAULT clause.

COMMIT;
```

This SQL is committed in `~/nightdrop-api/migrations/050_df_deals_sent_stage.sql`
only AFTER the mapping is final.

---

## Backward-compat guarantee

After this migration:

- `deal_state` column is untouched. Pipeline view continues to read it.
- `stage` is a new dimension specific to the spreadsheet's CRM-style
  column.
- A row can have both: `deal_state = 'active'` AND `stage = 'Contacted'`.
  This is intentional — `deal_state` is "system lifecycle"; `stage` is
  "user's CRM stage."
- Front-end consumers of `deal_state` (PipelineTimeline, MapView pin
  colors, etc.) see no change.

---

## When this file is closed

After Phase 1 ships and production returns `stage` field, this file
moves to "completed" status. Counts stay as a historical reference for
future migrations.
