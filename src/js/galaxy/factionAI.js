const AUTO_OPERATION_INTERVAL_MS = 60000;
const AUTO_OPERATION_POWER = 100;

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
        }
    }

    #launchAutoOperation(manager) {
        const launcher = manager?.startOperation;
        if (typeof launcher !== 'function') {
            return false;
        }
        if (!(this.fleetPower >= AUTO_OPERATION_POWER)) {
            return false;
        }
        const targetKey = this.#pickAutoOperationTarget(manager);
        if (!targetKey) {
            return false;
        }
        const operation = launcher.call(manager, {
            sectorKey: targetKey,
            factionId: this.id,
            assignedPower: AUTO_OPERATION_POWER
        });
        return !!operation;
    }

    #pickAutoOperationTarget(manager) {
        const contested = this.getContestedSectorKeys(manager);
        const neighbors = this.getNeighborEnemySectorKeys(manager);
        const candidates = new Set();
        if (Array.isArray(contested)) {
            contested.forEach((key) => {
                if (key) {
                    candidates.add(key);
                }
            });
        }
        if (Array.isArray(neighbors)) {
            neighbors.forEach((key) => {
                if (key) {
                    candidates.add(key);
                }
            });
        }
        if (!candidates.size) {
            return null;
        }
        const validTargets = Array.from(candidates).filter((key) => this.#isEnemySectorKey(key, manager));
        if (!validTargets.length) {
            return null;
        }
        const index = Math.floor(Math.random() * validTargets.length);
        return validTargets[index] || null;
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
