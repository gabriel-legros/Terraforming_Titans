// spaceUI.js

// Store reference to the SpaceManager instance
let _spaceManagerInstance = null;

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

    const optionsContainer = document.getElementById('planet-selection-options');
    const statusContainer = document.getElementById('travel-status');

    if (!optionsContainer) {
        console.error("Space UI critical element '#planet-selection-options' not found.");
        return;
    }
     if (statusContainer) {
         statusContainer.innerHTML = "";
         statusContainer.style.display = 'none'; // Hide travel status
     }

    updateSpaceUI(); // Perform the initial draw using the stored instance
}

/**
 * Updates the planet selection display in the Space Tab UI.
 * Reads data from global planetParameters and the stored _spaceManagerInstance.
 */

function updateSpaceUI() {
    if (!_spaceManagerInstance) return; // Guard clause

    const optionsContainer = document.getElementById('planet-selection-options');
    const statusContainer = document.getElementById('travel-status');
    if (!optionsContainer) return; // Guard clause

    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();

    if (!allPlanetData) {
        optionsContainer.innerHTML = '<p style="color: red;">Error: Planet data unavailable.</p>';
        return;
    }

    const canChangePlanet = _spaceManagerInstance.isPlanetTerraformed(_spaceManagerInstance.getCurrentPlanetKey());

    optionsContainer.innerHTML = ''; // Clear
    if (statusContainer) {
        statusContainer.style.display = canChangePlanet ? 'none' : 'block';
        statusContainer.textContent = canChangePlanet ? '' : 'Current planet must be fully terraformed before traveling.';
    }

    Object.entries(allPlanetData).forEach(([key, data]) => {
        if (!data || !data.celestialParameters || !data.name) return; // Skip bad data

        const celestial = data.celestialParameters;
        const planetDiv = document.createElement('div');
        planetDiv.classList.add('planet-option');
        planetDiv.dataset.planetKey = key;

        // --- Get Status from Manager ---
        const isTerraformed = _spaceManagerInstance.isPlanetTerraformed(key); // <<< Check status

        // Name - Add indication if terraformed
        const nameHeading = document.createElement('h3');
        nameHeading.textContent = data.name + (isTerraformed ? " (Terraformed)" : ""); // <<< Indicate status
        if (isTerraformed) {
            nameHeading.style.color = '#4CAF50'; // Example: Green text if terraformed
        }
        planetDiv.appendChild(nameHeading);

        // Stats (same as before)
        const statsDiv = document.createElement('div');
        statsDiv.classList.add('planet-stats');
        const format = typeof formatNumber === 'function' ? formatNumber : (n => n);
        statsDiv.innerHTML = `
            <p><strong>Distance:</strong> ${celestial.distanceFromSun} AU</p>
            <p><strong>Gravity:</strong> ${celestial.gravity} m/s²</p>
            <p><strong>Radius:</strong> ${format(celestial.radius)} km</p>
            <p><strong>Albedo:</strong> ${celestial.albedo}</p>
            <p><strong>Status:</strong> ${isTerraformed ? '<span style="color: #4CAF50;">Terraforming Complete</span>' : 'Terraforming pending'}</p>
        `; // <<< Added Status line
        planetDiv.appendChild(statsDiv);

        // Button (logic remains the same - disable based on current location or future travel state)
        const selectButton = document.createElement('button');
        selectButton.classList.add('select-planet-button');
        selectButton.dataset.planetKey = key;

        if (key === currentKey) {
            selectButton.textContent = 'Current Location';
            selectButton.disabled = true;
            selectButton.title = `You are currently at ${data.name}.`;
        } else {
            // Disable button if the target planet is already terraformed? (Gameplay decision)
            // if (isTerraformed) {
            //    selectButton.textContent = 'Already Terraformed';
            //    selectButton.disabled = true;
            //} else {
                selectButton.textContent = `Select ${data.name}`;
                selectButton.disabled = !canChangePlanet; // Enable only if current planet terraformed
                selectButton.title = canChangePlanet ? `Travel to ${data.name}` : 'Finish terraforming before traveling';
            //}
        }
        planetDiv.appendChild(selectButton);
        optionsContainer.appendChild(planetDiv);
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
    if(!_spaceManagerInstance.changeCurrentPlanet(planetKey)) return;

    const firstVisit = _spaceManagerInstance.visitPlanet(planetKey);
    if(firstVisit && typeof skillManager !== 'undefined' && skillManager){
        skillManager.skillPoints += 1;
    }

    if(planetParameters[planetKey]){
        defaultPlanet = planetKey;
        currentPlanetParameters = planetParameters[planetKey];
    }

    initializeGameState({preserveManagers: true});
    updateSpaceUI();
}