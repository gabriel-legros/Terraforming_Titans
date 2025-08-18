let completedResearchHidden =
    (typeof gameSettings !== 'undefined' && gameSettings.hideCompletedResearch) ||
    false; // Initialize the toggle state

let researchTabAlertNeeded = false;
const researchSubtabAlerts = {
    'energy-research': false,
    'industry-research': false,
    'colonization-research': false,
    'terraforming-research': false,
    'advanced-research': false,
};

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
            const button = document.getElementById(`research-${researchItem.id}`);
            if (button) {
                
                // Add or remove the 'completed-research' class based on the research status
                const researchContainer = button.closest('.research-item');
                if (researchContainer) {
                    if (researchItem.isResearched) {
                        researchContainer.classList.add('completed-research');
                        researchContainer.classList.toggle('hidden', completedResearchHidden);
                    } else {
                        researchContainer.classList.remove('completed-research');
                        researchContainer.classList.remove('hidden');
                    }
                    const costEl = researchContainer.querySelector('.research-cost');
                    const descEl = researchContainer.querySelector('.research-description');
                    const isVisible = visibleIds.has(researchItem.id);
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
                } else {
                    const isVisible = visibleIds.has(researchItem.id);
                    updateResearchButtonText(button, researchItem, isVisible);
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
    const activeSubtab = document.querySelector('.research-subtab.active');
    if (
        activeTab &&
        activeTab.classList.contains('active') &&
        activeSubtab &&
        activeSubtab.dataset.subtab === subtabId &&
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
    const active = document.querySelector('.research-subtab.active');
    if (active && typeof markResearchSubtabViewed === 'function') {
        markResearchSubtabViewed(active.dataset.subtab);
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
    // Set up event listeners for research sub-tabs
    document.querySelectorAll('.research-subtab').forEach(subtab => {
        subtab.onclick = () => {
            const subtabContentId = subtab.dataset.subtab;
            activateResearchSubtab(subtabContentId);
            if (typeof markResearchSubtabViewed === 'function') {
                markResearchSubtabViewed(subtabContentId);
            }
        };
    });

    // Add event listeners for "Toggle Completed" buttons
    document.querySelectorAll('.toggle-completed-button').forEach(button => {
        button.onclick = toggleCompletedResearch;
    });

    updateAdvancedResearchVisibility();

    // Load all research categories
    const researchCategories = ['energy', 'industry', 'colonization', 'terraforming', 'advanced'];
    researchCategories.forEach(category => {
        loadResearchCategory(category);
    });

    updateAllResearchButtons(researchManager.researches);
    updateCompletedResearchVisibility();

    // Activate the 'energy' category
    activateResearchSubtab('energy-research');
}

function activateResearchSubtab(subtabId) {
    activateSubtab('research-subtab', 'research-subtab-content', subtabId);
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

        // Append button, cost, and description to the research container
        researchContainer.appendChild(researchButton);
        researchContainer.appendChild(researchCost);
        researchContainer.appendChild(researchDescription);

        // Append the research container to the research list
        researchListContainer.appendChild(researchContainer);
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
    const toggleButtons = document.querySelectorAll('.toggle-completed-button');
    const allResearches = Object.values(researchManager.researches).flat();
    const completedResearch = allResearches.filter((research) => research.isResearched);

    toggleButtons.forEach((toggleButton) => {
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
    const subtab = document.querySelector('.research-subtab[data-subtab="advanced-research"]');
    const content = document.getElementById('advanced-research');
    if (subtab && content) {
        if (visible) {
            subtab.classList.remove('hidden');
            content.classList.remove('hidden');
        } else {
            subtab.classList.add('hidden');
            content.classList.add('hidden');
        }
    }
}

function updateResearchUI() {
    if (researchManager.orderDirty) {
        const categories = ['energy', 'industry', 'colonization', 'terraforming', 'advanced'];
        categories.forEach(category => loadResearchCategory(category));
        researchManager.orderDirty = false;
    }
    updateAllResearchButtons(researchManager.researches); // Update research buttons display
    updateCompletedResearchVisibility();
    updateAdvancedResearchVisibility();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registerResearchUnlockAlert, updateResearchAlert, initializeResearchAlerts, markResearchSubtabViewed, markResearchViewed };
}
