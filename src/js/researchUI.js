let completedResearchHidden =
    (typeof gameSettings !== 'undefined' && gameSettings.hideCompletedResearch) ||
    false; // Initialize the toggle state
if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let researchTabAlertNeeded = false;
const researchSubtabAlerts = {
    'energy-research': false,
    'industry-research': false,
    'colonization-research': false,
    'terraforming-research': false,
    'advanced-research': false,
};
let researchSubtabManager = null;
let researchSubtabManagerActivateHookBound = false;
const researchAlertElements = {};

// Cached DOM nodes keyed by research id
const researchElementCache = new Map();
// Cached toggle completed buttons
let cachedToggleButtons = [];
// Flag to rebuild caches when invalidated
let researchUICacheInvalidated = true;
let hiddenResearchIds = [];

function getResearchUIText(path, fallback, vars) {
    return t(path, vars, fallback);
}

function getResearchAutomation() {
    return automationManager ? automationManager.researchAutomation : null;
}

function ensureHiddenResearchIds() {
    if (!Array.isArray(gameSettings.hiddenResearchIds)) {
        gameSettings.hiddenResearchIds = [];
    }
    hiddenResearchIds = gameSettings.hiddenResearchIds;
}

function applyHiddenResearchFlags() {
    ensureHiddenResearchIds();
    const hiddenSet = new Set(hiddenResearchIds);
    for (const category in researchManager.researches) {
        researchManager.researches[category].forEach(r => {
            r.hiddenByUser = hiddenSet.has(r.id);
        });
    }
}

function resetHiddenResearchOnTravel() {
    ensureHiddenResearchIds();
    if (hiddenResearchIds.length > 0) {
        hiddenResearchIds.length = 0;
    }
    for (const category in researchManager.researches) {
        researchManager.researches[category].forEach(r => {
            r.hiddenByUser = false;
        });
    }
}

function setResearchHiddenByUser(researchItem, hidden) {
    ensureHiddenResearchIds();
    researchItem.hiddenByUser = hidden;
    const researchAutomation = getResearchAutomation();
    if (researchAutomation) {
        researchAutomation.setResearchHiddenInCurrentState(researchItem.id, hidden);
    }
    ensureHiddenResearchIds();
}

function getResearchById(researchId) {
    for (const category in researchManager.researches) {
        const found = researchManager.researches[category].find(research => research.id === researchId);
        if (found) return found;
    }
    return null;
}

function isResearchHidden(researchItem) {
    const isCompleted = researchItem.isResearched && !researchItem.repeatable;
    return isCompleted || researchItem.hiddenByUser;
}

function hasActiveDisableFlag(researchItem) {
    if (!researchItem || !researchItem.disableFlag) {
        return false;
    }
    const manager = researchManager;
    if (!manager || !manager.isBooleanFlagSet) {
        return false;
    }
    const flags = Array.isArray(researchItem.disableFlag)
        ? researchItem.disableFlag
        : [researchItem.disableFlag];
    return flags.some(flag => manager.isBooleanFlagSet(flag));
}

function formatResearchCost(cost) {
    const parts = [];
    if (cost.research) {
        parts.push(getResearchUIText(
            'ui.research.cost.researchPoints',
            '{value} Research Points',
            { value: formatNumber(cost.research, true) }
        ));
    }
    if (cost.advancedResearch) {
        parts.push(getResearchUIText(
            'ui.research.cost.advancedResearch',
            '{value} Advanced Research',
            { value: formatNumber(cost.advancedResearch, true) }
        ));
    }
    return parts.join(' + ');
}

