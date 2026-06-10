# Site Zoom Lock

Site Zoom Lock is a Chrome extension that keeps each website at the Chrome page zoom level selected by the user.

It is especially useful for browser-based work tools such as Figma, Stitch, web IDEs, admin consoles, dashboards, documentation systems, and engineering tools. In these tools, shortcuts such as Ctrl + Mouse Wheel, Ctrl + 0, Ctrl + Plus, and Ctrl + Minus may be used by the web app itself. Site Zoom Lock helps keep the browser page zoom stable per website.

## Features

- Set a target Chrome page zoom level for each website.
- Automatically restore the target zoom when entering a site, refreshing, switching tabs, opening subpages, or changing browser zoom.
- Enable or disable zoom locking for the current website.
- Store all zoom rules locally with `chrome.storage.local`.
- Support Chrome-native zoom levels such as 90%, 100%, 110%, 125%, and 150%.
- Automatically display the popup UI in supported browser languages.

## Privacy

Site Zoom Lock does not require an account, does not use analytics, and does not send user data to any server.

The extension uses the current tab URL or domain only to match the active website with the user's local zoom rule. For details, see [PRIVACY.md](PRIVACY.md).

## Local Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Turn on Developer mode.
3. Click "Load unpacked".
4. Select the `SiteZoomLock-Chrome-Extension` folder.
5. Open a website and choose a target zoom level from the extension popup.
6. Try changing Chrome page zoom with Ctrl + Plus, Ctrl + Minus, Ctrl + Mouse Wheel, or the Chrome menu. The extension will restore the target zoom for that website.

## Permissions

- `storage`: stores per-site zoom rules locally.
- `tabs`: reads the active tab URL/domain and gets or sets Chrome page zoom for the tab.
- `webNavigation`: detects page loads, refreshes, subpage navigation, history changes, and hash changes so the extension can re-check the site rule.

## Limitations

Chrome internal pages, Chrome Web Store pages, and some browser-protected pages may not allow extensions to control zoom. Site Zoom Lock skips unsupported pages automatically.
