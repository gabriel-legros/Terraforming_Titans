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

// Cached DOM nodes keyed by research id
const researchElementCache = new Map();
// Cached toggle completed buttons
let cachedToggleButtons = [];
// Flag to rebuild caches when invalidated
let researchUICacheInvalidated = true;
let hiddenResearchIds = [];

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

function setResearchHiddenByUser(researchItem, hidden) {
    ensureHiddenResearchIds();
    researchItem.hiddenByUser = hidden;
    const researchAutomation = getResearchAutomation();
    if (researchAutomation) {
        researchAutomation.setResearchHiddenInCurrentState(researchItem.id, hidden);
    }
    ensureHiddenResearchIds();
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
        parts.push(`${formatNumber(cost.research, true)} Research Points`);
    }
    if (cost.advancedResearch) {
        parts.push(`${formatNumber(cost.advancedResearch, true)} Advanced Research`);
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
            container.style.display = (hiddenByDisableFlag || !isDisplayable) ? 'none' : '';
            updateResearchButtonText(button, researchItem, isVisible);
            if (hideToggle) {
                hideToggle.textContent = researchItem.hiddenByUser ? 'Unhide' : 'Hide';
            }
            if (costEl && descEl) {
                if (isVisible) {
                    costEl.textContent = `Cost: ${formatResearchCost(researchItem.cost)}`;
                    descEl.textContent = researchItem.description;
                } else {
                    costEl.textContent = 'Cost: ???';
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
                    const researchAutomation = getResearchAutomation();
                    autoCheckbox.checked = researchAutomation ? researchAutomation.isAutoResearchEnabled(researchItem.id) : false;
                    if (autoPrioritySelect) {
                        autoPrioritySelect.value = `${researchAutomation ? researchAutomation.getAutoResearchPriority(researchItem.id) : 4}`;
                    }
                }
            }
        });
    });
}

function updateResearchButtonText(button, researchItem, visible) {
    const repeatCount = researchItem.repeatable
        ? Math.max(1, researchItem.timesResearched || 0)
        : 0;
    const levelText = repeatCount ? ` (${repeatCount})` : '';
    let buttonText = visible ? `${researchItem.name}${levelText}` : '???';

    // Check if the research is already done
    if (researchItem.isResearched && !researchItem.repeatable) {
        buttonText += ' - Researched';
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
    const alertEl = document.getElementById('research-alert');
    if (alertEl) {
        const display = (!gameSettings.silenceUnlockAlert && researchTabAlertNeeded) ? 'inline' : 'none';
        alertEl.style.display = display;
    }
    for (const key in researchSubtabAlerts) {
        const el = document.getElementById(`${key}-alert`);
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
    researchSubtabManager = new SubtabManager('.research-subtab', '.research-subtab-content');
    researchSubtabManager.onActivate(id => {
        if (typeof markResearchSubtabViewed === 'function') {
            markResearchSubtabViewed(id);
        }
    });

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

    // Clear the current research list
    while (researchListContainer.firstChild) {
        researchListContainer.removeChild(researchListContainer.firstChild);
    }

    // Load research items for the given category
    const researches = researchManager.getResearchesByCategory(category);
    const visibleIds = researchManager.getVisibleResearchIdsByCategory
        ? researchManager.getVisibleResearchIdsByCategory(category)
        : new Set(researches.map(r => r.id));
    if (researches.length === 0) {
        researchListContainer.innerHTML = '<p>No research available.</p>';
        return;
    }

    researches.forEach((research) => {
        if (research.disabled) {
            return;
        }
        const researchContainer = document.createElement('div');
        researchContainer.classList.add('research-item');

        const researchButton = document.createElement('button');
        researchButton.classList.add('research-button');
        researchButton.id = `research-${research.id}`;
        const isVisible = visibleIds.has(research.id);
        updateResearchButtonText(researchButton, research, isVisible);

        researchButton.addEventListener('click', () => {
            researchManager.completeResearch(research.id);
            updateResearchUI();
        });

        const hideToggle = document.createElement('button');
        hideToggle.type = 'button';
        hideToggle.classList.add('research-hide-toggle');
        hideToggle.textContent = research.hiddenByUser ? 'Unhide' : 'Hide';
        hideToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            setResearchHiddenByUser(research, !research.hiddenByUser);
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
        researchCost.textContent = isVisible ? `Cost: ${formatResearchCost(research.cost)}` : 'Cost: ???';

        if (!research.isResearched && hasActiveDisableFlag(research)) {
            researchContainer.style.display = 'none';
        }

        let autoCheckbox = null;
        let autoLabel = null;
        let autoPrioritySelect = null;
        if (category !== 'advanced') {
            const researchAutomation = getResearchAutomation();
            autoCheckbox = document.createElement('input');
            autoCheckbox.type = 'checkbox';
            autoCheckbox.classList.add('research-auto-checkbox');
            autoCheckbox.checked = researchAutomation ? researchAutomation.isAutoResearchEnabled(research.id) : false;
            autoCheckbox.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            autoCheckbox.addEventListener('change', () => {
                const activeResearchAutomation = getResearchAutomation();
                const applied = activeResearchAutomation
                    ? activeResearchAutomation.setAutoResearchEnabled(research.id, autoCheckbox.checked)
                    : false;
                if (!applied) {
                    autoCheckbox.checked = false;
                }
            });
            const unlocked = researchManager.autoResearchEnabled ||
                researchManager.isBooleanFlagSet('autoResearchEnabled');
            autoCheckbox.style.display = unlocked ? '' : 'none';
            autoLabel = document.createElement('label');
            autoLabel.classList.add('research-auto-label');
            autoLabel.textContent = 'Auto Research ';
            autoLabel.appendChild(autoCheckbox);
            autoLabel.style.display = unlocked ? '' : 'none';

            autoPrioritySelect = document.createElement('select');
            autoPrioritySelect.classList.add('research-auto-priority');
            ['1', '2', '3', '4'].forEach((value) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = `P${value}`;
                autoPrioritySelect.appendChild(option);
            });
            autoPrioritySelect.value = `${researchAutomation ? researchAutomation.getAutoResearchPriority(research.id) : 4}`;
            autoPrioritySelect.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            autoPrioritySelect.addEventListener('change', () => {
                const activeResearchAutomation = getResearchAutomation();
                const applied = activeResearchAutomation
                    ? activeResearchAutomation.setAutoResearchPriority(research.id, Number.parseInt(autoPrioritySelect.value, 10))
                    : false;
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

        // Append the research container to the research list
        researchListContainer.appendChild(researchContainer);

        researchElementCache.set(research.id, {
            container: researchContainer,
            button: researchButton,
            costEl: researchCost,
            descEl: researchDescription,
            hideToggle,
            autoCheckbox,
            autoLabel,
            autoPrioritySelect,
        });
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
            toggleButton.textContent = completedResearchHidden ? 'Show Hidden' : 'Hide Hidden';
        }
    });
}

function updateAdvancedResearchVisibility() {
    const visible = researchManager && researchManager.isBooleanFlagSet('advancedResearchUnlocked');
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
        researchSubtabManager: () => researchSubtabManager
    };
}
