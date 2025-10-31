const DEFAULT_OPERATION_AUTO_THRESHOLD = 2.1;

const R507_SECTOR_LABEL = 'R5-07';
const R507_SECTOR_KEY = '4,-5';
const R507_UHF_CONTROL_FLOOR = 0.1;

const GALAXY_OPERATION_HEX_DIRECTIONS = Array.isArray(globalThis?.HEX_NEIGHBOR_DIRECTIONS)
    ? globalThis.HEX_NEIGHBOR_DIRECTIONS
    : [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 }
    ];

function getOperationUI() {
    try {
        if (window && window.GalaxyOperationUI) {
            return window.GalaxyOperationUI;
        }
    } catch (error) {
        // Window unavailable in this environment.
    }
    try {
        if (global && global.GalaxyOperationUI) {
            return global.GalaxyOperationUI;
        }
    } catch (error) {
        // Global unavailable in this environment.
    }
    return null;
}

function resolveOperationDuration() {
    const duration = globalThis?.GALAXY_OPERATION_DURATION_MS;
    if (Number.isFinite(duration) && duration > 0) {
        return duration;
    }
    return 5 * 60 * 1000;
}

class GalaxyOperationManager {
    constructor(manager, {
        uhfFactionId,
        hasNeighboringStronghold,
        hasFactionPresence,
        isFactionFullControlSector,
        isSectorTargetingRestricted,
        updateSectorControl,
        getDefenseSummary,
        onOperationSuccess,
        refreshUI,
        operations
    } = {}) {
        this.manager = manager;
        this.uhfFactionId = typeof uhfFactionId === 'string' && uhfFactionId ? uhfFactionId : 'uhf';
        this.operations = operations instanceof Map ? operations : new Map();
        this.stepSizes = new Map();
        this.autoSectors = new Set();
        this.autoThreshold = DEFAULT_OPERATION_AUTO_THRESHOLD;
        this.hasNeighboringStronghold = hasNeighboringStronghold;
        this.hasFactionPresence = hasFactionPresence;
        this.isFactionFullControlSector = isFactionFullControlSector;
        this.isSectorTargetingRestricted = isSectorTargetingRestricted;
        this.updateSectorControl = updateSectorControl;
        this.getDefenseSummary = getDefenseSummary;
        this.onOperationSuccess = onOperationSuccess;
        this.refreshUI = refreshUI;
        if (this.manager) {
            this.manager.operations = this.operations;
        }
    }

    update(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
            return;
        }
        if (this.operations.size) {
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
    }

