let GalaxySectorClass;
let GalaxyFactionClass;
let galaxyFactionParametersConfig;
let galaxySectorControlOverridesConfig;
const defaultUpdateFactions = () => {};
let updateFactionsFunction = defaultUpdateFactions;
const DEFAULT_UHF_FACTION_ID = 'uhf';
let galaxyUhfId = DEFAULT_UHF_FACTION_ID;

if (typeof module !== 'undefined' && module.exports) {
    ({ GalaxySector: GalaxySectorClass } = require('./sector'));
    ({ GalaxyFaction: GalaxyFactionClass, updateFactions: updateFactionsFunction, UHF_FACTION_ID: galaxyUhfId } = require('./faction'));
    ({
        galaxyFactionParameters: galaxyFactionParametersConfig,
        galaxySectorControlOverrides: galaxySectorControlOverridesConfig
    } = require('./factions-parameters'));
} else if (typeof window !== 'undefined') {
    GalaxySectorClass = window.GalaxySector;
    GalaxyFactionClass = window.GalaxyFaction;
    galaxyFactionParametersConfig = window.galaxyFactionParameters;
    galaxySectorControlOverridesConfig = window.galaxySectorControlOverrides;
    if (typeof window.updateFactions === 'function') {
        updateFactionsFunction = window.updateFactions;
    }
    if (typeof window.UHF_FACTION_ID === 'string') {
        galaxyUhfId = window.UHF_FACTION_ID;
    }
}

if ((!GalaxySectorClass || !GalaxyFactionClass || !Array.isArray(galaxyFactionParametersConfig)) && typeof globalThis !== 'undefined') {
    if (!GalaxySectorClass && globalThis.GalaxySector) {
        GalaxySectorClass = globalThis.GalaxySector;
    }
    if (!GalaxyFactionClass && globalThis.GalaxyFaction) {
        GalaxyFactionClass = globalThis.GalaxyFaction;
    }
    if ((!galaxyFactionParametersConfig || !Array.isArray(galaxyFactionParametersConfig)) && globalThis.galaxyFactionParameters) {
        galaxyFactionParametersConfig = globalThis.galaxyFactionParameters;
    }
    if (!galaxySectorControlOverridesConfig && globalThis.galaxySectorControlOverrides) {
        galaxySectorControlOverridesConfig = globalThis.galaxySectorControlOverrides;
    }
    if (typeof updateFactionsFunction !== 'function' && typeof globalThis.updateFactions === 'function') {
        updateFactionsFunction = globalThis.updateFactions;
    }
    if (typeof globalThis.UHF_FACTION_ID === 'string') {
        galaxyUhfId = globalThis.UHF_FACTION_ID;
    }
}

if ((!GalaxySectorClass || !GalaxyFactionClass || !Array.isArray(galaxyFactionParametersConfig)) && typeof require === 'function') {
    try {
        if (!GalaxySectorClass) {
            ({ GalaxySector: GalaxySectorClass } = require('./sector'));
        }
        if (!GalaxyFactionClass || updateFactionsFunction === defaultUpdateFactions) {
            ({ GalaxyFaction: GalaxyFactionClass, updateFactions: updateFactionsFunction, UHF_FACTION_ID: galaxyUhfId } = require('./faction'));
        }
        if (!Array.isArray(galaxyFactionParametersConfig)) {
            ({
                galaxyFactionParameters: galaxyFactionParametersConfig,
                galaxySectorControlOverrides: galaxySectorControlOverridesConfig
            } = require('./factions-parameters'));
        }
    } catch (error) {
        // Ignore resolution errors in browser contexts.
    }
}

if (typeof updateFactionsFunction !== 'function') {
    updateFactionsFunction = defaultUpdateFactions;
}

if (typeof galaxyUhfId !== 'string' || !galaxyUhfId) {
    galaxyUhfId = DEFAULT_UHF_FACTION_ID;
}

if (!Array.isArray(galaxyFactionParametersConfig)) {
    galaxyFactionParametersConfig = [];
}
galaxySectorControlOverridesConfig = galaxySectorControlOverridesConfig || {};

