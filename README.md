# Site Zoom Lock

## English

Site Zoom Lock is a Chrome extension that keeps each website at the Chrome page zoom level selected by the user.

It is especially useful for browser-based engineering, design, and productivity tools such as Figma, Stitch, web IDEs, admin consoles, dashboards, documentation systems, and canvas-based editors. In these tools, shortcuts such as Ctrl + Mouse Wheel, Ctrl + 0, Ctrl + Plus, and Ctrl + Minus may be used by the web app itself. If Chrome page zoom changes by accident, the whole workspace can feel inconsistent. Site Zoom Lock helps keep browser page zoom stable per website.

### Features

- Set a target Chrome page zoom level for each website.
- Automatically restore the target zoom when entering a site, refreshing, switching tabs, opening subpages, or changing browser zoom.
- Enable or disable zoom locking for the current website.
- Store all zoom rules locally with `chrome.storage.local`.
- Support Chrome-native zoom levels such as 90%, 100%, 110%, 125%, and 150%.
- Automatically display the popup UI in supported browser languages.

### Important Note

Site Zoom Lock controls Chrome page zoom. It does not control the internal canvas zoom of apps such as Figma, Stitch, design tools, or editors.

### Privacy

Site Zoom Lock does not require an account, does not use analytics, and does not send user data to any server.

The extension uses the current tab URL or domain only to match the active website with the user's local zoom rule. For details, see [PRIVACY.md](PRIVACY.md).

### Local Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Turn on Developer mode.
3. Click "Load unpacked".
4. Select the extension folder.
5. Open a website and choose a target zoom level from the extension popup.
6. Try changing Chrome page zoom with Ctrl + Plus, Ctrl + Minus, Ctrl + Mouse Wheel, or the Chrome menu. The extension will restore the target zoom for that website.

### Permissions

- `storage`: stores per-site zoom rules locally.
- `tabs`: reads the active tab URL/domain and gets or sets Chrome page zoom for the tab.
- `webNavigation`: detects page loads, refreshes, subpage navigation, history changes, and hash changes so the extension can re-check the site rule.

### Limitations

Chrome internal pages, Chrome Web Store pages, and some browser-protected pages may not allow extensions to control zoom. Site Zoom Lock skips unsupported pages automatically.

---

## 中文

Site Zoom Lock 是一个 Chrome 扩展，用来让每个网站保持在用户设定的 Chrome 页面缩放比例。

它尤其适合工程、设计和生产力类网页工具，例如 Figma、Stitch、Web IDE、后台系统、数据仪表盘、文档系统和画布类编辑器。在这些工具里，Ctrl + 鼠标滚轮、Ctrl + 0、Ctrl + 加号、Ctrl + 减号 这些快捷键经常会被网页应用本身使用。如果 Chrome 页面缩放被误触改变，整个工作区可能会变得不稳定。Site Zoom Lock 的作用就是按网站保持浏览器页面缩放稳定。

### 功能

- 为每个网站设置一个目标 Chrome 页面缩放比例。
- 在进入网站、刷新页面、切换标签页、打开二级页面或改变浏览器缩放时，自动恢复目标缩放。
- 可以为当前网站开启或关闭缩放锁定。
- 所有缩放规则都通过 `chrome.storage.local` 保存在本地。
- 支持 Chrome 原生缩放档位，例如 90%、100%、110%、125%、150%。
- 弹窗界面会根据支持的浏览器语言自动切换显示语言。

### 重要说明

Site Zoom Lock 控制的是 Chrome 页面缩放，不控制 Figma、Stitch、设计工具或编辑器内部的画布缩放。

### 隐私

Site Zoom Lock 不需要账号，不使用分析服务，也不会把用户数据发送到任何服务器。

扩展只使用当前标签页 URL 或域名来匹配用户保存在本地的缩放规则。详情请查看 [PRIVACY.md](PRIVACY.md)。

### 本地安装

1. 打开 Chrome，进入 `chrome://extensions/`。
2. 打开开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择扩展文件夹。
5. 打开一个网站，在扩展弹窗里选择目标缩放比例。
6. 尝试使用 Ctrl + 加号、Ctrl + 减号、Ctrl + 鼠标滚轮或 Chrome 菜单改变页面缩放，扩展会把该网站恢复到目标缩放比例。

### 权限说明

- `storage`：在本地保存每个网站的缩放规则。
- `tabs`：读取当前标签页 URL 或域名，并获取或设置该标签页的 Chrome 页面缩放。
- `webNavigation`：监听页面加载、刷新、二级页面跳转、历史记录变化和 hash 变化，以便重新检查网站规则。

### 限制

Chrome 内置页面、Chrome 网上应用店页面以及某些受浏览器保护的页面可能不允许扩展控制缩放。Site Zoom Lock 会自动跳过这些不支持的页面。
