let colonySubtabManager = null;

const COLONY_SUBTAB_IDS = {
  population: 'population-colonies',
  nanocolony: 'nanocolony-colonies',
};

const colonySubtabState = {
  initialized: false,
  populationUnlocked: false,
  nanocolonyUnlocked: false,
};

const colonySubtabCache = {
  tabButton: null,
  populationTab: null,
  nanocolonyTab: null,
  populationContent: null,
  nanocolonyContent: null,
};

function cacheColonySubtabElements() {
  if (!colonySubtabCache.tabButton || !colonySubtabCache.tabButton.isConnected) {
    colonySubtabCache.tabButton = document.getElementById('colonies-tab');
  }
  if (!colonySubtabCache.populationTab || !colonySubtabCache.populationTab.isConnected) {
    colonySubtabCache.populationTab = document.getElementById('population-colonies-tab');
  }
  if (!colonySubtabCache.nanocolonyTab || !colonySubtabCache.nanocolonyTab.isConnected) {
    colonySubtabCache.nanocolonyTab = document.getElementById('nanocolony-colonies-tab');
  }
  if (!colonySubtabCache.populationContent || !colonySubtabCache.populationContent.isConnected) {
    colonySubtabCache.populationContent = document.getElementById(COLONY_SUBTAB_IDS.population);
  }
  if (!colonySubtabCache.nanocolonyContent || !colonySubtabCache.nanocolonyContent.isConnected) {
    colonySubtabCache.nanocolonyContent = document.getElementById(COLONY_SUBTAB_IDS.nanocolony);
  }
}

function isPopulationSubtabUnlocked() {
  cacheColonySubtabElements();
  return colonySubtabCache.tabButton && !colonySubtabCache.tabButton.classList.contains('hidden');
}

function isNanocolonySubtabUnlocked() {
  return !!(nanotechManager && nanotechManager.enabled);
}

function setColonySubtabVisibility(subtabId, visible) {
  if (colonySubtabManager) {
    if (visible) {
      colonySubtabManager.show(subtabId);
    } else {
      colonySubtabManager.hide(subtabId);
    }
    return;
  }

  let tab = null;
  let content = null;
  if (subtabId === COLONY_SUBTAB_IDS.population) {
    tab = colonySubtabCache.populationTab;
    content = colonySubtabCache.populationContent;
  } else if (subtabId === COLONY_SUBTAB_IDS.nanocolony) {
    tab = colonySubtabCache.nanocolonyTab;
    content = colonySubtabCache.nanocolonyContent;
  }
  if (!tab || !content) {
    return;
  }
  if (visible) {
    tab.classList.remove('hidden');
    content.classList.remove('hidden');
  } else {
    tab.classList.add('hidden');
    content.classList.add('hidden');
  }
}

function getActiveColonySubtabId() {
  if (colonySubtabManager) {
    return colonySubtabManager.getActiveId();
  }
  const active = document.querySelector('.colony-subtab.active');
  if (active && active.dataset) {
    return active.dataset.subtab;
  }
  return null;
}

function activateColonySubtab(subtabId) {
  if (!subtabId) {
    return;
  }
  if (colonySubtabManager) {
    colonySubtabManager.activate(subtabId);
  } else {
    activateSubtab('colony-subtab', 'colony-subtab-content', subtabId, true);
  }
}

function updateColonySubtabsVisibility() {
  cacheColonySubtabElements();

  const populationUnlocked = isPopulationSubtabUnlocked();
  const nanocolonyUnlocked = populationUnlocked && isNanocolonySubtabUnlocked();

  setColonySubtabVisibility(COLONY_SUBTAB_IDS.population, populationUnlocked);
  setColonySubtabVisibility(COLONY_SUBTAB_IDS.nanocolony, nanocolonyUnlocked);

  const availableSubtabs = [];
  if (populationUnlocked) {
    availableSubtabs.push(COLONY_SUBTAB_IDS.population);
  }
  if (nanocolonyUnlocked) {
    availableSubtabs.push(COLONY_SUBTAB_IDS.nanocolony);
  }

  const activeId = getActiveColonySubtabId();
  if (availableSubtabs.length > 0 && (!activeId || !availableSubtabs.includes(activeId))) {
    activateColonySubtab(availableSubtabs[0]);
  }

  const canAutoSwitch = colonySubtabState.initialized && !globalGameIsLoadingFromSave && !globalGameIsTraveling;
  if (canAutoSwitch && !colonySubtabState.populationUnlocked && populationUnlocked) {
    tabManager.activateTab('colonies');
    activateColonySubtab(COLONY_SUBTAB_IDS.population);
  }
  if (canAutoSwitch && !colonySubtabState.nanocolonyUnlocked && nanocolonyUnlocked) {
    tabManager.activateTab('colonies');
    activateColonySubtab(COLONY_SUBTAB_IDS.nanocolony);
  }

  colonySubtabState.populationUnlocked = populationUnlocked;
  colonySubtabState.nanocolonyUnlocked = nanocolonyUnlocked;
  colonySubtabState.initialized = true;
}

function initializeColonySubtabs() {
  cacheColonySubtabElements();
  if (!colonySubtabManager) {
    colonySubtabManager = new SubtabManager('.colony-subtab', '.colony-subtab-content', true);
    colonySubtabManager.onActivate(() => {
      markColoniesViewed();
    });
  }
  colonySubtabState.initialized = false;
  updateColonySubtabsVisibility();
}
