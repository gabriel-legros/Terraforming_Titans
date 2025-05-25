function simulateSurfaceWaterFlow(zonalWater, deltaTime) {
    const flowRateCoefficient = 0.005; // Adjust to control flow speed (fraction per second)
    const secondsMultiplier = deltaTime / 1000;

    const zones = ['tropical', 'temperate', 'polar'];
    // Define flow direction: Polar -> Temperate -> Tropical
    const flowPaths = {
        polar: 'temperate',
        temperate: 'tropical'
        // Tropical has no outflow in this simple model
    };

    // Create a temporary structure to hold changes
    let flowChanges = {};
    zones.forEach(zone => {
        flowChanges[zone] = { liquid: 0 };
    });

    zones.forEach(zone => {
        const outflowTarget = flowPaths[zone];
        if (outflowTarget) {
            const currentAmount = zonalWater[zone].liquid || 0;
            const neighborAmount = zonalWater[outflowTarget].liquid || 0;

            // Simple model: flow occurs if current zone has more water than neighbor
            if (currentAmount > neighborAmount && currentAmount > 0) {
                const amountDifference = currentAmount - neighborAmount;
                // Flow proportional to difference, limited by available amount
                const potentialFlow = Math.min(
                    amountDifference * flowRateCoefficient * secondsMultiplier,
                    currentAmount
                );

                // Record the change temporarily
                flowChanges[zone].liquid -= potentialFlow;
                flowChanges[outflowTarget].liquid += potentialFlow;
            }
        }
    });

    // Apply the accumulated changes
    zones.forEach(zone => {
        if (flowChanges[zone].liquid !== 0) {
            zonalWater[zone].liquid += flowChanges[zone].liquid;
            zonalWater[zone].liquid = Math.max(0, zonalWater[zone].liquid); // Ensure non-negative
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { simulateSurfaceWaterFlow };
}
