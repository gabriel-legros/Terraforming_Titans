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

function _simulateSurfaceFlow(zonalInput, durationSeconds, zonalTemperatures, zoneElevationsInput, config) {
    const { liquidProp, iceProp, buriedIceProp, meltingPoint, zonalDataKey, viscosity, iceCoverageType } = config;
    const zonalData = zonalInput[zonalDataKey] ? zonalInput[zonalDataKey] : zonalInput;
    const terraforming = zonalInput[zonalDataKey] ? zonalInput : null;

    const marsRadiusKm = 3389.5;
    const planetRadius = (terraforming && terraforming.celestialParameters && typeof terraforming.celestialParameters.radius === 'number')
        ? terraforming.celestialParameters.radius
        : marsRadiusKm;
    const radiusScale = planetRadius / marsRadiusKm;

    const baseFlowRate = 0.001 / 86400;
    const flowRateCoefficient = (baseFlowRate * radiusScale) / (viscosity || 1.0);
    const secondsMultiplier = durationSeconds;
    let totalMelt = 0;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];
    const defaultElevations = { tropical: 0, temperate: 0, polar: 0 };
    const zoneElevations = zoneElevationsInput || (typeof ZONE_ELEVATIONS !== 'undefined' ? ZONE_ELEVATIONS : defaultElevations);
    const getZonePercentageFn = (typeof getZonePercentage !== 'undefined') ? getZonePercentage : (zonesModHydro && zonesModHydro.getZonePercentage);

    const changes = {};
    zones.forEach(zone => {
        changes[zone] = { [liquidProp]: 0, [iceProp]: 0 };
        if (buriedIceProp) {
            changes[zone][buriedIceProp] = 0;
        }
    });

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
            const cacheCov = terraforming.zonalCoverageCache && iceCoverageType
                ? terraforming.zonalCoverageCache[zone]?.[iceCoverageType]
                : undefined;
            const iceCoverage = (typeof cacheCov === 'number')
                ? cacheCov
                : estimateCoverageFn(surfaceIce, zoneArea);
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
                const potentialMelt = totalIceAvail[source] * meltCoefficient * slopeFactor * secondsMultiplier * 0.1;
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

    // Step 1.4: Record melt changes
    for (const source of zones) {
        for (const target of zones) {
            const melt = melts[source][target] || 0;
            if (melt > 0) {
                const availIce = (zonalData[source][iceProp] || 0) + changes[source][iceProp];
                const availBuried = buriedIceProp ? ((zonalData[source][buriedIceProp] || 0) + changes[source][buriedIceProp]) : 0;
                const meltFromSurface = Math.min(melt, availIce);
                const remainingMeltPotential = melt - meltFromSurface;
                let meltFromBuried = 0;
                if (buriedIceProp && remainingMeltPotential > 0) {
                    meltFromBuried = Math.min(remainingMeltPotential * 0.1, availBuried);
                }
                const actualMelt = meltFromSurface + meltFromBuried;
                changes[source][iceProp] -= meltFromSurface;
                if (buriedIceProp) changes[source][buriedIceProp] -= meltFromBuried;
                changes[target][liquidProp] += actualMelt;
                totalMelt += actualMelt;
            }
        }
    }

    // --- Part 2: Flowing Phase ---

    // Step 2.2: Calculate potential flow based on initial levels
    const flows = {};
    const outflow = {};
    zones.forEach(zone => { flows[zone] = {}; outflow[zone] = 0; });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j || Math.abs(i - j) !== 1) continue;
            const source = zones[i];
            const target = zones[j];
            const diff = initialLevels[source] - initialLevels[target];
            if (diff > 0) {
                let slopeFactor = 1 + ((zoneElevations[source] || 0) - (zoneElevations[target] || 0));
                if (slopeFactor < 0.1) slopeFactor = 0.1;
                const flowCoefficient = flowRateCoefficient * Math.min(Math.sqrt(diff), 1);
                const availableLiquid = (zonalData[source][liquidProp] || 0) + changes[source][liquidProp];
                const potentialFlow = availableLiquid * flowCoefficient * slopeFactor * secondsMultiplier;
                flows[source][target] = potentialFlow;
                outflow[source] += potentialFlow;
            }
        }
    }

    // Step 2.3: Scale potential flow to not exceed available liquid
    zones.forEach(zone => {
        const availableLiquid = (zonalData[zone][liquidProp] || 0) + changes[zone][liquidProp];
        if (outflow[zone] > availableLiquid && outflow[zone] > 0) {
            const scale = availableLiquid / outflow[zone];
            for (const t of zones) {
                if (flows[zone][t]) flows[zone][t] *= scale;
            }
        }
    });

    // Step 2.4: Record flow changes
    for (const source of zones) {
        for (const target of zones) {
            const flow = flows[source][target] || 0;
            if (flow > 0) {
                changes[source][liquidProp] -= flow;
                changes[target][liquidProp] += flow;
            }
        }
    }

    return { changes, totalMelt };
}

function simulateSurfaceWaterFlow(zonalWaterInput, durationSeconds, zonalTemperatures = {}, zoneElevationsInput) {
    return _simulateSurfaceFlow(zonalWaterInput, durationSeconds, zonalTemperatures, zoneElevationsInput, {
        liquidProp: 'liquid',
        iceProp: 'ice',
        buriedIceProp: 'buriedIce',
        meltingPoint: 273.15,
        zonalDataKey: 'zonalWater',
        viscosity: 0.89, // Baseline viscosity for water
        iceCoverageType: 'ice'
    });
}

function simulateSurfaceHydrocarbonFlow(zonalHydrocarbonInput, durationSeconds, zonalTemperatures = {}, zoneElevationsInput) {
    return _simulateSurfaceFlow(zonalHydrocarbonInput, durationSeconds, zonalTemperatures, zoneElevationsInput, {
        liquidProp: 'liquid',
        iceProp: 'ice',
        buriedIceProp: null,
        meltingPoint: 90.7,
        zonalDataKey: 'zonalHydrocarbons',
        viscosity: 0.12, // Methane is less viscous than water
        iceCoverageType: 'hydrocarbonIce'
    });
}

// Compute melting and freezing rates for a surface zone based on temperature
function calculateMeltingFreezingRates(temperature, availableIce, availableLiquid, availableBuriedIce = 0, zoneArea = 1, iceCoverage = 1, liquidCoverage = 1) {
    return meltingFreezingRatesUtil({
        temperature,
        freezingPoint: 273.15,
        availableIce,
        availableLiquid,
        availableBuriedIce,
        zoneArea,
        iceCoverage,
        liquidCoverage
    });
}

function calculateMethaneMeltingFreezingRates(temperature, availableIce, availableLiquid, availableBuriedIce = 0, zoneArea = 1, iceCoverage = 1, liquidCoverage = 1) {
    return meltingFreezingRatesUtil({
        temperature,
        freezingPoint: 90.7,
        availableIce,
        availableLiquid,
        availableBuriedIce,
        zoneArea,
        iceCoverage,
        liquidCoverage,
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
