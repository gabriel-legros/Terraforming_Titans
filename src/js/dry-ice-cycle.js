// Constants
const STEFAN_BOLTZMANN = 5.67e-8; // W/m²·K⁴
const L_S_CO2 = 574000; // J/kg (latent heat of sublimation for CO2)
const R_CO2 = 188.9; // J/kg·K (specific gas constant for CO2)


const isNodeDryIce = (typeof module !== 'undefined' && module.exports);
var penmanRate = globalThis.penmanRate;
var psychrometricConstant = globalThis.psychrometricConstant;
if (isNodeDryIce) {
  try {
    ({ penmanRate, psychrometricConstant } = require('./phase-change-utils.js'));
  } catch (e) {
    // fall back to globals if require fails
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

// Function to calculate psychrometric constant (gamma_s)
function psychrometricConstantCO2(atmPressure) {
  return psychrometricConstant(atmPressure, L_S_CO2); // Pa/K
}

// Function to calculate sublimation rate (E_sub) using the modified Penman equation
function sublimationRateCO2(T, solarFlux, atmPressure, e_a, r_a = 100) {
  const Delta_s = slopeSVPCO2(T); // Pa/K
  const e_s = calculateSaturationPressureCO2(T); // Pa
  return penmanRate({
    T,
    solarFlux,
    atmPressure,
    e_a,
    latentHeat: L_S_CO2,
    albedo: 0.6,
    r_a,
    Delta_s,
    e_s,
  });
}

// Calculate rapid sublimation rate of surface CO₂ ice when the temperature
// rises well above the sublimation point. Modeled similar to water melting in
// hydrology.js using a simple linear multiplier.
function rapidSublimationRateCO2(temperature, availableDryIce) {
    const sublimationPoint = 195; // K
    const sublimationRateMultiplier = 0.00000001; // per K per second

    if (temperature > sublimationPoint && availableDryIce > 0) {
        const diff = temperature - sublimationPoint;
        return availableDryIce * sublimationRateMultiplier * diff;
    }
    return 0;
}

// Calculate potential CO₂ condensation rate factor for a zone. The returned
// value represents the rate (in tons/s) that would occur if the condensation
// parameter were equal to 1.
function calculateCO2CondensationRateFactor({
    zoneArea,
    co2VaporPressure,
    dayTemperature,
    nightTemperature
}) {
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

    return (nightPotential + dayPotential) / 2;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateSaturationPressureCO2,
        slopeSVPCO2,
        psychrometricConstantCO2,
        sublimationRateCO2,
        rapidSublimationRateCO2,
        calculateCO2CondensationRateFactor
    };
} else {
    // Expose functions globally for browser usage
    globalThis.calculateSaturationPressureCO2 = calculateSaturationPressureCO2;
    globalThis.slopeSVPCO2 = slopeSVPCO2;
    globalThis.psychrometricConstantCO2 = psychrometricConstantCO2;
    globalThis.sublimationRateCO2 = sublimationRateCO2;
    globalThis.rapidSublimationRateCO2 = rapidSublimationRateCO2;
    globalThis.calculateCO2CondensationRateFactor = calculateCO2CondensationRateFactor;
}
