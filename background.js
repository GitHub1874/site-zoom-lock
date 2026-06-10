const DEFAULT_ZOOM_PERCENT = 100;
const MIN_ZOOM_PERCENT = 25;
const MAX_ZOOM_PERCENT = 500;
const ZOOM_EPSILON = 0.001;
const SUPPORTED_ZOOM_PERCENTS = [
  25,
  33,
  50,
  67,
  75,
  80,
  90,
  100,
  110,
  125,
  150,
  175,
  200,
  250,
  300,
  400,
  500
];

const DEFAULT_SETTINGS = {
  siteRules: {},
  disabledSites: {},
  ignoredSites: {}
};

const BADGES = {
  disabled: { text: 'OFF', color: '#6b7280' },
  unsupported: { text: '', color: '#6b7280' }
};
const LOCKED_BADGE = { text: '', color: '#2f6f34' };
const FEEDBACK_BADGE_MS = 1400;

const badgeFeedbackTimers = new Map();

function callChrome(fn) {
  return new Promise((resolve, reject) => {
    fn((result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

function storageGet(defaults) {
  return callChrome((callback) => chrome.storage.local.get(defaults, callback));
}

function storageSet(values) {
  return callChrome((callback) => chrome.storage.local.set(values, callback));
}

function tabsGet(tabId) {
  return callChrome((callback) => chrome.tabs.get(tabId, callback));
}

function tabsQuery(queryInfo) {
  return callChrome((callback) => chrome.tabs.query(queryInfo, callback));
}

function getZoom(tabId) {
  return callChrome((callback) => chrome.tabs.getZoom(tabId, callback));
}

function setZoom(tabId, zoomFactor) {
  return callChrome((callback) => chrome.tabs.setZoom(tabId, zoomFactor, callback));
}

function setZoomSettings(tabId, zoomSettings) {
  return callChrome((callback) => chrome.tabs.setZoomSettings(tabId, zoomSettings, callback));
}

function actionSetBadgeText(tabId, text) {
  return callChrome((callback) => chrome.action.setBadgeText({ tabId, text }, callback));
}

function actionSetBadgeBackgroundColor(tabId, color) {
  return callChrome((callback) => chrome.action.setBadgeBackgroundColor({ tabId, color }, callback));
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function getSiteInfo(url) {
  if (!url) {
    return {
      supported: false,
      key: '',
      label: 'No active page',
      reason: 'no-url'
    };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return {
      supported: false,
      key: '',
      label: 'Unsupported page',
      reason: 'bad-url'
    };
  }

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    const hostname = normalizeHostname(parsed.hostname);
    return {
      supported: true,
      key: `site:${hostname}`,
      label: hostname,
      protocol: parsed.protocol,
      reason: '',
      url
    };
  }

  if (parsed.protocol === 'file:') {
    return {
      supported: true,
      key: 'scheme:file',
      label: 'Local files',
      protocol: parsed.protocol,
      reason: '',
      url
    };
  }

  return {
    supported: false,
    key: '',
    label: parsed.protocol.replace(':', '') || 'Unsupported page',
    protocol: parsed.protocol,
    reason: 'unsupported-protocol',
    url
  };
}

function getPageInfo(url) {
  if (!url) {
    return {
      label: '',
      fullLabel: ''
    };
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const page = `${parsed.pathname || '/'}${parsed.search}${parsed.hash}`;
      return {
        label: page || '/',
        fullLabel: page || '/'
      };
    }

    if (parsed.protocol === 'file:') {
      return {
        label: 'file://',
        fullLabel: url
      };
    }

    return {
      label: parsed.protocol.replace(':', ''),
      fullLabel: url
    };
  } catch {
    return {
      label: '',
      fullLabel: ''
    };
  }
}

function clampZoomPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_ZOOM_PERCENT;
  }

  const bounded = Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, Math.round(number)));
  return SUPPORTED_ZOOM_PERCENTS.reduce((closest, zoomPercent) => {
    const closestDistance = Math.abs(closest - bounded);
    const nextDistance = Math.abs(zoomPercent - bounded);
    return nextDistance < closestDistance ? zoomPercent : closest;
  }, DEFAULT_ZOOM_PERCENT);
}

