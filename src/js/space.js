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

const SPACE_DEFAULT_SECTOR_LABEL = globalThis?.DEFAULT_SECTOR_LABEL || 'R5-07';

function normalizeSectorLabel(value) {
    const text = value == null ? '' : String(value).trim();
    return text || SPACE_DEFAULT_SECTOR_LABEL;
}

function resolveSectorFromSources(...sources) {
    for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index];
        if (!source) {
            continue;
        }
        const candidates = [
            source.celestialParameters?.sector,
            source.override?.celestialParameters?.sector,
            source.merged?.celestialParameters?.sector,
            source.original?.celestialParameters?.sector,
            source.sector
        ];
        for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
            const candidate = candidates[candidateIndex];
            if (candidate == null) {
                continue;
            }
            const normalized = normalizeSectorLabel(candidate);
            if (normalized) {
                return normalized;
            }
        }
    }
    return SPACE_DEFAULT_SECTOR_LABEL;
}

function hasSuperEarthArchetype(...sources) {
    for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index];
        if (!source) {
            continue;
        }
        const candidates = [
            source.classification?.archetype,
            source.override?.classification?.archetype,
            source.merged?.classification?.archetype,
            source.original?.classification?.archetype,
            source.archetype
        ];
        for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
            const candidate = candidates[candidateIndex];
            if (!candidate) {
                continue;
            }
            if (String(candidate).trim().toLowerCase() === 'super-earth') {
                return true;
            }
        }
    }
    return false;
}

var getEcumenopolisLandFraction = globalThis.getEcumenopolisLandFraction || function () { return 0; };
if (typeof module !== 'undefined' && module.exports) {
    ({ getEcumenopolisLandFraction } = require('./advanced-research/ecumenopolis.js'));
}

