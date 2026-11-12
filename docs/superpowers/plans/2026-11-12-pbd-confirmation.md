# Maintenance grouping and confirmation

Approved changes: one card per checklist category, all six cascading selections inside creation card (workshop, machine, department, device, category, scope); searchable account recipient at the end; submission waits for selected recipient acceptance before maintenance dates advance.

- [x] Group categories across devices with each parameter retaining device metadata.
- [x] Read only sanitized active account names/usernames, validate recipient server-side.
- [x] Preserve drafts/PBD IDs; pending → accepted or needs rework; creator resubmits, same ID, all confirmations kept.
- [x] Guard actual selected reviewer, revision and idempotency; historical completed records remain completed.
- [x] Browser checks at320–1440px and two-account create/confirm scenario; backend rejection/resubmission coverage.
- [x] Add confirmation columns preserving existing cells, deploy library/mobile and push Git.
