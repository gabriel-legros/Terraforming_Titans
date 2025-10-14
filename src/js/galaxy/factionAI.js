const AUTO_OPERATION_INTERVAL_MS = 60000;
const DEFAULT_AUTO_OPERATION_MIN_PERCENT = 0.05;
const DEFAULT_AUTO_OPERATION_MAX_PERCENT = 0.15;
const CEWINSII_FACTION_ID = 'cewinsii';
const THREAT_PRIORITY_THRESHOLD = 40;

const HEX_NEIGHBOR_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];

let GalaxyFactionBaseClass = globalScope?.GalaxyFaction;
let uhfFactionId = globalScope?.UHF_FACTION_ID ?? 'uhf';

if (globalScope?.module?.exports) {
    ({ GalaxyFaction: GalaxyFactionBaseClass, UHF_FACTION_ID: uhfFactionId } = require('./faction'));
}

class GalaxyFactionAI extends GalaxyFactionBaseClass {
    constructor(options = {}) {
        super(options);
        this.borderFleetAssignments = new Map();
        this.autoOperationTimer = 0;
        this.defensiveness = this.#sanitizeDefensiveness(options?.defensiveness);
        this.pendingOperationPower = 0;
        this.autoOperationRange = this.#sanitizeOperationRange(options?.autoOperationRange);
        const startingCount = Number.isFinite(this.startingSectors?.size)
            ? this.startingSectors.size
            : 0;
        const providedOriginalCount = this.#coerceOriginalCount(options?.originalControlledSectorCount);
        this.originalControlledSectorCount = providedOriginalCount !== null && providedOriginalCount > startingCount
            ? providedOriginalCount
            : Math.max(0, startingCount);
        const providedAdoption = this.#coerceAdoption(options?.electronicAdoption);
        this.electronicAdoption = providedAdoption !== null ? providedAdoption : 0;
        const providedDoctrine = this.#coerceAdoption(options?.uhfDoctrineAdoption);
        this.uhfDoctrineAdoption = providedDoctrine !== null ? providedDoctrine : 0;
        if (this.id === CEWINSII_FACTION_ID) {
            this.electronicAdoption = 0;
        }
    }

    update(deltaTime, manager) {
        super.update(deltaTime, manager);
        if (this.id === uhfFactionId) {
            this.borderFleetAssignments.clear();
            return;
        }
        this.#updateAutoOperations(deltaTime, manager);
        this.#distributeFleetToBorders(manager);
    }

    updateFleetCapacity(manager) {
        super.updateFleetCapacity(manager);
        const doctrine = this.#updateDoctrineAdoption(manager);
        const baseCapacity = Number.isFinite(this.fleetCapacity) ? Math.max(0, this.fleetCapacity) : 0;
        if (!(baseCapacity > 0)) {
            this.fleetCapacity = 0;
            return;
        }
        const adoption = this.#coerceAdoption(this.electronicAdoption);
        const sanitizedAdoption = adoption !== null ? adoption : 0;
        const sanitizedDoctrine = doctrine !== null ? doctrine : 0;
        const multiplier = 1 + sanitizedAdoption * 5 + sanitizedDoctrine * 5;
        if (!(multiplier > 0)) {
            this.fleetCapacity = baseCapacity;
            return;
        }
        const adjustedCapacity = baseCapacity * multiplier;
        this.fleetCapacity = adjustedCapacity;
        if (this.fleetPower > adjustedCapacity) {
            this.fleetPower = adjustedCapacity;
        }
    }

    getBorderFleetAssignment(sectorKey) {
        if (!sectorKey) {
            return 0;
        }
        const assignment = this.borderFleetAssignments.get(sectorKey);
        return Number.isFinite(assignment) && assignment > 0 ? assignment : 0;
    }

    getControlledSectorKeys(manager) {
        const needsUpdate = !!this.controlCacheDirty;
        const keys = super.getControlledSectorKeys(manager);
        if (needsUpdate) {
            this.#handleControlCacheRebuild(keys);
        }
        return keys;
    }

