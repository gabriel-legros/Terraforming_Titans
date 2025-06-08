function simulateSurfaceWaterFlow(zonalWater, deltaTime, zonalTemperatures = {}) {
    const flowRateCoefficient = 0.005; // Adjust to control flow speed (fraction per second)
    const secondsMultiplier = deltaTime / 1000;
    let totalMelt = 0;

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
        flowChanges[zone] = { liquid: 0, ice: 0, buriedIce: 0 };
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

            const neighborTemp = zonalTemperatures[outflowTarget];
            if (typeof neighborTemp === 'number' && neighborTemp > 273.15) {
                const availableIce = zonalWater[zone].ice || 0;
                const availableBuried = zonalWater[zone].buriedIce || 0;
                const totalIce = availableIce + availableBuried;
                if (totalIce > 0) {
                    const meltCoefficient = flowRateCoefficient * 0.1;
                    const meltAmount = Math.min(totalIce * meltCoefficient * secondsMultiplier, totalIce);
                    const surfaceFraction = totalIce > 0 ? availableIce / totalIce : 0;
                    const meltFromIce = meltAmount * surfaceFraction;
                    const meltFromBuried = meltAmount - meltFromIce;

                    flowChanges[zone].ice -= meltFromIce;
                    flowChanges[zone].buriedIce -= meltFromBuried;
                    flowChanges[outflowTarget].liquid += meltAmount;
                    totalMelt += meltAmount;
                }
            }
        }
    });

    // Apply the accumulated changes
    zones.forEach(zone => {
        if (flowChanges[zone].liquid !== 0) {
            zonalWater[zone].liquid += flowChanges[zone].liquid;
        }
        if (flowChanges[zone].ice !== 0) {
            zonalWater[zone].ice += flowChanges[zone].ice;
        }
        if (flowChanges[zone].buriedIce !== 0) {
            zonalWater[zone].buriedIce += flowChanges[zone].buriedIce;
        }

        if (flowChanges[zone].liquid !== 0 || flowChanges[zone].ice !== 0 || flowChanges[zone].buriedIce !== 0) {
            zonalWater[zone].liquid = Math.max(0, zonalWater[zone].liquid);
            zonalWater[zone].ice = Math.max(0, zonalWater[zone].ice || 0);
            zonalWater[zone].buriedIce = Math.max(0, zonalWater[zone].buriedIce || 0);
        }
    });

    return totalMelt;
}

// Compute melting and freezing rates for a surface zone based on temperature
function calculateMeltingFreezingRates(temperature, availableIce, availableLiquid, availableBuriedIce = 0) {
    const freezingPoint = 273.15;
    const meltingRateMultiplier = 0.00000001; // per K per second
    const freezingRateMultiplier = 0.00000001; // per K per second

    let meltingRate = 0;
    let freezingRate = 0;

    const totalIce = (availableIce || 0) + (availableBuriedIce || 0);

    if (temperature > freezingPoint && totalIce > 0) {
        const diff = temperature - freezingPoint;
        meltingRate = totalIce * meltingRateMultiplier * diff;
    } else if (temperature < freezingPoint && availableLiquid > 0) {
        const diff = freezingPoint - temperature;
        freezingRate = availableLiquid * freezingRateMultiplier * diff;
    }

    return { meltingRate, freezingRate };
}

function simulateSurfaceHydrocarbonFlow(zonalHydrocarbons, deltaTime, zonalTemperatures = {}) {
    const flowRateCoefficient = 0.005; // Adjust to control flow speed (fraction per second)
    const secondsMultiplier = deltaTime / 1000;
    let totalMelt = 0;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];
    const flowPaths = {
        polar: 'temperate',
        temperate: 'tropical'
    };

    let flowChanges = {};
    zones.forEach(zone => {
        flowChanges[zone] = { liquid: 0, ice: 0 };
    });

    zones.forEach(zone => {
        const outflowTarget = flowPaths[zone];
        if (outflowTarget) {
            const currentAmount = zonalHydrocarbons[zone].liquid || 0;
            const neighborAmount = zonalHydrocarbons[outflowTarget].liquid || 0;

            if (currentAmount > neighborAmount && currentAmount > 0) {
                const amountDifference = currentAmount - neighborAmount;
                const potentialFlow = Math.min(
                    amountDifference * flowRateCoefficient * secondsMultiplier,
                    currentAmount
                );

                flowChanges[zone].liquid -= potentialFlow;
                flowChanges[outflowTarget].liquid += potentialFlow;
            }

            const neighborTemp = zonalTemperatures[outflowTarget];
            if (typeof neighborTemp === 'number' && neighborTemp > 90.7) { // Methane melting point
                const availableIce = zonalHydrocarbons[zone].ice || 0;
                if (availableIce > 0) {
                    const meltCoefficient = flowRateCoefficient * 0.1;
                    const meltAmount = Math.min(availableIce * meltCoefficient * secondsMultiplier, availableIce);
                    
                    flowChanges[zone].ice -= meltAmount;
                    flowChanges[outflowTarget].liquid += meltAmount;
                    totalMelt += meltAmount;
                }
            }
        }
    });

    zones.forEach(zone => {
        if (flowChanges[zone].liquid !== 0) {
            zonalHydrocarbons[zone].liquid += flowChanges[zone].liquid;
        }
        if (flowChanges[zone].ice !== 0) {
            zonalHydrocarbons[zone].ice += flowChanges[zone].ice;
        }
        zonalHydrocarbons[zone].liquid = Math.max(0, zonalHydrocarbons[zone].liquid);
        zonalHydrocarbons[zone].ice = Math.max(0, zonalHydrocarbons[zone].ice || 0);
    });

    return totalMelt;
}

function calculateMethaneMeltingFreezingRates(temperature, availableIce, availableLiquid) {
    const freezingPoint = 90.7; // Methane freezing point in K
    const meltingRateMultiplier = 0.00000001; // per K per second
    const freezingRateMultiplier = 0.00000001; // per K per second

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
    module.exports = { simulateSurfaceWaterFlow, calculateMeltingFreezingRates, simulateSurfaceHydrocarbonFlow, calculateMethaneMeltingFreezingRates };
} else {
    // Expose functions globally for browser usage
    globalThis.simulateSurfaceWaterFlow = simulateSurfaceWaterFlow;
    globalThis.calculateMeltingFreezingRates = calculateMeltingFreezingRates;
    globalThis.simulateSurfaceHydrocarbonFlow = simulateSurfaceHydrocarbonFlow;
    globalThis.calculateMethaneMeltingFreezingRates = calculateMethaneMeltingFreezingRates;
}
