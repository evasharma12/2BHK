# PG Dynamic Fields Rollout Smoke-Test Checklist

Use this checklist after deploying the PG dynamic-fields rollout in production/staging.

## 1) Migration guard and startup verification

- [ ] Start backend with schema bootstrap enabled (`SKIP_DB_SCHEMA_ON_START` is not `true`).
- [ ] Confirm startup log prints:
  - [ ] `[startup] Running schema bootstrap + migration guards (createDatabaseSchema)`
  - [ ] `[rollout-safety] PG dynamic-fields migration summary:`
  - [ ] `[startup] Schema bootstrap + migration guards completed successfully`
- [ ] If startup fails with enum guard error (`deprecated property_type rows found`), stop rollout and clean up deprecated rows before retrying.

## 2) Schema verification (DB)

- [ ] `properties.property_type` enum values are exactly:
  - `apartment`, `independent-house`, `commercial`, `pg`
- [ ] `properties.type_specific_data` column exists and is `JSON NULL`.
- [ ] `properties.built_up_area` is nullable.
- [ ] `properties.carpet_area` is nullable.
- [ ] `properties.furnishing` is nullable.

## 3) API create/edit smoke tests

- [ ] Create PG listing with:
  - [ ] `room_types` containing at least two entries with counts
  - [ ] `meals_available=true`
- [ ] Create PG listing with `meals_available=false`.
- [ ] Edit an existing PG listing and confirm `room_types` + `meals_available` persist.
- [ ] Create and edit non-PG listing; confirm previous non-PG behavior remains unchanged.
- [ ] Attempt create/update with deprecated `property_type` (`studio`, `builder-floor`, `villa`, `penthouse`) and confirm backend rejects it.

## 4) UI smoke tests

- [ ] Post/Edit form:
  - [ ] PG: room types + meals controls shown.
  - [ ] PG: built-up/carpet/furnishing controls hidden.
  - [ ] Non-PG: existing controls unchanged.
- [ ] Property cards:
  - [ ] PG card shows room type summary and meals availability.
  - [ ] Non-PG card keeps area/furnishing layout.
- [ ] Property detail overview hides empty-value fields for both PG and non-PG.

## 5) Rollout sign-off

- [ ] No startup migration guard errors in logs.
- [ ] No create/edit regressions for non-PG.
- [ ] PG create/edit/list/detail flows verified by at least one end-to-end run.
- [ ] Release note includes fallback action: if enum guard blocks startup, rollback app deploy or remediate DB values first.
