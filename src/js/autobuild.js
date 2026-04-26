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

function getConstructionOfficeText(path, fallback, vars) {
    try {
        return t(path, vars, fallback);
    } catch (error) {
        return fallback;
    }
}

const CONSTRUCTION_OFFICE_RESERVE_RESOURCES = [
    { key: 'colony.energy', category: 'colony', resource: 'energy', labelKey: 'energy', fallbackLabel: 'Energy' },
    { key: 'colony.metal', category: 'colony', resource: 'metal', labelKey: 'metal', fallbackLabel: 'Metal' },
    { key: 'colony.glass', category: 'colony', resource: 'glass', labelKey: 'glass', fallbackLabel: 'Glass' },
    { key: 'colony.water', category: 'colony', resource: 'water', labelKey: 'water', fallbackLabel: 'Water' },
    { key: 'colony.components', category: 'colony', resource: 'components', labelKey: 'components', fallbackLabel: 'Components' },
    { key: 'colony.electronics', category: 'colony', resource: 'electronics', labelKey: 'electronics', fallbackLabel: 'Electronics' },
    { key: 'colony.superconductors', category: 'colony', resource: 'superconductors', labelKey: 'superconductors', fallbackLabel: 'Superconductors' },
    { key: 'colony.superalloys', category: 'colony', resource: 'superalloys', labelKey: 'superalloys', fallbackLabel: 'Superalloys' },
    { key: 'surface.land', category: 'surface', resource: 'land', labelKey: 'land', fallbackLabel: 'Land' },
];

function normalizeConstructionOfficeReservePercent(value) {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
        return 0;
    }
    return Math.max(0, Math.min(100, parsed));
}

function getConstructionOfficeReserveResourceLabel(option) {
    return getConstructionOfficeText(
        `ui.colony.constructionOffice.reserveResources.${option.labelKey}`,
        option.fallbackLabel
    );
}

function getConstructionOfficeReservePercentForResource(reserveSettings, category, resource) {
    if (reserveSettings && reserveSettings.constructor === Object) {
        const key = `${category}.${resource}`;
        if (Object.prototype.hasOwnProperty.call(reserveSettings, key)) {
            return normalizeConstructionOfficeReservePercent(reserveSettings[key]);
        }
        if (Object.prototype.hasOwnProperty.call(reserveSettings, resource)) {
            return normalizeConstructionOfficeReservePercent(reserveSettings[resource]);
        }
        return normalizeConstructionOfficeReservePercent(reserveSettings.default);
    }
    return normalizeConstructionOfficeReservePercent(reserveSettings);
}

