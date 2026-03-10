# DarkReaderLocal

**DarkReaderLocal** is a debloated, offline-only fork of [Dark Reader](https://github.com/darkreader/darkreader) with a completely redesigned settings UI. It applies dark themes to every website while making zero external network requests and containing no ads, donation prompts, news feeds, or telemetry of any kind.

---

## What Makes This Different from Dark Reader

| Feature | Dark Reader (original) | DarkReaderLocal |
| --- | --- | --- |
| Remote config sync | Fetches 6 config files from GitHub on startup | Bundled configs only, fully offline |
| News / blog feed | Polls `darkreader.org/blog/posts.json` | Removed entirely |
| Donation prompts | Shown in popup and settings | Removed entirely |
| Uninstall tracking | Opens `darkreader.org/goodluck/` on uninstall | Removed |
| Install redirect | Opens help page on first install | Removed |
| External navigation | Links to darkreader.org, Twitter, etc. | Stripped from CSP and UI |
| Settings UI | Tab-based panel | Sidebar navigation, premium layout |
| Popup UI | Multi-tab with header | Single-scroll panel, streamlined |
| Theme | Default browser styling | Catppuccin Mocha dark theme throughout |
| Toggle switches | Segmented label buttons | Pill-style toggle switches |

---

## Key Changes

### Fully Offline

All site-fix configs (`dark-sites`, `dynamic-theme-fixes`, `inversion-fixes`, `static-themes`, `color-schemes`, `detector-hints`) load exclusively from the bundled copies shipped with the extension. The `syncSitesFixes` setting has no effect — remote fetching is removed at the source, not just disabled.

The Chrome MV3 Content Security Policy is tightened to `connect-src 'none'`, blocking the extension pages from making any outbound connections.

### Debloated

Removed from the original:

- Newsmaker / blog post fetcher
- Donation flow and pay-gate references
- "Dark Reader Mobile" promotional panel
- Uninstall URL (`darkreader.org/goodluck/`)
- On-install redirect tab

### Redesigned Settings Page

The options page is rebuilt as a sidebar-navigation layout:

- Left rail with 6 sections: General, Site List, Automation, Shortcuts, Advanced, About
- Section content loads in place — no page reloads
- CheckButton controls are restyled as horizontal toggle-switch rows (label left, pill toggle right)
- Action buttons (Import, Export, Reset, DevTools) are full-width clickable cards
- Advanced section uses a clean single-column layout instead of the original cramped grid

### Redesigned Popup

The popup is a single scrollable panel:

- No tab navigation
- Site status row with one-click site toggle and power button
- Collapsible sections for Engine, Font, Site List, Automation

### Catppuccin Mocha Theme

All UI — popup, settings, controls — uses the [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) dark palette:

- Background: `#1e1e2e`
- Accent: `#89b4fa` (blue)
- Headings / active: `#cba6f7` (lavender)
- Sidebar: `#111118`

---

## Building

Requires Node.js 18+.

```bash
git clone https://github.com/SysAdminDoc/DarkReaderLocal
cd DarkReaderLocal
npm install
npm run build -- --chrome-mv3 --debug
```

Output lands in `build/debug/chrome-mv3/`. Load it in Chrome via **Extensions > Load unpacked**.

For a release build:

```bash
npm run build -- --chrome-mv3
```

---

## Installing (Pre-built)

1. Download the latest release zip from the [Releases](../../releases) page
2. Unzip it
3. In Chrome, go to `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the unzipped folder

---

## Credits

- Original extension: [Dark Reader](https://github.com/darkreader/darkreader) by Alexander Shutau and contributors — MIT License
- UI theme: [Catppuccin Mocha](https://github.com/catppuccin/catppuccin)
- Fork maintained by [SysAdminDoc](https://github.com/SysAdminDoc)

This project is a fork and is not affiliated with or endorsed by the Dark Reader team.
