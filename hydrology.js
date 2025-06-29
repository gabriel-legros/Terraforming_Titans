const isNodeHydro = (typeof module !== 'undefined' && module.exports);
var zonesModHydro, estimateCoverageFn;
if (isNodeHydro) {
    zonesModHydro = require('./zones.js');
    estimateCoverageFn = zonesModHydro.estimateCoverage;
} else {
    estimateCoverageFn = globalThis.estimateCoverage;
}

function _simulateSurfaceFlow(zonalInput, deltaTime, zonalTemperatures, zoneElevationsInput, config) {
    const { liquidProp, iceProp, buriedIceProp, meltingPoint, zonalDataKey, viscosity } = config;
    const baseFlowRate = 0.1; // Tuned for sqrt relationship
    const flowRateCoefficient = baseFlowRate / (viscosity || 1.0);
    const secondsMultiplier = deltaTime / 1000;
    let totalMelt = 0;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];

    const defaultElevations = { tropical: 0, temperate: 0, polar: 0 };
    const zoneElevations = zoneElevationsInput || (typeof ZONE_ELEVATIONS !== 'undefined' ? ZONE_ELEVATIONS : defaultElevations);

    const zonalData = zonalInput[zonalDataKey] ? zonalInput[zonalDataKey] : zonalInput;
    const terraforming = zonalInput[zonalDataKey] ? zonalInput : null;

    const flowChanges = {};
    const flows = {};
    const melts = {};
    const outflow = {};
    const meltOut = {};
    const totalIceAvail = {};
    const levels = {};

    const getZonePercentageFn = (typeof getZonePercentage !== 'undefined') ? getZonePercentage : (zonesModHydro && zonesModHydro.getZonePercentage);

    zones.forEach(zone => {
        flowChanges[zone] = { [liquidProp]: 0, [iceProp]: 0 };
        if (buriedIceProp) {
            flowChanges[zone][buriedIceProp] = 0;
        }
        flows[zone] = {};
        melts[zone] = {};
        outflow[zone] = 0;
        meltOut[zone] = 0;
        totalIceAvail[zone] = (zonalData[zone][iceProp] || 0) + (buriedIceProp ? (zonalData[zone][buriedIceProp] || 0) : 0);

        let coveredArea = 1;
        if (terraforming && getZonePercentageFn) {
            const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentageFn(zone);
            const surfaceSubstance = (zonalData[zone][liquidProp] || 0) + (zonalData[zone][iceProp] || 0);
            const coverage = estimateCoverageFn(surfaceSubstance, zoneArea);
            coveredArea = zoneArea * (coverage > 0 ? coverage : 1);
        }

        const totalSubstance = (zonalData[zone][liquidProp] || 0) + (zonalData[zone][iceProp] || 0);
        levels[zone] = coveredArea > 0 ? totalSubstance / coveredArea : 0;
    });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j) continue;
            if (Math.abs(i - j) !== 1) continue;
            const source = zones[i];
            const target = zones[j];

            const sourceLevel = levels[source];
            const targetLevel = levels[target];
            const diff = sourceLevel - targetLevel;

            let slopeFactor = 1 + ((zoneElevations[source] || 0) - (zoneElevations[target] || 0));
            if (slopeFactor < 0.1) slopeFactor = 0.1;

            if (diff > 0) {
                const potentialFlow = Math.sqrt(diff) * flowRateCoefficient * slopeFactor * secondsMultiplier;
                flows[source][target] = potentialFlow;
                outflow[source] += potentialFlow;
            } else {
                flows[source][target] = 0;
            }

            const neighborTemp = zonalTemperatures[target];
            if (typeof neighborTemp === 'number' && neighborTemp > meltingPoint && totalIceAvail[source] > 0 && diff > 0) {
                const meltCoefficient = flowRateCoefficient * 0.01 * Math.min(diff, 1);
                const meltAmount = totalIceAvail[source] * meltCoefficient * slopeFactor * secondsMultiplier;
                melts[source][target] = meltAmount;
                meltOut[source] += meltAmount;
            } else {
                melts[source][target] = 0;
            }
        }
    }

    zones.forEach(zone => {
        const availableLiquid = zonalData[zone][liquidProp] || 0;
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

    for (const source of zones) {
        for (const target of zones) {
            if (source === target) continue;
            const flow = flows[source][target] || 0;
            if (flow > 0) {
                flowChanges[source][liquidProp] -= flow;
                flowChanges[target][liquidProp] += flow;
            }

            const melt = melts[source][target] || 0;
            if (melt > 0) {
                const availIce = zonalData[source][iceProp] || 0;
                const availBuried = buriedIceProp ? (zonalData[source][buriedIceProp] || 0) : 0;
                const totalIce = availIce + availBuried;
                const surfaceFraction = totalIce > 0 ? availIce / totalIce : 1;
                
                const meltFromIce = melt * surfaceFraction;
                flowChanges[source][iceProp] -= meltFromIce;

                if (buriedIceProp) {
                    const meltFromBuried = melt - meltFromIce;
                    flowChanges[source][buriedIceProp] -= meltFromBuried;
                }

                flowChanges[target][liquidProp] += melt;
                totalMelt += melt;
            }
        }
    }

    zones.forEach(zone => {
        zonalData[zone][liquidProp] += flowChanges[zone][liquidProp];
        zonalData[zone][iceProp] += flowChanges[zone][iceProp];
        if (buriedIceProp) {
            zonalData[zone][buriedIceProp] += flowChanges[zone][buriedIceProp];
        }

        zonalData[zone][liquidProp] = Math.max(0, zonalData[zone][liquidProp]);
        zonalData[zone][iceProp] = Math.max(0, zonalData[zone][iceProp] || 0);
        if (buriedIceProp) {
            zonalData[zone][buriedIceProp] = Math.max(0, zonalData[zone][buriedIceProp] || 0);
        }
    });

    return totalMelt;
}

function simulateSurfaceWaterFlow(zonalWaterInput, deltaTime, zonalTemperatures = {}, zoneElevationsInput) {
    return _simulateSurfaceFlow(zonalWaterInput, deltaTime, zonalTemperatures, zoneElevationsInput, {
        liquidProp: 'liquid',
        iceProp: 'ice',
        buriedIceProp: 'buriedIce',
        meltingPoint: 273.15,
        zonalDataKey: 'zonalWater',
        viscosity: 1.0 // Baseline viscosity for water
    });
}

function simulateSurfaceHydrocarbonFlow(zonalHydrocarbonInput, deltaTime, zonalTemperatures = {}, zoneElevationsInput) {
    return _simulateSurfaceFlow(zonalHydrocarbonInput, deltaTime, zonalTemperatures, zoneElevationsInput, {
        liquidProp: 'liquid',
        iceProp: 'ice',
        buriedIceProp: null,
        meltingPoint: 90.7,
        zonalDataKey: 'zonalHydrocarbons',
        viscosity: 0.2 // Methane is less viscous than water
    });
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