function normalizeSiteRule(rule) {
  return {
    enabled: rule?.enabled !== false,
    zoomPercent: clampZoomPercent(rule?.zoomPercent ?? DEFAULT_ZOOM_PERCENT),
    label: typeof rule?.label === 'string' ? rule.label : '',
    updatedAt: typeof rule?.updatedAt === 'string' ? rule.updatedAt : ''
  };
}

function normalizeSiteRules(rawRules) {
  const siteRules = {};

  if (!rawRules || typeof rawRules !== 'object' || Array.isArray(rawRules)) {
    return siteRules;
  }

  for (const [key, rule] of Object.entries(rawRules)) {
    if (typeof key === 'string' && key) {
      siteRules[key] = normalizeSiteRule(rule);
    }
  }

  return siteRules;
}

function normalizeDisabledSites(rawDisabledSites) {
  const disabledSites = {};

  if (!rawDisabledSites || typeof rawDisabledSites !== 'object' || Array.isArray(rawDisabledSites)) {
    return disabledSites;
  }

  for (const [key, value] of Object.entries(rawDisabledSites)) {
    if (typeof key === 'string' && key) {
      disabledSites[key] = {
        label: typeof value?.label === 'string' ? value.label : '',
        updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : ''
      };
    }
  }

  return disabledSites;
}

function migrateIgnoredSites(siteRules, disabledSites, ignoredSites) {
  if (!ignoredSites || typeof ignoredSites !== 'object' || Array.isArray(ignoredSites)) {
    return {
      siteRules,
      disabledSites
    };
  }

  for (const [key, value] of Object.entries(ignoredSites)) {
    if (!siteRules[key]) {
      siteRules[key] = {
        enabled: false,
        zoomPercent: DEFAULT_ZOOM_PERCENT,
        label: typeof value?.label === 'string' ? value.label : '',
        updatedAt: typeof value?.addedAt === 'number' ? new Date(value.addedAt).toISOString() : ''
      };
    }

    disabledSites[key] = {
      label: typeof value?.label === 'string' ? value.label : siteRules[key].label,
      updatedAt: typeof value?.addedAt === 'number' ? new Date(value.addedAt).toISOString() : ''
    };
  }

  return {
    siteRules,
    disabledSites
  };
}

async function readSettings() {
  const raw = await storageGet(DEFAULT_SETTINGS);
  const migrated = migrateIgnoredSites(
    normalizeSiteRules(raw.siteRules),
    normalizeDisabledSites(raw.disabledSites),
    raw.ignoredSites
  );

  return {
    siteRules: migrated.siteRules,
    disabledSites: migrated.disabledSites
  };
}

async function writeSettings(settings) {
  await storageSet({
    siteRules: normalizeSiteRules(settings.siteRules),
    disabledSites: normalizeDisabledSites(settings.disabledSites),
    ignoredSites: {}
  });
}

function getSiteRule(settings, siteInfo) {
  if (!siteInfo.supported) {
    return normalizeSiteRule({});
  }

  const rule = normalizeSiteRule(settings.siteRules[siteInfo.key]);
  if (settings.disabledSites[siteInfo.key]) {
    rule.enabled = false;
  }
  return rule;
}

function upsertSiteRule(settings, siteInfo, patch) {
  const current = getSiteRule(settings, siteInfo);
  settings.siteRules[siteInfo.key] = normalizeSiteRule({
    ...current,
    ...patch,
    label: siteInfo.label,
    updatedAt: new Date().toISOString()
  });

  if (Object.prototype.hasOwnProperty.call(patch, 'enabled')) {
    if (patch.enabled === false) {
      settings.disabledSites[siteInfo.key] = {
        label: siteInfo.label,
        updatedAt: new Date().toISOString()
      };
    } else {
      delete settings.disabledSites[siteInfo.key];
    }
  }

  return settings.siteRules[siteInfo.key];
}

function formatZoomPercent(zoomPercent) {
  return `${clampZoomPercent(zoomPercent)}%`;
}

