const autobuildCostTracker = {
    elapsed: 0,
    currentCosts: {},
    currentBuildingCosts: {},
    costQueue: [],
    buildingCostQueue: [],
    recordCost(buildingName, costObj) {
        for (const category in costObj) {
            if (!this.currentCosts[category]) this.currentCosts[category] = {};
            for (const resource in costObj[category]) {
                if (!this.currentCosts[category][resource]) this.currentCosts[category][resource] = 0;
                this.currentCosts[category][resource] += costObj[category][resource];

                if (!this.currentBuildingCosts[buildingName]) this.currentBuildingCosts[buildingName] = {};
                if (!this.currentBuildingCosts[buildingName][category]) this.currentBuildingCosts[buildingName][category] = {};
                if (!this.currentBuildingCosts[buildingName][category][resource]) this.currentBuildingCosts[buildingName][category][resource] = 0;
                this.currentBuildingCosts[buildingName][category][resource] += costObj[category][resource];
            }
        }
    },
    update(delta) {
        this.elapsed += delta;
        while (this.elapsed >= 1000) {
            this.costQueue.push(this.currentCosts);
            this.buildingCostQueue.push(this.currentBuildingCosts);
            if (this.costQueue.length > 10) this.costQueue.shift();
            if (this.buildingCostQueue.length > 10) this.buildingCostQueue.shift();
            this.currentCosts = {};
            this.currentBuildingCosts = {};
            this.elapsed -= 1000;
        }
    },
    getAverageCost(category, resource) {
        if (this.costQueue.length === 0) return 0;
        let sum = 0;
        for (const costs of this.costQueue) {
            sum += costs[category]?.[resource] || 0;
        }
        return sum / this.costQueue.length;
    },
    getAverageCostBreakdown(category, resource) {
        if (this.buildingCostQueue.length === 0) return [];
        const totals = {};
        for (const buildCosts of this.buildingCostQueue) {
            for (const building in buildCosts) {
                const val = buildCosts[building]?.[category]?.[resource] || 0;
                if (!totals[building]) totals[building] = 0;
                totals[building] += val;
            }
        }
        const len = this.buildingCostQueue.length;
        return Object.entries(totals)
            .map(([building, total]) => [building, total / len])
            .sort((a, b) => b[1] - a[1]);
    },
    getLastSecondCost(category, resource) {
        if (this.costQueue.length === 0) return 0;
        const last = this.costQueue[this.costQueue.length - 1];
        return last[category]?.[resource] || 0;
    }
};

function addCostToPrioritizedReserve(reserve, cost) {
    if (!cost) return;
    for (const category in cost) {
        if (!Object.prototype.hasOwnProperty.call(cost, category)) continue;
        if (!reserve[category]) reserve[category] = {};
        const categoryReserve = reserve[category];
        const categoryCost = cost[category];
        for (const resource in categoryCost) {
            if (!Object.prototype.hasOwnProperty.call(categoryCost, resource)) continue;
            categoryReserve[resource] = (categoryReserve[resource] || 0) + categoryCost[resource];
        }
    }
}

function subtractCostFromPrioritizedReserve(reserve, cost) {
    if (!cost) return;
    for (const category in cost) {
        if (!Object.prototype.hasOwnProperty.call(cost, category)) continue;
        const categoryReserve = reserve[category];
        if (!categoryReserve) continue;
        const categoryCost = cost[category];
        for (const resource in categoryCost) {
            if (!Object.prototype.hasOwnProperty.call(categoryCost, resource)) continue;
            if (!Object.prototype.hasOwnProperty.call(categoryReserve, resource)) continue;
            const nextValue = categoryReserve[resource] - categoryCost[resource];
            if (nextValue > 0) {
                categoryReserve[resource] = nextValue;
            } else {
                delete categoryReserve[resource];
            }
        }
        if (Object.keys(categoryReserve).length === 0) {
            delete reserve[category];
        }
    }
}

function cloneCostObject(cost) {
    if (!cost) return {};
    const clone = {};
    for (const category in cost) {
        if (!Object.prototype.hasOwnProperty.call(cost, category)) continue;
        clone[category] = {};
        const categoryCost = cost[category];
        for (const resource in categoryCost) {
            if (!Object.prototype.hasOwnProperty.call(categoryCost, resource)) continue;
            clone[category][resource] = categoryCost[resource];
        }
    }
    return clone;
}

