const isNodeHydro = (typeof module !== 'undefined' && module.exports);
var zonesModHydro, estimateCoverageFn;
if (isNodeHydro) {
    zonesModHydro = require('./zones.js');
    estimateCoverageFn = zonesModHydro.estimateCoverage;
} else {
    estimateCoverageFn = globalThis.estimateCoverage;
}

function simulateSurfaceWaterFlow(zonalWaterInput, deltaTime, zonalTemperatures = {}, zoneElevationsInput) {
    const flowRateCoefficient = 0.005; // fraction per second
    const secondsMultiplier = deltaTime / 1000;
    let totalMelt = 0;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];

    // Elevation weighting allows flow in any direction but favours downhill
    const defaultElevations = { tropical: 0, temperate: 0.5, polar: 1 };
    const zoneElevations = zoneElevationsInput || (typeof ZONE_ELEVATIONS !== 'undefined' ? ZONE_ELEVATIONS : defaultElevations);

    const zonalWater = zonalWaterInput.zonalWater ? zonalWaterInput.zonalWater : zonalWaterInput;
    const terraforming = zonalWaterInput.zonalWater ? zonalWaterInput : null;

    // Structures to hold accumulated changes
    const flowChanges = {};
    const flows = {}; // track liquid movement per pair
    const melts = {}; // track melting per pair
    const outflow = {}; // total liquid outflow per zone
    const meltOut = {}; // total melt requested per zone
    const totalIceAvail = {};
    const waterLevels = {}; // liquid + ice estimate per zone

    const getZonePercentageFn = (typeof getZonePercentage !== 'undefined') ? getZonePercentage : (zonesModHydro && zonesModHydro.getZonePercentage);

    zones.forEach(zone => {
        flowChanges[zone] = { liquid: 0, ice: 0, buriedIce: 0 };
        flows[zone] = {};
        melts[zone] = {};
        outflow[zone] = 0;
        meltOut[zone] = 0;
        totalIceAvail[zone] = (zonalWater[zone].ice || 0) + (zonalWater[zone].buriedIce || 0);

        let coveredArea = 1;
        if (terraforming && getZonePercentageFn) {
            const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentageFn(zone);
            const surfaceWater = (zonalWater[zone].liquid || 0) + (zonalWater[zone].ice || 0);
            const coverage = estimateCoverageFn(surfaceWater, zoneArea);
            coveredArea = zoneArea * (coverage > 0 ? coverage : 1);
        }

        const totalWater = (zonalWater[zone].liquid || 0) + totalIceAvail[zone];
        waterLevels[zone] = coveredArea > 0 ? totalWater / coveredArea : 0;
    });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j) continue;
            if (Math.abs(i - j) !== 1) continue; // only neighbouring zones
            const source = zones[i];
            const target = zones[j];

            const sourceLevel = waterLevels[source];
            const targetLevel = waterLevels[target];
            const diff = sourceLevel - targetLevel;

            // Weight by elevation difference but never below 0.1 to allow uphill flow
            let slopeFactor = 1 + ((zoneElevations[source] || 0) - (zoneElevations[target] || 0));
            if (slopeFactor < 0.1) slopeFactor = 0.1;

            let potentialFlow = 0;
            if (diff > 0) {
                potentialFlow = diff * flowRateCoefficient * slopeFactor * secondsMultiplier;
                flows[source][target] = potentialFlow;
                outflow[source] += potentialFlow;
            } else {
                flows[source][target] = 0;
            }

            const neighborTemp = zonalTemperatures[target];
            if (typeof neighborTemp === 'number' && neighborTemp > 273.15 && totalIceAvail[source] > 0) {
                const meltCoefficient = flowRateCoefficient * 0.1;
                const meltAmount = totalIceAvail[source] * meltCoefficient * slopeFactor * secondsMultiplier;
                melts[source][target] = meltAmount;
                meltOut[source] += meltAmount;
            } else {
                melts[source][target] = 0;
            }
        }
    }

    // Ensure mass conservation for liquid outflow and melting
    zones.forEach(zone => {
        const availableLiquid = zonalWater[zone].liquid || 0;
        if (outflow[zone] > availableLiquid && outflow[zone] > 0) {
            const scale = availableLiquid / outflow[zone];
            for (const t of zones) {
                if (flows[zone][t]) flows[zone][t] *= scale;
            }
            outflow[zone] = availableLiquid;
        }

        const availableIce = totalIceAvail[zone];
        if (meltOut[zone] > availableIce && meltOut[zone] > 0) {
            const scale = availableIce / meltOut[zone];
            for (const t of zones) {
                if (melts[zone][t]) melts[zone][t] *= scale;
            }
            meltOut[zone] = availableIce;
        }
    });

    // Convert flow matrices into zonal changes
    for (const source of zones) {
        for (const target of zones) {
            if (source === target) continue;
            const flow = flows[source][target] || 0;
            if (flow > 0) {
                flowChanges[source].liquid -= flow;
                flowChanges[target].liquid += flow;
            }

            const melt = melts[source][target] || 0;
            if (melt > 0) {
                const availIce = zonalWater[source].ice || 0;
                const availBuried = zonalWater[source].buriedIce || 0;
                const totalIce = availIce + availBuried;
                const surfaceFraction = totalIce > 0 ? availIce / totalIce : 0;
                const meltFromIce = melt * surfaceFraction;
                const meltFromBuried = melt - meltFromIce;
                flowChanges[source].ice -= meltFromIce;
                flowChanges[source].buriedIce -= meltFromBuried;
                flowChanges[target].liquid += melt;
                totalMelt += melt;
            }
        }
    }

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
