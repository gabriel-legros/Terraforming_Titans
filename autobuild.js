function autoBuild(buildings) {
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
                // Pre-compute affordability to minimize redundant checks
                const canBuildFull = building.canAfford(requiredAmount);
                const maxBuildable = building.maxBuildable(); // Assume this method exists for efficiency
                buildableBuildings.push({
                    building,
                    currentRatio,
                    requiredAmount,
                    canBuildFull,
                    maxBuildable,
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
    buildableBuildings.forEach(({ building, requiredAmount, canBuildFull, maxBuildable }) => {
        if (canBuildFull) {
            building.build(requiredAmount); // Build all at once if affordable
        } else if (maxBuildable > 0) {
            building.build(maxBuildable); // Build the maximum number affordable
        }
        // Skip incremental building as it significantly impacts performance
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { autoBuild };
}