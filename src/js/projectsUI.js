if (typeof SubtabManager === 'undefined') {
  if (typeof require === 'function') {
    SubtabManager = require('./subtab-manager.js');
  } else if (typeof window !== 'undefined') {
    SubtabManager = window.SubtabManager;
  }
}
let projectElements = {};

// Centralized, browser-friendly caches for Projects UI
const projectsUICache = {
  contentWrapper: null,
  contentById: {},             // id -> content element ("*-projects")
  listByCategory: {},          // category -> list element ("*-projects-list")
};

let projectGroupConfig = null;

const projectGroupState = {
  active: {}
};

let cachedProjectSubtabContents = null; // cache for .projects-subtab-content containers
let projectsSubtabManager = null;
const projectDisplayState = {
  collapsed: {}
};

function resetProjectDisplayState() {
  projectDisplayState.collapsed = {};
}

function resetProjectGroupState() {
  projectGroupState.active = {};
  projectGroupConfig = null;
}

function getProjectGroupId(project) {
  return project.attributes.projectGroup;
}

function buildProjectGroupConfig() {
  const config = {};
  if (!projectManager || !projectManager.projects) {
    return config;
  }
  const order = Array.isArray(projectManager.projectOrder)
    ? projectManager.projectOrder
    : Object.keys(projectManager.projects || {});

  order.forEach((name) => {
    const project = projectManager.projects[name];
    if (!project || !project.attributes || !project.attributes.projectGroup) {
      return;
    }
    const groupId = project.attributes.projectGroup;
    const list = config[groupId] || (config[groupId] = []);
    if (!list.includes(name)) {
      list.push(name);
    }
  });

  return config;
}

function getProjectGroupConfig() {
  if (!projectGroupConfig) {
    projectGroupConfig = buildProjectGroupConfig();
  }
  return projectGroupConfig;
}

function getGroupProjectNames(groupId) {
  const config = getProjectGroupConfig();
  return config[groupId] || [];
}

function getVisibleGroupProjectNames(groupId) {
  const groupNames = getGroupProjectNames(groupId);
  return groupNames.filter((name) => isProjectVisibleForOrder(projectManager.projects[name]));
}

function ensureGroupActiveProject(groupId) {
  const groupNames = getGroupProjectNames(groupId);
  const visibleNames = getVisibleGroupProjectNames(groupId);
  const fallback = visibleNames[0] || groupNames[0];
  if (visibleNames.indexOf(projectGroupState.active[groupId]) !== -1) {
    return;
  }
  if (groupNames.indexOf(projectGroupState.active[groupId]) !== -1 && visibleNames.length === 0) {
    return;
  }
  projectGroupState.active[groupId] = fallback;
}

function getActiveGroupProjectName(groupId) {
  ensureGroupActiveProject(groupId);
  return projectGroupState.active[groupId];
}

function switchProjectGroup(groupId, direction) {
  const visibleNames = getVisibleGroupProjectNames(groupId);
  if (visibleNames.length < 2) {
    return;
  }
  const current = getActiveGroupProjectName(groupId);
  const index = visibleNames.indexOf(current);
  const baseIndex = index >= 0 ? index : 0;
  const nextIndex = (baseIndex + direction + visibleNames.length) % visibleNames.length;
  projectGroupState.active[groupId] = visibleNames[nextIndex];
  getGroupProjectNames(groupId).forEach((name) => updateProjectUI(name));
}

function updateProjectCollapsePreference(name, collapsed) {
  if (!name) return;
  if (collapsed) {
    projectDisplayState.collapsed[name] = true;
    return;
  }
  delete projectDisplayState.collapsed[name];
}

const existingImportResourcesProjectUI =
  typeof ImportResourcesProjectUI !== 'undefined'
    ? ImportResourcesProjectUI
    : (typeof window !== 'undefined' ? window.ImportResourcesProjectUI : undefined);

let importResourcesProjectUIClass = existingImportResourcesProjectUI;

if (!importResourcesProjectUIClass && typeof require === 'function') {
  try {
    importResourcesProjectUIClass = require('./projects/ImportResourcesProjectUI.js');
  } catch (error) {
    importResourcesProjectUIClass = existingImportResourcesProjectUI;
  }
}

if (!importResourcesProjectUIClass && typeof window !== 'undefined') {
  importResourcesProjectUIClass = window.ImportResourcesProjectUI;
}

if (typeof window !== 'undefined' && importResourcesProjectUIClass) {
  window.ImportResourcesProjectUI = importResourcesProjectUIClass;
}

let importResourcesController = null;

function getImportResourcesUI() {
  if (!importResourcesProjectUIClass) {
    return null;
  }

  if (!importResourcesController) {
    importResourcesController = new importResourcesProjectUIClass({
      getProjectElements: () => projectElements,
      getOrCreateCategoryContainer,
      moveProject,
      toggleProjectCollapse,
      updateProjectUI: (name) => updateProjectUI(name),
    });
  }

  return importResourcesController;
}

function syncProjectGroupState() {
  const config = getProjectGroupConfig();
  Object.keys(config).forEach((groupId) => ensureGroupActiveProject(groupId));
}

function getProjectSubtabContents() {
  if (!cachedProjectSubtabContents || !Array.isArray(cachedProjectSubtabContents)) {
    cachedProjectSubtabContents = Array.from(document.getElementsByClassName('projects-subtab-content'));
  }
  return cachedProjectSubtabContents;
}

function getContentWrapper() {
  if (!projectsUICache.contentWrapper) {
    projectsUICache.contentWrapper = document.getElementsByClassName('projects-subtab-content-wrapper')[0] || null;
  }
  return projectsUICache.contentWrapper;
}

function getContentById(id) {
  if (!id) return null;
  if (!projectsUICache.contentById[id]) {
    // Use getElementById once and cache
    projectsUICache.contentById[id] = document.getElementById(id) || null;
  }
  return projectsUICache.contentById[id];
}

function updateKesslerFailureWarning(project, elements) {
  try {
    const warning = elements.kesslerFailureWarning;
    const warningText = elements.kesslerFailureWarningText;
    let hazardActive = false;
    try {
      hazardActive = hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
    } catch (error) {
      hazardActive = false;
    }
    const isCollapsed = elements.projectItem?.classList?.contains('collapsed');
    if (!hazardActive || isCollapsed) {
      warning.style.display = 'none';
      return;
    }
    const failureChance = project.getKesslerFailureChance();
    const percent = Math.max(0, Math.min(1, failureChance)) * 100;
    if (percent <= 0) {
      warning.style.display = 'none';
      return;
    }
    warningText.textContent = `Kessler Skies: ${formatNumber(percent, false, 2)}% chance of project failure.`;
    warning.style.display = 'flex';
  } catch (error) {
    // no-op
  }
}

function invalidateAutomationSettingsCache(projectName) {
  const els = projectElements[projectName];
  if (els && els.automationSettingsContainer) {
    els.cachedAutomationItems = Array.from(els.automationSettingsContainer.children);
  }
}

function initializeProjectTabs() {
  if (typeof SubtabManager !== 'function') return;
  if (projectsSubtabManager) {
    projectsSubtabManager.reset();
  } else {
    projectsSubtabManager = new SubtabManager('.projects-subtab', '.projects-subtab-content', true);
    projectsSubtabManager.onActivate(id => {
      if (typeof markProjectSubtabViewed === 'function') {
        markProjectSubtabViewed(id);
      }
    });
  }
  cachedProjectSubtabContents = Array.from(document.getElementsByClassName('projects-subtab-content'));
}

