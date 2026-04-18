# Bank Bonus Tracker — Design Spec

## Overview

A Progressive Web App (PWA) for tracking bank account sign-up bonuses. Fully offline, all data stored on-device via IndexedDB. Built with vanilla HTML/CSS/JS — no frameworks, no build tools. Deployed to GitHub Pages.

## Data Model

```
BankBonus {
  id: string (UUID)
  bankName: string
  dateOpened: string (YYYY-MM-DD)
  bonusAmount: number (dollar value of the bonus)
  bonusDeadline: string (YYYY-MM-DD)
  accountCloseDate: string (YYYY-MM-DD, optional)
  minimumOpenLength: { value: number, unit: "months" | "weeks" } | null
  earlyTerminationFee: number | null  // only relevant when minimumOpenLength > 0
  minimumBalanceRequirement: number | null  // can be 0; null means not set
  notes: string (optional, free-text)
  requirements: Requirement[]
  directDepositDates: string[] (YYYY-MM-DD)
  status: "active" | "completed"
  createdAt: string (ISO timestamp)
}

Requirement {
  id: string (UUID)
  type: "direct_deposit_total" | "direct_deposit_count" | "debit_transactions" | "minimum_balance"
  description: string (e.g. "$4,000 in direct deposits")
  targetAmount: number (dollar amount or count, depending on type)
  currentProgress: number
  perUnitMinimum: number | null (e.g. $500 minimum per deposit, null if N/A)
  completed: boolean (manual checkbox)
}
```

### Requirement Types

| Type | Target means | Progress means | Card summary example |
|------|-------------|----------------|---------------------|
| direct_deposit_total | Total dollar amount | Dollars deposited so far | $2,000/$4,000 DD |
| direct_deposit_count | Number of deposits | Deposits made so far | 1/3 $500 deposits |
| debit_transactions | Number of transactions | Transactions made so far | 3/10 debit txns |
| minimum_balance | Dollar amount to maintain | Current balance | $1,500/$1,500 balance |

A single account can have multiple requirements of different types.

## UI Structure

### Single-Page App — Two Sections

**Header:** App title ("Bank Bonus Tracker") + "Add New" button.

**Active section:** Cards for in-progress bonuses, scrollable.

**Completed section:** Cards for finished bonuses, collapsible section at the bottom.

### Card (Collapsed)

Visible on the main scrollable list. Shows:
- **Bank Name** (bold, prominent)
- **Bonus Amount** (e.g. "$300 bonus")
- **Deadline date** with color-coded urgency:
  - Green: 30+ days remaining
  - Yellow: 7-30 days remaining
  - Red: <7 days remaining
- **Requirements summary** — one compact line per requirement (e.g. "$2,000/$4,000 DD | 3/10 debit txns")
- **Overall progress** — "2/3 requirements met"

Does NOT show: date opened, account close date, minimum open length, early termination fee, minimum balance requirement, notes, direct deposit dates.

### Card (Expanded)

Tapping a collapsed card expands it in-place. Shows all fields:
- Date opened, bonus amount, deadline, account close date
- Minimum account open length (if set)
- Early termination fee (only shown if minimum open length > 0)
- Minimum balance requirement (shown even if $0; hidden if null/not set)
- Notes (if any)
- **Each requirement** as its own block:
  - Description text
  - Progress display (e.g. "$2,000 / $4,000" or "3 / 10")
  - Progress input: slider for direct_deposit_total (with tappable number for precise entry), +1 button for count-based types, manual entry for minimum_balance
  - Checkbox to mark as completed
- **Direct deposit dates** — chronological list with "Log Deposit" button (defaults to today, editable)
- **Edit** and **Delete** buttons

**Collapse behavior:** Cards do NOT close when tapped again. Close via a dedicated "X" button inside the expanded view. Tapping a different card collapses the currently open one.

### Add/Edit Form

Modal or slide-up panel with:
- All account fields (bank name, dates, bonus amount, etc.)
- Optional fields: minimum open length (number + months/weeks toggle), early termination fee (shown conditionally), minimum balance requirement, notes
- Dynamic "Add Requirement" section: pick type, enter description and target amount, per-unit minimum if applicable
- Can add multiple requirements
- Save and Cancel buttons

## Interactions

### Progress Tracking
- **direct_deposit_total:** Slider from $0 to target. Displays exact dollar value next to slider. Value is tappable to type a precise number.
- **direct_deposit_count:** "+1" button to increment count.
- **debit_transactions:** "+1" button to increment count.
- **minimum_balance:** Manual text entry field to update current balance.
- Each requirement has a checkbox to manually mark as completed.

### Direct Deposit Date Logging
- "Log Deposit" button in expanded view adds today's date (editable before saving).
- Dates displayed as a simple chronological list.

### Completing a Bonus
- When all requirements are checked off, a "Mark Complete" button appears on the expanded card.
- Tapping it moves the card to the Completed section. This is a manual action — it does not happen automatically.
- Completed bonuses can be moved back to Active if needed.

### Delete Confirmation
- Deleting a card shows a confirm dialog to prevent accidents.

## Visual Design

- **Mobile-first:** Designed for iPhone (375px baseline width).
- **iOS-inspired aesthetic:** Rounded corners, subtle shadows, system font stack (-apple-system, BlinkMacSystemFont, etc.).
- **Large tap targets:** 44px+ minimum for all interactive elements.
- **Color coding:** Card border/badge reflects deadline urgency (green/yellow/red).
- **Completed requirements:** Strikethrough or muted styling.
- **Completed cards:** Visually dimmed in the Completed section.
- **Smooth transitions:** CSS animations for card expand/collapse and modal appearance.

## Offline & Storage

### IndexedDB
- Database: `BankBonusTrackerDB`
- Object store: `bonuses` (keyed by `id`)
- Thin wrapper module (`db.js`) with async functions: `getAll()`, `getById(id)`, `save(bonus)`, `delete(id)`
- No external libraries — raw IndexedDB API with Promises.

### PWA Configuration
- `manifest.json`: app name, icons, theme color, `"display": "standalone"`.
- `service-worker.js`: Caches all app files on first load (Cache API).
- **Cache strategy:** Cache-first. Serves from cache (works offline), checks for updates in background when online, refreshes cache for next launch.

## File Structure

```
/
  index.html          — single page shell
  style.css           — all styles
  app.js              — main app logic, UI rendering, event handling
  db.js               — IndexedDB wrapper
  service-worker.js   — offline caching
  manifest.json       — PWA manifest
  icons/              — app icons (192x192, 512x512)
```

No build step, no bundler. Push to GitHub Pages to deploy.

## Deployment

GitHub Pages — push files to a repo, enable Pages in settings. The user accesses the URL on their iPhone, taps "Add to Home Screen" in Safari's share menu, and the app installs as a standalone PWA.

## Verification

1. Open in a desktop browser — verify cards render, expand/collapse, add/edit/delete works
2. Open DevTools > Application > Service Workers — verify SW registers and caches files
3. Go offline (DevTools > Network > Offline) — verify app still loads and functions
4. Test on iPhone Safari — verify "Add to Home Screen" creates a standalone app
5. Test all requirement types — create a bonus with multiple requirements, verify progress tracking for each type
6. Test deadline color coding — create bonuses with various deadlines, verify green/yellow/red
7. Test completed flow — mark all requirements done, move to completed section