function clearBadgeFeedback(tabId) {
  const timer = badgeFeedbackTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    badgeFeedbackTimers.delete(tabId);
  }
}

async function applyBadge(tabId, badge) {
  if (typeof tabId !== 'number' || tabId < 0) {
    return;
  }

  try {
    await actionSetBadgeText(tabId, badge.text);
    await actionSetBadgeBackgroundColor(tabId, badge.color);
  } catch {
    // Badge updates are cosmetic; enforcement should not fail because of them.
  }
}

async function setBadge(tabId, badge) {
  clearBadgeFeedback(tabId);
  await applyBadge(tabId, badge);
}

async function setLockedBadge(tabId, options = {}) {
  if (options.preserveFeedback && badgeFeedbackTimers.has(tabId)) {
    return;
  }

  await setBadge(tabId, LOCKED_BADGE);
}

async function showZoomCorrectionFeedback(tabId, zoomPercent) {
  clearBadgeFeedback(tabId);
  await applyBadge(tabId, {
    text: formatZoomPercent(zoomPercent),
    color: '#2f6f34'
  });

  const timer = setTimeout(() => {
    badgeFeedbackTimers.delete(tabId);
    void setLockedBadge(tabId);
  }, FEEDBACK_BADGE_MS);
  badgeFeedbackTimers.set(tabId, timer);
}

async function releaseOldZoomLock(tabId) {
  try {
    await setZoomSettings(tabId, {
      mode: 'automatic',
      scope: 'per-origin'
    });
  } catch {
    // Some Chrome-owned pages reject zoom setting changes.
  }
}

async function applyTabZoom(tabId, zoomPercent) {
  const targetZoom = clampZoomPercent(zoomPercent) / 100;

  await releaseOldZoomLock(tabId);
  const beforeZoom = await getZoom(tabId);

  if (Math.abs(beforeZoom - targetZoom) > ZOOM_EPSILON) {
    await setZoom(tabId, targetZoom);
  }

  const afterZoom = await getZoom(tabId);

  return {
    beforeZoom,
    afterZoom,
    targetZoom,
    changed: Math.abs(beforeZoom - targetZoom) > ZOOM_EPSILON
  };
}

async function enforceTab(tabId, reason = 'check') {
  let tab;
  try {
    tab = await tabsGet(tabId);
  } catch (error) {
    return {
      ok: false,
      reason,
      error: error.message
    };
  }

  const settings = await readSettings();
  const url = tab.url || tab.pendingUrl;
  const siteInfo = getSiteInfo(url);

  if (!siteInfo.supported) {
    await setBadge(tabId, BADGES.unsupported);
    return {
      ok: false,
      action: 'unsupported',
      siteInfo,
      reason
    };
  }

  const siteRule = getSiteRule(settings, siteInfo);

  if (!siteRule.enabled) {
    await releaseOldZoomLock(tabId);
    await setBadge(tabId, BADGES.disabled);
    return {
      ok: true,
      action: 'site-disabled',
      siteInfo,
      siteRule,
      reason
    };
  }

  try {
    const result = await applyTabZoom(tabId, siteRule.zoomPercent);
    if (result.changed && reason.startsWith('zoom-changed')) {
      await showZoomCorrectionFeedback(tabId, siteRule.zoomPercent);
    } else {
      await setLockedBadge(tabId, { preserveFeedback: reason.startsWith('zoom-changed') });
    }
    return {
      ok: true,
      action: result.changed ? 'reset' : 'already-target',
      siteInfo,
      siteRule,
      zoom: result.afterZoom,
      reason
    };
  } catch (error) {
    await setBadge(tabId, BADGES.unsupported);
    return {
      ok: false,
      action: 'error',
      siteInfo,
      siteRule,
      reason,
      error: error.message
    };
  }
}

function verifyTab(tabId, reason) {
  if (typeof tabId !== 'number' || tabId < 0) {
    return;
  }

  void enforceTab(tabId, reason);
  setTimeout(() => void enforceTab(tabId, `${reason}:settled`), 250);
}

