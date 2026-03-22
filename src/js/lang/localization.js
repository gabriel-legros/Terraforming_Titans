var activeLanguageCode = 'en';
var activeLanguageData = {};

function isLanguageObject(value) {
  return !!value && Object.prototype.toString.call(value) === '[object Object]';
}

function mergeLanguageData(base, extra) {
  if (!isLanguageObject(base)) {
    return isLanguageObject(extra) ? mergeLanguageData({}, extra) : extra;
  }
  const merged = { ...base };
  if (!isLanguageObject(extra)) {
    return merged;
  }
  for (const key in extra) {
    const currentValue = merged[key];
    const nextValue = extra[key];
    if (isLanguageObject(currentValue) && isLanguageObject(nextValue)) {
      merged[key] = mergeLanguageData(currentValue, nextValue);
      continue;
    }
    merged[key] = nextValue;
  }
  return merged;
}

function setLanguageData(data) {
  activeLanguageData = mergeLanguageData(activeLanguageData, data || {});
  if (activeLanguageData.meta && activeLanguageData.meta.code) {
    activeLanguageCode = activeLanguageData.meta.code;
  }
  return activeLanguageData;
}

function getLanguageNode(path) {
  if (!path) {
    return null;
  }
  const parts = String(path).split('.');
  let node = activeLanguageData;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!node || !Object.prototype.hasOwnProperty.call(node, part)) {
      return null;
    }
    node = node[part];
  }
  return node;
}

function escapeLanguageToken(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function interpolateLanguageText(text, vars) {
  let output = String(text);
  if (!vars) {
    return output;
  }
  for (const key in vars) {
    const pattern = new RegExp('\\{' + escapeLanguageToken(key) + '\\}', 'g');
    output = output.replace(pattern, String(vars[key]));
  }
  return output;
}

function t(path, vars, fallback) {
  const localized = getLanguageNode(path);
  if (typeof localized === 'string') {
    return interpolateLanguageText(localized, vars);
  }
  if (fallback !== undefined) {
    return interpolateLanguageText(fallback, vars);
  }
  return String(path || '');
}

function collectLanguageNodes(root, selector) {
  const nodes = [];
  if (!root) {
    return nodes;
  }
  if (root.matches && root.matches(selector)) {
    nodes.push(root);
  }
  const descendants = root.querySelectorAll ? root.querySelectorAll(selector) : [];
  for (let i = 0; i < descendants.length; i += 1) {
    nodes.push(descendants[i]);
  }
  return nodes;
}

function applyLanguageAttribute(root, selector, attributeName, getter, setter) {
  const nodes = collectLanguageNodes(root, selector);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const key = getter(node);
    if (!key) {
      continue;
    }
    const fallback = setter === 'textContent'
      ? node.textContent
      : node.getAttribute(attributeName) || '';
    const value = t(key, null, fallback);
    if (setter === 'textContent') {
      node.textContent = value;
      continue;
    }
    node.setAttribute(attributeName, value);
  }
}

function applyLanguageToDom(root) {
  const scope = root || document;
  if (!scope) {
    return;
  }

  if (scope === document) {
    const titleText = getLanguageNode('meta.documentTitle');
    if (typeof titleText === 'string') {
      document.title = titleText;
    }
    if (document.documentElement) {
      document.documentElement.lang = activeLanguageCode || 'en';
    }
  }

  applyLanguageAttribute(scope, '[data-i18n]', '', node => node.dataset.i18n, 'textContent');
  applyLanguageAttribute(scope, '[data-i18n-title]', 'title', node => node.dataset.i18nTitle, 'attribute');
  applyLanguageAttribute(scope, '[data-i18n-placeholder]', 'placeholder', node => node.dataset.i18nPlaceholder, 'attribute');
  applyLanguageAttribute(scope, '[data-i18n-aria-label]', 'aria-label', node => node.dataset.i18nAriaLabel, 'attribute');
}

