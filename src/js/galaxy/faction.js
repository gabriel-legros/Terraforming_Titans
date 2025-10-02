if (typeof module !== 'undefined' && module.exports) {
    const sectorParametersModule = require('./sector-parameters');
    if (sectorParametersModule.getDefaultSectorValue) {
        factionDefaultSectorValue = sectorParametersModule.getDefaultSectorValue();
    } else if (Number.isFinite(sectorParametersModule.DEFAULT_SECTOR_VALUE) && sectorParametersModule.DEFAULT_SECTOR_VALUE > 0) {
        factionDefaultSectorValue = sectorParametersModule.DEFAULT_SECTOR_VALUE;
    }
}

if (typeof window !== 'undefined') {
    if (window.getGalaxySectorDefaultValue) {
        factionDefaultSectorValue = window.getGalaxySectorDefaultValue();
    } else if (Number.isFinite(window.galaxySectorDefaultValue) && window.galaxySectorDefaultValue > 0) {
        factionDefaultSectorValue = window.galaxySectorDefaultValue;
    }
}

if (typeof globalThis !== 'undefined') {
    if (globalThis.getGalaxySectorDefaultValue) {
        factionDefaultSectorValue = globalThis.getGalaxySectorDefaultValue();
    } else if (Number.isFinite(globalThis.galaxySectorDefaultValue) && globalThis.galaxySectorDefaultValue > 0) {
        factionDefaultSectorValue = globalThis.galaxySectorDefaultValue;
    }
}

if (!Number.isFinite(factionDefaultSectorValue) || factionDefaultSectorValue <= 0) {
    factionDefaultSectorValue = 100;
}

