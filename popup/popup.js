const statusText = document.getElementById('statusText');
const inlineZoomValue = document.getElementById('inlineZoomValue');
const siteValue = document.getElementById('siteValue');
const siteToggle = document.getElementById('siteToggle');
const siteSwitch = document.getElementById('siteSwitch');
const siteStateBadge = document.getElementById('siteStateBadge');
const zoomSelect = document.getElementById('zoomSelect');
const pageRule = document.getElementById('pageRule');
const unsupportedHelp = document.getElementById('unsupportedHelp');
const shortcutIntroText = document.getElementById('shortcutIntroText');
const liveStatus = document.getElementById('liveStatus');

const MIN_ZOOM_PERCENT = 25;
const MAX_ZOOM_PERCENT = 500;
const DEFAULT_ZOOM_PERCENT = 100;
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
const SUPPORTED_LOCALES = new Set([
  'de',
  'en',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pt_BR',
  'ru',
  'zh_CN',
  'zh_TW'
]);

let currentState = null;

function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function resolvedDocumentLanguage() {
  const uiLanguage = chrome.i18n.getUILanguage().replace(/-/g, '_');
  if (SUPPORTED_LOCALES.has(uiLanguage)) {
    return uiLanguage.replace(/_/g, '-');
  }

  const baseLanguage = uiLanguage.split('_')[0];
  if (SUPPORTED_LOCALES.has(baseLanguage)) {
    return baseLanguage;
  }

  return 'en';
}

function applyStaticI18n() {
  document.documentElement.lang = resolvedDocumentLanguage();

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
}

function populateZoomOptions() {
  zoomSelect.replaceChildren();

  for (const zoomPercent of SUPPORTED_ZOOM_PERCENTS) {
    const option = document.createElement('option');
    option.value = String(zoomPercent);
    option.textContent = `${zoomPercent}%`;
    zoomSelect.append(option);
  }
}

function getPlatformInfo() {
  return new Promise((resolve) => {
    if (!chrome.runtime.getPlatformInfo) {
      resolve(null);
      return;
    }

    chrome.runtime.getPlatformInfo((platformInfo) => {
      const error = chrome.runtime.lastError;
      resolve(error ? null : platformInfo);
    });
  });
}

async function applyPlatformShortcutHint() {
  const platformInfo = await getPlatformInfo();
  const modifier = platformInfo?.os === 'mac' ? t('keyboardModifierCommand') : t('keyboardModifierCtrl');

  shortcutIntroText.textContent = t('unsupportedZoomShortcutIntro', modifier);
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
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

function formatZoom(zoom) {
  if (typeof zoom !== 'number') {
    return '--';
  }

  return `${Math.round(zoom * 100)}%`;
}

function formatSiteLabel(siteInfo) {
  if (!siteInfo?.supported) {
    if (siteInfo?.reason === 'no-url') {
      return t('siteNoActivePage');
    }
    return t('siteUnsupported');
  }

  if (siteInfo.key === 'scheme:file') {
    return t('siteLocalFiles');
  }

  return siteInfo.label || '--';
}

function setBusy(isBusy) {
  const canUseControls = currentState?.canControl === true;

  document.body.toggleAttribute('aria-busy', isBusy);
  siteToggle.disabled = isBusy || !canUseControls;
  zoomSelect.disabled = isBusy || !canUseControls;
}

function render(state) {
  currentState = state;
  const siteEnabled = state.siteRule?.enabled !== false;
  const zoomPercent = clampZoomPercent(state.siteRule?.zoomPercent ?? DEFAULT_ZOOM_PERCENT);
  const unsupported = !state.canControl;

  siteToggle.checked = !unsupported && siteEnabled;
  zoomSelect.value = String(zoomPercent);
  inlineZoomValue.textContent = formatZoom(state.zoom);
  inlineZoomValue.title = inlineZoomValue.textContent;
  siteValue.textContent = formatSiteLabel(state.siteInfo);
  siteValue.title = formatSiteLabel(state.siteInfo);
  siteSwitch.hidden = unsupported;
  siteStateBadge.hidden = !unsupported;
  pageRule.hidden = unsupported;
  unsupportedHelp.hidden = !unsupported;
  document.body.classList.toggle('is-unsupported', unsupported);

  if (unsupported) {
    statusText.textContent = t('statusUnsupported');
  } else if (!siteEnabled) {
    statusText.textContent = t('statusSiteOff');
  } else {
    statusText.textContent = t('statusLockedTo', `${zoomPercent}%`);
  }

  setBusy(false);
  liveStatus.textContent = statusText.textContent;
}

async function refresh() {
  setBusy(true);
  try {
    const state = await sendMessage({ type: 'get-popup-state' });
    render(state);
  } catch (error) {
    statusText.textContent = t('extensionUnavailable');
    liveStatus.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

async function runAction(message, successText) {
  setBusy(true);
  try {
    const state = await sendMessage(message);
    render(state);
    liveStatus.textContent = successText;
  } catch (error) {
    statusText.textContent = error.message;
    liveStatus.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

function selectedZoomPercent() {
  return clampZoomPercent(zoomSelect.value);
}

siteToggle.addEventListener('change', () => {
  void runAction(
    {
      type: 'set-current-site-enabled',
      enabled: siteToggle.checked
    },
    siteToggle.checked ? t('siteEnabledSuccess') : t('siteDisabledSuccess')
  );
});

zoomSelect.addEventListener('change', () => {
  const zoomPercent = selectedZoomPercent();
  void runAction(
    {
      type: 'set-current-site-zoom',
      zoomPercent
    },
    t('zoomSavedSuccess', `${zoomPercent}%`)
  );
});

applyStaticI18n();
populateZoomOptions();
void applyPlatformShortcutHint();
void refresh();
