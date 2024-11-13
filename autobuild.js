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

            // Only add buildings with a positive required amount to the buildable list
            if (requiredAmount > 0) {
                buildableBuildings.push({ building, currentRatio, requiredAmount });
            }
        }
    }

    // Step 2: Sort buildable buildings by their current ratio (ascending)
    buildableBuildings.sort((a, b) => a.currentRatio - b.currentRatio);

    // Step 3: Attempt to build each building in the sorted list
    buildableBuildings.forEach(({ building, requiredAmount }) => {
        // Check if we can afford the full required amount; if not, build one at a time
        if (building.canAfford(requiredAmount)) {
            building.build(requiredAmount); // Build all at once if affordable
        } else {
            // Build incrementally if resources don't suffice for the total required amount
            let builtCount = 0;
            while (builtCount < requiredAmount && building.canAfford(1)) {
                building.build(1);
                builtCount++;
            }
        }
    });
}
