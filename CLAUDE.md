# DarkReaderLocal

## Overview
Debloated fork of Dark Reader (v4.9.123) with Catppuccin Mocha theme and redesigned UI. No ads, no telemetry. Remote config fetching is opt-in and transparent — auto-fetches once on first install from Dark Reader's GitHub, then only manually via Settings > Advanced.

## Tech Stack
- TypeScript + Malevic.js (lightweight virtual DOM with JSX)
- Chrome MV3 extension (service worker background, MAIN + ISOLATED world content scripts)
- Rollup bundler with LESS for styles
- Build: `npm run build` (output: `build/release/chrome-mv3/`)

## Architecture

### Config System
- **Local configs**: Bundled in `src/config/` (~776KB total, `dynamic-theme-fixes.config` is the largest at 689KB)
- **Remote configs**: Fetched from `https://raw.githubusercontent.com/darkreader/darkreader/main/src/config/`
- **Config Manager** (`src/background/config-manager.ts`): Handles storage, caching, per-config toggles, diff computation, and metadata tracking via `chrome.storage.local`
- **Storage keys**: `remoteConfigs` (cached config text), `remoteConfigMeta` (timestamps, source tags, enabled toggles)
- CSP allows only `connect-src https://raw.githubusercontent.com` — no other outbound connections

### Message Passing
- UI-to-BG messages defined in `src/utils/message.ts` (`MessageTypeUItoBG` enum)
- Adapter pattern: `ExtensionAdapter` interface in `src/background/messenger.ts`, implemented in `Extension.getMessengerAdapter()` in `src/background/extension.ts`
- Connector: `src/ui/connect/connector.ts` implements `ExtensionActions` for UI components
- Custom messages: `FETCH_REMOTE_CONFIG`, `GET_CONFIG_STATUS`, `SET_ENABLED_CONFIGS`

### UI Structure
- **Popup**: `src/ui/popup/` — main extension popup with site toggle, theme controls, automation
- **Options**: `src/ui/options/` — tabbed settings page (General, Automation, Site List, Hotkeys, Advanced, About)
- **Advanced tab**: `src/ui/options/advanced/` — fetch remote config, report broken site, import/export, dev tools
- **DevTools**: `src/ui/devtools/` — per-site CSS fix editor (opens as popup window)
- **Controls**: `src/ui/controls/` — reusable Malevic components (Button, CheckBox, Toggle, etc.)

### Rendering Engine
- Core engine in `src/inject/dynamic-theme/` — **unmodified from upstream Dark Reader**
- CSS processing pipeline: fetch (via `bgFetch`) -> parse (`iterateCSSRules`) -> modify (`stylesheet-modifier.ts`) -> inject
- Caching: `src/inject/cache.ts` — sessionStorage-based CSS fetch cache with 30-min TTL, image details cache with 1s debounce
- Content script injection: `document_start` timing, `all_frames: true`, MAIN world proxy + ISOLATED world theme engine

### Key Files
- `src/definitions.d.ts` — All TypeScript interfaces (`UserSettings`, `ExtensionData`, `ExtensionActions`, `ConfigDiffResult`, `ConfigStatusData`)
- `src/defaults.ts` — Default settings values
- `src/background/extension.ts` — Main extension lifecycle, adapter wiring
- `src/background/user-storage.ts` — Settings persistence (chrome.storage.local + sync)
- `src/background/tab-manager.ts` — Tab/frame lifecycle and content script registration
- `src/utils/csp.ts` — CSP policy generation for MV3 manifest

## Build Commands
- `npm run build` — Production build (release)
- `npm run build -- --debug` — Debug build
- Output goes to `build/release/chrome-mv3/` (or `build/debug/`)

## Key Conventions
- Malevic JSX uses `{m}` import, state via `getContext().store`, refresh via `context.refresh()`
- Styles use LESS with BEM naming (`rd-*` for popup, `advanced__*` / `fetch-remote__*` for options)
- Config types: `ConfigKey = 'darkSites' | 'dynamicThemeFixes' | 'inversionFixes' | 'staticThemes' | 'colorSchemes' | 'detectorHints'`
- Firefox compatibility: port-based messaging fallback in `messenger.ts` + `make-firefox-happy.ts`