function resolveAutoBuildBase(structure, population, workerCap, collection) {
    const baseMethod = structure?.getAutoBuildBase;
    if (baseMethod?.call) {
        return baseMethod.call(structure, population, workerCap, collection);
    }

    const basis = `${structure?.autoBuildBasis || 'population'}`;
    if (basis === 'max') {
        return 0;
    }
    if (basis === 'workers') {
        return workerCap;
    }

    if (basis.startsWith('building:')) {
        const target = collection?.[basis.slice(9)];
        return target?.active || 0;
    }

    return population;
}

function getAutoBuildFillData(structure) {
    const storage = structure.storage || {};
    const multiplier = structure.getEffectiveStorageMultiplier?.() || 1;
    const useFilters = structure.autoBuildFillResourceFilters;
    const primary = structure.autoBuildFillResourcePrimary || 'any';
    const secondary = structure.autoBuildFillResourceSecondary || 'none';
    const resourceFilter = new Set();
    if (useFilters && primary !== 'any') {
        resourceFilter.add(primary);
        if (secondary !== 'none' && secondary !== primary) {
            resourceFilter.add(secondary);
        }
    }
    let bestRatio = 0;
    let bestCap = 0;
    let bestValue = 0;
    let bestPerBuilding = 0;
    for (const category in storage) {
        const categoryStorage = storage[category] || {};
        for (const resource in categoryStorage) {
            if (resourceFilter.size && !resourceFilter.has(resource)) {
                continue;
            }
            const resObj = resources[category][resource];
            const cap = resObj.cap || 0;
            const value = resObj.value || 0;
            const ratio = cap > 0 ? value / cap : 0;
            if (ratio > bestRatio) {
                bestRatio = ratio;
                bestCap = cap;
                bestValue = value;
                bestPerBuilding = (categoryStorage[resource] || 0) * multiplier;
            }
        }
    }
    const threshold = (structure.autoBuildFillPercent || 0) / 100;
    if (threshold <= 0 || bestPerBuilding <= 0 || bestRatio <= threshold) {
        return {
            requiredAmount: 0,
            fillRatio: bestRatio,
        };
    }
    const targetCap = bestValue / threshold;
    const extraCap = targetCap - bestCap;
    const requiredAmount = Math.ceil(extraCap / bestPerBuilding);
    return {
        requiredAmount: Math.max(0, requiredAmount),
        fillRatio: bestRatio,
    };
}

function resetAutoBuildPartialFlags(structures) {
    if (!structures) return;
    for (const name in structures) {
        if (!Object.prototype.hasOwnProperty.call(structures, name)) continue;
        const structure = structures[name];
        if (structure) {
            structure.autoBuildPartial = false;
        }
    }
}

function resetAutoBuildResourceShortages(resourceCollection) {
    if (!resourceCollection) return;
    for (const category in resourceCollection) {
        if (!Object.prototype.hasOwnProperty.call(resourceCollection, category)) continue;
        const categoryResources = resourceCollection[category];
        if (!categoryResources) continue;
        for (const resourceName in categoryResources) {
            if (!Object.prototype.hasOwnProperty.call(categoryResources, resourceName)) continue;
            const resource = categoryResources[resourceName];
            if (resource) {
                resource.autobuildShortage = false;
            }
        }
    }
}