function getDefaultSectorValue() {
    return factionDefaultSectorValue;
}

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
        this.borderSectors = [];
        this.borderSectorLookup = new Set();
        this.borderCacheDirty = true;
        this.neighborEnemySectors = [];
        this.neighborEnemyLookup = new Set();
        this.neighborEnemyCacheDirty = true;
        this.contestedSectors = [];
        this.contestedSectorLookup = new Set();
        this.contestedCacheDirty = true;
        this.borderThreatLevels = new Map();
        this.contestedThreatLevels = new Map();
        this.defenseAssignments = new Map();
        this.defenseAssignmentsTotal = 0;
        this.manualDefenseTotal = 0;
        this.autoDefenseAssignments = new Map();
        this.autoDefenseTotal = 0;
        this.defenseStepSizes = new Map();
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
        let capacity = 0;
        if (this.id === UHF_FACTION_ID) {
            const terraformedWorlds = manager?.getTerraformedWorldCount?.() ?? 0;
            if (Number.isFinite(terraformedWorlds) && terraformedWorlds > 0) {
                const fleetPerWorld = typeof UHF_FLEET_PER_WORLD === 'number' && UHF_FLEET_PER_WORLD > 0
                    ? UHF_FLEET_PER_WORLD
                    : getDefaultSectorValue();
                const baseCapacity = terraformedWorlds * fleetPerWorld;
                if (baseCapacity > 0) {
                    const multiplier = manager?.getFleetCapacityMultiplier?.() ?? 1;
                    const sanitizedMultiplier = multiplier > 0 ? multiplier : 1;
                    capacity = baseCapacity * sanitizedMultiplier;
                }
            }
        } else {
            const sectors = manager?.getSectors?.();
            if (Array.isArray(sectors) && sectors.length > 0) {
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
                    const numericSectorValue = Number.isFinite(sectorValue) ? sectorValue : getDefaultSectorValue();
                    if (numericSectorValue <= 0) {
                        return;
                    }
                    total += numericSectorValue * (controlValue / totalControl);
                });
                capacity = total;
            }
        }
        this.fleetCapacity = capacity;
        if (this.fleetPower > capacity) {
            this.fleetPower = capacity;
        }
        if (this.fleetPower < 0) {
            this.fleetPower = 0;
        }
        if (this.id === UHF_FACTION_ID) {
            this.#syncDefenseAssignments(manager);
        }
    }

    update(deltaTime, manager) {
        this.updateFleetCapacity(manager);
        if ((this.contestedCacheDirty || this.neighborEnemyCacheDirty)
            && manager
            && typeof manager.getSectors === 'function') {
            this.#rebuildConflictCaches(manager);
        }
        if (this.id === UHF_FACTION_ID) {
            this.#syncDefenseAssignments(manager);
        }
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
        this.borderCacheDirty = true;
        this.neighborEnemyCacheDirty = true;
        this.contestedCacheDirty = true;
        this.borderThreatLevels = new Map();
        this.contestedThreatLevels = new Map();
    }

    resetControlCache() {
        this.controlledSectors = [];
        this.controlCacheDirty = true;
        this.borderSectors = [];
        this.borderSectorLookup = new Set();
        this.borderCacheDirty = true;
        this.neighborEnemySectors = [];
        this.neighborEnemyLookup = new Set();
        this.neighborEnemyCacheDirty = true;
        this.contestedSectors = [];
        this.contestedSectorLookup = new Set();
        this.contestedCacheDirty = true;
        this.borderThreatLevels = new Map();
        this.contestedThreatLevels = new Map();
    }

    markBorderDirty() {
        this.borderCacheDirty = true;
        this.neighborEnemyCacheDirty = true;
        this.contestedCacheDirty = true;
        this.borderThreatLevels = new Map();
        this.contestedThreatLevels = new Map();
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
            if (!(controlValue > BORDER_CONTROL_EPSILON)) {
                return;
            }
            const totalControl = sector?.getTotalControlValue?.() ?? 0;
            if (!(totalControl > 0)) {
                return;
            }
            if (totalControl - controlValue > BORDER_CONTROL_EPSILON) {
                return;
            }
            const dominant = sector?.getDominantController?.();
            if (!dominant || dominant.factionId !== this.id) {
                return;
            }
            keys.push(sector.key);
        });
        this.controlledSectors = keys;
        this.controlCacheDirty = false;
        return this.controlledSectors;
    }

    getBorderSectorKeys(manager) {
        if (!this.borderCacheDirty && Array.isArray(this.borderSectors)) {
            return this.borderSectors;
        }
        const sectors = manager?.getSectors?.();
        if (!Array.isArray(sectors) || sectors.length === 0) {
            this.borderSectors = [];
            this.borderSectorLookup = new Set();
            this.borderCacheDirty = false;
            return this.borderSectors;
        }
        const borderSet = new Set();
        sectors.forEach((sector) => {
            const controlValue = sector?.getControlValue?.(this.id) ?? 0;
            if (!(controlValue > BORDER_CONTROL_EPSILON)) {
                return;
            }
            const totalControl = sector?.getTotalControlValue?.() ?? 0;
            if (totalControl - controlValue > BORDER_CONTROL_EPSILON) {
                borderSet.add(sector.key);
                return;
            }
            if (!manager || typeof manager.getSector !== 'function') {
                return;
            }
            for (let index = 0; index < BORDER_HEX_NEIGHBOR_DIRECTIONS.length; index += 1) {
                const direction = BORDER_HEX_NEIGHBOR_DIRECTIONS[index];
                const neighbor = manager.getSector(sector.q + direction.q, sector.r + direction.r);
                if (!neighbor) {
                    continue;
                }
                const neighborTotal = neighbor?.getTotalControlValue?.() ?? 0;
                if (!(neighborTotal > 0)) {
                    continue;
                }
                const dominant = neighbor?.getDominantController?.();
                if (!dominant || dominant.factionId === this.id) {
                    continue;
                }
                const dominantControl = neighbor.getControlValue?.(dominant.factionId) ?? 0;
                if (Math.abs(dominantControl - neighborTotal) <= BORDER_CONTROL_EPSILON) {
                    borderSet.add(sector.key);
                    break;
                }
            }
        });
        this.borderSectors = Array.from(borderSet);
        this.borderSectorLookup = borderSet;
        this.borderCacheDirty = false;
        return this.borderSectors;
    }

    getContestedSectorKeys(manager) {
        if (!this.contestedCacheDirty && Array.isArray(this.contestedSectors)) {
            return this.contestedSectors;
        }
        this.#rebuildConflictCaches(manager);
        return this.contestedSectors;
    }

    getNeighborEnemySectorKeys(manager) {
        if (!this.neighborEnemyCacheDirty && Array.isArray(this.neighborEnemySectors)) {
            return this.neighborEnemySectors;
        }
        this.#rebuildConflictCaches(manager);
        return this.neighborEnemySectors;
    }

    getBorderThreatLevel(sectorKey) {
        if (!sectorKey) {
            return 0;
        }
        const threat = this.borderThreatLevels?.get?.(sectorKey);
        if (!Number.isFinite(threat) || threat <= 0) {
            return 0;
        }
        return threat;
    }

    getContestedThreatLevel(sectorKey) {
        if (!sectorKey) {
            return 0;
        }
        const threat = this.contestedThreatLevels?.get?.(sectorKey);
        if (!Number.isFinite(threat) || threat <= 0) {
            return 0;
        }
        return threat;
    }

    getDefenseCapacity(manager) {
        if (this.id !== UHF_FACTION_ID) {
            return 0;
        }
        const capacity = Number(this.fleetCapacity);
        if (!Number.isFinite(capacity) || capacity <= 0) {
            return 0;
        }
        return capacity;
    }

    getManualDefenseAssignment(sectorKey) {
        if (!sectorKey || this.id !== UHF_FACTION_ID) {
            return 0;
        }
        const manual = this.defenseAssignments.get(sectorKey);
        if (!Number.isFinite(manual) || manual <= 0) {
            return 0;
        }
        return manual;
    }

    getDefenseAssignment(sectorKey) {
        if (!sectorKey || this.id !== UHF_FACTION_ID) {
            return 0;
        }
        const manualValue = this.getManualDefenseAssignment(sectorKey);
        const auto = this.autoDefenseAssignments?.get?.(sectorKey);
        const autoValue = Number.isFinite(auto) && auto > 0 ? auto : 0;
        const total = manualValue + autoValue;
        if (!(total > 0)) {
            return 0;
        }
        return total;
    }

    getDefenseAssignmentTotal() {
        if (this.id !== UHF_FACTION_ID) {
            return 0;
        }
        const total = Number.isFinite(this.defenseAssignmentsTotal)
            ? this.defenseAssignmentsTotal
            : this.manualDefenseTotal + this.autoDefenseTotal;
        return Math.max(0, total);
    }

    getDefenseStep(sectorKey) {
        if (this.id !== UHF_FACTION_ID || !sectorKey) {
            return 1;
        }
        const value = this.defenseStepSizes.get(sectorKey);
        if (!Number.isFinite(value) || value <= 0) {
            return 1;
        }
        return Math.max(1, Math.floor(value));
    }

    getDefenseReservation(manager) {
        if (this.id !== UHF_FACTION_ID) {
            return 0;
        }
        this.#syncDefenseAssignments(manager);
        const assigned = this.getDefenseAssignmentTotal();
        if (!(assigned > 0)) {
            return 0;
        }
        const capacity = this.getDefenseCapacity(manager);
        const availableFleet = Number.isFinite(this.fleetPower) && this.fleetPower > 0 ? this.fleetPower : 0;
        if (!(availableFleet > 0)) {
            return 0;
        }
        const reservableCapacity = capacity > 0 ? Math.min(assigned, capacity) : assigned;
        if (!(reservableCapacity > 0)) {
            return 0;
        }
        const assignable = capacity > 0 ? Math.min(capacity, availableFleet) : availableFleet;
        const effectiveAssigned = Math.min(reservableCapacity, assignable);
        if (!(effectiveAssigned > 0)) {
            return 0;
        }
        return effectiveAssigned;
    }

    getDefenseScale(manager) {
        if (this.id !== UHF_FACTION_ID) {
            return 0;
        }
        const assigned = this.getDefenseAssignmentTotal();
        if (!(assigned > 0)) {
            return 0;
        }
        const reservation = this.getDefenseReservation(manager);
        if (!(reservation > 0)) {
            return 0;
        }
        const scale = reservation / assigned;
        if (!Number.isFinite(scale) || scale <= 0) {
            return 0;
        }
        return Math.min(1, scale);
    }

    getOperationalFleetPower(manager) {
        const available = Number.isFinite(this.fleetPower) && this.fleetPower > 0 ? this.fleetPower : 0;
        if (this.id !== UHF_FACTION_ID) {
            return available;
        }
        this.#syncDefenseAssignments(manager);
        if (!(this.autoDefenseTotal > 0)) {
            return 0;
        }
        const pool = Math.min(this.autoDefenseTotal, available);
        return pool > 0 ? pool : 0;
    }

    setDefenseAssignment(sectorKey, value, manager) {
        if (this.id !== UHF_FACTION_ID || !sectorKey) {
            return 0;
        }
        const numeric = Number(value);
        const sanitized = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
        const capacity = this.getDefenseCapacity(manager);
        let otherManualTotal = 0;
        this.defenseAssignments.forEach((rawValue, key) => {
            if (key === sectorKey) {
                return;
            }
            const manualValue = Number(rawValue);
            if (!Number.isFinite(manualValue) || manualValue <= 0) {
                return;
            }
            otherManualTotal += manualValue;
        });
        const remainingCapacity = capacity > 0
            ? Math.max(0, capacity - otherManualTotal)
            : 0;
        let applied = sanitized;
        if (!(capacity > 0)) {
            applied = 0;
        } else if (applied > remainingCapacity) {
            applied = remainingCapacity;
        }
        if (!(applied > 0)) {
            this.defenseAssignments.delete(sectorKey);
        } else {
            this.defenseAssignments.set(sectorKey, applied);
        }
        this.#syncDefenseAssignments(manager);
        const manualAssignment = this.defenseAssignments.get(sectorKey);
        if (!Number.isFinite(manualAssignment) || manualAssignment <= 0) {
            return 0;
        }
        return manualAssignment;
    }

    adjustDefenseAssignment(sectorKey, delta, manager) {
        const current = Number(this.defenseAssignments.get(sectorKey)) || 0;
        const numericDelta = Number(delta);
        const adjusted = Number.isFinite(numericDelta) ? current + numericDelta : current;
        return this.setDefenseAssignment(sectorKey, adjusted, manager);
    }

    setDefenseStep(sectorKey, value) {
        if (this.id !== UHF_FACTION_ID || !sectorKey) {
            return 1;
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            this.defenseStepSizes.delete(sectorKey);
            return 1;
        }
        const step = Math.max(1, Math.floor(numeric));
        this.defenseStepSizes.set(sectorKey, step);
        return step;
    }

    getSectorDefense(sector, manager) {
        this.#syncDefenseAssignments(manager);
        const controlValue = sector?.getControlValue?.(this.id) ?? 0;
        if (!(controlValue > 0)) {
            return 0;
        }
        if (this.id !== UHF_FACTION_ID) {
            const baseValue = sector?.getValue?.();
            if (Number.isFinite(baseValue) && baseValue > 0) {
                return baseValue;
            }
            return getDefaultSectorValue();
        }
        const worldCount = manager?.getTerraformedWorldCountForSector?.(sector) ?? 0;
        const baseDefense = worldCount > 0 ? 100 * worldCount : 0;
        const capacityMultiplier = manager?.getFleetCapacityMultiplier?.() ?? 1;
        const sanitizedMultiplier = capacityMultiplier > 0 ? capacityMultiplier : 1;
        const upgradedDefense = baseDefense * sanitizedMultiplier;
        const assignment = this.getDefenseAssignment(sector.key);
        const scale = this.getDefenseScale(manager);
        const effectiveAssignment = assignment > 0 && scale > 0 ? assignment * scale : 0;
        const totalDefense = upgradedDefense + effectiveAssignment;
        return Number.isFinite(totalDefense) && totalDefense > 0 ? totalDefense : 0;
    }

    toJSON() {
        const state = {
            id: this.id,
            fleetPower: this.fleetPower
        };
        if (this.id === UHF_FACTION_ID && this.defenseAssignments.size) {
            state.defenseAssignments = Array.from(this.defenseAssignments.entries()).map(([key, value]) => [key, value]);
        }
        if (this.id === UHF_FACTION_ID && this.defenseStepSizes.size) {
            state.defenseSteps = Array.from(this.defenseStepSizes.entries()).map(([key, value]) => [key, value]);
        }
        return state;
    }

    loadState(state, manager) {
        this.resetControlCache();
        this.updateFleetCapacity(manager);
        if (!state || state.id !== this.id) {
            this.markControlDirty();
            return;
        }
        this.setFleetPower(state.fleetPower);
        if (this.id === UHF_FACTION_ID) {
            this.defenseAssignments.clear();
            if (Array.isArray(state?.defenseAssignments)) {
                state.defenseAssignments.forEach((entry) => {
                    if (!Array.isArray(entry) || entry.length !== 2) {
                        return;
                    }
                    const [sectorKey, rawValue] = entry;
                    const numericValue = Number(rawValue);
                    if (!sectorKey || !Number.isFinite(numericValue) || numericValue <= 0) {
                        return;
                    }
                    this.defenseAssignments.set(String(sectorKey), numericValue);
                });
            }
            this.defenseStepSizes.clear();
            if (Array.isArray(state?.defenseSteps)) {
                state.defenseSteps.forEach((entry) => {
                    if (!Array.isArray(entry) || entry.length !== 2) {
                        return;
                    }
                    const [sectorKey, rawValue] = entry;
                    const numericValue = Number(rawValue);
                    if (!sectorKey || !Number.isFinite(numericValue) || numericValue <= 0) {
                        return;
                    }
                    this.defenseStepSizes.set(String(sectorKey), Math.max(1, Math.floor(numericValue)));
                });
            }
            this.#syncDefenseAssignments(manager);
        }
        this.markControlDirty();
    }

    #getDefenseSector(sectorKey, manager) {
        if (!sectorKey || !manager?.getSector) {
            return null;
        }
        const parts = String(sectorKey).split(',');
        if (parts.length !== 2) {
            return null;
        }
        const q = Number(parts[0]);
        const r = Number(parts[1]);
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return null;
        }
        return manager.getSector(q, r);
    }

    #syncDefenseAssignments(manager) {
        if (this.id !== UHF_FACTION_ID) {
            if (this.defenseAssignments.size > 0) {
                this.defenseAssignments.clear();
            }
            if (this.autoDefenseAssignments.size > 0) {
                this.autoDefenseAssignments.clear();
            }
            this.defenseAssignmentsTotal = 0;
            this.manualDefenseTotal = 0;
            this.autoDefenseTotal = 0;
            return;
        }
        const capacity = this.getDefenseCapacity(manager);
        const validEntries = [];
        let manualTotal = 0;
        this.defenseAssignments.forEach((rawValue, key) => {
            const value = Number(rawValue);
            if (!Number.isFinite(value) || value <= 0) {
                this.defenseAssignments.delete(key);
                return;
            }
            if (manager) {
                const sector = this.#getDefenseSector(key, manager);
                const control = sector?.getControlValue?.(this.id) ?? 0;
                if (!(control > BORDER_CONTROL_EPSILON)) {
                    this.defenseAssignments.delete(key);
                    return;
                }
            }
            validEntries.push([key, value]);
            manualTotal += value;
        });
        if (!(capacity > 0)) {
            if (this.defenseAssignments.size > 0) {
                this.defenseAssignments.clear();
            }
            if (this.autoDefenseAssignments.size > 0) {
                this.autoDefenseAssignments.clear();
            }
            this.defenseAssignmentsTotal = 0;
            this.manualDefenseTotal = 0;
            this.autoDefenseTotal = 0;
            return;
        }
        if (manualTotal > capacity && manualTotal > 0) {
            const scale = capacity / manualTotal;
            let scaledTotal = 0;
            validEntries.forEach(([key, value]) => {
                const scaled = value * scale;
                if (scaled > 0) {
                    this.defenseAssignments.set(key, scaled);
                    scaledTotal += scaled;
                } else {
                    this.defenseAssignments.delete(key);
                }
            });
            manualTotal = scaledTotal;
        }
        this.manualDefenseTotal = manualTotal;
        this.autoDefenseAssignments.clear();
        this.autoDefenseTotal = 0;
        const availableFleet = Number.isFinite(this.fleetPower) && this.fleetPower > 0 ? this.fleetPower : 0;
        const assignableCapacity = capacity > 0 ? Math.min(capacity, availableFleet) : availableFleet;
        const autoPool = assignableCapacity > manualTotal
            ? assignableCapacity - manualTotal
            : 0;
        if (autoPool > 0) {
            const borderKeys = this.getBorderSectorKeys(manager);
            if (Array.isArray(borderKeys) && borderKeys.length > 0) {
                const eligibleKeys = [];
                borderKeys.forEach((key) => {
                    if (!key) {
                        return;
                    }
                    if (!manager) {
                        eligibleKeys.push(key);
                        return;
                    }
                    const sector = this.#getDefenseSector(key, manager);
                    const control = sector?.getControlValue?.(this.id) ?? 0;
                    if (control > BORDER_CONTROL_EPSILON) {
                        eligibleKeys.push(key);
                    }
                });
                const count = eligibleKeys.length;
                if (count > 0) {
                    const baseShare = autoPool / count;
                    let remaining = autoPool;
                    eligibleKeys.forEach((key, index) => {
                        const isLast = index === count - 1;
                        let allocation = isLast ? remaining : baseShare;
                        if (!isLast) {
                            remaining -= allocation;
                            if (remaining < 0) {
                                remaining = 0;
                            }
                        }
                        if (!(allocation > 0)) {
                            return;
                        }
                        this.autoDefenseAssignments.set(key, allocation);
                        this.autoDefenseTotal += allocation;
                    });
                }
            }
        }
        if (!(this.autoDefenseTotal > 0)) {
            this.autoDefenseTotal = 0;
        }
        this.defenseAssignmentsTotal = this.manualDefenseTotal + this.autoDefenseTotal;
    }

    #rebuildConflictCaches(manager) {
        const sectors = manager?.getSectors?.();
        if (!Array.isArray(sectors) || sectors.length === 0) {
            this.contestedSectors = [];
            this.contestedSectorLookup = new Set();
            this.contestedCacheDirty = false;
            this.neighborEnemySectors = [];
            this.neighborEnemyLookup = new Set();
            this.neighborEnemyCacheDirty = false;
            this.borderThreatLevels = new Map();
            this.contestedThreatLevels = new Map();
            return;
        }
        const sectorMap = new Map();
        sectors.forEach((sector) => {
            if (sector?.key) {
                sectorMap.set(sector.key, sector);
            }
        });
        const contestedSet = new Set();
        const neighborSet = new Set();
        const borderSet = new Set();
        const factionThreatCache = new Map();
        const resolveFactionThreat = (factionId) => {
            if (!factionId || factionId === this.id) {
                return 0;
            }
            if (factionThreatCache.has(factionId)) {
                return factionThreatCache.get(factionId);
            }
            const faction = manager?.getFaction?.(factionId) || null;
            const controlledKeys = faction?.getControlledSectorKeys?.(manager);
            const threatValue = Array.isArray(controlledKeys) ? controlledKeys.length : 0;
            const sanitizedThreat = Number.isFinite(threatValue) && threatValue > 0 ? threatValue : 0;
            factionThreatCache.set(factionId, sanitizedThreat);
            return sanitizedThreat;
        };
        const registerThreat = (map, key, threat) => {
            if (!key || !(threat > 0)) {
                return;
            }
            const current = map.get(key) || 0;
            if (threat > current) {
                map.set(key, threat);
            }
        };
        const borderThreatMap = new Map();
        const contestedThreatMap = new Map();
        const getNeighbor = (sector, direction) => {
            const neighbor = manager?.getSector?.(sector.q + direction.q, sector.r + direction.r);
            if (neighbor) {
                return neighbor;
            }
            const key = `${sector.q + direction.q},${sector.r + direction.r}`;
            return sectorMap.get(key) || null;
        };
        sectors.forEach((sector) => {
            const ownControl = sector?.getControlValue?.(this.id) ?? 0;
            if (!(ownControl > BORDER_CONTROL_EPSILON)) {
                return;
            }
            const totalControl = sector?.getTotalControlValue?.() ?? 0;
            let borderCandidate = false;
            if (totalControl - ownControl > BORDER_CONTROL_EPSILON) {
                contestedSet.add(sector.key);
                borderCandidate = true;
            }
            for (let index = 0; index < BORDER_HEX_NEIGHBOR_DIRECTIONS.length; index += 1) {
                const direction = BORDER_HEX_NEIGHBOR_DIRECTIONS[index];
                const neighbor = getNeighbor(sector, direction);
                if (!neighbor) {
                    continue;
                }
                const neighborTotal = neighbor.getTotalControlValue?.() ?? 0;
                if (neighborTotal > 0 && !borderCandidate) {
                    const dominant = neighbor.getDominantController?.();
                    if (dominant && dominant.factionId !== this.id) {
                        const dominantControl = neighbor.getControlValue?.(dominant.factionId) ?? 0;
                        if (Math.abs(dominantControl - neighborTotal) <= BORDER_CONTROL_EPSILON) {
                            borderCandidate = true;
                        }
                    }
                }
                const neighborBreakdown = neighbor.getControlBreakdown?.();
                if (!Array.isArray(neighborBreakdown) || neighborBreakdown.length === 0) {
                    continue;
                }
                const ownNeighborControl = neighbor.getControlValue?.(this.id) ?? 0;
                if (ownNeighborControl > BORDER_CONTROL_EPSILON
                    && neighborTotal - ownNeighborControl > BORDER_CONTROL_EPSILON) {
                    contestedSet.add(neighbor.key);
                }
                let hasEnemyPresence = false;
                neighborBreakdown.forEach((entry) => {
                    if (!entry || entry.factionId === this.id || !(entry.value > BORDER_CONTROL_EPSILON)) {
                        return;
                    }
                    hasEnemyPresence = true;
                });
                if (hasEnemyPresence) {
                    neighborSet.add(neighbor.key);
                }
            }
            if (borderCandidate) {
                borderSet.add(sector.key);
            }
        });
        const threatTargets = new Set(borderSet);
        contestedSet.forEach((key) => {
            threatTargets.add(key);
        });
        threatTargets.forEach((key) => {
            const sector = sectorMap.get(key);
            if (!sector) {
                return;
            }
            let highestThreat = 0;
            const evaluateThreat = (breakdown) => {
                if (!Array.isArray(breakdown) || breakdown.length === 0) {
                    return;
                }
                breakdown.forEach((entry) => {
                    if (!entry || entry.factionId === this.id || !(entry.value > BORDER_CONTROL_EPSILON)) {
                        return;
                    }
                    const threat = resolveFactionThreat(entry.factionId);
                    if (threat > highestThreat) {
                        highestThreat = threat;
                    }
                });
            };
            for (let index = 0; index < BORDER_HEX_NEIGHBOR_DIRECTIONS.length; index += 1) {
                const direction = BORDER_HEX_NEIGHBOR_DIRECTIONS[index];
                const neighbor = getNeighbor(sector, direction);
                if (!neighbor) {
                    continue;
                }
                const breakdown = neighbor.getControlBreakdown?.();
                evaluateThreat(breakdown);
            }
            if (contestedSet.has(key)) {
                const breakdown = sector.getControlBreakdown?.();
                evaluateThreat(breakdown);
            }
            if (contestedSet.has(key)) {
                registerThreat(contestedThreatMap, key, highestThreat);
            }
            if (borderSet.has(key)) {
                registerThreat(borderThreatMap, key, highestThreat);
            }
        });
        this.contestedSectors = Array.from(contestedSet);
        this.contestedSectorLookup = contestedSet;
        this.contestedCacheDirty = false;
        this.neighborEnemySectors = Array.from(neighborSet);
        this.neighborEnemyLookup = neighborSet;
        this.neighborEnemyCacheDirty = false;
        this.borderThreatLevels = borderThreatMap;
        this.contestedThreatLevels = contestedThreatMap;
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
