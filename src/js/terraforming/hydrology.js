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
    const { liquidProp, iceProp, buriedIceProp, meltingPoint, zonalDataKey, viscosity, iceCoverageType, liquidCoverageType } = config;
    const zonalData = zonalInput[zonalDataKey] ? zonalInput[zonalDataKey] : zonalInput;
    const terraforming = zonalInput[zonalDataKey] ? zonalInput : null;

    const marsRadiusKm = 3389.5;
    const planetRadiusKm = (terraforming && terraforming.celestialParameters && typeof terraforming.celestialParameters.radius === 'number')
        ? terraforming.celestialParameters.radius
        : marsRadiusKm;
    const radiusScale = planetRadiusKm / marsRadiusKm;
    const planetRadiusMeters = planetRadiusKm * 1000;

    const baseFlowRate = 0.001 / 86400;
    const flowRateCoefficient = (baseFlowRate * radiusScale) / (viscosity || 1.0);

    // Flow melt (glacier contact) is thermal-limited and should not depend on viscosity.
    // Units: m/s/K. Amounts are treated as m³-equivalent (1 ton ~ 1 m³).
    const glacierFlowMeltSpeedPerK = 5e-8;
    const secondsMultiplier = durationSeconds;
    let totalMelt = 0;
    let totalFreezeOut = 0;

    const zones = (typeof ZONES !== 'undefined') ? ZONES : ['tropical', 'temperate', 'polar'];
    const defaultElevations = { tropical: 0, temperate: 0, polar: 0 };
    const zoneElevations = zoneElevationsInput || (typeof ZONE_ELEVATIONS !== 'undefined' ? ZONE_ELEVATIONS : defaultElevations);
    const getZonePercentageFn = (typeof getZonePercentage !== 'undefined') ? getZonePercentage : (zonesModHydro && zonesModHydro.getZonePercentage);

    // Concentric-circle boundary lengths (both hemispheres combined).
    const phiTropic = 23.5 * Math.PI / 180;
    const phiPolar = 66.5 * Math.PI / 180;
    const boundaryLengthTropicalTemperate = 4 * Math.PI * planetRadiusMeters * Math.cos(phiTropic);
    const boundaryLengthTemperatePolar = 4 * Math.PI * planetRadiusMeters * Math.cos(phiPolar);
    const referenceBoundaryLength = boundaryLengthTropicalTemperate || 1;
    const boundaryInteractionDepth = 200_000;
    const getBoundaryScale = (minZoneIndex) => (minZoneIndex === 0 ? boundaryLengthTropicalTemperate : boundaryLengthTemperatePolar) / referenceBoundaryLength;

    const changes = {};
    zones.forEach(zone => {
        changes[zone] = { [liquidProp]: 0, [iceProp]: 0 };
        if (buriedIceProp) {
            changes[zone][buriedIceProp] = 0;
        }
    });

    // --- Part 1: Melting Phase ---

    // Step 1.1: Calculate initial levels and available ice for melting
    const zoneAreas = {};
    const iceAreas = {};
    const iceCoverages = {};
    const iceHeights = {};
    const totalIceAvail = {};
    const liquidAreas = {};
    const liquidDepths = {};
    zones.forEach(zone => {
        const surfaceIce = zonalData[zone][iceProp] || 0;
        const surfaceLiquid = zonalData[zone][liquidProp] || 0;
        let zoneArea = 1;
        let iceCoverage = 1;
        let liquidCoverage = 1;
        if (terraforming && getZonePercentageFn) {
            zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentageFn(zone);
            const cacheCov = terraforming.zonalCoverageCache && iceCoverageType
                ? terraforming.zonalCoverageCache[zone]?.[iceCoverageType]
                : undefined;
            iceCoverage = Number.isFinite(cacheCov)
                ? cacheCov
                : estimateCoverageFn(surfaceIce, zoneArea);

            const cacheLiquidCov = terraforming.zonalCoverageCache && liquidCoverageType
                ? terraforming.zonalCoverageCache[zone]?.[liquidCoverageType]
                : undefined;
            liquidCoverage = Number.isFinite(cacheLiquidCov)
                ? cacheLiquidCov
                : estimateCoverageFn(surfaceLiquid, zoneArea);
        }

//        const iceArea = Math.max(1, zoneArea * Math.max(0, iceCoverage));
//        zoneAreas[zone] = zoneArea;
//        iceAreas[zone] = iceArea;
//        iceCoverages[zone] = Math.max(0, iceCoverage);
        iceHeights[zone] = surfaceIce > 0 ? surfaceIce / zoneArea : 0;
        totalIceAvail[zone] = surfaceIce;

        liquidDepths[zone] = surfaceLiquid > 0 ? surfaceLiquid / zoneArea : 0;
    });

    // Step 1.2: Calculate flow-melt based on glacier height and target-zone temperature
    const melts = {};
    const meltOut = {};
    zones.forEach(zone => { melts[zone] = {}; meltOut[zone] = 0; });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j || Math.abs(i - j) !== 1) continue;
            const source = zones[i];
            const target = zones[j];
            const neighborTemp = zonalTemperatures[target];
            const deltaT = neighborTemp - meltingPoint;
            if (typeof neighborTemp === 'number' && deltaT > 0 && totalIceAvail[source] > 0) {
                const boundaryScale = getBoundaryScale(Math.min(i, j));
                const glacierHeight = iceHeights[source] || 0;
                const sourceTopElevation = (zoneElevations[source] || 0) + glacierHeight;
                const targetIceWaterElevation = (zoneElevations[target] || 0) + (liquidDepths[target] || 0) + (iceHeights[target] || 0);
                const meltElevationDelta = sourceTopElevation - targetIceWaterElevation;
                const lowElevationPenalty = meltElevationDelta < 1 ? Math.exp(1-1/(meltElevationDelta*meltElevationDelta)) : 1;
                if (meltElevationDelta <= 0) continue;
                const boundaryLength = boundaryScale * referenceBoundaryLength;
                const boundaryMeltArea = boundaryLength * (glacierHeight + boundaryInteractionDepth);
                const potentialMelt = boundaryMeltArea * glacierFlowMeltSpeedPerK * deltaT * secondsMultiplier * lowElevationPenalty;
                if (potentialMelt > 0) {
                    melts[source][target] = potentialMelt;
                    meltOut[source] += potentialMelt;
                }
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
                const actualMelt = Math.min(melt, availIce);
                changes[source][iceProp] -= actualMelt;
                changes[target][liquidProp] += actualMelt;
                totalMelt += actualMelt;
            }
        }
    }

    // --- Part 2: Flowing Phase ---

    // Step 2.1: Calculate liquid surface elevations after flow-melt
    const liquidSurfaceElevations = {};
    const liquidAndIceSurfaceElevations = {};
    zones.forEach(zone => {
        liquidSurfaceElevations[zone] = (zoneElevations[zone] || 0) + (liquidDepths[zone] || 0);
        liquidAndIceSurfaceElevations[zone] = liquidSurfaceElevations[zone] + (iceHeights[zone] || 0);
    });

    // Step 2.2: Calculate potential flow based on sqrt(elevation difference) and boundary length
    const flows = {};
    const outflow = {};
    zones.forEach(zone => { flows[zone] = {}; outflow[zone] = 0; });

    for (let i = 0; i < zones.length; i++) {
        for (let j = 0; j < zones.length; j++) {
            if (i === j || Math.abs(i - j) !== 1) continue;
            const source = zones[i];
            const target = zones[j];
            const deltaElevation = (liquidSurfaceElevations[source] || 0) - (liquidAndIceSurfaceElevations[target] || 0);
            if (deltaElevation > 0) {
                const boundaryScale = getBoundaryScale(Math.min(i, j));
                const lowElevationPenalty = deltaElevation < 1 ? deltaElevation : 1;
                const flowCoefficient = flowRateCoefficient * boundaryScale * Math.sqrt(deltaElevation) * lowElevationPenalty;
                const availableLiquid = (zonalData[source][liquidProp] || 0) + changes[source][liquidProp];
                const maxFlowToEqualize =
                    deltaElevation / (1 / (liquidAreas[source] || 1) + 1 / (liquidAreas[target] || 1));
                const potentialFlow = Math.min(availableLiquid * flowCoefficient * secondsMultiplier, maxFlowToEqualize);
                if (potentialFlow > 0) {
                    flows[source][target] = potentialFlow;
                    outflow[source] += potentialFlow;
                }
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
                if (zonalTemperatures[target] < meltingPoint) {
                    changes[target][iceProp] += flow;
                    totalFreezeOut += flow;
                } else {
                    changes[target][liquidProp] += flow;
                }
            }
        }
    }

    return { changes, totalMelt, totalFreezeOut };
}