function updateAllResearchButtons(researchData) {
    applyHiddenResearchFlags();
    const researchTabs = ['energy', 'industry', 'colonization', 'terraforming', 'advanced'];
    researchTabs.forEach((tab) => {
        const visibleIds = researchManager.getVisibleResearchIdsByCategory
            ? researchManager.getVisibleResearchIdsByCategory(tab)
            : new Set(researchData[tab].map(r => r.id));
        researchData[tab].forEach((researchItem) => {
            const elements = researchElementCache.get(researchItem.id);
            if (!elements) return;
            const { button, costEl, descEl, container, autoCheckbox, autoLabel, autoPrioritySelect, hideToggle } = elements;

            const markCompleted = researchItem.isResearched && !researchItem.repeatable;
            if (markCompleted) {
                container.classList.add('completed-research');
            } else {
                container.classList.remove('completed-research');
            }
            const hideForUser = completedResearchHidden && isResearchHidden(researchItem);
            container.classList.toggle('hidden', hideForUser);

            const isVisible = visibleIds.has(researchItem.id);
            const isDisplayable = researchManager.isResearchDisplayable(researchItem);
            const hiddenByDisableFlag = !researchItem.isResearched && hasActiveDisableFlag(researchItem);
            container.style.display = (researchItem.disabled || hiddenByDisableFlag || !isDisplayable) ? 'none' : '';
            updateResearchButtonText(button, researchItem, isVisible);
            if (hideToggle) {
                hideToggle.textContent = researchItem.hiddenByUser
                    ? getResearchUIText('ui.research.unhide', 'Unhide')
                    : getResearchUIText('ui.research.hide', 'Hide');
            }
            if (costEl && descEl) {
                if (isVisible) {
                    costEl.textContent = getResearchUIText(
                        'ui.research.costLine',
                        'Cost: {cost}',
                        { cost: formatResearchCost(researchItem.cost) }
                    );
                    descEl.textContent = researchItem.description;
                } else {
                    costEl.textContent = getResearchUIText('ui.research.unknownCost', 'Cost: ???');
                    descEl.textContent = '???';
                }
            }

            if (autoCheckbox) {
                const unlocked = researchManager.autoResearchEnabled ||
                    researchManager.isBooleanFlagSet('autoResearchEnabled');
                if (autoLabel) {
                    autoLabel.style.display = unlocked ? '' : 'none';
                }
                autoCheckbox.style.display = unlocked ? '' : 'none';
                if (autoPrioritySelect) {
                    autoPrioritySelect.style.display = unlocked ? '' : 'none';
                }
                if (unlocked) {
                    autoCheckbox.checked = researchManager.getAutoResearchEnabled(researchItem.id);
                    if (autoPrioritySelect) {
                        autoPrioritySelect.value = `${researchManager.getAutoResearchPriority(researchItem.id)}`;
                    }
                }
            }
        });
    });
}

function updateResearchButtonText(button, researchItem, visible) {
    const repeatCount = researchItem.repeatable
        ? Math.max(1, (researchItem.timesResearched || 0) + 1)
        : 0;
    const levelText = repeatCount ? ` (${repeatCount})` : '';
    let buttonText = visible ? `${researchItem.name}${levelText}` : '???';

    // Check if the research is already done
    if (researchItem.isResearched && !researchItem.repeatable) {
        buttonText += getResearchUIText('ui.research.researchedSuffix', ' - Researched');
        button.disabled = true; // Disable the button if the research is already done
        button.style.color = 'grey'; // Set the text color to grey when research is completed
    } else if (!visible) {
        button.disabled = true;
        button.style.color = 'inherit';
    } else if (!canAffordResearch(researchItem)) {
        // If research can't be afforded, keep the button enabled but show red
        button.disabled = false;
        button.style.color = 'red';
    } else {
        // Otherwise, set to default color
        button.disabled = false;
        button.style.color = 'inherit';
    }

    button.textContent = buttonText;
}

function registerResearchUnlockAlert(subtabId) {
    researchTabAlertNeeded = true;
    researchSubtabAlerts[subtabId] = true;
    updateResearchAlert();
    const activeTab = document.getElementById('research');
    const activeId = researchSubtabManager ? researchSubtabManager.activeId : null;
    if (
        activeTab &&
        activeTab.classList.contains('active') &&
        activeId === subtabId &&
        typeof markResearchSubtabViewed === 'function'
    ) {
        markResearchSubtabViewed(subtabId);
    }
}

function updateResearchAlert() {
    let alertEl = researchAlertElements.main;
    if (!alertEl || !alertEl.isConnected) {
        alertEl = document.getElementById('research-alert');
        researchAlertElements.main = alertEl;
    }
    if (alertEl) {
        const display = (!gameSettings.silenceUnlockAlert && researchTabAlertNeeded) ? 'inline' : 'none';
        alertEl.style.display = display;
    }
    for (const key in researchSubtabAlerts) {
        let el = researchAlertElements[key];
        if (!el || !el.isConnected) {
            el = document.getElementById(`${key}-alert`);
            researchAlertElements[key] = el;
        }
        if (el) {
            const display = (!gameSettings.silenceUnlockAlert && researchSubtabAlerts[key]) ? 'inline' : 'none';
            el.style.display = display;
        }
    }
}