function markAutoBuildShortages(building, requiredAmount, reservePercent, extraReserves = null) {
    if (!building || requiredAmount <= 0) return;
    if (typeof resources === 'undefined' || !resources) return;

    const ratioTolerance = 1e-9;
    const ratios = new Map();
    const shortageMeta = new Map();

    const registerShortage = (resObj, ratio, meta) => {
        if (!resObj || !Number.isFinite(ratio)) return;
        const existing = ratios.get(resObj);
        const shouldReplace = existing === undefined || ratio + ratioTolerance < existing;
        const isTie = existing !== undefined && Math.abs(ratio - existing) <= ratioTolerance;
        if (shouldReplace || isTie) {
            ratios.set(resObj, ratio);
            if (meta) {
                shortageMeta.set(resObj, meta);
            } else if (!shortageMeta.has(resObj)) {
                shortageMeta.set(resObj, {});
            }
        }
    };

    const seenKeys = new Set();

    if (typeof building.getEffectiveCost === 'function') {
        const cost = building.getEffectiveCost(requiredAmount) || {};
        for (const category in cost) {
            if (!Object.prototype.hasOwnProperty.call(cost, category)) continue;
            for (const resource in cost[category]) {
                if (!Object.prototype.hasOwnProperty.call(cost[category], resource)) continue;
                const resObj = resources?.[category]?.[resource];
                if (!resObj) continue;
                const required = cost[category][resource];
                if (required <= 0) continue;
                const cap = resObj.cap || 0;
                const reserve = (reservePercent / 100) * cap;
                const prioritizedReserve = extraReserves?.[category]?.[resource] || 0;
                const available = (resObj.value || 0) - reserve - prioritizedReserve;
                if (available + 1e-9 < required) {
                    const depositRequirement = building.requiresDeposit?.underground?.[resource];
                    const isLandResource = category === 'surface' && resource === 'land' && (building.requiresLand || 0) > 0;
                    const ratio = available / required;
                    const meta = {
                        type: depositRequirement ? 'deposit' : isLandResource ? 'land' : 'resource',
                        available,
                    };
                    if (meta.type === 'land') {
                        meta.requiredPerUnit = building.requiresLand;
                    }
                    registerShortage(resObj, ratio, meta);
                }
                seenKeys.add(`${category}:${resource}`);
            }
        }
    }

    if (building.requiresDeposit?.underground) {
        for (const deposit in building.requiresDeposit.underground) {
            if (!Object.prototype.hasOwnProperty.call(building.requiresDeposit.underground, deposit)) continue;
            if (seenKeys.has(`underground:${deposit}`)) continue;
            const resObj = resources?.underground?.[deposit];
            if (!resObj) continue;
            const required = building.requiresDeposit.underground[deposit] * requiredAmount;
            if (required <= 0) continue;
            const available = (resObj.value || 0) - (resObj.reserved || 0);
            if (available + 1e-9 < required) {
                const ratio = available / required;
                registerShortage(resObj, ratio, {
                    type: 'deposit',
                    available,
                });
            }
        }
    }

    if (building.requiresLand) {
        if (!seenKeys.has('surface:land')) {
            const landRes = resources?.surface?.land;
            if (landRes) {
                const required = building.requiresLand * requiredAmount;
                if (required > 0) {
                    const available = (landRes.value || 0) - (landRes.reserved || 0);
                    if (available + 1e-9 < required) {
                        const ratio = available / required;
                        registerShortage(landRes, ratio, {
                            type: 'land',
                            available,
                            requiredPerUnit: building.requiresLand,
                        });
                    }
                }
            }
        }
    }

    if (ratios.size === 0) return;

    const entries = Array.from(ratios.entries()).map(([resObj, ratio]) => ({
        resObj,
        ratio,
        meta: shortageMeta.get(resObj) || {},
    }));

    const isLandOrDepositException = entry => {
        if (!entry || !entry.meta) return false;
        if (entry.meta.type === 'deposit') {
            return (entry.meta.available || 0) <= ratioTolerance;
        }
        if (entry.meta.type === 'land') {
            const requiredPerUnit = entry.meta.requiredPerUnit || 0;
            if (requiredPerUnit <= 0) return false;
            return (entry.meta.available || 0) + ratioTolerance < requiredPerUnit;
        }
        return false;
    };

    const exceptionEntries = entries.filter(isLandOrDepositException);

    if (exceptionEntries.length === entries.length) {
        return;
    }

    let lowestRatio = Infinity;
    for (const { ratio } of entries) {
        if (ratio + ratioTolerance < lowestRatio) {
            lowestRatio = ratio;
        }
    }

    for (const { resObj, ratio, meta } of entries) {
        if (ratio <= lowestRatio + ratioTolerance && meta?.type !== 'deposit') {
            resObj.autobuildShortage = true;
        }
    }
}

// Construction Office state and UI
const constructionOfficeState = {
    autobuilderActive: true,
    strategicReserve: 0,
};

