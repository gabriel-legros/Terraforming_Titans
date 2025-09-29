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
            operations
        };
    }

    loadState(state) {
        this.initialize();
        if (state && typeof state.enabled === 'boolean') {
            this.enabled = state.enabled;
        }
        if (state && Array.isArray(state.sectors)) {
            this.sectors.forEach((sector) => {
                sector.replaceControl({});
            });
            this.#applyFactionStartingControl();
            state.sectors.forEach((sectorData) => {
                const sector = this.getSector(sectorData.q, sectorData.r);
                if (!sector) {
                    return;
                }
                sector.replaceControl(sectorData.control);
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

    startOperation({ sectorKey, assignedPower, durationMs, successChance }) {
        if (!sectorKey || !Number.isFinite(assignedPower) || assignedPower <= 0) {
            return null;
        }
        const key = sectorKey;
        const existing = this.operations.get(key);
        if (existing && existing.status === 'running') {
            return existing;
        }
        const faction = this.getFaction(galaxyUhfId);
        if (!faction) {
            return null;
        }
        const availablePower = Math.max(0, faction.fleetPower);
        if (assignedPower > availablePower) {
            return null;
        }
        const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : GALAXY_OPERATION_DURATION_MS;
        const sanitizedSuccess = Math.max(0, Math.min(1, Number(successChance)));
        const operation = {
            sectorKey: key,
            assignedPower,
            reservedPower: assignedPower,
            durationMs: duration,
            elapsedMs: 0,
            successChance: sanitizedSuccess,
            failureChance: 1 - sanitizedSuccess,
            status: 'running'
        };
        faction.setFleetPower(availablePower - assignedPower);
        this.operations.set(key, operation);
        return operation;
    }

    getTerraformedWorldCount() {
        return spaceManager?.getTerraformedPlanetCount?.() ?? 0;
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

    #applyFactionStartingControl() {
        this.sectors.forEach((sector) => {
            sector.replaceControl({});
        });
        this.factions.forEach((faction) => {
            faction.getStartingSectors().forEach((sectorKey) => {
                const sector = this.sectors.get(sectorKey);
                if (!sector) {
                    return;
                }
                sector.setControl(faction.id, 100);
            });
        });
        Object.entries(galaxySectorControlOverridesConfig).forEach(([sectorKey, controlMap]) => {
            const sector = this.sectors.get(sectorKey);
            if (!sector) {
                return;
            }
            const entries = Object.entries(controlMap || {});
            const sanitized = [];
            entries.forEach(([factionId, value]) => {
                if (!factionId || !this.factions.has(factionId)) {
                    return;
                }
                const numericValue = Number(value);
                if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    return;
                }
                sanitized.push([factionId, numericValue]);
            });
            if (!sanitized.length) {
                return;
            }
            sector.replaceControl({});
            sanitized.forEach(([factionId, numericValue]) => {
                sector.setControl(factionId, numericValue);
            });
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

    #serializeOperation(operation) {
        if (!operation) {
            return null;
        }
        return {
            sectorKey: operation.sectorKey,
            assignedPower: operation.assignedPower,
            reservedPower: operation.reservedPower,
            durationMs: operation.durationMs,
            elapsedMs: operation.elapsedMs,
            successChance: operation.successChance,
            failureChance: operation.failureChance,
            status: operation.status
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
        const successChance = Math.max(0, Math.min(1, Number(state.successChance)));
        const failureChance = Math.max(0, Math.min(1, Number(state.failureChance)));
        const operation = {
            sectorKey: state.sectorKey,
            assignedPower,
            reservedPower,
            durationMs: duration,
            elapsedMs: elapsed,
            successChance,
            failureChance: failureChance || (1 - successChance),
            status: state.status === 'running' && elapsed < duration ? 'running' : 'completed'
        };

        this.operations.set(operation.sectorKey, operation);

        if (operation.status === 'running') {
            const faction = this.getFaction(galaxyUhfId);
            if (faction) {
                const availablePower = Math.max(0, faction.fleetPower);
                const reserved = Math.min(operation.reservedPower, availablePower);
                faction.setFleetPower(availablePower - reserved);
                operation.reservedPower = reserved;
                operation.assignedPower = Math.min(operation.assignedPower, reserved);
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
        const faction = this.getFaction(galaxyUhfId);
        if (operation.status !== 'running') {
            operation.status = 'completed';
        }
        const failureChance = Math.max(0, Math.min(1, operation.failureChance ?? (1 - operation.successChance)));
        const losses = Math.max(0, Math.min(operation.reservedPower, operation.reservedPower * failureChance));
        const returningPower = Math.max(0, operation.reservedPower - losses);
        if (faction) {
            const nextPower = Math.max(0, faction.fleetPower + returningPower);
            faction.setFleetPower(nextPower);
        }

        const successChance = Math.max(0, Math.min(1, operation.successChance));
        const isSuccessful = successChance >= 1 || (successChance > 0 && Math.random() < successChance);
        if (isSuccessful) {
            this.#applyOperationSuccess(operation);
        }
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
        const currentUhf = sector.getControlValue(galaxyUhfId);
        const totalControl = sector.getTotalControlValue();
        const otherTotal = Math.max(0, totalControl - currentUhf);
        if (!(otherTotal > 0)) {
            return;
        }
        const targetGain = totalControl > 0 ? totalControl * 0.1 : sector.getValue() * 0.1;
        const gain = Math.min(otherTotal, targetGain);
        if (!(gain > 0)) {
            return;
        }
        const entries = Object.entries(sector.control).filter(([factionId, value]) => {
            return factionId !== galaxyUhfId && Number(value) > 0;
        });
        if (!entries.length) {
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
                sector.clearControl(factionId);
                return;
            }
            const factionsRemaining = entries.length - index;
            const share = factionsRemaining > 0 ? remainingReduction / factionsRemaining : remainingReduction;
            const reduction = Math.min(numericValue, share);
            const nextValue = numericValue - reduction;
            remainingReduction -= reduction;
            if (nextValue > 0) {
                sector.setControl(factionId, nextValue);
            } else {
                sector.clearControl(factionId);
            }
        });
        const appliedGain = gain - Math.max(0, remainingReduction);
        const newUhfValue = currentUhf + appliedGain;
        sector.setControl(galaxyUhfId, newUhfValue);
    }
}

if (typeof window !== 'undefined') {
    window.GalaxyManager = GalaxyManager;
}
if (typeof globalThis !== 'undefined') {
    globalThis.GalaxyManager = GalaxyManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxyManager };
}
