let GalaxySectorClass;
let GalaxyFactionClass;
let GalaxyFactionAIClass;
let GalaxyOperationManagerClass;
let galaxyFactionParametersConfig;
let galaxySectorControlOverridesConfig;
let galaxySectorParametersConfig;
let defaultSectorValue = 100;
let defaultSectorReward = [];
const defaultUpdateFactions = () => {};
let updateFactionsFunction = defaultUpdateFactions;
const DEFAULT_UHF_FACTION_ID = 'uhf';
let galaxyUhfId = DEFAULT_UHF_FACTION_ID;
let operationAutoThresholdDefault = 2.1;

if (typeof module !== 'undefined' && module.exports) {
    ({ GalaxySector: GalaxySectorClass } = require('./sector'));
    ({ GalaxyFaction: GalaxyFactionClass, updateFactions: updateFactionsFunction, UHF_FACTION_ID: galaxyUhfId } = require('./faction'));
    try {
        ({ GalaxyFactionAI: GalaxyFactionAIClass } = require('./factionAI'));
    } catch (error) {
        GalaxyFactionAIClass = undefined;
    }
    try {
        ({
            GalaxyOperationManager: GalaxyOperationManagerClass,
            DEFAULT_OPERATION_AUTO_THRESHOLD: operationAutoThresholdDefault
        } = require('./operation'));
    } catch (error) {
        GalaxyOperationManagerClass = undefined;
    }
    ({
        galaxyFactionParameters: galaxyFactionParametersConfig,
        galaxySectorControlOverrides: galaxySectorControlOverridesConfig
    } = require('./factions-parameters'));
    const sectorParametersModule = require('./sector-parameters');
    galaxySectorParametersConfig = sectorParametersModule.galaxySectorParameters;
    defaultSectorValue = sectorParametersModule.DEFAULT_SECTOR_VALUE;
    if (sectorParametersModule.getDefaultSectorValue) {
        defaultSectorValue = sectorParametersModule.getDefaultSectorValue();
    }
} else if (typeof window !== 'undefined') {
    GalaxySectorClass = window.GalaxySector;
    GalaxyFactionClass = window.GalaxyFaction;
    if (window.GalaxyFactionAI) {
        GalaxyFactionAIClass = window.GalaxyFactionAI;
    }
    if (window.GalaxyOperationManager) {
        GalaxyOperationManagerClass = window.GalaxyOperationManager;
    }
    if (Number.isFinite(window.DEFAULT_OPERATION_AUTO_THRESHOLD) && window.DEFAULT_OPERATION_AUTO_THRESHOLD > 0) {
        operationAutoThresholdDefault = window.DEFAULT_OPERATION_AUTO_THRESHOLD;
    }
    galaxyFactionParametersConfig = window.galaxyFactionParameters;
    galaxySectorControlOverridesConfig = window.galaxySectorControlOverrides;
    galaxySectorParametersConfig = window.galaxySectorParameters;
    if (window.getGalaxySectorDefaultValue) {
        defaultSectorValue = window.getGalaxySectorDefaultValue();
    } else {
        defaultSectorValue = window.galaxySectorDefaultValue;
    }
    if (window.getGalaxySectorDefaultReward) {
        defaultSectorReward = window.getGalaxySectorDefaultReward();
    } else if (Array.isArray(window.galaxySectorDefaultReward)) {
        defaultSectorReward = window.galaxySectorDefaultReward;
    }
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
    if (!GalaxyFactionAIClass && globalThis.GalaxyFactionAI) {
        GalaxyFactionAIClass = globalThis.GalaxyFactionAI;
    }
    if (!GalaxyOperationManagerClass && globalThis.GalaxyOperationManager) {
        GalaxyOperationManagerClass = globalThis.GalaxyOperationManager;
    }
    if (Number.isFinite(globalThis.DEFAULT_OPERATION_AUTO_THRESHOLD) && globalThis.DEFAULT_OPERATION_AUTO_THRESHOLD > 0) {
        operationAutoThresholdDefault = globalThis.DEFAULT_OPERATION_AUTO_THRESHOLD;
    }
    if ((!galaxyFactionParametersConfig || !Array.isArray(galaxyFactionParametersConfig)) && globalThis.galaxyFactionParameters) {
        galaxyFactionParametersConfig = globalThis.galaxyFactionParameters;
    }
    if (!galaxySectorControlOverridesConfig && globalThis.galaxySectorControlOverrides) {
        galaxySectorControlOverridesConfig = globalThis.galaxySectorControlOverrides;
    }
    if (!galaxySectorParametersConfig && globalThis.galaxySectorParameters) {
        galaxySectorParametersConfig = globalThis.galaxySectorParameters;
    }
    if (globalThis.getGalaxySectorDefaultValue) {
        defaultSectorValue = globalThis.getGalaxySectorDefaultValue();
    } else {
        const globalDefaultSectorValue = globalThis.galaxySectorDefaultValue;
        if (Number.isFinite(globalDefaultSectorValue) && globalDefaultSectorValue > 0) {
            defaultSectorValue = globalDefaultSectorValue;
        }
    }
    if (globalThis.getGalaxySectorDefaultReward) {
        defaultSectorReward = globalThis.getGalaxySectorDefaultReward();
    } else if (Array.isArray(globalThis.galaxySectorDefaultReward)) {
        defaultSectorReward = globalThis.galaxySectorDefaultReward;
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
        if (!GalaxyFactionAIClass) {
            ({ GalaxyFactionAI: GalaxyFactionAIClass } = require('./factionAI'));
        }
        if (!GalaxyOperationManagerClass) {
            ({
                GalaxyOperationManager: GalaxyOperationManagerClass,
                DEFAULT_OPERATION_AUTO_THRESHOLD: operationAutoThresholdDefault
            } = require('./operation'));
        }
        if (!Array.isArray(galaxyFactionParametersConfig)) {
            ({
                galaxyFactionParameters: galaxyFactionParametersConfig,
                galaxySectorControlOverrides: galaxySectorControlOverridesConfig
            } = require('./factions-parameters'));
        }
        if (!galaxySectorParametersConfig) {
            const sectorParametersModule = require('./sector-parameters');
            galaxySectorParametersConfig = sectorParametersModule.galaxySectorParameters;
            defaultSectorValue = sectorParametersModule.DEFAULT_SECTOR_VALUE;
            if (sectorParametersModule.getDefaultSectorValue) {
                defaultSectorValue = sectorParametersModule.getDefaultSectorValue();
            }
            if (sectorParametersModule.getDefaultSectorReward) {
                defaultSectorReward = sectorParametersModule.getDefaultSectorReward();
            } else if (Array.isArray(sectorParametersModule.DEFAULT_SECTOR_REWARD)) {
                defaultSectorReward = sectorParametersModule.DEFAULT_SECTOR_REWARD;
            }
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
if (!galaxySectorParametersConfig) {
    galaxySectorParametersConfig = {};
}
if (!Number.isFinite(defaultSectorValue) || defaultSectorValue <= 0) {
    defaultSectorValue = 100;
}
if (!Array.isArray(defaultSectorReward)) {
    defaultSectorReward = [];
}

const R507_PROTECTED_COORDINATES = { q: 4, r: -5 };
const R507_PROTECTED_KEY = GalaxySectorClass?.createKey?.(
    R507_PROTECTED_COORDINATES.q,
    R507_PROTECTED_COORDINATES.r
) ?? `${R507_PROTECTED_COORDINATES.q},${R507_PROTECTED_COORDINATES.r}`;
const R507_PROTECTED_CONTROL_THRESHOLD = 0.1;
const R507_PROTECTED_CONTROL_TOLERANCE = 1e-6;

function resolveDefaultSectorValue() {
    return defaultSectorValue;
}

function resolveSectorOverrideValue(sectorKey) {
    if (!sectorKey) {
        return null;
    }
    const overrides = galaxySectorParametersConfig.overrides;
    if (!overrides) {
        return null;
    }
    const override = overrides[sectorKey];
    if (!override) {
        return null;
    }
    const overrideValue = override.value;
    if (!Number.isFinite(overrideValue) || overrideValue <= 0) {
        return null;
    }
    return overrideValue;
}

function cloneRewardDefinition(rewardDefinition) {
    if (!rewardDefinition) {
        return [];
    }
    const source = Array.isArray(rewardDefinition)
        ? rewardDefinition
        : [rewardDefinition];
    const cloned = [];
    source.forEach((entry) => {
        if (!entry) {
            return;
        }
        if (typeof entry === 'object') {
            cloned.push({ ...entry });
            return;
        }
        if (typeof entry === 'string') {
            cloned.push(entry);
        }
    });
    return cloned;
}

function resolveDefaultSectorReward() {
    const definition = galaxySectorParametersConfig.defaultReward ?? defaultSectorReward;
    if (!definition) {
        return [];
    }
    return cloneRewardDefinition(definition);
}

function resolveSectorReward(sectorKey) {
    if (sectorKey) {
        const overrides = galaxySectorParametersConfig.overrides;
        if (overrides) {
            const override = overrides[sectorKey];
            if (override && Object.prototype.hasOwnProperty.call(override, 'reward')) {
                return cloneRewardDefinition(override.reward);
            }
        }
    }
    return resolveDefaultSectorReward();
}


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
        this.fleetUpgradePurchases = {};
        GALAXY_FLEET_UPGRADE_KEYS.forEach((key) => {
            this.fleetUpgradePurchases[key] = 0;
        });
        this.successfulOperations = 0;
        this.operations = new Map();
        const operationHooks = {
            uhfFactionId: galaxyUhfId,
            hasNeighboringStronghold: (sector, factionId) => this.#hasNeighboringStronghold(sector, factionId),
            hasFactionPresence: (sector, factionId) => this.#hasFactionPresence(sector, factionId),
            isFactionFullControlSector: (sector, factionId) => this.#isFactionFullControlSector(sector, factionId),
            isSectorTargetingRestricted: (sector) => this.#isSectorTargetingRestricted(sector),
            updateSectorControl: (sector, mutator) => this.#updateSectorControl(sector, mutator),
            getDefenseSummary: (sector, attackerId) => this.getSectorDefenseSummary(sector, attackerId),
            onOperationSuccess: () => {
                this.successfulOperations += 1;
            },
            refreshUI: () => {
                if (typeof updateGalaxyUI === 'function') {
                    updateGalaxyUI();
                }
            }
        };
        if (GalaxyOperationManagerClass) {
            this.operationManager = new GalaxyOperationManagerClass(this, {
                ...operationHooks,
                operations: this.operations
            });
            this.operations = this.operationManager.operations;
        } else {
            this.operationManager = null;
        }
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
        if(!this.enabled){
            return;
        }
        updateFactionsFunction.call(this, deltaMs);
        if (this.operationManager) {
            this.operationManager.update(deltaMs);
        }
        this.#updateIncomingAttackWarning();
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
                updateGalaxyUI({ force: true });
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
        const operationState = this.operationManager
            ? this.operationManager.saveState()
            : {
                operations: [],
                operationSteps: [],
                operationAutoSectors: [],
                operationAutoThreshold: operationAutoThresholdDefault
            };
        return {
            sectors,
            factions: this.getFactions().map((faction) => faction.toJSON()),
            operations: operationState.operations,
            fleetUpgrades: this.#serializeFleetUpgrades(),
            successfulOperations: this.successfulOperations,
            operationSteps: operationState.operationSteps,
            operationAutoSectors: operationState.operationAutoSectors,
            operationAutoThreshold: operationState.operationAutoThreshold
        };
    }

    loadState(state) {
        this.initialize();
        if (state && Array.isArray(state.sectors)) {
            this.#applyFactionStartingControl();
            state.sectors.forEach((sectorData) => {
                const sector = this.getSector(sectorData.q, sectorData.r);
                if (!sector) {
                    return;
                }
                this.#applyControlMapToSector(sector, sectorData.control);
                sector.setRewardAcquired?.(sectorData.rewardAcquired === true);
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
        if (state && Array.isArray(state.fleetUpgrades)) {
            this.#loadFleetUpgrades(state.fleetUpgrades);
        }
        this.#initializeFactionFleets();
        this.factions.forEach((faction) => {
            const factionState = factionStateMap.get(faction.id);
            if (factionState) {
                faction.loadState(factionState, this);
            }
        });
        if (state && Number.isFinite(state.successfulOperations)) {
            this.successfulOperations = Math.max(0, state.successfulOperations);
        }
        if (this.operationManager) {
            this.operationManager.loadState(state);
        }
        this.factions.forEach((faction) => {
            faction.updateFleetCapacity(this);
        });
        this.refreshUIVisibility();
        this.#updateIncomingAttackWarning();
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
        if (!Array.isArray(entries)) {
            return;
        }
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

    resetGalaxy() {
        this.initialized = false;
        this.radius = GALAXY_RADIUS;
        this.factions.clear();
        this.sectors.clear();
        if (this.operationManager) {
            this.operationManager.reset();
            this.operations = this.operationManager.operations;
        } else {
            this.operations.clear();
        }
        this.initialize();
        this.enable();
        this.#updateIncomingAttackWarning();
    }

    getSector(q, r) {
        return this.sectors.get(GalaxySectorClass.createKey(q, r)) || null;
    }

    getSectors() {
        return Array.from(this.sectors.values());
    }

    hasAcquiredSectorReward(sectorReference) {
        const sector = this.#resolveSectorReference(sectorReference);
        return sector?.hasRewardAcquired?.() === true;
    }

    setSectorRewardAcquired({ sectorKey, acquired = true } = {}) {
        const sector = this.#resolveSectorReference(sectorKey);
        sector?.setRewardAcquired?.(acquired === true);
        return sector?.hasRewardAcquired?.() === true;
    }

    getSectorsReward(sectorReferences) {
        const references = Array.isArray(sectorReferences) ? sectorReferences : [sectorReferences];
        const aggregates = new Map();
        references.forEach((reference) => {
            const sector = this.#resolveSectorReference(reference);
            if (!sector || typeof sector.getSectorReward !== 'function') {
                return;
            }
            const rewardEntries = sector.getSectorReward();
            if (!Array.isArray(rewardEntries) || rewardEntries.length === 0) {
                return;
            }
            rewardEntries.forEach((entry) => {
                if (!entry) {
                    return;
                }
                const amount = Number(entry.amount);
                if (!Number.isFinite(amount) || amount <= 0) {
                    return;
                }
                const label = typeof entry.label === 'string' && entry.label ? entry.label : null;
                const key = entry.type || entry.resourceId || label;
                if (!key) {
                    return;
                }
                const unit = typeof entry.unit === 'string' && entry.unit ? entry.unit : null;
                const resourceId = typeof entry.resourceId === 'string' && entry.resourceId ? entry.resourceId : null;
                if (aggregates.has(key)) {
                    const aggregate = aggregates.get(key);
                    aggregate.amount += amount;
                } else {
                    aggregates.set(key, {
                        amount,
                        label: label || key,
                        type: entry.type || null,
                        resourceId,
                        unit
                    });
                }
            });
        });
        return Array.from(aggregates.values()).map((entry) => ({
            amount: entry.amount,
            label: entry.label,
            type: entry.type,
            resourceId: entry.resourceId,
            unit: entry.unit
        }));
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

    getOperationForSector(sectorKey, factionId) {
        if (!this.operationManager) {
            return null;
        }
        return this.operationManager.getOperationForSector(sectorKey, factionId);
    }

    getSectorDefensePower(sectorKey, attackerId) {
        if (!sectorKey) {
            return 0;
        }
        const sector = this.sectors.get(sectorKey);
        if (!sector) {
            return 0;
        }
        const summary = this.getSectorDefenseSummary(sector, attackerId);
        return summary.totalPower;
    }

    getSectorDefenseSummary(sectorOrKey, originFactionId) {
        const sector = this.#resolveSectorReference(sectorOrKey);
        if (!sector) {
            return {
                basePower: 0,
                fleetPower: 0,
                totalPower: 0,
                contributions: []
            };
        }
        const contributions = this.#collectSectorDefenseEntries(sector, originFactionId);
        if (!contributions.length) {
            return {
                basePower: 0,
                fleetPower: 0,
                totalPower: 0,
                contributions
            };
        }
        let basePower = 0;
        let fleetPower = 0;
        contributions.forEach((entry) => {
            if (entry.basePower > 0) {
                basePower += entry.basePower;
            }
            if (entry.fleetPower > 0) {
                fleetPower += entry.fleetPower;
            }
        });
        return {
            basePower,
            fleetPower,
            totalPower: basePower + fleetPower,
            contributions
        };
    }

    getManualDefenseAssignment(sectorKey, factionId = galaxyUhfId) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getManualDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.getManualDefenseAssignment(sectorKey);
    }

    getDefenseAssignment(sectorKey, factionId = galaxyUhfId) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.getDefenseAssignment(sectorKey);
    }

    setDefenseAssignment({ factionId = galaxyUhfId, sectorKey, value }) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.setDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.setDefenseAssignment(sectorKey, value, this);
    }

    adjustDefenseAssignment({ factionId = galaxyUhfId, sectorKey, delta }) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.adjustDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.adjustDefenseAssignment(sectorKey, delta, this);
    }

    getDefenseCapacity(factionId = galaxyUhfId) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseCapacity !== 'function') {
            return 0;
        }
        return faction.getDefenseCapacity(this);
    }

    getDefenseAssignmentTotal(factionId = galaxyUhfId) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseAssignmentTotal !== 'function') {
            return 0;
        }
        return faction.getDefenseAssignmentTotal();
    }

    getDefenseReservation(factionId = galaxyUhfId) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseReservation !== 'function') {
            return 0;
        }
        return faction.getDefenseReservation(this);
    }

    getDefenseStep(sectorKey, factionId = galaxyUhfId) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseStep !== 'function') {
            return 1;
        }
        return faction.getDefenseStep(sectorKey);
    }

    setDefenseStep({ factionId = galaxyUhfId, sectorKey, value }) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.setDefenseStep !== 'function') {
            return 1;
        }
        return faction.setDefenseStep(sectorKey, value);
    }

    getOperationStep(sectorKey) {
        if (!this.operationManager) {
            return 1;
        }
        return this.operationManager.getOperationStep(sectorKey);
    }

    setOperationStep({ sectorKey, value }) {
        if (!this.operationManager) {
            return 1;
        }
        return this.operationManager.setOperationStep({ sectorKey, value });
    }

    getOperationAutoEnabled(sectorKey) {
        if (!this.operationManager) {
            return false;
        }
        return this.operationManager.getOperationAutoEnabled(sectorKey);
    }

    setOperationAutoEnabled({ sectorKey, value }) {
        if (!this.operationManager) {
            return false;
        }
        return this.operationManager.setOperationAutoEnabled({ sectorKey, value });
    }

    getOperationAutoThreshold() {
        if (!this.operationManager) {
            return operationAutoThresholdDefault;
        }
        return this.operationManager.getOperationAutoThreshold();
    }

    setOperationAutoThreshold(value) {
        if (!this.operationManager) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric <= 0) {
                return operationAutoThresholdDefault;
            }
            operationAutoThresholdDefault = numeric;
            return operationAutoThresholdDefault;
        }
        return this.operationManager.setOperationAutoThreshold(value);
    }

    getOperationSuccessChance({ sectorKey, factionId, assignedPower }) {
        if (!this.operationManager) {
            return 0;
        }
        return this.operationManager.getOperationSuccessChance({ sectorKey, factionId, assignedPower });
    }

    getOperationLossEstimate({
        sectorKey,
        factionId,
        assignedPower,
        reservedPower,
        offensePower,
        defensePower
    }) {
        if (!this.operationManager) {
            return null;
        }
        return this.operationManager.getOperationLossEstimate({
            sectorKey,
            factionId,
            assignedPower,
            reservedPower,
            offensePower,
            defensePower
        });
    }

    getReservedOperationPower(factionId) {
        if (!this.operationManager) {
            return 0;
        }
        return this.operationManager.getReservedOperationPower(factionId);
    }

    startOperation({ sectorKey, factionId, assignedPower, durationMs, successChance }) {
        if (!this.operationManager) {
            return null;
        }
        const operation = this.operationManager.startOperation({
            sectorKey,
            factionId,
            assignedPower,
            durationMs,
            successChance
        });
        this.#updateIncomingAttackWarning();
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

    getControlledSectorWorldCount(factionId = galaxyUhfId) {
        const targetFaction = factionId || galaxyUhfId;
        let total = 0;
        this.sectors.forEach((sector) => {
            if (!this.#isFactionFullControlSector(sector, targetFaction)) {
                return;
            }
            const rewards = sector?.getSectorReward?.();
            if (!Array.isArray(rewards) || rewards.length === 0) {
                return;
            }
            rewards.forEach((entry) => {
                if (!entry) {
                    return;
                }
                const amount = Number(entry.amount);
                if (!Number.isFinite(amount) || amount <= 0) {
                    return;
                }
                const typeText = entry.type ? String(entry.type).toLowerCase() : '';
                const resourceText = entry.resourceId ? String(entry.resourceId).toLowerCase() : '';
                const labelText = entry.label ? String(entry.label).toLowerCase() : '';
                if (
                    typeText.includes('world') ||
                    resourceText.includes('world') ||
                    (!typeText && !resourceText && labelText.includes('world'))
                ) {
                    total += amount;
                }
            });
        });
        return total;
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

    getEffectFleetCapacityMultiplier() {
        let multiplier = 1;
        this.activeEffects.forEach((effect) => {
            if (effect?.type !== 'fleetCapacityMultiplier') {
                return;
            }
            const value = Number(effect.value);
            if (Number.isFinite(value) && value > 0) {
                multiplier *= value;
            }
        });
        return multiplier;
    }

    getFleetCapacityMultiplier() {
        const effectMultiplier = this.getEffectFleetCapacityMultiplier();
        const upgradeMultiplier = GALAXY_FLEET_UPGRADE_KEYS.reduce(
            (total, key) => total * this.getFleetUpgradeMultiplier(key),
            1
        );
        return effectMultiplier * upgradeMultiplier;
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
        const defaultValue = resolveDefaultSectorValue();
        coordinates.forEach(({ q, r }) => {
            const sectorKey = GalaxySectorClass.createKey(q, r);
            const overrideValue = resolveSectorOverrideValue(sectorKey);
            const sectorDefaultValue = overrideValue ?? defaultValue;
            const sectorReward = resolveSectorReward(sectorKey);
            const sector = new GalaxySectorClass({
                q,
                r,
                value: sectorDefaultValue,
                defaultValue: sectorDefaultValue,
                reward: sectorReward
            });
            this.sectors.set(sector.key, sector);
        });
    }

    #initializeFactions() {
        this.factions.clear();
        const ringCache = new Map();
        galaxyFactionParametersConfig.forEach((definition) => {
            const startingSectors = this.#resolveStartingSectors(definition, ringCache);
            const FactionCtor = definition.id === galaxyUhfId || !GalaxyFactionAIClass
                ? GalaxyFactionClass
                : GalaxyFactionAIClass;
            const faction = new FactionCtor({
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

    #updateIncomingAttackWarning() {
        const setter = globalThis?.setSpaceIncomingAttackWarning;
        if (!setter) {
            return;
        }
        const operations = this.operationManager?.operations;
        if (!operations || operations.size === 0) {
            setter.call(globalThis, false);
            return;
        }
        let hasIncomingAttack = false;
        for (const operation of operations.values()) {
            if (!operation || operation.status !== 'running') {
                continue;
            }
            if (!operation.factionId || operation.factionId === galaxyUhfId) {
                continue;
            }
            const sector = this.sectors.get(operation.sectorKey);
            if (!sector) {
                continue;
            }
            const uhfControl = Number(sector.getControlValue?.(galaxyUhfId)) || 0;
            if (uhfControl > 0) {
                hasIncomingAttack = true;
                break;
            }
        }
        setter.call(globalThis, hasIncomingAttack);
    }

    #updateSectorControl(sector, mutator) {
        if (!sector || typeof mutator !== 'function') {
            return;
        }
        const previousControl = { ...sector.control };
        mutator(sector);
        this.#normalizeSectorControl(sector, previousControl);
    }

    #normalizeSectorControl(sector, previousControlSnapshot) {
        if (!sector) {
            return;
        }
        const previousControl = previousControlSnapshot ? { ...previousControlSnapshot } : {};
        const MIN_CONTROL_SHARE = 0.001;
        const positiveEntries = Object.entries(sector.control)
            .map(([factionId, value]) => {
                const numericValue = Number(value);
                if (!Number.isFinite(numericValue) || numericValue <= 0 || !factionId) {
                    return null;
                }
                return { factionId, value: numericValue };
            })
            .filter(Boolean);
        if (!positiveEntries.length) {
            const hadPreviousControl = Object.values(previousControl).some((value) => Number(value) > 0);
            if (!hadPreviousControl) {
                Object.keys(sector.control).forEach((factionId) => {
                    sector.clearControl(factionId);
                });
                return;
            }
            this.#applyNormalizedControl(sector, previousControl, {});
            return;
        }
        const total = positiveEntries.reduce((sum, entry) => sum + entry.value, 0);
        if (!(total > 0)) {
            this.#applyNormalizedControl(sector, previousControl, {});
            return;
        }
        let shares = positiveEntries.map((entry) => ({
            factionId: entry.factionId,
            share: entry.value / total
        }));
        shares = shares.filter((entry) => entry.share >= MIN_CONTROL_SHARE);
        if (!shares.length) {
            this.#applyNormalizedControl(sector, previousControl, {});
            return;
        }
        const shareTotal = shares.reduce((sum, entry) => sum + entry.share, 0);
        if (!(shareTotal > 0)) {
            this.#applyNormalizedControl(sector, previousControl, {});
            return;
        }
        shares.sort((left, right) => left.share - right.share);
        let runningTotal = 0;
        const nextControl = {};
        shares.forEach((entry, index) => {
            let normalized;
            if (shares.length === 1) {
                normalized = 1;
            } else if (index === shares.length - 1) {
                normalized = Math.max(0, Math.min(1, 1 - runningTotal));
            } else {
                normalized = entry.share / shareTotal;
                runningTotal += normalized;
            }
            nextControl[entry.factionId] = normalized;
        });
        const CONTROL_EPSILON = 1e-9;
        const normalizedTotal = Object.values(nextControl).reduce((sum, value) => sum + value, 0);
        if (Math.abs(normalizedTotal - 1) > CONTROL_EPSILON) {
            let adjustmentTarget = null;
            Object.entries(nextControl).forEach(([factionId, value]) => {
                if (!adjustmentTarget || value > adjustmentTarget.value) {
                    adjustmentTarget = { factionId, value };
                }
            });
            if (adjustmentTarget && adjustmentTarget.factionId) {
                const adjusted = adjustmentTarget.value + (1 - normalizedTotal);
                nextControl[adjustmentTarget.factionId] = Math.max(0, adjusted);
            }
        }
        this.#applyNormalizedControl(sector, previousControl, nextControl);
    }

    #applyNormalizedControl(sector, previousControl, nextControl) {
        const CONTROL_EPSILON = 1e-9;
        const changedFactions = new Set();
        Object.entries(nextControl).forEach(([factionId, nextValue]) => {
            const previousValue = Number(previousControl?.[factionId]) || 0;
            if (!Number.isFinite(previousValue) || Math.abs(previousValue - nextValue) > CONTROL_EPSILON) {
                changedFactions.add(factionId);
            }
        });
        Object.entries(previousControl || {}).forEach(([factionId, previousValue]) => {
            if (!nextControl.hasOwnProperty(factionId) && Number(previousValue) > 0) {
                changedFactions.add(factionId);
            }
        });
        const existingKeys = Object.keys(sector.control);
        existingKeys.forEach((factionId) => {
            if (!nextControl.hasOwnProperty(factionId)) {
                sector.clearControl(factionId);
            }
        });
        Object.entries(nextControl).forEach(([factionId, value]) => {
            sector.setControl(factionId, value);
        });
        if (changedFactions.size > 0) {
            changedFactions.forEach((factionId) => this.#markFactionControlDirty(factionId));
            this.#markAllFactionBorderCachesDirty();
        }
    }

    #setSectorControlValue(sector, factionId, value) {
        if (!sector || !factionId) {
            return;
        }
        this.#updateSectorControl(sector, (target) => {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue <= 0) {
                target.clearControl(factionId);
                return;
            }
            target.setControl(factionId, numericValue);
        });
    }

    #clearSectorControlValue(sector, factionId) {
        if (!sector || !factionId) {
            return;
        }
        this.#updateSectorControl(sector, (target) => {
            target.clearControl(factionId);
        });
    }

    #resetSectorControl(sector) {
        if (!sector) {
            return;
        }
        this.#updateSectorControl(sector, (target) => {
            const factionIds = Object.keys(target.control);
            factionIds.forEach((factionId) => {
                target.clearControl(factionId);
            });
        });
    }

    #applyControlMapToSector(sector, controlMap) {
        if (!sector) {
            return;
        }
        this.#updateSectorControl(sector, (target) => {
            const factionIds = Object.keys(target.control);
            factionIds.forEach((factionId) => {
                target.clearControl(factionId);
            });
            if (!controlMap) {
                return;
            }
            Object.entries(controlMap).forEach(([factionId, rawValue]) => {
                if (!this.factions.has(factionId)) {
                    return;
                }
                const numericValue = Number(rawValue);
                if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    return;
                }
                target.setControl(factionId, numericValue);
            });
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

    #isSectorTargetingRestricted(sector) {
        if (!sector || sector.key !== R507_PROTECTED_KEY) {
            return false;
        }
        const uhfControl = Number(sector.getControlValue?.(galaxyUhfId)) || 0;
        return uhfControl <= R507_PROTECTED_CONTROL_THRESHOLD + R507_PROTECTED_CONTROL_TOLERANCE;
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

    #resolveSectorReference(sectorOrKey) {
        if (!sectorOrKey) {
            return null;
        }
        if (typeof sectorOrKey === 'string') {
            return this.sectors.get(sectorOrKey) || null;
        }
        if (typeof sectorOrKey === 'object') {
            const key = sectorOrKey.key;
            if (typeof key === 'string' && key) {
                return this.sectors.get(key) || sectorOrKey;
            }
            if (sectorOrKey.control && typeof sectorOrKey.getTotalControlValue === 'function') {
                return sectorOrKey;
            }
        }
        return null;
    }

    #collectSectorDefenseEntries(sector, originFactionId) {
        if (!sector) {
            return [];
        }
        const controlEntries = Object.entries(sector.control || {});
        const fallbackTotal = controlEntries.reduce((sum, [, rawValue]) => {
            const numeric = Number(rawValue);
            if (!Number.isFinite(numeric) || numeric <= 0) {
                return sum;
            }
            return sum + numeric;
        }, 0);
        const providedTotal = sector.getTotalControlValue?.();
        const totalControl = Number.isFinite(providedTotal) && providedTotal > 0
            ? providedTotal
            : fallbackTotal;
        const contributions = [];
        controlEntries.forEach(([factionId, rawValue]) => {
            if (!factionId || (originFactionId && factionId === originFactionId)) {
                return;
            }
            const faction = this.getFaction(factionId);
            if (!faction) {
                return;
            }
            const controlValue = Number(rawValue);
            const sanitizedControl = Number.isFinite(controlValue) && controlValue > 0 ? controlValue : 0;
            let baseDefense = Number(faction.getSectorDefense?.(sector, this));
            if (!Number.isFinite(baseDefense)) {
                baseDefense = 0;
            }
            if (factionId !== galaxyUhfId && !(baseDefense > 0)) {
                if (sanitizedControl > 0 && totalControl > 0) {
                    const sectorValue = Number(sector.getValue?.());
                    const sanitizedValue = Number.isFinite(sectorValue) && sectorValue > 0
                        ? sectorValue
                        : resolveDefaultSectorValue();
                    if (sanitizedValue > 0) {
                        baseDefense = sanitizedValue * (sanitizedControl / totalControl);
                    }
                }
                if (!(baseDefense > 0)) {
                    const fallbackValue = Number(sector.getValue?.());
                    if (Number.isFinite(fallbackValue) && fallbackValue > 0) {
                        baseDefense = fallbackValue;
                    }
                }
            }
            if (factionId === galaxyUhfId) {
                const totalDefense = baseDefense > 0 ? baseDefense : 0;
                const assignment = Number(faction.getDefenseAssignment?.(sector.key));
                const scale = Number(faction.getDefenseScale?.(this));
                const fleetDefense = Number.isFinite(assignment) && assignment > 0 && Number.isFinite(scale) && scale > 0
                    ? assignment * scale
                    : 0;
                const sanitizedFleet = fleetDefense > 0 ? fleetDefense : 0;
                const cappedFleet = sanitizedFleet > 0 ? Math.min(sanitizedFleet, totalDefense) : 0;
                const basePower = Math.max(0, totalDefense - cappedFleet);
                const fleetPower = cappedFleet;
                const totalPower = basePower + fleetPower;
                if (totalPower > 0) {
                    contributions.push({ factionId, basePower, fleetPower, totalPower });
                }
                return;
            }
            const assignment = Number(faction.getBorderFleetAssignment?.(sector.key));
            const fleetDefense = Number.isFinite(assignment) && assignment > 0 ? assignment : 0;
            const basePower = baseDefense > 0 ? baseDefense : 0;
            const fleetPower = fleetDefense > 0 ? fleetDefense : 0;
            const totalPower = basePower + fleetPower;
            if (totalPower > 0) {
                contributions.push({ factionId, basePower, fleetPower, totalPower });
            }
        });
        return contributions;
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
