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
        if ((this.contestedCacheDirty || this.neighborEnemyCacheDirty)
            && manager
            && typeof manager.getSectors === 'function') {
            this.#rebuildConflictCaches(manager);
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

    getSectorDefense(sector, manager) {
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
        const borderKeys = this.getBorderSectorKeys(manager);
        const borderCount = borderKeys.length;
        const hasBorderPresence = borderCount > 0 && this.borderSectorLookup?.has?.(sector.key);
        let distributedFleet = 0;
        if (hasBorderPresence && borderCount > 0) {
            const availablePower = Number.isFinite(this.fleetPower) ? Math.max(0, this.fleetPower) : 0;
            if (availablePower > 0) {
                const evenShare = availablePower / borderCount;
                distributedFleet = Number.isFinite(evenShare) && evenShare > 0 ? evenShare : 0;
            }
        }
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
        this.resetControlCache();
        this.updateFleetCapacity(manager);
        if (!state || state.id !== this.id) {
            this.markControlDirty();
            return;
        }
        this.setFleetPower(state.fleetPower);
        this.markControlDirty();
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
            for (let index = 0; index < BORDER_HEX_NEIGHBOR_DIRECTIONS.length; index += 1) {
                const direction = BORDER_HEX_NEIGHBOR_DIRECTIONS[index];
                const neighbor = getNeighbor(sector, direction);
                if (!neighbor) {
                    continue;
                }
                const breakdown = neighbor.getControlBreakdown?.();
                if (!Array.isArray(breakdown) || breakdown.length === 0) {
                    continue;
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

    #computeFleetCapacity(manager) {
        if (this.id === UHF_FACTION_ID) {
            const terraformedWorlds = manager?.getTerraformedWorldCount?.() ?? 0;
            if (!Number.isFinite(terraformedWorlds) || terraformedWorlds <= 0) {
                return 0;
            }
            const baseCapacity = terraformedWorlds * getDefaultSectorValue();
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
            const numericSectorValue = Number.isFinite(sectorValue) ? sectorValue : getDefaultSectorValue();
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
