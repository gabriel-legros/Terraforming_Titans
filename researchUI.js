let completedResearchHidden =
    (typeof gameSettings !== 'undefined' && gameSettings.hideCompletedResearch) ||
    false; // Initialize the toggle state

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
        researchData[tab].forEach((researchItem) => {
            const button = document.getElementById(`research-${researchItem.id}`);
            if (button) {
                
                // Add or remove the 'completed-research' class based on the research status
                const researchContainer = button.closest('.research-item');
                if (researchContainer) {
                    if (researchItem.isResearched) {
                        researchContainer.classList.add('completed-research');
                        // Hide or show the completed research based on the toggle state
                        researchContainer.classList.toggle('hidden', completedResearchHidden);
                    } else {
                        researchContainer.classList.remove('completed-research');
                        researchContainer.classList.remove('hidden');
                    }
                }

                updateResearchButtonText(button, researchItem);
            }
        });
    });
}

function updateResearchButtonText(button, researchItem) {
    let buttonText = `${researchItem.name}`;

    // Check if the research is already done
    if (researchItem.isResearched) {
        buttonText += ' - Researched';
        button.disabled = true; // Disable the button if the research is already done
        button.style.color = 'grey'; // Set the text color to grey when research is completed
    } else if (!canAffordResearch(researchItem)) {
        // If research can't be afforded, set color to red
        button.style.color = 'red';
    } else {
        // Otherwise, set to default color
        button.style.color = 'inherit';
    }

    button.textContent = buttonText;
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
    // Remove active class from all subtabs and subtab-contents
    document.querySelectorAll('.research-subtab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.research-subtab-content').forEach((t) => t.classList.remove('active'));
    
    // Add active class to the clicked subtab and corresponding content
    document.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');
    document.getElementById(subtabId).classList.add('active');
}

function loadResearchCategory(category) {
    const researchListContainer = document.getElementById(`${category}-research-buttons`);
    if (!researchListContainer) {
        console.error(`Container for ${category} research buttons not found.`);
        return;
    }

    // Clear the current research list
    researchListContainer.innerHTML = '';

    // Load research items for the given category
    const researches = researchManager.getResearchesByCategory(category);
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

    researches.forEach((research) => {
        if (research.requiresMethane && !planetHasMethane()) {
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
        updateResearchButtonText(researchButton, research);

        researchButton.addEventListener('click', () => {
            researchManager.completeResearch(research.id);
            updateAllResearchButtons(researchManager.researches);
        });

        const researchDescription = document.createElement('p');
        researchDescription.classList.add('research-description');
        researchDescription.textContent = research.description;

        const researchCost = document.createElement('p');
        researchCost.classList.add('research-cost');
        researchCost.textContent = `Cost: ${formatResearchCost(research.cost)}`;

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