function updateConstructionOfficeUI() {
    const container = typeof document !== 'undefined' ? document.getElementById('construction-office-container') : null;
    const statusSpan = typeof document !== 'undefined' ? document.getElementById('autobuilder-status') : null;
    const pauseBtn = typeof document !== 'undefined' ? document.getElementById('autobuilder-pause-btn') : null;
    const reserveInput = typeof document !== 'undefined' ? document.getElementById('strategic-reserve-input') : null;

    if (container && typeof globalEffects !== 'undefined' && typeof globalEffects.isBooleanFlagSet === 'function') {
        const unlocked = globalEffects.isBooleanFlagSet('automateConstruction');
        container.classList.toggle('invisible', !unlocked);
    }
    if (statusSpan) {
        statusSpan.textContent = constructionOfficeState.autobuilderActive ? 'active' : 'disabled';
    }
    if (pauseBtn) {
        pauseBtn.textContent = constructionOfficeState.autobuilderActive ? 'Pause' : 'Resume';
    }
    if (reserveInput) {
        const activeElement = globalThis.document?.activeElement;
        if (reserveInput !== activeElement) {
            reserveInput.value = `${constructionOfficeState.strategicReserve}`;
        }
    }
}

function setAutobuilderActive(active) {
    constructionOfficeState.autobuilderActive = !!active;
    updateConstructionOfficeUI();
}

function toggleAutobuilder() {
    setAutobuilderActive(!constructionOfficeState.autobuilderActive);
}

function setStrategicReserve(value) {
    let val = parseFloat(value);
    if (Number.isNaN(val)) {
        val = 0;
    }
    val = Math.max(0, Math.min(100, val));
    constructionOfficeState.strategicReserve = val;
}

function saveConstructionOfficeState() {
    return { ...constructionOfficeState };
}

function loadConstructionOfficeState(state) {
    if (!state) return;
    setAutobuilderActive(state.autobuilderActive);
    setStrategicReserve(state.strategicReserve);
}

function captureConstructionOfficeSettings() {
    return saveConstructionOfficeState();
}

function restoreConstructionOfficeSettings(state) {
    loadConstructionOfficeState(state);
}

function initializeConstructionOfficeUI() {
    const container = typeof document !== 'undefined' ? document.getElementById('construction-office-container') : null;
    if (!container) return;

    container.innerHTML = '';
    container.classList.add('invisible');

    const card = document.createElement('div');
    card.classList.add('project-card');
    card.id = 'construction-office-card';

    const header = document.createElement('div');
    header.classList.add('card-header');
    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = 'Construction Office';
    header.appendChild(title);
    card.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const statusDiv = document.createElement('div');
    const statusLabel = document.createElement('span');
    statusLabel.textContent = 'Autobuilder: ';
    const statusValue = document.createElement('span');
    statusValue.id = 'autobuilder-status';
    statusDiv.appendChild(statusLabel);
    statusDiv.appendChild(statusValue);
    body.appendChild(statusDiv);

    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'autobuilder-pause-btn';
    pauseBtn.addEventListener('click', () => {
        toggleAutobuilder();
    });
    body.appendChild(pauseBtn);

    const reserveDiv = document.createElement('div');
    reserveDiv.style.display = 'flex';
    reserveDiv.style.flexDirection = 'column';
    reserveDiv.style.gap = '4px';

    const reserveLabel = document.createElement('label');
    reserveLabel.textContent = 'Strategic reserve';
    const reserveInfo = document.createElement('span');
    reserveInfo.classList.add('info-tooltip-icon');
    reserveInfo.innerHTML = '&#9432;';
    reserveInfo.title = 'Prevents the Construction Office from using resources from storage if spending them would drop any resource below the specified percentage of its capacity.  Does not apply to workers.';
    reserveLabel.appendChild(reserveInfo);
    reserveDiv.appendChild(reserveLabel);

    const reserveControlsDiv = document.createElement('div');
    reserveControlsDiv.style.display = 'flex';
    reserveControlsDiv.style.alignItems = 'flex-start';
    reserveControlsDiv.style.gap = '4px';

    const reserveInput = document.createElement('input');
    reserveInput.type = 'number';
    reserveInput.min = '0';
    reserveInput.max = '100';
    reserveInput.step = 'any';
    reserveInput.id = 'strategic-reserve-input';
    reserveInput.addEventListener('input', () => {
        setStrategicReserve(reserveInput.value);
    });
    const percentSpan = document.createElement('span');
    percentSpan.textContent = '%';

    reserveControlsDiv.appendChild(reserveInput);
    reserveControlsDiv.appendChild(percentSpan);
    reserveDiv.appendChild(reserveControlsDiv);
    body.appendChild(reserveDiv);

    card.appendChild(body);
    container.appendChild(card);

    updateConstructionOfficeUI();
}