function renderProjects() {
  const projectsArray = projectManager.getProjectStatuses(); // Get projects through projectManager

  syncProjectGroupState();

  // Create all project items initially
  projectsArray.forEach(project => {
    if (!projectElements[project.name]) {
      createProjectItem(project);
    }
  });

  // Update the UI for each project
  projectsArray.forEach(project => {
    updateProjectUI(project.name);
  });

  updateEmptyProjectMessages();
  updateStoryProjectsVisibility();
  updateMegaProjectsVisibility();
  updateGigaProjectsVisibility();
}

function initializeProjectsUI() {
  initializeProjectTabs();
  // Clear only the project lists, not the subtab containers
  const lists = Array.from(document.getElementsByClassName('projects-list'));
  lists.forEach(container => {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  });
  projectElements = {};
  resetProjectGroupState();
  if (importResourcesController) {
    importResourcesController.reset();
  }
  // Reset list cache; wrapper and content caches persist
  projectsUICache.listByCategory = {};
  // Refresh cached list of content containers
  cachedProjectSubtabContents = Array.from(document.getElementsByClassName('projects-subtab-content'));
  updateStoryProjectsVisibility();
  updateMegaProjectsVisibility();
  updateGigaProjectsVisibility();
}

function createProjectItem(project) {
  const importUI = getImportResourcesUI();
  if (importUI && importUI.isImportProject(project.name)) {
    importUI.createRow(project);
    return;
  }

  const projectCard = document.createElement('div');
  projectCard.classList.add('project-card');
  projectCard.dataset.projectName = project.name;
  if (projectDisplayState.collapsed[project.name]) {
    projectCard.classList.add('collapsed');
  }

  // Card Header
  const cardHeader = document.createElement('div');
  cardHeader.classList.add('card-header');

  const nameElement = document.createElement('span');
  nameElement.textContent = project.displayName || project.name;
  nameElement.classList.add('card-title');

  const groupId = getProjectGroupId(project);
  const groupNames = getGroupProjectNames(groupId);
  let groupNav = null;

  const reorderButtons = document.createElement('div');
  reorderButtons.classList.add('reorder-buttons');

  const upButton = document.createElement('button');
  upButton.innerHTML = '&#9650;';
  upButton.addEventListener('click', (e) => moveProject(project.name, 'up', e.shiftKey));
  reorderButtons.appendChild(upButton);

  const downButton = document.createElement('button');
  downButton.innerHTML = '&#9660;';
  downButton.addEventListener('click', (e) => moveProject(project.name, 'down', e.shiftKey));
  reorderButtons.appendChild(downButton);

  const headerRight = document.createElement('div');
  headerRight.classList.add('project-header-right');

  if (groupNames.length > 0) {
    const titleWrapper = document.createElement('div');
    titleWrapper.classList.add('project-title-switch');
    const leftArrow = document.createElement('button');
    leftArrow.type = 'button';
    leftArrow.classList.add('project-title-switch-button');
    leftArrow.innerHTML = '&#9664;';
    leftArrow.addEventListener('click', (event) => {
      event.stopPropagation();
      switchProjectGroup(groupId, -1);
    });
    const rightArrow = document.createElement('button');
    rightArrow.type = 'button';
    rightArrow.classList.add('project-title-switch-button');
    rightArrow.innerHTML = '&#9654;';
    rightArrow.addEventListener('click', (event) => {
      event.stopPropagation();
      switchProjectGroup(groupId, 1);
    });
    titleWrapper.append(leftArrow, nameElement);
    headerRight.append(rightArrow, reorderButtons);
    groupNav = { wrapper: titleWrapper, leftArrow, rightArrow };
  } else {
    headerRight.appendChild(reorderButtons);
  }

  const arrow = document.createElement('span');
  arrow.classList.add('collapse-arrow');
  arrow.innerHTML = projectCard.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  cardHeader.appendChild(arrow);
  if (groupNav) {
    cardHeader.appendChild(groupNav.wrapper);
    cardHeader.appendChild(headerRight);
  } else {
    cardHeader.appendChild(nameElement);
    cardHeader.appendChild(headerRight);
  }

  nameElement.addEventListener('click', () => toggleProjectCollapse(projectCard));
  arrow.addEventListener('click', () => toggleProjectCollapse(projectCard));

  projectCard.appendChild(cardHeader);

  if (project.name === 'galactic_market' || project.name === 'cargo_rocket' || project.name === 'import_colonists_1') {
    const warning = document.createElement('div');
    warning.classList.add('project-kessler-warning');
    warning.style.display = 'none';
    const warningIcon = document.createElement('span');
    warningIcon.classList.add('project-kessler-warning__icon');
    warningIcon.textContent = '⚠';
    const warningText = document.createElement('span');
    warningText.textContent = project.name === 'import_colonists_1'
      ? 'This project is currently being capped due to Kessler Skies. Imports are limited to 100 per run through a small warpgate.'
      : 'This project is currently being capped due to Kessler Skies. Its capabilities are replicated by a small warpgate.';
    const warningIconRight = document.createElement('span');
    warningIconRight.classList.add('project-kessler-warning__icon');
    warningIconRight.textContent = '⚠';
    warning.append(warningIcon, warningText, warningIconRight);
    projectCard.appendChild(warning);
    projectElements[project.name] = {
      ...projectElements[project.name],
      kesslerWarning: warning
    };
  }

  if (project.kesslerDebrisSize) {
    const warning = document.createElement('div');
    warning.classList.add('project-kessler-warning');
    warning.style.display = 'none';
    const warningIcon = document.createElement('span');
    warningIcon.classList.add('project-kessler-warning__icon');
    warningIcon.textContent = '⚠';
    const warningText = document.createElement('span');
    const warningIconRight = document.createElement('span');
    warningIconRight.classList.add('project-kessler-warning__icon');
    warningIconRight.textContent = '⚠';
    warning.append(warningIcon, warningText, warningIconRight);
    projectCard.appendChild(warning);
    projectElements[project.name] = {
      ...projectElements[project.name],
      kesslerFailureWarning: warning,
      kesslerFailureWarningText: warningText
    };
  }

  // Card Body
  const cardBody = document.createElement('div');
  cardBody.classList.add('card-body');
  
  const descriptionElement = document.createElement('p');
  descriptionElement.textContent = project.description;
  descriptionElement.classList.add('project-description');
  cardBody.appendChild(descriptionElement);

  const projectDetails = document.createElement('div');
  projectDetails.classList.add('project-details');

  // Cost
  if (project.cost && Object.keys(project.cost).length > 0) {
    const costElement = document.createElement('p');
    costElement.classList.add('project-cost');
    const label = document.createElement('strong');
    label.textContent = 'Cost:';
    costElement.append(label, ' ');
    const list = document.createElement('span');
    costElement.appendChild(list);
    const costItems = {};
    const items = [];
    for (const category in project.cost) {
      for (const resource in project.cost[category]) {
        if (project.cost[category][resource] > 0) {
          items.push({ category, resource });
        }
      }
    }
    items.forEach((item, idx) => {
      const span = document.createElement('span');
      list.appendChild(span);
      if (idx < items.length - 1) {
        list.appendChild(document.createTextNode(', '));
      }
      costItems[`${item.category}.${item.resource}`] = span;
    });
    projectDetails.appendChild(costElement);
    projectElements[project.name] = {
      ...projectElements[project.name],
      costElement: costElement,
      costItems: costItems,
      costList: list
    };
  }

  // Sustain Cost
  if (project.sustainCost) {
    const sustainContainer = document.createElement('p');
    sustainContainer.classList.add('project-sustain-cost');
    const sustainText = document.createElement('span');
    const info = document.createElement('span');
    info.classList.add('info-tooltip-icon');
    info.title = 'Project will pause if sustain cost is not met.';
    info.innerHTML = '&#9432;';
    sustainContainer.append(sustainText, info);
    projectDetails.appendChild(sustainContainer);
    projectElements[project.name] = { ...projectElements[project.name], sustainCostElement: sustainText };
  }

  // Repeat Count / Depth Display
  if ((project.repeatable && project.maxRepeatCount !== Infinity) ||
      (typeof DeeperMiningProject !== 'undefined' && project instanceof DeeperMiningProject && project.maxDepth !== Infinity)) {
    const repeatCountElement = document.createElement('p');
    repeatCountElement.id = `${project.name}-repeat-count`;
    projectDetails.appendChild(repeatCountElement);
    projectElements[project.name] = { ...projectElements[project.name], repeatCountElement: repeatCountElement };
  }

  // Resource Gain
  if (project.attributes?.resourceGain) {
    const resourceGainElement = document.createElement('p');
    resourceGainElement.classList.add('project-resource-gain');
    resourceGainElement.id = `${project.name}-resource-gain`;
    const gainLabel = document.createElement('strong');
    gainLabel.textContent = 'Gain:';
    resourceGainElement.append(gainLabel, ' ');
    const gainList = document.createElement('span');
    resourceGainElement.appendChild(gainList);
    const gainItems = {};
    const items = [];
    for (const category in project.attributes.resourceGain) {
      for (const resource in project.attributes.resourceGain[category]) {
        if (project.attributes.resourceGain[category][resource] !== 0) {
          items.push({ category, resource });
        }
      }
    }
    items.forEach((item, idx) => {
      const span = document.createElement('span');
      gainList.appendChild(span);
      if (idx < items.length - 1) {
        gainList.appendChild(document.createTextNode(', '));
      }
      gainItems[`${item.category}.${item.resource}`] = span;
    });
    projectDetails.appendChild(resourceGainElement);
    projectElements[project.name] = {
      ...projectElements[project.name],
      resourceGainElement: resourceGainElement,
      resourceGainItems: gainItems
    };
  }
  
  cardBody.appendChild(projectDetails);

  if (typeof project.renderUI === 'function') {
    project.renderUI(cardBody);
  }

  projectCard.appendChild(cardBody);

  // Card Footer
  const cardFooter = document.createElement('div');
  cardFooter.classList.add('card-footer');

  // Progress Button
  const progressButtonContainer = document.createElement('div');
  progressButtonContainer.classList.add('progress-button-container');
  const progressButton = document.createElement('button');
  progressButton.classList.add('progress-button');
  progressButton.style.width = '100%';
  progressButton.addEventListener('click', () => startProjectWithSelectedResources(project));
  progressButtonContainer.appendChild(progressButton);
  cardFooter.appendChild(progressButtonContainer);

  // Checkboxes
  const automationSettingsContainer = document.createElement('div');
  automationSettingsContainer.classList.add('automation-settings-container');

  const autoStartCheckboxContainer = document.createElement('div');
  autoStartCheckboxContainer.classList.add('checkbox-container');
  const autoStartCheckbox = document.createElement('input');
  autoStartCheckbox.type = 'checkbox';
  autoStartCheckbox.id = `${project.name}-auto-start`;
  autoStartCheckbox.addEventListener('change', (event) => { project.autoStart = event.target.checked; });
  const autoStartLabel = document.createElement('label');
  autoStartLabel.htmlFor = `${project.name}-auto-start`;
  autoStartLabel.textContent = 'Auto start';
  autoStartCheckboxContainer.appendChild(autoStartCheckbox);
  autoStartCheckboxContainer.appendChild(autoStartLabel);
  automationSettingsContainer.appendChild(autoStartCheckboxContainer);

  const showTravelReset = project.name !== 'dysonSwarmReceiver' &&
    (project.attributes?.spaceStorage ||
    project.attributes?.canUseSpaceStorage);
  let autoStartTravelResetCheckbox = null;
  let autoStartTravelResetLabel = null;
  if (showTravelReset) {
    const autoStartTravelResetContainer = document.createElement('div');
    autoStartTravelResetContainer.classList.add('checkbox-container');
    autoStartTravelResetCheckbox = document.createElement('input');
    autoStartTravelResetCheckbox.type = 'checkbox';
    autoStartTravelResetCheckbox.id = `${project.name}-auto-start-travel-reset`;
    autoStartTravelResetCheckbox.checked = project.autoStartUncheckOnTravel === true;
    autoStartTravelResetCheckbox.addEventListener('change', (event) => {
      project.autoStartUncheckOnTravel = event.target.checked;
      if (project.name === 'dysonSwarmReceiver' && typeof updateDysonSwarmUI === 'function') {
        updateDysonSwarmUI(project);
      }
    });
    autoStartTravelResetLabel = document.createElement('label');
    autoStartTravelResetLabel.htmlFor = autoStartTravelResetCheckbox.id;
    autoStartTravelResetLabel.textContent = 'Uncheck on travelling';
    autoStartTravelResetContainer.appendChild(autoStartTravelResetCheckbox);
    autoStartTravelResetContainer.appendChild(autoStartTravelResetLabel);
    automationSettingsContainer.appendChild(autoStartTravelResetContainer);
  }

  let allowColonyEnergyCheckbox = null;
  let allowColonyEnergyContainer = null;
  if (project.attributes?.canUseDysonOverflow) {
    allowColonyEnergyContainer = document.createElement('div');
    allowColonyEnergyContainer.classList.add('checkbox-container');
    allowColonyEnergyCheckbox = document.createElement('input');
    allowColonyEnergyCheckbox.type = 'checkbox';
    allowColonyEnergyCheckbox.id = `${project.name}-allow-colony-energy`;
    allowColonyEnergyCheckbox.checked = project.allowColonyEnergyUse === true;
    allowColonyEnergyCheckbox.addEventListener('change', (event) => {
      project.setAllowColonyEnergyUse(event.target.checked);
    });
    const allowColonyEnergyLabel = document.createElement('label');
    allowColonyEnergyLabel.htmlFor = allowColonyEnergyCheckbox.id;
    allowColonyEnergyLabel.textContent = 'Allow Colony Energy Use';
    allowColonyEnergyContainer.appendChild(allowColonyEnergyCheckbox);
    allowColonyEnergyContainer.appendChild(allowColonyEnergyLabel);
    automationSettingsContainer.appendChild(allowColonyEnergyContainer);
  }
  cardFooter.appendChild(automationSettingsContainer);

  projectCard.appendChild(cardFooter);

  // Store elements
  projectElements[project.name] = {
    ...projectElements[project.name],
    projectItem: projectCard,
    cardBody: cardBody,
    collapseArrow: arrow,
    groupId: groupId,
    groupNav: groupNav,
    progressButton: progressButton,
    autoStartCheckbox: autoStartCheckbox,
    autoStartCheckboxContainer: autoStartCheckboxContainer,
    autoStartLabel: autoStartLabel,
    autoStartTravelResetCheckbox: autoStartTravelResetCheckbox,
    autoStartTravelResetLabel: autoStartTravelResetLabel,
    automationSettingsContainer: automationSettingsContainer,
    allowColonyEnergyCheckbox,
    allowColonyEnergyContainer,
    cardFooter: cardFooter,
    upButton: upButton,
    downButton: downButton
  };
  if (typeof project.renderAutomationUI === 'function') {
    project.renderAutomationUI(automationSettingsContainer);
  }
  // Always cache automation items so projects without custom automation UI
  // (e.g., simple one-off projects) still show their auto-start controls.
  invalidateAutomationSettingsCache(project.name);

  const categoryContainer = getOrCreateCategoryContainer(project.category || 'resources');
  categoryContainer.appendChild(projectCard);
}