    saveState() {
        return {
            operations: Array.from(this.operations.values()).map((operation) => this.#serializeOperation(operation)),
            operationSteps: Array.from(this.stepSizes.entries()),
            operationAutoSectors: Array.from(this.autoSectors),
            operationAutoThreshold: this.getOperationAutoThreshold()
        };
    }

    loadState(state) {
        this.operations.clear();
        if (state && Array.isArray(state.operations)) {
            state.operations.forEach((entry) => {
                this.#restoreOperation(entry);
            });
        }
        this.stepSizes.clear();
        if (state && Array.isArray(state.operationSteps)) {
            state.operationSteps.forEach((step) => {
                if (!Array.isArray(step) || step.length !== 2) {
                    return;
                }
                const [key, value] = step;
                const numericValue = Number(value);
                if (!key || !Number.isFinite(numericValue) || numericValue <= 0) {
                    return;
                }
                this.stepSizes.set(String(key), Math.max(1, Math.floor(numericValue)));
            });
        }
        this.autoSectors.clear();
        if (state && Array.isArray(state.operationAutoSectors)) {
            state.operationAutoSectors.forEach((value) => {
                if (value === null || value === undefined) {
                    return;
                }
                const key = String(value).trim();
                if (key !== '') {
                    this.autoSectors.add(key);
                }
            });
        }
        if (state && Number.isFinite(state.operationAutoThreshold) && state.operationAutoThreshold > 0) {
            this.autoThreshold = state.operationAutoThreshold;
        } else {
            this.autoThreshold = DEFAULT_OPERATION_AUTO_THRESHOLD;
        }
        const operationUI = getOperationUI();
        operationUI?.syncCacheFromManager?.(this.manager);
        operationUI?.updateOperationsPanel?.(this.manager);
        if (this.refreshUI) {
            this.refreshUI();
            return;
        }
        operationUI?.updateOperationArrows?.(this.manager);
    }

    reset() {
        this.operations.clear();
        this.stepSizes.clear();
        this.autoSectors.clear();
        this.autoThreshold = DEFAULT_OPERATION_AUTO_THRESHOLD;
    }

    getOperationForSector(sectorKey, factionId) {
        if (!sectorKey) {
            return null;
        }
        const operation = this.operations.get(sectorKey) || null;
        if (!operation) {
            return null;
        }
        if (!factionId) {
            return operation;
        }
        const ownerId = operation.factionId || this.uhfFactionId;
        if (ownerId !== factionId) {
            return null;
        }
        return operation;
    }

    getOperationStep(sectorKey) {
        if (!sectorKey) {
            return 1;
        }
        const value = this.stepSizes.get(sectorKey);
        if (!Number.isFinite(value) || value <= 0) {
            return 1;
        }
        return Math.max(1, Math.floor(value));
    }

    setOperationStep({ sectorKey, value }) {
        if (!sectorKey) {
            return 1;
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            this.stepSizes.delete(sectorKey);
            return 1;
        }
        const step = Math.max(1, Math.floor(numeric));
        this.stepSizes.set(sectorKey, step);
        return step;
    }

    getOperationAutoEnabled(sectorKey) {
        if (!sectorKey) {
            return false;
        }
        const key = String(sectorKey).trim();
        if (key === '') {
            return false;
        }
        return this.autoSectors.has(key);
    }

    setOperationAutoEnabled({ sectorKey, value }) {
        if (!sectorKey) {
            return false;
        }
        const key = String(sectorKey).trim();
        if (key === '') {
            return false;
        }
        if (value === true) {
            this.autoSectors.add(key);
            return true;
        }
        this.autoSectors.delete(key);
        return false;
    }

    getOperationAutoThreshold() {
        const numeric = Number(this.autoThreshold);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            this.autoThreshold = DEFAULT_OPERATION_AUTO_THRESHOLD;
            return this.autoThreshold;
        }
        return numeric;
    }

