# Bank Bonus Tracker PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first PWA for tracking bank account sign-up bonuses, deployed to GitHub Pages.

**Architecture:** Single-page vanilla HTML/CSS/JS app. Data persisted in IndexedDB via a thin wrapper (`db.js`). Service worker provides offline caching. No frameworks, no build tools. Mobile-first design targeting iPhone (375px).

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), IndexedDB, Service Worker API, Cache API

**Spec:** `docs/superpowers/specs/2026-04-05-bank-bonus-tracker-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Page shell, HTML structure, script/style loading |
| `style.css` | All styles — layout, cards, form, transitions, color coding |
| `db.js` | IndexedDB wrapper — open, getAll, getById, save, delete |
| `app.js` | App logic — rendering, events, card expand/collapse, form, progress tracking |
| `service-worker.js` | Offline caching of all app assets |
| `manifest.json` | PWA metadata — name, icons, display mode, theme color |
| `icons/icon-192.png` | PWA icon 192x192 |
| `icons/icon-512.png` | PWA icon 512x512 |

---

## Task 1: Project Scaffold — manifest.json, index.html, icons

**Files:**
- Create: `manifest.json`
- Create: `index.html`
- Create: `icons/icon-192.png` (placeholder SVG-based)
- Create: `icons/icon-512.png` (placeholder SVG-based)

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "Bank Bonus Tracker",
  "short_name": "BonusTracker",
  "description": "Track bank account sign-up bonuses offline",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007aff",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder icons**

Generate simple PNG icons using an inline SVG-to-canvas approach, or use a solid-color placeholder. For now, create minimal valid PNG files at both sizes. These can be replaced with proper icons later.

Use a simple script or online tool to generate a 192x192 and 512x512 PNG with a "$" symbol on a blue (#007aff) background.

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="BonusTracker">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="style.css">
  <title>Bank Bonus Tracker</title>
</head>
<body>
  <header class="app-header">
    <h1>Bank Bonus Tracker</h1>
    <button id="add-new-btn" class="btn-primary">+ Add New</button>
  </header>

  <main id="app">
    <section id="active-section">
      <h2 class="section-title">Active</h2>
      <div id="active-cards" class="card-list"></div>
      <p id="active-empty" class="empty-state" hidden>No active bonuses. Tap "+ Add New" to get started.</p>
    </section>

    <section id="completed-section" hidden>
      <button id="completed-toggle" class="section-toggle">
        <h2 class="section-title">Completed</h2>
        <span class="toggle-arrow">▼</span>
      </button>
      <div id="completed-cards" class="card-list"></div>
    </section>
  </main>

  <!-- Add/Edit Modal -->
  <div id="modal-overlay" class="modal-overlay" hidden>
    <div class="modal">
      <div class="modal-header">
        <h2 id="modal-title">Add New Bonus</h2>
        <button id="modal-close" class="btn-icon">&times;</button>
      </div>
      <form id="bonus-form" class="bonus-form">
        <label>
          Bank Name *
          <input type="text" id="f-bankName" required>
        </label>
        <label>
          Date Opened *
          <input type="date" id="f-dateOpened" required>
        </label>
        <label>
          Bonus Amount ($) *
          <input type="number" id="f-bonusAmount" min="0" step="1" required>
        </label>
        <label>
          Bonus Deadline *
          <input type="date" id="f-bonusDeadline" required>
        </label>
        <label>
          Account Close Date
          <input type="date" id="f-accountCloseDate">
        </label>

        <fieldset class="optional-fields">
          <legend>Optional Details</legend>
          <div class="open-length-row">
            <label>
              Min. Account Open Length
              <input type="number" id="f-openLengthValue" min="0" step="1" placeholder="0">
            </label>
            <label>
              Unit
              <select id="f-openLengthUnit">
                <option value="months">Months</option>
                <option value="weeks">Weeks</option>
              </select>
            </label>
          </div>
          <div id="etf-row" hidden>
            <label>
              Early Termination Fee ($)
              <input type="number" id="f-earlyTermFee" min="0" step="0.01">
            </label>
          </div>
          <label>
            Min. Balance Requirement ($)
            <input type="number" id="f-minBalance" min="0" step="0.01" placeholder="Leave blank if none">
          </label>
          <label>
            Notes
            <textarea id="f-notes" rows="3" placeholder="Any additional notes..."></textarea>
          </label>
        </fieldset>

        <fieldset class="requirements-fieldset">
          <legend>Requirements</legend>
          <div id="requirements-list"></div>
          <button type="button" id="add-requirement-btn" class="btn-secondary">+ Add Requirement</button>
        </fieldset>

        <div class="form-actions">
          <button type="button" id="form-cancel" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify scaffold loads**

Open `index.html` in a browser (can use a local dev server like `npx serve .` or VS Code Live Server). Verify:
- Page loads without errors in console
- Header shows "Bank Bonus Tracker" and "+ Add New" button
- "No active bonuses" empty state message is visible
- Manifest links are present (check DevTools > Application > Manifest)

- [ ] **Step 5: Commit**

```bash
git init
git add index.html manifest.json icons/
git commit -m "feat: project scaffold with index.html, manifest, and placeholder icons"
```

---

## Task 2: IndexedDB Wrapper — db.js

**Files:**
- Create: `db.js`

- [ ] **Step 1: Create db.js with database initialization**

```js
const DB_NAME = 'BankBonusTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'bonuses';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function save(bonus) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(bonus);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
```

- [ ] **Step 2: Verify db.js in browser console**

Serve the project locally (`npx serve .`). Open browser console and run:

```js
const db = await import('./db.js');