function getOrCreateCategoryContainer(category) {
  // Return the inner list element for the given category
  let list = projectsUICache.listByCategory[category];
  if (list && list.isConnected) return list;

  // Prefer existing list in markup
  list = document.getElementById(`${category}-projects-list`);
  if (list) {
    projectsUICache.listByCategory[category] = list;
    return list;
  }

  // If missing (e.g., dynamic category), create list inside its content panel
  const content = getContentById(`${category}-projects`);
  if (content) {
    const newList = document.createElement('div');
    newList.classList.add('projects-list');
    newList.id = `${category}-projects-list`;
    content.appendChild(newList);
    projectsUICache.listByCategory[category] = newList;
    return newList;
  }

  // Fallback: attach to the first content container to avoid losing UI (should not happen)
  const anyContent = getProjectSubtabContents()[0] || document.body;
  const fallback = document.createElement('div');
  fallback.classList.add('projects-list');
  fallback.id = `${category}-projects-list`;
  anyContent.appendChild(fallback);
  projectsUICache.listByCategory[category] = fallback;
  return fallback;
}

function isProjectVisibleForOrder(project) {
  if (!project || !projectManager.isProjectRelevantToCurrentPlanet(project)) return false;
  if (project.isPermanentlyDisabled && project.isPermanentlyDisabled()) return false;
  const visibilityCheck = project.isVisible;
  const resolvedVisibility = visibilityCheck && visibilityCheck.call
    ? visibilityCheck.call(project)
    : visibilityCheck;
  const unlocked = resolvedVisibility === undefined ? project.unlocked : resolvedVisibility;
  return !!unlocked;
}