function simulateSurfaceWaterFlow(zonalWaterInput, durationSeconds, zonalTemperatures = {}, zoneElevationsInput) {
    return _simulateSurfaceFlow(zonalWaterInput, durationSeconds, zonalTemperatures, zoneElevationsInput, {
        liquidProp: 'liquid',
        iceProp: 'ice',
        buriedIceProp: 'buriedIce',
        meltingPoint: 273.15,
        zonalDataKey: 'zonalWater',
        viscosity: 0.89, // Baseline viscosity for water
        iceCoverageType: 'ice',
        liquidCoverageType: 'liquidWater'
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
        iceCoverageType: 'hydrocarbonIce',
        liquidCoverageType: 'liquidMethane'
    });
}

function simulateSurfaceCO2Flow(zonalCO2Input, durationSeconds, zonalTemperatures = {}, zoneElevationsInput) {
    return _simulateSurfaceFlow(zonalCO2Input, durationSeconds, zonalTemperatures, zoneElevationsInput, {
        liquidProp: 'liquid',
        iceProp: 'ice',
        buriedIceProp: 'buriedIce',
        meltingPoint: 216.58,
        zonalDataKey: 'zonalCO2',
        viscosity: 0.07, // Liquid CO2 is lower-viscosity than water
        iceCoverageType: 'dryIce',
        liquidCoverageType: 'liquidCO2'
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
    module.exports = { simulateSurfaceWaterFlow, calculateMeltingFreezingRates, simulateSurfaceHydrocarbonFlow, simulateSurfaceCO2Flow, calculateMethaneMeltingFreezingRates };
} else {
    // Expose functions globally for browser usage
    globalThis.simulateSurfaceWaterFlow = simulateSurfaceWaterFlow;
    globalThis.calculateMeltingFreezingRates = calculateMeltingFreezingRates;
    globalThis.simulateSurfaceHydrocarbonFlow = simulateSurfaceHydrocarbonFlow;
    globalThis.simulateSurfaceCO2Flow = simulateSurfaceCO2Flow;
    globalThis.calculateMethaneMeltingFreezingRates = calculateMethaneMeltingFreezingRates;
}
