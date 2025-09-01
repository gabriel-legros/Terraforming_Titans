// spaceUI.js

// Store reference to the SpaceManager instance
let _spaceManagerInstance = null;
// Cache of DOM nodes for each planet keyed by planet id
const planetUIElements = {};
// Track whether the space UI has been generated already
if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let spaceUIInitialized = false;
// Track visibility of the Random subtab
let spaceRandomTabVisible = false;
let spaceSubtabManager = null;
// Cache the last rendered world so we can skip redundant updates
let lastWorldKey = null;
let lastWorldSeed = null;

function showSpaceRandomTab() {
    spaceRandomTabVisible = true;
    if (spaceSubtabManager) {
        spaceSubtabManager.show('space-random');
    } else {
        const tab = document.querySelector('[data-subtab="space-random"]');
        const content = document.getElementById('space-random');
        if (tab) tab.classList.remove('hidden');
        if (content) content.classList.remove('hidden');
    }
}

function hideSpaceRandomTab() {
    spaceRandomTabVisible = false;
    if (spaceSubtabManager) {
        spaceSubtabManager.hide('space-random');
    } else {
        const tab = document.querySelector('[data-subtab="space-random"]');
        const content = document.getElementById('space-random');
        if (tab) tab.classList.add('hidden');
        if (content) content.classList.add('hidden');
    }
}

function updateSpaceRandomVisibility() {
    if (!_spaceManagerInstance) return;
    if (_spaceManagerInstance.randomTabEnabled) {
        if (!spaceRandomTabVisible) {
            showSpaceRandomTab();
        }
    } else if (spaceRandomTabVisible) {
        hideSpaceRandomTab();
    }
}

function initializeSpaceTabs() {
    if (typeof SubtabManager !== 'function') return;
    spaceSubtabManager = new SubtabManager('.space-subtab', '.space-subtab-content', true);
}

function activateSpaceSubtab(subtabId) {
    if (spaceSubtabManager) {
        spaceSubtabManager.activate(subtabId);
    }
}

// Reset the cached world key and seed so the next update rebuilds the details box
function resetCurrentWorldCache() {
    lastWorldKey = null;
    lastWorldSeed = null;
}

/**
 * Initializes the Space Tab UI elements and stores the SpaceManager instance.
 * @param {SpaceManager} spaceManager - The instance of the SpaceManager.
 */
function initializeSpaceUI(spaceManager) {
    if (!spaceManager || typeof spaceManager.getCurrentPlanetKey !== 'function') {
        console.error("initializeSpaceUI requires a valid SpaceManager instance.");
        return;
    }
    _spaceManagerInstance = spaceManager; // Store the instance for later use
    // Reset cached world details whenever we get a new manager
    resetCurrentWorldCache();
    console.log("Initializing Space UI with SpaceManager reference.");
    initializeSpaceTabs();
    hideSpaceRandomTab();

    // If the UI has already been generated, just update with the new instance
    if (spaceUIInitialized) {
        updateSpaceUI();
        return;
    }
    spaceUIInitialized = true;

    const optionsContainer = document.getElementById('planet-selection-options');
    const statusContainer = document.getElementById('travel-status');

    if (!optionsContainer) {
        console.error("Space UI critical element '#planet-selection-options' not found.");
        return;
    }
    if (statusContainer) {
        statusContainer.innerHTML = '';
        statusContainer.style.display = 'none'; // Hide travel status
    }

    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    if (!allPlanetData) {
        optionsContainer.innerHTML = '<p style="color: red;">Error: Planet data unavailable.</p>';
        return;
    }

    const format = typeof formatNumber === 'function' ? formatNumber : (n => n);
    Object.entries(allPlanetData).forEach(([key, data]) => {
        if (!data || !data.celestialParameters || !data.name) return;
        const celestial = data.celestialParameters;

        const planetDiv = document.createElement('div');
        planetDiv.classList.add('planet-option');
        planetDiv.dataset.planetKey = key;

        const nameHeading = document.createElement('h3');
        planetDiv.appendChild(nameHeading);

        const statsDiv = document.createElement('div');
        statsDiv.classList.add('planet-stats');
        statsDiv.innerHTML = `
            <p><strong>Distance:</strong><span>${celestial.distanceFromSun} AU</span></p>
            <p><strong>Gravity:</strong><span>${celestial.gravity} m/s²</span></p>
            <p><strong>Radius:</strong><span>${format(celestial.radius)} km</span></p>
            <p><strong>Albedo:</strong><span>${celestial.albedo}</span></p>
            <p><strong>Status:</strong><span class="planet-status"></span></p>
        `;
        planetDiv.appendChild(statsDiv);

        const selectButton = document.createElement('button');
        selectButton.classList.add('select-planet-button');
        selectButton.dataset.planetKey = key;
        planetDiv.appendChild(selectButton);

        optionsContainer.appendChild(planetDiv);

        planetUIElements[key] = {
            container: planetDiv,
            nameHeading,
            statusSpan: statsDiv.querySelector('.planet-status'),
            button: selectButton
        };
    });

    updateSpaceUI(); // Perform the initial draw using the stored instance

    const detailsContainer = document.getElementById('current-world-details-container');
    if (detailsContainer) {
        const header = detailsContainer.querySelector('.summary-header');
        const content = detailsContainer.querySelector('.details-content');
        const arrow = detailsContainer.querySelector('.summary-arrow');

        if (header && content && arrow) {
            header.addEventListener('click', () => {
                content.classList.toggle('hidden');
                arrow.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
            });
        }
    }
}