function getImportProjectNames() {
  const importUI = getImportResourcesUI();
  if (importUI && importUI.getProjectNames) {
    return importUI.getProjectNames();
  }
  if (projectManager && projectManager.getImportProjectNames) {
    return projectManager.getImportProjectNames();
  }
  return [];
}

function getCategoryEntries(category) {
  const entries = [];
  const importNames = getImportProjectNames();
  const importSet = new Set(importNames);
  const categoryKey = category || 'general';
  let importEntry = null;
  const groupEntries = {};

  projectManager.projectOrder.forEach((projectName) => {
    const project = projectManager.projects[projectName];
    if (!project) return;
    const projectCategory = project.category || 'general';
    if (projectCategory !== categoryKey) return;
    const visible = isProjectVisibleForOrder(project);
    if (importSet.has(projectName)) {
      if (!importEntry) {
        importEntry = { type: 'import', names: [], project, visible: false };
        entries.push(importEntry);
      }
      if (!importEntry.names.includes(projectName)) {
        importEntry.names.push(projectName);
      }
      importEntry.visible = importEntry.visible || visible;
      return;
    }
    const groupId = getProjectGroupId(project);
    const groupNames = getGroupProjectNames(groupId);
    if (groupNames.length > 0) {
      let groupEntry = groupEntries[groupId];
      if (!groupEntry) {
        groupEntry = { type: 'group', groupId, names: [], project, visible: false };
        groupEntries[groupId] = groupEntry;
        entries.push(groupEntry);
      }
      if (!groupEntry.names.includes(projectName)) {
        groupEntry.names.push(projectName);
      }
      groupEntry.visible = groupEntry.visible || visible;
      return;
    }
    entries.push({ type: 'project', name: projectName, project, visible });
  });

  return entries;
}

function expandCategoryEntries(entries) {
  const orderedNames = [];
  const importNames = getImportProjectNames();

  entries.forEach((entry) => {
    if (entry.type === 'import') {
      const names = entry.names.length ? entry.names.slice() : [];
      importNames.forEach((name) => {
        if (!names.includes(name)) {
          names.push(name);
        }
      });
      orderedNames.push(...names);
      return;
    }
    if (entry.type === 'group') {
      orderedNames.push(...entry.names);
      return;
    }
    orderedNames.push(entry.name);
  });

  return orderedNames;
}

function getEntryElements(entry) {
  if (entry.type === 'import') {
    const importUI = getImportResourcesUI();
    const headerName = importUI ? importUI.getHeaderProjectName() : null;
    return headerName ? projectElements[headerName] : null;
  }
  if (entry.type === 'group') {
    const activeName = getActiveGroupProjectName(entry.groupId);
    return activeName ? projectElements[activeName] : null;
  }
  return projectElements[entry.name];
}

function getEntryCards(entry) {
  if (entry.type === 'group') {
    return entry.names.map((name) => projectElements[name]?.projectItem).filter(Boolean);
  }
  const elements = getEntryElements(entry);
  return elements && elements.projectItem ? [elements.projectItem] : [];
}

function syncCategoryDomOrder(category, entries) {
  const container = getOrCreateCategoryContainer(category || 'general');
  const seen = new Set();

  entries.forEach((entry) => {
    const cards = getEntryCards(entry);
    cards.forEach((card) => {
      if (!card || seen.has(card)) {
        return;
      }
      seen.add(card);
      container.appendChild(card);
    });
  });
}

function updateCategoryReorderButtons(category, entries) {
  const list = entries || getCategoryEntries(category);
  const visibleEntries = list.filter(entry => entry.visible);
  const indexMap = new Map();
  visibleEntries.forEach((entry, idx) => indexMap.set(entry, idx));
  const lastVisible = visibleEntries.length - 1;

  list.forEach((entry) => {
    const elements = getEntryElements(entry);
    if (!elements) {
      return;
    }
    const position = indexMap.has(entry) ? indexMap.get(entry) : -1;
    if (elements.upButton) {
      elements.upButton.classList.toggle('disabled', position <= 0);
    }
    if (elements.downButton) {
      elements.downButton.classList.toggle('disabled', position === -1 || position >= lastVisible);
    }
  });
}

function moveProject(projectName, direction, shiftKey = false) {
  const project = projectManager.projects[projectName];
  if (!project) return;
  const category = project.category || 'general';
  const entries = getCategoryEntries(category);
  const entry = entries.find(item =>
    item.type === 'import' || item.type === 'group'
      ? item.names.includes(projectName)
      : item.name === projectName
  );
  if (!entry) return;

  const visibleEntries = entries.filter(item => item.visible);
  const fromVisibleIndex = visibleEntries.indexOf(entry);
  if (fromVisibleIndex === -1) return;

  const targetVisibleIndex = shiftKey
    ? (direction === 'up' ? 0 : visibleEntries.length - 1)
    : fromVisibleIndex + (direction === 'up' ? -1 : 1);

  if (targetVisibleIndex < 0 || targetVisibleIndex >= visibleEntries.length || targetVisibleIndex === fromVisibleIndex) {
    return;
  }

  const targetEntry = visibleEntries[targetVisibleIndex];
  const fromIndex = entries.indexOf(entry);
  entries.splice(fromIndex, 1);
  const toIndex = entries.indexOf(targetEntry) + (direction === 'up' ? 0 : 1);
  entries.splice(toIndex, 0, entry);

  const orderedNames = expandCategoryEntries(entries);
  projectManager.reorderCategoryProjects(category, orderedNames);
  projectGroupConfig = null;
  syncCategoryDomOrder(category, entries);
  updateCategoryReorderButtons(category, entries);

  const projectsToUpdate = projectManager.getProjectStatuses();
  projectsToUpdate.forEach(p => updateProjectUI(p.name));
}