function markResearchViewed() {
    const active = researchSubtabManager ? researchSubtabManager.activeId : null;
    if (active && typeof markResearchSubtabViewed === 'function') {
        markResearchSubtabViewed(active);
    }
    researchTabAlertNeeded = false;
    updateResearchAlert();
}

function markResearchSubtabViewed(subtabId) {
    researchSubtabAlerts[subtabId] = false;
    for (const category in researchManager.researches) {
        if (`${category}-research` === subtabId) {
            researchManager.researches[category].forEach(r => {
                if (researchManager.isResearchAvailable(r.id) && researchManager.isResearchDisplayable(r)) {
                    r.alertedWhenUnlocked = true;
                }
            });
        }
    }
    if (Object.values(researchSubtabAlerts).every(v => !v)) {
        researchTabAlertNeeded = false;
    }
    updateResearchAlert();
}

function initializeResearchAlerts() {
    researchTabAlertNeeded = false;
    for (const k in researchSubtabAlerts) researchSubtabAlerts[k] = false;
    for (const category in researchManager.researches) {
        const subtab = `${category}-research`;
        researchManager.researches[category].forEach(r => {
            if (!r.alertedWhenUnlocked && researchManager.isResearchAvailable(r.id) && researchManager.isResearchDisplayable(r)) {
                researchTabAlertNeeded = true;
                researchSubtabAlerts[subtab] = true;
            }
        });
    }
    updateResearchAlert();
}

function initializeResearchTabs() {
    if (typeof gameSettings !== 'undefined') {
        completedResearchHidden = gameSettings.hideCompletedResearch || false;
    }
    if (typeof SubtabManager !== 'function') return;
    if (researchSubtabManager) {
        researchSubtabManager.reset();
    } else {
        researchSubtabManager = new SubtabManager('.research-subtab', '.research-subtab-content');
    }
    if (!researchSubtabManagerActivateHookBound) {
        researchSubtabManager.onActivate(id => {
            if (typeof markResearchSubtabViewed === 'function') {
                markResearchSubtabViewed(id);
            }
        });
        researchSubtabManagerActivateHookBound = true;
    }

    cachedToggleButtons = Array.from(document.querySelectorAll('.toggle-completed-button'));
    cachedToggleButtons.forEach(button => {
        button.onclick = toggleCompletedResearch;
    });

    applyHiddenResearchFlags();
    rebuildResearchCaches();
    updateAllResearchButtons(researchManager.researches);
    updateCompletedResearchVisibility();
    updateAdvancedResearchVisibility();

    researchSubtabManager.activate('energy-research');
}

function activateResearchSubtab(subtabId) {
    if (researchSubtabManager) {
        researchSubtabManager.activate(subtabId);
    }
}