const savedAutoBuildSettings = {};

function captureAutoBuildSettings(structures) {
    for (const name in structures) {
        const s = structures[name];
        savedAutoBuildSettings[name] = {
            percent: s.autoBuildPercent,
            basis: s.autoBuildBasis,
            priority: s.autoBuildPriority,
            autoActive: s.autoActiveEnabled,
            autoUpgrade: s.autoUpgradeEnabled,
            step: s.autoBuildStep,
            fixed: s.autoBuildFixed,
            fillPercent: s.autoBuildFillPercent,
            fillPrimary: s.autoBuildFillResourcePrimary,
            fillSecondary: s.autoBuildFillResourceSecondary,
        };
    }
}

function restoreAutoBuildSettings(structures) {
    for (const name in structures) {
        const s = structures[name];
        if (savedAutoBuildSettings[name]) {
            s.autoBuildPercent = savedAutoBuildSettings[name].percent;
            s.autoBuildBasis = savedAutoBuildSettings[name].basis || (s.autoBuildFillEnabled ? 'fill' : 'population');
            s.autoBuildPriority = !!savedAutoBuildSettings[name].priority;
            s.autoActiveEnabled = savedAutoBuildSettings[name].autoActive !== undefined
                ? savedAutoBuildSettings[name].autoActive
                : true;
            s.autoUpgradeEnabled = !!savedAutoBuildSettings[name].autoUpgrade;
            if (savedAutoBuildSettings[name].fixed !== undefined) {
                s.autoBuildFixed = Math.max(0, Math.floor(savedAutoBuildSettings[name].fixed || 0));
            }
            if (savedAutoBuildSettings[name].fillPercent !== undefined) {
                s.autoBuildFillPercent = savedAutoBuildSettings[name].fillPercent;
            }
            if (savedAutoBuildSettings[name].fillPrimary !== undefined) {
                s.autoBuildFillResourcePrimary = savedAutoBuildSettings[name].fillPrimary;
            }
            if (savedAutoBuildSettings[name].fillSecondary !== undefined) {
                s.autoBuildFillResourceSecondary = savedAutoBuildSettings[name].fillSecondary;
            }
            const restoredStep = savedAutoBuildSettings[name].step;
            if (Number.isFinite(restoredStep) && restoredStep > 0) {
                s.autoBuildStep = restoredStep;
            } else {
                s.autoBuildStep = 0.01;
            }
        } else {
            s.autoBuildBasis = s.autoBuildFillEnabled ? 'fill' : 'population';
            s.autoBuildPriority = false;
            s.autoActiveEnabled = true;
            s.autoBuildStep = 0.01;
        }
        s.autoBuildEnabled = false;
        s.autoActiveEnabled = false;
        s.autoUpgradeEnabled = false;
    }
}

function getAffordableUpgradeCount(colony, maxCount) {
    let best = 0;
    let low = 1;
    let high = maxCount;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (colony.canAffordUpgrade(mid)) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return best;
}

function autoUpgradeColonies(buildings) {
    for (const key in buildings) {
        const structure = buildings[key];
        if (!structure || structure.isHidden || !structure.autoUpgradeEnabled) continue;
        if (!structure.getNextTierName || !structure.canAffordUpgrade || !structure.upgrade) continue;
        const nextName = structure.getNextTierName();
        if (!nextName) continue;
        const next = buildings[nextName];
        if (!next || !next.unlocked || next.isHidden) continue;

        while (structure.count >= 10) {
            const maxByCount = Math.floor(structure.count / 10);
            if (maxByCount <= 0) break;
            const upgradeCount = getAffordableUpgradeCount(structure, maxByCount);
            if (!upgradeCount) break;
            const cost = structure.getUpgradeCost(upgradeCount);
            if (!structure.upgrade(upgradeCount)) break;
            if (cost) autobuildCostTracker.recordCost(structure.displayName, cost);
        }

        if (structure.count > 0) {
            const upgradeCount = getAffordableUpgradeCount(structure, 1);
            if (!upgradeCount) continue;
            const cost = structure.getUpgradeCost(upgradeCount);
            if (!structure.upgrade(upgradeCount)) continue;
            if (cost) autobuildCostTracker.recordCost(structure.displayName, cost);
        }
    }
}

