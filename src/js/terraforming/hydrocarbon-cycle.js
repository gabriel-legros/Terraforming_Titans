// Constants for Methane
const L_V_METHANE = 5.1e5; // Latent heat of vaporization for methane (J/kg)
const L_S_METHANE = 5.87e5; // Latent heat of sublimation for methane (J/kg)

const isNodeHydrocarbon = (typeof module !== 'undefined' && module.exports);
var penmanRate = globalThis.penmanRate;
var psychrometricConstant = globalThis.psychrometricConstant;
var ResourceCycleClass = globalThis.ResourceCycle;
if (isNodeHydrocarbon) {
  try {
    ({ penmanRate, psychrometricConstant } = require('./phase-change-utils.js'));
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

// Function to calculate saturation vapor pressure of methane using the Wagner equation
function calculateSaturationPressureMethane(temperature) {
    // Critical properties of Methane
    const Tc = 190.564; // Critical temperature in K
    const Pc = 4.5992;   // Critical pressure in MPa

    // Wagner equation constants for Methane
    const A = -6.0292644;
    const B = 1.6541051;
    const C = -1.1514853;
    const D = -1.5163253;

    if (temperature > Tc) {
        return Infinity;
    }
    // Calculate the reduced temperature (tau)
    const tau = 1 - (temperature / Tc);

    // Calculate the natural logarithm of reduced pressure (ln Pr)
    const lnPr = (A * tau + B * Math.pow(tau, 1.5) + C * Math.pow(tau, 3) + D * Math.pow(tau, 6)) / (1 - tau);

    // Calculate the reduced pressure (Pr)
    const Pr = Math.exp(lnPr);

    // Calculate the saturation pressure (P) in MPa
    const P = Pr * Pc;

    return P * 1e6; // Convert MPa to Pa
}

// Function to calculate the slope of the saturation vapor pressure curve for Methane
function slopeSVPMethane(temperature) {
    const Tc = 190.564; // K
    const Pc = 4.5992;   // MPa
    const A = -6.0292644;
    const B = 1.6541051;
    const C = -1.1514853;
    const D = -1.5163253;

    if (temperature > Tc) {
        return 1e12; // Return a very large number for the slope
    }
    const tau = 1 - (temperature / Tc);
    const T_inv = 1 - tau;

    const lnPr_numerator = A * tau + B * Math.pow(tau, 1.5) + C * Math.pow(tau, 3) + D * Math.pow(tau, 6);
    const lnPr = lnPr_numerator / T_inv;
    const Pr = Math.exp(lnPr);
    const P = Pr * Pc;

    const dNumerator_dtau = A + 1.5 * B * Math.pow(tau, 0.5) + 3 * C * Math.pow(tau, 2) + 6 * D * Math.pow(tau, 5);
    const dlnPr_dtau = (dNumerator_dtau * T_inv + lnPr_numerator) / Math.pow(T_inv, 2);
    
    const dP_dT = - (P / Tc) * dlnPr_dtau;

    return dP_dT * 1e6; // Convert MPa/K to Pa/K
}

class MethaneCycle extends ResourceCycleClass {
  constructor() {
    super({
      latentHeatVaporization: L_V_METHANE,
      latentHeatSublimation: L_S_METHANE,
      saturationVaporPressureFn: calculateSaturationPressureMethane,
      slopeSaturationVaporPressureFn: slopeSVPMethane,
      freezePoint: 90.7,
      sublimationPoint: 90.7,
      rapidSublimationMultiplier: 0.000001,
      evaporationAlbedo: 0.1,
      sublimationAlbedo: 0.6,
    });
  }
}

const methaneCycle = new MethaneCycle();

// Function to calculate psychrometric constant for methane
function psychrometricConstantMethane(atmPressure) {
  return psychrometricConstant(atmPressure, L_V_METHANE); // Pa/K
}

// Approximate methane boiling point (K) at a given pressure (Pa).
// Derived from two reference points and valid roughly from 0.1 to 10 bar.
function boilingPointMethane(atmPressure) {
  if (atmPressure <= 0) return 0;
  // ln(P) = A - B/T form of Clausius-Clapeyron
  const A = 20.8676;
  const B = 1043.0733;
  return B / (A - Math.log(atmPressure));
}

// Function to calculate evaporation rate for methane using the modified Penman equation
function evaporationRateMethane(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return methaneCycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

// Function to calculate psychrometric constant for methane sublimation
function psychrometricConstantMethaneSublimation(atmPressure) {
  return psychrometricConstant(atmPressure, L_S_METHANE); // Pa/K
}

// Function to calculate sublimation rate for methane using the modified Penman equation
function sublimationRateMethane(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return methaneCycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

function rapidSublimationRateMethane(temperature, availableMethaneIce) {
    return methaneCycle.rapidSublimationRate(temperature, availableMethaneIce);
}

function calculateMethaneEvaporationRate({
    zoneArea,
    liquidMethaneCoverage,
    dayTemperature,
    nightTemperature,
    methaneVaporPressure,
    avgAtmPressure,
    zonalSolarFlux
}) {
    if (zoneArea <= 0 || liquidMethaneCoverage <= 0) {
        return 0;
    }

    const liquidMethaneCoveredArea = zoneArea * liquidMethaneCoverage;
    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    let dayEvaporationRate = 0;
    if (typeof dayTemperature === 'number') {
        const rate = evaporationRateMethane(dayTemperature, daySolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        dayEvaporationRate = rate * liquidMethaneCoveredArea / 1000;
    }

    let nightEvaporationRate = 0;
    if (typeof nightTemperature === 'number') {
        const rate = evaporationRateMethane(nightTemperature, nightSolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        nightEvaporationRate = rate * liquidMethaneCoveredArea / 1000;
    }

    return (dayEvaporationRate + nightEvaporationRate) / 2;
}

function calculateMethaneSublimationRate({
    zoneArea,
    hydrocarbonIceCoverage,
    dayTemperature,
    nightTemperature,
    methaneVaporPressure,
    avgAtmPressure,
    zonalSolarFlux
}) {
    if (zoneArea <= 0 || hydrocarbonIceCoverage <= 0) {
        return 0;
    }

    const hydrocarbonIceCoveredArea = zoneArea * hydrocarbonIceCoverage;
    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    let daySublimationRate = 0;
    if (typeof dayTemperature === 'number') {
        const rate = sublimationRateMethane(dayTemperature, daySolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        daySublimationRate = rate * hydrocarbonIceCoveredArea / 1000; // tons/s
    }

    let nightSublimationRate = 0;
    if (typeof nightTemperature === 'number') {
        const rate = sublimationRateMethane(nightTemperature, nightSolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        nightSublimationRate = rate * hydrocarbonIceCoveredArea / 1000; // tons/s
    }

    return (daySublimationRate + nightSublimationRate) / 2;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MethaneCycle,
        methaneCycle,
        calculateSaturationPressureMethane,
        slopeSVPMethane,
        psychrometricConstantMethane,
        evaporationRateMethane,
        calculateMethaneEvaporationRate,
        sublimationRateMethane,
        rapidSublimationRateMethane,
        calculateMethaneSublimationRate,
        boilingPointMethane
    };
} else {
    // Expose functions globally for browser usage
    globalThis.MethaneCycle = MethaneCycle;
    globalThis.methaneCycle = methaneCycle;
    globalThis.calculateSaturationPressureMethane = calculateSaturationPressureMethane;
    globalThis.slopeSVPMethane = slopeSVPMethane;
    globalThis.psychrometricConstantMethane = psychrometricConstantMethane;
    globalThis.evaporationRateMethane = evaporationRateMethane;
    globalThis.calculateMethaneEvaporationRate = calculateMethaneEvaporationRate;
    globalThis.sublimationRateMethane = sublimationRateMethane;
    globalThis.rapidSublimationRateMethane = rapidSublimationRateMethane;
    globalThis.calculateMethaneSublimationRate = calculateMethaneSublimationRate;
    globalThis.boilingPointMethane = boilingPointMethane;
}
