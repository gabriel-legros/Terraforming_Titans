// space.js

class SpaceManager {
    constructor(planetsData) { // Keep planetsData for validation
        if (!planetsData) {
            throw new Error("SpaceManager requires planetsData during construction.");
        }
        this.allPlanetsData = planetsData;
        this.currentPlanetKey = 'mars';
        // <<< NEW: Store status per planet >>>
        this.planetStatuses = {};

        this._initializePlanetStatuses();
        console.log("SpaceManager initialized with planet statuses.");
    }

    // Initialize status for all known planets
    _initializePlanetStatuses() {
        this.planetStatuses = {}; // Reset statuses
        Object.keys(this.allPlanetsData).forEach(key => {
            this.planetStatuses[key] = {
                terraformed: false,
                // Add other statuses later if needed (e.g., colonized: false)
            };
        });
    }

    // --- Getters (Keep existing getters) ---
    getCurrentPlanetKey() { return this.currentPlanetKey; }
    getCurrentPlanetData() { /* ... same as before ... */ }

    /**
     * Gets the terraforming status for a specific planet.
     * @param {string} planetKey - The key of the planet.
     * @returns {boolean} - True if terraformed, false otherwise. Returns false if planet not found.
     */
    isPlanetTerraformed(planetKey) {
        return this.planetStatuses[planetKey]?.terraformed || false;
    }

    /**
     * Gets the full status object for a specific planet.
     * @param {string} planetKey - The key of the planet.
     * @returns {object | null} - The status object or null if planet not found.
     */
    getPlanetStatus(planetKey) {
        return this.planetStatuses[planetKey] || null;
    }

    // --- Setters / Updates ---

    /**
     * Updates the terraforming status for the *current* planet.
     * This should be called by game.js based on the Terraforming module's state.
     * @param {boolean} isComplete - The terraforming completion status.
     */
    updateCurrentPlanetTerraformedStatus(isComplete) {
        if (this.planetStatuses[this.currentPlanetKey]) {
            if (this.planetStatuses[this.currentPlanetKey].terraformed !== isComplete) {
                 this.planetStatuses[this.currentPlanetKey].terraformed = isComplete;
                 console.log(`SpaceManager: Terraformed status for ${this.currentPlanetKey} updated to ${isComplete}`);
            }
        } else {
            console.error(`SpaceManager: Cannot update terraformed status for unknown current planet key: ${this.currentPlanetKey}`);
        }
    }


    /**
     * Internal method to set the current planet key.
     * @param {string} key - The key of the planet to set as current.
     * @returns {boolean} - True if the key was valid and set, false otherwise.
     */
    _setCurrentPlanetKey(key) {
         // Validation against allPlanetsData
        if (this.allPlanetsData[key]) {
            if (this.currentPlanetKey !== key) {
                this.currentPlanetKey = key;
                console.log(`SpaceManager: Current planet set to: ${this.currentPlanetKey}`);
            }
             // Ensure status object exists for the new current planet
             if (!this.planetStatuses[key]) {
                  this.planetStatuses[key] = { terraformed: false };
                  console.warn(`SpaceManager: Initialized missing status for planet ${key}.`);
             }
            return true;
        }
        console.error(`SpaceManager: Attempted to set invalid or unavailable planet key: ${key}`);
        return false;
    }

    /**
     * Public wrapper for setting the current planet.
     * Allows external callers (like the UI) to change planets safely.
     * @param {string} key - The planet key to switch to.
     * @returns {boolean} - True if the planet was changed.
     */
    changeCurrentPlanet(key) {
        return this._setCurrentPlanetKey(key);
    }

    // --- Save/Load ---
    saveState() {
        return {
            currentPlanetKey: this.currentPlanetKey,
            // <<< SAVE planetStatuses >>>
            planetStatuses: this.planetStatuses
        };
    }

    loadState(savedData) {
        // Reset to default before loading
        this.currentPlanetKey = 'mars';
        this._initializePlanetStatuses(); // Reset statuses to default structure

        if (!savedData) {
             console.log("SpaceManager: No save data provided, using defaults.");
             return; // Keep defaults initialized above
        }

        // Load current planet key
        let keyToLoad = 'mars';
        if (savedData.currentPlanetKey && this.allPlanetsData[savedData.currentPlanetKey]) {
            keyToLoad = savedData.currentPlanetKey;
        } else if (savedData.currentPlanetKey) {
            console.warn(`SpaceManager: Saved planet key "${savedData.currentPlanetKey}" is invalid. Defaulting to 'mars'.`);
        }
        this._setCurrentPlanetKey(keyToLoad); // Use internal setter

        // Load planet statuses, merging with default structure
        if (savedData.planetStatuses) {
            Object.keys(this.planetStatuses).forEach(planetKey => {
                if (savedData.planetStatuses[planetKey]) {
                    // Only update known properties (like 'terraformed')
                    if (typeof savedData.planetStatuses[planetKey].terraformed === 'boolean') {
                        this.planetStatuses[planetKey].terraformed = savedData.planetStatuses[planetKey].terraformed;
                    }
                    // Add loading for other future status properties here
                }
            });
            console.log("SpaceManager: Loaded planet statuses from save data.");
        } else {
            console.log("SpaceManager: No planet statuses found in save data, keeping defaults.");
        }

         console.log("SpaceManager state loaded:", this.saveState());
    }
}