async function enforceAllTabs(reason) {
  const tabs = await tabsQuery({});
  await Promise.allSettled(
    tabs
      .filter((tab) => typeof tab.id === 'number')
      .map((tab) => enforceTab(tab.id, reason))
  );
}

async function getActiveTab() {
  const tabs = await tabsQuery({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function buildPopupState() {
  const settings = await readSettings();
  const tab = await getActiveTab();

  if (!tab || typeof tab.id !== 'number') {
    return {
      tab: null,
      siteInfo: getSiteInfo(''),
      pageInfo: getPageInfo(''),
      siteRule: normalizeSiteRule({}),
      zoom: null,
      canControl: false,
      targetZoomLabel: formatZoomPercent(DEFAULT_ZOOM_PERCENT)
    };
  }

  const url = tab.url || tab.pendingUrl || '';
  const siteInfo = getSiteInfo(url);
  const pageInfo = getPageInfo(url);
  const siteRule = getSiteRule(settings, siteInfo);
  let zoom = null;
  let canControl = siteInfo.supported;

  try {
    zoom = await getZoom(tab.id);
  } catch {
    canControl = false;
  }

  return {
    tab: {
      id: tab.id,
      title: tab.title || '',
      url
    },
    siteInfo,
    pageInfo,
    siteRule,
    zoom,
    canControl,
    targetZoomLabel: formatZoomPercent(siteRule.zoomPercent)
  };
}

async function updateCurrentSiteRule(patch, reason) {
  const settings = await readSettings();
  const tab = await getActiveTab();

  if (!tab || typeof tab.id !== 'number') {
    return buildPopupState();
  }

  const siteInfo = getSiteInfo(tab.url || tab.pendingUrl);
  if (!siteInfo.supported) {
    return buildPopupState();
  }

  upsertSiteRule(settings, siteInfo, patch);
  await writeSettings(settings);
  await enforceAllTabs(reason);
  return buildPopupState();
}

async function setCurrentSiteEnabled(enabled) {
  return updateCurrentSiteRule({ enabled: Boolean(enabled) }, 'site-enabled-changed');
}

async function setCurrentSiteZoom(zoomPercent) {
  return updateCurrentSiteRule(
    {
      enabled: true,
      zoomPercent: clampZoomPercent(zoomPercent)
    },
    'site-zoom-changed'
  );
}

async function resetCurrentTabNow() {
  const tab = await getActiveTab();
  if (tab && typeof tab.id === 'number') {
    await enforceTab(tab.id, 'manual-reset');
  }

  return buildPopupState();
}

chrome.runtime.onInstalled.addListener(() => {
  void enforceAllTabs('installed');
});

chrome.runtime.onStartup.addListener(() => {
  void enforceAllTabs('startup');
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  verifyTab(activeInfo.tabId, 'activated');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'loading' || changeInfo.status === 'complete') {
    verifyTab(tabId, `tab-${changeInfo.status || 'url-change'}`);
  }
});

chrome.tabs.onZoomChange.addListener((zoomChangeInfo) => {
  verifyTab(zoomChangeInfo.tabId, 'zoom-changed');
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    verifyTab(details.tabId, 'navigation-committed');
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    verifyTab(details.tabId, 'navigation-completed');
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    verifyTab(details.tabId, 'history-state-updated');
  }
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  if (details.frameId === 0) {
    verifyTab(details.tabId, 'reference-fragment-updated');
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const respond = async () => {
    switch (message?.type) {
      case 'get-popup-state':
        return buildPopupState();
      case 'set-current-site-enabled':
        return setCurrentSiteEnabled(message.enabled);
      case 'set-current-site-zoom':
        return setCurrentSiteZoom(message.zoomPercent);
      case 'set-current-site-ignored':
        return setCurrentSiteEnabled(!message.ignored);
      case 'reset-current-tab':
        return resetCurrentTabNow();
      default:
        return {
          error: 'Unknown message'
        };
    }
  };

  respond()
    .then((state) => sendResponse(state))
    .catch((error) => sendResponse({ error: error.message }));

  return true;
});
