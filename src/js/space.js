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
const MAX_REMEMBERED_RANDOM_WORLD_STATUSES = 10;
const MAX_REMEMBERED_ARTIFICIAL_WORLD_STATUSES = 50;

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

function getLandFromParams(source) {
    return source?.resources?.surface?.land?.initialValue
        || source?.resources?.surface?.land?.baseCap
        || 0;
}

function cloneSpaceWorldData(data) {
    if (!data) {
        return null;
    }
    return JSON.parse(JSON.stringify(data));
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
        this.rwgSummary = this._createEmptyRwgSummary();
        this.currentArtificialKey = null;
        this.artificialWorldStatuses = {};
        this.artificialSummary = this._createEmptyArtificialSummary();
        this.extraTerraformedWorlds = 0;
        this.rwgSectorLock = null;
        this.rwgSectorLockManual = false;
        this.oneillCylinders = 0;
        this.dominionTerraformRewards = {};
        this.dominionTerraformRewardCount = 0;
        this.foundryWorldBonusCache = { count: 0, bonus: 0 };
        this.worldStatsCache = this._createEmptyWorldStatsCache();

        this._initializePlanetStatuses();
        // Mark the starting planet as visited
        if (this.planetStatuses[this.currentPlanetKey]) {
            this.planetStatuses[this.currentPlanetKey].visited = true;
        }
        this._refreshWorldStatsCache();
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
                naturalMagnetosphere: false,
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
        this._resetWorldStatsCache();
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
        const reward = 1000 * rewardIndex;
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

    _createEmptyWorldStatsCache() {
        return {
            storyTerraformed: 0,
            randomTerraformed: 0,
            artificialTerraformed: 0,
            storyOrbitalRings: 0,
            randomOrbitalRings: 0,
            artificialOrbitalRings: 0,
            artificialTerraformBonus: 0,
            artificialTerraformValueCounts: {},
            artificialFleetCapacityWorlds: 0,
            lastArtificialFleetCap: null,
            sectorCounts: {},
            randomTypeCounts: {},
            randomTypeHazardBonuses: {}
        };
    }

    _createEmptyRwgSummary() {
        return {
            terraformedCount: 0,
            orbitalRingCount: 0,
            departedColonistsTotal: 0,
            sectorUnits: {},
            sectorTerraformedCounts: {},
            sectorRingCounts: {},
            typeCounts: {},
            typeHazardBonuses: {},
            typeHazardCounts: {},
            specializationCounts: {},
            foundryWorldCount: 0,
            foundryWorldBonus: 0
        };
    }

    _createEmptyArtificialSummary() {
        return {
            departedColonistsTotal: 0,
            terraformedCount: 0,
            sectorTerraformCounts: {},
            sectorUnits: {},
            terraformValueCounts: {},
            sectorTerraformValueCounts: {},
            specializationCounts: {},
            foundryWorldCount: 0,
            foundryWorldBonus: 0
        };
    }

    _resetWorldStatsCache() {
        this.worldStatsCache = this._createEmptyWorldStatsCache();
    }

    _adjustRwgSummaryNumber(field, delta) {
        if (!delta) {
            return;
        }
        const next = (this.rwgSummary[field] || 0) + delta;
        this.rwgSummary[field] = next > 0 ? next : 0;
    }

    _adjustRwgSummaryMapValue(mapName, key, delta) {
        if (!delta || !key) {
            return;
        }
        const map = this.rwgSummary[mapName];
        if (!map) {
            return;
        }
        const current = map[key] || 0;
        const next = current + delta;
        if (next > 0) {
            map[key] = next;
        } else {
            delete map[key];
        }
    }

    _adjustRwgSummaryNestedMapValue(mapName, outerKey, innerKey, delta) {
        if (!delta || !outerKey || !innerKey) {
            return;
        }
        const map = this.rwgSummary[mapName];
        if (!map) {
            return;
        }
        const outer = map[outerKey] || (map[outerKey] = {});
        const current = outer[innerKey] || 0;
        const next = current + delta;
        if (next > 0) {
            outer[innerKey] = next;
            return;
        }
        delete outer[innerKey];
        if (!Object.keys(outer).length) {
            delete map[outerKey];
        }
    }

    _mergeCountMaps(baseMap, extraMap) {
        const merged = { ...(baseMap || {}) };
        Object.keys(extraMap || {}).forEach((key) => {
            const next = (merged[key] || 0) + (extraMap[key] || 0);
            if (next > 0) {
                merged[key] = next;
            } else {
                delete merged[key];
            }
        });
        return merged;
    }

    _sanitizeCountMap(source = {}) {
        const sanitized = {};
        Object.keys(source || {}).forEach((key) => {
            const value = Number(source[key]) || 0;
            if (value > 0) {
                sanitized[key] = value;
            }
        });
        return sanitized;
    }

    _sanitizeNestedCountMap(source = {}) {
        const sanitized = {};
        Object.keys(source || {}).forEach((outerKey) => {
            const child = this._sanitizeCountMap(source[outerKey]);
            if (Object.keys(child).length) {
                sanitized[outerKey] = child;
            }
        });
        return sanitized;
    }

    _sanitizeRwgSummary(summary = {}) {
        return {
            terraformedCount: Math.max(0, Number(summary.terraformedCount) || 0),
            orbitalRingCount: Math.max(0, Number(summary.orbitalRingCount) || 0),
            departedColonistsTotal: Math.max(0, Number(summary.departedColonistsTotal) || 0),
            sectorUnits: this._sanitizeCountMap(summary.sectorUnits),
            sectorTerraformedCounts: this._sanitizeCountMap(summary.sectorTerraformedCounts),
            sectorRingCounts: this._sanitizeCountMap(summary.sectorRingCounts),
            typeCounts: this._sanitizeCountMap(summary.typeCounts),
            typeHazardBonuses: this._sanitizeCountMap(summary.typeHazardBonuses),
            typeHazardCounts: this._sanitizeNestedCountMap(summary.typeHazardCounts),
            specializationCounts: this._sanitizeCountMap(summary.specializationCounts),
            foundryWorldCount: Math.max(0, Number(summary.foundryWorldCount) || 0),
            foundryWorldBonus: Math.max(0, Number(summary.foundryWorldBonus) || 0)
        };
    }

    _adjustArtificialSummaryNumber(field, delta) {
        if (!delta) {
            return;
        }
        const next = (this.artificialSummary[field] || 0) + delta;
        this.artificialSummary[field] = next > 0 ? next : 0;
    }

    _adjustArtificialSummaryMapValue(mapName, key, delta) {
        if (!delta || !key) {
            return;
        }
        const map = this.artificialSummary[mapName];
        if (!map) {
            return;
        }
        const current = map[key] || 0;
        const next = current + delta;
        if (next > 0) {
            map[key] = next;
        } else {
            delete map[key];
        }
    }

    _adjustArtificialSummaryNestedMapValue(mapName, outerKey, innerKey, delta) {
        if (!delta || !outerKey || !innerKey) {
            return;
        }
        const map = this.artificialSummary[mapName];
        if (!map) {
            return;
        }
        const outer = map[outerKey] || (map[outerKey] = {});
        const current = outer[innerKey] || 0;
        const next = current + delta;
        if (next > 0) {
            outer[innerKey] = next;
            return;
        }
        delete outer[innerKey];
        if (!Object.keys(outer).length) {
            delete map[outerKey];
        }
    }

    _sanitizeArtificialSummary(summary = {}) {
        return {
            departedColonistsTotal: Math.max(0, Number(summary.departedColonistsTotal) || 0),
            terraformedCount: Math.max(0, Number(summary.terraformedCount) || 0),
            sectorTerraformCounts: this._sanitizeCountMap(summary.sectorTerraformCounts),
            sectorUnits: this._sanitizeCountMap(summary.sectorUnits),
            terraformValueCounts: this._sanitizeCountMap(summary.terraformValueCounts),
            sectorTerraformValueCounts: this._sanitizeNestedCountMap(summary.sectorTerraformValueCounts),
            specializationCounts: this._sanitizeCountMap(summary.specializationCounts),
            foundryWorldCount: Math.max(0, Number(summary.foundryWorldCount) || 0),
            foundryWorldBonus: Math.max(0, Number(summary.foundryWorldBonus) || 0)
        };
    }

    _getWorldStatusMap(type) {
        if (type === 'story') {
            return this.planetStatuses;
        }
        if (type === 'random') {
            return this.randomWorldStatuses;
        }
        if (type === 'artificial') {
            return this.artificialWorldStatuses;
        }
        return null;
    }

    _adjustCachedNumber(field, delta) {
        if (!delta) {
            return;
        }
        const next = (this.worldStatsCache[field] || 0) + delta;
        this.worldStatsCache[field] = next > 0 ? next : 0;
    }

    _adjustCachedMapValue(mapName, key, delta) {
        if (!delta || !key) {
            return;
        }
        const map = this.worldStatsCache[mapName];
        if (!map) {
            return;
        }
        const current = map[key] || 0;
        const next = current + delta;
        if (next > 0) {
            map[key] = next;
        } else {
            delete map[key];
        }
    }

    _addHazardsToSet(hazardKeys, value) {
        if (!value || value === 'none') return;
        if (Array.isArray(value)) {
            value.forEach((entry) => {
                if (entry && entry !== 'none') hazardKeys.add(String(entry));
            });
            return;
        }
        if (value.constructor === Object) {
            Object.keys(value).forEach((entry) => {
                if (entry && entry !== 'none') hazardKeys.add(String(entry));
            });
            return;
        }
        hazardKeys.add(String(value));
    }

    _getRandomWorldType(status) {
        if (!status) return null;
        const resolved = status.cachedArchetype
            || status.archetype
            || status.classification?.archetype
            || status.original?.archetype
            || status.original?.classification?.archetype
            || status.original?.merged?.classification?.archetype
            || status.original?.override?.classification?.archetype
            || null;
        if (resolved && !status.cachedArchetype) {
            status.cachedArchetype = resolved;
        }
        return resolved;
    }

    _collectRandomWorldHazardKeys(status) {
        if (!status) {
            return new Set();
        }
        const hazardKeys = new Set(status.cachedHazards?.keys || []);
        this._addHazardsToSet(hazardKeys, status.hazard);
        this._addHazardsToSet(hazardKeys, status.original?.hazard);
        const override = status.override
            || status.merged
            || status.original?.override
            || status.original?.merged
            || null;
        this._addHazardsToSet(hazardKeys, override?.rwgMeta?.selectedHazards);
        this._addHazardsToSet(hazardKeys, override?.rwgMeta?.selectedHazard);
        this._addHazardsToSet(hazardKeys, override?.hazards);
        this._addHazardsToSet(hazardKeys, status.original?.hazards);
        return hazardKeys;
    }

    _countRandomWorldHazards(status) {
        if (!status) {
            return 0;
        }
        if (Number.isFinite(status.cachedHazardCount) && status.cachedHazardCount >= 0) {
            return Math.floor(status.cachedHazardCount);
        }
        const hazardKeys = this._collectRandomWorldHazardKeys(status);
        const count = hazardKeys.size;
        status.cachedHazardCount = count;
        return count;
    }

    _addRandomWorldStatusToSummary(status) {
        if (!status) {
            return;
        }

        this._adjustRwgSummaryNumber('departedColonistsTotal', Math.max(0, Number(status.colonists) || 0));

        if (status.specialization) {
            this._adjustRwgSummaryMapValue('specializationCounts', status.specialization, 1);
        }

        if (status.foundryWorld) {
            this._adjustRwgSummaryNumber('foundryWorldCount', 1);
            this._adjustRwgSummaryNumber('foundryWorldBonus', (status.foundryLandFactor || 0) * 1e11);
        }

        if (!status.terraformed) {
            return;
        }

        this._adjustRwgSummaryNumber('terraformedCount', 1);
        const sector = normalizeSectorLabel(status.sector || resolveSectorFromSources(status, status.original));
        this._adjustRwgSummaryMapValue('sectorTerraformedCounts', sector, 1);
        if (status.orbitalRing) {
            this._adjustRwgSummaryNumber('orbitalRingCount', 1);
            this._adjustRwgSummaryMapValue('sectorRingCounts', sector, 1);
        }

        const sectorUnits = 1 + (status.orbitalRing ? 1 : 0);
        this._adjustRwgSummaryMapValue('sectorUnits', sector, sectorUnits);

        const worldType = this._getRandomWorldType(status);
        if (worldType) {
            this._adjustRwgSummaryMapValue('typeCounts', worldType, 1);
            const hazardKeys = Array.from(this._collectRandomWorldHazardKeys(status));
            if (hazardKeys.length) {
                this._adjustRwgSummaryMapValue('typeHazardBonuses', worldType, hazardKeys.length);
                hazardKeys.forEach((hazardKey) => {
                    this._adjustRwgSummaryNestedMapValue('typeHazardCounts', worldType, hazardKey, 1);
                });
            }
        }
    }

    _addArtificialWorldStatusToSummary(status) {
        if (!status) {
            return;
        }

        this._adjustArtificialSummaryNumber('departedColonistsTotal', Math.max(0, Number(status.colonists) || 0));

        if (!status.terraformed) {
            return;
        }

        this._adjustArtificialSummaryNumber('terraformedCount', 1);
        const sector = normalizeSectorLabel(status.sector || resolveSectorFromSources(status, status.original));
        const terraformedValue = this._deriveArtificialTerraformValue(status);
        this._adjustArtificialSummaryMapValue('sectorTerraformCounts', sector, 1);
        this._adjustArtificialSummaryMapValue('sectorUnits', sector, terraformedValue);
        this._adjustArtificialSummaryMapValue('terraformValueCounts', String(terraformedValue), 1);
        this._adjustArtificialSummaryNestedMapValue('sectorTerraformValueCounts', sector, String(terraformedValue), 1);

        if (status.specialization) {
            this._adjustArtificialSummaryMapValue('specializationCounts', status.specialization, 1);
        }

        if (status.foundryWorld) {
            this._adjustArtificialSummaryNumber('foundryWorldCount', 1);
            this._adjustArtificialSummaryNumber('foundryWorldBonus', (status.foundryLandFactor || 0) * 1e11);
        }
    }

    _isRememberedArtificialWorldStatus(key, status, activeKey) {
        return !!status
            && key !== activeKey
            && !status.stored
            && (!!status.terraformed || !!status.abandoned);
    }

    _isPrunableArtificialWorldStatus(key, status, activeKey) {
        return !!status
            && key !== activeKey
            && !!status.terraformed
            && !status.stored
            && !status.abandoned;
    }

    _stripCompactableArtificialStatus(status) {
        if (!status) {
            return;
        }
        delete status.original;
        delete status.override;
        delete status.merged;
        delete status.artificialSnapshot;
    }

    _prepareCompactableArtificialStatus(status) {
        if (!status) {
            return status;
        }
        if (!status.sector) {
            status.sector = normalizeSectorLabel(resolveSectorFromSources(status, status.original));
        } else {
            status.sector = normalizeSectorLabel(status.sector);
        }
        const landHa = status.cachedLandHa
            || status.landHa
            || status.original?.landHa
            || getLandFromParams(status.original?.merged)
            || getLandFromParams(status.original?.override)
            || getLandFromParams(status.original);
        if (Number.isFinite(landHa) && landHa > 0) {
            if (!status.landHa) {
                status.landHa = landHa;
            }
            if (!status.cachedLandHa) {
                status.cachedLandHa = landHa;
            }
        }
        if (!Number.isFinite(status.terraformedValue) || status.terraformedValue <= 0) {
            status.terraformedValue = this._deriveArtificialTerraformValue(status);
        }
        if (!Number.isFinite(status.fleetCapacityValue) || status.fleetCapacityValue <= 0) {
            status.fleetCapacityValue = this._deriveArtificialFleetCapacityValue(status);
        }
        return status;
    }

    _compactRandomWorldStatuses() {
        const activeKey = this.currentRandomSeed === null ? null : String(this.currentRandomSeed);
        const inactiveEntries = Object.entries(this.randomWorldStatuses)
            .filter(([key, status]) => !!status && key !== activeKey)
            .sort((a, b) => (b[1].departedAt || 0) - (a[1].departedAt || 0));

        if (inactiveEntries.length <= MAX_REMEMBERED_RANDOM_WORLD_STATUSES) {
            return;
        }

        const keepKeys = new Set(
            inactiveEntries
                .slice(0, MAX_REMEMBERED_RANDOM_WORLD_STATUSES)
                .map(([key]) => key)
        );
        if (activeKey !== null && this.randomWorldStatuses[activeKey]) {
            keepKeys.add(activeKey);
        }

        let changed = false;
        Object.keys(this.randomWorldStatuses).forEach((key) => {
            if (keepKeys.has(key)) {
                return;
            }
            const status = this.randomWorldStatuses[key];
            if (!status) {
                delete this.randomWorldStatuses[key];
                changed = true;
                return;
            }
            this._addRandomWorldStatusToSummary(status);
            delete this.randomWorldStatuses[key];
            if (followersManager && followersManager.resetConsecrationForSeed) {
                followersManager.resetConsecrationForSeed(key);
            }
            changed = true;
        });

        if (changed) {
            this._refreshWorldStatsCache();
            this._refreshFoundryWorldBonusCache();
        }
    }

    _compactArtificialWorldStatuses() {
        const activeKey = this.currentArtificialKey === null ? null : String(this.currentArtificialKey);
        const rememberedEntries = Object.entries(this.artificialWorldStatuses)
            .filter(([key, status]) => this._isRememberedArtificialWorldStatus(key, status, activeKey))
            .sort((a, b) => (b[1].departedAt || 0) - (a[1].departedAt || 0));

        const keepKeys = new Set(
            rememberedEntries
                .slice(0, MAX_REMEMBERED_ARTIFICIAL_WORLD_STATUSES)
                .map(([key]) => key)
        );

        let changed = false;
        Object.keys(this.artificialWorldStatuses).forEach((key) => {
            const status = this.artificialWorldStatuses[key];
            if (!status) {
                delete this.artificialWorldStatuses[key];
                changed = true;
                return;
            }
            if (!this._isRememberedArtificialWorldStatus(key, status, activeKey)) {
                return;
            }
            if (keepKeys.has(key)) {
                if (this._isPrunableArtificialWorldStatus(key, status, activeKey)) {
                    this._prepareCompactableArtificialStatus(status);
                    const hadHeavyData = !!(status.original || status.override || status.merged || status.artificialSnapshot);
                    this._stripCompactableArtificialStatus(status);
                    if (hadHeavyData) {
                        changed = true;
                    }
                }
                return;
            }
            this._addArtificialWorldStatusToSummary(status);
            delete this.artificialWorldStatuses[key];
            changed = true;
        });

        if (changed) {
            this._refreshWorldStatsCache();
            this._refreshFoundryWorldBonusCache();
        }
    }

    _getTotalRandomTerraformedCount() {
        return (this.worldStatsCache.randomTerraformed || 0) + (this.rwgSummary.terraformedCount || 0);
    }

    _getTotalArtificialTerraformedCount() {
        return (this.worldStatsCache.artificialTerraformed || 0) + (this.artificialSummary.terraformedCount || 0);
    }

    _getTotalArtificialTerraformBonus() {
        const summaryUnits = Object.values(this.artificialSummary.sectorUnits || {})
            .reduce((total, value) => total + (Number(value) || 0), 0);
        return (this.worldStatsCache.artificialTerraformBonus || 0)
            + Math.max(0, summaryUnits - (this.artificialSummary.terraformedCount || 0));
    }

    _getTotalRandomOrbitalRingCount() {
        return (this.worldStatsCache.randomOrbitalRings || 0) + (this.rwgSummary.orbitalRingCount || 0);
    }

    _getForgottenSectorRinglessCapacity(sectorLabel) {
        const sector = normalizeSectorLabel(sectorLabel);
        const terraformed = this.rwgSummary.sectorTerraformedCounts[sector] || 0;
        const rings = this.rwgSummary.sectorRingCounts[sector] || 0;
        return Math.max(0, terraformed - rings);
    }

    _setForgottenOrbitalRingCount(targetCount) {
        const maxCount = Math.max(0, this.rwgSummary.terraformedCount || 0);
        const target = Math.max(0, Math.min(maxCount, Number(targetCount) || 0));
        let current = Math.max(0, this.rwgSummary.orbitalRingCount || 0);
        if (target === current) {
            return current;
        }

        if (target > current) {
            let remaining = target - current;
            const sectors = Object.keys(this.rwgSummary.sectorTerraformedCounts || {})
                .filter((sector) => this._getForgottenSectorRinglessCapacity(sector) > 0)
                .sort((a, b) => {
                    const diff = this._getForgottenSectorRinglessCapacity(b) - this._getForgottenSectorRinglessCapacity(a);
                    return diff || a.localeCompare(b);
                });
            for (let index = 0; index < sectors.length && remaining > 0; index += 1) {
                const sector = sectors[index];
                const capacity = this._getForgottenSectorRinglessCapacity(sector);
                const addAmount = Math.min(remaining, capacity);
                if (!addAmount) {
                    continue;
                }
                this._adjustRwgSummaryMapValue('sectorRingCounts', sector, addAmount);
                this._adjustRwgSummaryMapValue('sectorUnits', sector, addAmount);
                this._adjustRwgSummaryNumber('orbitalRingCount', addAmount);
                current += addAmount;
                remaining -= addAmount;
            }
            return current;
        }

        let remaining = current - target;
        const sectors = Object.keys(this.rwgSummary.sectorRingCounts || {})
            .filter((sector) => (this.rwgSummary.sectorRingCounts[sector] || 0) > 0)
            .sort((a, b) => {
                const diff = (this.rwgSummary.sectorRingCounts[b] || 0) - (this.rwgSummary.sectorRingCounts[a] || 0);
                return diff || a.localeCompare(b);
            });
        for (let index = 0; index < sectors.length && remaining > 0; index += 1) {
            const sector = sectors[index];
            const currentRings = this.rwgSummary.sectorRingCounts[sector] || 0;
            const removeAmount = Math.min(remaining, currentRings);
            if (!removeAmount) {
                continue;
            }
            this._adjustRwgSummaryMapValue('sectorRingCounts', sector, -removeAmount);
            this._adjustRwgSummaryMapValue('sectorUnits', sector, -removeAmount);
            this._adjustRwgSummaryNumber('orbitalRingCount', -removeAmount);
            current -= removeAmount;
            remaining -= removeAmount;
        }
        return current;
    }

    _resolveStatusSector(type, key, status) {
        if (!status) {
            return SPACE_DEFAULT_SECTOR_LABEL;
        }
        if (status.sector) {
            const normalized = normalizeSectorLabel(status.sector);
            status.sector = normalized;
            return normalized;
        }
        let resolved = SPACE_DEFAULT_SECTOR_LABEL;
        if (type === 'story') {
            let overridesLookup = null;
            try {
                overridesLookup = planetOverrides;
            } catch (error) {
                overridesLookup = null;
            }
            const planetData = this.allPlanetsData[key] || null;
            const override = overridesLookup ? overridesLookup[key] : null;
            resolved = resolveSectorFromSources(status, override, planetData);
        } else {
            resolved = resolveSectorFromSources(status, status.original);
        }
        const normalized = normalizeSectorLabel(resolved);
        status.sector = normalized;
        return normalized;
    }

    _createEmptyWorldContribution() {
        return {
            storyTerraformed: 0,
            randomTerraformed: 0,
            artificialTerraformed: 0,
            storyOrbitalRings: 0,
            randomOrbitalRings: 0,
            artificialOrbitalRings: 0,
            artificialBonus: 0,
            artificialTerraformValue: 0,
            sector: null,
            sectorUnits: 0,
            randomType: null,
            randomTypeCount: 0,
            randomTypeHazardBonus: 0
        };
    }

    _buildWorldContribution(type, key, status) {
        const contribution = this._createEmptyWorldContribution();
        if (!status) {
            return contribution;
        }

        const terraformed = !!status.terraformed;
        const hasRing = !!status.orbitalRing;

        if (type === 'story') {
            contribution.storyTerraformed = terraformed ? 1 : 0;
            contribution.storyOrbitalRings = hasRing ? 1 : 0;
            if (terraformed) {
                contribution.sector = this._resolveStatusSector(type, key, status);
                contribution.sectorUnits = 1 + (hasRing ? 1 : 0);
            }
            return contribution;
        }

        if (type === 'random') {
            contribution.randomTerraformed = terraformed ? 1 : 0;
            contribution.randomOrbitalRings = hasRing ? 1 : 0;
            if (terraformed) {
                contribution.sector = this._resolveStatusSector(type, key, status);
                contribution.sectorUnits = 1 + (hasRing ? 1 : 0);
                const worldType = this._getRandomWorldType(status);
                if (worldType) {
                    contribution.randomType = worldType;
                    contribution.randomTypeCount = 1;
                    contribution.randomTypeHazardBonus = this._countRandomWorldHazards(status);
                }
            }
            return contribution;
        }

        contribution.artificialTerraformed = terraformed ? 1 : 0;
        contribution.artificialOrbitalRings = hasRing ? 1 : 0;
        if (!terraformed) {
            return contribution;
        }

        const terraformedValue = this._deriveArtificialTerraformValue(status);
        contribution.sector = this._resolveStatusSector(type, key, status);
        status.terraformedValue = terraformedValue;
        if (!Number.isFinite(status.fleetCapacityValue) || status.fleetCapacityValue <= 0) {
            status.fleetCapacityValue = this._deriveArtificialFleetCapacityValue(status);
        }
        contribution.artificialTerraformValue = terraformedValue;
        contribution.artificialBonus = Math.max(0, terraformedValue - 1);
        contribution.sectorUnits = Math.max(0, terraformedValue);
        return contribution;
    }

    _applyWorldContributionDiff(previousContribution, nextContribution) {
        const previous = previousContribution || this._createEmptyWorldContribution();
        const next = nextContribution || this._createEmptyWorldContribution();

        this._adjustCachedNumber('storyTerraformed', next.storyTerraformed - previous.storyTerraformed);
        this._adjustCachedNumber('randomTerraformed', next.randomTerraformed - previous.randomTerraformed);
        this._adjustCachedNumber('artificialTerraformed', next.artificialTerraformed - previous.artificialTerraformed);
        this._adjustCachedNumber('storyOrbitalRings', next.storyOrbitalRings - previous.storyOrbitalRings);
        this._adjustCachedNumber('randomOrbitalRings', next.randomOrbitalRings - previous.randomOrbitalRings);
        this._adjustCachedNumber('artificialOrbitalRings', next.artificialOrbitalRings - previous.artificialOrbitalRings);
        this._adjustCachedNumber('artificialTerraformBonus', next.artificialBonus - previous.artificialBonus);

        if (previous.artificialTerraformValue) {
            this._adjustCachedMapValue('artificialTerraformValueCounts', String(previous.artificialTerraformValue), -1);
        }
        if (next.artificialTerraformValue) {
            this._adjustCachedMapValue('artificialTerraformValueCounts', String(next.artificialTerraformValue), 1);
        }
        if (previous.artificialTerraformValue !== next.artificialTerraformValue) {
            this.worldStatsCache.lastArtificialFleetCap = null;
        }

        if (previous.sector && previous.sectorUnits) {
            this._adjustCachedMapValue('sectorCounts', previous.sector, -previous.sectorUnits);
        }
        if (next.sector && next.sectorUnits) {
            this._adjustCachedMapValue('sectorCounts', next.sector, next.sectorUnits);
        }

        if (previous.randomType && previous.randomTypeCount) {
            this._adjustCachedMapValue('randomTypeCounts', previous.randomType, -previous.randomTypeCount);
        }
        if (next.randomType && next.randomTypeCount) {
            this._adjustCachedMapValue('randomTypeCounts', next.randomType, next.randomTypeCount);
        }
        if (previous.randomType && previous.randomTypeHazardBonus) {
            this._adjustCachedMapValue('randomTypeHazardBonuses', previous.randomType, -previous.randomTypeHazardBonus);
        }
        if (next.randomType && next.randomTypeHazardBonus) {
            this._adjustCachedMapValue('randomTypeHazardBonuses', next.randomType, next.randomTypeHazardBonus);
        }
    }

    _refreshWorldStatsCache() {
        this._resetWorldStatsCache();
        Object.keys(this.planetStatuses).forEach((key) => {
            const contribution = this._buildWorldContribution('story', key, this.planetStatuses[key]);
            this._applyWorldContributionDiff(null, contribution);
        });
        Object.keys(this.randomWorldStatuses).forEach((key) => {
            const contribution = this._buildWorldContribution('random', key, this.randomWorldStatuses[key]);
            this._applyWorldContributionDiff(null, contribution);
        });
        Object.keys(this.artificialWorldStatuses).forEach((key) => {
            const contribution = this._buildWorldContribution('artificial', key, this.artificialWorldStatuses[key]);
            this._applyWorldContributionDiff(null, contribution);
        });
    }

    _updateWorldCacheForStatusMutation(type, key, mutator) {
        const map = this._getWorldStatusMap(type);
        if (!map) {
            return null;
        }
        const resolvedKey = String(key);
        const beforeStatus = map[resolvedKey] || null;
        const beforeContribution = this._buildWorldContribution(type, resolvedKey, beforeStatus);
        mutator(beforeStatus, map, resolvedKey);
        const afterStatus = map[resolvedKey] || null;
        const afterContribution = this._buildWorldContribution(type, resolvedKey, afterStatus);
        this._applyWorldContributionDiff(beforeContribution, afterContribution);
        return afterStatus;
    }

    _setWorldOrbitalRing(type, key, value) {
        this._updateWorldCacheForStatusMutation(type, key, (status) => {
            if (!status) {
                return;
            }
            status.orbitalRing = !!value;
        });
    }

    discardStoredArtificialWorld(key) {
        const resolvedKey = String(key);
        const status = this.artificialWorldStatuses[resolvedKey];
        if (!status || !status.stored) {
            return false;
        }
        if (this.currentArtificialKey !== null && String(this.currentArtificialKey) === resolvedKey) {
            return false;
        }
        this._updateWorldCacheForStatusMutation('artificial', resolvedKey, (_, map, targetKey) => {
            delete map[targetKey];
        });
        return true;
    }

    _getArtificialFleetCapacityCap() {
        const managerFleetCap = artificialManager?.getFleetCapacityWorldCap?.() || 0;
        if (managerFleetCap > 0) {
            return managerFleetCap;
        }
        if (Number.isFinite(ARTIFICIAL_FLEET_CAPACITY_WORLDS) && ARTIFICIAL_FLEET_CAPACITY_WORLDS > 0) {
            return ARTIFICIAL_FLEET_CAPACITY_WORLDS;
        }
        return 5;
    }

    getRandomWorldEffectCounts() {
        const hazardCounts = this._sanitizeNestedCountMap(this.rwgSummary.typeHazardCounts);
        Object.values(this.randomWorldStatuses).forEach((status) => {
            if (!status?.terraformed) {
                return;
            }
            const worldType = this._getRandomWorldType(status);
            if (!worldType) {
                return;
            }
            const hazardKeys = Array.from(this._collectRandomWorldHazardKeys(status));
            if (!hazardKeys.length) {
                return;
            }
            const current = hazardCounts[worldType] || (hazardCounts[worldType] = {});
            hazardKeys.forEach((hazardKey) => {
                current[hazardKey] = (current[hazardKey] || 0) + 1;
            });
        });
        return {
            counts: this._mergeCountMaps(this.worldStatsCache.randomTypeCounts, this.rwgSummary.typeCounts),
            hazardBonuses: this._mergeCountMaps(this.worldStatsCache.randomTypeHazardBonuses, this.rwgSummary.typeHazardBonuses),
            hazardCounts
        };
    }

    getRandomWorldSpecializationCounts() {
        const counts = { ...(this.rwgSummary.specializationCounts || {}) };
        Object.values(this.randomWorldStatuses).forEach((status) => {
            if (!status?.specialization) {
                return;
            }
            counts[status.specialization] = (counts[status.specialization] || 0) + 1;
        });
        return counts;
    }

    getRandomWorldDepartedColonistsTotal() {
        return Math.max(0, this.rwgSummary.departedColonistsTotal || 0);
    }

    getArtificialWorldDepartedColonistsTotal() {
        return Math.max(0, this.artificialSummary.departedColonistsTotal || 0);
    }

    getArtificialWorldSpecializationCounts() {
        const counts = { ...(this.artificialSummary.specializationCounts || {}) };
        Object.values(this.artificialWorldStatuses).forEach((status) => {
            if (!status?.specialization || !status.terraformed) {
                return;
            }
            counts[status.specialization] = (counts[status.specialization] || 0) + 1;
        });
        return counts;
    }

    getWorldCountPerSector(sectorLabel) {
        const target = normalizeSectorLabel(sectorLabel);
        return (this.worldStatsCache.sectorCounts[target] || 0)
            + (this.rwgSummary.sectorUnits[target] || 0)
            + (this.artificialSummary.sectorUnits[target] || 0);
    }

    currentWorldHasOrbitalRing() {
        if (this.currentRandomSeed !== null) {
            return !!this.randomWorldStatuses[String(this.currentRandomSeed)]?.orbitalRing;
        }
        if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            if (this.artificialWorldStatuses[key]?.orbitalRing) {
                this._setWorldOrbitalRing('artificial', key, false);
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
                this._setWorldOrbitalRing('artificial', key, false);
            }
        } else {
            this.setStoryWorldHasOrbitalRing(this.currentPlanetKey, value);
        }
    }

    setStoryWorldHasOrbitalRing(planetKey, value) {
        this._setWorldOrbitalRing('story', planetKey, value);
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

    resetRandomWorldStatus(seed) {
        const key = String(seed);
        this._updateWorldCacheForStatusMutation('random', key, (status, map, resolvedKey) => {
            if (!status) {
                return;
            }
            delete map[resolvedKey];
        });
        if (followersManager && followersManager.resetConsecrationForSeed) {
            followersManager.resetConsecrationForSeed(key);
        }
        this._refreshFoundryWorldBonusCache();
    }

    setRandomWorldHasOrbitalRing(seed, value) {
        this._ensureRandomWorldStatus(seed);
        this._setWorldOrbitalRing('random', seed, value);
    }

    isCurrentWorldTerraformed() {
        if (this.currentRandomSeed !== null) {
            return this.isSeedTerraformed(String(this.currentRandomSeed));
        }
        if (this.currentArtificialKey !== null) {
            return !!this.artificialWorldStatuses[String(this.currentArtificialKey)]?.terraformed;
        }
        return this.isPlanetTerraformed(this.currentPlanetKey);
    }

    countOrbitalRings() {
        return (this.worldStatsCache.storyOrbitalRings || 0) + this._getTotalRandomOrbitalRingCount();
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
                    this._setWorldOrbitalRing(type, key, false);
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
            if (!!entry.status.orbitalRing !== shouldAssign) {
                this._setWorldOrbitalRing(entry.type, entry.key, shouldAssign);
            }
            if (shouldAssign) {
                assigned += 1;
            }
        });

        const forgottenAssigned = this._setForgottenOrbitalRingCount(normalizedTotal - assigned);
        return assigned + forgottenAssigned;
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
            total += this.worldStatsCache.storyTerraformed || 0;
        }
        if (countRandom) {
            total += this._getTotalRandomTerraformedCount();
        }
        if (countArtificial) {
            total += this._getTotalArtificialTerraformedCount();
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
        const maxFleetValue = this._getArtificialFleetCapacityCap();
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
        let count = this.rwgSummary.foundryWorldCount || 0;
        let bonus = this.rwgSummary.foundryWorldBonus || 0;
        count += this.artificialSummary.foundryWorldCount || 0;
        bonus += this.artificialSummary.foundryWorldBonus || 0;
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
        const base = (this.worldStatsCache.storyTerraformed || 0)
            + this._getTotalRandomTerraformedCount()
            + this._getTotalArtificialTerraformedCount();
        const rings = (typeof projectManager !== 'undefined' && projectManager.projects && projectManager.projects.orbitalRing)
            ? projectManager.projects.orbitalRing.ringCount
            : 0;
        const extra = typeof this.extraTerraformedWorlds === 'number' ? this.extraTerraformedWorlds : 0;
        const sectorWorlds = (typeof galaxyManager !== 'undefined' && galaxyManager?.getControlledSectorWorldCount)
            ? galaxyManager.getControlledSectorWorldCount()
            : 0;
        const sectorBonus = Number.isFinite(sectorWorlds) ? Math.max(0, sectorWorlds) : 0;
        const artificialBonus = this._getTotalArtificialTerraformBonus();
        const cylinders = this.getOneillCylinderCount();
        return base + rings + extra + sectorBonus + artificialBonus + cylinders;
    }

    getArtificialFleetCapacityWorlds() {
        const cap = this._getArtificialFleetCapacityCap();
        if (this.worldStatsCache.lastArtificialFleetCap === cap) {
            return this.worldStatsCache.artificialFleetCapacityWorlds || 0;
        }
        let total = 0;
        const counts = this._mergeCountMaps(
            this.worldStatsCache.artificialTerraformValueCounts,
            this.artificialSummary.terraformValueCounts
        );
        Object.keys(counts).forEach((valueKey) => {
            const count = counts[valueKey];
            const terraformedValue = Number(valueKey);
            if (!count || !Number.isFinite(terraformedValue) || terraformedValue <= 0) {
                return;
            }
            total += Math.min(cap, terraformedValue) * count;
        });
        this.worldStatsCache.artificialFleetCapacityWorlds = total;
        this.worldStatsCache.lastArtificialFleetCap = cap;
        return total;
    }

    getArtificialFleetCapacityWorldsForSector(sectorLabel) {
        const target = normalizeSectorLabel(sectorLabel);
        const cap = this._getArtificialFleetCapacityCap();
        let total = 0;
        Object.values(this.artificialWorldStatuses).forEach((status) => {
            if (!status?.terraformed || normalizeSectorLabel(status.sector) !== target) {
                return;
            }
            total += Math.min(cap, this._deriveArtificialTerraformValue(status));
        });
        const counts = this.artificialSummary.sectorTerraformValueCounts[target] || {};
        Object.keys(counts).forEach((valueKey) => {
            const count = counts[valueKey];
            const terraformedValue = Number(valueKey);
            if (!count || !Number.isFinite(terraformedValue) || terraformedValue <= 0) {
                return;
            }
            total += Math.min(cap, terraformedValue) * count;
        });
        return total;
    }

    getFleetCapacityWorldCount() {
        const base = (this.worldStatsCache.storyTerraformed || 0) + this._getTotalRandomTerraformedCount();
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
        if (this.currentRandomSeed !== null) {
            if (this.isSeedTerraformed(String(this.currentRandomSeed))) {
                count--;
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

    getCurrentWorldStatus() {
        if (this.currentRandomSeed !== null) {
            return this.randomWorldStatuses[String(this.currentRandomSeed)] || null;
        }
        if (this.currentArtificialKey !== null) {
            return this.artificialWorldStatuses[String(this.currentArtificialKey)] || null;
        }
        return this.planetStatuses[this.currentPlanetKey] || null;
    }

    applyWorldStatusToPlanetParameters(params, worldKey = null) {
        if (!params || !params.celestialParameters) {
            return params;
        }

        const resolvedKey = worldKey == null ? this.currentPlanetKey : String(worldKey);
        const status = this.getPlanetStatus(resolvedKey);
        if (status?.naturalMagnetosphere === true) {
            params.celestialParameters.hasNaturalMagnetosphere = true;
        }
        return params;
    }

    setCurrentWorldNaturalMagnetosphere(value = true) {
        const status = this.getCurrentWorldStatus();
        if (!status) {
            return false;
        }

        status.naturalMagnetosphere = value === true;
        const natural = status.naturalMagnetosphere;
        if (status.original?.merged?.celestialParameters) {
            status.original.merged.celestialParameters.hasNaturalMagnetosphere = natural;
        }
        if (status.artificialSnapshot?.celestialParameters) {
            status.artificialSnapshot.celestialParameters.hasNaturalMagnetosphere = natural;
        }
        return true;
    }

    getCurrentWorldHazardCount() {
        const hazards = currentPlanetParameters.hazards || {};
        return Object.keys(hazards).reduce((count, key) => (
            key && key !== 'none' ? count + 1 : count
        ), 0);
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
        const zones = getZones();
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
            this._updateWorldCacheForStatusMutation('random', seed, (status, map, key) => {
                let target = status;
                if (!target) {
                    const original = this.getCurrentWorldOriginal();
                    target = {
                        name: this.currentRandomName,
                        terraformed: false,
                        colonists: 0,
                        original,
                        visited: true,
                        orbitalRing: false,
                        sector: resolveSectorFromSources(original)
                    };
                    map[key] = target;
                }
                if (target.terraformed !== isComplete) {
                    target.terraformed = isComplete;
                    console.log(`SpaceManager: Terraformed status for seed ${seed} updated to ${isComplete}`);
                }
            });
            return;
        }
        if (this.currentArtificialKey !== null) {
            const key = String(this.currentArtificialKey);
            this._updateWorldCacheForStatusMutation('artificial', key, (status, map, resolvedKey) => {
                let target = status;
                if (!target) {
                    const original = this.getCurrentWorldOriginal();
                    const terraformedValue = this._deriveArtificialTerraformValue({
                        landHa: this._getCurrentWorldLandHa(),
                        original
                    });
                    target = {
                        name: this.currentRandomName || `Artificial ${resolvedKey}`,
                        terraformed: false,
                        colonists: 0,
                        original,
                        visited: true,
                        orbitalRing: false,
                        abandoned: false,
                        stored: false,
                        departedAt: null,
                        ecumenopolisPercent: 0,
                        terraformedValue,
                        fleetCapacityValue: this._deriveArtificialFleetCapacityValue({ terraformedValue }),
                        sector: resolveSectorFromSources(original)
                    };
                    map[resolvedKey] = target;
                } else if (!target.terraformedValue) {
                    target.terraformedValue = this._deriveArtificialTerraformValue({
                        landHa: this._getCurrentWorldLandHa(),
                        original: this.getCurrentWorldOriginal(),
                        terraformedValue: target.terraformedValue
                    });
                }

                if (!Number.isFinite(target.fleetCapacityValue) || target.fleetCapacityValue <= 0) {
                    target.fleetCapacityValue = this._deriveArtificialFleetCapacityValue(target);
                }
                if (target.terraformed !== isComplete) {
                    target.terraformed = isComplete;
                    console.log(`SpaceManager: Terraformed status for artificial world ${resolvedKey} updated to ${isComplete}`);
                }
                if (isComplete) {
                    target.abandoned = false;
                    target.stored = false;
                }
            });
            return;
        }
        if (!this.planetStatuses[this.currentPlanetKey]) {
            console.error(`SpaceManager: Cannot update terraformed status for unknown current planet key: ${this.currentPlanetKey}`);
            return;
        }
        this._updateWorldCacheForStatusMutation('story', this.currentPlanetKey, (status) => {
            if (status.terraformed !== isComplete) {
                status.terraformed = isComplete;
                console.log(`SpaceManager: Terraformed status for ${this.currentPlanetKey} updated to ${isComplete}`);
            }
        });
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
                  this.planetStatuses[key] = {
                      terraformed: false,
                      visited: false,
                      enabled: false,
                      colonists: 0,
                      orbitalRing: false,
                      departedAt: null,
                      ecumenopolisPercent: 0,
                      foundryWorld: false,
                      foundryLandFactor: 0,
                      specialization: '',
                      naturalMagnetosphere: false,
                      rwgLock: false
                  };
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
        if (followersManager && followersManager.onTravelDeparture) {
            followersManager.onTravelDeparture(pop);
        }
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
                    naturalMagnetosphere: false,
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
            const landHa = this._getCurrentWorldLandHa();
            if (!this.artificialWorldStatuses[key]) {
                const terraformedValue = this._deriveArtificialTerraformValue({
                    landHa,
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
                    abandoned: false,
                    stored: false,
                    foundryWorld: false,
                    foundryLandFactor: 0,
                    naturalMagnetosphere: false,
                    specialization: '',
                    artificial: true,
                    landHa,
                    cachedLandHa: landHa,
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
            st.stored = false;
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
            st.landHa = landHa;
            st.cachedLandHa = landHa;
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
        this._compactRandomWorldStatuses();
        this._compactArtificialWorldStatuses();
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
            this.applyWorldStatusToPlanetParameters(params, options?.planetKey);
            currentPlanetParameters = JSON.parse(JSON.stringify(params));
        }
        initializeGameState({ preserveManagers: true, preserveJournal: true });
    }

    travelToStoryPlanet(targetKey) {
        if (!targetKey) {
            console.warn('SpaceManager: No planet key provided for travel.');
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
        this._compactRandomWorldStatuses();
        this._compactArtificialWorldStatuses();
        const params = getPlanetParameters(targetKey);
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
        const replayAllowed = !!res?.allowReplay;
        if (!isArtificial) {
            if (this.isSeedTerraformed(s) && !replayAllowed) {
                console.warn(`SpaceManager: Seed ${s} already terraformed.`);
                return false;
            }
        }

        const departingTerraformed = this._isCurrentWorldTerraformed();

        const existing = isArtificial ? this.artificialWorldStatuses[s] : this.randomWorldStatuses[s];
        const revisitingRandomSeed = !isArtificial && !!existing?.visited;
        let travelResult = res;
        if (revisitingRandomSeed) {
            if (typeof generateRandomPlanet !== 'function') {
                console.warn(`SpaceManager: Cannot regenerate seed ${s} for replay.`);
                return false;
            }
            try {
                const regenerated = generateRandomPlanet(s);
                if (!regenerated || !regenerated.merged) {
                    console.warn(`SpaceManager: Failed to regenerate seed ${s} for replay.`);
                    return false;
                }
                travelResult = regenerated;
            } catch (error) {
                console.warn(`SpaceManager: Failed to regenerate seed ${s} for replay.`);
                return false;
            }
        }
        const originalSnapshot = cloneSpaceWorldData(travelResult);
        const firstVisit = !existing?.visited;
        const destinationTerraformed = existing?.terraformed || false;
        const artificialWorld = isArtificial || existing?.artificial;

        // prepareForTravel is now called within recordDepartureSnapshot
        this.recordDepartureSnapshot();
        if (revisitingRandomSeed) {
            this.resetRandomWorldStatus(s);
        }

        this.currentRandomSeed = isArtificial ? null : s;
        this.currentArtificialKey = isArtificial ? s : null;
        this.currentPlanetKey = s;
        this.currentRandomName = travelResult?.merged?.name || (isArtificial ? `Artificial ${s}` : `Seed ${s}`);
        const terraformedValue = isArtificial
            ? this._deriveArtificialTerraformValue({
                terraformedValue: travelResult?.terraformedValue,
                landHa: getLandFromParams(travelResult?.merged),
                original: travelResult
            })
            : 1;
        const landHa = isArtificial ? getLandFromParams(travelResult?.merged) : 0;
        const sector = resolveSectorFromSources(travelResult);
        const targetType = isArtificial ? 'artificial' : 'random';
        this._updateWorldCacheForStatusMutation(targetType, s, (status, map, key) => {
            if (!status) {
                const cachedArchetype = travelResult?.archetype
                    || travelResult?.classification?.archetype
                    || travelResult?.original?.archetype
                    || travelResult?.original?.classification?.archetype
                    || travelResult?.merged?.classification?.archetype
                    || travelResult?.original?.merged?.classification?.archetype
                    || null;
                map[key] = {
                    name: this.currentRandomName,
                    terraformed: false,
                    colonists: 0,
                    original: originalSnapshot,
                    visited: true,
                    orbitalRing: false,
                    abandoned: false,
                    stored: false,
                    departedAt: null,
                    ecumenopolisPercent: 0,
                    naturalMagnetosphere: false,
                    artificial: artificialWorld,
                    cachedArchetype,
                    terraformedValue,
                    landHa,
                    cachedLandHa: landHa,
                    sector
                };
                return;
            }
            if (revisitingRandomSeed) {
                status.original = originalSnapshot;
            } else {
                status.original = status.original || originalSnapshot;
            }
            status.artificial = status.artificial || artificialWorld;
            status.visited = true;
            if (isArtificial) {
                status.stored = false;
                status.abandoned = false;
            }
            if (isArtificial && !status.terraformedValue) {
                status.terraformedValue = terraformedValue;
            }
            if (isArtificial && landHa > 0) {
                status.landHa = landHa;
                status.cachedLandHa = landHa;
            }
            if (!status.name) {
                status.name = this.currentRandomName;
            }
            if (!status.sector) {
                status.sector = sector;
            }
            if (!status.cachedArchetype) {
                status.cachedArchetype = this._getRandomWorldType(status);
            }
            status.cachedHazardCount = null;
        });

        this._compactRandomWorldStatuses();
        this._compactArtificialWorldStatuses();
        this._applyTravelRewards(firstVisit, departingTerraformed, destinationTerraformed);
        const latest = isArtificial ? this.artificialWorldStatuses[s] : this.randomWorldStatuses[s];
        const mergedParams = travelResult?.merged || latest?.original?.merged || null;
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
        const pruneArtificialStatuses = (statuses, activeKey) => Object.fromEntries(
            Object.entries(statuses).map(([key, status]) => {
                if (!status || key === activeKey || status.stored || status.abandoned) {
                    return [key, status];
                }
                if (!this._isPrunableArtificialWorldStatus(key, status, activeKey)) {
                    return [key, status];
                }
                const copy = { ...status };
                this._prepareCompactableArtificialStatus(copy);
                this._stripCompactableArtificialStatus(copy);
                return [key, copy];
            })
        );

        return {
            currentPlanetKey: this.currentPlanetKey,
            planetStatuses: this.planetStatuses,
            currentRandomSeed: this.currentRandomSeed,
            currentRandomName: this.currentRandomName,
            currentArtificialKey: this.currentArtificialKey,
            artificialWorldStatuses: pruneArtificialStatuses(this.artificialWorldStatuses, activeArtificialKey),
            artificialSummary: this._sanitizeArtificialSummary(this.artificialSummary),
            randomWorldStatuses: pruneStatuses(this.randomWorldStatuses, activeRandomKey),
            rwgSummary: this._sanitizeRwgSummary(this.rwgSummary),
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
        this.rwgSummary = this._createEmptyRwgSummary();
        this.artificialWorldStatuses = {};
        this.artificialSummary = this._createEmptyArtificialSummary();
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
            status.cachedHazardCount = null;
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
                    if (saved.naturalMagnetosphere === true || saved.naturalMagnetosphere === false) {
                        this.planetStatuses[planetKey].naturalMagnetosphere = saved.naturalMagnetosphere;
                    }
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
                entry.naturalMagnetosphere = entry.naturalMagnetosphere === true;
                assignSector(entry);
                sanitizeCachedHazards(entry);
            });
        }

        this.artificialSummary = this._sanitizeArtificialSummary(savedData.artificialSummary);

        if (savedData.randomWorldStatuses) {
            this.randomWorldStatuses = savedData.randomWorldStatuses;
            Object.values(this.randomWorldStatuses)
                .filter(Boolean)
                .forEach((entry) => {
                    entry.foundryLandFactor = entry.foundryLandFactor || 0;
                    entry.naturalMagnetosphere = entry.naturalMagnetosphere === true;
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
                status.cachedHazardCount = null;
                if (!status.hazard || status.hazard === 'none') {
                    status.hazard = hazardList.length === 1 ? hazardList[0] : hazardList.slice();
                }
            });
        }

        this.rwgSummary = this._sanitizeRwgSummary(savedData.rwgSummary);

        Object.keys(this.planetStatuses).forEach((planetKey) => {
            this._syncFoundryLandFactor(this.planetStatuses[planetKey], planetKey);
        });
        Object.keys(this.randomWorldStatuses).forEach((key) => {
            this._syncFoundryLandFactor(this.randomWorldStatuses[key], key);
        });
        Object.keys(this.artificialWorldStatuses).forEach((key) => {
            this._syncFoundryLandFactor(this.artificialWorldStatuses[key], key);
        });
        this._compactRandomWorldStatuses();
        this._compactArtificialWorldStatuses();
        this._refreshWorldStatsCache();
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