    #updateAutoOperations(deltaTime, manager) {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }
        this.autoOperationTimer += deltaTime;
        if (this.autoOperationTimer < AUTO_OPERATION_INTERVAL_MS) {
            return;
        }
        while (this.autoOperationTimer >= AUTO_OPERATION_INTERVAL_MS) {
            this.autoOperationTimer -= AUTO_OPERATION_INTERVAL_MS;
            this.#launchAutoOperation(manager);
            this.pendingOperationPower = this.#rollOperationPower();
        }
    }

    #launchAutoOperation(manager) {
        const launcher = manager?.startOperation;
        if (typeof launcher !== 'function') {
            return false;
        }
        const operationPower = this.#resolveOperationPower();
        if (!(operationPower > 0)) {
            return false;
        }
        const defensiveFloor = this.#computeDefensiveFloor();
        const operationalPower = typeof this.getOperationalFleetPower === 'function'
            ? this.getOperationalFleetPower(manager)
            : Math.max(0, this.fleetPower);
        const availablePower = Math.max(0, operationalPower - defensiveFloor);
        if (availablePower < operationPower) {
            return false;
        }
        const targetKey = this.#pickAutoOperationTarget(manager);
        if (!targetKey) {
            return false;
        }
        const operation = launcher.call(manager, {
            sectorKey: targetKey,
            factionId: this.id,
            assignedPower: operationPower
        });
        if (!operation) {
            return false;
        }
        this.pendingOperationPower = 0;
        return true;
    }

    #pickAutoOperationTarget(manager) {
        const candidateMap = this.#gatherTargetCandidates(manager);
        if (!candidateMap.size) {
            return null;
        }
        const weightedTargets = [];
        candidateMap.forEach((keys, factionId) => {
            const threat = this.#computeFactionThreat(factionId, manager);
            if (!(threat > 0)) {
                return;
            }
            const targetableKeys = Array.from(keys).filter((key) => this.#isEnemySectorKey(key, manager));
            if (!targetableKeys.length) {
                return;
            }
            weightedTargets.push({ factionId, threat, keys: targetableKeys });
        });
        if (!weightedTargets.length) {
            return null;
        }
        const selfThreat = this.#computeSelfThreat(manager);
        const highThreatTargets = weightedTargets.filter((entry) => entry.threat > THREAT_PRIORITY_THRESHOLD);
        const prioritizedTargets = highThreatTargets.length > 0 && !(selfThreat > THREAT_PRIORITY_THRESHOLD)
            ? highThreatTargets
            : weightedTargets;
        if (!prioritizedTargets.length) {
            return null;
        }
        const totalThreat = prioritizedTargets.reduce((sum, entry) => sum + entry.threat, 0);
        if (!(totalThreat > 0)) {
            return null;
        }
        let roll = Math.random() * totalThreat;
        for (let index = 0; index < prioritizedTargets.length; index += 1) {
            const entry = prioritizedTargets[index];
            roll -= entry.threat;
            if (roll <= 0) {
                return this.#selectTargetSectorKey(entry.keys, entry.factionId, manager);
            }
        }
        const fallback = prioritizedTargets[prioritizedTargets.length - 1];
        if (!fallback || !fallback.keys.length) {
            return null;
        }
        return this.#selectTargetSectorKey(fallback.keys, fallback.factionId, manager);
    }

    #isEnemySectorKey(key, manager) {
        const sector = this.#getSectorFromKey(key, manager);
        if (!sector) {
            return false;
        }
        const breakdown = sector.getControlBreakdown?.();
        if (!Array.isArray(breakdown) || !breakdown.length) {
            return false;
        }
        if (manager?.getOperationForSector?.(key)?.status === 'running') {
            return false;
        }
        return breakdown.some((entry) => entry?.factionId && entry.factionId !== this.id);
    }

    #getSectorFromKey(key, manager) {
        if (!key) {
            return null;
        }
        const parts = key.split(',');
        if (parts.length !== 2) {
            return null;
        }
        const q = Number(parts[0]);
        const r = Number(parts[1]);
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return null;
        }
        return manager?.getSector?.(q, r) || null;
    }

    #gatherTargetCandidates(manager) {
        const candidateMap = new Map();
        const addCandidate = (factionId, key) => {
            if (!factionId || factionId === this.id || !key) {
                return;
            }
            let entry = candidateMap.get(factionId);
            if (!entry) {
                entry = new Set();
                candidateMap.set(factionId, entry);
            }
            entry.add(key);
        };
        const collectFromKeys = (keys) => {
            if (!Array.isArray(keys)) {
                return;
            }
            keys.forEach((key) => {
                if (!key || manager?.getOperationForSector?.(key)?.status === 'running') {
                    return;
                }
                const sector = this.#getSectorFromKey(key, manager);
                if (!sector) {
                    return;
                }
                const breakdown = sector.getControlBreakdown?.();
                if (!Array.isArray(breakdown)) {
                    return;
                }
                breakdown.forEach((entry) => {
                    if (!entry || !(entry.value > FULL_CONTROL_EPSILON)) {
                        return;
                    }
                    addCandidate(entry.factionId, key);
                });
            });
        };
        collectFromKeys(this.getContestedSectorKeys(manager));
        collectFromKeys(this.getNeighborEnemySectorKeys(manager));
        return candidateMap;
    }

    #selectTargetSectorKey(candidateKeys, targetFactionId, manager) {
        if (!Array.isArray(candidateKeys) || candidateKeys.length === 0) {
            return null;
        }
        const candidateSet = new Set(candidateKeys);
        const contestedPick = this.#pickBestCachedSector(
            this.getContestedSectorKeys(manager),
            candidateSet,
            targetFactionId,
            manager,
            true
        );
        if (contestedPick) {
            return contestedPick;
        }
        return this.#pickBestCachedSector(
            this.getNeighborEnemySectorKeys(manager),
            candidateSet,
            targetFactionId,
            manager,
            false
        );
    }

    #pickBestCachedSector(keys, candidateSet, targetFactionId, manager, requireOwnControl) {
        if (!Array.isArray(keys) || keys.length === 0) {
            return null;
        }
        let bestScore = -Infinity;
        let bestKeys = [];
        for (let index = 0; index < keys.length; index += 1) {
            const key = keys[index];
            if (!candidateSet.has(key)) {
                continue;
            }
            if (manager?.getOperationForSector?.(key)?.status === 'running') {
                continue;
            }
            const sector = this.#getSectorFromKey(key, manager);
            if (!sector) {
                continue;
            }
            const breakdown = sector.getControlBreakdown?.();
            if (!Array.isArray(breakdown) || breakdown.length === 0) {
                continue;
            }
            let ownControl = 0;
            let targetControl = 0;
            for (let breakdownIndex = 0; breakdownIndex < breakdown.length; breakdownIndex += 1) {
                const entry = breakdown[breakdownIndex];
                if (!entry || !Number.isFinite(entry.value)) {
                    continue;
                }
                if (entry.factionId === this.id) {
                    ownControl = entry.value;
                } else if (entry.factionId === targetFactionId) {
                    targetControl = entry.value;
                }
            }
            if (!(targetControl > FULL_CONTROL_EPSILON)) {
                continue;
            }
            if (requireOwnControl && !(ownControl > FULL_CONTROL_EPSILON)) {
                continue;
            }
            const neighborScore = this.#countControlledNeighbors(sector, manager);
            if (neighborScore > bestScore) {
                bestScore = neighborScore;
                bestKeys = [key];
                continue;
            }
            if (neighborScore === bestScore) {
                bestKeys.push(key);
            }
        }
        if (bestKeys.length === 0) {
            return null;
        }
        const index = Math.floor(Math.random() * bestKeys.length);
        return bestKeys[index] || null;
    }

    #countControlledNeighbors(sector, manager) {
        if (!sector) {
            return 0;
        }
        let count = 0;
        for (let index = 0; index < HEX_NEIGHBOR_DIRECTIONS.length; index += 1) {
            const direction = HEX_NEIGHBOR_DIRECTIONS[index];
            const neighbor = manager?.getSector?.(sector.q + direction.q, sector.r + direction.r);
            if (!neighbor) {
                continue;
            }
            const totalControl = neighbor.getTotalControlValue?.();
            if (!(totalControl > 0)) {
                continue;
            }
            const ownControl = neighbor.getControlValue?.(this.id) ?? 0;
            if (Math.abs(ownControl - totalControl) <= FULL_CONTROL_EPSILON) {
                count += 1;
            }
        }
        return count;
    }

    #computeFactionThreat(factionId, manager) {
        if (!factionId || factionId === this.id) {
            return 0;
        }
        const faction = manager?.getFaction?.(factionId) || null;
        if (!faction) {
            return 0;
        }
        const controlledKeys = faction.getControlledSectorKeys?.(manager);
        if (!Array.isArray(controlledKeys)) {
            return 0;
        }
        const controlledCount = controlledKeys.length;
        if (!(controlledCount > 0)) {
            return 0;
        }
        const originalCount = this.#resolveInitialControlledCount(faction);
        const threatFactionId = faction?.id || factionId;
        if (threatFactionId !== uhfFactionId && originalCount > 0 && controlledCount <= originalCount * 0.5) {
            return 0;
        }
        return controlledCount;
    }

    #computeSelfThreat(manager) {
        const controlledKeys = this.getControlledSectorKeys?.(manager);
        if (!Array.isArray(controlledKeys)) {
            return 0;
        }
        const controlledCount = controlledKeys.length;
        if (!(controlledCount > 0)) {
            return 0;
        }
        const originalCount = this.#resolveInitialControlledCount(this);
        if (this.id !== uhfFactionId && originalCount > 0 && controlledCount <= originalCount * 0.5) {
            return 0;
        }
        return controlledCount;
    }

    #resolveInitialControlledCount(faction) {
        const originalCount = this.#coerceOriginalCount(faction?.originalControlledSectorCount);
        if (originalCount !== null && originalCount > 0) {
            return originalCount;
        }
        const startingSectors = faction?.getStartingSectors?.();
        if (Array.isArray(startingSectors) && startingSectors.length > 0) {
            return startingSectors.length;
        }
        return 0;
    }

    #distributeFleetToBorders(manager) {
        const borderKeys = this.getBorderSectorKeys(manager);
        const assignments = new Map();
        if (!Array.isArray(borderKeys) || borderKeys.length === 0) {
            this.borderFleetAssignments = assignments;
            return;
        }
        const fleetPower = Number.isFinite(this.fleetPower) ? Math.max(0, this.fleetPower) : 0;
        const weights = borderKeys.map((key) => {
            const threat = this.getBorderThreatLevel(key);
            if (!Number.isFinite(threat) || threat <= 0) {
                return 0;
            }
            return threat;
        });
        const totalWeight = weights.reduce((sum, value) => sum + value, 0);
        if (!(totalWeight > 0)) {
            const fallback = borderKeys.length > 0 ? fleetPower / borderKeys.length : 0;
            borderKeys.forEach((key) => {
                assignments.set(key, fallback);
            });
            this.borderFleetAssignments = assignments;
            return;
        }
        borderKeys.forEach((key, index) => {
            const weight = weights[index];
            if (weight <= 0) {
                assignments.set(key, 0);
                return;
            }
            const share = (fleetPower * weight) / totalWeight;
            assignments.set(key, share > 0 ? share : 0);
        });
        this.borderFleetAssignments = assignments;
    }

    #sanitizeDefensiveness(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return 0;
        }
        if (numericValue >= 1) {
            return 1;
        }
        return numericValue;
    }

    #computeDefensiveFloor() {
        const capacity = Number.isFinite(this.fleetCapacity) ? Math.max(0, this.fleetCapacity) : 0;
        if (!(capacity > 0) || !(this.defensiveness > 0)) {
            return 0;
        }
        return capacity * this.defensiveness;
    }

    #resolveOperationPower() {
        const capacity = Number.isFinite(this.fleetCapacity) ? Math.max(0, this.fleetCapacity) : 0;
        if (!(capacity > 0)) {
            this.pendingOperationPower = 0;
            return 0;
        }
        const defensiveFloor = this.#computeDefensiveFloor();
        const maxAssignable = Math.max(0, capacity - defensiveFloor);
        if (!(maxAssignable > 0)) {
            this.pendingOperationPower = 0;
            return 0;
        }
        if (!(this.pendingOperationPower > 0)) {
            this.pendingOperationPower = this.#rollOperationPower(capacity);
            if (this.pendingOperationPower > maxAssignable) {
                this.pendingOperationPower = Math.max(1, Math.floor(maxAssignable));
            }
        }
        return Math.max(0, Math.min(this.pendingOperationPower, maxAssignable));
    }

    #rollOperationPower() {
        const capacity = Number.isFinite(this.fleetCapacity) ? Math.max(0, this.fleetCapacity) : 0;
        const minPercent = this.autoOperationRange.min;
        const maxPercent = this.autoOperationRange.max;
        const spread = Math.max(0, maxPercent - minPercent);
        const percent = spread > 0 ? minPercent + Math.random() * spread : minPercent;
        const power = capacity * percent;
        if (!Number.isFinite(power) || power <= 0) {
            return 0;
        }
        return Math.max(1, Math.round(power));
    }

    #sanitizeOperationRange(range) {
        const sanitized = {
            min: DEFAULT_AUTO_OPERATION_MIN_PERCENT,
            max: DEFAULT_AUTO_OPERATION_MAX_PERCENT
        };
        const providedMin = Number(range?.min);
        if (Number.isFinite(providedMin) && providedMin > 0) {
            sanitized.min = providedMin;
        }
        const providedMax = Number(range?.max);
        if (Number.isFinite(providedMax) && providedMax > sanitized.min) {
            sanitized.max = providedMax;
            return sanitized;
        }
        const fallbackMax = Math.max(sanitized.min, DEFAULT_AUTO_OPERATION_MAX_PERCENT);
        sanitized.max = fallbackMax > sanitized.min ? fallbackMax : sanitized.min;
        return sanitized;
    }

    toJSON() {
        const baseState = super.toJSON();
        baseState.electronicAdoption = this.#coerceAdoption(this.electronicAdoption) ?? 0;
        baseState.uhfDoctrineAdoption = this.#coerceAdoption(this.uhfDoctrineAdoption) ?? 0;
        baseState.originalControlledSectorCount = this.#coerceOriginalCount(this.originalControlledSectorCount) ?? 0;
        return baseState;
    }

    loadState(state, manager) {
        super.loadState(state, manager);
        const savedOriginalCount = this.#coerceOriginalCount(state?.originalControlledSectorCount);
        if (savedOriginalCount !== null && savedOriginalCount > this.originalControlledSectorCount) {
            this.originalControlledSectorCount = savedOriginalCount;
        }
        const savedAdoption = this.#coerceAdoption(state?.electronicAdoption);
        if (this.id === CEWINSII_FACTION_ID) {
            this.electronicAdoption = 0;
        } else if (savedAdoption !== null && savedAdoption > this.electronicAdoption) {
            this.electronicAdoption = savedAdoption;
        }
        const savedDoctrine = this.#coerceAdoption(state?.uhfDoctrineAdoption);
        if (savedDoctrine !== null && savedDoctrine > this.uhfDoctrineAdoption) {
            this.uhfDoctrineAdoption = savedDoctrine;
        }
    }

    #handleControlCacheRebuild(keys) {
        const currentCount = Array.isArray(keys) ? keys.length : 0;
        if (!(this.originalControlledSectorCount > 0) || currentCount > this.originalControlledSectorCount) {
            this.originalControlledSectorCount = Math.max(currentCount, this.originalControlledSectorCount || 0);
        }
        if (this.id === CEWINSII_FACTION_ID) {
            this.electronicAdoption = 0;
            return;
        }
        if (!(this.originalControlledSectorCount > 0)) {
            this.electronicAdoption = 0;
            return;
        }
        const halfwayPoint = this.originalControlledSectorCount * 0.5;
        if (currentCount > halfwayPoint) {
            return;
        }
        let adoption;
        if (currentCount <= 0) {
            adoption = 1;
        } else {
            const difference = (this.originalControlledSectorCount*0.5 - currentCount) / (this.originalControlledSectorCount*0.5);
            adoption = Math.max(0, Math.min(1, difference));
        }
        if (adoption > this.electronicAdoption) {
            this.electronicAdoption = adoption;
        }
    }

    #coerceAdoption(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return null;
        }
        if (numeric === 0) {
            return 0;
        }
        if (numeric <= 1) {
            return numeric;
        }
        return Math.min(1, numeric / 100);
    }

    #resolveUhfThreat(manager) {
        if (!manager || typeof manager.getFaction !== 'function') {
            return 0;
        }
        const uhfFaction = manager.getFaction(uhfFactionId);
        if (!uhfFaction || typeof uhfFaction.getControlledSectorKeys !== 'function') {
            return 0;
        }
        const controlledKeys = uhfFaction.getControlledSectorKeys(manager);
        if (!Array.isArray(controlledKeys)) {
            return 0;
        }
        return controlledKeys.length;
    }

    #updateDoctrineAdoption(manager) {
        const current = this.#coerceAdoption(this.uhfDoctrineAdoption) ?? 0;
        const threat = this.#resolveUhfThreat(manager);
        if (!(threat > 0)) {
            this.uhfDoctrineAdoption = current;
            return current;
        }
        const normalized = Math.max(0, Math.min(1, threat / 40));
        const updated = normalized > current ? normalized : current;
        this.uhfDoctrineAdoption = updated;
        return updated;
    }

    #coerceOriginalCount(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return null;
        }
        if (numeric === 0) {
            return 0;
        }
        return Math.floor(numeric);
    }
}

if (globalScope) {
    globalScope.GalaxyFactionAI = GalaxyFactionAI;
}

try {
    module.exports = {
        GalaxyFactionAI
    };
} catch (error) {
    // Ignore module resolution issues outside CommonJS environments.
}
