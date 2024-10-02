// Create Research Buttons for each category
function createResearchButtons(researchData) {
    const researchTabs = ['energy', 'industry', 'colonization', 'terraforming'];
    researchTabs.forEach((tab) => {
        const researchList = document.getElementById(`${tab}-research-buttons`);
        researchList.innerHTML = ''; // Clear existing buttons
        researchData[tab].forEach((researchItem) => {
            const button = document.createElement('button');
            button.classList.add('research-button');
            button.id = `research-${researchItem.id}`;
            updateResearchButtonText(button, researchItem);

            // Add event listener for research
            button.addEventListener('click', function () {
                researchManager.completeResearch(researchItem.id);
                updateAllResearchButtons(researchManager.researches);
            });

            researchList.appendChild(button);
        });
    });
}

function updateAllResearchButtons(researchData) {
    const researchTabs = ['energy', 'industry', 'colonization', 'terraforming'];
    researchTabs.forEach((tab) => {
        researchData[tab].forEach((researchItem) => {
            const button = document.getElementById(`research-${researchItem.id}`);
            if (button) {
                updateResearchButtonText(button, researchItem);
            }
        });
    });
}

function updateResearchButtonText(button, researchItem) {
    let buttonText = `${researchItem.name}`;

    // Check if the research can be afforded
    if (!canAffordResearch(researchItem)) {
        button.style.color = 'red';
    } else {
        button.style.color = 'inherit';
    }

    if (researchItem.isResearched) {
        buttonText += ' - Researched';
        button.disabled = true; // Disable the button if the research is already done
    }

    button.textContent = buttonText;
}

function initializeResearchTabs() {
    // Set up event listeners for research sub-tabs
    document.getElementById('energy-tab').addEventListener('click', () => {
        activateSubtab('energy');
        loadResearchCategory('energy');
    });
    document.getElementById('industry-tab').addEventListener('click', () => {
        activateSubtab('industry');
        loadResearchCategory('industry');
    });
    document.getElementById('colonization-tab').addEventListener('click', () => {
        activateSubtab('colonization');
        loadResearchCategory('colonization');
    });
    document.getElementById('terraforming-tab').addEventListener('click', () => {
        activateSubtab('terraforming');
        loadResearchCategory('terraforming');
    });

    // Initial load of research categories
    activateSubtab('energy');
    loadResearchCategory('energy');
}

function activateSubtab(subtab) {
    // Remove active class from all subtabs and subtab-contents
    document.querySelectorAll('.subtab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.subtab-content').forEach((tc) => tc.classList.remove('active'));

    // Add active class to the clicked subtab and corresponding content
    document.getElementById(`${subtab}-tab`).classList.add('active');
    document.getElementById(subtab).classList.add('active');
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

    researches.forEach((research) => {
        const researchContainer = document.createElement('div');
        researchContainer.classList.add('research-item');

        const researchButton = document.createElement('button');
        researchButton.classList.add('research-button');
        researchButton.id = `research-${research.id}`;
        updateResearchButtonText(researchButton, research);

        researchButton.addEventListener('click', () => {
            researchManager.completeResearch(research.id);
            loadResearchCategory(category); // Reload to update the availability and state
        });

        const researchDescription = document.createElement('p');
        researchDescription.classList.add('research-description');
        researchDescription.textContent = research.description;

        const researchCost = document.createElement('p');
        researchCost.classList.add('research-cost');
        researchCost.textContent = `Cost: ${research.cost} Research Points`;

        // Append button, cost, and description to the research container
        researchContainer.appendChild(researchButton);
        researchContainer.appendChild(researchCost);
        researchContainer.appendChild(researchDescription);

        // Append the research container to the research list
        researchListContainer.appendChild(researchContainer);
    });
}