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

function markAutoBuildShortages(building, requiredAmount, reservePercent) {
    if (!building || requiredAmount <= 0) return;
    if (typeof resources === 'undefined' || !resources) return;

    const depositLimited = (() => {
        if (!building.requiresDeposit) return false;
        if (typeof building.canAffordDeposit === 'function') {
            return !building.canAffordDeposit(requiredAmount);
        }
        const deposits = building.requiresDeposit.underground || {};
        for (const deposit in deposits) {
            if (!Object.prototype.hasOwnProperty.call(deposits, deposit)) continue;
            const res = resources?.underground?.[deposit];
            const required = deposits[deposit] * requiredAmount;
            if (!res || (res.value || 0) - (res.reserved || 0) < required) {
                return true;
            }
        }
        return false;
    })();

    const landLimited = (() => {
        if (!building.requiresLand) return false;
        if (typeof building.canAffordLand === 'function') {
            return !building.canAffordLand(requiredAmount);
        }
        const landRes = resources?.surface?.land;
        if (!landRes) return false;
        return (landRes.value || 0) - (landRes.reserved || 0) < building.requiresLand * requiredAmount;
    })();

    if (depositLimited || landLimited) {
        return;
    }

    if (typeof building.getEffectiveCost === 'function') {
        const cost = building.getEffectiveCost(requiredAmount) || {};
        const limitingResources = new Set();
        let lowestRatio = Infinity;
        let shortageDetected = false;
        const ratioTolerance = 1e-9;
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
                const available = (resObj.value || 0) - reserve;
                if (available + 1e-9 < required) {
                    shortageDetected = true;
                    const ratio = available / required;
                    if (ratio + ratioTolerance < lowestRatio) {
                        lowestRatio = ratio;
                        limitingResources.clear();
                        limitingResources.add(resObj);
                    } else if (Math.abs(ratio - lowestRatio) <= ratioTolerance) {
                        limitingResources.add(resObj);
                    }
                }
            }
        }
        if (!shortageDetected) return;
        for (const res of limitingResources) {
            res.autobuildShortage = true;
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
        reserveInput.value = constructionOfficeState.strategicReserve;
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
    let val = parseInt(value, 10);
    if (isNaN(val)) val = 0;
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
        };
    }
}

function restoreAutoBuildSettings(structures) {
    for (const name in structures) {
        const s = structures[name];
        if (savedAutoBuildSettings[name]) {
            s.autoBuildPercent = savedAutoBuildSettings[name].percent;
            s.autoBuildBasis = savedAutoBuildSettings[name].basis || 'population';
            s.autoBuildPriority = !!savedAutoBuildSettings[name].priority;
            s.autoActiveEnabled = savedAutoBuildSettings[name].autoActive !== undefined
                ? savedAutoBuildSettings[name].autoActive
                : true;
        } else {
            s.autoBuildBasis = 'population';
            s.autoBuildPriority = false;
            s.autoActiveEnabled = true;
        }
        s.autoBuildEnabled = false;
        s.autoActiveEnabled = false;
    }
}

function autoBuild(buildings, delta = 0) {
    resetAutoBuildPartialFlags(buildings);
    resetAutoBuildResourceShortages(typeof resources !== 'undefined' ? resources : null);
    if (typeof constructionOfficeState !== 'undefined' && !constructionOfficeState.autobuilderActive) {
        return;
    }
    autobuildCostTracker.update(delta);
    const population = resources.colony.colonists.value;
    const workerCap = resources.colony.workers?.cap || 0;
    const buildableBuildings = [];
    const buildingInfos = [];

    // Step 1: Calculate ratios and populate buildableBuildings with required info
    for (const buildingName in buildings) {
        const building = buildings[buildingName];
        if (building.autoBuildEnabled || building.autoActiveEnabled) {
            const base = building.autoBuildBasis === 'workers' ? workerCap : population;
            const targetCount = Math.ceil(((building.autoBuildPercent || 0)* base) / 100);

            buildingInfos.push({ building, targetCount });

            if (building.autoBuildEnabled) {
                const currentRatio = building.count / targetCount;
                const requiredAmount = targetCount - building.count;

                if (requiredAmount > 0) {
                    buildableBuildings.push({
                        building,
                        currentRatio,
                        requiredAmount,
                    });
                }
            }
        }
    }

    // Step 2: Sort buildable buildings by priority then current ratio (ascending)
    buildableBuildings.sort((a, b) => {
        if (a.building.autoBuildPriority && !b.building.autoBuildPriority) return -1;
        if (!a.building.autoBuildPriority && b.building.autoBuildPriority) return 1;
        return a.currentRatio - b.currentRatio;
    });

    // Step 3: Efficiently allocate builds
    buildableBuildings.forEach(({ building, requiredAmount }) => {
        let buildCount = 0;
        const reserve = constructionOfficeState.strategicReserve;
        const canBuildFull = building.canAfford(requiredAmount, reserve);
        if (!canBuildFull) {
            building.autoBuildPartial = true;
            markAutoBuildShortages(building, requiredAmount, reserve);
        }
        if (canBuildFull) {
            buildCount = requiredAmount;
        } else {
            let maxBuildable = building.maxBuildable(reserve);

            if (building.requiresLand && typeof building.landAffordCount === 'function') {
                maxBuildable = Math.min(maxBuildable, building.landAffordCount());
            }

            if (maxBuildable > 0) {
                buildCount = maxBuildable;
            }
        }

        if (buildCount > 0) {
            const cost = building.getEffectiveCost ? building.getEffectiveCost(buildCount) : {};
            if (building.requiresDeposit) {
                for (const dep in building.requiresDeposit.underground) {
                    cost.underground = cost.underground || {};
                    cost.underground[dep] = (cost.underground[dep] || 0) + building.requiresDeposit.underground[dep] * buildCount;
                }
            }
            if (building.requiresLand) {
                cost.surface = cost.surface || {};
                cost.surface.land = (cost.surface.land || 0) + building.requiresLand * buildCount;
            }

            let built = false;
            if (typeof building.build === 'function') {
                built = building.build(buildCount, false);
            }
            if (built) {
                autobuildCostTracker.recordCost(building.displayName, cost);
            }
        }
        // Skip incremental building as it significantly impacts performance
    });

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
        autobuildCostTracker,
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
    window.autobuildCostTracker = autobuildCostTracker;
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