// Constants for Methane
const L_V_METHANE = 5.1e5; // Latent heat of vaporization for methane (J/kg)
const L_S_METHANE = 5.87e5; // Latent heat of sublimation for methane (J/kg)

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

// Function to calculate psychrometric constant for methane
function psychrometricConstantMethane(atmPressure) {
  return (C_P_AIR * atmPressure) / (EPSILON * L_V_METHANE); // Pa/K
}

// Function to calculate evaporation rate for methane using the modified Penman equation
function evaporationRateMethane(T, solarFlux, atmPressure, e_a, r_a = 100) {
    const albedo = 0.1; // Typical albedo for liquid methane

    const R_n = (1 - albedo) * solarFlux;
    const Delta_s = slopeSVPMethane(T);
    const gamma_s = psychrometricConstantMethane(atmPressure);
    const rho_a_val = airDensity(atmPressure, T);
    const e_s = calculateSaturationPressureMethane(T);

    const numerator = (Delta_s * R_n) + (rho_a_val * C_P_AIR * (e_s - e_a) / r_a);
    const denominator = (Delta_s + gamma_s) * L_V_METHANE;
    const E_evp = numerator / denominator;

    return Math.max(0, E_evp); // kg/m²/s
}

// Function to calculate psychrometric constant for methane sublimation
function psychrometricConstantMethaneSublimation(atmPressure) {
  return (C_P_AIR * atmPressure) / (EPSILON * L_S_METHANE); // Pa/K
}

// Function to calculate sublimation rate for methane using the modified Penman equation
function sublimationRateMethane(T, solarFlux, atmPressure, e_a, r_a = 100) {
    const albedo = 0.6; // Typical albedo for methane ice

    const R_n = (1 - albedo) * solarFlux;
    const Delta_s = slopeSVPMethane(T);
    const gamma_s = psychrometricConstantMethaneSublimation(atmPressure);
    const rho_a_val = airDensity(atmPressure, T);
    const e_s = calculateSaturationPressureMethane(T);

    const numerator = (Delta_s * R_n) + (rho_a_val * C_P_AIR * (e_s - e_a) / r_a);
    const denominator = (Delta_s + gamma_s) * L_S_METHANE;
    const E_sub = numerator / denominator;

    return Math.max(0, E_sub); // kg/m²/s
}

function rapidSublimationRateMethane(temperature, availableMethaneIce) {
    const sublimationPoint = 90.7; // K
    const sublimationRateMultiplier = 0.000001; // per K per second

    if (temperature > sublimationPoint && availableMethaneIce > 0) {
        const diff = temperature - sublimationPoint;
        return availableMethaneIce * sublimationRateMultiplier * diff;
    }
    return 0;
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

// Calculate potential methane condensation rate factor for a zone
function calculateMethaneCondensationRateFactor({
    zoneArea,
    methaneVaporPressure,
    dayTemperature,
    nightTemperature
}) {
    const freezingPointMethane = 90.7; // K
    const transitionRange = 2.0; // K range over which liquid transitions to ice

    const calculatePotential = (temp) => {
        let liquid = 0, ice = 0;
        if (zoneArea > 0 && typeof temp === 'number' && methaneVaporPressure > 0) {
            const saturationPressure = calculateSaturationPressureMethane(temp);
            if (methaneVaporPressure > saturationPressure) {
                const excessPressure = methaneVaporPressure - saturationPressure;
                const baseRate = (excessPressure / 1000) * zoneArea / 86400; // tons/s
                if (!isNaN(baseRate) && baseRate > 0) {
                    const diff = freezingPointMethane - temp;
                    const maxDiff = 10.0;
                    const intensityScale = temp < freezingPointMethane ? Math.min(diff / maxDiff, 1.0) : 1.0;
                    const rate = baseRate * intensityScale;

                    const mix = Math.min(Math.max((temp - (freezingPointMethane - transitionRange)) / (2 * transitionRange), 0), 1);
                    liquid = rate * mix;
                    ice = rate - liquid;
                }
            }
        }
        return { liquid, ice };
    };

    const nightPotential = calculatePotential(nightTemperature);
    const dayPotential = calculatePotential(dayTemperature);

    return {
        liquidRateFactor: (nightPotential.liquid + dayPotential.liquid) / 2,
        iceRateFactor: (nightPotential.ice + dayPotential.ice) / 2
    };
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateSaturationPressureMethane,
        slopeSVPMethane,
        psychrometricConstantMethane,
        evaporationRateMethane,
        calculateMethaneCondensationRateFactor,
        calculateMethaneEvaporationRate,
        sublimationRateMethane,
        rapidSublimationRateMethane,
        calculateMethaneSublimationRate
    };
} else {
    // Expose functions globally for browser usage
    globalThis.calculateSaturationPressureMethane = calculateSaturationPressureMethane;
    globalThis.slopeSVPMethane = slopeSVPMethane;
    globalThis.psychrometricConstantMethane = psychrometricConstantMethane;
    globalThis.evaporationRateMethane = evaporationRateMethane;
    globalThis.calculateMethaneCondensationRateFactor = calculateMethaneCondensationRateFactor;
    globalThis.calculateMethaneEvaporationRate = calculateMethaneEvaporationRate;
    globalThis.sublimationRateMethane = sublimationRateMethane;
    globalThis.rapidSublimationRateMethane = rapidSublimationRateMethane;
    globalThis.calculateMethaneSublimationRate = calculateMethaneSublimationRate;
}