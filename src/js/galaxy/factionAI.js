const globalScope = (() => {
    try {
        return globalThis;
    } catch (error) {
        return undefined;
    }
})();

let GalaxyFactionBaseClass = globalScope?.GalaxyFaction;
let uhfFactionId = globalScope?.UHF_FACTION_ID ?? 'uhf';

if (globalScope?.module?.exports) {
    ({ GalaxyFaction: GalaxyFactionBaseClass, UHF_FACTION_ID: uhfFactionId } = require('./faction'));
}

class GalaxyFactionAI extends GalaxyFactionBaseClass {
    constructor(options = {}) {
        super(options);
        this.borderFleetAssignments = new Map();
    }

    update(deltaTime, manager) {
        super.update(deltaTime, manager);
        if (this.id === uhfFactionId) {
            this.borderFleetAssignments.clear();
            return;
        }
        this.#distributeFleetToBorders(manager);
    }

    getBorderFleetAssignment(sectorKey) {
        if (!sectorKey) {
            return 0;
        }
        const assignment = this.borderFleetAssignments.get(sectorKey);
        return Number.isFinite(assignment) && assignment > 0 ? assignment : 0;
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