// Test save
await db.save({ id: 'test-1', bankName: 'Chase', bonusAmount: 300, requirements: [], status: 'active', createdAt: new Date().toISOString() });

// Test getAll
const all = await db.getAll();
console.log('getAll:', all); // Should show 1 item

// Test getById
const one = await db.getById('test-1');
console.log('getById:', one); // Should show the Chase item

// Test delete
await db.deleteById('test-1');
const afterDelete = await db.getAll();
console.log('after delete:', afterDelete); // Should be empty
```

Expected: All four operations work, console shows correct results, no errors.

- [ ] **Step 3: Commit**

```bash
git add db.js
git commit -m "feat: add IndexedDB wrapper with getAll, getById, save, deleteById"
```

---

## Task 3: CSS Styles — style.css

**Files:**
- Create: `style.css`

- [ ] **Step 1: Create style.css with base styles and CSS variables**

```css
/* === Reset & Variables === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-primary: #007aff;
  --color-primary-dark: #0056b3;
  --color-bg: #f2f2f7;
  --color-card: #ffffff;
  --color-text: #1c1c1e;
  --color-text-secondary: #8e8e93;
  --color-border: #e5e5ea;
  --color-danger: #ff3b30;
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-green: #34c759;
  --color-yellow: #ff9500;
  --color-red: #ff3b30;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

html {
  font-family: var(--font);
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  padding-bottom: env(safe-area-inset-bottom, 20px);
}
```

- [ ] **Step 2: Add header styles**

Append to `style.css`:

```css
/* === Header === */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header h1 {
  font-size: 20px;
  font-weight: 700;
}
```

- [ ] **Step 3: Add button styles**

Append to `style.css`:

```css
/* === Buttons === */
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  font-family: var(--font);
}

.btn-primary:active {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  font-family: var(--font);
}

.btn-icon {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  font-family: var(--font);
}
```

- [ ] **Step 4: Add card styles (collapsed and expanded)**

Append to `style.css`:

```css
/* === Sections === */
.section-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  padding: 16px 20px 8px;
}

.section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 20px 0 0;
  font-family: var(--font);
}

.toggle-arrow {
  font-size: 12px;
  color: var(--color-text-secondary);
  transition: transform 0.2s;
}

.toggle-arrow.collapsed {
  transform: rotate(-90deg);
}

.card-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 15px;
}

/* === Card (Collapsed) === */
.card {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  cursor: pointer;
  border-left: 4px solid var(--color-green);
  transition: box-shadow 0.2s;
}

