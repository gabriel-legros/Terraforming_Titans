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
        if (this.elapsed >= 1000) {
            this.costQueue.push(this.currentCosts);
            this.buildingCostQueue.push(this.currentBuildingCosts);
            if (this.costQueue.length > 10) this.costQueue.shift();
            if (this.buildingCostQueue.length > 10) this.buildingCostQueue.shift();
            this.currentCosts = {};
            this.currentBuildingCosts = {};
            this.elapsed = 0;
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

const savedAutoBuildSettings = {};

function captureAutoBuildSettings(structures) {
    for (const name in structures) {
        const s = structures[name];
        savedAutoBuildSettings[name] = {
            percent: s.autoBuildPercent,
        };
    }
}

function restoreAutoBuildSettings(structures) {
    for (const name in structures) {
        const s = structures[name];
        if (savedAutoBuildSettings[name]) {
            s.autoBuildPercent = savedAutoBuildSettings[name].percent;
        }
        s.autoBuildEnabled = false;
        s.autoBuildPriority = false;
    }
}

function autoBuild(buildings, delta = 0) {
    autobuildCostTracker.update(delta);
    const population = resources.colony.colonists.value;
    const buildableBuildings = [];

    // Step 1: Calculate ratios and populate buildableBuildings with required info
    for (const buildingName in buildings) {
        const building = buildings[buildingName];
        if (building.autoBuildEnabled) {
            const targetCount = Math.ceil((building.autoBuildPercent * population) / 100);
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

    // Step 2: Sort buildable buildings by priority then current ratio (ascending)
    buildableBuildings.sort((a, b) => {
        if (a.building.autoBuildPriority && !b.building.autoBuildPriority) return -1;
        if (!a.building.autoBuildPriority && b.building.autoBuildPriority) return 1;
        return a.currentRatio - b.currentRatio;
    });

    // Step 3: Efficiently allocate builds
    buildableBuildings.forEach(({ building, requiredAmount }) => {
        let buildCount = 0;
        const canBuildFull = building.canAfford(requiredAmount);
        if (canBuildFull) {
            buildCount = requiredAmount;
        } else {
            let maxBuildable = building.maxBuildable();

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
                built = building.build(buildCount);
            }
            if (built) {
                autobuildCostTracker.recordCost(building.displayName, cost);
            }
        }
        // Skip incremental building as it significantly impacts performance
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { autoBuild, autobuildCostTracker, captureAutoBuildSettings, restoreAutoBuildSettings };
}

if (typeof window !== 'undefined') {
    window.autoBuild = autoBuild;
    window.autobuildCostTracker = autobuildCostTracker;
    window.captureAutoBuildSettings = captureAutoBuildSettings;
    window.restoreAutoBuildSettings = restoreAutoBuildSettings;
}