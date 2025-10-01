const AUTO_OPERATION_INTERVAL_MS = 60000;
const AUTO_OPERATION_MIN_PERCENT = 0.05;
const AUTO_OPERATION_MAX_PERCENT = 0.15;
const FULL_CONTROL_EPSILON = 1e-6;

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

    getBorderFleetAssignment(sectorKey) {
        if (!sectorKey) {
            return 0;
        }
        const assignment = this.borderFleetAssignments.get(sectorKey);
        return Number.isFinite(assignment) && assignment > 0 ? assignment : 0;
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
        const availablePower = Math.max(0, this.fleetPower) - defensiveFloor;
        if (!(availablePower >= operationPower)) {
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
        const totalThreat = weightedTargets.reduce((sum, entry) => sum + entry.threat, 0);
        if (!(totalThreat > 0)) {
            return null;
        }
        let roll = Math.random() * totalThreat;
        for (let index = 0; index < weightedTargets.length; index += 1) {
            const entry = weightedTargets[index];
            roll -= entry.threat;
            if (roll <= 0) {
                const candidateKeys = entry.keys;
                if (!candidateKeys.length) {
                    continue;
                }
                const keyIndex = Math.floor(Math.random() * candidateKeys.length);
                return candidateKeys[keyIndex] || null;
            }
        }
        const fallback = weightedTargets[weightedTargets.length - 1];
        if (!fallback || !fallback.keys.length) {
            return null;
        }
        const fallbackIndex = Math.floor(Math.random() * fallback.keys.length);
        return fallback.keys[fallbackIndex] || null;
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
        return controlledKeys.length;
    }

    #distributeFleetToBorders(manager) {
        const borderKeys = this.getBorderSectorKeys(manager);
        const assignments = new Map();
        if (!Array.isArray(borderKeys) || borderKeys.length === 0) {
            this.borderFleetAssignments = assignments;
            return;
        }
        const fleetPower = Number.isFinite(this.fleetPower) ? Math.max(0, this.fleetPower) : 0;
        const perSector = fleetPower / borderKeys.length;
        borderKeys.forEach((key) => {
            assignments.set(key, perSector);
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
        const minPercent = AUTO_OPERATION_MIN_PERCENT;
        const maxPercent = AUTO_OPERATION_MAX_PERCENT;
        const spread = Math.max(0, maxPercent - minPercent);
        const percent = minPercent + Math.random() * spread;
        const power = capacity * percent;
        if (!Number.isFinite(power) || power <= 0) {
            return 0;
        }
        return Math.max(1, Math.round(power));
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
