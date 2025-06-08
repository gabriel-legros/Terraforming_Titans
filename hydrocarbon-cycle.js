// Constants for Methane
const L_V_METHANE = 5.1e5; // Latent heat of vaporization for methane (J/kg)

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

// Calculate potential methane condensation rate factor for a zone
function calculateMethaneCondensationRateFactor({
    zoneArea,
    methaneVaporPressure,
    dayTemperature,
    nightTemperature
}) {
    const condensationTemperatureMethane = 90.7; // K, boiling point at 1 atm

    const calculatePotential = (temp) => {
        if (zoneArea <= 0 || typeof temp !== 'number' || methaneVaporPressure <= 0) {
            return 0;
        }
        if (temp >= condensationTemperatureMethane) {
            return 0;
        }

        const saturationPressure = calculateSaturationPressureMethane(temp);
        if (methaneVaporPressure > saturationPressure) {
            const excessPressure = methaneVaporPressure - saturationPressure;
            // This is a simplified model. A more complex model would consider atmospheric dynamics.
            // For now, we'll use a simple linear relationship.
            const baseRate = (excessPressure / 1000) * zoneArea / 86400; // tons/s
            return baseRate;
        }
        return 0;
    };

    const nightPotential = calculatePotential(nightTemperature);
    const dayPotential = calculatePotential(dayTemperature);

    return (nightPotential + dayPotential) / 2;
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateSaturationPressureMethane,
        slopeSVPMethane,
        psychrometricConstantMethane,
        evaporationRateMethane,
        calculateMethaneCondensationRateFactor
    };
} else {
    // Expose functions globally for browser usage
    globalThis.calculateSaturationPressureMethane = calculateSaturationPressureMethane;
    globalThis.slopeSVPMethane = slopeSVPMethane;
    globalThis.psychrometricConstantMethane = psychrometricConstantMethane;
    globalThis.evaporationRateMethane = evaporationRateMethane;
    globalThis.calculateMethaneCondensationRateFactor = calculateMethaneCondensationRateFactor;
}