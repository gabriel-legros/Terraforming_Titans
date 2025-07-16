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
    const baseFlowRate = 0.01;
    const flowRateCoefficient = baseFlowRate / (viscosity || 1.0);
    const secondsMultiplier = deltaTime / 1000;
    let totalMelt = 0;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];
    const defaultElevations = { tropical: 0, temperate: 0, polar: 0 };
    const zoneElevations = zoneElevationsInput || (typeof ZONE_ELEVATIONS !== 'undefined' ? ZONE_ELEVATIONS : defaultElevations);
    const zonalData = zonalInput[zonalDataKey] ? zonalInput[zonalDataKey] : zonalInput;
    const terraforming = zonalInput[zonalDataKey] ? zonalInput : null;
    const getZonePercentageFn = (typeof getZonePercentage !== 'undefined') ? getZonePercentage : (zonesModHydro && zonesModHydro.getZonePercentage);

    // --- Part 1: Melting Phase ---

    // Step 1.1: Calculate initial levels and available ice for melting
    const initialLevels = {};
    const totalIceAvail = {};
    zones.forEach(zone => {
        const surfaceIce = zonalData[zone][iceProp] || 0;
        const buriedIce = buriedIceProp ? (zonalData[zone][buriedIceProp] || 0) : 0;
        let meltCap = surfaceIce + buriedIce;
        let coveredArea = 1;
        if (terraforming && getZonePercentageFn) {
            const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentageFn(zone);
            const iceCoverage = estimateCoverageFn(surfaceIce, zoneArea);
            meltCap = zoneArea * iceCoverage * 0.1;
            coveredArea = zoneArea;
        }
        const surfaceIceForMelt = Math.min(surfaceIce, meltCap);
        const remainingMeltCap = Math.max(0, meltCap - surfaceIceForMelt);
        const buriedIceForMelt = Math.min(buriedIce, remainingMeltCap);
        totalIceAvail[zone] = surfaceIceForMelt + buriedIceForMelt;
        const totalSubstance = (zonalData[zone][liquidProp] || 0) + (zonalData[zone][iceProp] || 0);
        initialLevels[zone] = coveredArea > 0 ? totalSubstance / coveredArea : 0;
    });

    // Step 1.2: Calculate potential melt based on initial levels
    const melts = {};
    const meltOut = {};
    zones.forEach(zone => { melts[zone] = {}; meltOut[zone] = 0; });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j || Math.abs(i - j) !== 1) continue;
            const source = zones[i];
            const target = zones[j];
            const diff = initialLevels[source] - initialLevels[target];
            const neighborTemp = zonalTemperatures[target];
            if (diff > 0 && typeof neighborTemp === 'number' && neighborTemp > meltingPoint && totalIceAvail[source] > 0) {
                let slopeFactor = 1 + ((zoneElevations[source] || 0) - (zoneElevations[target] || 0));
                if (slopeFactor < 0.1) slopeFactor = 0.1;
                const meltCoefficient = flowRateCoefficient * Math.min(Math.sqrt(diff), 1);
                const potentialMelt = totalIceAvail[source] * meltCoefficient * slopeFactor * secondsMultiplier;
                melts[source][target] = potentialMelt;
                meltOut[source] += potentialMelt;
            }
        }
    }

    // Step 1.3: Scale potential melt to not exceed available ice
    zones.forEach(zone => {
        if (meltOut[zone] > totalIceAvail[zone] && meltOut[zone] > 0) {
            const scale = totalIceAvail[zone] / meltOut[zone];
            for (const t of zones) {
                if (melts[zone][t]) melts[zone][t] *= scale;
            }
            meltOut[zone] = totalIceAvail[zone];
        }
    });

    // Step 1.4: Apply melt to the zonal data
    for (const source of zones) {
        for (const target of zones) {
            const melt = melts[source][target] || 0;
            if (melt > 0) {
                const availIce = zonalData[source][iceProp] || 0;
                const availBuried = buriedIceProp ? (zonalData[source][buriedIceProp] || 0) : 0;
                const meltFromSurface = Math.min(melt, availIce);
                const remainingMeltPotential = melt - meltFromSurface;
                let meltFromBuried = 0;
                if (buriedIceProp && remainingMeltPotential > 0) {
                    meltFromBuried = Math.min(remainingMeltPotential * 0.1, availBuried);
                }
                const actualMelt = meltFromSurface + meltFromBuried;
                zonalData[source][iceProp] -= meltFromSurface;
                if (buriedIceProp) zonalData[source][buriedIceProp] -= meltFromBuried;
                zonalData[target][liquidProp] += actualMelt;
                totalMelt += actualMelt;
            }
        }
    }

    // --- Part 2: Flowing Phase ---

    // Step 2.1: Calculate post-melt levels
    const postMeltLevels = {};
    zones.forEach(zone => {
        let coveredArea = 1;
        if (terraforming && getZonePercentageFn) {
            coveredArea = terraforming.celestialParameters.surfaceArea * getZonePercentageFn(zone);
        }
        const totalSubstance = (zonalData[zone][liquidProp] || 0) + (zonalData[zone][iceProp] || 0);
        postMeltLevels[zone] = coveredArea > 0 ? totalSubstance / coveredArea : 0;
    });

    // Step 2.2: Calculate potential flow based on post-melt levels
    const flows = {};
    const outflow = {};
    zones.forEach(zone => { flows[zone] = {}; outflow[zone] = 0; });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j || Math.abs(i - j) !== 1) continue;
            const source = zones[i];
            const target = zones[j];
            const diff = postMeltLevels[source] - postMeltLevels[target];
            if (diff > 0) {
                let slopeFactor = 1 + ((zoneElevations[source] || 0) - (zoneElevations[target] || 0));
                if (slopeFactor < 0.1) slopeFactor = 0.1;
                const flowCoefficient = flowRateCoefficient * Math.min(Math.sqrt(diff), 1);
                const potentialFlow = (zonalData[source][liquidProp] || 0) * flowCoefficient * slopeFactor * secondsMultiplier;
                flows[source][target] = potentialFlow;
                outflow[source] += potentialFlow;
            }
        }
    }

    // Step 2.3: Scale potential flow to not exceed available liquid
    zones.forEach(zone => {
        const availableLiquid = zonalData[zone][liquidProp] || 0;
        if (outflow[zone] > availableLiquid && outflow[zone] > 0) {
            const scale = availableLiquid / outflow[zone];
            for (const t of zones) {
                if (flows[zone][t]) flows[zone][t] *= scale;
            }
        }
    });

    // Step 2.4: Apply flow to the zonal data
    for (const source of zones) {
        for (const target of zones) {
            const flow = flows[source][target] || 0;
            if (flow > 0) {
                zonalData[source][liquidProp] -= flow;
                zonalData[target][liquidProp] += flow;
            }
        }
    }

    // --- Part 3: Finalize ---
    zones.forEach(zone => {
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
        coverageFn,
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
