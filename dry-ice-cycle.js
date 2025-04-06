// Constants
const STEFAN_BOLTZMANN = 5.67e-8; // W/m²·K⁴
const L_S_CO2 = 574000; // J/kg (latent heat of sublimation for CO2)
const R_CO2 = 188.9; // J/kg·K (specific gas constant for CO2)

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
  return (C_P_AIR * atmPressure) / (EPSILON * L_S_CO2); // Pa/K
}

// Function to calculate sublimation rate (E_sub) using the modified Penman equation
function sublimationRateCO2(T, solarFlux, atmPressure, e_a, r_a = 100) {
  // T: Temperature in °C
  // solarFlux: Incoming solar radiation (W/m²)
  // atmPressure: Atmospheric pressure (Pa)
  // e_a: Actual vapor pressure of CO2 (Pa)
  // r_a: Aerodynamic resistance (s/m)
  
  const albedo = 0.6; // Typical albedo for dry ice
  
  // Calculate net radiation (simplified to net shortwave)
  const R_n = (1 - albedo) * solarFlux; // W/m²
  
  // Calculate slope of SVP curve
  const Delta_s = slopeSVPCO2(T); // Pa/K
  
  // Calculate psychrometric constant
  const gamma_s = psychrometricConstantCO2(atmPressure); // Pa/K
  
  // Calculate air density
  const rho_a_val = airDensity(atmPressure, T); // kg/m³
  
  // Calculate saturation vapor pressure
  const e_s = calculateSaturationPressureCO2(T); // Pa
  
  // Calculate sublimation rate
  const numerator = (Delta_s * R_n) + (rho_a_val * C_P_AIR * (e_s - e_a) / r_a);
  const denominator = (Delta_s + gamma_s) * L_S_CO2;
  const E_sub = numerator / denominator; // kg/m²/s
  
  // Ensure sublimation rate is non-negative (Penman can be negative if e_a > e_s)
  return Math.max(0, E_sub);
}
