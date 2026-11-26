# Worker film-export mobile layout fix

- Reproduced the issue at 768px: global button width 100% inside a flex row compressed the plan select to 40px and overlapped it with Reload. Card controls also inherited global 36px select text.
- Scoped styles to the export card. Reload now sits in its own heading grid, picker takes a full row with 17px text and 54px height, with clear plan/list/action sections and locally sized labels/messages/buttons.
- Phones up to 700px show each box as a card containing the same ID, date, location, quantity and status as the desktop table. Phone action buttons stack; desktop uses two columns. Scanner/export logic and element IDs are unchanged.
- Real-browser measurements passed at 320/360/390/430/768/980/1440px with long product names, box IDs and location labels: no overlapping controls, no control overflow, no overlapping sections.
- Full worker browser roundtrip still passed wrong/correct QR, nonce replay, scan retention, confirm gating, per-box export, reload restoration and account callback isolation. All 90 related Node tests passed. Independent review found no actionable issues.
- Release: existing worker deployment updated; published source/render checked. No production inventory writes were made during QA.
