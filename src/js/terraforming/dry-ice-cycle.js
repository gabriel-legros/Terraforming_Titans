const L_S_CO2 = 574000; // J/kg (latent heat of sublimation for CO2)
const R_CO2 = 188.9; // J/kg·K (specific gas constant for CO2)


const isNodeDryIce = (typeof module !== 'undefined' && module.exports);
var psychrometricConstant = globalThis.psychrometricConstant;
var ResourceCycleClass = globalThis.ResourceCycle;
if (isNodeDryIce) {
  try {
    ({ psychrometricConstant } = require('./phase-change-utils.js'));
    ResourceCycleClass = require('./resource-cycle.js');
  } catch (e) {
    // fall back to globals if require fails
  }
}
if (!ResourceCycleClass && typeof require === 'function') {
  try {
    ResourceCycleClass = require('./resource-cycle.js');
  } catch (e) {
    try {
      ResourceCycleClass = require('./src/js/terraforming/resource-cycle.js');
    } catch (e2) {
      // ignore
    }
  }
}


function calculateSaturationPressureCO2(temperature) {
    // Critical properties of CO₂
    const Tc = 304.1282; // Critical temperature in K
    const Pc = 7.3773;   // Critical pressure in MPa

    // Wagner equation constants for CO₂
    const A = -7.0602087;
    const B = 1.9391218;
    const C = -1.6463597;
    const D = -3.2995634;

    // Calculate the reduced temperature (tau)
    const tau = 1 - (temperature / Tc);

    // Calculate the natural logarithm of reduced pressure (ln Pr)
    const lnPr = A * tau + B * Math.pow(tau, 1.5) + C * Math.pow(tau, 2.5) + D * Math.pow(tau, 5);

    // Calculate the reduced pressure (Pr)
    const Pr = Math.exp(lnPr);

    // Calculate the saturation pressure (P) in MPa
    const P = Pr * Pc;

    return P*1e6;
}


// Function to calculate the slope of the saturation vapor pressure curve (Delta_s)
function slopeSVPCO2(temperature) {
    // Critical properties of CO₂
    const Tc = 304.1282; // Critical temperature in K
    const Pc = 7.3773;   // Critical pressure in MPa

    // Wagner equation constants for CO₂
    const A = -7.0602087;
    const B = 1.9391218;
    const C = -1.6463597;
    const D = -3.2995634;

    // Calculate the reduced temperature (tau)
    const tau = 1 - (temperature / Tc);

    // Calculate the natural logarithm of reduced pressure (ln Pr)
    const lnPr = A * tau
               + B * Math.pow(tau, 1.5)
               + C * Math.pow(tau, 2.5)
               + D * Math.pow(tau, 5);

    // Calculate the reduced pressure (Pr)
    const Pr = Math.exp(lnPr);

    // Calculate the saturation pressure (P) in MPa
    const P = Pr * Pc;

    // Calculate the derivative of ln Pr with respect to tau
    const dlnPr_dtau = A
                     + 1.5 * B * Math.pow(tau, 0.5)
                     + 2.5 * C * Math.pow(tau, 1.5)
                     + 5 * D * Math.pow(tau, 4);

    // Calculate the derivative dP/dT in MPa/K
    const dP_dT = - (P / Tc) * dlnPr_dtau;

    return dP_dT*1e6; // Derivative in MPa/K
}

class CO2Cycle extends ResourceCycleClass {
  constructor({
    key = 'co2',
    atmKey = 'carbonDioxide',
    totalKeys = ['sublimation'],
    processTotalKeys = { condensation: 'condensation' },
    zonalKey = 'zonalSurface',
    surfaceBucket = 'water',
    atmosphereKey = 'co2',
    availableKeys = ['dryIce'],
    condensationParameter = 1,
  } = {}) {
    super({
      latentHeatVaporization: L_S_CO2,
      latentHeatSublimation: L_S_CO2,
      saturationVaporPressureFn: calculateSaturationPressureCO2,
      slopeSaturationVaporPressureFn: slopeSVPCO2,
      freezePoint: 195,
      sublimationPoint: 195,
      rapidSublimationMultiplier: 0.00000001,
      evaporationAlbedo: 0.6,
      sublimationAlbedo: 0.6,
    });
    this.key = key;
    this.atmKey = atmKey;
    this.totalKeys = totalKeys;
    this.processTotalKeys = processTotalKeys;
    this.zonalKey = zonalKey;
    this.surfaceBucket = surfaceBucket;
    this.atmosphereKey = atmosphereKey;
    this.availableKeys = availableKeys;
    this.defaultExtraParams = { condensationParameter };
  }

  getExtraParams(terraforming) {
    return {
      condensationParameter: terraforming.equilibriumCondensationParameter,
    };
  }

  /**
   * Extract dry ice coverage values for a zone from a cache object.
   */
  getCoverage(zone, cache = {}) {
    const data = cache[zone] || {};
    return {
      dryIceCoverage: data.dryIce ?? 0,
    };
  }

  // Preserve original condensation calculation behavior
  condensationRateFactor({ zoneArea, co2VaporPressure, dayTemperature, nightTemperature }) {
    const condensationTemperatureCO2 = 195; // K

    const calculatePotential = (temp) => {
      if (zoneArea <= 0 || typeof temp !== 'number' || co2VaporPressure <= 0) {
        return 0;
      }
      if (temp >= condensationTemperatureCO2) {
        return 0;
      }

      const tempDifference = condensationTemperatureCO2 - temp;
      const startLinearDiff = 5.0;
      const maxLinearDiff = 45.0;

      let temperatureScale = 0;
      if (tempDifference > maxLinearDiff) {
        temperatureScale = 1.0;
      } else if (tempDifference > startLinearDiff) {
        temperatureScale = (tempDifference - startLinearDiff) /
          (maxLinearDiff - startLinearDiff);
      }

      const baseCalculatedFactor = zoneArea * co2VaporPressure / 1000;

      return (!isNaN(baseCalculatedFactor) && baseCalculatedFactor > 0)
        ? baseCalculatedFactor * temperatureScale
        : 0;
    };

    const nightPotential = calculatePotential(nightTemperature);
    const dayPotential = calculatePotential(dayTemperature);

    const rate = (nightPotential + dayPotential) / 2;
    return { iceRate: rate };
  }