function autoBuild(buildings, delta = 0) {
    resetAutoBuildPartialFlags(buildings);
    resetAutoBuildResourceShortages(typeof resources !== 'undefined' ? resources : null);
    const autobuilderPaused = typeof constructionOfficeState !== 'undefined' && !constructionOfficeState.autobuilderActive;
    if (!autobuilderPaused) {
        autobuildCostTracker.update(delta);
        autoUpgradeColonies(buildings);
    }
    const population = resources.colony.colonists.value;
    const workerCap = resources.colony.workers?.cap || 0;
    const buildableBuildings = [];
    const buildingInfos = [];

    // Step 1: Calculate ratios and populate buildableBuildings with required info
    for (const buildingName in buildings) {
        const building = buildings[buildingName];
        if (!building || building.isHidden || !building.unlocked) continue;
        if (building.autoBuildEnabled || building.autoActiveEnabled) {
            const usesFillMode = building.autoBuildFillEnabled && building.autoBuildBasis === 'fill';
            if (usesFillMode) {
                const fillData = getAutoBuildFillData(building);
                const targetCount = building.count + fillData.requiredAmount;
                buildingInfos.push({ building, targetCount });
                if (building.autoBuildEnabled && fillData.requiredAmount > 0) {
                    buildableBuildings.push({
                        building,
                        currentRatio: Math.max(0, 1 - fillData.fillRatio),
                        requiredAmount: fillData.requiredAmount,
                        maxMode: false,
                    });
                }
                continue;
            }
            const usesMaxBasis = building.autoBuildBasis === 'max';
            const usesFixedBasis = building.autoBuildBasis === 'fixed';
            const usesWorkerShareBasis = building.autoBuildBasis === 'workerShare';
            const fixedTarget = usesFixedBasis ? Math.max(0, Math.floor(building.autoBuildFixed || 0)) : 0;
            const base = usesMaxBasis || usesFixedBasis || usesWorkerShareBasis
                ? 0
                : resolveAutoBuildBase(building, population, workerCap, buildings);
            const targetCount = usesMaxBasis
                ? Infinity
                : usesFixedBasis
                    ? fixedTarget
                    : usesWorkerShareBasis
                        ? building.getWorkerShareTarget(workerCap)
                        : Math.ceil(((building.autoBuildPercent || 0) * base) / 100);

            buildingInfos.push({ building, targetCount });

            if (building.autoBuildEnabled) {
                const currentRatio = usesMaxBasis ? 0 : (targetCount > 0 ? building.count / targetCount : 0);
                const requiredAmount = usesMaxBasis ? 1 : targetCount - building.count;

                if (requiredAmount > 0) {
                    buildableBuildings.push({
                        building,
                        currentRatio,
                        requiredAmount,
                        maxMode: usesMaxBasis,
                    });
                }
            }
        }
    }

    const prioritizedReserve = {};
    buildableBuildings.forEach(entry => {
        if (!entry.building.autoBuildPriority) return;
        const totalCost = entry.building.getEffectiveCost?.(1);
        addCostToPrioritizedReserve(prioritizedReserve, totalCost);
    });

    if (!autobuilderPaused) {
        // Step 2: Sort buildable buildings by priority then current ratio (ascending)
        buildableBuildings.sort((a, b) => {
            if (a.building.autoBuildPriority && !b.building.autoBuildPriority) return -1;
            if (!a.building.autoBuildPriority && b.building.autoBuildPriority) return 1;
            return a.currentRatio - b.currentRatio;
        });

        // Step 3: Efficiently allocate builds
        buildableBuildings.forEach(({ building, requiredAmount, maxMode }) => {
            let buildCount = 0;
            const reserve = constructionOfficeState.strategicReserve;
            const extraReserves = building.autoBuildPriority ? null : prioritizedReserve;
            const maxCount = building.getAutoBuildMaxCount(reserve, extraReserves);
            const buildLimit = building.getBuildLimit() || Infinity;
            const desiredAmount = maxMode
                ? maxCount
                : Math.min(requiredAmount, buildLimit - building.count);
            if (desiredAmount <= 0) {
                return;
            }
            const canBuildFull = building.canAfford(desiredAmount, reserve, extraReserves);
            if (!canBuildFull) {
                building.autoBuildPartial = true;
                markAutoBuildShortages(building, desiredAmount, reserve, extraReserves);
            }
            buildCount = canBuildFull ? desiredAmount : maxCount;

            if (maxMode && buildCount > 0 && buildCount < desiredAmount) {
                building.autoBuildPartial = true;
                const reservePercent = constructionOfficeState.strategicReserve;
                markAutoBuildShortages(building, desiredAmount, reservePercent, extraReserves);
            }

            if (buildCount > 0) {
                const previousCount = building.count;
                let built = false;
                if (typeof building.build === 'function') {
                    built = building.build(buildCount, false);
                }
                const actualBuilt = built ? Math.max(0, building.count - previousCount) : 0;
                if (built && actualBuilt > 0) {
                    const effectiveCost = building.getEffectiveCost(actualBuilt);
                    const cost = cloneCostObject(effectiveCost);
                    const kesslerMultiplier = building.getKesslerCostMultiplier();
                    const kesslerBaseCost = building.getBaseEffectiveCost(actualBuilt);
                    const kesslerDebris = building._getKesslerDebrisFromCost(kesslerBaseCost, kesslerMultiplier);
                    if (building.requiresDeposit) {
                        for (const dep in building.requiresDeposit.underground) {
                            cost.underground = cost.underground || {};
                            cost.underground[dep] = (cost.underground[dep] || 0) + building.requiresDeposit.underground[dep] * actualBuilt;
                        }
                    }
                    if (building.requiresLand) {
                        cost.surface = cost.surface || {};
                        cost.surface.land = (cost.surface.land || 0) + building.requiresLand * actualBuilt;
                    }
                    if (kesslerDebris > 0) {
                        cost.special = cost.special || {};
                        cost.special.orbitalDebris = (cost.special.orbitalDebris || 0) - kesslerDebris;
                    }

                    autobuildCostTracker.recordCost(building.displayName, cost);
                    if (building.autoBuildPriority) {
                        subtractCostFromPrioritizedReserve(prioritizedReserve, effectiveCost);
                    }
                }
            }
            // Skip incremental building as it significantly impacts performance
        });
    }

    // Step 4: Auto-set active counts after building
    buildingInfos.forEach(({ building, targetCount }) => {
        if (building.autoActiveEnabled) {
            const desiredActive = Math.min(targetCount, building.count);
            const change = desiredActive - building.active;
            if (change !== 0) {
                if (typeof adjustStructureActivation === 'function') {
                    adjustStructureActivation(building, change);
                } else {
                    building.active = Math.max(0, Math.min(building.active + change, building.count));
                }
            }
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        autoBuild,
        autoUpgradeColonies,
        autobuildCostTracker,
        resolveAutoBuildBase,
        captureAutoBuildSettings,
        restoreAutoBuildSettings,
        constructionOfficeState,
        setAutobuilderActive,
        toggleAutobuilder,
        setStrategicReserve,
        saveConstructionOfficeState,
        loadConstructionOfficeState,
        captureConstructionOfficeSettings,
        restoreConstructionOfficeSettings,
        updateConstructionOfficeUI,
        initializeConstructionOfficeUI,
    };
}

if (typeof window !== 'undefined') {
    window.autoBuild = autoBuild;
    window.autoUpgradeColonies = autoUpgradeColonies;
    window.autobuildCostTracker = autobuildCostTracker;
    window.resolveAutoBuildBase = resolveAutoBuildBase;
    window.captureAutoBuildSettings = captureAutoBuildSettings;
    window.restoreAutoBuildSettings = restoreAutoBuildSettings;
    window.constructionOfficeState = constructionOfficeState;
    window.setAutobuilderActive = setAutobuilderActive;
    window.toggleAutobuilder = toggleAutobuilder;
    window.setStrategicReserve = setStrategicReserve;
    window.saveConstructionOfficeState = saveConstructionOfficeState;
    window.loadConstructionOfficeState = loadConstructionOfficeState;
    window.captureConstructionOfficeSettings = captureConstructionOfficeSettings;
    window.restoreConstructionOfficeSettings = restoreConstructionOfficeSettings;
    window.updateConstructionOfficeUI = updateConstructionOfficeUI;
    window.initializeConstructionOfficeUI = initializeConstructionOfficeUI;
}