function getUpdatedResourceGain(project) {
  const updatedResourceGain = project.getEffectiveResourceGain;
  return updatedResourceGain;
}


function updateCostDisplay(project) {
  const elements = projectElements[project.name];
  if (elements && elements.costItems) {
    const cost = project.getScaledCost();
    let hasItem = false;
    const storageProj = project.attributes?.canUseSpaceStorage ? projectManager?.projects?.spaceStorage : null;
    for (const key in elements.costItems) {
      const [category, resource] = key.split('.');
      const item = elements.costItems[key];
      const requiredAmount = cost[category]?.[resource];
      if (requiredAmount > 0) {
        const hasPreviousItem = hasItem;
        hasItem = true;
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const storageAmount = storageProj ? storageProj.getAvailableStoredResource(storageKey) : 0;
        const availableAmount = (resources[category]?.[resource]?.value || 0) + storageAmount;
        const resourceDisplayName = resources[category]?.[resource]?.displayName ||
          resource.charAt(0).toUpperCase() + resource.slice(1);
        const prefix = item.dataset.leadingComma === 'true' && hasPreviousItem ? ', ' : '';
        item.textContent = `${prefix}${resourceDisplayName}: ${formatNumber(requiredAmount, true)}`;
        const highlight = availableAmount < requiredAmount &&
          !(project.ignoreCostForResource && project.ignoreCostForResource(category, resource));
        item.style.color = highlight ? 'red' : '';
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    }
    elements.costElement.style.display = hasItem ? 'block' : 'none';
  }
}

function updateSustainCostDisplay(project) {
  const elements = projectElements[project.name];
  if (elements && elements.sustainCostElement && project.sustainCost) {
    const costArray = [];
    for (const category in project.sustainCost) {
      for (const resource in project.sustainCost[category]) {
        const perSecond = project.sustainCost[category][resource];
        const resourceDisplayName = resources[category][resource].displayName || resource;
        costArray.push(`${resourceDisplayName}: ${formatNumber(perSecond, true)}/s`);
      }
    }
    if (costArray.length > 0) {
      elements.sustainCostElement.textContent = `Sustain: ${costArray.join(', ')}`;
      elements.sustainCostElement.parentElement.style.display = 'block';
    } else {
      elements.sustainCostElement.parentElement.style.display = 'none';
    }
  }
}

function updateTotalCostDisplay(project) {
  if (globalThis.GalacticMarketProject && project instanceof globalThis.GalacticMarketProject) {
    const elements = projectElements[project.name] || {};
    const { rowMeta = [] } = elements;

    if (!elements.buyInputs || elements.buyInputs.some((input) => !input.isConnected)) {
      elements.buyInputs = Array.from(
        elements.resourceSelectionContainer?.querySelectorAll(`.buy-selection-${project.name}`) || []
      );
    }

    if (!elements.sellInputs || elements.sellInputs.some((input) => !input.isConnected)) {
      elements.sellInputs = Array.from(
        elements.resourceSelectionContainer?.querySelectorAll(`.sell-selection-${project.name}`) || []
      );
    }

    let totalCost = 0;

    rowMeta.forEach((meta, index) => {
      const buyInput = elements.buyInputs?.[index];
      const sellInput = elements.sellInputs?.[index];
      const storedBuy = buyInput ? Number(buyInput.dataset.quantity) : NaN;
      const storedSell = sellInput ? Number(sellInput.dataset.quantity) : NaN;
      const buyQuantity = Number.isFinite(storedBuy) ? storedBuy : (buyInput ? parseSelectionQuantity(buyInput.value) : 0);
      const sellQuantity = Number.isFinite(storedSell) ? storedSell : (sellInput ? parseSelectionQuantity(sellInput.value) : 0);
      const buyPrice = project.getBuyPrice(meta.category, meta.resource);
      const sellPrice = project.getSellPrice(meta.category, meta.resource, sellQuantity);
      totalCost += buyQuantity * buyPrice;
      totalCost -= sellQuantity * sellPrice;
    });

    const totalCostValue = elements.totalCostValue;
    const totalCostLabel = elements.totalCostLabel;
    if (totalCostValue && totalCostLabel) {
      const available = resources.colony?.funding?.value || 0;
      if (totalCost < 0) {
        totalCostLabel.textContent = 'Total Gain: ';
        totalCostValue.textContent = formatNumber(-totalCost, true);
      } else {
        totalCostLabel.textContent = 'Total Cost: ';
        totalCostValue.textContent = formatNumber(totalCost, true);
      }
      const highlight = project.isContinuous()
        ? project.shortfallLastTick
        : totalCost > 0 && available < totalCost;
      totalCostValue.style.color = highlight ? 'red' : '';
    }
    return;
  }

  let totalCost = 0;

  const elements = projectElements[project.name] || {};
  let quantityInputs = elements.selectionInputs || [];

  if (!quantityInputs.length || quantityInputs.some((i) => !i.isConnected)) {
    if (typeof invalidateCargoSelectionCache === 'function') {
      invalidateCargoSelectionCache(project);
      quantityInputs = elements.selectionInputs || [];
    } else if (elements.resourceSelectionContainer) {
      quantityInputs = Array.from(
        elements.resourceSelectionContainer.querySelectorAll(
          `.resource-selection-${project.name}`
        )
      );
      elements.selectionInputs = quantityInputs;
    }
  }

  quantityInputs.forEach((input) => {
    const category = input?.dataset?.category;
    const resource = input?.dataset?.resource;
    if (typeof category !== 'string' || typeof resource !== 'string') {
      return;
    }
    const raw = input.value;
    const parsed = Number.isFinite(raw)
      ? raw
      : Number.parseInt(`${raw ?? ''}`, 10);
    const quantity = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const basePrice = project.attributes.resourceChoiceGainCost?.[category]?.[resource];
    if (typeof basePrice !== 'number') return;
    if (resource === 'spaceships' && typeof project.getSpaceshipTotalCost === 'function') {
      totalCost += project.getSpaceshipTotalCost(quantity, basePrice);
    } else {
      totalCost += quantity * basePrice;
    }
  });

  const totalCostValue = elements.totalCostValue;
  if (totalCostValue) {
    totalCostValue.textContent = formatNumber(totalCost, true);
    const available = resources.colony?.funding?.value || 0;
    const highlight = project.isContinuous()
      ? project.shortfallLastTick
      : available < totalCost;
    totalCostValue.style.color = highlight ? 'red' : '';
  }
}

function updateProjectGroupNavigation(project, elements) {
  if (!elements.groupNav) {
    return;
  }
  const groupId = elements.groupId;
  const visibleNames = getVisibleGroupProjectNames(groupId);
  const showArrows = visibleNames.length > 1;
  elements.groupNav.leftArrow.style.display = showArrows ? '' : 'none';
  elements.groupNav.rightArrow.style.display = showArrows ? '' : 'none';
  elements.groupNav.leftArrow.disabled = !showArrows;
  elements.groupNav.rightArrow.disabled = !showArrows;
}

function updateProjectUI(projectName) {
  const project = projectManager.projects[projectName]; // Use projectManager to get project
  const elements = projectElements[projectName];
  const importUI = getImportResourcesUI();
  const isImportProject = !!(importUI && importUI.isImportProject(projectName));

  if (!elements) {
    console.error(`UI elements for project "${projectName}" are undefined.`);
    return;
  }

  // Update the project item's visibility based on project visibility
  const projectItem = elements.projectItem;
  if (projectItem) {
    const groupId = elements.groupId;
    const isGroupActive = !groupId || getActiveGroupProjectName(groupId) === project.name;
    const planetOk =
      !project.attributes.planet ||
      (typeof spaceManager !== 'undefined' &&
        spaceManager.getCurrentPlanetKey &&
        spaceManager.getCurrentPlanetKey() === project.attributes.planet);
    const visible = !(project.isPermanentlyDisabled?.()) && (typeof project.isVisible === 'function' ? project.isVisible() : project.unlocked);

    if (isImportProject && importUI) {
      const rowVisible = visible && planetOk && isGroupActive;
      if (!importUI.updateVisibility(project, elements, rowVisible)) {
        return;
      }
    } else if (visible && planetOk && isGroupActive) {
      projectItem.style.display = 'block';
    } else {
      projectItem.style.display = 'none';
      return;
    }
  }

  updateProjectGroupNavigation(project, elements);

  if (project.name === 'galactic_market' || project.name === 'cargo_rocket') {
    project.updateKesslerWarning();
  }

  updateKesslerFailureWarning(project, elements);


  // Update Spaceships Assigned display if applicable
  if (elements?.assignedSpaceshipsDisplay && project.assignedSpaceships != null) {
    const maxShips = typeof project.getMaxAssignableShips === 'function'
      ? project.getMaxAssignableShips()
      : null;
    const assignedText = isImportProject
      ? formatNumber(project.assignedSpaceships, true)
      : formatShipCount(project.assignedSpaceships);
    if (isImportProject && importUI) {
      importUI.updateAssignedDisplay(elements, assignedText, maxShips);
    } else {
      elements.assignedSpaceshipsDisplay.textContent =
        maxShips != null
          ? `Spaceships Assigned: ${assignedText}/${formatShipCount(maxShips)}`
          : `Spaceships Assigned: ${assignedText}`;
    }
  }

  // Update Repeat Count / Depth display if applicable
  if (elements.repeatCountElement) {
    if (typeof DeeperMiningProject !== 'undefined' && project instanceof DeeperMiningProject) {
      elements.repeatCountElement.textContent = `Average depth: ${formatNumber(project.averageDepth, true)} / ${formatNumber(project.maxDepth, true)}`;
      project.updateUnderworldMiningUI(elements);
      elements.underworldSection.style.display = project.isBooleanFlagSet('underworld_mining') ? 'flex' : 'none';
    } else {
      elements.repeatCountElement.textContent = `Completed: ${project.repeatCount} / ${project.maxRepeatCount}`;
    }
  }

  // Set the auto-start checkbox state based on the project data
  if (elements.autoStartCheckbox) {
    elements.autoStartCheckbox.checked = project.autoStart || false;
  }
  if (elements.autoStartTravelResetCheckbox) {
    elements.autoStartTravelResetCheckbox.checked = project.autoStartUncheckOnTravel === true;
  }
  if (elements.autoStartLabel) {
    const continuous = project.isContinuous();
    elements.autoStartLabel.textContent = continuous ? 'Run' : 'Auto start';
  }

  if (elements.allowColonyEnergyCheckbox) {
    elements.allowColonyEnergyCheckbox.checked = project.allowColonyEnergyUse === true;
  }


  if (elements.waitCapacityCheckbox) {
    elements.waitCapacityCheckbox.checked = project.waitForCapacity !== false;
  }

  // Update Resource Gain Information if applicable
  if (elements.resourceGainItems && project.attributes?.resourceGain) {
    const updatedResourceGain = project.getEffectiveResourceGain();
    let hasItem = false;
    for (const key in elements.resourceGainItems) {
      const [category, resource] = key.split('.');
      const item = elements.resourceGainItems[key];
      const amount = updatedResourceGain[category]?.[resource];
      if (amount != null && amount !== 0) {
        hasItem = true;
        item.textContent = `${resources[category][resource].displayName}: ${formatNumber(amount, true)}`;
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    }
    elements.resourceGainElement.style.display = hasItem ? 'block' : 'none';
  }

  // Update the cost display, highlighting missing resources in red
  if (elements.costElement) {
    updateCostDisplay(project); // Refresh the cost display with scaled cost
  }
  if (elements.sustainCostElement) {
    updateSustainCostDisplay(project);
  }

  // Check if the project has reached its maximum repeat count or is completed and not repeatable
  const isMaxRepeatReached =
    (typeof DeeperMiningProject !== 'undefined' && project instanceof DeeperMiningProject)
      ? project.averageDepth >= project.maxDepth
      : project.repeatable && project.repeatCount >= project.maxRepeatCount;
  const isCompletedAndNotRepeatable = project.isCompleted && !project.repeatable;
  const shouldHideStartBar = project.shouldHideStartBar();

  if (isMaxRepeatReached || isCompletedAndNotRepeatable) {
    // Hide cost and progress button if the project can't be repeated anymore
    if (elements.costElement) {
      elements.costElement.style.display = 'none';
    }
    if (elements.progressButton) {
      elements.progressButton.style.display = 'none';
    }
    // Hide the auto-start checkbox container if the project can't be repeated anymore
    if (elements.autoStartCheckboxContainer) {
      elements.autoStartCheckboxContainer.style.display = 'none';
    }
    if (elements.automationSettingsContainer) {
      elements.automationSettingsContainer.style.display = 'none';
    }
  } else {
    // If the project can still be repeated or started, show the relevant UI elements
    if (elements.costElement) {
      elements.costElement.style.display = 'block';
    }
    if (elements.progressButton) {
      if (shouldHideStartBar) {
        elements.progressButton.style.display = 'none';
      } else {
        elements.progressButton.style.display = 'block';

        // Update the duration in the progress bar display
        const isContinuousProject = project.isContinuous();
        if (!project.isActive && !project.isCompleted && project.isKesslerDisabled()) {
          const statusText = 'Disabled by Kessler';
          if (isImportProject && importUI) {
            importUI.setProgressLabel(elements, project, statusText);
          } else {
            elements.progressButton.textContent = statusText;
          }
          elements.progressButton.style.background = '#f44336';
        } else if (isContinuousProject) {
          const showProductivity = project.attributes?.continuousAsBuilding;
          const productivity = project.continuousProductivity ?? 1;
          const productivityLabel = showProductivity
            ? ` (${Math.round(productivity * 100)}% productivity)`
            : '';
          if (project.autoStart && project.isActive && !project.isPaused) {
            const statusText = `Continuous${productivityLabel}`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, statusText);
            } else {
              elements.progressButton.textContent = statusText;
            }
            elements.progressButton.style.background = '#4caf50';
          } else {
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, 'Stopped');
            } else {
              elements.progressButton.textContent = 'Stopped';
            }
            elements.progressButton.style.background = '#f44336';
          }
        } else if (project.isActive) {
          const timeRemaining = Math.max(0, project.remainingTime / 1000).toFixed(2);
          const progressPercent = project.getProgress();
          if (project.startingDuration < 1000) {
            const statusText = `In Progress: ${timeRemaining} seconds remaining`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, statusText);
            } else {
              elements.progressButton.textContent = statusText;
            }
            // Avoid flashy gradients for instant projects
            elements.progressButton.style.background = '#4caf50';
          } else {
            const statusText = `In Progress: ${timeRemaining} seconds remaining (${progressPercent}%)`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, statusText);
            } else {
              elements.progressButton.textContent = statusText;
            }
            elements.progressButton.style.background = `linear-gradient(to right, #4caf50 ${progressPercent}%, #ccc ${progressPercent}%)`;
          }
        } else if (project.isCompleted) {
          if (isImportProject && importUI) {
            importUI.setProgressLabel(elements, project, 'Completed');
          } else {
            elements.progressButton.textContent = `Completed: ${project.displayName}`;
          }
          elements.progressButton.style.background = '#4caf50';
        } else if (project.isPaused) {
          const timeRemaining = Math.max(0, project.remainingTime / 1000).toFixed(2);
          if (typeof SpaceStorageProject !== 'undefined' && project instanceof SpaceStorageProject) {
            const statusText = `Resume storage expansion (${timeRemaining}s left)`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, statusText);
            } else {
              elements.progressButton.textContent = statusText;
            }
          } else {
            const statusText = `Resume ${project.displayName} (${timeRemaining}s left)`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, `Resume (${timeRemaining}s left)`);
            } else {
              elements.progressButton.textContent = statusText;
            }
          }
          elements.progressButton.style.background = project.canStart() ? '#4caf50' : '#f44336';
        } else {
          // Update dynamic duration for spaceMining projects
          let duration = project.getEffectiveDuration();
          if (typeof SpaceStorageProject !== 'undefined' && project instanceof SpaceStorageProject) {
            const statusText = `Start storage expansion (Duration: ${(duration / 1000).toFixed(2)} seconds)`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, statusText);
            } else {
              elements.progressButton.textContent = statusText;
            }
          } else {
            const statusText = `Start ${project.displayName} (Duration: ${(duration / 1000).toFixed(2)} seconds)`;
            if (isImportProject && importUI) {
              importUI.setProgressLabel(elements, project, `Start (Duration: ${(duration / 1000).toFixed(2)} seconds)`);
            } else {
              elements.progressButton.textContent = statusText;
            }
          }

          // Set background color based on whether the project can start
          if (project.canStart()) {
            elements.progressButton.style.background = '#4caf50'; // Green if it can be started
          } else {
            elements.progressButton.style.background = '#f44336'; // Red if it cannot be started
          }
        }
      }
    }
    // Show the auto-start checkbox if the project can be repeated
    if (elements.autoStartCheckboxContainer && projectManager.isBooleanFlagSet('automateSpecialProjects') && !shouldHideStartBar) {
      elements.autoStartCheckboxContainer.style.display = 'flex';
      // Wait capacity visibility handled by project subclass
    }
    else {
      elements.autoStartCheckboxContainer.style.display = 'none';
      // Wait capacity visibility handled by project subclass
    }
  }
  if (typeof project.updateUI === 'function') {
    project.updateUI();
  }

  if (typeof AndroidProject !== 'undefined' &&
      project instanceof AndroidProject &&
      !elements.assignedAndroidsDisplay &&
      elements.cardBody) {
    project.createAndroidAssignmentUI(elements.cardBody);
  }





  // Final visibility check for the footer and its contents
  const footer = elements.cardFooter;
  if (footer) {
    const automationSettingsContainer = elements.automationSettingsContainer;
    let hasVisibleAutomationItems = false;

    if (automationSettingsContainer) {
      const shouldHideAutomation = isMaxRepeatReached || isCompletedAndNotRepeatable;
      const items = elements.cachedAutomationItems?.length
        ? elements.cachedAutomationItems
        : Array.from(automationSettingsContainer.children || []);
      if (!shouldHideAutomation) {
        hasVisibleAutomationItems = items.some(child =>
          child &&
          child.nodeType === 1 &&
          getComputedStyle(child).display !== 'none'
        );
      }
      automationSettingsContainer.style.display = !shouldHideAutomation && hasVisibleAutomationItems ? 'flex' : 'none';
    }

    let progressButtonVisible = false;
    if (
      elements.progressButton &&
      (elements.progressButton.nodeType === 1 || elements.progressButton instanceof Element) &&
      typeof getComputedStyle === 'function'
    ) {
      progressButtonVisible = getComputedStyle(elements.progressButton).display !== 'none';
    }

    // Hide the footer if both the progress button and all automation items are hidden
    if (progressButtonVisible || hasVisibleAutomationItems) {
      footer.style.display = 'flex';
    } else {
      footer.style.display = 'none';
    }
  }

  updateCategoryReorderButtons(project.category || 'general');

  if (!project.unlocked && project.name === 'dysonSwarmReceiver' && project.collectors > 0) {
    if (elements.progressButton) elements.progressButton.style.display = 'none';
    if (elements.autoStartCheckboxContainer) elements.autoStartCheckboxContainer.style.display = 'none';
    if (elements.cardFooter) elements.cardFooter.style.display = 'none';
  }
}