function applyLocalizedEntryFields(targetEntries, localizedEntries, fields) {
  if (!localizedEntries) {
    return;
  }
  for (const key in localizedEntries) {
    const target = targetEntries[key];
    if (!target) {
      continue;
    }
    const localized = localizedEntries[key];
    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      if (localized[field] !== undefined) {
        target[field] = localized[field];
      }
    }
  }
}

function applyLocalizedResourceFields(resourceGroups, localizedGroups) {
  if (!localizedGroups) {
    return;
  }
  for (const category in localizedGroups) {
    const targetGroup = resourceGroups[category];
    const localizedGroup = localizedGroups[category];
    if (!targetGroup) {
      continue;
    }
    applyLocalizedEntryFields(targetGroup, localizedGroup, ['name', 'displayName', 'description']);
  }
}

function applyLocalizedResearchFields(localizedResearch) {
  if (!localizedResearch) {
    return;
  }
  for (const category in localizedResearch) {
    const researchList = researchParameters[category];
    const localizedCategory = localizedResearch[category];
    if (!researchList || !localizedCategory) {
      continue;
    }
    for (let i = 0; i < researchList.length; i += 1) {
      const research = researchList[i];
      const localizedEntry = localizedCategory[research.id];
      if (!localizedEntry) {
        continue;
      }
      if (localizedEntry.name !== undefined) {
        research.name = localizedEntry.name;
      }
      if (localizedEntry.description !== undefined) {
        research.description = localizedEntry.description;
      }
    }
  }
}

function languageTextToLines(text) {
  if (Array.isArray(text)) {
    return text.slice();
  }
  if (typeof text === 'string') {
    return text.split('\n');
  }
  return [];
}

function applyLocalizedStoryFields(localizedStory) {
  if (!localizedStory) {
    return;
  }
  const localizedChapters = localizedStory.chapters || {};
  for (let i = 0; i < progressData.chapters.length; i += 1) {
    const chapter = progressData.chapters[i];
    const localizedChapter = localizedChapters[chapter.id];
    if (!localizedChapter) {
      continue;
    }
    if (localizedChapter.narrative !== undefined) {
      chapter.narrative = localizedChapter.narrative;
      chapter.narrativeLines = languageTextToLines(localizedChapter.narrative);
    }
    if (chapter.parameters && localizedChapter.text !== undefined) {
      chapter.parameters.text = localizedChapter.text;
      chapter.parameters.textLines = languageTextToLines(localizedChapter.text);
    }
  }

  const localizedProjects = localizedStory.projects || {};
  for (const key in localizedProjects) {
    const project = progressData.storyProjects[key];
    const localizedProject = localizedProjects[key];
    if (!project || !localizedProject) {
      continue;
    }
    if (localizedProject.name !== undefined) {
      project.name = localizedProject.name;
    }
    if (localizedProject.description !== undefined) {
      project.description = localizedProject.description;
    }
    if (Array.isArray(localizedProject.storySteps)) {
      project.attributes.storySteps = localizedProject.storySteps.slice();
      project.attributes.storyStepLines = localizedProject.storySteps.map(languageTextToLines);
    }
  }
}

function applyLanguageToGameData() {
  const catalogs = activeLanguageData.catalogs || {};
  applyLocalizedEntryFields(buildingsParameters, catalogs.buildings, ['name', 'description', 'displayName']);
  applyLocalizedEntryFields(projectParameters, catalogs.projects, ['name', 'description', 'displayName']);
  applyLocalizedEntryFields(colonyParameters, catalogs.colonies, ['name', 'description', 'displayName']);
  applyLocalizedEntryFields(skillParameters, catalogs.skills, ['name', 'description', 'displayName']);
  applyLocalizedResearchFields(catalogs.research);
  applyLocalizedResourceFields(window.defaultPlanetResources, catalogs.resources);
  applyLocalizedEntryFields(planetParameters, catalogs.planets, ['name', 'description', 'displayName']);
  applyLocalizedStoryFields(catalogs.story);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyLanguageToDom();
  });
} else {
  applyLanguageToDom();
}
