// space.js

// Simple representation of the Sun used for original planet summaries
const SOL_STAR = {
    name: 'Sol',
    spectralType: 'G2V',
    luminositySolar: 1,
    massSolar: 1,
    temperatureK: 5778,
    habitableZone: { inner: 0.95, outer: 1.37 }
};

class SpaceManager extends EffectableEntity {
    constructor(planetsData) { // Keep planetsData for validation
        super({ description: 'Manages planetary travel' });
        if (!planetsData) {
            throw new Error("SpaceManager requires planetsData during construction.");
        }
        this.allPlanetsData = planetsData;
        this.currentPlanetKey = 'mars';
        // Store status per planet including whether it's been visited
        this.planetStatuses = {};
        this.randomTabEnabled = false;
        // Tracking for procedurally generated worlds
        this.currentRandomSeed = null;
        this.currentRandomName = '';
        this.randomWorldStatuses = {}; // seed -> { name, terraformed, colonists, original }

        this._initializePlanetStatuses();
        // Mark the starting planet as visited
        if (this.planetStatuses[this.currentPlanetKey]) {
            this.planetStatuses[this.currentPlanetKey].visited = true;
        }
        console.log("SpaceManager initialized with planet statuses.");
    }

    // Initialize status for all known planets
    _initializePlanetStatuses() {
        this.planetStatuses = {}; // Reset statuses
        Object.keys(this.allPlanetsData).forEach(key => {
            this.planetStatuses[key] = {
                terraformed: false,
                visited: false,
                enabled: false, // visible/selectable in UI
                colonists: 0,
                // Add other statuses later if needed
            };
        });

        // Mars and Titan are available from the start
        ['mars', 'titan'].forEach(p => {
            if (this.planetStatuses[p]) {
                this.planetStatuses[p].enabled = true;
            }
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
     * Checks if a planet is enabled/visible.
     * @param {string} planetKey
     * @returns {boolean}
     */
    isPlanetEnabled(planetKey) {
        return !!this.planetStatuses[planetKey]?.enabled;
    }

    /**
     * Counts how many planets have been fully terraformed.
     * The current planet only contributes if it is terraformed.
     * @returns {number}
     */
    getTerraformedPlanetCount() {
        return Object.values(this.planetStatuses)
            .filter(status => status.terraformed).length;
    }

    /**
     * Counts terraformed planets and includes the current planet if it isn't
     * terraformed yet. Used for terraforming-related bonuses that previously
     * added 1 unconditionally.
     * @returns {number}
     */
    getTerraformedPlanetCountIncludingCurrent() {
        const count = this.getTerraformedPlanetCount();
        return this.isPlanetTerraformed(this.currentPlanetKey) ? count : count + 1;
    }

    getCurrentWorldName() {
        if (this.currentRandomSeed !== null) {
            return this.currentRandomName || `Seed ${this.currentRandomSeed}`;
        }
        return this.allPlanetsData[this.currentPlanetKey]?.name || '';
    }

    getCurrentWorldOriginal() {
        if (this.currentRandomSeed !== null) {
            return this.randomWorldStatuses[this.currentRandomSeed]?.original || null;
        }
        const base = this.allPlanetsData[this.currentPlanetKey];
        if (!base) return null;
        const override = typeof planetOverrides !== 'undefined' ? planetOverrides[this.currentPlanetKey] : null;
        const merged = JSON.parse(JSON.stringify(base));
        const zones = ['tropical', 'temperate', 'polar'];
        let totalLiquidWater = 0, totalIce = 0, totalDryIce = 0,
            totalBiomass = 0, totalLiquidMethane = 0, totalHydrocarbonIce = 0;

        zones.forEach(z => {
            const zw = merged.zonalWater?.[z] || {};
            totalLiquidWater += zw.liquid || 0;
            totalIce += (zw.ice || 0) + (zw.buriedIce || 0);
            const zs = merged.zonalSurface?.[z] || {};
            totalDryIce += zs.dryIce || 0;
            totalBiomass += zs.biomass || 0;
            const zh = merged.zonalHydrocarbons?.[z] || {};
            totalLiquidMethane += zh.liquid || 0;
            totalHydrocarbonIce += (zh.ice || 0) + (zh.buriedIce || 0);
        });

        if (!merged.resources) merged.resources = {};
        if (!merged.resources.surface) merged.resources.surface = {};
        merged.resources.surface.liquidWater = merged.resources.surface.liquidWater || {};
        merged.resources.surface.ice = merged.resources.surface.ice || {};
        merged.resources.surface.dryIce = merged.resources.surface.dryIce || {};
        merged.resources.surface.biomass = merged.resources.surface.biomass || {};
        merged.resources.surface.liquidMethane = merged.resources.surface.liquidMethane || {};
        merged.resources.surface.hydrocarbonIce = merged.resources.surface.hydrocarbonIce || {};

        merged.resources.surface.liquidWater.initialValue = totalLiquidWater;
        merged.resources.surface.ice.initialValue = totalIce;
        merged.resources.surface.dryIce.initialValue = totalDryIce;
        merged.resources.surface.biomass.initialValue = totalBiomass;
        merged.resources.surface.liquidMethane.initialValue = totalLiquidMethane;
        merged.resources.surface.hydrocarbonIce.initialValue = totalHydrocarbonIce;

        return { merged, override, star: SOL_STAR };
    }

    getCurrentRandomSeed() {
        return this.currentRandomSeed;
    }

    isSeedTerraformed(seed) {
        return !!this.randomWorldStatuses[String(seed)]?.terraformed;
    }

    /**
     * Enable a planet so it appears in the UI.
     * @param {string} planetKey
     * @returns {boolean} True if the planet exists and was enabled.
     */
    enablePlanet(planetKey) {
        if (this.planetStatuses[planetKey]) {
            this.planetStatuses[planetKey].enabled = true;
            return true;
        }
        console.warn(`SpaceManager: Cannot enable unknown planet ${planetKey}`);
        return false;
    }

    enableRandomTab() {
        this.randomTabEnabled = true;
        if (typeof showSpaceRandomTab === 'function') {
            showSpaceRandomTab();
        }
    }

    enable(planetKey) {
        if (planetKey === 'space-random') {
            this.enableRandomTab();
        } else {
            this.enablePlanet(planetKey);
        }
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
        if (this.currentRandomSeed !== null) {
            const seed = String(this.currentRandomSeed);
            if (!this.randomWorldStatuses[seed]) {
                this.randomWorldStatuses[seed] = { name: this.currentRandomName, terraformed: false, colonists: 0, original: this.getCurrentWorldOriginal(), visited: true };
            } else if (this.randomWorldStatuses[seed].visited === undefined) {
                this.randomWorldStatuses[seed].visited = true;
            }
            if (this.randomWorldStatuses[seed].terraformed !== isComplete) {
                this.randomWorldStatuses[seed].terraformed = isComplete;
                console.log(`SpaceManager: Terraformed status for seed ${seed} updated to ${isComplete}`);
            }
            return;
        }
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
                this.currentRandomSeed = null;
                this.currentRandomName = '';
                console.log(`SpaceManager: Current planet set to: ${this.currentPlanetKey}`);
            }
             // Ensure status object exists for the new current planet
             if (!this.planetStatuses[key]) {
                  this.planetStatuses[key] = { terraformed: false, visited: false, enabled: false, colonists: 0 };
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
        if (!this.isPlanetEnabled(key)) {
            console.warn(`SpaceManager: Planet ${key} is not enabled.`);
            return false;
        }
        if (this.isPlanetTerraformed(key)) {
            console.warn(`SpaceManager: Planet ${key} already terraformed.`);
            return false;
        }
        const pop = globalThis?.resources?.colony?.colonists?.value || 0;
        this.recordCurrentWorldPopulation(pop);
        return this._setCurrentPlanetKey(key);
    }

    /**
     * Marks a planet as visited and returns true if this is the first visit.
     * @param {string} key - The planet key being visited.
     * @returns {boolean} - True if this is the first time visiting.
     */
    visitPlanet(key) {
        const status = this.planetStatuses[key];
        if (!status) return false;
        if (!status.visited) {
            status.visited = true;
            return true;
        }
        return false;
    }

    /**
     * Check if a planet has been visited before.
     * @param {string} key
     * @returns {boolean}
     */
    hasVisitedPlanet(key) {
        return !!this.planetStatuses[key]?.visited;
    }

    recordCurrentWorldPopulation(pop) {
        if (this.currentRandomSeed !== null) {
            const seed = String(this.currentRandomSeed);
            if (!this.randomWorldStatuses[seed]) {
                this.randomWorldStatuses[seed] = { name: this.currentRandomName, terraformed: false, colonists: 0, original: this.getCurrentWorldOriginal(), visited: true };
            }
            this.randomWorldStatuses[seed].colonists = pop;
            if (this.randomWorldStatuses[seed].visited === undefined) {
                this.randomWorldStatuses[seed].visited = true;
            }
        } else if (this.planetStatuses[this.currentPlanetKey]) {
            this.planetStatuses[this.currentPlanetKey].colonists = pop;
        }
    }

    travelToRandomWorld(res, seed) {
        const s = String(seed);
        if (this.isSeedTerraformed(s)) {
            console.warn(`SpaceManager: Seed ${s} already terraformed.`);
            return false;
        }
        const pop = globalThis?.resources?.colony?.colonists?.value || 0;
        this.recordCurrentWorldPopulation(pop);

        const departingTerraformed = this.currentRandomSeed !== null
            ? this.isSeedTerraformed(this.currentRandomSeed)
            : this.isPlanetTerraformed(this.currentPlanetKey);

        if (!this.randomWorldStatuses[s]) {
            this.randomWorldStatuses[s] = { name: res?.merged?.name || `Seed ${s}`, terraformed: false, colonists: 0, original: res, visited: false };
        } else {
            this.randomWorldStatuses[s].original = this.randomWorldStatuses[s].original || res;
        }
        const firstVisit = !this.randomWorldStatuses[s].visited;
        const destinationTerraformed = this.randomWorldStatuses[s].terraformed;
        if (firstVisit && departingTerraformed && !destinationTerraformed && typeof skillManager !== 'undefined' && skillManager) {
            skillManager.skillPoints += 1;
        }

        this.randomWorldStatuses[s].visited = true;
        this.currentRandomSeed = s;
        this.currentRandomName = this.randomWorldStatuses[s].name;

        if (typeof saveGameToSlot === 'function') {
            try { saveGameToSlot('pretravel'); } catch (_) {}
        }
        const storageState = projectManager?.projects?.spaceStorage?.saveTravelState
            ? projectManager.projects.spaceStorage.saveTravelState() : null;
        globalThis.currentPlanetParameters = res?.merged;
        if (typeof initializeGameState === 'function') {
            initializeGameState({ preserveManagers: true, preserveJournal: true });
        }
        if (storageState && projectManager?.projects?.spaceStorage?.loadTravelState) {
            projectManager.projects.spaceStorage.loadTravelState(storageState);
            if (typeof updateProjectUI === 'function') {
                updateProjectUI('spaceStorage');
            }
        }
        if (typeof updateSpaceUI === 'function') {
            updateSpaceUI();
        }
        return true;
    }

    // --- Save/Load ---
    saveState() {
        return {
            currentPlanetKey: this.currentPlanetKey,
            planetStatuses: this.planetStatuses,
            currentRandomSeed: this.currentRandomSeed,
            currentRandomName: this.currentRandomName,
            randomWorldStatuses: this.randomWorldStatuses
        };
    }

    loadState(savedData) {
        // Reset to default before loading
        this.currentPlanetKey = 'mars';
        this.currentRandomSeed = null;
        this.currentRandomName = '';
        this.randomWorldStatuses = {};
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
                const saved = savedData.planetStatuses[planetKey];
                if (saved) {
                    if (typeof saved.terraformed === 'boolean') {
                        this.planetStatuses[planetKey].terraformed = saved.terraformed;
                    }
                    if (typeof saved.visited === 'boolean') {
                        this.planetStatuses[planetKey].visited = saved.visited;
                    }
                    if (typeof saved.enabled === 'boolean') {
                        this.planetStatuses[planetKey].enabled = saved.enabled;
                    }
                    if (typeof saved.colonists === 'number') {
                        this.planetStatuses[planetKey].colonists = saved.colonists;
                    }
                }
            });
            console.log("SpaceManager: Loaded planet statuses from save data.");
        } else {
            console.log("SpaceManager: No planet statuses found in save data, keeping defaults.");
        }

        if (savedData.currentRandomSeed !== undefined) {
            this.currentRandomSeed = savedData.currentRandomSeed;
            this.currentRandomName = savedData.currentRandomName || '';
        }
        if (savedData.randomWorldStatuses) {
            this.randomWorldStatuses = savedData.randomWorldStatuses;
        }

        // Ensure the loaded current planet is marked visited
        if (this.planetStatuses[this.currentPlanetKey]) {
            this.planetStatuses[this.currentPlanetKey].visited = true;
        }

         console.log("SpaceManager state loaded:", this.saveState());
    }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SpaceManager;
}