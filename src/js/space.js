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

const ROGUE_STAR = {
    name: 'Rogue Space',
    spectralType: '—',
    luminositySolar: 0,
    massSolar: 0,
    temperatureK: 0,
    habitableZone: { inner: 0, outer: 0 }
};

const SPACE_HAZARD_KEYS = buildSpaceHazardKeys();
const SPACE_HAZARD_KEY_SET = new Set(SPACE_HAZARD_KEYS);

const SPACE_DEFAULT_SECTOR_LABEL = globalThis?.DEFAULT_SECTOR_LABEL || 'R5-07';
const ARTIFICIAL_TERRAFORM_DIVISOR = 50_000_000_000;

function buildSpaceHazardKeys() {
    const keys = new Set();
    const addKeys = (hazards) => {
        Object.keys(hazards || {}).forEach((key) => {
            const resolved = String(key);
            if (resolved && resolved !== 'none') keys.add(resolved);
        });
    };
    addKeys(defaultPlanetParameters?.hazards);
    Object.values(planetParameters || {}).forEach((entry) => addKeys(entry?.hazards));
    try {
        const rwgKeys = RWG_HAZARD_ORDER || [];
        rwgKeys.forEach((key) => {
            const resolved = String(key);
            if (resolved && resolved !== 'none') keys.add(resolved);
        });
    } catch (err) { }
    return Array.from(keys);
}

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
            source.cachedArchetype,
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

function getLandFromParams(source) {
    return source?.resources?.surface?.land?.initialValue
        || source?.resources?.surface?.land?.baseCap
        || 0;
}

var getEcumenopolisLandFraction = globalThis.getEcumenopolisLandFraction || function () { return 0; };
if (typeof module !== 'undefined' && module.exports) {
    ({ getEcumenopolisLandFraction } = require('./advanced-research/ecumenopolis.js'));
}