const GALAXY_RADIUS = 6;
const GALAXY_OPERATION_DURATION_MS = 10000;
const HEX_NEIGHBOR_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];
const FULL_CONTROL_EPSILON = 1e-6;
const FLEET_UPGRADE_INCREMENT = 0.1;
const GALAXY_FLEET_UPGRADE_DEFINITIONS = {
    militaryResearch: {
        key: 'militaryResearch',
        label: 'Military R&D',
        description: 'Channel advanced research into hangar expansions that squeeze in additional wings.',
        baseCost: 100000,
        costType: 'resource',
        resourceCategory: 'colony',
        resourceId: 'advancedResearch',
        costLabel: 'Advanced Research'
    },
    micOutsource: {
        key: 'micOutsource',
        label: 'MIC Outsourcing',
        description: 'Cut Solis a check so they can subcontract extra yards for the fleet.',
        baseCost: 1000,
        costType: 'solis',
        costLabel: 'Solis Points'
    },
    enemyLessons: {
        key: 'enemyLessons',
        label: 'Reverse Engineering',
        description: 'Reverse-engineer alien tactics and fold their tricks into UHF logistics.',
        baseCost: 100,
        costType: 'artifact',
        costLabel: 'Alien Artifacts'
    },
    pandoraBox: {
        key: 'pandoraBox',
        label: "PANDORA'S Box",
        description: 'Spend a skill point to greenlight unconventional fleet experiments.',
        baseCost: 1,
        costType: 'skill',
        costLabel: 'Skill Points'
    }
};
const GALAXY_FLEET_UPGRADE_KEYS = Object.keys(GALAXY_FLEET_UPGRADE_DEFINITIONS);

function generateSectorCoordinates(radius) {
    const coordinates = [];
    for (let q = -radius; q <= radius; q += 1) {
        const rMin = Math.max(-radius, -q - radius);
        const rMax = Math.min(radius, -q + radius);
        for (let r = rMin; r <= rMax; r += 1) {
            coordinates.push({ q, r });
        }
    }
    return coordinates;
}

class GalaxyManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages the galactic view.' });
        this.enabled = false;
        this.initialized = false;
        this.radius = GALAXY_RADIUS;
        this.factions = new Map();
        this.sectors = new Map();
        this.operations = new Map();
        this.fleetUpgradePurchases = {};
        GALAXY_FLEET_UPGRADE_KEYS.forEach((key) => {
            this.fleetUpgradePurchases[key] = 0;
        });
        this.successfulOperations = 0;
    }

    initialize() {
        if (this.initialized) {
            this.refreshUIVisibility();
            return;
        }
        this.initialized = true;
        this.#initializeSectors();
        this.#initializeFactions();
        this.#applyFactionStartingControl();
        this.#initializeFactionFleets();
        this.refreshUIVisibility();
    }

    update(deltaMs) {
        updateFactionsFunction.call(this, deltaMs);
        this.#updateOperations(deltaMs);
    }

    enable(targetId, { autoSwitch = true } = {}) {
        if (targetId && targetId !== 'space-galaxy' && targetId !== 'galaxy') {
            return;
        }
        this.enabled = true;
        this.refreshUIVisibility();
    }

    refreshUIVisibility() {
        if (this.enabled) {
            if (typeof showSpaceGalaxyTab === 'function') {
                showSpaceGalaxyTab();
            }
            if (typeof initializeGalaxyUI === 'function') {
                initializeGalaxyUI();
            }
            if (typeof updateGalaxyUI === 'function') {
                updateGalaxyUI();
            }
        } else if (typeof hideSpaceGalaxyTab === 'function') {
            hideSpaceGalaxyTab();
        }
    }

    applyEffect(effect) {
        if (!effect) {
            return;
        }
        if (effect.type === 'unlockGalaxy') {
            const autoSwitch = effect.autoSwitch !== false;
            this.enable(effect.targetId || 'space-galaxy', { autoSwitch });
            return;
        }
        if (effect.type === 'enable') {
            this.enable(effect.targetId, { autoSwitch: effect.autoSwitch !== false });
            return;
        }
        super.applyEffect(effect);
    }

    saveState() {
        const sectors = Array.from(this.sectors.values()).map((sector) => sector.toJSON());
        const operations = Array.from(this.operations.values()).map((operation) => this.#serializeOperation(operation));
        return {
            enabled: this.enabled,
            sectors,
            factions: this.getFactions().map((faction) => faction.toJSON()),
            operations,
            fleetUpgrades: this.#serializeFleetUpgrades(),
            successfulOperations: this.successfulOperations
        };
    }

    loadState(state) {
        this.initialize();
        if (state && typeof state.enabled === 'boolean') {
            this.enabled = state.enabled;
        }
        if (state && Array.isArray(state.sectors)) {
            this.#applyFactionStartingControl();
            state.sectors.forEach((sectorData) => {
                const sector = this.getSector(sectorData.q, sectorData.r);
                if (!sector) {
                    return;
                }
                this.#applyControlMapToSector(sector, sectorData.control);
                if (Number.isFinite(sectorData?.value)) {
                    sector.setValue(sectorData.value);
                }
            });
        }
        const factionStateMap = new Map();
        if (state && Array.isArray(state.factions)) {
            state.factions.forEach((entry) => {
                if (!entry || !entry.id) {
                    return;
                }
                factionStateMap.set(entry.id, entry);
            });
        }
        this.#initializeFactionFleets();
        this.factions.forEach((faction) => {
            const factionState = factionStateMap.get(faction.id);
            if (factionState) {
                faction.loadState(factionState, this);
            }
        });
        this.operations.clear();
        if (state && Array.isArray(state.operations)) {
            state.operations.forEach((operationState) => {
                this.#restoreOperation(operationState);
            });
        }
        if (state && Array.isArray(state.fleetUpgrades)) {
            this.#loadFleetUpgrades(state.fleetUpgrades);
        }
        if (state && Number.isFinite(state.successfulOperations)) {
            this.successfulOperations = Math.max(0, state.successfulOperations);
        }
        this.factions.forEach((faction) => {
            faction.updateFleetCapacity(this);
        });
        this.refreshUIVisibility();
    }

    resetGalaxy() {
        this.initialized = false;
        this.radius = GALAXY_RADIUS;
        this.factions.clear();
        this.sectors.clear();
        this.operations.clear();
        this.initialize();
        this.enable();
    }

    getSector(q, r) {
        return this.sectors.get(GalaxySectorClass.createKey(q, r)) || null;
    }

    getSectors() {
        return Array.from(this.sectors.values());
    }

    getSectorController(q, r) {
        const sector = this.getSector(q, r);
        if (!sector) {
            return null;
        }
        const dominant = sector.getDominantController();
        if (!dominant) {
            return null;
        }
        const faction = this.factions.get(dominant.factionId);
        if (!faction) {
            return null;
        }
        return { faction, strength: dominant.value };
    }

    getFaction(id) {
        return this.factions.get(id) || null;
    }

    getFactions() {
        return Array.from(this.factions.values());
    }

    getOperationForSector(sectorKey) {
        if (!sectorKey) {
            return null;
        }
        return this.operations.get(sectorKey) || null;
    }

    getSectorDefensePower(sectorKey, attackerId) {
        if (!sectorKey) {
            return 0;
        }
        const sector = this.sectors.get(sectorKey);
        if (!sector) {
            return 0;
        }
        return this.#computeDefensePower(sector, attackerId);
    }

    getOperationSuccessChance({ sectorKey, factionId, assignedPower }) {
        if (!sectorKey) {
            return 0;
        }
        const sector = this.sectors.get(sectorKey);
        if (!sector) {
            return 0;
        }
        const offensePower = Number(assignedPower);
        if (!Number.isFinite(offensePower) || offensePower <= 0) {
            return 0;
        }
        const defensePower = this.#computeDefensePower(sector, factionId);
        return this.#calculateSuccessChance(offensePower, defensePower);
    }

    startOperation({ sectorKey, factionId, assignedPower, durationMs, successChance }) {
        if (!sectorKey || !Number.isFinite(assignedPower) || assignedPower <= 0) {
            return null;
        }
        const key = sectorKey;
        const sector = this.sectors.get(key);
        if (!sector) {
            return null;
        }
        const existing = this.operations.get(key);
        if (existing && existing.status === 'running') {
            return existing;
        }
        const attackerId = factionId || galaxyUhfId;
        const hasStronghold = this.#hasNeighboringStronghold(sector, attackerId);
        const hasPresence = this.#hasFactionPresence(sector, attackerId);
        if (!hasStronghold && !hasPresence) {
            return null;
        }
        const faction = this.getFaction(attackerId);
        if (!faction) {
            return null;
        }
        const availablePower = Math.max(0, faction.fleetPower);
        if (assignedPower > availablePower) {
            return null;
        }
        const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : GALAXY_OPERATION_DURATION_MS;
        const offensePower = Math.max(0, assignedPower);
        const defensePower = this.#computeDefensePower(sector, attackerId);
        const sanitizedSuccess = this.#calculateSuccessChance(offensePower, defensePower);
        const operation = {
            sectorKey: key,
            factionId: attackerId,
            assignedPower: offensePower,
            reservedPower: offensePower,
            durationMs: duration,
            elapsedMs: 0,
            successChance: sanitizedSuccess,
            failureChance: Math.max(0, Math.min(1, 1 - sanitizedSuccess)),
            defensePower,
            offensePower,
            status: 'running'
        };
        faction.setFleetPower(availablePower - offensePower);
        this.operations.set(key, operation);
        return operation;
    }

    getTerraformedWorldCount() {
        return spaceManager?.getTerraformedPlanetCount?.() ?? 0;
    }

    getTerraformedWorldCountForSector(sector) {
        const label = sector?.getDisplayName?.();
        if (!label) {
            return 0;
        }
        const count = spaceManager?.getWorldCountPerSector?.(label);
        if (!Number.isFinite(count) || count <= 0) {
            return 0;
        }
        return count;
    }

    getFleetUpgradeCount(key) {
        const count = this.fleetUpgradePurchases[key];
        if (!Number.isFinite(count) || count <= 0) {
            return 0;
        }
        return count;
    }

    getFleetUpgradeMultiplier(key) {
        const base = 1 + (this.getFleetUpgradeCount(key) * FLEET_UPGRADE_INCREMENT);
        return base > 0 ? base : 1;
    }

    getFleetCapacityMultiplier() {
        return GALAXY_FLEET_UPGRADE_KEYS.reduce((total, key) => total * this.getFleetUpgradeMultiplier(key), 1);
    }

    getFleetUpgradeCost(key) {
        const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[key];
        if (!definition) {
            return 0;
        }
        const count = this.getFleetUpgradeCount(key);
        const nextIndex = count + 1;
        return definition.baseCost * nextIndex;
    }

    canPurchaseFleetUpgrade(key) {
        const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[key];
        if (!definition) {
            return false;
        }
        const cost = this.getFleetUpgradeCost(key);
        if (!(cost > 0)) {
            return false;
        }
        if (definition.costType === 'resource') {
            const resource = resources?.[definition.resourceCategory]?.[definition.resourceId];
            return !!resource && resource.value >= cost;
        }
        if (definition.costType === 'solis') {
            return !!solisManager && solisManager.solisPoints >= cost;
        }
        if (definition.costType === 'artifact') {
            const artifactResource = resources?.special?.alienArtifact;
            return !!artifactResource && artifactResource.value >= cost;
        }
        if (definition.costType === 'skill') {
            return !!skillManager && skillManager.skillPoints >= cost;
        }
        return false;
    }

    purchaseFleetUpgrade(key) {
        const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[key];
        if (!definition) {
            return false;
        }
        if (!this.canPurchaseFleetUpgrade(key)) {
            return false;
        }
        const cost = this.getFleetUpgradeCost(key);
        if (!(cost > 0)) {
            return false;
        }
        if (definition.costType === 'resource') {
            const resource = resources?.[definition.resourceCategory]?.[definition.resourceId];
            if (!resource) {
                return false;
            }
            resource.decrease(cost);
        } else if (definition.costType === 'solis') {
            solisManager.solisPoints -= cost;
        } else if (definition.costType === 'artifact') {
            const artifactResource = resources?.special?.alienArtifact;
            if (!artifactResource) {
                return false;
            }
            artifactResource.decrease(cost);
        } else if (definition.costType === 'skill') {
            skillManager.skillPoints -= cost;
        } else {
            return false;
        }
        const nextCount = this.getFleetUpgradeCount(key) + 1;
        this.fleetUpgradePurchases[key] = nextCount;
        const faction = this.getFaction(galaxyUhfId);
        if (faction) {
            faction.updateFleetCapacity(this);
        }
        return true;
    }

    getFleetUpgradeSummaries() {
        return GALAXY_FLEET_UPGRADE_KEYS.map((key) => {
            const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[key];
            const purchases = this.getFleetUpgradeCount(key);
            const multiplier = this.getFleetUpgradeMultiplier(key);
            const cost = this.getFleetUpgradeCost(key);
            return {
                key,
                label: definition.label,
                description: definition.description,
                purchases,
                multiplier,
                cost,
                costLabel: definition.costLabel,
                affordable: this.canPurchaseFleetUpgrade(key)
            };
        });
    }

    getUhfControlRatio() {
        const sectors = this.getSectors();
        const total = sectors.length;
        if (total === 0) {
            return 0;
        }
        let controlled = 0;
        sectors.forEach((sector) => {
            const dominant = sector?.getDominantController?.();
            if (!dominant || dominant.factionId !== galaxyUhfId) {
                return;
            }
            controlled += 1;
        });
        return controlled / total;
    }

    getSuccessfulOperations() {
        return this.successfulOperations;
    }

    hasNeighboringStronghold(factionId, q, r) {
        if (!factionId || !Number.isFinite(q) || !Number.isFinite(r)) {
            return false;
        }
        const sector = this.getSector(q, r);
        if (!sector) {
            return false;
        }
        return this.#hasNeighboringStronghold(sector, factionId);
    }

    hasUhfNeighboringStronghold(q, r) {
        return this.hasNeighboringStronghold(galaxyUhfId, q, r);
    }

    #initializeSectors() {
        this.sectors.clear();
        const coordinates = generateSectorCoordinates(this.radius);
        coordinates.forEach(({ q, r }) => {
            const sector = new GalaxySectorClass({ q, r });
            this.sectors.set(sector.key, sector);
        });
    }

    #initializeFactions() {
        this.factions.clear();
        const ringCache = new Map();
        galaxyFactionParametersConfig.forEach((definition) => {
            const startingSectors = this.#resolveStartingSectors(definition, ringCache);
            const faction = new GalaxyFactionClass({
                ...definition,
                startingSectors
            });
            this.factions.set(faction.id, faction);
        });
    }

    #initializeFactionFleets() {
        this.factions.forEach((faction) => {
            faction.initializeFleetPower(this);
        });
    }

    #markFactionControlDirty(factionId) {
        const faction = this.factions.get(factionId);
        faction?.markControlDirty?.();
    }

    #markAllFactionBorderCachesDirty() {
        this.factions.forEach((faction) => {
            faction?.markBorderDirty?.();
        });
    }

    #setSectorControlValue(sector, factionId, value) {
        if (!sector || !factionId) {
            return;
        }
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            this.#clearSectorControlValue(sector, factionId);
            return;
        }
        const previous = sector.getControlValue?.(factionId) ?? 0;
        sector.setControl(factionId, numericValue);
        if (previous !== numericValue) {
            this.#markFactionControlDirty(factionId);
            this.#markAllFactionBorderCachesDirty();
        }
    }

    #clearSectorControlValue(sector, factionId) {
        if (!sector || !factionId) {
            return;
        }
        const previous = sector.getControlValue?.(factionId) ?? 0;
        sector.clearControl(factionId);
        if (previous > 0) {
            this.#markFactionControlDirty(factionId);
            this.#markAllFactionBorderCachesDirty();
        }
    }

    #resetSectorControl(sector) {
        if (!sector) {
            return;
        }
        const factionIds = Object.keys(sector.control);
        factionIds.forEach((factionId) => {
            this.#clearSectorControlValue(sector, factionId);
        });
    }

    #applyControlMapToSector(sector, controlMap) {
        if (!sector) {
            return;
        }
        this.#resetSectorControl(sector);
        if (!controlMap) {
            return;
        }
        Object.entries(controlMap).forEach(([factionId, rawValue]) => {
            if (!this.factions.has(factionId)) {
                return;
            }
            this.#setSectorControlValue(sector, factionId, rawValue);
        });
    }

    #applyFactionStartingControl() {
        this.sectors.forEach((sector) => {
            this.#resetSectorControl(sector);
        });
        this.factions.forEach((faction) => {
            faction.resetControlCache?.();
        });
        this.factions.forEach((faction) => {
            faction.getStartingSectors().forEach((sectorKey) => {
                const sector = this.sectors.get(sectorKey);
                if (!sector) {
                    return;
                }
                this.#setSectorControlValue(sector, faction.id, 100);
            });
        });
        Object.entries(galaxySectorControlOverridesConfig).forEach(([sectorKey, controlMap]) => {
            const sector = this.sectors.get(sectorKey);
            if (!sector) {
                return;
            }
            this.#applyControlMapToSector(sector, controlMap);
        });
    }

    #getSectorKeysForRing(targetRing) {
        if (!Number.isFinite(targetRing) || targetRing < 0) {
            return [];
        }
        if (targetRing === 0) {
            const centerKey = GalaxySectorClass.createKey(0, 0);
            return this.sectors.has(centerKey) ? [centerKey] : [];
        }
        const keys = [];
        const directions = [
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: 0 },
            { q: 1, r: -1 }
        ];
        let currentQ = targetRing;
        let currentR = 0;
        directions.forEach(({ q: dq, r: dr }) => {
            for (let step = 0; step < targetRing; step += 1) {
                const key = GalaxySectorClass.createKey(currentQ, currentR);
                if (this.sectors.has(key)) {
                    keys.push(key);
                }
                currentQ += dq;
                currentR += dr;
            }
        });
        return keys;
    }

    #resolveStartingSectors(definition, ringCache) {
        const resolved = new Set();
        const { startingSectors, ringSlices } = definition;
        if (Array.isArray(startingSectors)) {
            startingSectors.forEach((entry) => {
                if (!entry) {
                    return;
                }
                if (typeof entry === 'string') {
                    resolved.add(entry);
                    return;
                }
                if (entry && Number.isFinite(entry.q) && Number.isFinite(entry.r)) {
                    resolved.add(GalaxySectorClass.createKey(entry.q, entry.r));
                }
            });
        }
        if (Array.isArray(ringSlices)) {
            ringSlices.forEach(({ ring, start, end }) => {
                if (!Number.isFinite(ring)) {
                    return;
                }
                if (!ringCache.has(ring)) {
                    ringCache.set(ring, this.#getSectorKeysForRing(ring));
                }
                const keys = ringCache.get(ring);
                if (!keys || !keys.length) {
                    return;
                }
                const total = keys.length;
                const rawStart = Number.isFinite(start) ? Math.floor(start) : NaN;
                const rawEnd = Number.isFinite(end) ? Math.floor(end) : NaN;
                const beginPosition = Number.isFinite(rawStart) ? Math.max(1, Math.min(total, rawStart)) : 1;
                const endPosition = Number.isFinite(rawEnd) ? Math.max(beginPosition, Math.min(total, rawEnd)) : total;
                for (let position = beginPosition; position <= endPosition; position += 1) {
                    resolved.add(keys[position - 1]);
                }
            });
        }
        return Array.from(resolved);
    }

    #calculateSuccessChance(offensePower, defensePower) {
        const offense = Number(offensePower);
        if (!Number.isFinite(offense) || offense <= 0) {
            return 0;
        }
        const defense = Number(defensePower);
        if (!Number.isFinite(defense) || defense <= 0) {
            return 1;
        }
        const total = offense + defense;
        if (!(total > 0)) {
            return 0;
        }
        return Math.max(0, Math.min(1, offense / total));
    }

    #computeDefensePower(sector, attackerId) {
        if (!sector) {
            return 0;
        }
        let defensePower = 0;
        Object.entries(sector.control).forEach(([factionId, value]) => {
            if (!factionId || factionId === attackerId) {
                return;
            }
            const controlValue = Number(value);
            if (!Number.isFinite(controlValue) || controlValue <= 0) {
                return;
            }
            const faction = this.getFaction(factionId);
            if (!faction) {
                return;
            }
            let individualPower = faction.getSectorDefense?.(sector, this) ?? 0;
            if (!(individualPower > 0) && factionId !== galaxyUhfId) {
                const baseValue = sector.getValue?.() ?? 0;
                if (Number.isFinite(baseValue) && baseValue > 0) {
                    individualPower = baseValue;
                }
            }
            if (!(individualPower > 0)) {
                return;
            }
            defensePower += individualPower;
        });
        return defensePower;
    }

    #serializeOperation(operation) {
        if (!operation) {
            return null;
        }
        return {
            sectorKey: operation.sectorKey,
            factionId: operation.factionId,
            assignedPower: operation.assignedPower,
            reservedPower: operation.reservedPower,
            durationMs: operation.durationMs,
            elapsedMs: operation.elapsedMs,
            successChance: operation.successChance,
            failureChance: operation.failureChance,
            defensePower: operation.defensePower,
            offensePower: operation.offensePower,
            status: operation.status,
            result: operation.result,
            losses: operation.losses
        };
    }

    #restoreOperation(state) {
        if (!state || !state.sectorKey) {
            return;
        }
        const sector = this.sectors.get(state.sectorKey);
        if (!sector) {
            return;
        }
        const assignedPower = Number(state.assignedPower);
        const reservedPower = Number(state.reservedPower);
        if (!Number.isFinite(assignedPower) || assignedPower <= 0 || !Number.isFinite(reservedPower) || reservedPower <= 0) {
            return;
        }
        const duration = Number.isFinite(state.durationMs) && state.durationMs > 0 ? state.durationMs : GALAXY_OPERATION_DURATION_MS;
        const elapsed = Number.isFinite(state.elapsedMs) && state.elapsedMs >= 0 ? Math.min(state.elapsedMs, duration) : 0;
        const attackerId = state.factionId || galaxyUhfId;
        const savedDefense = Number(state.defensePower);
        const savedOffense = Number(state.offensePower);
        const successChance = Math.max(0, Math.min(1, Number(state.successChance)));
        const failureChance = Math.max(0, Math.min(1, Number(state.failureChance)));
        const defensePower = Number.isFinite(savedDefense) && savedDefense >= 0
            ? savedDefense
            : this.#computeDefensePower(sector, attackerId);
        const offensePower = Number.isFinite(savedOffense) && savedOffense > 0
            ? Math.min(savedOffense, reservedPower)
            : Math.min(assignedPower, reservedPower);
        const computedSuccess = this.#calculateSuccessChance(offensePower, defensePower);
        const sanitizedSuccess = Math.max(0, Math.min(1, computedSuccess));
        const sanitizedFailure = Math.max(0, Math.min(1, 1 - sanitizedSuccess));
        const operation = {
            sectorKey: state.sectorKey,
            factionId: attackerId,
            assignedPower,
            reservedPower,
            durationMs: duration,
            elapsedMs: elapsed,
            successChance: sanitizedSuccess,
            failureChance: sanitizedFailure,
            defensePower,
            offensePower,
            status: state.status === 'running' && elapsed < duration ? 'running' : 'completed',
            result: state.result,
            losses: Number.isFinite(Number(state.losses)) ? Number(state.losses) : undefined
        };

        this.operations.set(operation.sectorKey, operation);

        if (operation.status === 'running') {
            const faction = this.getFaction(operation.factionId);
            if (faction) {
                const availablePower = Math.max(0, faction.fleetPower);
                const reserved = Math.min(operation.reservedPower, availablePower);
                faction.setFleetPower(availablePower - reserved);
                operation.reservedPower = reserved;
                operation.assignedPower = Math.min(operation.assignedPower, reserved);
                operation.offensePower = Math.min(operation.offensePower, reserved);
            }
        } else {
            this.#completeOperation(operation);
        }
    }

    #updateOperations(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0 || !this.operations.size) {
            return;
        }
        const completed = [];
        this.operations.forEach((operation, key) => {
            if (!operation || operation.status !== 'running') {
                return;
            }
            operation.elapsedMs += deltaMs;
            if (operation.elapsedMs >= operation.durationMs) {
                operation.elapsedMs = operation.durationMs;
                completed.push(key);
            }
        });
        completed.forEach((key) => {
            const operation = this.operations.get(key);
            if (!operation) {
                return;
            }
            this.#completeOperation(operation);
            this.operations.delete(key);
        });
    }

    #completeOperation(operation) {
        const faction = this.getFaction(operation.factionId || galaxyUhfId);
        if (operation.status !== 'running') {
            operation.status = 'completed';
        }
        const sector = this.sectors.get(operation.sectorKey);
        const attackerId = operation.factionId || galaxyUhfId;
        const offensePower = Math.max(0, Math.min(operation.offensePower ?? operation.reservedPower, operation.reservedPower));
        let defensePower = this.#computeDefensePower(sector, attackerId);
        if (!Number.isFinite(defensePower) || defensePower < 0) {
            defensePower = Math.max(0, operation.defensePower ?? 0);
        }
        const successChance = this.#calculateSuccessChance(offensePower, defensePower);
        const failureChance = Math.max(0, Math.min(1, 1 - successChance));
        let losses;
        if (successChance >= 1) {
            losses = 0;
        } else {
            const successLoss = defensePower > 0 && offensePower > 0
                ? Math.min(operation.reservedPower, (defensePower * defensePower) / (offensePower + defensePower))
                : 0;
            losses = successLoss;
        }
        const isSuccessful = successChance >= 1 || (successChance > 0 && Math.random() < successChance);
        if (!isSuccessful) {
            losses = Math.min(operation.reservedPower, offensePower);
        }
        losses = Math.max(0, Math.min(operation.reservedPower, losses));
        const returningPower = Math.max(0, operation.reservedPower - losses);
        if (faction) {
            const nextPower = Math.max(0, faction.fleetPower + returningPower);
            faction.setFleetPower(nextPower);
        }

        if (isSuccessful) {
            if (operation.factionId === galaxyUhfId) {
                this.successfulOperations += 1;
            }
            this.#applyOperationSuccess(operation);
        }
        operation.offensePower = offensePower;
        operation.defensePower = defensePower;
        operation.successChance = successChance;
        operation.failureChance = failureChance;
        operation.losses = losses;
        operation.result = isSuccessful ? 'success' : 'failure';
        operation.status = 'completed';
        if (typeof updateGalaxyUI === 'function') {
            updateGalaxyUI();
        }
    }

    #applyOperationSuccess(operation) {
        const sector = this.sectors.get(operation.sectorKey);
        if (!sector) {
            return;
        }
        const factionId = operation.factionId || galaxyUhfId;
        const currentControl = sector.getControlValue?.(factionId) ?? 0;
        const totalControl = sector.getTotalControlValue?.() ?? 0;
        const hasExistingControl = totalControl > 0;
        let gain;
        if (hasExistingControl) {
            const otherTotal = Math.max(0, totalControl - currentControl);
            if (!(otherTotal > 0)) {
                return;
            }
            const targetGain = totalControl * 0.1;
            gain = Math.min(otherTotal, targetGain);
        } else {
            const sectorValue = sector.getValue?.() ?? 0;
            gain = Number.isFinite(sectorValue) && sectorValue > 0 ? sectorValue * 0.1 : 0;
        }
        if (!(gain > 0)) {
            return;
        }
        const entries = Object.entries(sector.control).filter(([defenderId, value]) => {
            return defenderId !== factionId && Number(value) > 0;
        });
        if (!entries.length && hasExistingControl) {
            return;
        }
        entries.sort((left, right) => Number(right[1]) - Number(left[1]));
        let remainingReduction = gain;
        entries.forEach(([factionId, value], index) => {
            if (!(remainingReduction > 0)) {
                return;
            }
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue <= 0) {
                this.#clearSectorControlValue(sector, factionId);
                return;
            }
            const factionsRemaining = entries.length - index;
            const share = factionsRemaining > 0 ? remainingReduction / factionsRemaining : remainingReduction;
            const reduction = Math.min(numericValue, share);
            const nextValue = numericValue - reduction;
            remainingReduction -= reduction;
            if (nextValue > 0) {
                this.#setSectorControlValue(sector, factionId, nextValue);
            } else {
                this.#clearSectorControlValue(sector, factionId);
            }
        });
        const appliedGain = entries.length ? gain - Math.max(0, remainingReduction) : gain;
        if (!(appliedGain > 0)) {
            return;
        }
        const newValue = currentControl + appliedGain;
        this.#setSectorControlValue(sector, factionId, newValue);
    }

    #serializeFleetUpgrades() {
        const entries = [];
        GALAXY_FLEET_UPGRADE_KEYS.forEach((key) => {
            const purchases = this.getFleetUpgradeCount(key);
            if (purchases > 0) {
                entries.push({ key, purchases });
            }
        });
        return entries;
    }

    #loadFleetUpgrades(entries) {
        GALAXY_FLEET_UPGRADE_KEYS.forEach((key) => {
            this.fleetUpgradePurchases[key] = 0;
        });
        entries.forEach((entry) => {
            const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[entry?.key];
            if (!definition) {
                return;
            }
            const count = Number(entry.purchases);
            if (!Number.isFinite(count) || count <= 0) {
                return;
            }
            this.fleetUpgradePurchases[entry.key] = count;
        });
    }

    #hasNeighboringStronghold(sector, factionId) {
        if (!sector || !factionId) {
            return false;
        }
        for (let index = 0; index < HEX_NEIGHBOR_DIRECTIONS.length; index += 1) {
            const direction = HEX_NEIGHBOR_DIRECTIONS[index];
            const neighbor = this.getSector(sector.q + direction.q, sector.r + direction.r);
            if (this.#isFactionFullControlSector(neighbor, factionId)) {
                return true;
            }
        }
        return false;
    }

    #isFactionFullControlSector(sector, factionId) {
        if (!sector || !factionId) {
            return false;
        }
        const totalControl = sector.getTotalControlValue?.();
        if (!(totalControl > 0)) {
            return false;
        }
        const factionControl = sector.getControlValue?.(factionId) || 0;
        return Math.abs(factionControl - totalControl) <= FULL_CONTROL_EPSILON;
    }

    #hasFactionPresence(sector, factionId) {
        if (!sector || !factionId) {
            return false;
        }
        const controlValue = sector.getControlValue?.(factionId) || 0;
        return controlValue > FULL_CONTROL_EPSILON;
    }

    #hasUhfPresence(sector) {
        return this.#hasFactionPresence(sector, galaxyUhfId);
    }
}

if (typeof window !== 'undefined') {
    window.GalaxyManager = GalaxyManager;
}
if (typeof globalThis !== 'undefined') {
    globalThis.GalaxyManager = GalaxyManager;
    globalThis.GALAXY_FLEET_UPGRADE_INCREMENT = FLEET_UPGRADE_INCREMENT;
    globalThis.GALAXY_FLEET_UPGRADE_DEFINITIONS = GALAXY_FLEET_UPGRADE_DEFINITIONS;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GalaxyManager,
        GALAXY_FLEET_UPGRADE_INCREMENT: FLEET_UPGRADE_INCREMENT,
        GALAXY_FLEET_UPGRADE_DEFINITIONS
    };
}
