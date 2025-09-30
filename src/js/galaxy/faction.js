const UHF_FACTION_ID = 'uhf';
const DEFAULT_SECTOR_VALUE = 100;
const REPLACEMENT_SECONDS = 3600;

class GalaxyFaction {
    constructor({ id, name, color, startingSectors } = {}) {
        this.id = id || '';
        this.name = name || '';
        this.color = color || '#ffffff';
        this.startingSectors = new Set();
        if (Array.isArray(startingSectors)) {
            startingSectors.forEach((sectorKey) => {
                if (typeof sectorKey === 'string' && sectorKey) {
                    this.startingSectors.add(sectorKey);
                }
            });
        }
        this.fleetCapacity = 0;
        this.fleetPower = 0;
        this.controlledSectors = [];
        this.controlCacheDirty = true;
    }

    getStartingSectors() {
        return Array.from(this.startingSectors);
    }

    getMapBackground() {
        const rgba = this.#toRgba(0.82);
        const darker = this.#toRgba(0.56);
        if (!rgba || !darker) {
            return this.color;
        }
        return `linear-gradient(160deg, ${rgba}, ${darker})`;
    }

    getHoverBackground() {
        const rgba = this.#toRgba(0.92);
        const darker = this.#toRgba(0.7);
        if (!rgba || !darker) {
            return this.color;
        }
        return `linear-gradient(160deg, ${rgba}, ${darker})`;
    }

    getBorderColor() {
        const rgba = this.#toRgba(0.9);
        return rgba || this.color;
    }

