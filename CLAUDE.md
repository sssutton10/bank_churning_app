# Bank Bonus Tracker

A vanilla HTML/CSS/JS Progressive Web App (PWA) for tracking bank account sign-up bonuses. Fully offline, all data stored on-device via IndexedDB. No frameworks, no build tools, no dependencies.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES modules)
- **Storage:** IndexedDB (via `db.js` wrapper)
- **Offline:** Service Worker (`service-worker.js`) with cache-first strategy
- **Hosting:** GitHub Pages
- **Target device:** iPhone (375px), iOS Safari

## Local Development

No build step required. Serve the project root over HTTP (required for ES modules and service workers):

```bash
# If Python is available
python -m http.server 3000

# If Node/npx is available
npx serve .
```

Then open `http://localhost:3000` in a browser.

**Note:** Service workers only work on `localhost` or HTTPS. Opening `index.html` directly as a file (`file://`) will not register the service worker or enable offline mode.

## Deploy to GitHub Pages

```bash
git add -A
git commit -m "description of changes"
git push
```

GitHub Pages auto-deploys from the `main` branch. The app is live at:
`https://<username>.github.io/<repo-name>/`

## ⚠️ Critical: Service Worker Cache

**Every time you deploy, bump the cache version in `service-worker.js`:**

```js
const CACHE_NAME = 'bonus-tracker-v2'; // increment this → v3, v4, etc.
```

Without this, users (including the home screen PWA on iPhone) will keep serving the old cached files. The new version triggers the activate handler to delete the old cache and claim the new one.

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Page shell, all HTML structure, modal markup |
| `style.css` | All styles — iOS-inspired, mobile-first, CSS variables |
| `db.js` | IndexedDB wrapper — `getAll()`, `getById()`, `save()`, `deleteById()` |
| `app.js` | All app logic — rendering, events, form, progress tracking |
| `service-worker.js` | Offline caching (cache-first + background update) |
| `manifest.json` | PWA metadata — name, icons, display mode |
| `icons/` | App icons (192×192 and 512×512 PNG) |
| `generate-icons.html` | Open in browser to generate and download icon PNGs |
| `docs/superpowers/specs/` | Design spec |
| `docs/superpowers/plans/` | Implementation plan |

## Architecture

`app.js` is a single ES module. State is two globals:
- `bonuses` — array of all BankBonus objects (loaded from IndexedDB on init)
- `expandedCardId` — id of currently expanded card, or null

Rendering is **full re-render on every change** — no virtual DOM. After any state mutation, call `render()` which rebuilds `#active-cards` and `#completed-cards` innerHTML.

**Event handling** uses delegation — one `click` listener on `#app` handles all card/button interactions via `data-action` attributes.

## Data Model

```js
BankBonus {
  id: string            // crypto.randomUUID()
  bankName: string
  accountType: string   // "personal_checking" | "personal_savings" | "business_checking"
  dateOpened: string    // YYYY-MM-DD
  bonusAmount: number
  bonusDeadline: string // YYYY-MM-DD
  accountCloseDate: string | ""
  minimumOpenLength: { value: number, unit: "months"|"weeks" } | null
  earlyTerminationFee: number | null  // only set when minimumOpenLength > 0
  minimumBalanceRequirement: number | null  // null = not set; 0 is valid
  notes: string
  requirements: Requirement[]
  directDepositDates: string[]  // YYYY-MM-DD
  status: "active" | "completed"
  createdAt: string     // ISO timestamp
}

Requirement {
  id: string
  type: "direct_deposit_total" | "direct_deposit_count" | "debit_transactions" | "minimum_balance"
  description: string
  targetAmount: number
  currentProgress: number
  perUnitMinimum: number | null
  completed: boolean    // manual checkbox, not auto-calculated
}
```

## Key Patterns

**Adding a new field to BankBonus:**
1. Add the field to the form in `index.html`
2. Pre-fill it in `openEditForm()` in `app.js`
3. Write it in the form submit handler in `app.js`
4. Display it in `renderExpandedContent()` in `app.js`

**Forcing a cache refresh on iPhone:**
- Close the PWA from app switcher and reopen
- Or delete the home screen app and re-add from Safari

**XSS protection:** All user-provided strings rendered into HTML must go through `escapeHtml()` (defined in `app.js`). Numbers and dates are safe to render directly.

**IndexedDB connection:** `db.js` caches the connection in `cachedDb` — only opens once per session.

## Gotchas

- **iOS date inputs:** `text-align: left` alone doesn't work on iOS Safari — also need `text-align-last: left` and `display: flex` on `input[type="date"]`
- **ES modules require a server:** Can't open `index.html` directly; must use HTTP
- **Service worker won't update on its own:** Must bump `CACHE_NAME` version to force old cache eviction
- **`minimumBalanceRequirement: 0` is valid** — use `!= null` checks, not falsy checks
- **Requirement `completed` is manual** — never auto-set it based on progress values