function loadResearchCategory(category) {
    const researchListContainer = document.getElementById(`${category}-research-buttons`);
    if (!researchListContainer) {
        console.error(`Container for ${category} research buttons not found.`);
        return;
    }

    const existingRows = {};
    Array.from(researchListContainer.children).forEach(row => {
        if (row.dataset && row.dataset.researchId) {
            existingRows[row.dataset.researchId] = row;
        }
    });

    // Load research items for the given category
    const researches = researchManager.getResearchesByCategory(category);
    const visibleIds = researchManager.getVisibleResearchIdsByCategory
        ? researchManager.getVisibleResearchIdsByCategory(category)
        : new Set(researches.map(r => r.id));
    if (researches.length === 0) {
        const emptyText = getResearchUIText('ui.research.noResearchAvailable', 'No research available.');
        if (researchListContainer.textContent !== emptyText) {
            researchListContainer.textContent = emptyText;
        }
        return;
    }

    researches.forEach((research) => {
            let researchContainer = existingRows[research.id];
            let cached = researchContainer ? researchContainer._researchRefs : null;
            if (!researchContainer || !cached) {
            researchContainer = document.createElement('div');
            researchContainer.classList.add('research-item');
            researchContainer.dataset.researchId = research.id;

            const researchButton = document.createElement('button');
            researchButton.classList.add('research-button');
            researchButton.id = `research-${research.id}`;
            const isVisible = visibleIds.has(research.id);
            updateResearchButtonText(researchButton, research, isVisible);

            researchButton.addEventListener('click', () => {
                researchManager.completeResearch(researchButton.dataset.researchId);
                updateResearchUI();
            });

            const hideToggle = document.createElement('button');
            hideToggle.type = 'button';
            hideToggle.classList.add('research-hide-toggle');
            hideToggle.textContent = research.hiddenByUser
                ? getResearchUIText('ui.research.unhide', 'Unhide')
                : getResearchUIText('ui.research.hide', 'Hide');
            hideToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                const currentResearch = getResearchById(hideToggle.dataset.researchId);
                if (currentResearch) {
                    setResearchHiddenByUser(currentResearch, !currentResearch.hiddenByUser);
                }
                updateAllResearchButtons(researchManager.researches);
                updateCompletedResearchVisibility();
            });

            const researchDescription = document.createElement('p');
            researchDescription.classList.add('research-description');
            if (isVisible) {
                researchDescription.textContent = research.description;
            } else {
                researchDescription.textContent = '???';
            }

            const researchCost = document.createElement('p');
            researchCost.classList.add('research-cost');
            researchCost.textContent = isVisible
                ? getResearchUIText('ui.research.costLine', 'Cost: {cost}', { cost: formatResearchCost(research.cost) })
                : getResearchUIText('ui.research.unknownCost', 'Cost: ???');

            if (research.disabled || (!research.isResearched && hasActiveDisableFlag(research))) {
                researchContainer.style.display = 'none';
            }

            let autoCheckbox = null;
            let autoLabel = null;
            let autoPrioritySelect = null;
            if (category !== 'advanced') {
                autoCheckbox = document.createElement('input');
                autoCheckbox.type = 'checkbox';
                autoCheckbox.classList.add('research-auto-checkbox');
                autoCheckbox.checked = researchManager.getAutoResearchEnabled(research.id);
                autoCheckbox.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                autoCheckbox.addEventListener('change', () => {
                    const applied = researchManager.setAutoResearchEnabled(autoCheckbox.dataset.researchId, autoCheckbox.checked);
                    if (!applied) {
                        autoCheckbox.checked = false;
                    }
                });
                const unlocked = researchManager.autoResearchEnabled ||
                    researchManager.isBooleanFlagSet('autoResearchEnabled');
                autoCheckbox.style.display = unlocked ? '' : 'none';
                autoLabel = document.createElement('label');
                autoLabel.classList.add('research-auto-label');
                autoLabel.textContent = getResearchUIText('ui.research.autoResearch', 'Auto Research ');
                autoLabel.appendChild(autoCheckbox);
                autoLabel.style.display = unlocked ? '' : 'none';

                autoPrioritySelect = document.createElement('select');
                autoPrioritySelect.classList.add('research-auto-priority');
                ['1', '2', '3', '4'].forEach((value) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = getResearchUIText('ui.research.priorityLabel', 'P{value}', { value });
                    autoPrioritySelect.appendChild(option);
                });
                autoPrioritySelect.value = `${researchManager.getAutoResearchPriority(research.id)}`;
                autoPrioritySelect.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                autoPrioritySelect.addEventListener('change', () => {
                    const applied = researchManager.setAutoResearchPriority(autoPrioritySelect.dataset.researchId, Number.parseInt(autoPrioritySelect.value, 10));
                    if (!applied) {
                        autoPrioritySelect.value = '4';
                    }
                });
                autoPrioritySelect.style.display = unlocked ? '' : 'none';

                const autoRow = document.createElement('div');
                autoRow.classList.add('research-auto-row');
                autoRow.appendChild(autoLabel);
                autoRow.appendChild(autoPrioritySelect);

                const autoControls = document.createElement('div');
                autoControls.classList.add('research-auto-controls');
                autoControls.appendChild(autoRow);
                researchContainer.appendChild(autoControls);
            }

            // Append button, cost, and description to the research container
            researchContainer.appendChild(researchButton);
            researchContainer.appendChild(researchCost);
            researchContainer.appendChild(researchDescription);
            researchContainer.appendChild(hideToggle);

            cached = {
                container: researchContainer,
                button: researchButton,
                costEl: researchCost,
                descEl: researchDescription,
                hideToggle,
                autoCheckbox,
                autoLabel,
                autoPrioritySelect,
            };
            researchContainer._researchRefs = cached;
            }

            cached.button.dataset.researchId = research.id;
            if (cached.hideToggle) cached.hideToggle.dataset.researchId = research.id;
            if (cached.autoCheckbox) cached.autoCheckbox.dataset.researchId = research.id;
            if (cached.autoPrioritySelect) cached.autoPrioritySelect.dataset.researchId = research.id;
            researchElementCache.set(research.id, cached);
            if (researchContainer.parentNode !== researchListContainer) {
                researchListContainer.appendChild(researchContainer);
            }
            delete existingRows[research.id];
        });
    Object.keys(existingRows).forEach(researchId => {
        existingRows[researchId].style.display = 'none';
    });
}