    setOperationAutoThreshold(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            this.autoThreshold = DEFAULT_OPERATION_AUTO_THRESHOLD;
            return this.autoThreshold;
        }
        this.autoThreshold = numeric;
        return this.autoThreshold;
    }

    getOperationSuccessChance({ sectorKey, factionId, assignedPower }) {
        if (!sectorKey) {
            return 0;
        }
        const sector = this.manager.sectors.get(sectorKey);
        if (!sector) {
            return 0;
        }
        const offensePower = Number(assignedPower);
        if (!Number.isFinite(offensePower) || offensePower <= 0) {
            return 0;
        }
        const defensePower = this.#computeDefensePower(sector, factionId);
        return this.#calculateSuccessChance(offensePower, defensePower);
    }

    getOperationLossEstimate({
        sectorKey,
        factionId,
        assignedPower,
        reservedPower,
        offensePower,
        defensePower
    }) {
        if (!sectorKey) {
            return null;
        }
        const sector = this.manager.sectors.get(sectorKey);
        if (!sector) {
            return null;
        }
        const attackerId = factionId || this.uhfFactionId;
        const assigned = Number(assignedPower);
        const baseAssigned = Number.isFinite(assigned) && assigned > 0 ? assigned : 0;
        const providedReserved = Number(reservedPower);
        const reserved = Number.isFinite(providedReserved) && providedReserved > 0
            ? providedReserved
            : baseAssigned;
        const providedOffense = Number(offensePower);
        const offenseBase = Number.isFinite(providedOffense) && providedOffense > 0
            ? providedOffense
            : baseAssigned;
        const resolvedReserved = Math.max(0, reserved);
        const resolvedOffense = Math.max(0, Math.min(offenseBase, resolvedReserved));
        const providedDefense = Number(defensePower);
        const resolvedDefense = Number.isFinite(providedDefense) && providedDefense >= 0
            ? providedDefense
            : this.#computeDefensePower(sector, attackerId);
        const defense = Math.max(0, resolvedDefense);
        const successChance = this.#calculateSuccessChance(resolvedOffense, defense);
        const failureChance = Math.max(0, Math.min(1, 1 - successChance));
        let successLoss = 0;
        if (defense > 0 && resolvedOffense > 0) {
            successLoss = Math.min(
                resolvedReserved,
                (defense * defense) / (resolvedOffense + defense)
            );
        }
        const failureLoss = Math.max(0, Math.min(resolvedReserved, resolvedOffense));
        return {
            offensePower: resolvedOffense,
            defensePower: defense,
            reservedPower: resolvedReserved,
            successChance,
            failureChance,
            successLoss,
            failureLoss
        };
    }

    getReservedOperationPower(factionId) {
        let total = 0;
        this.operations.forEach((operation) => {
            if (operation.status !== 'running') {
                return;
            }
            const ownerId = operation.factionId || this.uhfFactionId;
            if (ownerId !== factionId) {
                return;
            }
            const reservedPower = Number(operation.reservedPower);
            if (!Number.isFinite(reservedPower) || reservedPower <= 0) {
                return;
            }
            total += reservedPower;
        });
        return total;
    }

    startOperation({ sectorKey, factionId, assignedPower, durationMs, successChance }) {
        if (!sectorKey || !Number.isFinite(assignedPower) || assignedPower <= 0) {
            return null;
        }
        const sector = this.manager.sectors.get(sectorKey);
        if (!sector) {
            return null;
        }
        const attackerId = factionId || this.uhfFactionId;
        if (this.isFactionFullControlSector?.(sector, attackerId)) {
            return null;
        }
        const existing = this.operations.get(sectorKey);
        if (existing && existing.status === 'running') {
            if (!existing.originHex) {
                existing.originHex = this.#selectOperationOrigin(sector, existing.factionId || attackerId);
            }
            return existing;
        }
        if (attackerId !== this.uhfFactionId && this.isSectorTargetingRestricted && this.isSectorTargetingRestricted(sector)) {
            return null;
        }
        const hasStronghold = this.hasNeighboringStronghold
            ? this.hasNeighboringStronghold(sector, attackerId)
            : false;
        const hasPresence = this.hasFactionPresence
            ? this.hasFactionPresence(sector, attackerId)
            : false;
        if (!hasStronghold && !hasPresence) {
            return null;
        }
        const faction = this.manager.getFaction(attackerId);
        if (!faction) {
            return null;
        }
        const currentFleetPower = Number.isFinite(faction.fleetPower) && faction.fleetPower > 0 ? faction.fleetPower : 0;
        const operationalPower = typeof faction.getOperationalFleetPower === 'function'
            ? faction.getOperationalFleetPower(this.manager)
            : currentFleetPower;
        if (assignedPower > operationalPower) {
            return null;
        }
        const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : resolveOperationDuration();
        const offensePower = Math.max(0, assignedPower);
        const defensePower = this.#computeDefensePower(sector, attackerId);
        const sanitizedSuccess = Number.isFinite(successChance)
            ? Math.max(0, Math.min(1, successChance))
            : this.#calculateSuccessChance(offensePower, defensePower);
        const originHex = this.#selectOperationOrigin(sector, attackerId);
        const operation = {
            sectorKey,
            factionId: attackerId,
            assignedPower: offensePower,
            reservedPower: offensePower,
            durationMs: duration,
            elapsedMs: 0,
            successChance: sanitizedSuccess,
            failureChance: Math.max(0, Math.min(1, 1 - sanitizedSuccess)),
            defensePower,
            offensePower,
            status: 'running',
            originHex,
            defenderLosses: []
        };
        faction.setFleetPower(currentFleetPower - offensePower);
        this.operations.set(sectorKey, operation);
        return operation;
    }

    #completeOperation(operation) {
        const faction = this.manager.getFaction(operation.factionId || this.uhfFactionId);
        if (operation.status !== 'running') {
            operation.status = 'completed';
        }
        const sector = this.manager.sectors.get(operation.sectorKey);
        const attackerId = operation.factionId || this.uhfFactionId;
        const estimate = this.getOperationLossEstimate({
            sectorKey: operation.sectorKey,
            factionId: attackerId,
            assignedPower: operation.assignedPower,
            reservedPower: operation.reservedPower,
            offensePower: operation.offensePower
        });
        const fallbackReserved = Number(operation.reservedPower);
        const baseReserved = Number.isFinite(fallbackReserved) && fallbackReserved > 0 ? fallbackReserved : 0;
        let defensePower;
        let successChance;
        let failureChance;
        let reservedPower;
        let offensePower;
        if (estimate) {
            reservedPower = Number.isFinite(estimate.reservedPower) && estimate.reservedPower > 0
                ? estimate.reservedPower
                : baseReserved;
            offensePower = Number.isFinite(estimate.offensePower) && estimate.offensePower > 0
                ? Math.min(estimate.offensePower, reservedPower)
                : Math.max(0, Math.min(operation.offensePower ?? baseReserved, baseReserved));
            defensePower = Number.isFinite(estimate.defensePower) && estimate.defensePower >= 0
                ? estimate.defensePower
                : this.#computeDefensePower(sector, attackerId);
            successChance = Number.isFinite(estimate.successChance)
                ? Math.max(0, Math.min(1, estimate.successChance))
                : this.#calculateSuccessChance(offensePower, defensePower);
            failureChance = Number.isFinite(estimate.failureChance)
                ? Math.max(0, Math.min(1, estimate.failureChance))
                : Math.max(0, Math.min(1, 1 - successChance));
        } else {
            reservedPower = baseReserved;
            offensePower = Math.max(0, Math.min(operation.offensePower ?? reservedPower, reservedPower));
            defensePower = this.#computeDefensePower(sector, attackerId);
            if (!Number.isFinite(defensePower) || defensePower < 0) {
                defensePower = Math.max(0, operation.defensePower ?? 0);
            }
            successChance = this.#calculateSuccessChance(offensePower, defensePower);
            failureChance = Math.max(0, Math.min(1, 1 - successChance));
        }
        reservedPower = Math.max(0, reservedPower);
        offensePower = Math.max(0, Math.min(offensePower, reservedPower));
        if (!Number.isFinite(defensePower) || defensePower < 0) {
            defensePower = 0;
        }
        let successLoss;
        if (estimate && Number.isFinite(estimate.successLoss)) {
            successLoss = Math.max(0, Math.min(reservedPower, estimate.successLoss));
        } else {
            successLoss = defensePower > 0 && offensePower > 0
                ? Math.min(reservedPower, (defensePower * defensePower) / (offensePower + defensePower))
                : 0;
        }
        let failureLoss;
        if (estimate && Number.isFinite(estimate.failureLoss)) {
            failureLoss = Math.max(0, Math.min(reservedPower, estimate.failureLoss));
        } else {
            failureLoss = Math.max(0, Math.min(reservedPower, offensePower));
        }
        let losses = successLoss;
        const isSuccessful = successChance >= 1 || (successChance > 0 && Math.random() < successChance);
        if (!isSuccessful) {
            losses = failureLoss;
        }
        losses = Math.max(0, Math.min(reservedPower, losses));
        const returningPower = Math.max(0, reservedPower - losses);
        if (faction) {
            const nextPower = Math.max(0, faction.fleetPower + returningPower);
            faction.setFleetPower(nextPower);
        }

        const defenderLosses = this.#applyDefenderLosses({
            sector,
            attackerId,
            offensePower,
            defensePower,
            attackSucceeded: isSuccessful
        });

        if (isSuccessful) {
            if (operation.factionId === this.uhfFactionId && typeof this.onOperationSuccess === 'function') {
                this.onOperationSuccess();
            }
            this.#applyOperationSuccess(operation);
        }
        operation.reservedPower = reservedPower;
        operation.offensePower = offensePower;
        operation.defensePower = defensePower;
        operation.successChance = successChance;
        operation.failureChance = failureChance;
        operation.losses = losses;
        operation.defenderLosses = defenderLosses;
        operation.result = isSuccessful ? 'success' : 'failure';
        operation.status = 'completed';
        if (typeof this.refreshUI === 'function') {
            this.refreshUI();
        }
    }

    #applyOperationSuccess(operation) {
        const sector = this.manager.sectors.get(operation.sectorKey);
        if (!sector) {
            return;
        }
        const factionId = operation.factionId || this.uhfFactionId;
        const currentControl = sector.getControlValue?.(factionId) ?? 0;
        const totalControl = sector.getTotalControlValue?.() ?? 0;
        const hasExistingControl = totalControl > 0;
        let gain;
        if (hasExistingControl) {
            const otherTotal = Math.max(0, totalControl - currentControl);
            if (!(otherTotal > 0)) {
                return;
            }
            const targetGain = totalControl * 0.1;
            gain = Math.min(otherTotal, targetGain);
        } else {
            const sectorValue = sector.getValue?.() ?? 0;
            gain = Number.isFinite(sectorValue) && sectorValue > 0 ? sectorValue * 0.1 : 0;
        }
        if (!(gain > 0)) {
            return;
        }
        const entries = Object.entries(sector.control).filter(([defenderId, value]) => {
            return defenderId !== factionId && Number(value) > 0;
        });
        if (!entries.length && hasExistingControl) {
            return;
        }
        entries.sort((left, right) => Number(right[1]) - Number(left[1]));
        if (typeof this.updateSectorControl !== 'function') {
            return;
        }
        const protectUhfControl = this.#shouldProtectUhfControl(sector, operation);
        this.updateSectorControl(sector, (target) => {
            let remainingReduction = gain;
            const enforceUhfFloor = protectUhfControl && this.#isProtectedUhfSector(target);
            entries.forEach(([defenderId, value], index) => {
                if (!(remainingReduction > 0)) {
                    return;
                }
                const numericValue = Number(value);
                if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    target.clearControl(defenderId);
                    return;
                }
                const factionsRemaining = entries.length - index;
                const share = factionsRemaining > 0 ? remainingReduction / factionsRemaining : remainingReduction;
                let maxReduction = numericValue;
                if (enforceUhfFloor && defenderId === this.uhfFactionId) {
                    const floor = this.#resolveProtectedUhfFloor(target, defenderId);
                    if (floor > 0) {
                        maxReduction = Math.max(0, numericValue - floor);
                    }
                }
                if (!(maxReduction > 0)) {
                    return;
                }
                const reduction = Math.min(maxReduction, share);
                const nextValue = numericValue - reduction;
                remainingReduction -= reduction;
                if (nextValue > 0) {
                    target.setControl(defenderId, nextValue);
                } else {
                    target.clearControl(defenderId);
                }
            });
            const appliedGain = entries.length ? gain - Math.max(0, remainingReduction) : gain;
            if (!(appliedGain > 0)) {
                return;
            }
            const updatedControl = target.getControlValue?.(factionId) ?? 0;
            const newValue = updatedControl + appliedGain;
            if (newValue > 0) {
                target.setControl(factionId, newValue);
            } else {
                target.clearControl(factionId);
            }
        });
    }

    #shouldProtectUhfControl(sector, operation) {
        if (!sector || !operation) {
            return false;
        }
        const attackerId = operation.factionId || this.uhfFactionId;
        if (attackerId === this.uhfFactionId) {
            return false;
        }
        return this.#isProtectedUhfSector(sector);
    }

    #isProtectedUhfSector(sector) {
        if (!sector) {
            return false;
        }
        if (sector.key === R507_SECTOR_KEY) {
            return true;
        }
        if (typeof sector.getDisplayName === 'function' && sector.getDisplayName() === R507_SECTOR_LABEL) {
            return true;
        }
        return false;
    }

    #resolveProtectedUhfFloor(sector, factionId) {
        if (factionId !== this.uhfFactionId) {
            return 0;
        }
        if (!this.#isProtectedUhfSector(sector)) {
            return 0;
        }
        return R507_UHF_CONTROL_FLOOR;
    }

    #serializeOperation(operation) {
        if (!operation) {
            return null;
        }
        return {
            sectorKey: operation.sectorKey,
            factionId: operation.factionId,
            assignedPower: operation.assignedPower,
            reservedPower: operation.reservedPower,
            durationMs: operation.durationMs,
            elapsedMs: operation.elapsedMs,
            successChance: operation.successChance,
            failureChance: operation.failureChance,
            defensePower: operation.defensePower,
            offensePower: operation.offensePower,
            status: operation.status,
            result: operation.result,
            losses: operation.losses,
            originHex: this.#serializeOperationOrigin(operation.originHex),
            defenderLosses: this.#serializeDefenderLosses(operation.defenderLosses)
        };
    }

    #restoreOperation(state) {
        if (!state || !state.sectorKey) {
            return;
        }
        const sector = this.manager.sectors.get(state.sectorKey);
        if (!sector) {
            return;
        }
        const assignedPower = Number(state.assignedPower);
        const reservedPower = Number(state.reservedPower);
        if (!Number.isFinite(assignedPower) || assignedPower <= 0 || !Number.isFinite(reservedPower) || reservedPower <= 0) {
            return;
        }
        const duration = Number.isFinite(state.durationMs) && state.durationMs > 0 ? state.durationMs : resolveOperationDuration();
        const elapsed = Number.isFinite(state.elapsedMs) && state.elapsedMs >= 0 ? Math.min(state.elapsedMs, duration) : 0;
        const attackerId = state.factionId || this.uhfFactionId;
        const savedDefense = Number(state.defensePower);
        const savedOffense = Number(state.offensePower);
        const successChance = Math.max(0, Math.min(1, Number(state.successChance)));
        const failureChance = Math.max(0, Math.min(1, Number(state.failureChance)));
        const defensePower = Number.isFinite(savedDefense) && savedDefense >= 0
            ? savedDefense
            : this.#computeDefensePower(sector, attackerId);
        const offensePower = Number.isFinite(savedOffense) && savedOffense > 0
            ? Math.min(savedOffense, reservedPower)
            : Math.min(assignedPower, reservedPower);
        const computedSuccess = this.#calculateSuccessChance(offensePower, defensePower);
        const sanitizedSuccess = Math.max(0, Math.min(1, computedSuccess));
        const sanitizedFailure = Math.max(0, Math.min(1, 1 - sanitizedSuccess));
        const originHex = this.#sanitizeOperationOrigin(state.originHex)
            || this.#selectOperationOrigin(sector, attackerId);
        const operation = {
            sectorKey: state.sectorKey,
            factionId: attackerId,
            assignedPower,
            reservedPower,
            durationMs: duration,
            elapsedMs: elapsed,
            successChance: successChance > 0 ? successChance : sanitizedSuccess,
            failureChance: failureChance > 0 ? failureChance : sanitizedFailure,
            defensePower,
            offensePower,
            status: state.status === 'running' && elapsed < duration ? 'running' : 'completed',
            result: state.result,
            losses: Number.isFinite(Number(state.losses)) ? Number(state.losses) : undefined,
            originHex,
            defenderLosses: this.#restoreDefenderLosses(state.defenderLosses)
        };

        this.operations.set(operation.sectorKey, operation);
    }

    #calculateSuccessChance(offensePower, defensePower) {
        const offense = Number(offensePower);
        if (!Number.isFinite(offense) || offense <= 0) {
            return 0;
        }
        const defense = Number(defensePower);
        if (!Number.isFinite(defense) || defense <= 0) {
            return 1;
        }
        if (offense < defense) {
            return 0;
        }
        if (offense >= defense * 2) {
            return 1;
        }
        const ratio = (offense - defense) / defense;
        if (!Number.isFinite(ratio)) {
            return 0;
        }
        return Math.max(0, Math.min(1, ratio));
    }

    #computeDefensePower(sector, attackerId) {
        if (typeof this.getDefenseSummary === 'function') {
            const summary = this.getDefenseSummary(sector, attackerId);
            return summary?.totalPower ?? 0;
        }
        return 0;
    }

    #getDefenseContributions(sector, attackerId) {
        if (typeof this.getDefenseSummary !== 'function') {
            return [];
        }
        const summary = this.getDefenseSummary(sector, attackerId);
        if (!summary?.contributions?.length) {
            return [];
        }
        return summary.contributions.map((entry) => ({
            factionId: entry.factionId,
            power: entry.totalPower
        }));
    }

    #applyDefenderLosses({ sector, attackerId, offensePower, defensePower, attackSucceeded }) {
        if (!sector) {
            return [];
        }
        const offense = Number(offensePower);
        const defense = Number(defensePower);
        if (!Number.isFinite(offense) || offense <= 0) {
            return [];
        }
        if (!Number.isFinite(defense) || defense <= 0) {
            return [];
        }
        const contributions = this.#getDefenseContributions(sector, attackerId);
        if (!contributions.length) {
            return [];
        }
        const totalContribution = contributions.reduce((sum, entry) => {
            const value = Number(entry.power);
            return Number.isFinite(value) && value > 0 ? sum + value : sum;
        }, 0);
        if (!(totalContribution > 0)) {
            return contributions.map(({ factionId }) => ({ factionId, loss: 0 }));
        }
        const baseLoss = (offense * offense) / (offense + defense);
        const modifier = attackSucceeded ? 1 : Math.min(1, offense / defense);
        const rawLoss = baseLoss * (Number.isFinite(modifier) && modifier > 0 ? modifier : 0);
        if (!(rawLoss > 0)) {
            return contributions.map(({ factionId }) => ({ factionId, loss: 0 }));
        }
        const cappedLoss = Math.min(totalContribution, rawLoss);
        if (!(cappedLoss > 0)) {
            return contributions.map(({ factionId }) => ({ factionId, loss: 0 }));
        }
        const defenderLosses = [];
        contributions.forEach(({ factionId, power }) => {
            const faction = this.manager.getFaction(factionId);
            if (!faction) {
                defenderLosses.push({ factionId, loss: 0 });
                return;
            }
            const ratio = power / totalContribution;
            const share = ratio > 0 ? cappedLoss * ratio : 0;
            const availableFleet = Number.isFinite(faction.fleetPower) ? Math.max(0, faction.fleetPower) : 0;
            const maxAssignable = Math.max(0, Math.min(power, availableFleet));
            const appliedLoss = Math.max(0, Math.min(share, maxAssignable));
            if (appliedLoss > 0) {
                faction.setFleetPower(availableFleet - appliedLoss);
            }
            defenderLosses.push({ factionId, loss: appliedLoss });
        });
        return defenderLosses;
    }

    #serializeDefenderLosses(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return undefined;
        }
        const sanitized = entries.reduce((result, entry) => {
            if (!entry || typeof entry.factionId !== 'string' || !entry.factionId) {
                return result;
            }
            const loss = Number(entry.loss);
            result.push({
                factionId: entry.factionId,
                loss: Number.isFinite(loss) && loss > 0 ? loss : 0
            });
            return result;
        }, []);
        return sanitized.length ? sanitized : undefined;
    }

    #restoreDefenderLosses(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return [];
        }
        const restored = [];
        entries.forEach((entry) => {
            if (!entry || typeof entry.factionId !== 'string' || !entry.factionId) {
                return;
            }
            const loss = Number(entry.loss);
            restored.push({
                factionId: entry.factionId,
                loss: Number.isFinite(loss) && loss > 0 ? loss : 0
            });
        });
        return restored;
    }

    #selectOperationOrigin(sector, factionId) {
        if (!sector || !factionId) {
            return null;
        }
        let bestSector = null;
        let bestValue = -Infinity;
        for (let index = 0; index < GALAXY_OPERATION_HEX_DIRECTIONS.length; index += 1) {
            const direction = GALAXY_OPERATION_HEX_DIRECTIONS[index];
            const neighbor = this.manager.getSector(sector.q + direction.q, sector.r + direction.r);
            if (!this.isFactionFullControlSector || !this.isFactionFullControlSector(neighbor, factionId)) {
                continue;
            }
            const controlValue = neighbor?.getControlValue?.(factionId) || 0;
            if (controlValue > bestValue) {
                bestValue = controlValue;
                bestSector = neighbor;
                continue;
            }
            if (controlValue === bestValue && bestSector && neighbor?.key && bestSector.key) {
                if (neighbor.key.localeCompare(bestSector.key) < 0) {
                    bestSector = neighbor;
                }
            }
        }
        if (bestSector) {
            return { q: bestSector.q, r: bestSector.r };
        }
        if (this.hasFactionPresence && this.hasFactionPresence(sector, factionId)) {
            return { q: sector.q, r: sector.r };
        }
        return null;
    }

    #serializeOperationOrigin(origin) {
        if (!origin) {
            return null;
        }
        const q = Number(origin.q);
        const r = Number(origin.r);
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return null;
        }
        return { q, r };
    }

    #sanitizeOperationOrigin(origin) {
        if (!origin) {
            return null;
        }
        const q = Number(origin.q);
        const r = Number(origin.r);
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return null;
        }
        return { q, r };
    }

    #processAutoLaunch() {
        if (!this.autoSectors.size || !this.manager || !this.manager.enabled) {
            return;
        }
        const faction = this.manager.getFaction?.(this.uhfFactionId);
        if (!faction) {
            return;
        }
        const threshold = this.getOperationAutoThreshold();
        if (!Number.isFinite(threshold) || threshold <= 0) {
            return;
        }
        const antimatterResource = typeof resources === 'object' && resources !== null
            ? resources?.special?.antimatter
            : null;
        let availableAntimatter = antimatterResource ? Number(antimatterResource.value) : 0;
        if (!Number.isFinite(availableAntimatter) || availableAntimatter < 0) {
            availableAntimatter = 0;
        }
        let launched = false;
        const uiAllocationUpdater = (typeof globalThis !== 'undefined'
            && globalThis.GalaxyOperationUI
            && typeof globalThis.GalaxyOperationUI.applyExternalAllocation === 'function')
            ? globalThis.GalaxyOperationUI.applyExternalAllocation
            : null;
        this.autoSectors.forEach((rawKey) => {
            if (!rawKey) {
                return;
            }
            const sectorKey = String(rawKey);
            const currentOperation = this.operations.get(sectorKey);
            if (currentOperation && currentOperation.status === 'running') {
                return;
            }
            const availablePower = Number.isFinite(faction.fleetPower) && faction.fleetPower > 0
                ? faction.fleetPower
                : 0;
            if (!(availablePower > 0)) {
                return;
            }
            const sector = this.manager.sectors.get(sectorKey);
            if (!sector) {
                return;
            }
            if (this.isFactionFullControlSector?.(sector, this.uhfFactionId)) {
                return;
            }
            const sectorDefense = this.manager.getSectorDefensePower
                ? this.manager.getSectorDefensePower(sectorKey, this.uhfFactionId)
                : 0;
            const requiredPower = sectorDefense > 0 ? sectorDefense * threshold : 0;
            const normalizedPower = Math.round(requiredPower * 100) / 100;
            if (!(normalizedPower > 0) || normalizedPower > availablePower) {
                return;
            }
            const antimatterCost = normalizedPower * 1000;
            if (antimatterCost > 0 && antimatterCost > availableAntimatter) {
                return;
            }
            const successChance = this.getOperationSuccessChance({
                sectorKey,
                factionId: this.uhfFactionId,
                assignedPower: normalizedPower
            });
            if (!(successChance > 0)) {
                return;
            }
            const operation = this.startOperation({
                sectorKey,
                factionId: this.uhfFactionId,
                assignedPower: normalizedPower,
                successChance
            });
            if (!operation) {
                return;
            }
            if (antimatterCost > 0 && antimatterResource) {
                availableAntimatter = Math.max(0, availableAntimatter - antimatterCost);
                antimatterResource.value = availableAntimatter;
            }
            operation.launchCost = antimatterCost;
            if (uiAllocationUpdater) {
                uiAllocationUpdater(sectorKey, normalizedPower);
            }
            launched = true;
        });
        if (launched && typeof this.refreshUI === 'function') {
            this.refreshUI();
        }
    }
}

if (typeof window !== 'undefined') {
    window.GalaxyOperationManager = GalaxyOperationManager;
    window.DEFAULT_OPERATION_AUTO_THRESHOLD = DEFAULT_OPERATION_AUTO_THRESHOLD;
}
if (typeof globalThis !== 'undefined') {
    globalThis.GalaxyOperationManager = GalaxyOperationManager;
    globalThis.DEFAULT_OPERATION_AUTO_THRESHOLD = DEFAULT_OPERATION_AUTO_THRESHOLD;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GalaxyOperationManager,
        DEFAULT_OPERATION_AUTO_THRESHOLD
    };
}