    #toRgba(alpha) {
        if (typeof this.color !== 'string') {
            return null;
        }
        const hex = this.color.trim();
        if (!hex.startsWith('#')) {
            return null;
        }
        const normalized = hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex;
        if (normalized.length !== 7) {
            return null;
        }
        const r = parseInt(normalized.slice(1, 3), 16);
        const g = parseInt(normalized.slice(3, 5), 16);
        const b = parseInt(normalized.slice(5, 7), 16);
        if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
            return null;
        }
        const clampedAlpha = Math.max(0, Math.min(1, alpha));
        return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
    }

    initializeFleetPower(manager) {
        this.updateFleetCapacity(manager);
        if (this.id === UHF_FACTION_ID) {
            this.fleetPower = 0;
            return;
        }
        this.fleetPower = this.fleetCapacity;
    }

    setFleetPower(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            return;
        }
        const clamped = Math.max(0, Math.min(this.fleetCapacity, numericValue));
        this.fleetPower = clamped;
    }

    updateFleetCapacity(manager) {
        const capacity = this.#computeFleetCapacity(manager);
        this.fleetCapacity = capacity;
        if (this.fleetPower > capacity) {
            this.fleetPower = capacity;
        }
        if (this.fleetPower < 0) {
            this.fleetPower = 0;
        }
    }

    update(deltaTime, manager) {
        this.updateFleetCapacity(manager);
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }
        const capacity = this.fleetCapacity;
        if (capacity <= 0) {
            this.fleetPower = 0;
            return;
        }
        const currentPower = Math.max(0, Math.min(capacity, this.fleetPower));
        if (currentPower === capacity) {
            this.fleetPower = capacity;
            return;
        }
        const seconds = deltaTime / 1000;
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return;
        }
        const deficit = capacity - currentPower;
        const baseChange = (deficit * seconds) / REPLACEMENT_SECONDS;
        if (baseChange === 0) {
            this.fleetPower = currentPower;
            return;
        }
        const halfCapacity = capacity * 0.5;
        let penalty = 0;
        if (currentPower > halfCapacity && halfCapacity > 0) {
            penalty = Math.min(1, (currentPower - halfCapacity) / halfCapacity);
        }
        const multiplier = 1 - penalty;
        const delta = baseChange * multiplier;
        const nextPower = currentPower + delta;
        this.fleetPower = Math.max(0, Math.min(capacity, nextPower));
    }

    markControlDirty() {
        this.controlCacheDirty = true;
    }

    resetControlCache() {
        this.controlledSectors = [];
        this.controlCacheDirty = true;
    }

    getControlledSectorKeys(manager) {
        if (!this.controlCacheDirty && Array.isArray(this.controlledSectors)) {
            return this.controlledSectors;
        }
        const sectors = manager?.getSectors?.();
        if (!Array.isArray(sectors) || sectors.length === 0) {
            this.controlledSectors = [];
            this.controlCacheDirty = false;
            return this.controlledSectors;
        }
        const keys = [];
        sectors.forEach((sector) => {
            const controlValue = sector?.getControlValue?.(this.id) ?? 0;
            if (controlValue > 0) {
                keys.push(sector.key);
            }
        });
        this.controlledSectors = keys;
        this.controlCacheDirty = false;
        return this.controlledSectors;
    }

    getSectorDefense(sector, manager) {
        const controlValue = sector?.getControlValue?.(this.id) ?? 0;
        if (!(controlValue > 0)) {
            return 0;
        }
        if (this.id !== UHF_FACTION_ID) {
            return 0;
        }
        const worldCount = manager?.getTerraformedWorldCountForSector?.(sector) ?? 0;
        const baseDefense = worldCount > 0 ? 100 * worldCount : 0;
        const capacityMultiplier = manager?.getFleetCapacityMultiplier?.() ?? 1;
        const sanitizedMultiplier = capacityMultiplier > 0 ? capacityMultiplier : 1;
        const upgradedDefense = baseDefense * sanitizedMultiplier;
        const controlledKeys = this.getControlledSectorKeys(manager);
        const sectorCount = controlledKeys.length;
        const distributedFleet = sectorCount > 0 ? (Number.isFinite(this.fleetPower) ? Math.max(0, this.fleetPower) / sectorCount : 0) : 0;
        const totalDefense = upgradedDefense + distributedFleet;
        return Number.isFinite(totalDefense) && totalDefense > 0 ? totalDefense : 0;
    }

    toJSON() {
        return {
            id: this.id,
            fleetPower: this.fleetPower
        };
    }

    loadState(state, manager) {
        this.updateFleetCapacity(manager);
        if (!state || state.id !== this.id) {
            return;
        }
        this.setFleetPower(state.fleetPower);
    }

    #computeFleetCapacity(manager) {
        if (this.id === UHF_FACTION_ID) {
            const terraformedWorlds = manager?.getTerraformedWorldCount?.() ?? 0;
            if (!Number.isFinite(terraformedWorlds) || terraformedWorlds <= 0) {
                return 0;
            }
            const baseCapacity = terraformedWorlds * DEFAULT_SECTOR_VALUE;
            if (!(baseCapacity > 0)) {
                return 0;
            }
            const multiplier = manager?.getFleetCapacityMultiplier?.() ?? 1;
            const sanitizedMultiplier = multiplier > 0 ? multiplier : 1;
            return baseCapacity * sanitizedMultiplier;
        }
        const sectors = manager?.getSectors?.();
        if (!Array.isArray(sectors) || sectors.length === 0) {
            return 0;
        }
        let total = 0;
        sectors.forEach((sector) => {
            const controlValue = sector?.getControlValue?.(this.id);
            const totalControl = sector?.getTotalControlValue?.();
            if (!Number.isFinite(controlValue) || controlValue <= 0) {
                return;
            }
            if (!Number.isFinite(totalControl) || totalControl <= 0) {
                return;
            }
            const sectorValue = sector?.getValue?.();
            const numericSectorValue = Number.isFinite(sectorValue) ? sectorValue : DEFAULT_SECTOR_VALUE;
            if (numericSectorValue <= 0) {
                return;
            }
            total += numericSectorValue * (controlValue / totalControl);
        });
        return total;
    }
}

function updateFactions(deltaTime) {
    const manager = this || null;
    const factions = manager?.getFactions?.();
    if (!Array.isArray(factions) || factions.length === 0) {
        return;
    }
    factions.forEach((faction) => {
        faction?.update?.(deltaTime, manager);
    });
}

const globalScope = (() => {
    try {
        return globalThis;
    } catch (error) {
        return undefined;
    }
})();

if (globalScope) {
    globalScope.GalaxyFaction = GalaxyFaction;
    globalScope.updateFactions = updateFactions;
    globalScope.UHF_FACTION_ID = UHF_FACTION_ID;
}

try {
    module.exports = {
        GalaxyFaction,
        updateFactions,
        UHF_FACTION_ID
    };
} catch (error) {
    // Ignore module resolution issues outside CommonJS environments.
}
