let operationAutoThresholdDefault = DEFAULT_OPERATION_AUTO_THRESHOLD;

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
        this.controlledSectorCache = [];
        this.controlledSectorCacheDirty = true;
        this.controlledSectorCacheVersion = 0;
        this.controlledSectorWorldCountCache = {};
        this.hasEverControlledWholeGalaxyFlag = false;
        this.fleetUpgradePurchases = {};
        GALAXY_FLEET_UPGRADE_KEYS.forEach((key) => {
            this.fleetUpgradePurchases[key] = 0;
        });
        this.successfulOperations = 0;
        const operationHooks = {
            uhfFactionId: UHF_FACTION_ID,
            hasNeighboringStronghold: (sector, factionId) => this.#hasNeighboringStronghold(sector, factionId),
            hasFactionPresence: (sector, factionId) => this.#hasFactionPresence(sector, factionId),
            isFactionFullControlSector: (sector, factionId) => this.#isFactionFullControlSector(sector, factionId),
            isSectorTargetingRestricted: (sector) => this.#isSectorTargetingRestricted(sector),
            updateSectorControl: (sector, mutator) => this.#updateSectorControl(sector, mutator),
            getDefenseSummary: (sector, attackerId, targetFactionId) => this.getSectorDefenseSummary(
                sector,
                attackerId,
                targetFactionId
            ),
            resolveTargetFaction: (sector, attackerId) => this.getOperationTargetFaction(sector, attackerId),
            onOperationSuccess: () => {
                this.successfulOperations += 1;
            },
            refreshUI: () => {
                if (typeof updateGalaxyUI === 'function') {
                    updateGalaxyUI();
                }
            }
        };
        this.operationManager = new GalaxyOperationManager(this, {
            ...operationHooks
        });
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
        updateFactions.call(this, deltaMs);
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
        warpGateNetworkManager.setGalaxyUnlocked(true);
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
            hasEverControlledWholeGalaxyFlag: this.hasEverControlledWholeGalaxy(),
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
                sector.setOriginalControllerId?.(sectorData.originalControllerId);
                if (sectorData.lastFullControllerId) {
                    sector.setLastFullControllerId?.(sectorData.lastFullControllerId);
                }
                const warpGateLevel = Math.min(
                    1000000,
                    Math.max(0, Math.floor(Number(sectorData.warpGateNetworkLevel ?? 0) || 0))
                );
                sector.warpGateNetworkLevel = warpGateLevel;
                sector.warpGateNetworkProgress = Math.max(
                    0,
                    Number(sectorData.warpGateNetworkProgress ?? 0) || 0
                );
                this.#updateSectorControlMemory(sector);
                if (!sector.lastFullControllerId) {
                    sector.setLastFullControllerId?.(sector.originalControllerId || sector.getDominantController?.()?.factionId);
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
        this.hasEverControlledWholeGalaxyFlag = state?.hasEverControlledWholeGalaxyFlag === true;
        if (state && Number.isFinite(state.successfulOperations)) {
            this.successfulOperations = Math.max(0, state.successfulOperations);
        }
        if (this.isGalaxyFullyControlledByUhf()) {
            this.hasEverControlledWholeGalaxyFlag = true;
        }
        if (this.operationManager) {
            this.operationManager.loadState(state);
        }
        this.factions.forEach((faction) => {
            faction.updateFleetCapacity(this);
        });
        this.refreshUIVisibility();
        this.#updateIncomingAttackWarning();
        artificialManager?.refreshConditionalRingStarCoreUnlocks?.();
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
        this.markControlledSectorCacheDirty();
        this.hasEverControlledWholeGalaxyFlag = false;
        if (this.operationManager) {
            this.operationManager.reset();
        }
        this.initialize();
        this.enable();
        this.#updateIncomingAttackWarning();
    }

    getSector(q, r) {
        return this.sectors.get(GalaxySector.createKey(q, r)) || null;
    }

    getSectors() {
        return Array.from(this.sectors.values());
    }

    getTotalSectorCount() {
        return this.sectors.size || generateSectorCoordinates(this.radius).length;
    }

    getUhfControlledSectors() {
        if (!this.controlledSectorCacheDirty) {
            return this.controlledSectorCache;
        }
        const controlled = [];
        this.sectors.forEach((sector) => {
            if (this.#isFactionFullControlSector(sector, UHF_FACTION_ID)) {
                controlled.push(sector);
            }
        });
        this.controlledSectorCache = controlled;
        this.controlledSectorCacheDirty = false;
        this.#updateWholeGalaxyControlFlag(controlled.length);
        return this.controlledSectorCache;
    }

    getControlledSectorCacheVersion() {
        return this.controlledSectorCacheVersion;
    }

    isGalaxyFullyControlledByUhf() {
        return this.getUhfControlledSectors().length >= this.getTotalSectorCount();
    }

    hasEverControlledWholeGalaxy() {
        if (this.controlledSectorCacheDirty) {
            this.getUhfControlledSectors();
        }
        return this.hasEverControlledWholeGalaxyFlag === true;
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

    getSectorDefensePower(sectorKey, attackerId, targetFactionId) {
        if (!sectorKey) {
            return 0;
        }
        const sector = this.sectors.get(sectorKey);
        if (!sector) {
            return 0;
        }
        const resolvedTarget = targetFactionId || this.getOperationTargetFaction(sector, attackerId);
        const summary = this.getSectorDefenseSummary(sector, attackerId, resolvedTarget);
        return summary.totalPower;
    }

    getSectorDefenseSummary(sectorOrKey, originFactionId, targetFactionId) {
        const sector = this.#resolveSectorReference(sectorOrKey);
        if (!sector) {
            return {
                basePower: 0,
                fleetPower: 0,
                totalPower: 0,
                contributions: []
            };
        }
        const contributions = this.#collectSectorDefenseEntries(sector, originFactionId, targetFactionId);
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

    getManualDefenseAssignment(sectorKey, factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getManualDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.getManualDefenseAssignment(sectorKey);
    }

    getDefenseAssignment(sectorKey, factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.getDefenseAssignment(sectorKey);
    }

    setDefenseAssignment({ factionId = UHF_FACTION_ID, sectorKey, value }) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.setDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.setDefenseAssignment(sectorKey, value, this);
    }

    adjustDefenseAssignment({ factionId = UHF_FACTION_ID, sectorKey, delta }) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.adjustDefenseAssignment !== 'function') {
            return 0;
        }
        return faction.adjustDefenseAssignment(sectorKey, delta, this);
    }

    clearDefenseAssignments(factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        return faction.clearDefenseAssignments(this);
    }

    getDefenseCapacity(factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseCapacity !== 'function') {
            return 0;
        }
        return faction.getDefenseCapacity(this);
    }

    getDefenseAssignmentTotal(factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseAssignmentTotal !== 'function') {
            return 0;
        }
        return faction.getDefenseAssignmentTotal();
    }

    getRecentAttackHistory(limit = 5) {
        return this.operationManager ? this.operationManager.getRecentAttackHistory(limit) : [];
    }

    getDefenseReservation(factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseReservation !== 'function') {
            return 0;
        }
        return faction.getDefenseReservation(this);
    }

    getDefenseStep(sectorKey, factionId = UHF_FACTION_ID) {
        const faction = this.getFaction(factionId);
        if (!faction || typeof faction.getDefenseStep !== 'function') {
            return 1;
        }
        return faction.getDefenseStep(sectorKey);
    }

    setDefenseStep({ factionId = UHF_FACTION_ID, sectorKey, value }) {
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

    getOperationSuccessChance({ sectorKey, factionId, assignedPower, targetFactionId }) {
        if (!this.operationManager) {
            return 0;
        }
        return this.operationManager.getOperationSuccessChance({
            sectorKey,
            factionId,
            assignedPower,
            targetFactionId
        });
    }

    getOperationLossEstimate({
        sectorKey,
        factionId,
        assignedPower,
        reservedPower,
        offensePower,
        defensePower,
        targetFactionId
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
            defensePower,
            targetFactionId
        });
    }

    getOperationTargetFaction(sectorOrKey, attackerId = UHF_FACTION_ID) {
        const sector = this.#resolveSectorReference(sectorOrKey);
        if (!sector) {
            return null;
        }
        const summary = this.getSectorDefenseSummary(sector, attackerId);
        const contributions = summary?.contributions;
        let targetId = null;
        let targetPower = Infinity;
        const evaluateTarget = (factionId) => {
            if (!factionId || factionId === attackerId) {
                return;
            }
            const defenderSummary = this.getSectorDefenseSummary(sector, attackerId, factionId);
            const power = Number(defenderSummary.totalPower);
            const totalPower = Number.isFinite(power) && power >= 0 ? power : 0;
            if (totalPower < targetPower || (totalPower === targetPower && (!targetId || factionId.localeCompare(targetId) < 0))) {
                targetId = factionId;
                targetPower = totalPower;
            }
        };
        if (Array.isArray(contributions) && contributions.length) {
            contributions.forEach((entry) => evaluateTarget(entry?.factionId));
        }
        if (!targetId) {
            const controlEntries = Object.keys(sector.control || {});
            controlEntries.forEach((factionId) => evaluateTarget(factionId));
        }
        return targetId;
    }

    getReservedOperationPower(factionId) {
        if (!this.operationManager) {
            return 0;
        }
        return this.operationManager.getReservedOperationPower(factionId);
    }

    startOperation({ sectorKey, factionId, assignedPower, durationMs, successChance, targetFactionId }) {
        if (!this.operationManager) {
            return null;
        }
        const operation = this.operationManager.startOperation({
            sectorKey,
            factionId,
            assignedPower,
            durationMs,
            successChance,
            targetFactionId
        });
        this.#updateIncomingAttackWarning();
        return operation;
    }

    getFleetCapacityWorldCount() {
        if (spaceManager?.getFleetCapacityWorldCount) {
            return spaceManager.getFleetCapacityWorldCount();
        }
        return spaceManager?.getTerraformedPlanetCount?.() ?? 0;
    }

    getTerraformedWorldCount() {
        return spaceManager?.getTerraformedPlanetCount?.() ?? 0;
    }

    getTerraformedWorldCountForSector(sector) {
        const label = sector.getDisplayName();
        const baseCount = Number(spaceManager.getWorldCountPerSector(label)) || 0;
        const rewardCount = this.#isFactionFullControlSector(sector, UHF_FACTION_ID)
            ? this.getSectorRewardWorldCount(sector)
            : 0;
        return baseCount + rewardCount;
    }

    getSectorRewardWorldCount(sector) {
        const rewards = sector.getSectorReward();
        let total = 0;
        rewards.forEach((entry) => {
            const amount = Number(entry?.amount) || 0;
            if (amount <= 0) {
                return;
            }
            const descriptors = [entry?.type || '', entry?.resourceId || '', entry?.label || ''];
            const hasWorldDescriptor = descriptors.some((descriptor) => String(descriptor).toLowerCase().includes('world'));
            if (hasWorldDescriptor) {
                total += amount;
            }
        });
        return total;
    }

    #getWorldRewardCountFromSector(sector) {
        const rewards = sector?.getSectorReward?.();
        if (!Array.isArray(rewards) || rewards.length === 0) {
            return 0;
        }
        let total = 0;
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
        return total;
    }

    #getFullyControlledSectorsForFaction(factionId) {
        if (factionId === UHF_FACTION_ID) {
            return this.getUhfControlledSectors();
        }
        const faction = this.factions.get(factionId);
        if (!faction || typeof faction.getControlledSectorKeys !== 'function') {
            return [];
        }
        const keys = faction.getControlledSectorKeys(this);
        if (!Array.isArray(keys) || keys.length === 0) {
            return [];
        }
        const controlled = [];
        keys.forEach((key) => {
            const sector = this.sectors.get(key);
            if (sector) {
                controlled.push(sector);
            }
        });
        return controlled;
    }

    getControlledSectorWorldCount(factionId = UHF_FACTION_ID) {
        const targetFaction = factionId || UHF_FACTION_ID;
        if (
            !this.controlledSectorCacheDirty &&
            this.controlledSectorWorldCountCache[targetFaction] !== undefined
        ) {
            return this.controlledSectorWorldCountCache[targetFaction];
        }

        const controlledSectors = this.#getFullyControlledSectorsForFaction(targetFaction);
        let total = 0;
        controlledSectors.forEach((sector) => {
            total += this.#getWorldRewardCountFromSector(sector);
        });
        this.controlledSectorWorldCountCache[targetFaction] = total;
        return total;
    }

    getFleetUpgradeCount(key) {
        const count = this.fleetUpgradePurchases[key];
        if (!Number.isFinite(count) || count <= 0) {
            return 0;
        }
        return count;
    }

    getFleetUpgradeIncrement(key) {
        const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[key];
        const increment = Number(definition?.increment);
        if (Number.isFinite(increment) && increment > 0) {
            return increment;
        }
        return FLEET_UPGRADE_INCREMENT;
    }

    getFleetUpgradeMultiplier(key) {
        const base = 1 + (this.getFleetUpgradeCount(key) * this.getFleetUpgradeIncrement(key));
        return base > 0 ? base : 1;
    }

    getFleetUpgradeTotalMultiplier() {
        return GALAXY_FLEET_UPGRADE_KEYS.reduce(
            (total, key) => total * this.getFleetUpgradeMultiplier(key),
            1
        );
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
        const upgradeMultiplier = this.getFleetUpgradeTotalMultiplier();
        return effectMultiplier * upgradeMultiplier;
    }

    getFleetUpgradeCost(key) {
        const definition = GALAXY_FLEET_UPGRADE_DEFINITIONS[key];
        if (!definition) {
            return 0;
        }
        const count = this.getFleetUpgradeCount(key);
        const nextIndex = count + 1;
        if (definition.costType === 'skill') {
            return 1;
        }
        if (definition.costType === 'resource') {
            return definition.baseCost * nextIndex * nextIndex;
        }
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
        const faction = this.getFaction(UHF_FACTION_ID);
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
                increment: this.getFleetUpgradeIncrement(key),
                purchases,
                multiplier,
                cost,
                costLabel: definition.costLabel,
                affordable: this.canPurchaseFleetUpgrade(key)
            };
        });
    }

    getUhfControlRatio() {
        const controlled = this.getUhfControlledSectors().length;
        return Math.min(1, controlled / 40);
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
        return this.hasNeighboringStronghold(UHF_FACTION_ID, q, r);
    }

    #initializeSectors() {
        this.sectors.clear();
        const coordinates = generateSectorCoordinates(this.radius);
        const defaultValue = getGalaxySectorDefaultValue();
        const defaultReward = getGalaxySectorDefaultReward();
        const overrides = galaxySectorParameters.overrides || {};
        coordinates.forEach(({ q, r }) => {
            const sectorKey = GalaxySector.createKey(q, r);
            const sectorOverrides = overrides[sectorKey];
            const sectorDefaultValue = Number.isFinite(sectorOverrides?.value) && sectorOverrides.value > 0
                ? sectorOverrides.value
                : defaultValue;
            const sectorReward = sectorOverrides && Object.prototype.hasOwnProperty.call(sectorOverrides, 'reward')
                ? sectorOverrides.reward
                : defaultReward;
            const sector = new GalaxySector({
                q,
                r,
                value: sectorDefaultValue,
                defaultValue: sectorDefaultValue,
                reward: sectorReward,
                storyRequirement: sectorOverrides?.storyRequirement,
                richResource: sectorOverrides?.richResource,
                poorResources: sectorOverrides?.poorResources
            });
            this.sectors.set(sector.key, sector);
        });
    }

    #initializeFactions() {
        this.factions.clear();
        const ringCache = new Map();
        galaxyFactionParameters.forEach((definition) => {
            const startingSectors = this.#resolveStartingSectors(definition, ringCache);
            const FactionCtor = definition.id === UHF_FACTION_ID ? GalaxyFaction : GalaxyFactionAI;
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

    markControlledSectorCacheDirty() {
        if (!this.controlledSectorCacheDirty) {
            this.controlledSectorCacheVersion += 1;
        }
        this.controlledSectorCacheDirty = true;
        this.controlledSectorWorldCountCache = {};
    }

    #updateWholeGalaxyControlFlag(controlledCount) {
        if (controlledCount >= this.getTotalSectorCount()) {
            this.hasEverControlledWholeGalaxyFlag = true;
        }
    }

    #markAllFactionBorderCachesDirty() {
        this.factions.forEach((faction) => {
            faction?.markBorderDirty?.();
        });
    }

    #updateIncomingAttackWarning() {
        const operations = this.operationManager?.operations;
        if (!operations || operations.size === 0) {
            setSpaceIncomingAttackWarning(false, false);
            return;
        }
        let hasIncomingAttack = false;
        let hasThreat = false;
        for (const operation of operations.values()) {
            if (!operation || operation.status !== 'running') {
                continue;
            }
            if (!operation.factionId || operation.factionId === UHF_FACTION_ID) {
                continue;
            }
            const sector = this.sectors.get(operation.sectorKey);
            if (!sector) {
                continue;
            }
            const uhfControl = Number(sector.getControlValue?.(UHF_FACTION_ID)) || 0;
            if (!(uhfControl > 0)) {
                continue;
            }
            hasIncomingAttack = true;
            const estimate = this.operationManager.getOperationLossEstimate({
                sectorKey: operation.sectorKey,
                factionId: operation.factionId,
                assignedPower: operation.assignedPower,
                reservedPower: operation.reservedPower,
                offensePower: operation.offensePower,
                targetFactionId: operation.targetFactionId
            });
            const successChance = estimate?.successChance || 0;
            const displayPercent = Math.max(0, Math.min(100, Math.round(successChance * 100)));
            if (displayPercent > 0) {
                hasThreat = true;
                break;
            }
        }
        setSpaceIncomingAttackWarning(hasIncomingAttack, hasThreat);
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
        this.#updateSectorControlMemory(sector);
        if (changedFactions.size > 0) {
            changedFactions.forEach((factionId) => this.#markFactionControlDirty(factionId));
            this.#markAllFactionBorderCachesDirty();
            this.markControlledSectorCacheDirty();
        }
    }

    #updateSectorControlMemory(sector) {
        const dominant = sector?.getDominantController?.();
        sector?.setOriginalControllerId?.(dominant?.factionId);

        const breakdown = sector?.getControlBreakdown?.();
        if (!Array.isArray(breakdown) || breakdown.length !== 1) {
            return;
        }
        const leader = breakdown[0];
        const factionId = leader?.factionId;
        if (!factionId) {
            return;
        }
        const totalControl = sector.getTotalControlValue?.() ?? 0;
        const leaderControl = Number(leader.value);
        if (!(totalControl > 0) || !(leaderControl > 0)) {
            return;
        }
        if (Math.abs(leaderControl - totalControl) > FULL_CONTROL_EPSILON) {
            return;
        }
        sector.setLastFullControllerId?.(factionId);
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
            target.resetControlMemory?.();
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
        Object.entries(galaxySectorControlOverrides).forEach(([sectorKey, controlMap]) => {
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
        return this.#hasFactionPresence(sector, UHF_FACTION_ID);
    }

    #isSectorTargetingRestricted(sector) {
        if (!sector || sector.key !== R507_PROTECTED_KEY) {
            return false;
        }
        const uhfControl = Number(sector.getControlValue?.(UHF_FACTION_ID)) || 0;
        return uhfControl <= R507_PROTECTED_CONTROL_THRESHOLD + R507_PROTECTED_CONTROL_TOLERANCE;
    }

    #getSectorKeysForRing(targetRing) {
        if (!Number.isFinite(targetRing) || targetRing < 0) {
            return [];
        }
        if (targetRing === 0) {
            const centerKey = GalaxySector.createKey(0, 0);
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
                const key = GalaxySector.createKey(currentQ, currentR);
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
                    resolved.add(GalaxySector.createKey(entry.q, entry.r));
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

    #collectSectorDefenseEntries(sector, originFactionId, targetFactionId) {
        if (!sector) {
            return [];
        }
        const controlEntries = Object.entries(sector.control || {});
        const contributions = [];
        controlEntries.forEach(([factionId, rawValue]) => {
            if (!factionId || (originFactionId && factionId === originFactionId)) {
                return;
            }
            if (targetFactionId && factionId !== targetFactionId) {
                return;
            }
            const faction = this.getFaction(factionId);
            if (!faction) {
                return;
            }
            let baseDefense = Number(faction.getSectorDefense?.(sector, this));
            if (!Number.isFinite(baseDefense)) {
                baseDefense = 0;
            }
            if (factionId === UHF_FACTION_ID) {
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