/**
 * Updates the planet selection display in the Space Tab UI.
 * Reads data from global planetParameters and the stored _spaceManagerInstance.
 */

function updateSpaceUI() {
    if (!_spaceManagerInstance) return; // Guard clause
    updateSpaceRandomVisibility();
    updateCurrentWorldUI();

    const statusContainer = document.getElementById('travel-status');
    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    if (!allPlanetData) return;

    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();
    const currentSeed = _spaceManagerInstance.getCurrentRandomSeed ? _spaceManagerInstance.getCurrentRandomSeed() : null;
    const isTerraformed = _spaceManagerInstance.isPlanetTerraformed(currentKey);
    const canChangePlanet = currentSeed !== null || isTerraformed;

    if (statusContainer) {
        const showWarning = currentSeed === null && !isTerraformed;
        statusContainer.style.display = showWarning ? 'block' : 'none';
        statusContainer.textContent = showWarning ? 'Current planet must be fully terraformed before traveling.' : '';
    }

    Object.entries(allPlanetData).forEach(([key, data]) => {
        const ui = planetUIElements[key];
        if (!ui) return;

        const isEnabled = _spaceManagerInstance.isPlanetEnabled(key);
        ui.container.style.display = isEnabled ? 'block' : 'none';

        const isTerraformed = _spaceManagerInstance.isPlanetTerraformed(key);
        ui.nameHeading.textContent = data.name;
        ui.nameHeading.style.color = isTerraformed ? '#4CAF50' : '';
        ui.statusSpan.textContent = isTerraformed ? 'Terraforming Complete' : 'Terraforming pending';
        ui.statusSpan.style.color = isTerraformed ? '#4CAF50' : '';

        if (key === currentKey) {
            ui.button.textContent = 'Current Location';
            ui.button.disabled = true;
            ui.button.title = `You are currently at ${data.name}.`;
        } else if (isTerraformed) {
            ui.button.textContent = 'Already Terraformed';
            ui.button.disabled = true;
            ui.button.title = `${data.name} has already been terraformed.`;
        } else {
            ui.button.textContent = `Select ${data.name}`;
            ui.button.disabled = !canChangePlanet;
            ui.button.title = canChangePlanet ? `Travel to ${data.name}` : 'Finish terraforming before traveling';
        }
    });
}

// Handle click events for selecting planets
document.addEventListener('click', function(evt){
    const btn = evt.target.closest('.select-planet-button');
    if(btn){
        const key = btn.dataset.planetKey;
        selectPlanet(key);
    }
});