function getConstructionOfficeReserveSettings() {
    const settings = { default: constructionOfficeState.strategicReserve };
    const perResource = constructionOfficeState.strategicReserveResources || {};
    CONSTRUCTION_OFFICE_RESERVE_RESOURCES.forEach(option => {
        if (Object.prototype.hasOwnProperty.call(perResource, option.key)) {
            settings[option.key] = normalizeConstructionOfficeReservePercent(perResource[option.key]);
        }
    });
    return settings;
}

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
    if (basis === 'geometricLand' || basis === 'initialLand') {
        return resolveWorldGeometricLand(terraforming, resources.surface.land);
    }

    if (basis.startsWith('building:')) {
        const target = collection?.[basis.slice(9)];
        return Number.isFinite(target?.activeNumber)
            ? target.activeNumber
            : (typeof buildingCountToNumber === 'function'
                ? buildingCountToNumber(target?.active)
                : Math.max(0, Math.floor(Number(target?.active) || 0)));
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
                const resourceReservePercent = getConstructionOfficeReservePercentForResource(reservePercent, category, resource);
                const reserve = Number.isFinite(cap) ? (resourceReservePercent / 100) * cap : 0;
                const prioritizedReserve = extraReserves?.[category]?.[resource] || 0;
                const baseAvailable = resObj.getAvailableAmount ? resObj.getAvailableAmount() : (resObj.value || 0) - (resObj.reserved || 0);
                const available = baseAvailable - reserve - prioritizedReserve;
                if (available + 1e-9 < required) {
                    const depositRequirement = building.requiresDeposit?.underground?.[resource];
                    const isLandResource = category === 'surface' && resource === 'land' && (building.requiresLand || 0) > 0;
                    const ratio = available / required;
                    const meta = {
                        type: depositRequirement ? 'deposit' : isLandResource ? 'land' : 'resource',
                        available,
                        category,
                        resource,
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
            const available = resObj.getAvailableAmount ? resObj.getAvailableAmount() : (resObj.value || 0) - (resObj.reserved || 0);
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
                    const cap = landRes.cap || 0;
                    const landReservePercent = getConstructionOfficeReservePercentForResource(reservePercent, 'surface', 'land');
                    const reserve = Number.isFinite(cap) ? (landReservePercent / 100) * cap : 0;
                    const baseAvailable = landRes.getAvailableAmount ? landRes.getAvailableAmount() : (landRes.value || 0) - (landRes.reserved || 0);
                    const available = baseAvailable - reserve;
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
    const hasLandShortage = entries.some(entry => entry?.meta?.type === 'land');
    let oneUnitCost = null;
    if (hasLandShortage && typeof building.getEffectiveCost === 'function') {
        oneUnitCost = building.getEffectiveCost(1) || {};
    }

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
        if (ratio > lowestRatio + ratioTolerance || meta?.type === 'deposit') {
            continue;
        }

        if (hasLandShortage && meta?.type === 'resource') {
            const category = meta.category;
            const resource = meta.resource;
            const requiredForOne = oneUnitCost?.[category]?.[resource] || 0;
            if (requiredForOne > 0 && (meta.available || 0) + ratioTolerance >= requiredForOne) {
                continue;
            }
        }

        resObj.autobuildShortage = true;
    }
}

// Construction Office state and UI
const constructionOfficeState = {
    autobuilderActive: true,
    strategicReserve: 0,
    strategicReserveResources: {},
};

const constructionOfficeReserveSettingsElements = {
    overlay: null,
    inputs: {},
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
        statusSpan.textContent = constructionOfficeState.autobuilderActive
            ? getConstructionOfficeText('ui.colony.constructionOffice.statusActive', 'active')
            : getConstructionOfficeText('ui.colony.constructionOffice.statusDisabled', 'disabled');
    }
    if (pauseBtn) {
        pauseBtn.textContent = constructionOfficeState.autobuilderActive
            ? getConstructionOfficeText('ui.colony.constructionOffice.pause', 'Pause')
            : getConstructionOfficeText('ui.colony.constructionOffice.resume', 'Resume');
    }
    if (reserveInput) {
        const activeElement = document.activeElement;
        if (reserveInput !== activeElement) {
            reserveInput.value = `${constructionOfficeState.strategicReserve}`;
        }
    }
    for (const key in constructionOfficeReserveSettingsElements.inputs) {
        if (!Object.prototype.hasOwnProperty.call(constructionOfficeReserveSettingsElements.inputs, key)) continue;
        const input = constructionOfficeReserveSettingsElements.inputs[key];
        if (input && input !== document.activeElement) {
            const value = key === 'default'
                ? constructionOfficeState.strategicReserve
                : (Object.prototype.hasOwnProperty.call(constructionOfficeState.strategicReserveResources, key)
                    ? constructionOfficeState.strategicReserveResources[key]
                    : constructionOfficeState.strategicReserve);
            input.dataset.constructionOfficeReserve = String(value);
            input.value = String(value);
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
    constructionOfficeState.strategicReserve = normalizeConstructionOfficeReservePercent(value);
}

function setStrategicReserveForResource(key, value) {
    const known = CONSTRUCTION_OFFICE_RESERVE_RESOURCES.some(option => option.key === key);
    if (!known) return;
    constructionOfficeState.strategicReserveResources[key] = normalizeConstructionOfficeReservePercent(value);
}

function closeConstructionOfficeReserveSettings() {
    if (constructionOfficeReserveSettingsElements.overlay) {
        constructionOfficeReserveSettingsElements.overlay.classList.remove('is-visible');
    }
}

function openConstructionOfficeReserveSettings() {
    updateConstructionOfficeUI();
    constructionOfficeReserveSettingsElements.overlay.classList.add('is-visible');
}

function createConstructionOfficeReserveSettingsWindow() {
    const overlay = document.createElement('div');
    overlay.classList.add('space-storage-settings-overlay');

    const win = document.createElement('div');
    win.classList.add('space-storage-settings-window', 'construction-office-reserve-window');

    const header = document.createElement('div');
    header.classList.add('space-storage-settings-header');
    const title = document.createElement('div');
    title.classList.add('space-storage-settings-title');
    title.textContent = getConstructionOfficeText('ui.colony.constructionOffice.reserveSettingsTitle', 'Strategic Reserve');
    const close = document.createElement('button');
    close.type = 'button';
    close.classList.add('space-storage-settings-close');
    close.textContent = getConstructionOfficeText('ui.colony.constructionOffice.close', 'X');
    close.addEventListener('click', closeConstructionOfficeReserveSettings);
    header.append(title, close);

    const intro = document.createElement('div');
    intro.classList.add('construction-office-reserve-intro');
    intro.textContent = getConstructionOfficeText(
        'ui.colony.constructionOffice.reserveSettingsIntro',
        'Set the Construction Office reserve percentage for each resource.'
    );

    const grid = document.createElement('div');
    grid.classList.add('construction-office-reserve-grid');
    constructionOfficeReserveSettingsElements.inputs = {};

    const createReserveRow = (labelText, inputId, value, onValue) => {
        const row = document.createElement('div');
        row.classList.add('space-storage-settings-row');

        const label = document.createElement('label');
        label.classList.add('space-storage-settings-label');
        label.htmlFor = inputId;
        label.textContent = labelText;

        const inputWrap = document.createElement('div');
        inputWrap.classList.add('construction-office-reserve-input-wrap');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = inputId;
        input.classList.add('space-storage-settings-input');
        input.dataset.constructionOfficeReserve = String(value);
        input.value = input.dataset.constructionOfficeReserve;
        wireStringNumberInput(input, {
            datasetKey: 'constructionOfficeReserve',
            parseValue: (inputValue) => normalizeConstructionOfficeReservePercent(parseFlexibleNumber(inputValue)),
            formatValue: (inputValue) => String(inputValue),
            onValue,
        });
        const percent = document.createElement('span');
        percent.textContent = '%';
        inputWrap.append(input, percent);
        row.append(label, inputWrap);
        return { row, input };
    };

    const defaultRow = createReserveRow(
        getConstructionOfficeText('ui.colony.constructionOffice.globalReserve', 'Global default'),
        'construction-office-reserve-default',
        constructionOfficeState.strategicReserve,
        (value) => {
            setStrategicReserve(value);
            updateConstructionOfficeUI();
        }
    );
    defaultRow.row.classList.add('construction-office-reserve-default-row');
    grid.appendChild(defaultRow.row);
    constructionOfficeReserveSettingsElements.inputs.default = defaultRow.input;

    CONSTRUCTION_OFFICE_RESERVE_RESOURCES.forEach(option => {
        const reserveRow = createReserveRow(
            getConstructionOfficeReserveResourceLabel(option),
            `construction-office-reserve-${option.resource}`,
            Object.prototype.hasOwnProperty.call(constructionOfficeState.strategicReserveResources, option.key)
                ? constructionOfficeState.strategicReserveResources[option.key]
                : constructionOfficeState.strategicReserve,
            (value) => {
                setStrategicReserveForResource(option.key, value);
            }
        );
        grid.appendChild(reserveRow.row);
        constructionOfficeReserveSettingsElements.inputs[option.key] = reserveRow.input;
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.classList.add('space-storage-settings-confirm');
    closeButton.textContent = getConstructionOfficeText('ui.colony.constructionOffice.done', 'Done');
    closeButton.addEventListener('click', closeConstructionOfficeReserveSettings);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeConstructionOfficeReserveSettings();
        }
    });

    win.append(header, intro, grid, closeButton);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
    constructionOfficeReserveSettingsElements.overlay = overlay;
}

function ensureConstructionOfficeReserveSettingsWindow() {
    if (!constructionOfficeReserveSettingsElements.overlay || !constructionOfficeReserveSettingsElements.overlay.isConnected) {
        createConstructionOfficeReserveSettingsWindow();
    }
}

function saveConstructionOfficeState() {
    return {
        ...constructionOfficeState,
        strategicReserveResources: { ...constructionOfficeState.strategicReserveResources },
    };
}

function loadConstructionOfficeState(state) {
    if (!state) return;
    setAutobuilderActive(state.autobuilderActive);
    setStrategicReserve(state.strategicReserve);
    constructionOfficeState.strategicReserveResources = {};
    if (state.strategicReserveResources && state.strategicReserveResources.constructor === Object) {
        CONSTRUCTION_OFFICE_RESERVE_RESOURCES.forEach(option => {
            if (Object.prototype.hasOwnProperty.call(state.strategicReserveResources, option.key)) {
                setStrategicReserveForResource(option.key, state.strategicReserveResources[option.key]);
            }
        });
    }
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
    title.textContent = getConstructionOfficeText('ui.colony.constructionOffice.title', 'Construction Office');
    header.appendChild(title);
    card.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const statusDiv = document.createElement('div');
    const statusLabel = document.createElement('span');
    statusLabel.textContent = getConstructionOfficeText('ui.colony.constructionOffice.autobuilder', 'Autobuilder: ');
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
    reserveLabel.textContent = getConstructionOfficeText('ui.colony.constructionOffice.strategicReserve', 'Strategic reserve');
    const reserveInfo = document.createElement('span');
    reserveInfo.classList.add('info-tooltip-icon');
    reserveInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
        reserveInfo,
        getConstructionOfficeText(
            'ui.colony.constructionOffice.strategicReserveTooltip',
            'Prevents the Construction Office from using resources from storage if spending them would drop any resource below the specified percentage of its capacity. Does not apply to workers.'
        )
    );
    reserveLabel.appendChild(reserveInfo);
    reserveDiv.appendChild(reserveLabel);

    const reserveControlsDiv = document.createElement('div');
    reserveControlsDiv.style.display = 'grid';
    reserveControlsDiv.style.alignItems = 'center';
    reserveControlsDiv.style.gap = '4px';
    reserveControlsDiv.classList.add('construction-office-reserve-controls');

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
    const reserveSettingsButton = document.createElement('button');
    reserveSettingsButton.type = 'button';
    reserveSettingsButton.classList.add('construction-office-reserve-settings-button');
    reserveSettingsButton.innerHTML = '&#9881;';
    reserveSettingsButton.setAttribute('aria-label', getConstructionOfficeText('ui.colony.constructionOffice.reserveSettingsButton', 'Reserve settings'));
    reserveSettingsButton.title = getConstructionOfficeText('ui.colony.constructionOffice.reserveSettingsButton', 'Reserve settings');
    reserveSettingsButton.addEventListener('click', () => {
        ensureConstructionOfficeReserveSettingsWindow();
        openConstructionOfficeReserveSettings();
    });

    reserveControlsDiv.appendChild(reserveInput);
    reserveControlsDiv.appendChild(percentSpan);
    reserveControlsDiv.appendChild(reserveSettingsButton);
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
            basis: s.autoBuildBasis === 'initialLand' ? 'geometricLand' : s.autoBuildBasis,
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
            const savedBasis = savedAutoBuildSettings[name].basis || (s.autoBuildFillEnabled ? 'fill' : 'population');
            s.autoBuildBasis = savedBasis === 'initialLand' ? 'geometricLand' : savedBasis;
            const priority = savedAutoBuildSettings[name].priority;
            if (priority === true) {
                s.autoBuildPriority = 1;
            } else if (priority === false || priority === undefined) {
                s.autoBuildPriority = 0;
            } else if (priority === -1 || priority === 0 || priority === 1) {
                s.autoBuildPriority = priority;
            } else {
                s.autoBuildPriority = 0;
            }
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
            s.autoBuildPriority = 0;
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
        const previousLow = low;
        const previousHigh = high;
        const mid = Math.floor((low + high) / 2);
        if (colony.canAffordUpgrade(mid)) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
        if (low === previousLow && high === previousHigh) {
            break;
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

        while (structure.count >= 10n) {
            const previousCount = structure.count;
            const maxByCount = Math.floor(structure.countNumber / 10);
            if (maxByCount <= 0) break;
            const upgradeCount = getAffordableUpgradeCount(structure, maxByCount);
            if (!upgradeCount) break;
            const cost = structure.getUpgradeCost(upgradeCount);
            if (!structure.upgrade(upgradeCount)) break;
            if (cost) autobuildCostTracker.recordCost(structure.displayName, cost);
            if (structure.count >= previousCount) break;
        }

        if (structure.count > 0n) {
            const upgradeCount = getAffordableUpgradeCount(structure, 1);
            if (!upgradeCount) continue;
            const cost = structure.getUpgradeCost(upgradeCount);
            if (!structure.upgrade(upgradeCount)) continue;
            if (cost) autobuildCostTracker.recordCost(structure.displayName, cost);
        }
    }
}