.card:active {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.card.deadline-warning {
  border-left-color: var(--color-yellow);
}

.card.deadline-urgent {
  border-left-color: var(--color-red);
}

.card.completed-card {
  opacity: 0.6;
  border-left-color: var(--color-text-secondary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.card-bank-name {
  font-size: 17px;
  font-weight: 700;
}

.card-bonus-amount {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-success);
}

.card-deadline {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.card-requirements-summary {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.card-progress {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

/* === Card (Expanded) === */
.card-expanded-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s ease;
}

.card.expanded .card-expanded-content {
  max-height: 2000px;
}

.card.expanded {
  cursor: default;
}

.expanded-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 12px 0;
}

.card-close-btn {
  display: none;
}

.card.expanded .card-close-btn {
  display: flex;
}

.expanded-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
}

.detail-label {
  color: var(--color-text-secondary);
}

.detail-value {
  font-weight: 500;
}

.notes-block {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  margin-top: 4px;
  white-space: pre-wrap;
}
```

- [ ] **Step 5: Add requirement block and progress styles**

Append to `style.css`:

```css
/* === Requirement Blocks (Expanded Card) === */
.requirement-block {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.requirement-block.req-completed {
  opacity: 0.5;
}

.requirement-block.req-completed .req-description {
  text-decoration: line-through;
}

.req-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.req-description {
  font-size: 14px;
  font-weight: 600;
}

.req-checkbox {
  width: 22px;
  height: 22px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.req-progress-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.req-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.req-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 3px;
  outline: none;
}

.req-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
}

.req-slider-value {
  font-size: 14px;
  font-weight: 600;
  min-width: 80px;
  text-align: right;
  cursor: pointer;
  color: var(--color-primary);
}

.req-increment-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-increment {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-decrement {
  background: var(--color-text-secondary);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.req-balance-input {
  width: 120px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  font-family: var(--font);
}
```

- [ ] **Step 6: Add deposit dates, action buttons, and mark-complete styles**

Append to `style.css`:

```css
/* === Deposit Dates === */
.deposit-dates {
  margin-top: 8px;
}

.deposit-dates h4 {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.deposit-date-list {
  list-style: none;
  font-size: 13px;
  color: var(--color-text);
}

.deposit-date-list li {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.deposit-date-remove {
  color: var(--color-danger);
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-log-deposit {
  margin-top: 6px;
  font-size: 13px;
  padding: 8px 14px;
}

/* === Card Action Buttons === */
.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.card-actions button {
  flex: 1;
}

.btn-mark-complete {
  background: var(--color-success);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  margin-top: 12px;
  width: 100%;
  font-family: var(--font);
}

.btn-reactivate {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  margin-top: 12px;
  width: 100%;
  font-family: var(--font);
}
```

- [ ] **Step 7: Add modal and form styles**

Append to `style.css`:

```css
/* === Modal === */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}

.modal-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  background: var(--color-card);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.modal-overlay.visible .modal {
  transform: translateY(0);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
}

/* === Form === */
.bonus-form label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.bonus-form input,
.bonus-form select,
.bonus-form textarea {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  font-family: var(--font);
  margin-top: 4px;
  background: var(--color-card);
  color: var(--color-text);
}

.bonus-form input:focus,
.bonus-form select:focus,
.bonus-form textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
}

.bonus-form fieldset {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 12px;
  margin: 12px 0;
}

.bonus-form legend {
  font-size: 14px;
  font-weight: 700;
  padding: 0 6px;
}

.open-length-row {
  display: flex;
  gap: 10px;
}

.open-length-row label {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.form-actions button {
  flex: 1;
}

/* === Requirement form rows === */
.requirement-form-row {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  position: relative;
}

.requirement-form-row select,
.requirement-form-row input {
  margin-bottom: 8px;
}

.btn-remove-req {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 20px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 8: Verify styles load correctly**

Open in browser. Verify:
- Header is sticky with white background
- "+ Add New" button is blue, rounded
- Empty state text is centered and gray
- No console errors

- [ ] **Step 9: Commit**

```bash
git add style.css
git commit -m "feat: add complete CSS styles for cards, modal, form, and interactions"
```

---

## Task 4: App Logic Part 1 — Data Helpers and Card Rendering

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create app.js with imports, state, and utility functions**

```js
import { getAll, save, deleteById } from './db.js';

// === State ===
let bonuses = [];
let expandedCardId = null;
let editingBonusId = null;

// === DOM References ===
const activeCards = document.getElementById('active-cards');
const completedCards = document.getElementById('completed-cards');
const activeEmpty = document.getElementById('active-empty');
const completedSection = document.getElementById('completed-section');
const completedToggle = document.getElementById('completed-toggle');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const bonusForm = document.getElementById('bonus-form');
const addNewBtn = document.getElementById('add-new-btn');
const modalCloseBtn = document.getElementById('modal-close');
const formCancel = document.getElementById('form-cancel');
const requirementsList = document.getElementById('requirements-list');
const addRequirementBtn = document.getElementById('add-requirement-btn');
const openLengthInput = document.getElementById('f-openLengthValue');
const etfRow = document.getElementById('etf-row');

// === Utility Functions ===
function generateId() {
  return crypto.randomUUID();
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function deadlineClass(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 7) return 'deadline-urgent';
  if (days <= 30) return 'deadline-warning';
  return '';
}

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function requirementSummary(req) {
  switch (req.type) {
    case 'direct_deposit_total':
      return `${formatCurrency(req.currentProgress)}/${formatCurrency(req.targetAmount)} DD`;
    case 'direct_deposit_count':
      return `${req.currentProgress}/${req.targetAmount}` +
        (req.perUnitMinimum ? ` $${req.perUnitMinimum} deposits` : ' deposits');
    case 'debit_transactions':
      return `${req.currentProgress}/${req.targetAmount} debit txns`;
    case 'minimum_balance':
      return `${formatCurrency(req.currentProgress)}/${formatCurrency(req.targetAmount)} balance`;
    default:
      return req.description;
  }
}
```

- [ ] **Step 2: Add collapsed card rendering function**

Append to `app.js`:

```js
// === Card Rendering ===
function renderCollapsedCard(bonus) {
  const dlClass = bonus.status === 'completed' ? 'completed-card' : deadlineClass(bonus.bonusDeadline);
  const completedReqs = bonus.requirements.filter(r => r.completed).length;
  const totalReqs = bonus.requirements.length;
  const reqsSummary = bonus.requirements.map(requirementSummary).join(' | ');
  const daysLeft = daysUntil(bonus.bonusDeadline);
  const deadlineText = bonus.status === 'completed'
    ? 'Completed'
    : daysLeft < 0
      ? `${Math.abs(daysLeft)} days overdue`
      : `${daysLeft} days left`;

  return `
    <div class="card ${dlClass} ${bonus.id === expandedCardId ? 'expanded' : ''}"
         data-id="${bonus.id}">
      <div class="card-collapsed" data-action="expand">
        <div class="card-header">
          <span class="card-bank-name">${bonus.bankName}</span>
          <span class="card-bonus-amount">${formatCurrency(bonus.bonusAmount)}</span>
        </div>
        <div class="card-deadline">${deadlineText} — ${formatDate(bonus.bonusDeadline)}</div>
        <div class="card-requirements-summary">${reqsSummary || 'No requirements'}</div>
        <div class="card-progress">${completedReqs}/${totalReqs} requirements met</div>
      </div>
      <div class="card-expanded-content">
        ${bonus.id === expandedCardId ? renderExpandedContent(bonus) : ''}
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: Add main render function**

Append to `app.js`:

```js
function render() {
  const active = bonuses.filter(b => b.status === 'active');
  const completed = bonuses.filter(b => b.status === 'completed');

  activeCards.innerHTML = active.map(renderCollapsedCard).join('');
  activeEmpty.hidden = active.length > 0;

  if (completed.length > 0) {
    completedSection.hidden = false;
    completedCards.innerHTML = completed.map(renderCollapsedCard).join('');
  } else {
    completedSection.hidden = true;
  }
}
```

- [ ] **Step 4: Add app initialization**

Append to `app.js`:

```js
// === Init ===
async function init() {
  bonuses = await getAll();
  render();
}

init();
```

- [ ] **Step 5: Verify card rendering with test data**

In browser console, add test data and reload:

```js
const db = await import('./db.js');
await db.save({
  id: 'test-1',
  bankName: 'Chase Sapphire',
  dateOpened: '2026-03-01',
  bonusAmount: 300,
  bonusDeadline: '2026-06-01',
  accountCloseDate: '',
  minimumOpenLength: null,
  earlyTerminationFee: null,
  minimumBalanceRequirement: null,
  notes: '',
  requirements: [
    { id: 'r1', type: 'direct_deposit_total', description: '$4,000 in direct deposits', targetAmount: 4000, currentProgress: 2000, perUnitMinimum: null, completed: false },
    { id: 'r2', type: 'debit_transactions', description: '10 debit purchases', targetAmount: 10, currentProgress: 3, perUnitMinimum: null, completed: false }
  ],
  directDepositDates: ['2026-03-15'],
  status: 'active',
  createdAt: new Date().toISOString()
});
```

Reload page. Verify:
- Card shows "Chase Sapphire", "$300", deadline info
- Requirements summary: "$2,000/$4,000 DD | 3/10 debit txns"
- Progress: "0/2 requirements met"
- Green left border (deadline is 57 days away)

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: add app.js with data helpers, card rendering, and initialization"
```

---

## Task 5: App Logic Part 2 — Expanded Card Content

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add renderExpandedContent function**

Add this function in `app.js` above `renderCollapsedCard`:

```js
function renderExpandedContent(bonus) {
  const allCompleted = bonus.requirements.length > 0 && bonus.requirements.every(r => r.completed);

  let detailsHtml = `
    <hr class="expanded-divider">
    <div class="expanded-details">
      <div class="detail-row">
        <span class="detail-label">Date Opened</span>
        <span class="detail-value">${formatDate(bonus.dateOpened)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bonus Amount</span>
        <span class="detail-value">${formatCurrency(bonus.bonusAmount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Deadline</span>
        <span class="detail-value">${formatDate(bonus.bonusDeadline)}</span>
      </div>`;

  if (bonus.accountCloseDate) {
    detailsHtml += `
      <div class="detail-row">
        <span class="detail-label">Account Close Date</span>
        <span class="detail-value">${formatDate(bonus.accountCloseDate)}</span>
      </div>`;
  }

  if (bonus.minimumOpenLength && bonus.minimumOpenLength.value > 0) {
    detailsHtml += `
      <div class="detail-row">
        <span class="detail-label">Min. Open Length</span>
        <span class="detail-value">${bonus.minimumOpenLength.value} ${bonus.minimumOpenLength.unit}</span>
      </div>`;
    if (bonus.earlyTerminationFee != null) {
      detailsHtml += `
        <div class="detail-row">
          <span class="detail-label">Early Termination Fee</span>
          <span class="detail-value">${formatCurrency(bonus.earlyTerminationFee)}</span>
        </div>`;
    }
  }

  if (bonus.minimumBalanceRequirement != null) {
    detailsHtml += `
      <div class="detail-row">
        <span class="detail-label">Min. Balance Req.</span>
        <span class="detail-value">${formatCurrency(bonus.minimumBalanceRequirement)}</span>
      </div>`;
  }

  detailsHtml += '</div>';

  if (bonus.notes) {
    detailsHtml += `
      <div class="notes-block">${bonus.notes}</div>`;
  }

  // Requirements
  detailsHtml += bonus.requirements.map(req => renderRequirementBlock(req, bonus.id)).join('');

  // Direct Deposit Dates
  detailsHtml += renderDepositDates(bonus);

  // Mark Complete / Reactivate button
  if (bonus.status === 'active' && allCompleted) {
    detailsHtml += `
      <button class="btn-mark-complete" data-action="mark-complete" data-id="${bonus.id}">
        Mark Complete
      </button>`;
  } else if (bonus.status === 'completed') {
    detailsHtml += `
      <button class="btn-reactivate" data-action="reactivate" data-id="${bonus.id}">
        Move Back to Active
      </button>`;
  }

  // Edit / Delete buttons
  detailsHtml += `
    <div class="card-actions">
      <button class="btn-secondary" data-action="edit" data-id="${bonus.id}">Edit</button>
      <button class="btn-danger" data-action="delete" data-id="${bonus.id}">Delete</button>
    </div>`;

  // Close button at top-right
  detailsHtml = `
    <button class="btn-icon card-close-btn" data-action="close" style="position:absolute;top:8px;right:8px;">&times;</button>
  ` + detailsHtml;

  return detailsHtml;
}
```

- [ ] **Step 2: Add renderRequirementBlock function**

Add above `renderExpandedContent`:

```js
function renderRequirementBlock(req, bonusId) {
  const completedClass = req.completed ? 'req-completed' : '';
  let progressHtml = '';

  switch (req.type) {
    case 'direct_deposit_total':
      progressHtml = `
        <div class="req-progress-text">${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}</div>
        <div class="req-slider-row">
          <input type="range" class="req-slider" min="0" max="${req.targetAmount}" step="1"
                 value="${req.currentProgress}"
                 data-action="slider-change" data-bonus-id="${bonusId}" data-req-id="${req.id}">
          <span class="req-slider-value" data-action="slider-tap"
                data-bonus-id="${bonusId}" data-req-id="${req.id}">
            ${formatCurrency(req.currentProgress)}
          </span>
        </div>`;
      break;

    case 'direct_deposit_count':
    case 'debit_transactions':
      progressHtml = `
        <div class="req-progress-text">${req.currentProgress} / ${req.targetAmount}${
          req.type === 'direct_deposit_count' && req.perUnitMinimum
            ? ` ($${req.perUnitMinimum}+ each)`
            : req.type === 'debit_transactions' ? ' transactions' : ' deposits'
        }</div>
        <div class="req-increment-row">
          <button class="btn-decrement" data-action="decrement" data-bonus-id="${bonusId}" data-req-id="${req.id}">−</button>
          <span>${req.currentProgress}</span>
          <button class="btn-increment" data-action="increment" data-bonus-id="${bonusId}" data-req-id="${req.id}">+</button>
        </div>`;
      break;

    case 'minimum_balance':
      progressHtml = `
        <div class="req-progress-text">${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}</div>
        <input type="number" class="req-balance-input" value="${req.currentProgress}" min="0" step="0.01"
               data-action="balance-change" data-bonus-id="${bonusId}" data-req-id="${req.id}"
               placeholder="Current balance">`;
      break;
  }

  return `
    <div class="requirement-block ${completedClass}">
      <div class="req-header">
        <span class="req-description">${req.description}</span>
        <input type="checkbox" class="req-checkbox" ${req.completed ? 'checked' : ''}
               data-action="toggle-req" data-bonus-id="${bonusId}" data-req-id="${req.id}">
      </div>
      ${progressHtml}
    </div>`;
}
```

- [ ] **Step 3: Add renderDepositDates function**

Add above `renderExpandedContent`:

```js
function renderDepositDates(bonus) {
  const sorted = [...bonus.directDepositDates].sort();
  return `
    <div class="deposit-dates">
      <h4>Direct Deposit Dates</h4>
      ${sorted.length > 0 ? `
        <ul class="deposit-date-list">
          ${sorted.map((d, i) => `
            <li>
              <span>${formatDate(d)}</span>
              <button class="deposit-date-remove" data-action="remove-deposit-date"
                      data-bonus-id="${bonus.id}" data-index="${i}">&times;</button>
            </li>
          `).join('')}
        </ul>
      ` : '<p style="font-size:13px;color:var(--color-text-secondary)">None logged yet</p>'}
      <button class="btn-secondary btn-log-deposit" data-action="log-deposit" data-id="${bonus.id}">
        + Log Deposit Date
      </button>
    </div>`;
}
```

- [ ] **Step 4: Update card HTML to use position relative for close button**

In `renderCollapsedCard`, update the outer card div to include `style="position:relative;"`:

Change the card opening tag in `renderCollapsedCard` to:
```js
    <div class="card ${dlClass} ${bonus.id === expandedCardId ? 'expanded' : ''}"
         data-id="${bonus.id}" style="position:relative;">
```

- [ ] **Step 5: Verify expanded card renders**

In browser console:
```js
// Manually set expandedCardId and re-render
import('./app.js').then(() => {
  // The test card from Task 4 should be expandable by clicking
});
```

Actually, clicking won't work yet (event handlers are in the next task). For now, temporarily set `expandedCardId = 'test-1'` in `init()` before `render()`, reload, and verify the expanded content renders correctly. Then remove the temporary line.

Verify:
- Expanded card shows all detail rows
- Requirement blocks render with correct progress inputs (slider for DD total, +/- for debit txns)
- Deposit dates section shows with "Log Deposit Date" button
- Edit and Delete buttons appear

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: add expanded card rendering with requirements, deposits, and action buttons"
```

---

## Task 6: App Logic Part 3 — Event Handlers (Expand/Collapse, Progress, Actions)

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add card click delegation for expand/collapse**

Append to `app.js` (before `init()`):

```js
// === Event Delegation ===
document.getElementById('app').addEventListener('click', async (e) => {
  const target = e.target;
  const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;
  const bonusId = target.dataset.id || target.dataset.bonusId ||
                  target.closest('[data-id]')?.dataset.id ||
                  target.closest('[data-bonus-id]')?.dataset.bonusId;

  if (!action && target.closest('.card-collapsed')) {
    // Clicking collapsed area of a card — expand it
    const card = target.closest('.card');
    const id = card?.dataset.id;
    if (id && id !== expandedCardId) {
      expandedCardId = id;
      render();
    }
    return;
  }

  if (action === 'close') {
    expandedCardId = null;
    render();
    return;
  }

  if (action === 'expand') {
    const card = target.closest('.card');
    const id = card?.dataset.id;
    if (id && id !== expandedCardId) {
      expandedCardId = id;
      render();
    }
    return;
  }

  if (action === 'mark-complete') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      bonus.status = 'completed';
      await save(bonus);
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'reactivate') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      bonus.status = 'active';
      await save(bonus);
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'delete') {
    if (confirm('Are you sure you want to delete this bonus? This cannot be undone.')) {
      await deleteById(bonusId);
      bonuses = bonuses.filter(b => b.id !== bonusId);
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'edit') {
    openEditForm(bonusId);
    return;
  }

  if (action === 'increment') {
    const reqId = target.dataset.reqId || target.closest('[data-req-id]')?.dataset.reqId;
    const bId = target.dataset.bonusId || target.closest('[data-bonus-id]')?.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req && req.currentProgress < req.targetAmount) {
      req.currentProgress++;
      await save(bonus);
      render();
    }
    return;
  }

  if (action === 'decrement') {
    const reqId = target.dataset.reqId || target.closest('[data-req-id]')?.dataset.reqId;
    const bId = target.dataset.bonusId || target.closest('[data-bonus-id]')?.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req && req.currentProgress > 0) {
      req.currentProgress--;
      await save(bonus);
      render();
    }
    return;
  }

  if (action === 'slider-tap') {
    const reqId = target.dataset.reqId;
    const bId = target.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      const val = prompt(`Enter exact amount (0 - ${req.targetAmount}):`, req.currentProgress);
      if (val !== null) {
        const num = Math.max(0, Math.min(req.targetAmount, Number(val)));
        if (!isNaN(num)) {
          req.currentProgress = num;
          await save(bonus);
          render();
        }
      }
    }
    return;
  }

  if (action === 'toggle-req') {
    const reqId = target.dataset.reqId;
    const bId = target.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      req.completed = target.checked;
      await save(bonus);
      render();
    }
    return;
  }

  if (action === 'log-deposit') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      const today = new Date().toISOString().split('T')[0];
      const date = prompt('Deposit date:', today);
      if (date) {
        bonus.directDepositDates.push(date);
        await save(bonus);
        render();
      }
    }
    return;
  }

  if (action === 'remove-deposit-date') {
    const bId = target.dataset.bonusId;
    const index = Number(target.dataset.index);
    const bonus = bonuses.find(b => b.id === bId);
    if (bonus) {
      const sorted = [...bonus.directDepositDates].sort();
      const dateToRemove = sorted[index];
      const origIndex = bonus.directDepositDates.indexOf(dateToRemove);
      if (origIndex > -1) {
        bonus.directDepositDates.splice(origIndex, 1);
        await save(bonus);
        render();
      }
    }
    return;
  }
});
```

- [ ] **Step 2: Add slider input handler (uses input event, not click)**

Append to `app.js` (before `init()`):

```js
document.getElementById('app').addEventListener('input', async (e) => {
  const target = e.target;

  if (target.dataset.action === 'slider-change') {
    const bId = target.dataset.bonusId;
    const reqId = target.dataset.reqId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      req.currentProgress = Number(target.value);
      // Update the display text without full re-render
      const valueSpan = target.nextElementSibling;
      if (valueSpan) valueSpan.textContent = formatCurrency(req.currentProgress);
      // Update the progress text above
      const block = target.closest('.requirement-block');
      const progressText = block?.querySelector('.req-progress-text');
      if (progressText) progressText.textContent = `${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}`;
    }
    return;
  }

  if (target.dataset.action === 'balance-change') {
    const bId = target.dataset.bonusId;
    const reqId = target.dataset.reqId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      req.currentProgress = Number(target.value) || 0;
      const block = target.closest('.requirement-block');
      const progressText = block?.querySelector('.req-progress-text');
      if (progressText) progressText.textContent = `${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}`;
    }
    return;
  }
});

// Save on slider release (not on every input event)
document.getElementById('app').addEventListener('change', async (e) => {
  const target = e.target;
  if (target.dataset.action === 'slider-change' || target.dataset.action === 'balance-change') {
    const bId = target.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    if (bonus) {
      await save(bonus);
      render();
    }
  }
});
```

- [ ] **Step 3: Add completed section toggle**

Append to `app.js` (before `init()`):

```js
completedToggle.addEventListener('click', () => {
  const arrow = completedToggle.querySelector('.toggle-arrow');
  const cards = document.getElementById('completed-cards');
  arrow.classList.toggle('collapsed');
  cards.hidden = !cards.hidden;
});
```

- [ ] **Step 4: Verify interactions**

Reload browser with the test data from Task 4. Verify:
- Clicking a collapsed card expands it (shows full details)
- Clicking X button closes the expanded card
- Clicking a different card closes the first and opens the second
- Clicking the expanded area does NOT close the card
- Slider changes the DD total progress in real-time
- +/- buttons increment/decrement debit transactions
- Checkbox toggles requirement completion (strikethrough styling)
- "Mark Complete" button appears when all requirements are checked
- "Log Deposit Date" prompts for a date and adds it to the list
- Delete shows confirmation dialog
- Completed section toggle collapses/expands

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: add event handlers for expand/collapse, progress tracking, and card actions"
```

---

## Task 7: App Logic Part 4 — Add/Edit Form

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add modal open/close functions**

Append to `app.js` (before `init()`):

```js
// === Modal ===
function openModal() {
  modalOverlay.hidden = false;
  // Trigger reflow for transition
  modalOverlay.offsetHeight;
  modalOverlay.classList.add('visible');
}

function closeModal() {
  modalOverlay.classList.remove('visible');
  setTimeout(() => {
    modalOverlay.hidden = true;
    bonusForm.reset();
    requirementsList.innerHTML = '';
    editingBonusId = null;
  }, 300);
}

modalCloseBtn.addEventListener('click', closeModal);
formCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
```

- [ ] **Step 2: Add requirement form row builder**

Append to `app.js`:

```js
function addRequirementRow(existing = null) {
  const row = document.createElement('div');
  row.className = 'requirement-form-row';
  const reqId = existing?.id || generateId();

  row.innerHTML = `
    <button type="button" class="btn-remove-req" data-action="remove-req-row">&times;</button>
    <input type="hidden" name="req-id" value="${reqId}">
    <label>
      Type
      <select name="req-type" required>
        <option value="direct_deposit_total" ${existing?.type === 'direct_deposit_total' ? 'selected' : ''}>Direct Deposit (Total $)</option>
        <option value="direct_deposit_count" ${existing?.type === 'direct_deposit_count' ? 'selected' : ''}>Direct Deposit (Count)</option>
        <option value="debit_transactions" ${existing?.type === 'debit_transactions' ? 'selected' : ''}>Debit Transactions</option>
        <option value="minimum_balance" ${existing?.type === 'minimum_balance' ? 'selected' : ''}>Minimum Balance</option>
      </select>
    </label>
    <label>
      Description
      <input type="text" name="req-description" required placeholder="e.g. $4,000 in direct deposits"
             value="${existing?.description || ''}">
    </label>
    <label>
      Target Amount
      <input type="number" name="req-target" min="0" step="1" required placeholder="e.g. 4000"
             value="${existing?.targetAmount || ''}">
    </label>
    <label>
      Min. Per Unit ($) <small>(optional, e.g. $500 per deposit)</small>
      <input type="number" name="req-perUnit" min="0" step="1" placeholder="Leave blank if N/A"
             value="${existing?.perUnitMinimum || ''}">
    </label>
  `;

  row.querySelector('.btn-remove-req').addEventListener('click', () => row.remove());
  requirementsList.appendChild(row);
}

addRequirementBtn.addEventListener('click', () => addRequirementRow());
```

- [ ] **Step 3: Add early termination fee toggle**

Append to `app.js`:

```js
openLengthInput.addEventListener('input', () => {
  const val = Number(openLengthInput.value);
  etfRow.hidden = !(val > 0);
});
```

- [ ] **Step 4: Add "Add New" button handler**

Append to `app.js`:

```js
addNewBtn.addEventListener('click', () => {
  editingBonusId = null;
  modalTitle.textContent = 'Add New Bonus';
  bonusForm.reset();
  requirementsList.innerHTML = '';
  etfRow.hidden = true;
  openModal();
});
```

- [ ] **Step 5: Add openEditForm function**

Append to `app.js`:

```js
function openEditForm(bonusId) {
  const bonus = bonuses.find(b => b.id === bonusId);
  if (!bonus) return;

  editingBonusId = bonusId;
  modalTitle.textContent = 'Edit Bonus';

  document.getElementById('f-bankName').value = bonus.bankName;
  document.getElementById('f-dateOpened').value = bonus.dateOpened;
  document.getElementById('f-bonusAmount').value = bonus.bonusAmount;
  document.getElementById('f-bonusDeadline').value = bonus.bonusDeadline;
  document.getElementById('f-accountCloseDate').value = bonus.accountCloseDate || '';
  document.getElementById('f-notes').value = bonus.notes || '';

  if (bonus.minimumOpenLength) {
    openLengthInput.value = bonus.minimumOpenLength.value;
    document.getElementById('f-openLengthUnit').value = bonus.minimumOpenLength.unit;
    if (bonus.minimumOpenLength.value > 0) {
      etfRow.hidden = false;
      document.getElementById('f-earlyTermFee').value = bonus.earlyTerminationFee || '';
    }
  } else {
    openLengthInput.value = '';
    etfRow.hidden = true;
  }

  if (bonus.minimumBalanceRequirement != null) {
    document.getElementById('f-minBalance').value = bonus.minimumBalanceRequirement;
  } else {
    document.getElementById('f-minBalance').value = '';
  }

  requirementsList.innerHTML = '';
  bonus.requirements.forEach(req => addRequirementRow(req));

  openModal();
}
```

- [ ] **Step 6: Add form submission handler**

Append to `app.js`:

```js
bonusForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const openLenVal = Number(openLengthInput.value) || 0;
  const openLenUnit = document.getElementById('f-openLengthUnit').value;
  const minBalInput = document.getElementById('f-minBalance').value;

  // Gather requirements from form rows
  const reqRows = requirementsList.querySelectorAll('.requirement-form-row');
  const requirements = Array.from(reqRows).map(row => {
    const existingId = row.querySelector('[name="req-id"]').value;
    const type = row.querySelector('[name="req-type"]').value;
    const description = row.querySelector('[name="req-description"]').value;
    const targetAmount = Number(row.querySelector('[name="req-target"]').value);
    const perUnit = row.querySelector('[name="req-perUnit"]').value;

    // Preserve existing progress if editing
    let currentProgress = 0;
    if (editingBonusId) {
      const existingBonus = bonuses.find(b => b.id === editingBonusId);
      const existingReq = existingBonus?.requirements.find(r => r.id === existingId);
      if (existingReq) {
        currentProgress = existingReq.currentProgress;
      }
    }

    return {
      id: existingId,
      type,
      description,
      targetAmount,
      currentProgress,
      perUnitMinimum: perUnit ? Number(perUnit) : null,
      completed: false
    };
  });

  // Also preserve completed status on edit
  if (editingBonusId) {
    const existingBonus = bonuses.find(b => b.id === editingBonusId);
    requirements.forEach(req => {
      const existingReq = existingBonus?.requirements.find(r => r.id === req.id);
      if (existingReq) {
        req.completed = existingReq.completed;
      }
    });
  }

  const bonus = {
    id: editingBonusId || generateId(),
    bankName: document.getElementById('f-bankName').value.trim(),
    dateOpened: document.getElementById('f-dateOpened').value,
    bonusAmount: Number(document.getElementById('f-bonusAmount').value),
    bonusDeadline: document.getElementById('f-bonusDeadline').value,
    accountCloseDate: document.getElementById('f-accountCloseDate').value || '',
    minimumOpenLength: openLenVal > 0 ? { value: openLenVal, unit: openLenUnit } : null,
    earlyTerminationFee: openLenVal > 0 ? (Number(document.getElementById('f-earlyTermFee').value) || null) : null,
    minimumBalanceRequirement: minBalInput !== '' ? Number(minBalInput) : null,
    notes: document.getElementById('f-notes').value.trim(),
    requirements,
    directDepositDates: editingBonusId
      ? (bonuses.find(b => b.id === editingBonusId)?.directDepositDates || [])
      : [],
    status: editingBonusId
      ? (bonuses.find(b => b.id === editingBonusId)?.status || 'active')
      : 'active',
    createdAt: editingBonusId
      ? (bonuses.find(b => b.id === editingBonusId)?.createdAt || new Date().toISOString())
      : new Date().toISOString()
  };

  await save(bonus);

  // Update local state
  const existingIndex = bonuses.findIndex(b => b.id === bonus.id);
  if (existingIndex >= 0) {
    bonuses[existingIndex] = bonus;
  } else {
    bonuses.push(bonus);
  }

  closeModal();
  expandedCardId = null;
  render();
});
```

- [ ] **Step 7: Verify form works end-to-end**

Reload browser. Verify:
- Click "+ Add New" — modal slides up from bottom
- Fill out bank name, dates, bonus amount
- Set min open length to 6 months — early termination fee field appears
- Add 2 requirements (one DD total, one debit transactions)
- Click Save — modal closes, new card appears in Active section
- Click card to expand — all info is correct
- Click Edit — form pre-fills with existing data, requirements are populated
- Modify something and save — changes persist
- Reload page — data persists (IndexedDB)

- [ ] **Step 8: Clean up test data**

In browser console:
```js
const db = await import('./db.js');
await db.deleteById('test-1');
```

- [ ] **Step 9: Commit**

```bash
git add app.js
git commit -m "feat: add add/edit form with modal, dynamic requirements, and form submission"
```

---

## Task 8: Service Worker — Offline Caching

**Files:**
- Create: `service-worker.js`
- Modify: `app.js` (add SW registration)

- [ ] **Step 1: Create service-worker.js**

```js
const CACHE_NAME = 'bonus-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install — cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first strategy
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Return cached, but update in background
        fetch(e.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request);
    })
  );
});
```

- [ ] **Step 2: Add service worker registration to app.js**

Add at the very end of `app.js`:

```js
// === Service Worker Registration ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW registration failed:', err));
}
```

- [ ] **Step 3: Verify service worker**

Serve the project locally (must be localhost or HTTPS). In browser DevTools:
1. Application > Service Workers — verify SW is registered and active
2. Application > Cache Storage — verify `bonus-tracker-v1` cache contains all assets
3. Network tab > check "Offline" — reload page — verify app still loads
4. Create a bonus while offline — verify it saves and appears
5. Uncheck "Offline" — verify app still works

- [ ] **Step 4: Commit**

```bash
git add service-worker.js app.js
git commit -m "feat: add service worker for offline caching with cache-first strategy"
```

---

## Task 9: Final Integration and Verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Full end-to-end test — add a bonus**

Serve the project. Walk through the complete flow:
1. Open app — see empty state
2. Click "+ Add New"
3. Fill in: Bank Name "Wells Fargo", Date Opened today, Bonus $300, Deadline 90 days from now
4. Set Min Open Length to 6 months, Early Term Fee $25
5. Set Min Balance to $0
6. Add notes: "Use for groceries DD"
7. Add requirement: Direct Deposit Total, "$4,000 in direct deposits", target 4000
8. Add requirement: Debit Transactions, "10 debit card purchases", target 10
9. Save — card appears with correct summary

- [ ] **Step 2: Test progress tracking**

1. Expand the card
2. Drag DD slider to ~$2,000 — verify display updates in real-time
3. Tap the dollar value — enter exact amount $2,500 — verify it updates
4. Click +1 on debit transactions 3 times — verify "3/10"
5. Click -1 once — verify "2/10"
6. Check the DD requirement checkbox — verify strikethrough
7. Log a deposit date — verify it appears in the list

- [ ] **Step 3: Test completion flow**

1. Check all requirement checkboxes — "Mark Complete" button should appear
2. Tap "Mark Complete" — card moves to Completed section
3. Expand completed card — "Move Back to Active" button visible
4. Tap it — card moves back to Active

- [ ] **Step 4: Test edit and delete**

1. Expand a card, click Edit — form opens with pre-filled data
2. Change the bank name, save — card updates
3. Expand card, click Delete — confirm — card is removed

- [ ] **Step 5: Test deadline color coding**

Create 3 bonuses with deadlines:
- 5 days from now — should have red border
- 15 days from now — should have yellow border
- 60 days from now — should have green border

- [ ] **Step 6: Test offline mode**

1. In DevTools, go offline
2. Reload page — should load from cache
3. Add a new bonus — should save to IndexedDB
4. Reload again — new bonus persists

- [ ] **Step 7: Test on mobile viewport**

Use DevTools device toolbar, set to iPhone 12/13 (390x844). Verify:
- Cards are properly sized, text is readable
- Touch targets are large enough (44px+)
- Modal slides up and is scrollable
- Slider is usable with touch

- [ ] **Step 8: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final integration fixes from end-to-end testing"
```

Only commit if there were changes to make. If everything passed, skip this step.

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffold | `index.html`, `manifest.json`, `icons/` |
| 2 | IndexedDB wrapper | `db.js` |
| 3 | CSS styles | `style.css` |
| 4 | Card rendering + init | `app.js` |
| 5 | Expanded card content | `app.js` |
| 6 | Event handlers | `app.js` |
| 7 | Add/Edit form | `app.js` |
| 8 | Service worker | `service-worker.js`, `app.js` |
| 9 | Integration testing | (verification only) |