function startProjectWithSelectedResources(project) {
  if (project.isPaused) {
    if (!project.resume()) {
    }
  } else if (project.canStart()) {
    projectManager.startProject(project.name);
  } else {
  }
}

function formatTotalCostDisplay(totalCost, project, perSecond = false) {
  const costArray = [];
  const suffix = perSecond ? '/s' : '';
  for (const category in totalCost) {
    for (const resource in totalCost[category]) {
      const requiredAmount = totalCost[category][resource];
      const availableAmount = resources[category]?.[resource]?.value || 0;

      const resourceDisplayName = resources[category][resource].displayName ||
        resource.charAt(0).toUpperCase() + resource.slice(1);

      // Check if the player has enough of this resource
      const resourceText = `${resourceDisplayName}: ${formatNumber(requiredAmount, true)}${suffix}`;
      const continuous = project && typeof project.isContinuous === 'function' && project.isContinuous();
      const highlight = continuous
        ? project.shortfallLastTick
        : availableAmount < requiredAmount &&
          !(project && project.ignoreCostForResource && project.ignoreCostForResource(category, resource));
      const formattedResourceText = highlight
        ? `<span style="color: red;">${resourceText}</span>`
        : resourceText;

      costArray.push(formattedResourceText);
    }
  }
  return `Total Cost: ${costArray.join(', ')}`;
}