var generateRandomPlanet = globalThis.generateRandomPlanet;
if (typeof module !== 'undefined' && module.exports) {
    ({ generateRandomPlanet } = require('./rwg.js'));
}

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
        this.randomWorldStatuses = {}; // seed -> { name, terraformed, colonists, original, orbitalRing }
        this.extraTerraformedWorlds = 0;
        this.rwgSectorLock = null;
        this.rwgSectorLockManual = false;

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
                orbitalRing: false,
                departedAt: null,
                ecumenopolisPercent: 0,
                rwgLock: false,
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

    setRwgLock(planetKey, value = true) {
        if (this.planetStatuses[planetKey]) {
            this.planetStatuses[planetKey].rwgLock = value;
            const progVar = globalThis['progress' + planetKey.charAt(0).toUpperCase() + planetKey.slice(1)];
            if (progVar) {
                progVar.rwgLock = value;
            }
        }
    }

    isRandomTravelLocked() {
        if (this.currentRandomSeed !== null) return false;
        return !this.planetStatuses[this.currentPlanetKey]?.rwgLock;
    }

    applyEffect(effect) {
        if (effect.type === 'setRwgLock') {
            this.setRwgLock(effect.targetId, effect.value !== false);
        } else if (effect.type === 'extraTerraformedWorlds') {
            this.extraTerraformedWorlds = typeof effect.value === 'number' ? effect.value : 0;
        } else {
            super.applyEffect(effect);
        }
    }

    // --- Getters (Keep existing getters) ---
    getCurrentPlanetKey() {
        return this.currentPlanetKey;
    }
    getCurrentPlanetData() { /* ... same as before ... */ }

    /**
     * Gets the terraforming status for a specific planet.
     * @param {string} planetKey - The key of the planet.
     * @returns {boolean} - True if terraformed, false otherwise. Returns false if planet not found.
     */
    isPlanetTerraformed(planetKey) {
        return this.getPlanetStatus(planetKey)?.terraformed || false;
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
     * Returns a combined object of story planet statuses and random world statuses.
     * @returns {Object}
     */
    getAllPlanetStatuses() {
        return { ...this.planetStatuses, ...this.randomWorldStatuses };
    }

    getRwgSectorLock() {
        return this.rwgSectorLock;
    }

    setRwgSectorLock(sectorLabel) {
        if (sectorLabel == null) {
            this.clearRwgSectorLock();
            return;
        }
        const text = String(sectorLabel).trim();
        if (!text) {
            this.clearRwgSectorLock();
            return;
        }
        this.rwgSectorLock = text;
        this.rwgSectorLockManual = true;
    }

    clearRwgSectorLock() {
        this.rwgSectorLock = null;
        this.rwgSectorLockManual = false;
    }

    getWorldCountPerSector(sectorLabel) {
        const target = normalizeSectorLabel(sectorLabel);
        let total = 0;
        const overridesLookup = globalThis?.planetOverrides || null;

        Object.keys(this.planetStatuses).forEach((key) => {
            const status = this.planetStatuses[key];
            if (!status || !status.terraformed) {
                return;
            }
            const planetData = this.allPlanetsData[key] || null;
            const override = overridesLookup ? overridesLookup[key] : null;
            const sector = resolveSectorFromSources(override, planetData);
            if (sector !== target) {
                return;
            }
            total += 1;
            if (status.orbitalRing) {
                total += 1;
            }
            if (hasSuperEarthArchetype(override, planetData)) {
                total += 1;
            }
        });

        Object.values(this.randomWorldStatuses).forEach((status) => {
            if (!status || !status.terraformed) {
                return;
            }
            const original = status.original || null;
            const sector = resolveSectorFromSources(original);
            if (sector !== target) {
                return;
            }
            total += 1;
            if (status.orbitalRing) {
                total += 1;
            }
            if (hasSuperEarthArchetype(original)) {
                total += 1;
            }
        });

        return total;
    }

    currentWorldHasOrbitalRing() {
        if (this.currentRandomSeed !== null) {
            return !!this.randomWorldStatuses[String(this.currentRandomSeed)]?.orbitalRing;
        }
        return !!this.planetStatuses[this.currentPlanetKey]?.orbitalRing;
    }

    setCurrentWorldHasOrbitalRing(value) {
        if (this.currentRandomSeed !== null) {
            const seed = String(this.currentRandomSeed);
            this.setRandomWorldHasOrbitalRing(seed, value);
        } else {
            this.setStoryWorldHasOrbitalRing(this.currentPlanetKey, value);
        }
    }

    setStoryWorldHasOrbitalRing(planetKey, value) {
        const status = this.planetStatuses[planetKey];
        if (!status) {
            return;
        }
        status.orbitalRing = !!value;
    }

    _ensureRandomWorldStatus(seed) {
        const key = String(seed);
        if (!this.randomWorldStatuses[key]) {
            this.randomWorldStatuses[key] = {
                name: `Seed ${key}`,
                terraformed: false,
                colonists: 0,
                original: null,
                visited: false,
                orbitalRing: false,
                departedAt: null,
                ecumenopolisPercent: 0
            };
        }
        return this.randomWorldStatuses[key];
    }

    setRandomWorldHasOrbitalRing(seed, value) {
        const status = this._ensureRandomWorldStatus(seed);
        status.orbitalRing = !!value;
    }

    isCurrentWorldTerraformed() {
        if (this.currentRandomSeed !== null) {
            return this.isSeedTerraformed(String(this.currentRandomSeed));
        }
        return this.isPlanetTerraformed(this.currentPlanetKey);
    }

    countOrbitalRings() {
        let total = 0;
        Object.values(this.planetStatuses).forEach(status => {
            if (status?.orbitalRing) {
                total += 1;
            }
        });
        Object.values(this.randomWorldStatuses).forEach(status => {
            if (status?.orbitalRing) {
                total += 1;
            }
        });
        return total;
    }

    assignOrbitalRings(totalRings, options = {}) {
        const { preferCurrentWorld = false } = options;
        const normalizedTotal = Math.max(0, Number.isFinite(totalRings) ? Math.floor(totalRings) : 0);
        const ordered = [];
        const seen = new Set();

        const addCandidate = (type, key, status, force = false) => {
            if (!status) {
                return;
            }
            const id = `${type}:${key}`;
            if (seen.has(id)) {
                return;
            }
            if (!status.terraformed) {
                if (force && status.orbitalRing) {
                    status.orbitalRing = false;
                }
                return;
            }
            ordered.push({ type, key, status });
            seen.add(id);
        };

        const currentDescriptor = this.currentRandomSeed !== null
            ? { type: 'random', key: String(this.currentRandomSeed), status: this.randomWorldStatuses[String(this.currentRandomSeed)] }
            : { type: 'story', key: this.currentPlanetKey, status: this.planetStatuses[this.currentPlanetKey] };

        if (preferCurrentWorld && currentDescriptor.status) {
            addCandidate(currentDescriptor.type, currentDescriptor.key, currentDescriptor.status, true);
        }

        Object.keys(this.planetStatuses).forEach(key => {
            const status = this.planetStatuses[key];
            if (status?.orbitalRing) {
                addCandidate('story', key, status, true);
            }
        });

        Object.keys(this.randomWorldStatuses).forEach(seed => {
            const status = this.randomWorldStatuses[seed];
            if (status?.orbitalRing) {
                addCandidate('random', seed, status, true);
            }
        });

        Object.keys(this.allPlanetsData).forEach(key => {
            addCandidate('story', key, this.planetStatuses[key]);
        });

        Object.keys(this.randomWorldStatuses)
            .sort((a, b) => String(a).localeCompare(String(b)))
            .forEach(seed => {
                addCandidate('random', seed, this.randomWorldStatuses[seed]);
            });

        let assigned = 0;
        ordered.forEach(entry => {
            const shouldAssign = assigned < normalizedTotal;
            entry.status.orbitalRing = shouldAssign;
            if (shouldAssign) {
                assigned += 1;
            }
        });

        return assigned;
    }

    /**
     * Returns the count of fully terraformed worlds without orbital ring bonuses.
     * @returns {number}
     */
    getUnmodifiedTerraformedWorldCount() {
        return Object.values(this.getAllPlanetStatuses())
            .filter(status => status.terraformed).length;
    }

    /**
     * Counts how many planets have been fully terraformed and adds orbital rings.
     * @returns {number}
     */
    getTerraformedPlanetCount() {
        const base = this.getUnmodifiedTerraformedWorldCount();
        const rings = (typeof projectManager !== 'undefined' && projectManager.projects && projectManager.projects.orbitalRing)
            ? projectManager.projects.orbitalRing.ringCount
            : 0;
        const extra = typeof this.extraTerraformedWorlds === 'number' ? this.extraTerraformedWorlds : 0;
        const sectorWorlds = (typeof galaxyManager !== 'undefined' && galaxyManager?.getControlledSectorWorldCount)
            ? galaxyManager.getControlledSectorWorldCount()
            : 0;
        const sectorBonus = Number.isFinite(sectorWorlds) ? Math.max(0, sectorWorlds) : 0;
        return base + rings + extra + sectorBonus;
    }

    /**
     * Counts terraformed planets and includes the current planet if it isn't
     * terraformed yet. Used for terraforming-related bonuses that previously
     * added 1 unconditionally.
     * @returns {number}
     */
    getTerraformedPlanetCountIncludingCurrent() {
        const count = this.getTerraformedPlanetCount();
        const hasRing = this.currentWorldHasOrbitalRing();
        if (this.currentRandomSeed !== null) {
            return (this.isSeedTerraformed(String(this.currentRandomSeed)) || hasRing) ? count : count + 1;
        }
        return (this.isPlanetTerraformed(this.currentPlanetKey) || hasRing) ? count : count + 1;
    }

    /**
     * Counts how many planets have been terraformed prior to the current world.
     * The current planet is excluded even if it has already been terraformed.
     * @returns {number}
     */
    getTerraformedPlanetCountExcludingCurrent() {
        let count = this.getTerraformedPlanetCount();
        if (this.currentWorldHasOrbitalRing()) count--;
        const isCurrentSuperEarth = this.currentRandomSeed !== null &&
            this.randomWorldStatuses[String(this.currentRandomSeed)]?.original?.override?.classification?.archetype === 'super-earth';
        if (this.currentRandomSeed !== null) {
            if (this.isSeedTerraformed(String(this.currentRandomSeed))) {
                count--;
                if (isCurrentSuperEarth) count--;
            }
            return Math.max(count, 0);
        }
        if (this.isPlanetTerraformed(this.currentPlanetKey)) {
            count--;
            if (isCurrentSuperEarth) count--;
        }
        return Math.max(count, 0);
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
            totalBiomass = 0, totalLiquidCO2 = 0, totalLiquidMethane = 0, totalHydrocarbonIce = 0;

        zones.forEach(z => {
            const zw = merged.zonalWater?.[z] || {};
            totalLiquidWater += zw.liquid || 0;
            totalIce += (zw.ice || 0) + (zw.buriedIce || 0);
            const zc = merged.zonalCO2?.[z] || {};
            const zs = merged.zonalSurface?.[z] || {};
            totalDryIce += zc.ice || 0;
            totalLiquidCO2 += zc.liquid || 0;
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
        merged.resources.surface.liquidCO2 = merged.resources.surface.liquidCO2 || {};
        merged.resources.surface.biomass = merged.resources.surface.biomass || {};
        merged.resources.surface.liquidMethane = merged.resources.surface.liquidMethane || {};
        merged.resources.surface.hydrocarbonIce = merged.resources.surface.hydrocarbonIce || {};

        merged.resources.surface.liquidWater.initialValue = totalLiquidWater;
        merged.resources.surface.ice.initialValue = totalIce;
        merged.resources.surface.dryIce.initialValue = totalDryIce;
        merged.resources.surface.liquidCO2.initialValue = totalLiquidCO2;
        merged.resources.surface.biomass.initialValue = totalBiomass;
        merged.resources.surface.liquidMethane.initialValue = totalLiquidMethane;
        merged.resources.surface.hydrocarbonIce.initialValue = totalHydrocarbonIce;

        let star = override?.star || base?.star || SOL_STAR;
        star = JSON.parse(JSON.stringify(star));
        if (merged.celestialParameters?.starLuminosity != null && star.luminositySolar == null) {
            star.luminositySolar = merged.celestialParameters.starLuminosity;
        }
        return { merged, override, star };
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

    activateTab(tabId) {
        const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
        const tabContentElement = document.getElementById(tabId);

        if (!tabElement || !tabContentElement) {
            return;
        }

        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        tabElement.classList.add('active');
        tabContentElement.classList.add('active');
    }

    /**
     * Gets the full status object for a specific planet.
     * @param {string} planetKey - The key of the planet.
     * @returns {object | null} - The status object or null if planet not found.
     */
    getPlanetStatus(planetKey) {
        return this.planetStatuses[planetKey] || this.randomWorldStatuses[planetKey] || null;
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
                this.randomWorldStatuses[seed] = {
                    name: this.currentRandomName,
                    terraformed: false,
                    colonists: 0,
                    original: this.getCurrentWorldOriginal(),
                    visited: true,
                    orbitalRing: false
                };
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
        this.recordDepartureSnapshot();
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

    prepareForTravel() {
        if (typeof saveGameToSlot === 'function') {
            try { saveGameToSlot('pretravel'); } catch (_) {}
        }
        const storageState = projectManager?.projects?.spaceStorage?.saveTravelState
            ? projectManager.projects.spaceStorage.saveTravelState()
            : null;
        if (typeof nanotechManager !== 'undefined'
            && typeof nanotechManager.prepareForTravel === 'function') {
            nanotechManager.prepareForTravel();
        }
        return storageState;
    }

    /**
     * Capture a single, consistent departure snapshot after pre-travel save:
     * - marks visited
     * - records population and ecumenopolis percent
     * - stamps departure time
     * Works for both story planets and random worlds.
     */
    recordDepartureSnapshot() {
        const now = Date.now();
        const pop = globalThis?.resources?.colony?.colonists?.value || 0;
        const ecoPercent = getEcumenopolisLandFraction(globalThis.terraforming) * 100;
        if (this.currentRandomSeed !== null) {
            const seed = String(this.currentRandomSeed);
            if (!this.randomWorldStatuses[seed]) {
                this.randomWorldStatuses[seed] = {
                    name: this.currentRandomName || `Seed ${seed}`,
                    terraformed: false,
                    colonists: 0,
                    original: this.getCurrentWorldOriginal ? this.getCurrentWorldOriginal() : null,
                    visited: true,
                    orbitalRing: false,
                    departedAt: null,
                    ecumenopolisPercent: 0
                };
            }
            const st = this.randomWorldStatuses[seed];
            st.visited = true;
            st.colonists = pop;
            st.departedAt = now;
            st.ecumenopolisPercent = ecoPercent;
            if (!st.name) st.name = this.currentRandomName || `Seed ${seed}`;
        } else if (this.planetStatuses[this.currentPlanetKey]) {
            const ps = this.planetStatuses[this.currentPlanetKey];
            ps.visited = true;
            ps.colonists = pop;
            ps.departedAt = now;
            ps.ecumenopolisPercent = ecoPercent;
        }
    }

    travelToRandomWorld(res, seed) {
        if (this.isRandomTravelLocked()) {
            console.warn('SpaceManager: Random world travel is locked for the current world.');
            return false;
        }
        // Prefer canonical seedString from RWG result so it encodes target/type/orbit
        const s = String(res && typeof res.seedString === 'string' ? res.seedString : seed);
        if (this.isSeedTerraformed(s)) {
            console.warn(`SpaceManager: Seed ${s} already terraformed.`);
            return false;
        }

        const departingTerraformed = this.currentRandomSeed !== null
            ? this.isSeedTerraformed(String(this.currentRandomSeed))
            : this.isPlanetTerraformed(this.currentPlanetKey);

        const existing = this.randomWorldStatuses[s];
        const firstVisit = !existing?.visited;
        const destinationTerraformed = existing?.terraformed || false;

        const storageState = this.prepareForTravel();
        this.recordDepartureSnapshot();

        this.currentRandomSeed = s;
        this.currentPlanetKey = s;
        this.currentRandomName = res?.merged?.name || `Seed ${s}`;
        if (!existing) {
            this.randomWorldStatuses[s] = {
                name: this.currentRandomName,
                terraformed: false,
                colonists: 0,
                original: res,
                visited: true,
                orbitalRing: false,
                departedAt: null,
                ecumenopolisPercent: 0
            };
        } else {
            existing.original = existing.original || res;
            existing.visited = true;
        }

        if (firstVisit && departingTerraformed && !destinationTerraformed && typeof skillManager !== 'undefined' && skillManager) {
            skillManager.skillPoints += 1;
            if (typeof notifySkillPointGained === 'function') {
                notifySkillPointGained(1);
            }
        }
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
        const ringProj = projectManager?.projects?.orbitalRing;
        if (ringProj) {
            ringProj.currentWorldHasRing = this.currentWorldHasOrbitalRing();
            if (typeof updateProjectUI === 'function') {
                updateProjectUI('orbitalRing');
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
            randomWorldStatuses: this.randomWorldStatuses,
            randomTabEnabled: this.randomTabEnabled,
            rwgSectorLock: this.rwgSectorLock,
            rwgSectorLockManual: this.rwgSectorLockManual
        };
    }

    loadState(savedData) {
        // Reset to default before loading
        this.currentPlanetKey = 'mars';
        this.currentRandomSeed = null;
        this.currentRandomName = '';
        this.randomWorldStatuses = {};
        this.randomTabEnabled = false;
        this.rwgSectorLock = null;
        this.rwgSectorLockManual = false;
        this._initializePlanetStatuses(); // Reset statuses to default structure

        if (!savedData) {
             console.log("SpaceManager: No save data provided, using defaults.");
             return; // Keep defaults initialized above
        }

        // Load current location
        if (savedData.currentRandomSeed !== undefined && savedData.currentRandomSeed !== null) {
            this.currentRandomSeed = savedData.currentRandomSeed;
            this.currentRandomName = savedData.currentRandomName || '';
            this.currentPlanetKey = String(savedData.currentRandomSeed);
        } else {
            let keyToLoad = 'mars';
            if (savedData.currentPlanetKey && this.allPlanetsData[savedData.currentPlanetKey]) {
                keyToLoad = savedData.currentPlanetKey;
            } else if (savedData.currentPlanetKey) {
                console.warn(`SpaceManager: Saved planet key "${savedData.currentPlanetKey}" is invalid. Defaulting to 'mars'.`);
            }
            this._setCurrentPlanetKey(keyToLoad); // Use internal setter
        }

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
                    if (typeof saved.orbitalRing === 'boolean') {
                        this.planetStatuses[planetKey].orbitalRing = saved.orbitalRing;
                    }
                    if (typeof saved.departedAt === 'number') {
                        this.planetStatuses[planetKey].departedAt = saved.departedAt;
                    }
                    if (typeof saved.ecumenopolisPercent === 'number') {
                        this.planetStatuses[planetKey].ecumenopolisPercent = saved.ecumenopolisPercent;
                    }
                    if (typeof saved.rwgLock === 'boolean') {
                        this.planetStatuses[planetKey].rwgLock = saved.rwgLock;
                    }
                }
            });
            console.log("SpaceManager: Loaded planet statuses from save data.");
        } else {
            console.log("SpaceManager: No planet statuses found in save data, keeping defaults.");
        }

        if (savedData.randomWorldStatuses) {
            this.randomWorldStatuses = savedData.randomWorldStatuses;
            if (typeof generateRandomPlanet === 'function') {
                const seeds = Object.keys(this.randomWorldStatuses);
                seeds.forEach(seed => {
                    if (String(seed).toLowerCase().includes('auto')) {
                        try {
                            const { seedString } = generateRandomPlanet(seed);
                            if (seedString && seedString !== seed) {
                                this.randomWorldStatuses[seedString] = this.randomWorldStatuses[seed];
                                delete this.randomWorldStatuses[seed];
                            }
                        } catch (_) { }
                    }
                });
            }
        }

        if (savedData && Object.prototype.hasOwnProperty.call(savedData, 'rwgSectorLock')) {
            const hasManualFlag = Object.prototype.hasOwnProperty.call(savedData, 'rwgSectorLockManual');
            const manual = hasManualFlag ? !!savedData.rwgSectorLockManual : null;
            if (manual === false) {
                this.clearRwgSectorLock();
            } else if (manual === true) {
                this.setRwgSectorLock(savedData.rwgSectorLock);
            } else {
                const text = String(savedData.rwgSectorLock ?? '').trim();
                if (text && text !== SPACE_DEFAULT_SECTOR_LABEL) {
                    this.setRwgSectorLock(text);
                } else {
                    this.clearRwgSectorLock();
                }
            }
        } else {
            this.clearRwgSectorLock();
        }

        if (typeof savedData.randomTabEnabled === 'boolean') {
            this.randomTabEnabled = savedData.randomTabEnabled;
        }

        // Ensure the loaded current world is marked visited
        if (this.currentRandomSeed !== null) {
            const seed = String(this.currentRandomSeed);
            if (this.randomWorldStatuses[seed]) {
                this.randomWorldStatuses[seed].visited = true;
            }
        } else if (this.planetStatuses[this.currentPlanetKey]) {
            this.planetStatuses[this.currentPlanetKey].visited = true;
        }

         console.log("SpaceManager state loaded:", this.saveState());
    }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SpaceManager;
}
