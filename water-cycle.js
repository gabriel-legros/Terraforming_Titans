const L_S_WATER = 2.83e6; // Latent heat of sublimation for water (J/kg)
const L_V_WATER = 2.45e6; // Latent heat of vaporization for water (J/kg)

// Function to calculate saturation vapor pressure using the Buck Equation for water
function saturationVaporPressureBuck(T) {
    // T: Temperature in Kelvin (K)
    
    if (T < 273.15) {
        // Buck equation for ice (solid water)
        const A = 0.61115; // kPa
        const C1 = 23.036;
        const C2 = 333.7;
        const C3 = 279.82;
    
        function f_ice(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        const es_ice = A * Math.exp(f_ice(T)); // kPa
        return es_ice * 1000; // Convert kPa to Pa
    } else {
        // Buck equation for water (liquid)
        const A = 0.61121; // kPa
        const C1 = 18.678;
        const C2 = 234.5;
        const C3 = 257.14;
    
        function f_water(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        const es_water = A * Math.exp(f_water(T)); // kPa
        return es_water * 1000; // Convert kPa to Pa
    }
}
  
  
// Function to calculate the derivative of saturation vapor pressure with respect to temperature
function derivativeSaturationVaporPressureBuck(T) {
    // T: Temperature in Kelvin (K)
    
    if (T < 273.15) {
        // Buck equation derivative for ice
        const A = 0.61115; // kPa
        const C1 = 23.036;
        const C2 = 333.7;
        const C3 = 279.82;
    
        function f_ice(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        function df_ice(T_K) {
            const T_C = T_K - 273.15; // Convert to Celsius
            const term1 = (C1 - T_C / C2) * (C3 / Math.pow(C3 + T_C, 2));
            const term2 = (-1 / C2) * (T_C / (C3 + T_C));
            return term1 + term2;
        }
    
        const es_ice = A * Math.exp(f_ice(T)); // kPa
        const des_dT = es_ice * df_ice(T) * 1000; // Convert kPa/K to Pa/K
        return des_dT;
    } else {
        // Buck equation derivative for water
        const A = 0.61121; // kPa
        const C1 = 18.678;
        const C2 = 234.5;
        const C3 = 257.14;
    
        function f_water(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        function df_water(T_K) {
            const T_C = T_K - 273.15; // Convert to Celsius
            const term1 = (C1 - T_C / C2) * (C3 / Math.pow(C3 + T_C, 2));
            const term2 = (-1 / C2) * (T_C / (C3 + T_C));
            return term1 + term2;
        }
    
        const es_water = A * Math.exp(f_water(T)); // kPa
        const des_dT = es_water * df_water(T) * 1000; // Convert kPa/K to Pa/K
        return des_dT;
    }
}
  
// Function to calculate the slope of the saturation vapor pressure curve (Delta_s)
function slopeSaturationVaporPressureWater(T) {
    // T: Temperature in Kelvin (K)
    return derivativeSaturationVaporPressureBuck(T); // Pa/K
}
  
// Function to calculate psychrometric constant (gamma_s) for water evaporation
function psychrometricConstantWater(atmPressure) {
    // atmPressure: Atmospheric pressure in Pa
    return (C_P_AIR * atmPressure) / (EPSILON * L_V_WATER); // Pa/K
}
  
// Function to calculate sublimation rate for water ice using the modified Penman equation
function sublimationRateWater(T, solarFlux, atmPressure, e_a, r_a = 100) {
    // T: Temperature in Kelvin (K)
    // solarFlux: Incoming solar radiation (W/m²)
    // atmPressure: Atmospheric pressure (Pa)
    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
    // r_a: Aerodynamic resistance (s/m), default is 100 s/m
  
    const albedo = 0.6; // Typical albedo for water ice
  
    // Calculate net radiation (simplified to net shortwave)
    const R_n = (1 - albedo) * solarFlux; // W/m²
  
    // Calculate slope of saturation vapor pressure curve (Delta_s) at temperature T
    const Delta_s = slopeSaturationVaporPressureWater(T); // Pa/K
  
    // Calculate psychrometric constant (gamma_s)
    const gamma_s = (C_P_AIR * atmPressure) / (EPSILON * L_S_WATER); // Pa/K
  
    // Calculate air density (rho_a)
    const rho_a_val = atmPressure / (R_AIR * T); // kg/m³
  
    // Calculate saturation vapor pressure at temperature T
    const e_s = saturationVaporPressureBuck(T); // Pa
  
    // Calculate sublimation rate (kg/m²/s) using the modified Penman equation
    const numerator = (Delta_s * R_n) + (rho_a_val * C_P_AIR * (e_s - e_a) / r_a);
    const denominator = (Delta_s + gamma_s) * L_S_WATER;
    const E_sub = numerator / denominator; // kg/m²/s
  
    // Ensure sublimation only occurs when saturation vapor pressure exceeds actual vapor pressure
    return E_sub; // kg/m²/s
}

// Function to calculate evaporation rate for water using the modified Penman equation
function evaporationRateWater(T, solarFlux, atmPressure, e_a, r_a = 100) {
    // T: Temperature in Kelvin (K)
    // solarFlux: Incoming solar radiation (W/m²)
    // atmPressure: Atmospheric pressure (Pa)
    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
    // r_a: Aerodynamic resistance (s/m), default is 100 s/m
  
    const albedo = 0.3; // Typical albedo for liquid water (varies between 0.1-0.3 depending on conditions)
  
    // Calculate net radiation (simplified to net shortwave)
    const R_n = (1 - albedo) * solarFlux; // W/m²
  
    // Calculate slope of saturation vapor pressure curve (Delta_s) at temperature T
    const Delta_s = slopeSaturationVaporPressureWater(T); // Pa/K
  
    // Calculate psychrometric constant (gamma_s)
    const gamma_s = psychrometricConstantWater(atmPressure); // Pa/K
  
    // Calculate air density (rho_a)
    const rho_a_val = airDensity(atmPressure, T); // kg/m³
  
    // Calculate saturation vapor pressure at temperature T
    const e_s = saturationVaporPressureBuck(T); // Pa
  
    // Calculate evaporation rate (kg/m²/s) using the modified Penman equation
    const numerator = (Delta_s * R_n) + (rho_a_val * C_P_AIR * (e_s - e_a) / r_a);
    const denominator = (Delta_s + gamma_s) * L_V_WATER;
    const E_evp = numerator / denominator; // kg/m²/s
  
    // Ensure evaporation only occurs when saturation vapor pressure exceeds actual vapor pressure
    return E_evp; // kg/m²/s
}