const ATMOSPHERIC_GAS_IMPORTS = new Set(['carbonDioxide', 'inertGas', 'hydrogen']);

function formatTotalResourceGainDisplay(totalResourceGain, perSecond = false) {
  const gainArray = [];
  const suffix = perSecond ? '/s' : '';
  const pressureSuffix = `Pa${suffix}`;
  for (const category in totalResourceGain) {
    for (const resource in totalResourceGain[category]) {
      const resourceDisplayName = resources[category][resource].displayName ||
        resource.charAt(0).toUpperCase() + resource.slice(1);
      const amount = totalResourceGain[category][resource];
      let entry = `${resourceDisplayName}: ${formatNumber(amount, true)}${suffix}`;
      if (category === 'atmospheric' && ATMOSPHERIC_GAS_IMPORTS.has(resource)) {
        const { gravity, radius } = terraforming.celestialParameters;
        const pressure = calculateAtmosphericPressure(amount, gravity, radius);
        entry += ` / ${formatNumber(pressure, true, 1, true)}${pressureSuffix}`;
      }
      gainArray.push(entry);
    }
  }
  return `Total Gain: ${gainArray.join(', ')}`;
}

function updateEmptyProjectMessages() {
  getProjectSubtabContents().forEach(container => {
    const messageId = `${container.id}-empty-message`;
    let message = document.getElementById(messageId);

    const hasVisible = Array.from(container.getElementsByClassName('project-card'))
      .some(item => item.style.display !== 'none');

    if (!hasVisible) {
      if (!message) {
        message = document.createElement('p');
        message.id = messageId;
        message.classList.add('empty-message');
        message.textContent = 'Nothing available for now.';
        container.appendChild(message);
      }
    } else if (message) {
      message.remove();
    }
  });
}

