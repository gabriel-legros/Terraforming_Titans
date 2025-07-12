// spaceUI.js

// Store reference to the SpaceManager instance
let _spaceManagerInstance = null;
// Cache of DOM nodes for each planet keyed by planet id
const planetUIElements = {};
// Track whether the space UI has been generated already
let spaceUIInitialized = false;

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
    console.log("Initializing Space UI with SpaceManager reference.");

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
            <p><strong>Distance:</strong> ${celestial.distanceFromSun} AU</p>
            <p><strong>Gravity:</strong> ${celestial.gravity} m/s²</p>
            <p><strong>Radius:</strong> ${format(celestial.radius)} km</p>
            <p><strong>Albedo:</strong> ${celestial.albedo}</p>
            <p><strong>Status:</strong> <span class="planet-status"></span></p>
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
}

/**
 * Updates the planet selection display in the Space Tab UI.
 * Reads data from global planetParameters and the stored _spaceManagerInstance.
 */

function updateSpaceUI() {
    if (!_spaceManagerInstance) return; // Guard clause

    const statusContainer = document.getElementById('travel-status');
    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    if (!allPlanetData) return;

    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();
    const canChangePlanet = _spaceManagerInstance.isPlanetTerraformed(currentKey);

    if (statusContainer) {
        statusContainer.style.display = canChangePlanet ? 'none' : 'block';
        statusContainer.textContent = canChangePlanet ? '' : 'Current planet must be fully terraformed before traveling.';
    }

    Object.entries(allPlanetData).forEach(([key, data]) => {
        const ui = planetUIElements[key];
        if (!ui) return;

        const isEnabled = _spaceManagerInstance.isPlanetEnabled(key);
        ui.container.style.display = isEnabled ? 'block' : 'none';

        const isTerraformed = _spaceManagerInstance.isPlanetTerraformed(key);
        ui.nameHeading.textContent = data.name + (isTerraformed ? ' (Terraformed)' : '');
        ui.nameHeading.style.color = isTerraformed ? '#4CAF50' : '';
        ui.statusSpan.innerHTML = isTerraformed ? '<span style="color: #4CAF50;">Terraforming Complete</span>' : 'Terraforming pending';

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
    if(!_spaceManagerInstance.isPlanetTerraformed(currentKey)) {
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
    if(!_spaceManagerInstance.changeCurrentPlanet(planetKey)) return;

    const firstVisit = _spaceManagerInstance.visitPlanet(planetKey);
    if(firstVisit && typeof skillManager !== 'undefined' && skillManager){
        skillManager.skillPoints += 1;
    }

    if(planetParameters[planetKey]){
        defaultPlanet = planetKey;
        currentPlanetParameters = planetParameters[planetKey];
    }

    initializeGameState({preserveManagers: true, preserveJournal: true});
    updateSpaceUI();
}