var generateRandomPlanet = globalThis.generateRandomPlanet;
if (typeof module !== 'undefined' && module.exports) {
    ({ generateRandomPlanet } = require('./rwg/rwg.js'));
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
        this.currentArtificialKey = null;
        this.artificialWorldStatuses = {};
        this.extraTerraformedWorlds = 0;
        this.rwgSectorLock = null;
        this.rwgSectorLockManual = false;
        this.oneillCylinders = 0;
        this.dominionTerraformRewards = {};
        this.dominionTerraformRewardCount = 0;
        this.foundryWorldBonusCache = { count: 0, bonus: 0 };

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
                foundryWorld: false,
                foundryLandFactor: 0,
                specialization: '',
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
        if (this.currentArtificialKey !== null) return false;
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

    grantDominionTerraformReward(dominionId) {
        const resolvedDominion = dominionId || 'human';
        if (resolvedDominion === 'human' || resolvedDominion === 'gabbagian') {
            return 0;
        }
        if (this.dominionTerraformRewards[resolvedDominion]) {
            return 0;
        }
        const rewardIndex = this.dominionTerraformRewardCount + 1;
        const reward = 500 * rewardIndex;
        this.dominionTerraformRewards[resolvedDominion] = true;
        this.dominionTerraformRewardCount = rewardIndex;
        resources.special.alienArtifact.increase(reward);
        return reward;
    }

    // --- Getters (Keep existing getters) ---
    getCurrentPlanetKey() {
        return this.currentPlanetKey;
    }
    getCurrentPlanetData() { /* ... same as before ... */ }

    isArtificialWorld() {
        return this.currentArtificialKey !== null;
    }

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
        return { ...this.planetStatuses, ...this.randomWorldStatuses, ...this.artificialWorldStatuses };
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
        const resolveStatusSector = (status, ...sources) => {
            if (status?.sector) {
                return normalizeSectorLabel(status.sector);
            }
            return resolveSectorFromSources(...sources);
        };

        Object.keys(this.planetStatuses).forEach((key) => {
            const status = this.planetStatuses[key];
            if (!status || !status.terraformed) {
                return;
            }
            const planetData = this.allPlanetsData[key] || null;
            const override = overridesLookup ? overridesLookup[key] : null;
            const sector = resolveStatusSector(status, override, planetData);
            if (sector !== target) {
                return;
            }
            total += 1;
            if (status.orbitalRing) {
                total += 1;
            }
            if (hasSuperEarthArchetype(override, planetData)) {
                total += 2;
            }
        });

        Object.values(this.randomWorldStatuses).forEach((status) => {
            if (!status || !status.terraformed) {
                return;
            }
            const original = status.original || null;
            const sector = resolveStatusSector(status, original);
            if (sector !== target) {
                return;
            }
            total += 1;
            if (status.orbitalRing) {
                total += 1;
            }
            if (hasSuperEarthArchetype(status, original)) {
                total += 2;
            }
        });

        Object.values(this.artificialWorldStatuses).forEach((status) => {
            if (!status || !status.terraformed) {
                return;
            }
            const sector = resolveStatusSector(status, status.original);
            if (sector !== target) {
                return;
            }
            const value = this._deriveArtificialTerraformValue(status);
            if (value > 0) {
                total += value;
            }
            if (hasSuperEarthArchetype(status, status.original)) {
                total += 2;
            }
        });

        return total;
    }

    currentWorldHasOrbitalRing() {
        if (this.currentRandomSeed !== null) {
            return !!this.randomWorldStatuses[String(this.currentRandomSeed)]?.orbitalRing;
        }
        if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            if (this.artificialWorldStatuses[key]?.orbitalRing) {
                this.artificialWorldStatuses[key].orbitalRing = false;
            }
            return false;
        }
        return !!this.planetStatuses[this.currentPlanetKey]?.orbitalRing;
    }

    setCurrentWorldHasOrbitalRing(value) {
        if (this.currentRandomSeed !== null) {
            const seed = String(this.currentRandomSeed);
            this.setRandomWorldHasOrbitalRing(seed, value);
        } else if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            if (this.artificialWorldStatuses[key]) {
                this.artificialWorldStatuses[key].orbitalRing = false;
            }
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
                ecumenopolisPercent: 0,
                sector: SPACE_DEFAULT_SECTOR_LABEL
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
     * @param {Object} options
     * @param {boolean} options.countStory
     * @param {boolean} options.countRandom
     * @param {boolean} options.countArtificial
     * @returns {number}
     */
    getUnmodifiedTerraformedWorldCount(options = {}) {
        const {
            countStory = true,
            countRandom = true,
            countArtificial = true
        } = options;
        let total = 0;
        if (countStory) {
            Object.values(this.planetStatuses).forEach((status) => {
                if (status?.terraformed) {
                    total += 1;
                }
            });
        }
        if (countRandom) {
            Object.values(this.randomWorldStatuses).forEach((status) => {
                if (status?.terraformed) {
                    total += 1;
                }
            });
        }
        if (countArtificial) {
            Object.values(this.artificialWorldStatuses).forEach((status) => {
                if (status?.terraformed) {
                    total += 1;
                }
            });
        }
        return total;
    }

    _deriveArtificialTerraformValue(status) {
        if (!status) return 1;
        if (Number.isFinite(status.terraformedValue) && status.terraformedValue > 0) {
            return Math.max(1, Math.floor(status.terraformedValue));
        }
        const landSources = [
            status.landHa,
            getLandFromParams(status.original?.merged),
            getLandFromParams(status.original?.override),
            getLandFromParams(status.original),
            status.original?.merged?.resources?.surface?.land?.value
        ];
        const land = landSources.find((val) => Number.isFinite(val) && val > 0) || 0;
        const derived = Math.max(1, Math.floor(land / ARTIFICIAL_TERRAFORM_DIVISOR));
        return derived;
    }

    _deriveArtificialFleetCapacityValue(status) {
        const maxFleetValue = Number.isFinite(ARTIFICIAL_FLEET_CAPACITY_WORLDS) && ARTIFICIAL_FLEET_CAPACITY_WORLDS > 0
            ? ARTIFICIAL_FLEET_CAPACITY_WORLDS
            : 5;
        const terraformedValue = this._deriveArtificialTerraformValue(status);
        if (Number.isFinite(terraformedValue) && terraformedValue > 0) {
            return Math.min(maxFleetValue, terraformedValue);
        }
        const stored = Number(status?.fleetCapacityValue);
        if (Number.isFinite(stored) && stored > 0) {
            return Math.min(maxFleetValue, stored);
        }
        return maxFleetValue;
    }

    _getCurrentWorldLandHa() {
        return getLandFromParams(currentPlanetParameters);
    }

    _getFoundryLandValue(status, planetKey) {
        return status?.cachedLandHa
            || status?.landHa
            || status?.original?.landHa
            || getLandFromParams(status?.original?.merged)
            || getLandFromParams(status?.original?.override)
            || getLandFromParams(status?.original)
            || getLandFromParams(status?.merged)
            || getLandFromParams(status?.override)
            || getLandFromParams(this.allPlanetsData[planetKey])
            || 0;
    }

    _syncFoundryLandFactor(status, planetKey) {
        if (!status || !status.foundryWorld || status.foundryLandFactor) {
            return;
        }
        status.foundryLandFactor = this._getFoundryLandFactor(this._getFoundryLandValue(status, planetKey));
    }

    _getCurrentFoundryStatus() {
        if (this.currentRandomSeed !== null) {
            return this.randomWorldStatuses[String(this.currentRandomSeed)] || { foundryWorld: false, foundryLandFactor: 0 };
        }
        if (this.currentArtificialKey !== null) {
            return this.artificialWorldStatuses[String(this.currentArtificialKey)] || { foundryWorld: false, foundryLandFactor: 0 };
        }
        return this.planetStatuses[this.currentPlanetKey] || { foundryWorld: false, foundryLandFactor: 0 };
    }

    _refreshFoundryWorldBonusCache() {
        let count = 0;
        let bonus = 0;
        Object.values(this.planetStatuses).forEach((status) => {
            if (!status?.foundryWorld) return;
            count += 1;
            bonus += (status.foundryLandFactor || 0) * 1e11;
        });
        Object.values(this.randomWorldStatuses).forEach((status) => {
            if (!status?.foundryWorld) return;
            count += 1;
            bonus += (status.foundryLandFactor || 0) * 1e11;
        });
        Object.values(this.artificialWorldStatuses).forEach((status) => {
            if (!status?.foundryWorld) return;
            count += 1;
            bonus += (status.foundryLandFactor || 0) * 1e11;
        });
        this.foundryWorldBonusCache = { count, bonus };
    }

    getOneillCylinderCount() {
        const value = Number(this.oneillCylinders);
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }
        return value;
    }

    setOneillCylinderCount(value, capacity) {
        const numeric = Number(value);
        const sanitized = Number.isFinite(numeric) ? numeric : 0;
        const cap = Number(capacity);
        const hasCap = Number.isFinite(cap) && cap >= 0;
        let next = sanitized;
        if (hasCap) {
            if (cap <= 0) {
                next = 0;
            } else if (next > cap) {
                next = cap;
            }
        }
        if (next < 0) {
            next = 0;
        }
        this.oneillCylinders = next;
        return this.oneillCylinders;
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
        const artificialBonus = Object.values(this.artificialWorldStatuses || {}).reduce((acc, status) => {
            if (!status?.terraformed) return acc;
            const value = this._deriveArtificialTerraformValue(status);
            return acc + Math.max(0, value - 1);
        }, 0);
        const cylinders = this.getOneillCylinderCount();
        return base + rings + extra + sectorBonus + artificialBonus + cylinders;
    }

    getArtificialFleetCapacityWorlds() {
        let total = 0;
        Object.values(this.artificialWorldStatuses).forEach((status) => {
            if (!status || !status.terraformed) {
                return;
            }
            const value = this._deriveArtificialFleetCapacityValue(status);
            if (value > 0) {
                total += value;
            }
        });
        return total;
    }

    getFleetCapacityWorldCount() {
        const base = this.getUnmodifiedTerraformedWorldCount({ countArtificial: false });
        const artificial = this.getArtificialFleetCapacityWorlds();
        const rings = projectManager?.projects?.orbitalRing?.ringCount || 0;
        const extra = Number.isFinite(this.extraTerraformedWorlds) && this.extraTerraformedWorlds > 0 ? this.extraTerraformedWorlds : 0;
        const sectorBonus = galaxyManager?.getControlledSectorWorldCount ? galaxyManager.getControlledSectorWorldCount() : 0;
        const total = base + artificial + rings + extra + sectorBonus;
        return total > 0 ? total : 0;
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
        if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            const terraformed = !!this.artificialWorldStatuses[key]?.terraformed;
            return (terraformed || hasRing) ? count : count + 1;
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
        if (this.currentArtificialKey !== null) {
            if (this.artificialWorldStatuses[String(this.currentArtificialKey)]?.terraformed) {
                count--;
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
        if (this.currentArtificialKey !== null) {
            const status = this.artificialWorldStatuses[this.currentArtificialKey];
            return status?.name || `Artificial ${this.currentArtificialKey}`;
        }
        return this.allPlanetsData[this.currentPlanetKey]?.name || '';
    }

    getCurrentWorldOriginal() {
        if (this.currentRandomSeed !== null) {
            return this.randomWorldStatuses[this.currentRandomSeed]?.original || null;
        }
        if (this.currentArtificialKey !== null) {
            return this.artificialWorldStatuses[this.currentArtificialKey]?.original || null;
        }
        const base = this.allPlanetsData[this.currentPlanetKey];
        if (!base) return null;
        const override = typeof planetOverrides !== 'undefined' ? planetOverrides[this.currentPlanetKey] : null;
        const merged = JSON.parse(JSON.stringify(base));
        const zones = ['tropical', 'temperate', 'polar'];
        let totalLiquidWater = 0, totalIce = 0, totalDryIce = 0,
            totalBiomass = 0, totalLiquidCO2 = 0, totalLiquidMethane = 0, totalHydrocarbonIce = 0;

        zones.forEach(z => {
            const zoneSurface = merged.zonalSurface?.[z] || {};
            const zw = merged.zonalWater?.[z] || {};
            const zc = merged.zonalCO2?.[z] || {};
            const zh = merged.zonalHydrocarbons?.[z] || {};
            totalLiquidWater += zoneSurface.liquidWater ?? zw.liquid ?? 0;
            totalIce += (zoneSurface.ice ?? zw.ice ?? 0) + (zoneSurface.buriedIce ?? zw.buriedIce ?? 0);
            totalDryIce += (zoneSurface.dryIce ?? zc.ice ?? 0) + (zoneSurface.buriedDryIce ?? 0);
            totalLiquidCO2 += zoneSurface.liquidCO2 ?? zc.liquid ?? 0;
            totalBiomass += zoneSurface.biomass ?? 0;
            totalLiquidMethane += zoneSurface.liquidMethane ?? zh.liquid ?? 0;
            totalHydrocarbonIce += (zoneSurface.hydrocarbonIce ?? zh.ice ?? 0) + (zoneSurface.buriedHydrocarbonIce ?? zh.buriedIce ?? 0);
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

        const isRogue = merged.celestialParameters?.rogue;
        const starSource = override?.star || base?.star || (isRogue ? ROGUE_STAR : SOL_STAR);
        const star = JSON.parse(JSON.stringify(starSource));
        const starLuminosity = merged.celestialParameters?.starLuminosity;
        if (starLuminosity != null) {
            star.luminositySolar = starLuminosity;
        }
        if (isRogue && !star.name) {
            star.name = 'Rogue Space';
        }
        return { merged, override, star };
    }

    getCurrentRandomSeed() {
        return this.currentRandomSeed;
    }

    getCurrentArtificialKey() {
        return this.currentArtificialKey;
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
        return this.planetStatuses[planetKey] || this.randomWorldStatuses[planetKey] || this.artificialWorldStatuses[planetKey] || null;
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
                    orbitalRing: false,
                    sector: resolveSectorFromSources(this.getCurrentWorldOriginal())
                };
            }
            if (this.randomWorldStatuses[seed].terraformed !== isComplete) {
                this.randomWorldStatuses[seed].terraformed = isComplete;
                console.log(`SpaceManager: Terraformed status for seed ${seed} updated to ${isComplete}`);
            }
            return;
        }
        if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            if (!this.artificialWorldStatuses[key]) {
                const terraformedValue = this._deriveArtificialTerraformValue({
                    landHa: this._getCurrentWorldLandHa(),
                    original: this.getCurrentWorldOriginal()
                });
                this.artificialWorldStatuses[key] = {
                    name: this.currentRandomName || `Artificial ${key}`,
                    terraformed: false,
                    colonists: 0,
                    original: this.getCurrentWorldOriginal(),
                    visited: true,
                    orbitalRing: false,
                    departedAt: null,
                    ecumenopolisPercent: 0,
                    terraformedValue,
                    fleetCapacityValue: this._deriveArtificialFleetCapacityValue({ terraformedValue }),
                    sector: resolveSectorFromSources(this.getCurrentWorldOriginal())
                };
            } else if (!this.artificialWorldStatuses[key].terraformedValue) {
                this.artificialWorldStatuses[key].terraformedValue = this._deriveArtificialTerraformValue({
                    landHa: this._getCurrentWorldLandHa(),
                    original: this.getCurrentWorldOriginal(),
                    terraformedValue: this.artificialWorldStatuses[key].terraformedValue
                });
            }
            if (!Number.isFinite(this.artificialWorldStatuses[key].fleetCapacityValue) || this.artificialWorldStatuses[key].fleetCapacityValue <= 0) {
                this.artificialWorldStatuses[key].fleetCapacityValue = this._deriveArtificialFleetCapacityValue(this.artificialWorldStatuses[key]);
            }
            if (this.artificialWorldStatuses[key].terraformed !== isComplete) {
                this.artificialWorldStatuses[key].terraformed = isComplete;
                console.log(`SpaceManager: Terraformed status for artificial world ${key} updated to ${isComplete}`);
            }
            if (isComplete) {
                this.artificialWorldStatuses[key].abandoned = false;
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

    /**
     * Prepare for travel by calling the unified prepareForTravel method.
     * This ensures all managers save their travel state consistently.
     * @returns {Object} Travel state data
     */
    prepareForTravel() {
        // Delegate to the unified prepareForTravel method in game.js
        if (typeof prepareForTravel === 'function') {
            return prepareForTravel();
        }
        // Fallback for testing environments
        return {};
    }

    /**
     * Capture a single, consistent departure snapshot:
     * - calls prepareForTravel to save state
     * - marks visited
     * - records population and ecumenopolis percent
     * - stamps departure time
     * Works for both story planets and random worlds.
     */
    recordDepartureSnapshot() {
        // Call unified prepareForTravel before recording snapshot
        this.prepareForTravel();
        
        const now = Date.now();
        const pop = globalThis?.resources?.colony?.colonists?.value || 0;
        const ecoPercent = getEcumenopolisLandFraction(globalThis.terraforming) * 100;
        const specialization = terraforming.requirementId;
        let foundryCompleted = false;
        try {
            foundryCompleted = projectManager.projects.foundryWorld.isCompleted;
        } catch (error) {
            foundryCompleted = false;
        }
        const foundryLandFactor = foundryCompleted
            ? this._getFoundryLandFactor(terraforming.initialLand)
            : 0;
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
                    ecumenopolisPercent: 0,
                    foundryWorld: false,
                    foundryLandFactor: 0,
                    specialization: ''
                };
            }
            const st = this.randomWorldStatuses[seed];
            st.visited = true;
            st.colonists = pop;
            st.departedAt = now;
            st.ecumenopolisPercent = ecoPercent;
            st.foundryWorld = foundryCompleted;
            st.foundryLandFactor = foundryLandFactor;
            st.specialization = specialization;
            if (!st.name) st.name = this.currentRandomName || `Seed ${seed}`;
        } else if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            if (!this.artificialWorldStatuses[key]) {
                const terraformedValue = this._deriveArtificialTerraformValue({
                    landHa: this._getCurrentWorldLandHa(),
                    original: this.getCurrentWorldOriginal()
                });
                this.artificialWorldStatuses[key] = {
                    name: this.currentRandomName || `Artificial ${key}`,
                    terraformed: false,
                    colonists: 0,
                    original: this.getCurrentWorldOriginal ? this.getCurrentWorldOriginal() : null,
                    visited: true,
                    orbitalRing: false,
                    departedAt: null,
                    ecumenopolisPercent: 0,
                    foundryWorld: false,
                    foundryLandFactor: 0,
                    specialization: '',
                    artificial: true,
                    terraformedValue,
                    fleetCapacityValue: this._deriveArtificialFleetCapacityValue({ terraformedValue })
                };
            }
            const st = this.artificialWorldStatuses[key];
            st.visited = true;
            st.colonists = pop;
            st.departedAt = now;
            st.ecumenopolisPercent = ecoPercent;
            st.foundryWorld = foundryCompleted;
            st.foundryLandFactor = foundryLandFactor;
            st.specialization = specialization;
            st.abandoned = !this._isCurrentWorldTerraformed();
            if (!st.terraformedValue) {
                st.terraformedValue = this._deriveArtificialTerraformValue({
                    landHa: this._getCurrentWorldLandHa(),
                    original: this.getCurrentWorldOriginal(),
                    terraformedValue: st.terraformedValue
                });
            }
            if (!Number.isFinite(st.fleetCapacityValue) || st.fleetCapacityValue <= 0) {
                st.fleetCapacityValue = this._deriveArtificialFleetCapacityValue(st);
            }
            st.artificialSnapshot = artificialManager.buildSnapshotFromParams(currentPlanetParameters);
            if (!st.name) st.name = this.currentRandomName || `Artificial ${key}`;
        } else if (this.planetStatuses[this.currentPlanetKey]) {
            const ps = this.planetStatuses[this.currentPlanetKey];
            ps.visited = true;
            ps.colonists = pop;
            ps.departedAt = now;
            ps.ecumenopolisPercent = ecoPercent;
            ps.foundryWorld = foundryCompleted;
            ps.foundryLandFactor = foundryLandFactor;
            ps.specialization = specialization;
        }
        this._refreshFoundryWorldBonusCache();
    }

    getFoundryWorldCount({ excludeCurrent = true } = {}) {
        return this.getFoundryWorldBonusData({ excludeCurrent }).count;
    }

    _getFoundryLandFactor(initialLand) {
        const normalized = Math.max(initialLand, 0);
        return Math.sqrt(normalized / 50000000000);
    }

    getFoundryWorldBonusData({ excludeCurrent = true } = {}) {
        const cached = this.foundryWorldBonusCache;
        if (!excludeCurrent) {
            return { count: cached.count, bonus: cached.bonus };
        }
        const currentStatus = this._getCurrentFoundryStatus();
        if (!currentStatus.foundryWorld) {
            return { count: cached.count, bonus: cached.bonus };
        }
        const currentBonus = (currentStatus.foundryLandFactor || 0) * 1e11;
        return {
            count: Math.max(0, cached.count - 1),
            bonus: Math.max(0, cached.bonus - currentBonus)
        };
    }

    _isCurrentWorldTerraformed() {
        if (this.currentRandomSeed !== null) {
            const activeSeed = String(this.currentRandomSeed);
            return this.isSeedTerraformed(activeSeed);
        }
        if (this.currentArtificialKey !== null) {
            return !!this.artificialWorldStatuses[String(this.currentArtificialKey)]?.terraformed;
        }
        return this.isPlanetTerraformed(this.currentPlanetKey);
    }

    _applyTravelRewards(firstVisit, departingTerraformed, destinationTerraformed) {
        if (firstVisit && departingTerraformed && !destinationTerraformed && skillManager) {
            skillManager.skillPoints += 1;
            notifySkillPointGained(1);
        }
    }

    _finalizeTravelInitialization(options) {
        const params = options?.planetParameters;
        if (options?.updateDefaultPlanet && options?.planetKey) {
            defaultPlanet = options.planetKey;
        }
        if (params) {
            currentPlanetParameters = params;
        }
        initializeGameState({ preserveManagers: true, preserveJournal: true });
    }

    travelToStoryPlanet(targetKey) {
        if (!targetKey) {
            console.warn('SpaceManager: No planet key provided for travel.');
            return false;
        }
        if (this.currentRandomSeed === null && this.currentArtificialKey === null && !this.isPlanetTerraformed(this.currentPlanetKey)) {
            console.warn('SpaceManager: Cannot travel until the current planet is terraformed.');
            return false;
        }
        if (!this.isPlanetEnabled(targetKey)) {
            console.warn(`SpaceManager: Planet ${targetKey} is not available yet.`);
            return false;
        }
        if (this.isPlanetTerraformed(targetKey)) {
            console.warn(`SpaceManager: Planet ${targetKey} has already been terraformed.`);
            return false;
        }

        const departingTerraformed = this._isCurrentWorldTerraformed();
        // prepareForTravel is now called within recordDepartureSnapshot via changeCurrentPlanet
        if (!this.changeCurrentPlanet(targetKey)) {
            return false;
        }
        this.currentArtificialKey = null;

        this.currentRandomSeed = null;
        this.currentRandomName = '';

        const firstVisit = this.visitPlanet(targetKey);
        const destinationTerraformed = this.isPlanetTerraformed(targetKey);
        this._applyTravelRewards(firstVisit, departingTerraformed, destinationTerraformed);
        const params = planetParameters[targetKey] || defaultPlanetParameters;
        this._finalizeTravelInitialization({
            planetKey: targetKey,
            planetParameters: params,
            updateDefaultPlanet: true
        });
        return true;
    }

    travelToRandomWorld(res, seed) {
        if (this.isRandomTravelLocked()) {
            console.warn('SpaceManager: Random world travel is locked for the current world.');
            return false;
        }
        // Prefer canonical seedString from RWG result so it encodes target/type/orbit
        const s = String(res && typeof res.seedString === 'string' ? res.seedString : seed);
        const isArtificial = !!(res?.artificial || res?.original?.artificial);
        if (!isArtificial) {
            if (this.isSeedTerraformed(s)) {
                console.warn(`SpaceManager: Seed ${s} already terraformed.`);
                return false;
            }
        }

        const departingTerraformed = this._isCurrentWorldTerraformed();

        const existing = isArtificial ? this.artificialWorldStatuses[s] : this.randomWorldStatuses[s];
        const firstVisit = !existing?.visited;
        const destinationTerraformed = existing?.terraformed || false;
        const artificialWorld = isArtificial || existing?.artificial;

        // prepareForTravel is now called within recordDepartureSnapshot
        this.recordDepartureSnapshot();

        this.currentRandomSeed = isArtificial ? null : s;
        this.currentArtificialKey = isArtificial ? s : null;
        this.currentPlanetKey = s;
        this.currentRandomName = res?.merged?.name || (isArtificial ? `Artificial ${s}` : `Seed ${s}`);
        const terraformedValue = isArtificial
            ? this._deriveArtificialTerraformValue({
                terraformedValue: res?.terraformedValue,
                landHa: getLandFromParams(res?.merged),
                original: res
            })
            : 1;
        const sector = resolveSectorFromSources(res);
        if (!existing) {
            const targetMap = isArtificial ? this.artificialWorldStatuses : this.randomWorldStatuses;
            targetMap[s] = {
                name: this.currentRandomName,
                terraformed: false,
                colonists: 0,
                original: res,
                visited: true,
                orbitalRing: false,
                departedAt: null,
                ecumenopolisPercent: 0,
                artificial: artificialWorld,
                terraformedValue,
                sector
            };
        } else {
            existing.original = existing.original || res;
            existing.artificial = existing.artificial || artificialWorld;
            existing.visited = true;
            if (isArtificial && !existing.terraformedValue) {
                existing.terraformedValue = terraformedValue;
            }
            if (!existing.name) {
                existing.name = this.currentRandomName;
            }
            if (!existing.sector) {
                existing.sector = sector;
            }
        }

        this._applyTravelRewards(firstVisit, departingTerraformed, destinationTerraformed);
        const mergedParams = res?.merged || existing?.original?.merged || null;
        this._finalizeTravelInitialization({
            planetParameters: mergedParams
        });
        return true;
    }

    // --- Save/Load ---
    saveState() {
        const activeRandomKey = this.currentRandomSeed === null ? null : String(this.currentRandomSeed);
        const activeArtificialKey = this.currentArtificialKey === null ? null : String(this.currentArtificialKey);
        const pickArchetype = (status) => {
            if (!status) return null;
            return status.cachedArchetype
                || status.archetype
                || status.classification?.archetype
                || status.original?.archetype
                || status.original?.classification?.archetype
                || status.original?.merged?.classification?.archetype
                || status.override?.classification?.archetype
                || status.merged?.classification?.archetype
                || null;
        };
        const pickLandHa = (status) => {
            if (!status) return null;
            const sources = [
                status.cachedLandHa,
                status.landHa,
                status.original?.landHa,
                getLandFromParams(status.original?.merged),
                getLandFromParams(status.original?.override),
                getLandFromParams(status.original),
                getLandFromParams(status.merged),
                getLandFromParams(status.override)
            ];
            for (let index = 0; index < sources.length; index += 1) {
                const value = sources[index];
                if (Number.isFinite(value) && value > 0) {
                    return value;
                }
            }
            return null;
        };
        const pickSector = (status) => {
            if (!status) return null;
            return resolveSectorFromSources(status, status.original);
        };
        const pickHazards = (status) => {
            if (!status) return null;
            const hazardKeys = new Set();
            (status.cachedHazards?.keys || []).forEach((key) => {
                if (SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
            });
            const hazardValue = status.hazard || status.original?.hazard;
            if (hazardValue && hazardValue !== 'none') {
                if (Array.isArray(hazardValue)) {
                    hazardValue.forEach((entry) => {
                        const key = String(entry);
                        if (entry !== 'none' && SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                    });
                } else if (hazardValue.constructor === Object) {
                    Object.keys(hazardValue).forEach((key) => {
                        if (SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                    });
                } else {
                    const key = String(hazardValue);
                    if (SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                }
            }
            const hazardSources = [
                status.override?.hazards,
                status.merged?.hazards,
                status.original?.override?.hazards,
                status.original?.merged?.hazards,
                status.original?.hazards
            ];
            hazardSources.forEach((src) => {
                Object.keys(src || {}).forEach((key) => {
                    if (SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                });
            });
            const selectedHazards = status.cachedHazards?.selectedHazards
                || status.override?.rwgMeta?.selectedHazards
                || status.merged?.rwgMeta?.selectedHazards
                || status.original?.override?.rwgMeta?.selectedHazards
                || status.original?.merged?.rwgMeta?.selectedHazards
                || null;
            if (selectedHazards) {
                if (Array.isArray(selectedHazards)) {
                    selectedHazards.forEach((entry) => {
                        const key = String(entry);
                        if (entry && entry !== 'none' && SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                    });
                } else if (selectedHazards.constructor === Object) {
                    Object.keys(selectedHazards).forEach((key) => {
                        if (SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                    });
                } else if (selectedHazards !== 'none') {
                    const key = String(selectedHazards);
                    if (SPACE_HAZARD_KEY_SET.has(key)) hazardKeys.add(key);
                }
            }
            const selectedHazardSource = status.cachedHazards?.selected
                || status.override?.rwgMeta?.selectedHazard
                || status.merged?.rwgMeta?.selectedHazard
                || status.original?.override?.rwgMeta?.selectedHazard
                || status.original?.merged?.rwgMeta?.selectedHazard
                || status.original?.hazard
                || status.hazard
                || null;
            const selectedHazard = Array.isArray(selectedHazardSource) ? selectedHazardSource[0] : selectedHazardSource;
            if (selectedHazard && selectedHazard !== 'none' && SPACE_HAZARD_KEY_SET.has(selectedHazard)) {
                hazardKeys.add(selectedHazard);
            }
            if (!hazardKeys.size) return null;
            const resolvedSelected = selectedHazard && selectedHazard !== 'none' && SPACE_HAZARD_KEY_SET.has(selectedHazard)
                ? selectedHazard
                : null;
            return { selected: resolvedSelected, keys: Array.from(hazardKeys) };
        };
        const pruneStatuses = (statuses, activeKey) => Object.fromEntries(
            Object.entries(statuses).map(([key, status]) => {
                if (!status || key === activeKey) return [key, status];
                const cachedArchetype = pickArchetype(status);
                const cachedLandHa = pickLandHa(status);
                const cachedSector = pickSector(status);
                const cachedHazards = pickHazards(status);
                const copy = { ...status };
                if (cachedArchetype && !copy.cachedArchetype) {
                    copy.cachedArchetype = cachedArchetype;
                }
                if (cachedArchetype && !copy.archetype) {
                    copy.archetype = cachedArchetype;
                }
                if (Number.isFinite(cachedLandHa) && !copy.cachedLandHa) {
                    copy.cachedLandHa = cachedLandHa;
                }
                if (cachedSector && !copy.sector) {
                    copy.sector = cachedSector;
                }
                if (cachedHazards && !copy.cachedHazards) {
                    copy.cachedHazards = cachedHazards;
                }
                delete copy.override;
                delete copy.merged;
                delete copy.original;
                return [key, copy];
            })
        );

        return {
            currentPlanetKey: this.currentPlanetKey,
            planetStatuses: this.planetStatuses,
            currentRandomSeed: this.currentRandomSeed,
            currentRandomName: this.currentRandomName,
            currentArtificialKey: this.currentArtificialKey,
            artificialWorldStatuses: pruneStatuses(this.artificialWorldStatuses, activeArtificialKey),
            randomWorldStatuses: pruneStatuses(this.randomWorldStatuses, activeRandomKey),
            randomTabEnabled: this.randomTabEnabled,
            rwgSectorLock: this.rwgSectorLock,
            rwgSectorLockManual: this.rwgSectorLockManual,
            oneillCylinders: this.getOneillCylinderCount(),
            dominionTerraformRewards: this.dominionTerraformRewards,
            dominionTerraformRewardCount: this.dominionTerraformRewardCount
        };
    }

    loadState(savedData) {
        // Reset to default before loading
        this.currentPlanetKey = 'mars';
        this.currentRandomSeed = null;
        this.currentRandomName = '';
        this.currentArtificialKey = null;
        this.randomWorldStatuses = {};
        this.artificialWorldStatuses = {};
        this.randomTabEnabled = false;
        this.rwgSectorLock = null;
        this.rwgSectorLockManual = false;
        this.oneillCylinders = 0;
        this.dominionTerraformRewards = {};
        this.dominionTerraformRewardCount = 0;
        this._initializePlanetStatuses(); // Reset statuses to default structure

        const parseHazardList = (value) => {
            const text = String(value || '').trim();
            if (!text || text === 'none' || text === 'auto') return [];
            return text.split(',')
                .map((entry) => String(entry).trim())
                .filter((entry) => entry && entry !== 'none' && entry !== 'auto' && SPACE_HAZARD_KEY_SET.has(entry));
        };
        const hazardFromSeed = (seed) => {
            if (seed == null) return null;
            const segments = String(seed).split('|');
            const freeform = [];
            let hazards = [];
            for (let i = 1; i < segments.length; i += 1) {
                const seg = (segments[i] || '').trim();
                if (!seg) continue;
                if (seg.includes('=')) {
                    const [k, v] = seg.split('=');
                    const key = (k || '').trim().toLowerCase();
                    if ((key === 'hazard' || key === 'haz' || key === 'feature') && (v || '').trim()) {
                        hazards = hazards.concat(parseHazardList(v));
                    }
                } else {
                    freeform.push(seg);
                }
            }
            if (!hazards.length && freeform.length >= 4) {
                hazards = parseHazardList(freeform[3]);
            }
            return hazards.length ? hazards : null;
        };
        const assignSector = (status) => {
            if (!status) {
                return;
            }
            const resolved = status.sector || resolveSectorFromSources(status, status.original);
            status.sector = normalizeSectorLabel(resolved);
        };
        const sanitizeCachedHazards = (status) => {
            const cached = status.cachedHazards;
            const keys = (cached?.keys || [])
                .map((key) => String(key))
                .filter((key) => SPACE_HAZARD_KEY_SET.has(key));
            const selected = cached?.selected;
            const selectedKey = selected && selected !== 'none' && SPACE_HAZARD_KEY_SET.has(selected)
                ? selected
                : keys[0];
            status.cachedHazards = (keys.length || selectedKey)
                ? { selected: selectedKey || null, keys }
                : null;
        };

        if (!savedData) {
             console.log("SpaceManager: No save data provided, using defaults.");
             return; // Keep defaults initialized above
        }

        const savedOneill = Number(savedData.oneillCylinders);
        if (Number.isFinite(savedOneill) && savedOneill > 0) {
            this.setOneillCylinderCount(savedOneill);
        }

        // Load current location
        if (savedData.currentRandomSeed !== undefined && savedData.currentRandomSeed !== null) {
            this.currentRandomSeed = savedData.currentRandomSeed;
            this.currentRandomName = savedData.currentRandomName || '';
            this.currentPlanetKey = String(savedData.currentRandomSeed);
        } else if (savedData.currentArtificialKey) {
            this.currentArtificialKey = savedData.currentArtificialKey;
            this.currentRandomName = savedData.currentRandomName || '';
            this.currentPlanetKey = String(savedData.currentArtificialKey);
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
                    if (saved.foundryWorld === true || saved.foundryWorld === false) {
                        this.planetStatuses[planetKey].foundryWorld = saved.foundryWorld;
                    }
                    this.planetStatuses[planetKey].foundryLandFactor = saved.foundryLandFactor || 0;
                    if (saved.specialization) {
                        this.planetStatuses[planetKey].specialization = saved.specialization;
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

        if (savedData.artificialWorldStatuses) {
            this.artificialWorldStatuses = savedData.artificialWorldStatuses;
            Object.keys(this.artificialWorldStatuses).forEach((key) => {
                const entry = this.artificialWorldStatuses[key];
                if (!entry) {
                    return;
                }
                if (entry.orbitalRing) {
                    entry.orbitalRing = false;
                }
                if (!Number.isFinite(entry.terraformedValue) && entry.terraformed) {
                    entry.terraformedValue = this._deriveArtificialTerraformValue(entry);
                }
                if (!Number.isFinite(entry.fleetCapacityValue) || entry.fleetCapacityValue <= 0) {
                    entry.fleetCapacityValue = this._deriveArtificialFleetCapacityValue(entry);
                }
                entry.foundryLandFactor = entry.foundryLandFactor || 0;
                assignSector(entry);
                sanitizeCachedHazards(entry);
            });
        }

        if (savedData.randomWorldStatuses) {
            this.randomWorldStatuses = savedData.randomWorldStatuses;
            Object.values(this.randomWorldStatuses)
                .filter(Boolean)
                .forEach((entry) => {
                    entry.foundryLandFactor = entry.foundryLandFactor || 0;
                    assignSector(entry);
                    sanitizeCachedHazards(entry);
                });
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
            Object.keys(this.randomWorldStatuses).forEach((seed) => {
                const hazards = hazardFromSeed(seed);
                if (!hazards || !hazards.length) {
                    return;
                }
                const status = this.randomWorldStatuses[seed];
                if (!status) return;
                const hazardList = (Array.isArray(hazards) ? hazards : [String(hazards)])
                    .map((hazardKey) => String(hazardKey))
                    .filter((hazardKey) => hazardKey && hazardKey !== 'none' && SPACE_HAZARD_KEY_SET.has(hazardKey));
                const existingKeys = new Set(status.cachedHazards?.keys || []);
                hazardList.forEach((hazardKey) => existingKeys.add(hazardKey));
                const selected = status.cachedHazards?.selected
                    || (Array.isArray(status.hazard) ? status.hazard[0] : status.hazard)
                    || hazardList[0]
                    || null;
                const resolvedSelected = selected && selected !== 'none' && SPACE_HAZARD_KEY_SET.has(selected)
                    ? selected
                    : hazardList[0];
                status.cachedHazards = {
                    selected: resolvedSelected,
                    keys: Array.from(existingKeys)
                };
                if (!status.hazard || status.hazard === 'none') {
                    status.hazard = hazardList.length === 1 ? hazardList[0] : hazardList.slice();
                }
            });
        }

        Object.keys(this.planetStatuses).forEach((planetKey) => {
            this._syncFoundryLandFactor(this.planetStatuses[planetKey], planetKey);
        });
        Object.keys(this.randomWorldStatuses).forEach((key) => {
            this._syncFoundryLandFactor(this.randomWorldStatuses[key], key);
        });
        Object.keys(this.artificialWorldStatuses).forEach((key) => {
            this._syncFoundryLandFactor(this.artificialWorldStatuses[key], key);
        });
        this._refreshFoundryWorldBonusCache();

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

        this.dominionTerraformRewards = savedData.dominionTerraformRewards || {};
        this.dominionTerraformRewardCount = savedData.dominionTerraformRewardCount || 0;

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
