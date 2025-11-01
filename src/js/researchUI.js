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
    const researchTabs = ['energy', 'industry', 'colonization', 'terraforming', 'advanced'];
    researchTabs.forEach((tab) => {
        const visibleIds = researchManager.getVisibleResearchIdsByCategory
            ? researchManager.getVisibleResearchIdsByCategory(tab)
            : new Set(researchData[tab].map(r => r.id));
        researchData[tab].forEach((researchItem) => {
            const elements = researchElementCache.get(researchItem.id);
            if (!elements) return;
            const { button, costEl, descEl, container, autoCheckbox } = elements;

            if (researchItem.isResearched) {
                container.classList.add('completed-research');
                container.classList.toggle('hidden', completedResearchHidden);
            } else {
                container.classList.remove('completed-research');
                container.classList.remove('hidden');
            }

            const isVisible = visibleIds.has(researchItem.id);
            const hiddenByDisableFlag = !researchItem.isResearched && hasActiveDisableFlag(researchItem);
            container.style.display = hiddenByDisableFlag ? 'none' : '';
            updateResearchButtonText(button, researchItem, isVisible);
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
                autoCheckbox.style.display = unlocked ? '' : 'none';
                if (unlocked) {
                    autoCheckbox.checked = researchManager.isAutoResearchEnabled(
                        researchManager.currentAutoResearchPreset,
                        researchItem.id
                    );
                }
            }
        });
    });
}

function updateResearchButtonText(button, researchItem, visible) {
    let buttonText = visible ? `${researchItem.name}` : '???';

    // Check if the research is already done
    if (researchItem.isResearched) {
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

    const planetHasMethane = () => {
        const surf = currentPlanetParameters.resources.surface;
        const atm = currentPlanetParameters.resources.atmospheric;
        return (surf.liquidMethane?.initialValue || 0) > 0 ||
               (surf.hydrocarbonIce?.initialValue || 0) > 0 ||
               (atm.atmosphericMethane?.initialValue || 0) > 0;
    };

    const planetHasGeothermal = () => {
        const geo = currentPlanetParameters.resources.underground?.geothermal;
        return (geo?.maxDeposits || 0) > 0;
    };

    researches.forEach((research) => {
        if (research.requiresMethane && !planetHasMethane()) {
            return;
        }
        if (research.requiresGeothermal && !planetHasGeothermal()) {
            return;
        }
        if (research.requiredFlags && !research.requiredFlags.every(f => researchManager.isBooleanFlagSet(f))) {
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
        if (category !== 'advanced') {
            autoCheckbox = document.createElement('input');
            autoCheckbox.type = 'checkbox';
            autoCheckbox.classList.add('research-auto-checkbox');
            autoCheckbox.checked = researchManager.isAutoResearchEnabled(
                researchManager.currentAutoResearchPreset,
                research.id
            );
            autoCheckbox.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            autoCheckbox.addEventListener('change', () => {
                const applied = researchManager.setAutoResearchEnabled(
                    researchManager.currentAutoResearchPreset,
                    research.id,
                    autoCheckbox.checked
                );
                if (!applied) {
                    autoCheckbox.checked = false;
                }
            });
            const unlocked = researchManager.autoResearchEnabled ||
                researchManager.isBooleanFlagSet('autoResearchEnabled');
            autoCheckbox.style.display = unlocked ? '' : 'none';
            researchContainer.appendChild(autoCheckbox);
        }

        // Append button, cost, and description to the research container
        researchContainer.appendChild(researchButton);
        researchContainer.appendChild(researchCost);
        researchContainer.appendChild(researchDescription);

        // Append the research container to the research list
        researchListContainer.appendChild(researchContainer);

        researchElementCache.set(research.id, {
            container: researchContainer,
            button: researchButton,
            costEl: researchCost,
            descEl: researchDescription,
            autoCheckbox,
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
    const completedResearch = allResearches.filter((research) => research.isResearched);

    cachedToggleButtons.forEach((toggleButton) => {
        if (completedResearch.length === 0) {
            toggleButton.style.display = 'none';
        } else {
            toggleButton.style.display = 'inline-block';
            toggleButton.textContent = completedResearchHidden ? 'Show Completed' : 'Hide Completed';
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