function toggleCompletedResearch() {
    completedResearchHidden = !completedResearchHidden; // Toggle the state
    if (typeof gameSettings !== 'undefined') {
        gameSettings.hideCompletedResearch = completedResearchHidden;
    }
    updateAllResearchButtons(researchManager.researches); // Apply visibility changes
    updateCompletedResearchVisibility();
}


function updateCompletedResearchVisibility() {
    if (cachedToggleButtons.length === 0) {
        cachedToggleButtons = Array.from(document.querySelectorAll('.toggle-completed-button'));
    }
    const allResearches = Object.values(researchManager.researches).flat();
    const hiddenResearch = allResearches.filter((research) => isResearchHidden(research));

    cachedToggleButtons.forEach((toggleButton) => {
        if (hiddenResearch.length === 0) {
            toggleButton.style.display = 'none';
        } else {
            toggleButton.style.display = 'inline-block';
            toggleButton.textContent = completedResearchHidden
                ? getResearchUIText('ui.research.showHidden', 'Show Hidden')
                : getResearchUIText('ui.research.hideHidden', 'Hide Hidden');
        }
    });
}

function updateAdvancedResearchVisibility() {
    const visible = researchManager && researchManager.isBooleanFlagSet('advancedResearchUnlocked') && !isCurrentWorldSubtabDisabled('advanced-research');
    if (researchSubtabManager) {
        if (visible) {
            researchSubtabManager.show('advanced-research');
        } else {
            researchSubtabManager.hide('advanced-research');
        }
    } else {
        const subtab = document.querySelector('[data-subtab="advanced-research"]');
        const content = document.getElementById('advanced-research');
        if (subtab && content) {
            subtab.classList.toggle('hidden', !visible);
            content.classList.toggle('hidden', !visible);
        }
    }
}

function rebuildResearchCaches() {
    researchElementCache.clear();
    const categories = ['energy', 'industry', 'colonization', 'terraforming', 'advanced'];
    categories.forEach(category => {
        const container = document.getElementById(`${category}-research-buttons`);
        if (container) loadResearchCategory(category);
    });
    cachedToggleButtons = Array.from(document.querySelectorAll('.toggle-completed-button'));
    researchUICacheInvalidated = false;
}

function invalidateResearchUICache() {
    researchUICacheInvalidated = true;
}

function updateResearchUI() {
    if (researchManager.orderDirty || researchUICacheInvalidated) {
        applyHiddenResearchFlags();
        rebuildResearchCaches();
        researchManager.orderDirty = false;
    }
    updateAllResearchButtons(researchManager.researches);
    updateCompletedResearchVisibility();
    updateAdvancedResearchVisibility();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        registerResearchUnlockAlert,
        updateResearchAlert,
        initializeResearchAlerts,
        markResearchSubtabViewed,
        markResearchViewed,
        invalidateResearchUICache,
        rebuildResearchCaches,
        loadResearchCategory,
        updateAllResearchButtons,
        toggleCompletedResearch,
        updateCompletedResearchVisibility,
        updateAdvancedResearchVisibility,
        updateResearchUI,
        initializeResearchTabs,
        activateResearchSubtab,
        resetHiddenResearchOnTravel,
        researchSubtabManager: () => researchSubtabManager
    };
}
