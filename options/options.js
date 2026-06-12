const summaryText = document.getElementById('summaryText');
const emptyState = document.getElementById('emptyState');
const rulesBody = document.getElementById('rulesBody');
const liveStatus = document.getElementById('liveStatus');

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

let currentRules = [];

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

function formatDate(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function createZoomSelect(rule) {
  const select = document.createElement('select');
  select.className = 'zoom-select';
  select.setAttribute('aria-label', t('manageZoomColumn'));

  for (const zoomPercent of SUPPORTED_ZOOM_PERCENTS) {
    const option = document.createElement('option');
    option.value = String(zoomPercent);
    option.textContent = `${zoomPercent}%`;
    option.selected = zoomPercent === rule.zoomPercent;
    select.append(option);
  }

  select.addEventListener('change', () => {
    void updateRule(rule.key, {
      zoomPercent: Number(select.value)
    });
  });

  return select;
}

function createStatusButton(rule) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `status-button${rule.enabled ? ' is-on' : ''}`;
  button.textContent = rule.enabled ? t('manageStatusOn') : t('manageStatusOff');
  button.addEventListener('click', () => {
    void updateRule(rule.key, {
      enabled: !rule.enabled
    });
  });
  return button;
}

function createDeleteButton(rule) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'delete-button';
  button.textContent = t('manageDeleteButton');
  button.addEventListener('click', () => {
    if (confirm(t('manageDeleteConfirm', rule.label))) {
      void deleteRule(rule.key);
    }
  });
  return button;
}

function renderRules(rules) {
  currentRules = rules;
  rulesBody.replaceChildren();
  emptyState.hidden = rules.length > 0;

  summaryText.textContent = t('manageSummary', String(rules.length));

  for (const rule of rules) {
    const row = document.createElement('tr');

    const siteCell = document.createElement('td');
    const siteName = document.createElement('div');
    siteName.className = 'site-name';
    siteName.textContent = rule.label;
    siteName.title = rule.label;
    siteCell.append(siteName);

    const zoomCell = document.createElement('td');
    zoomCell.append(createZoomSelect(rule));

    const statusCell = document.createElement('td');
    statusCell.append(createStatusButton(rule));

    const updatedCell = document.createElement('td');
    const updatedText = document.createElement('span');
    updatedText.className = 'updated-text';
    updatedText.textContent = formatDate(rule.updatedAt);
    updatedCell.append(updatedText);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    actionsCell.append(createDeleteButton(rule));

    row.append(siteCell, zoomCell, statusCell, updatedCell, actionsCell);
    rulesBody.append(row);
  }
}

async function refresh() {
  try {
    const state = await sendMessage({ type: 'get-manage-sites-state' });
    renderRules(state.rules || []);
  } catch (error) {
    summaryText.textContent = t('extensionUnavailable');
    liveStatus.textContent = error.message;
  }
}

async function updateRule(key, patch) {
  try {
    const state = await sendMessage({
      type: 'update-managed-site-rule',
      key,
      ...patch
    });
    renderRules(state.rules || currentRules);
    liveStatus.textContent = t('manageSavedStatus');
  } catch (error) {
    liveStatus.textContent = error.message;
  }
}

async function deleteRule(key) {
  try {
    const state = await sendMessage({
      type: 'delete-managed-site-rule',
      key
    });
    renderRules(state.rules || []);
    liveStatus.textContent = t('manageDeletedStatus');
  } catch (error) {
    liveStatus.textContent = error.message;
  }
}

applyStaticI18n();
void refresh();
