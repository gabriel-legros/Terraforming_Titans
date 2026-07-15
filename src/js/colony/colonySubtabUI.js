let colonySubtabManager = null;

const COLONY_SUBTAB_IDS = {
  population: 'population-colonies',
  nanocolony: 'nanocolony-colonies',
  followers: 'followers-colonies',
};

const colonySubtabState = {
  initialized: false,
  activeSubtabId: COLONY_SUBTAB_IDS.population,
  populationEverUnlocked: false,
  nanocolonyEverUnlocked: false,
  followersEverUnlocked: false,
  populationUnlocked: false,
  nanocolonyUnlocked: false,
  followersUnlocked: false,
};

const colonySubtabCache = {
  tabButton: null,
  populationTab: null,
  nanocolonyTab: null,
  followersTab: null,
  populationContent: null,
  nanocolonyContent: null,
  followersContent: null,
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
  if (!colonySubtabCache.followersTab || !colonySubtabCache.followersTab.isConnected) {
    colonySubtabCache.followersTab = document.getElementById('followers-colonies-tab');
  }
  if (!colonySubtabCache.populationContent || !colonySubtabCache.populationContent.isConnected) {
    colonySubtabCache.populationContent = document.getElementById(COLONY_SUBTAB_IDS.population);
  }
  if (!colonySubtabCache.nanocolonyContent || !colonySubtabCache.nanocolonyContent.isConnected) {
    colonySubtabCache.nanocolonyContent = document.getElementById(COLONY_SUBTAB_IDS.nanocolony);
  }
  if (!colonySubtabCache.followersContent || !colonySubtabCache.followersContent.isConnected) {
    colonySubtabCache.followersContent = document.getElementById(COLONY_SUBTAB_IDS.followers);
  }
}

function isPopulationSubtabUnlocked() {
  cacheColonySubtabElements();
  return colonySubtabCache.tabButton && !colonySubtabCache.tabButton.classList.contains('hidden');
}

function isNanocolonySubtabUnlocked() {
  return !!(nanotechManager && nanotechManager.enabled);
}

function isFollowersSubtabUnlocked() {
  return !!(followersManager && followersManager.enabled);
}

function setColonySubtabVisibility(subtabId, visible) {
  cacheColonySubtabElements();

  let tab = null;
  let content = null;
  if (subtabId === COLONY_SUBTAB_IDS.population) {
    tab = colonySubtabCache.populationTab;
    content = colonySubtabCache.populationContent;
  } else if (subtabId === COLONY_SUBTAB_IDS.nanocolony) {
    tab = colonySubtabCache.nanocolonyTab;
    content = colonySubtabCache.nanocolonyContent;
  } else if (subtabId === COLONY_SUBTAB_IDS.followers) {
    tab = colonySubtabCache.followersTab;
    content = colonySubtabCache.followersContent;
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
    colonySubtabState.activeSubtabId = colonySubtabManager.getActiveId() || subtabId;
  } else {
    activateSubtab('colony-subtab', 'colony-subtab-content', subtabId, true);
    colonySubtabState.activeSubtabId = subtabId;
  }
}

function isColonySubtabActiveFromState(subtabId) {
  return colonySubtabState.activeSubtabId === subtabId;
}

function updateColonySubtabsVisibility() {
  cacheColonySubtabElements();

  const populationUnlocked = isPopulationSubtabUnlocked() && !isCurrentWorldSubtabDisabled(COLONY_SUBTAB_IDS.population);
  const nanocolonyUnlocked = isPopulationSubtabUnlocked() && isNanocolonySubtabUnlocked() && !isCurrentWorldSubtabDisabled(COLONY_SUBTAB_IDS.nanocolony);
  const followersUnlocked = isPopulationSubtabUnlocked() && isFollowersSubtabUnlocked() && !isCurrentWorldSubtabDisabled(COLONY_SUBTAB_IDS.followers);

  setColonySubtabVisibility(COLONY_SUBTAB_IDS.population, populationUnlocked);
  setColonySubtabVisibility(COLONY_SUBTAB_IDS.nanocolony, nanocolonyUnlocked);
  setColonySubtabVisibility(COLONY_SUBTAB_IDS.followers, followersUnlocked);

  const availableSubtabs = [];
  if (populationUnlocked) {
    availableSubtabs.push(COLONY_SUBTAB_IDS.population);
  }
  if (nanocolonyUnlocked) {
    availableSubtabs.push(COLONY_SUBTAB_IDS.nanocolony);
  }
  if (followersUnlocked) {
    availableSubtabs.push(COLONY_SUBTAB_IDS.followers);
  }

  const activeId = getActiveColonySubtabId();
  if (activeId) {
    colonySubtabState.activeSubtabId = activeId;
  }
  if (availableSubtabs.length > 0 && (!activeId || !availableSubtabs.includes(activeId))) {
    activateColonySubtab(availableSubtabs[0]);
  }

  const populationFirstUnlock = populationUnlocked && !colonySubtabState.populationEverUnlocked;
  const nanocolonyFirstUnlock = nanocolonyUnlocked && !colonySubtabState.nanocolonyEverUnlocked;
  const followersFirstUnlock = followersUnlocked && !colonySubtabState.followersEverUnlocked;
  const canAutoSwitch = colonySubtabState.initialized
    && !globalGameIsLoadingFromSave
    && !globalGameIsTraveling
    && !(storyManager && storyManager.suppressNavigationRewards);
  if (canAutoSwitch && populationFirstUnlock) {
    tabManager.activateTab('colonies');
    activateColonySubtab(COLONY_SUBTAB_IDS.population);
  }
  if (canAutoSwitch && nanocolonyFirstUnlock) {
    tabManager.activateTab('colonies');
    activateColonySubtab(COLONY_SUBTAB_IDS.nanocolony);
  }
  if (canAutoSwitch && followersFirstUnlock) {
    tabManager.activateTab('colonies');
    activateColonySubtab(COLONY_SUBTAB_IDS.followers);
  }

  colonySubtabState.populationEverUnlocked = colonySubtabState.populationEverUnlocked || populationUnlocked;
  colonySubtabState.nanocolonyEverUnlocked = colonySubtabState.nanocolonyEverUnlocked || nanocolonyUnlocked;
  colonySubtabState.followersEverUnlocked = colonySubtabState.followersEverUnlocked || followersUnlocked;
  colonySubtabState.populationUnlocked = populationUnlocked;
  colonySubtabState.nanocolonyUnlocked = nanocolonyUnlocked;
  colonySubtabState.followersUnlocked = followersUnlocked;
  colonySubtabState.initialized = true;
}

function initializeColonySubtabs() {
  cacheColonySubtabElements();
  if (!colonySubtabManager) {
    colonySubtabManager = new SubtabManager('.colony-subtab', '.colony-subtab-content', true);
    colonySubtabManager.onActivate(() => {
      markColoniesViewed();
    });
    colonySubtabManager.onActivate((subtabId) => {
      colonySubtabState.activeSubtabId = subtabId;
    });
  }
  colonySubtabState.initialized = false;
  updateColonySubtabsVisibility();
}