  /**
   * Process a zone of CO₂ ice, returning zonal change objects.
   */
  processZone({
    zoneArea,
    dryIceCoverage = 0,
    dayTemperature,
    nightTemperature,
    zoneTemperature,
    atmPressure,
    vaporPressure,
    availableDryIce = 0,
    zonalSolarFlux = 0,
    durationSeconds = 1,
    condensationParameter = 1,
  }) {
    const changes = {
      atmosphere: { co2: 0 },
      water: { dryIce: 0 },
      precipitation: {},
      potentialCO2Condensation: 0,
    };

    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;
    const iceArea = zoneArea * dryIceCoverage;

    // Sublimation
    let daySubRate = 0, nightSubRate = 0;
    if (iceArea > 0) {
      if (typeof dayTemperature === 'number') {
        daySubRate = this.sublimationRate({
          T: dayTemperature,
          solarFlux: daySolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * iceArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightSubRate = this.sublimationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * iceArea / 1000;
      }
    }
    const sublimationRate = (daySubRate + nightSubRate) / 2;
    const sublimationAmount = Math.min(sublimationRate * durationSeconds, availableDryIce);
    changes.atmosphere.co2 += sublimationAmount;
    changes.water.dryIce -= sublimationAmount;

    // Condensation
    const { iceRate } = this.condensationRateFactor({
      zoneArea,
      co2VaporPressure: vaporPressure,
      dayTemperature,
      nightTemperature,
    });
    const potentialCond = iceRate * condensationParameter * durationSeconds;
    changes.atmosphere.co2 -= potentialCond;
    changes.potentialCO2Condensation = potentialCond;

    // Rapid sublimation
    const currentIce = availableDryIce + changes.water.dryIce;
    const rapidRate = this.rapidSublimationRate(zoneTemperature, currentIce);
    const rapidAmount = Math.min(rapidRate * durationSeconds, currentIce);
    if (rapidAmount > 0) {
      changes.water.dryIce -= rapidAmount;
      changes.atmosphere.co2 += rapidAmount;
    }

    return {
      ...changes,
      sublimationAmount: sublimationAmount + rapidAmount,
    };
  }

  finalizeAtmosphere({ available, zonalChanges }) {
    return super.finalizeAtmosphere({
      available,
      zonalChanges,
      atmosphereKey: 'co2',
      processes: [
        {
          container: 'root',
          potentialKey: 'potentialCO2Condensation',
          surfaceBucket: 'water',
          surfaceKey: 'dryIce',
          totalKey: 'condensation',
        },
      ],
    });
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    const rateType = 'terraforming';
    const { sublimation = 0, condensation = 0 } = totals;

    const sublimationRate = durationSeconds > 0 ? sublimation / durationSeconds * 86400 : 0;
    const condensationRate = durationSeconds > 0 ? condensation / durationSeconds * 86400 : 0;

    if (terraforming.resources.atmospheric.carbonDioxide) {
      terraforming.resources.atmospheric.carbonDioxide.modifyRate(sublimationRate, 'CO2 Sublimation', rateType);
      terraforming.resources.atmospheric.carbonDioxide.modifyRate(-condensationRate, 'CO2 Condensation', rateType);
    }

    if (terraforming.resources.surface.dryIce) {
      terraforming.resources.surface.dryIce.modifyRate(-sublimationRate, 'CO2 Sublimation', rateType);
      terraforming.resources.surface.dryIce.modifyRate(condensationRate, 'CO2 Condensation', rateType);
    }
  }
}

const co2Cycle = new CO2Cycle();

// Function to calculate psychrometric constant (gamma_s)
function psychrometricConstantCO2(atmPressure) {
  return psychrometricConstant(atmPressure, L_S_CO2); // Pa/K
}

// Function to calculate sublimation rate (E_sub) using the modified Penman equation
function sublimationRateCO2(T, solarFlux, atmPressure, e_a, r_a = 100) {
  return co2Cycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

// Calculate rapid sublimation rate of surface CO₂ ice when the temperature
// rises well above the sublimation point. Modeled similar to water melting in
// hydrology.js using a simple linear multiplier.
function rapidSublimationRateCO2(temperature, availableDryIce) {
    return co2Cycle.rapidSublimationRate(temperature, availableDryIce);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CO2Cycle,
        co2Cycle,
        calculateSaturationPressureCO2,
        slopeSVPCO2,
        psychrometricConstantCO2,
        sublimationRateCO2,
        rapidSublimationRateCO2
    };
} else {
    // Expose functions globally for browser usage
    globalThis.CO2Cycle = CO2Cycle;
    globalThis.co2Cycle = co2Cycle;
    globalThis.calculateSaturationPressureCO2 = calculateSaturationPressureCO2;
    globalThis.slopeSVPCO2 = slopeSVPCO2;
    globalThis.psychrometricConstantCO2 = psychrometricConstantCO2;
    globalThis.sublimationRateCO2 = sublimationRateCO2;
    globalThis.rapidSublimationRateCO2 = rapidSublimationRateCO2;
}
