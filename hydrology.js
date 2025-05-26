function simulateSurfaceWaterFlow(zonalWater, deltaTime) {
    const flowRateCoefficient = 0.005; // Adjust to control flow speed (fraction per second)
    const secondsMultiplier = deltaTime / 1000;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];
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

// Compute melting and freezing rates for a surface zone based on temperature
function calculateMeltingFreezingRates(temperature, availableIce, availableLiquid) {
    const freezingPoint = 273.15;
    const meltingRateMultiplier = 0.0000001; // per K per second
    const freezingRateMultiplier = 0.0000001; // per K per second

    let meltingRate = 0;
    let freezingRate = 0;

    if (temperature > freezingPoint && availableIce > 0) {
        const diff = temperature - freezingPoint;
        meltingRate = availableIce * meltingRateMultiplier * diff;
    } else if (temperature < freezingPoint && availableLiquid > 0) {
        const diff = freezingPoint - temperature;
        freezingRate = availableLiquid * freezingRateMultiplier * diff;
    }

    return { meltingRate, freezingRate };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { simulateSurfaceWaterFlow, calculateMeltingFreezingRates };
} else {
    // Expose functions globally for browser usage
    globalThis.simulateSurfaceWaterFlow = simulateSurfaceWaterFlow;
    globalThis.calculateMeltingFreezingRates = calculateMeltingFreezingRates;
}
