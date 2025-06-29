const autobuildCostTracker = {
    elapsed: 0,
    currentCosts: {},
    lastSecondCosts: {},
    recordCost(costObj) {
        for (const category in costObj) {
            if (!this.currentCosts[category]) this.currentCosts[category] = {};
            for (const resource in costObj[category]) {
                if (!this.currentCosts[category][resource]) this.currentCosts[category][resource] = 0;
                this.currentCosts[category][resource] += costObj[category][resource];
            }
        }
    },
    update(delta) {
        this.elapsed += delta;
        if (this.elapsed >= 1000) {
            this.lastSecondCosts = this.currentCosts;
            this.currentCosts = {};
            this.elapsed = 0;
        }
    },
    getLastSecondCost(category, resource) {
        return this.lastSecondCosts[category]?.[resource] || 0;
    }
};

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
            const maxBuildable = building.maxBuildable();
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

            if (typeof building.build === 'function') {
                building.build(buildCount);
            }
            autobuildCostTracker.recordCost(cost);
        }
        // Skip incremental building as it significantly impacts performance
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { autoBuild, autobuildCostTracker };
}

if (typeof window !== 'undefined') {
    window.autoBuild = autoBuild;
    window.autobuildCostTracker = autobuildCostTracker;
}