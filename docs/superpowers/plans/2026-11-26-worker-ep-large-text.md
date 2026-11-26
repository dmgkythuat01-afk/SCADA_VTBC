# Simplify worker film-print menu and enlarge text

- User requested removing the legacy report input and two-day report history cards, leaving only Quét thùng xuất ép màng in. Removed their DOM and UI handlers; top reload now refreshes the surviving export card directly. Backend history and existing sheet data are unchanged.
- Raised picker text to 26px, table body and main actions to 28px, metadata to 24–28px and headings to 30–32px. Picker height is 76px. The full-size table stays visible on phones in its own horizontal-scroll region, with a swipe hint.
- Kept scan validation, saved scans, export confirmation and inventory behavior unchanged. Removed the now-unused post-export report refresh.
- All 40 worker-export tests passed; full browser roundtrip passed. At 320/360/390/430/768/980/1440px verified exactly one card, 28px table text, horizontal table scrolling and no overlapping/overflowing controls or sections. Independent review found no actionable issues.
- Existing worker Apps Script URL updated; deployed source and public render verified. No production inventory writes during QA.