/**
 * Select a planet and reset the game state for it.
 * @param {string} planetKey
 */
function selectPlanet(planetKey){
    if(!_spaceManagerInstance) {
        console.error('SpaceManager not initialized');
        return;
    }
    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();
    const currentSeed = _spaceManagerInstance.getCurrentRandomSeed ? _spaceManagerInstance.getCurrentRandomSeed() : null;
    if(currentSeed === null && !_spaceManagerInstance.isPlanetTerraformed(currentKey)) {
        console.warn('Cannot travel until current planet is terraformed.');
        return;
    }
    if(!_spaceManagerInstance.isPlanetEnabled(planetKey)) {
        console.warn('Planet not yet available.');
        return;
    }
    if(_spaceManagerInstance.isPlanetTerraformed(planetKey)) {
        console.warn('Target planet already terraformed.');
        return;
    }
    const storageState = _spaceManagerInstance.prepareForTravel();

    if(!_spaceManagerInstance.changeCurrentPlanet(planetKey)) return;

    // World has changed, invalidate cached details before rebuilding UI
    resetCurrentWorldCache();

    const firstVisit = _spaceManagerInstance.visitPlanet(planetKey);
    const departingTerraformed = _spaceManagerInstance.isPlanetTerraformed(currentKey);
    const destinationTerraformed = _spaceManagerInstance.isPlanetTerraformed(planetKey);
    if(firstVisit && departingTerraformed && !destinationTerraformed && typeof skillManager !== 'undefined' && skillManager){
        skillManager.skillPoints += 1;
    }

    if(planetParameters[planetKey]){
        defaultPlanet = planetKey;
        currentPlanetParameters = planetParameters[planetKey];
    }

    initializeGameState({preserveManagers: true, preserveJournal: true});

    if (storageState && projectManager?.projects?.spaceStorage?.loadTravelState) {
        projectManager.projects.spaceStorage.loadTravelState(storageState);
        if (typeof updateProjectUI === 'function') {
            updateProjectUI('spaceStorage');
        }
    }

    updateSpaceUI();
}

function updateCurrentWorldUI() {
    if (!_spaceManagerInstance) return;
    const key = _spaceManagerInstance.getCurrentPlanetKey();
    const seed = _spaceManagerInstance.getCurrentRandomSeed();
    if (key === lastWorldKey && seed === lastWorldSeed) {
        return;
    }
    lastWorldKey = key;
    lastWorldSeed = seed;

    const nameSpan = document.getElementById('current-world-name');
    const detailsBox = document.getElementById('current-world-details');
    if (nameSpan) {
        nameSpan.textContent = _spaceManagerInstance.getCurrentWorldName();
    }
    if (detailsBox) {
        const data = _spaceManagerInstance.getCurrentWorldOriginal();
        const seedArg = seed === null ? undefined : seed;
        if (data && typeof renderWorldDetail === 'function') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = renderWorldDetail(data, seedArg);
            const eqBtn = wrapper.querySelector('#rwg-equilibrate-btn');
            if (eqBtn) {
                eqBtn.nextElementSibling?.remove();
                eqBtn.remove();
            }
            wrapper.querySelector('#rwg-travel-btn')?.remove();
            wrapper.querySelector('#rwg-travel-warning')?.remove();
            wrapper.querySelectorAll('[id]').forEach(el => {
                if(el.id !== 'current-world-details') el.removeAttribute('id')
            });
            if (seedArg === undefined) {
                wrapper.querySelectorAll('.rwg-chip').forEach(chip => {
                    const label = chip.querySelector('.label')?.textContent;
                    if (label === 'Seed' || label === 'Type') {
                        chip.remove();
                    }
                });
            }
            const detailsContent = detailsBox.querySelector('.details-content') || detailsBox;
            detailsContent.replaceChildren(wrapper);
        } else {
            const detailsContent = detailsBox.querySelector('.details-content') || detailsBox;
            detailsContent.textContent = '';
        }
    }
}