function updateCategoryProjectsVisibility(category, subtabId) {
  let visible = false;
  if (typeof projectManager !== 'undefined' && projectManager.projects) {
    visible = Object.values(projectManager.projects).some(p => {
      const planetOk = !p.attributes.planet ||
        (typeof spaceManager !== 'undefined' && spaceManager.getCurrentPlanetKey &&
         spaceManager.getCurrentPlanetKey() === p.attributes.planet);
      return (
        p.category === category &&
        planetOk &&
        !(p.isPermanentlyDisabled?.()) &&
        (typeof p.isVisible === 'function' ? p.isVisible() : p.unlocked)
      );
    });
  }
  if (projectsSubtabManager) {
    if (visible) {
      projectsSubtabManager.show(subtabId);
    } else {
      projectsSubtabManager.hide(subtabId);
    }
  } else {
    const tab = document.querySelector(`.projects-subtab[data-subtab="${subtabId}"]`);
    const content = document.getElementById(subtabId);
    if (!tab || !content) return;
    if (visible) {
      tab.classList.remove('hidden');
      content.classList.remove('hidden');
    } else {
      tab.classList.add('hidden');
      content.classList.add('hidden');
    }
  }
}

function updateStoryProjectsVisibility() {
  let visible = false;
  if (typeof projectManager !== 'undefined' && projectManager.projects) {
    visible = Object.values(projectManager.projects).some(p => {
      const planetOk = !p.attributes.planet ||
        (typeof spaceManager !== 'undefined' && spaceManager.getCurrentPlanetKey &&
         spaceManager.getCurrentPlanetKey() === p.attributes.planet);
      return (
        p.category === 'story' &&
        !(p.isPermanentlyDisabled?.()) &&
        (typeof p.isVisible === 'function' ? p.isVisible() : p.unlocked) &&
        planetOk
      );
    });
  }
  if (projectsSubtabManager) {
    if (visible) {
      projectsSubtabManager.show('story-projects');
    } else {
      projectsSubtabManager.hide('story-projects');
    }
  } else {
    const tab = document.querySelector('.projects-subtab[data-subtab="story-projects"]');
    const content = document.getElementById('story-projects');
    if (!tab || !content) return;
    if (visible) {
      tab.classList.remove('hidden');
      content.classList.remove('hidden');
    } else {
      tab.classList.add('hidden');
      content.classList.add('hidden');
    }
  }
}

function updateMegaProjectsVisibility() {
  updateCategoryProjectsVisibility('mega', 'mega-projects');
}

function updateGigaProjectsVisibility() {
  updateCategoryProjectsVisibility('giga', 'giga-projects');
}

function activateProjectSubtab(subtabId) {
  if (!subtabId) return;
  if (projectsSubtabManager) {
    projectsSubtabManager.activate(subtabId);
  } else {
    activateSubtab('projects-subtab', 'projects-subtab-content', subtabId, true);
  }
  if (typeof markProjectSubtabViewed === 'function') {
    markProjectSubtabViewed(subtabId);
  }
}

let projectTabAlertNeeded = false;
const projectSubtabAlerts = {
  'resources-projects': false,
  'infrastructure-projects': false,
  'mega-projects': false,
  'giga-projects': false,
  'story-projects': false,
};

function registerProjectUnlockAlert(subtabId) {
  projectTabAlertNeeded = true;
  projectSubtabAlerts[subtabId] = true;
  updateProjectAlert();
  const activeTab = document.getElementById('special-projects-tab');
  const activeId = projectsSubtabManager
    ? projectsSubtabManager.getActiveId()
    : (document.querySelector('.projects-subtab.active') || {}).dataset?.subtab;
  if (activeTab && activeTab.classList.contains('active') && activeId === subtabId) {
    markProjectSubtabViewed(subtabId);
  }
}

function updateProjectAlert() {
  const alertEl = document.getElementById('projects-alert');
  if (alertEl) {
    const display = (!gameSettings.silenceUnlockAlert && projectTabAlertNeeded) ? 'inline' : 'none';
    alertEl.style.display = display;
  }
  for (const key in projectSubtabAlerts) {
    const el = document.getElementById(`${key}-alert`);
    if (el) {
      const display = (!gameSettings.silenceUnlockAlert && projectSubtabAlerts[key]) ? 'inline' : 'none';
      el.style.display = display;
    }
  }
}

function markProjectsViewed() {
  const activeId = projectsSubtabManager
    ? projectsSubtabManager.getActiveId()
    : (document.querySelector('.projects-subtab.active') || {}).dataset?.subtab;
  if (activeId && typeof markProjectSubtabViewed === 'function') {
    markProjectSubtabViewed(activeId);
  }
  projectTabAlertNeeded = false;
  updateProjectAlert();
}

function markProjectSubtabViewed(subtabId) {
  projectSubtabAlerts[subtabId] = false;
  for (const name in projectManager.projects) {
    const p = projectManager.projects[name];
    const cat = p.category || 'resources';
    const id = `${cat}-projects`;
    if (id === subtabId && p.unlocked) {
      p.alertedWhenUnlocked = true;
    }
  }
  if (Object.values(projectSubtabAlerts).every(v => !v)) {
    projectTabAlertNeeded = false;
  }
  updateProjectAlert();
}

function initializeProjectAlerts() {
  projectTabAlertNeeded = false;
  for (const k in projectSubtabAlerts) projectSubtabAlerts[k] = false;
  for (const name in projectManager.projects) {
    const p = projectManager.projects[name];
    if (p.unlocked && !p.alertedWhenUnlocked) {
      projectTabAlertNeeded = true;
      const cat = p.category || 'resources';
      projectSubtabAlerts[`${cat}-projects`] = true;
    }
  }
  updateProjectAlert();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerProjectUnlockAlert,
    updateProjectAlert,
    initializeProjectAlerts,
    markProjectSubtabViewed,
    markProjectsViewed,
    initializeProjectsUI,
    activateProjectSubtab,
    projectsSubtabManager: () => projectsSubtabManager
  };
}


function toggleProjectCollapse(projectCard) {
  projectCard.classList.toggle('collapsed');
  // Use cached arrow element via projectElements to avoid querying
  const name = projectCard && projectCard.dataset ? projectCard.dataset.projectName : null;
  const arrow = name && projectElements[name] ? projectElements[name].collapseArrow : null;
  if (arrow) {
    arrow.innerHTML = projectCard.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  }
  updateProjectCollapsePreference(name, projectCard.classList.contains('collapsed'));
}
