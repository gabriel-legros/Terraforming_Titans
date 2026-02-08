var localizationFallbackLanguage = 'en';
var localizationActiveLanguage = 'en';
var localizationResources = {
  en: {},
  la: {}
};

function normalizeLanguageCode(code) {
  if (!code) return localizationFallbackLanguage;
  const normalized = String(code).trim().toLowerCase().replace('_', '-');
  if (localizationResources[normalized]) return normalized;
  const base = normalized.split('-')[0];
  if (localizationResources[base]) return base;
  return localizationFallbackLanguage;
}

function getLocalizationValue(languageCode, key) {
  const languageMap = localizationResources[languageCode];
  if (!languageMap || !key) return '';
  const parts = String(key).split('.');
  let cursor = languageMap;
  for (let i = 0; i < parts.length; i += 1) {
    cursor = cursor && cursor[parts[i]];
    if (!cursor) return '';
  }
  return cursor;
}

function interpolateLocalizationText(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
    if (vars[name] === undefined || vars[name] === null) return '';
    return String(vars[name]);
  });
}

function t(key, vars) {
  const primary = getLocalizationValue(localizationActiveLanguage, key);
  const fallback = getLocalizationValue(localizationFallbackLanguage, key);
  const resolved = primary || fallback || key;
  return interpolateLocalizationText(resolved, vars);
}

function applyLocalizationToDocument(rootElement) {
  if (typeof document === 'undefined') return;
  const root = rootElement || document;

  const textNodes = root.querySelectorAll('[data-i18n]');
  textNodes.forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (!key) return;
    node.textContent = t(key);
  });

  const titleNodes = root.querySelectorAll('[data-i18n-title]');
  titleNodes.forEach(node => {
    const key = node.getAttribute('data-i18n-title');
    if (!key) return;
    node.setAttribute('title', t(key));
  });

  const placeholderNodes = root.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach(node => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (!key) return;
    node.setAttribute('placeholder', t(key));
  });
}

function registerTranslations(languageCode, keyMap) {
  const normalized = normalizeLanguageCode(languageCode);
  if (!localizationResources[normalized]) {
    localizationResources[normalized] = {};
  }
  if (!keyMap || typeof keyMap !== 'object') return;

  const merge = function (target, source) {
    for (const key in source) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        merge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  merge(localizationResources[normalized], keyMap);
}

function getCurrentLanguage() {
  return localizationActiveLanguage;
}

function setLanguage(languageCode, options) {
  const opts = options || {};
  const nextLanguage = normalizeLanguageCode(languageCode);
  localizationActiveLanguage = nextLanguage;

  if (typeof gameSettings !== 'undefined' && gameSettings) {
    gameSettings.language = nextLanguage;
  }

  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    if (html) {
      html.setAttribute('lang', nextLanguage);
    }
    applyLocalizationToDocument(document);

    if (!opts.skipEvent && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language: nextLanguage }
      }));
    }
  }

  return nextLanguage;
}

function initializeLocalization() {
  let preferred = localizationFallbackLanguage;

  if (typeof gameSettings !== 'undefined' && gameSettings && gameSettings.language) {
    preferred = gameSettings.language;
  } else if (typeof navigator !== 'undefined' && navigator.language) {
    preferred = navigator.language;
  }

  setLanguage(preferred, { skipEvent: true });
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    initializeLocalization();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    t,
    setLanguage,
    getCurrentLanguage,
    registerTranslations,
    applyLocalizationToDocument,
    normalizeLanguageCode
  };
}
