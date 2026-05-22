# PWA Update Detection & Data Persistence

**Date:** 2026-05-22

## Problem

Data was being lost because iOS wipes all PWA storage (IndexedDB, localStorage, everything) when a home screen icon is removed. The user was removing and re-adding the icon to force app updates to appear, because the existing service worker had no mechanism to notify the app that a new version was ready. Seeing stale content, they assumed re-adding the icon was required — and lost their data each time.

## Root Cause

The service worker called `skipWaiting()` in the `install` handler (activating immediately) and `clients.claim()` in `activate` (taking control of the page). However, nothing in the app listened for the resulting `controllerchange` event to reload the page. So users saw old cached content even after a new SW was fully active.

## Solution

Two changes:

### 1. User-initiated update flow

Move `skipWaiting()` from the SW `install` handler to a `message` listener that fires only when the app sends `{ type: 'SKIP_WAITING' }`. This prevents mid-session surprise activations.

In `app.js`, after registering the SW:
- If `registration.waiting` already exists on load (update deployed while app was closed), show the update banner immediately.
- Listen for `updatefound` → `statechange === 'installed'` to catch updates that arrive during the current session.
- Listen for `controllerchange` on `navigator.serviceWorker` and call `location.reload()`.

The banner reads "Update available — tap to refresh". Tapping the message sends `SKIP_WAITING` to the waiting SW, which activates it, fires `controllerchange`, and reloads. Tapping × dismisses the banner without updating.

### 2. iOS Web Share export

On iOS Safari, `navigator.share({ files })` opens the native share sheet, allowing users to save the JSON backup directly to Files/iCloud Drive in one tap. The existing export function checks `navigator.canShare()` first and falls back to the old anchor-click download on unsupported browsers (desktop, Firefox).

## Files Changed

| File | Change |
|------|--------|
| `service-worker.js` | Bump cache to `v4`, remove `skipWaiting()` from install, add `message` listener |
| `app.js` | New `showUpdateBanner()`, update detection logic, `controllerchange` reload, upgraded `handleExport()` |
| `style.css` | ~30 lines for `.update-banner` fixed-position component |

## Key Invariants

- `controllerchange` reload only fires when an actual new SW activates — not on every page load.
- `showUpdateBanner` only shows when `navigator.serviceWorker.controller` exists (skips first install).
- `navigator.canShare()` check prevents errors on desktop.
- Existing import format is unchanged.
