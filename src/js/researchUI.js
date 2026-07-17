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

function applyHiddenResearchFlags(category = null) {
    ensureHiddenResearchIds();
    const categories = category ? [category] : Object.keys(researchManager.researches);
    categories.forEach(researchCategory => {
        researchManager.researches[researchCategory].forEach(r => {
            const hidden = hiddenResearchIds.includes(r.id);
            if (r.hiddenByUser !== hidden) {
                r.hiddenByUser = hidden;
            }
        });
    });
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

function updateAllResearchButtons(researchData, category = null) {
    applyHiddenResearchFlags(category);
    const researchTabs = category
        ? [category]
        : ['energy', 'industry', 'colonization', 'terraforming', 'advanced'];
    researchTabs.forEach((tab) => {
        const visibleIds = researchManager.getVisibleResearchIdsByCategory
            ? researchManager.getVisibleResearchIdsByCategory(tab)
            : new Set(researchData[tab].map(r => r.id));
        researchData[tab].forEach((researchItem) => {
            const elements = researchElementCache.get(researchItem.id);
            if (!elements) return;
            const { button, costEl, descEl, container, autoCheckbox, autoLabel, autoPrioritySelect, hideToggle } = elements;

            const markCompleted = researchItem.isResearched && !researchItem.repeatable;
            if (container.classList.contains('completed-research') !== markCompleted) {
                container.classList.toggle('completed-research', markCompleted);
            }
            const hideForUser = completedResearchHidden && isResearchHidden(researchItem);
            if (container.classList.contains('hidden') !== hideForUser) {
                container.classList.toggle('hidden', hideForUser);
            }

            const isVisible = visibleIds.has(researchItem.id);
            const isDisplayable = researchManager.isResearchDisplayable(researchItem);
            const hiddenByDisableFlag = !researchItem.isResearched && hasActiveDisableFlag(researchItem);
            const display = (researchItem.disabled || hiddenByDisableFlag || !isDisplayable) ? 'none' : '';
            if (container.style.display !== display) {
                container.style.display = display;
            }
            updateResearchButtonText(button, researchItem, isVisible);
            if (hideToggle) {
                const hideToggleText = researchItem.hiddenByUser
                    ? getResearchUIText('ui.research.unhide', 'Unhide')
                    : getResearchUIText('ui.research.hide', 'Hide');
                if (hideToggle.textContent !== hideToggleText) {
                    hideToggle.textContent = hideToggleText;
                }
            }
            if (costEl && descEl) {
                if (isVisible) {
                    const costText = getResearchUIText(
                        'ui.research.costLine',
                        'Cost: {cost}',
                        { cost: formatResearchCost(researchItem.cost) }
                    );
                    if (costEl.textContent !== costText) {
                        costEl.textContent = costText;
                    }
                    if (descEl.textContent !== researchItem.description) {
                        descEl.textContent = researchItem.description;
                    }
                } else {
                    const costText = getResearchUIText('ui.research.unknownCost', 'Cost: ???');
                    if (costEl.textContent !== costText) {
                        costEl.textContent = costText;
                    }
                    if (descEl.textContent !== '???') {
                        descEl.textContent = '???';
                    }
                }
            }

            if (autoCheckbox) {
                const unlocked = researchManager.autoResearchEnabled ||
                    researchManager.isBooleanFlagSet('autoResearchEnabled');
                const display = unlocked ? '' : 'none';
                if (autoLabel) {
                    if (autoLabel.style.display !== display) {
                        autoLabel.style.display = display;
                    }
                }
                if (autoCheckbox.style.display !== display) {
                    autoCheckbox.style.display = display;
                }
                if (autoPrioritySelect) {
                    if (autoPrioritySelect.style.display !== display) {
                        autoPrioritySelect.style.display = display;
                    }
                }
                if (unlocked) {
                    const enabled = researchManager.getAutoResearchEnabled(researchItem.id);
                    if (autoCheckbox.checked !== enabled) {
                        autoCheckbox.checked = enabled;
                    }
                    if (autoPrioritySelect) {
                        const priority = `${researchManager.getAutoResearchPriority(researchItem.id)}`;
                        if (document.activeElement !== autoPrioritySelect && autoPrioritySelect.value !== priority) {
                            autoPrioritySelect.value = priority;
                        }
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

    let disabled = false;
    let color = 'inherit';

    // Check if the research is already done
    if (researchItem.isResearched && !researchItem.repeatable) {
        buttonText += getResearchUIText('ui.research.researchedSuffix', ' - Researched');
        disabled = true;
        color = 'grey';
    } else if (!visible) {
        disabled = true;
    } else if (!canAffordResearch(researchItem)) {
        // If research can't be afforded, keep the button enabled but show red
        color = 'red';
    }

    if (button.disabled !== disabled) {
        button.disabled = disabled;
    }
    if (button.style.color !== color) {
        button.style.color = color;
    }
    if (button.textContent !== buttonText) {
        button.textContent = buttonText;
    }
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
            const suffix = '-research';
            if (id.endsWith(suffix)) {
                updateAllResearchButtons(
                    researchManager.researches,
                    id.slice(0, -suffix.length)
                );
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
    let hasHiddenResearch = false;
    for (const category in researchManager.researches) {
        if (researchManager.researches[category].some(research => isResearchHidden(research))) {
            hasHiddenResearch = true;
            break;
        }
    }

    cachedToggleButtons.forEach((toggleButton) => {
        const display = hasHiddenResearch ? 'inline-block' : 'none';
        if (toggleButton.style.display !== display) {
            toggleButton.style.display = display;
        }
        if (!hasHiddenResearch) {
            return;
        }
        const toggleText = completedResearchHidden
            ? getResearchUIText('ui.research.showHidden', 'Show Hidden')
            : getResearchUIText('ui.research.hideHidden', 'Hide Hidden');
        if (toggleButton.textContent !== toggleText) {
            toggleButton.textContent = toggleText;
        }
    });
}

function updateAdvancedResearchVisibility() {
    const visible = researchManager && researchManager.isBooleanFlagSet('advancedResearchUnlocked') && !isCurrentWorldSubtabDisabled('advanced-research');
    if (researchSubtabManager) {
        const subtab = researchSubtabManager.getSubtab('advanced-research');
        const content = document.getElementById('advanced-research');
        const needsUpdate = visible
            ? subtab.classList.contains('hidden') || content.classList.contains('hidden')
            : !subtab.classList.contains('hidden') ||
                !content.classList.contains('hidden') ||
                researchSubtabManager.isActive('advanced-research');
        if (!needsUpdate) {
            return;
        }
        if (visible) {
            researchSubtabManager.show('advanced-research');
        } else {
            researchSubtabManager.hide('advanced-research');
        }
    } else {
        const subtab = document.querySelector('[data-subtab="advanced-research"]');
        const content = document.getElementById('advanced-research');
        if (subtab && content) {
            if (subtab.classList.contains('hidden') === visible) {
                subtab.classList.toggle('hidden', !visible);
            }
            if (content.classList.contains('hidden') === visible) {
                content.classList.toggle('hidden', !visible);
            }
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
    let refreshAll = false;
    if (researchManager.orderDirty || researchUICacheInvalidated) {
        applyHiddenResearchFlags();
        rebuildResearchCaches();
        researchManager.orderDirty = false;
        refreshAll = true;
    }
    const activeSubtabId = researchSubtabManager
        ? researchSubtabManager.getActiveId()
        : null;
    const suffix = '-research';
    const activeCategory = !refreshAll && activeSubtabId && activeSubtabId.endsWith(suffix)
        ? activeSubtabId.slice(0, -suffix.length)
        : null;
    updateAllResearchButtons(researchManager.researches, activeCategory);
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