function canApplyAutoActiveTarget(building) {
    const autoActiveLocked = building.name === 'massDriver'
        && building.isBooleanFlagSet('autoActiveLockedByShipAutomation');
    if (autoActiveLocked) {
        building.autoActiveEnabled = false;
        return false;
    }
    if (building.enforceAutoActiveLock && building.enforceAutoActiveLock()) {
        return false;
    }
    return !!building.autoActiveEnabled;
}

function getAutoActivationTargetCount(building, population, workerCap, totalLand, collection) {
    const usesFillMode = building.autoBuildFillEnabled && building.autoBuildBasis === 'fill';
    if (usesFillMode) {
        const fillData = getAutoBuildFillData(building);
        return building.countNumber + fillData.requiredAmount;
    }

    const usesMaxBasis = building.autoBuildBasis === 'max';
    const usesAdjustableMaxBasis = usesMaxBasis && building.hasAdjustableAutoBuildMaxTarget();
    const usesFixedBasis = building.autoBuildBasis === 'fixed';
    const usesWorkerShareBasis = building.autoBuildBasis === 'workerShare';
    const usesLandShareBasis = building.autoBuildBasis === 'landShare';
    const usesAndroidCountBasis = building.autoBuildBasis === 'androidCount';
    const usesAndroidCapacityShareBasis = building.autoBuildBasis === 'androidCapacityShare';
    const fixedTarget = usesFixedBasis ? Math.max(0, Math.floor(building.autoBuildFixed || 0)) : 0;
    const base = usesMaxBasis || usesFixedBasis || usesWorkerShareBasis || usesLandShareBasis || usesAndroidCountBasis || usesAndroidCapacityShareBasis
        ? 0
        : resolveAutoBuildBase(building, population, workerCap, collection);

    return usesMaxBasis
        ? (usesAdjustableMaxBasis ? building.getAutoBuildMaxTargetCount() : Infinity)
        : usesFixedBasis
            ? fixedTarget
            : usesWorkerShareBasis
                ? building.getWorkerShareTarget(workerCap)
                : usesLandShareBasis
                    ? building.getLandShareTarget(totalLand)
                    : usesAndroidCountBasis
                        ? building.getAndroidCountTarget(resources.colony.androids.value || 0)
                        : usesAndroidCapacityShareBasis
                            ? building.getAndroidCapacityShareTarget(resources.colony.androids.cap || 0)
                            : Math.ceil(((building.autoBuildPercent || 0) * base) / 100);
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
    const totalLand = resources.surface.land.value;
    const buildableBuildings = [];
    const buildingInfos = [];

    // Step 1: Calculate ratios and populate buildableBuildings with required info
    for (const buildingName in buildings) {
        const building = buildings[buildingName];
        if (!building || building.isHidden || !building.unlocked) continue;
        if (building.autoBuildEnabled || building.autoActiveEnabled || (building.shouldClampSetActiveToSupported && building.shouldClampSetActiveToSupported())) {
            const usesFillMode = building.autoBuildFillEnabled && building.autoBuildBasis === 'fill';
            if (usesFillMode) {
                const fillData = getAutoBuildFillData(building);
                const targetCount = building.countNumber + fillData.requiredAmount;
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
            const usesAdjustableMaxBasis = usesMaxBasis && building.hasAdjustableAutoBuildMaxTarget();
            const usesFixedBasis = building.autoBuildBasis === 'fixed';
            const usesWorkerShareBasis = building.autoBuildBasis === 'workerShare';
            const usesLandShareBasis = building.autoBuildBasis === 'landShare';
            const usesAndroidCountBasis = building.autoBuildBasis === 'androidCount';
            const usesAndroidCapacityShareBasis = building.autoBuildBasis === 'androidCapacityShare';
            const fixedTarget = usesFixedBasis ? Math.max(0, Math.floor(building.autoBuildFixed || 0)) : 0;
            const base = usesMaxBasis || usesFixedBasis || usesWorkerShareBasis || usesLandShareBasis || usesAndroidCountBasis || usesAndroidCapacityShareBasis
                ? 0
                : resolveAutoBuildBase(building, population, workerCap, buildings);
            const targetCount = usesMaxBasis
                ? (usesAdjustableMaxBasis ? building.getAutoBuildMaxTargetCount() : Infinity)
                : usesFixedBasis
                    ? fixedTarget
                    : usesWorkerShareBasis
                        ? building.getWorkerShareTarget(workerCap)
                        : usesLandShareBasis
                            ? building.getLandShareTarget(totalLand)
                            : usesAndroidCountBasis
                                ? building.getAndroidCountTarget(resources.colony.androids.value || 0)
                            : usesAndroidCapacityShareBasis
                                ? building.getAndroidCapacityShareTarget(resources.colony.androids.cap || 0)
                            : Math.ceil(((building.autoBuildPercent || 0) * base) / 100);

            buildingInfos.push({ building, targetCount });

            if (building.autoBuildEnabled) {
                const currentRatio = usesMaxBasis && !usesAdjustableMaxBasis ? 0 : (targetCount > 0 ? building.countNumber / targetCount : 0);
                const requiredAmount = usesMaxBasis && !usesAdjustableMaxBasis ? 1 : targetCount - building.countNumber;

                if (requiredAmount > 0) {
                    buildableBuildings.push({
                        building,
                        currentRatio,
                        requiredAmount,
                        maxMode: usesMaxBasis && !usesAdjustableMaxBasis,
                    });
                }
            }
        }
    }

    const highReserve = {};
    const normalReserve = {};
    buildableBuildings.forEach(entry => {
        const priority = entry.building.autoBuildPriority;
        if (priority > 0) {
            const totalCost = entry.building.getEffectiveCost?.(1);
            addCostToPrioritizedReserve(highReserve, totalCost);
            addCostToPrioritizedReserve(normalReserve, totalCost);
            return;
        }
        if (priority === 0) {
            const totalCost = entry.building.getEffectiveCost?.(1);
            addCostToPrioritizedReserve(normalReserve, totalCost);
        }
    });

    if (!autobuilderPaused) {
        // Step 2: Sort buildable buildings by priority then current ratio (ascending)
        buildableBuildings.sort((a, b) => {
            if (a.building.autoBuildPriority !== b.building.autoBuildPriority) {
                return b.building.autoBuildPriority - a.building.autoBuildPriority;
            }
            return a.currentRatio - b.currentRatio;
        });

        // Step 3: Efficiently allocate builds
        const reserve = getConstructionOfficeReserveSettings();
        buildableBuildings.forEach(({ building, requiredAmount, maxMode }) => {
            let buildCount = 0;
            let extraReserves = normalReserve;
            if (building.autoBuildPriority > 0) {
                extraReserves = null;
            } else if (building.autoBuildPriority === 0) {
                extraReserves = highReserve;
            }
            const maxCount = building.getAutoBuildMaxCount(reserve, extraReserves);
            const buildLimit = building.getBuildLimit() ?? Infinity;
            const maxTargetCount = maxMode && building.getAutoBuildMaxTargetCount
                ? building.getAutoBuildMaxTargetCount()
                : buildLimit;
            const desiredAmount = maxMode
                ? maxTargetCount - building.countNumber
                : Math.min(requiredAmount, buildLimit - building.countNumber);
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
                markAutoBuildShortages(building, desiredAmount, reserve, extraReserves);
            }

            if (buildCount > 0) {
                const previousCount = building.countNumber;
                const plannedEffectiveCost = building.getEffectiveCost(buildCount);
                const plannedBaseCost = building.getBaseEffectiveCost(buildCount);
                const activateImmediately = canApplyAutoActiveTarget(building);
                let built = false;
                if (typeof building.build === 'function') {
                    built = building.build(buildCount, activateImmediately);
                }
                const actualBuilt = built ? Math.max(0, building.countNumber - previousCount) : 0;
                if (built && actualBuilt > 0) {
                    const effectiveCost = actualBuilt === buildCount
                        ? plannedEffectiveCost
                        : building.getEffectiveCost(actualBuilt);
                    const cost = cloneCostObject(effectiveCost);
                    const kesslerMultiplier = building.getKesslerCostMultiplier();
                    const kesslerBaseCost = actualBuilt === buildCount
                        ? plannedBaseCost
                        : building.getBaseEffectiveCost(actualBuilt);
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
                    if (building.autoBuildPriority > 0) {
                        subtractCostFromPrioritizedReserve(highReserve, effectiveCost);
                        subtractCostFromPrioritizedReserve(normalReserve, effectiveCost);
                    } else if (building.autoBuildPriority === 0) {
                        subtractCostFromPrioritizedReserve(normalReserve, effectiveCost);
                    }
                }
            }
            // Skip incremental building as it significantly impacts performance
        });
    }

    // Step 4: Auto-set active counts after building
    buildingInfos.forEach(({ building }) => {
        if (!building.shouldClampSetActiveToSupported || !building.shouldClampSetActiveToSupported()) {
            return;
        }
        const supportedCap = Math.max(0, Math.floor(building.getSupportedActiveCap()));
        const change = supportedCap - building.activeNumber;
        if (change >= 0) {
            return;
        }
        if (typeof adjustStructureActivation === 'function') {
            adjustStructureActivation(building, change);
        } else {
            building.active = BigInt(
                Math.max(0, Math.min(building.activeNumber + change, building.countNumber))
            );
        }
    });

    buildingInfos.forEach(({ building }) => {
        if (!canApplyAutoActiveTarget(building)) {
            return;
        }
        const currentPopulation = resources.colony.colonists.value;
        const currentWorkerCap = resources.colony.workers?.cap || 0;
        const currentTotalLand = resources.surface.land.value;
        const targetCount = getAutoActivationTargetCount(
            building,
            currentPopulation,
            currentWorkerCap,
            currentTotalLand,
            buildings
        );
        const desiredActive = building.getClampedSetActiveTargetCount
            ? building.getClampedSetActiveTargetCount(targetCount, building.countNumber)
            : Math.min(targetCount, building.countNumber);
        const change = desiredActive - building.activeNumber;
        if (change !== 0) {
            if (typeof adjustStructureActivation === 'function') {
                adjustStructureActivation(building, change);
            } else {
                building.active = BigInt(
                    Math.max(0, Math.min(building.activeNumber + change, building.countNumber))
                );
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
        setStrategicReserveForResource,
        getConstructionOfficeReserveSettings,
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
    window.setStrategicReserveForResource = setStrategicReserveForResource;
    window.getConstructionOfficeReserveSettings = getConstructionOfficeReserveSettings;
    window.saveConstructionOfficeState = saveConstructionOfficeState;
    window.loadConstructionOfficeState = loadConstructionOfficeState;
    window.captureConstructionOfficeSettings = captureConstructionOfficeSettings;
    window.restoreConstructionOfficeSettings = restoreConstructionOfficeSettings;
    window.updateConstructionOfficeUI = updateConstructionOfficeUI;
    window.initializeConstructionOfficeUI = initializeConstructionOfficeUI;
}
