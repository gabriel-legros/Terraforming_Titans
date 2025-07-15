const isNodeHydro = (typeof module !== 'undefined' && module.exports);
var zonesModHydro, estimateCoverageFn, meltingFreezingRatesUtil;
if (isNodeHydro) {
    zonesModHydro = require('./zones.js');
    estimateCoverageFn = zonesModHydro.estimateCoverage;
    try {
        meltingFreezingRatesUtil = require('./phase-change-utils.js').meltingFreezingRates;
    } catch (e) {
        // fall back to global if require fails
    }
} else {
    estimateCoverageFn = globalThis.estimateCoverage;
}
meltingFreezingRatesUtil = meltingFreezingRatesUtil || globalThis.meltingFreezingRates;

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
    const surfaceIceForMelt = {};
    const buriedIceForMelt = {};

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

        const surfaceIce = zonalData[zone][iceProp] || 0;
        const buriedIce = buriedIceProp ? (zonalData[zone][buriedIceProp] || 0) : 0;

        let meltCap = surfaceIce + buriedIce; // Default to no cap
        let coveredArea = 1;
        if (terraforming && getZonePercentageFn) {
            const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentageFn(zone);
            const iceCoverage = estimateCoverageFn(surfaceIce, zoneArea);
            meltCap = zoneArea * iceCoverage * 0.1; // 10 cm layer
            coveredArea = zoneArea;
        }

        surfaceIceForMelt[zone] = Math.min(surfaceIce, meltCap);
        const remainingMeltCap = Math.max(0, meltCap - surfaceIceForMelt[zone]);
        buriedIceForMelt[zone] = Math.min(buriedIce, remainingMeltCap);
        totalIceAvail[zone] = surfaceIceForMelt[zone] + buriedIceForMelt[zone];

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
                const flowCoefficient = flowRateCoefficient * Math.min(Math.sqrt(diff), 1);
                const potentialFlow = (zonalData[source][liquidProp] || 0) * flowCoefficient  * slopeFactor * secondsMultiplier;
                flows[source][target] = potentialFlow;
                outflow[source] += potentialFlow;
            } else {
                flows[source][target] = 0;
            }

            const neighborTemp = zonalTemperatures[target];
            if (typeof neighborTemp === 'number' && neighborTemp > meltingPoint && totalIceAvail[source] > 0 && diff > 0) {
                const meltCoefficient = flowRateCoefficient * Math.min(Math.sqrt(diff), 1);
                const potentialMelt = totalIceAvail[source] * meltCoefficient * slopeFactor * secondsMultiplier;
                melts[source][target] = potentialMelt;
                meltOut[source] += potentialMelt;
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

                // Melt from surface ice first
                const meltFromSurface = Math.min(melt, availIce);
                const remainingMeltPotential = melt - meltFromSurface;
                
                let meltFromBuried = 0;
                if (buriedIceProp && remainingMeltPotential > 0) {
                    meltFromBuried = Math.min(remainingMeltPotential * 0.1, availBuried);
                }

                flowChanges[source][iceProp] -= meltFromSurface;
                if (buriedIceProp) {
                    flowChanges[source][buriedIceProp] -= meltFromBuried;
                }

                const actualMelt = meltFromSurface + meltFromBuried;
                flowChanges[target][liquidProp] += actualMelt;
                totalMelt += actualMelt;
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
function calculateMeltingFreezingRates(temperature, availableIce, availableLiquid, availableBuriedIce = 0, zoneArea = 1, coverageFn) {
    return meltingFreezingRatesUtil({
        temperature,
        freezingPoint: 273.15,
        availableIce,
        availableLiquid,
        availableBuriedIce,
        zoneArea,
        coverageFn
    });
}

function calculateMethaneMeltingFreezingRates(temperature, availableIce, availableLiquid, availableBuriedIce = 0, zoneArea = 1, coverageFn) {
    return meltingFreezingRatesUtil({
        temperature,
        freezingPoint: 90.7,
        availableIce,
        availableLiquid,
        availableBuriedIce,
        zoneArea,
        coverageFn
    });
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
