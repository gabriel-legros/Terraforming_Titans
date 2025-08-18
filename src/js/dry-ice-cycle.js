// co2-phase.js (improved)
// Strict, documented, and robust helpers for CO₂ phase-change calculations.
// Backwards compatible with previous exports.
//
// eslint-disable-next-line strict
"use strict";

/** Physical constants (SI) */
const STEFAN_BOLTZMANN = 5.670374419e-8; // W·m⁻²·K⁻⁴ (not used directly here, retained for completeness)
const L_S_CO2 = 574_000;                 // J·kg⁻¹  (latent heat of sublimation for CO₂)
const R_CO2   = 188.9;                   // J·kg⁻¹·K⁻¹ (specific gas constant for CO₂)

/** CO₂ characteristic points */
const T_CRIT = 304.1282;   // K (critical temperature)
const P_CRIT = 7.3773e6;   // Pa (critical pressure)
const T_TRPL = 216.592;    // K (triple point temperature)
const P_TRPL = 5.185e5;    // Pa (triple point pressure ~5.185 bar)

/** Wagner equation constants for CO₂ (vapor–liquid, valid near 0.7–1.0 T/Tc) */
const WAGNER = Object.freeze({
  A: -7.0602087,
  B:  1.9391218,
  C: -1.6463597,
  D: -3.2995634
});

/** Runtime loading support (browser & Node/CJS) */
const isNode = typeof module !== "undefined" && !!module.exports;
let penmanRate = globalThis.penmanRate;
let psychrometricConstant = globalThis.psychrometricConstant;
if (isNode) {
  try {
    ({ penmanRate, psychrometricConstant } = require("./phase-change-utils.js"));
  } catch {
    // Fall back to globals if available; otherwise we add safe defaults below.
  }
}

/** Small helpers */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isFiniteNumber = (x) => Number.isFinite(x);

/**
 * Compute vapor pressure over condensed CO₂.
 *  - For T >= T_TRPL, uses Wagner vapor–liquid correlation (Pa).
 *  - For T <  T_TRPL, uses a Clausius–Clapeyron sublimation fit anchored at the triple point (Pa).
 *    ln(P) = ln(P_trpl) - (L_s/R) (1/T - 1/T_trpl)
 * @param {number} T  Temperature in K (must be > 0)
 * @returns {number}  Saturation pressure in Pa
 */
function saturationPressureCO2(T) {
  if (!isFiniteNumber(T) || T <= 0) throw new RangeError("Temperature must be > 0 K");
  if (T >= T_TRPL && T <= T_CRIT) {
    const tau = 1 - (T / T_CRIT);
    // Guard tau domain to avoid NaN from tau^0.5 when T slightly > Tc due to numeric drift
    const th = clamp(tau, 0, 1);
    const { A, B, C, D } = WAGNER;
    const lnPr =
      A * th +
      B * Math.pow(th, 1.5) +
      C * Math.pow(th, 2.5) +
      D * Math.pow(th, 5.0);
    const Pr = Math.exp(lnPr);    // reduced pressure P/Pc
    return clamp(Pr * P_CRIT, 0, P_CRIT); // Pa
  }

  // Sublimation branch (T < T_TRPL): Clausius–Clapeyron anchored at triple point.
  // ln(P/P_trpl) = -(L_s/R) * (1/T - 1/T_trpl)
  const invT  = 1 / T;
  const invTt = 1 / T_TRPL;
  const a = L_S_CO2 / R_CO2;
  const lnRatio = -a * (invT - invTt);
  const P = P_TRPL * Math.exp(lnRatio);
  return clamp(P, 0, P_TRPL);
}

/**
 * dP/dT of the saturation (or sublimation) curve (Pa·K⁻¹).
 *  - Matches `saturationPressureCO2` branch selection.
 * @param {number} T Temperature in K
 * @returns {number} dP/dT in Pa/K
 */
function slopeSVPCO2(T) {
  if (!isFiniteNumber(T) || T <= 0) throw new RangeError("Temperature must be > 0 K");

  if (T >= T_TRPL && T <= T_CRIT) {
    const tau = 1 - (T / T_CRIT);
    const th = clamp(tau, 0, 1);
    const { A, B, C, D } = WAGNER;

    // Recompute P via Wagner (Pa)
    const lnPr =
      A * th +
      B * Math.pow(th, 1.5) +
      C * Math.pow(th, 2.5) +
      D * Math.pow(th, 5.0);
    const Pr = Math.exp(lnPr);
    const P  = clamp(Pr * P_CRIT, 0, P_CRIT);

    // d(lnPr)/d(tau)
    const dlnPr_dtau =
      A +
      1.5 * B * Math.pow(th, 0.5) +
      2.5 * C * Math.pow(th, 1.5) +
      5.0 * D * Math.pow(th, 4.0);

    // dP/dT = -(P/Tc) * d(lnPr)/d(tau) ; result in Pa/K
    const dP_dT = -(P / T_CRIT) * dlnPr_dtau;
    return dP_dT;
  }

  // Sublimation branch (Clausius–Clapeyron): P(T) = P_t * exp[-(L/R)(1/T - 1/T_t)]
  // dP/dT = P * (L/R) * (1/T²)
  const P = saturationPressureCO2(T);
  const a = L_S_CO2 / R_CO2;
  return P * a / (T * T);
}

/**
 * Psychrometric constant for CO₂ (Pa/K).
 * Delegates to provided `psychrometricConstant(P, L)` when available.
 * Otherwise uses a dimensional fallback: γ ≈ (c_p * P) / (ε * L).
 * We approximate c_p (CO₂) ≈ 846 J·kg⁻¹·K⁻¹ and ε ≈ 1 for a CO₂ system.
 * @param {number} atmPressure Ambient pressure (Pa)
 * @returns {number} γ in Pa/K
 */
function psychrometricConstantCO2(atmPressure) {
  if (typeof psychrometricConstant === "function") {
    return psychrometricConstant(atmPressure, L_S_CO2);
  }
  // Conservative fallback (units OK; approximations noted)
  const cpCO2   = 846;  // J·kg⁻¹·K⁻¹
  const epsilon = 1.0;  // dimensionless, CO₂-only system
  return (cpCO2 * atmPressure) / (epsilon * L_S_CO2);
}

/**
 * Modified Penman sublimation rate (kg·m⁻²·s⁻¹) for CO₂ ice.
 * Requires a `penmanRate` implementation (passed via runtime require/global).
 * @param {number} T          Surface temperature (K)
 * @param {number} solarFlux  Net absorbed radiative flux (W·m⁻²), after albedo if possible
 * @param {number} atmPressure Ambient pressure (Pa)
 * @param {number} e_a        Ambient vapor partial pressure of CO₂ (Pa)
 * @param {number} [r_a=100]  Aerodynamic resistance (s·m⁻¹)
 * @param {number} [albedo=0.6] Surface albedo (dimensionless) if solarFlux is TOA/direct
 * @returns {number}          Mass flux (kg·m⁻²·s⁻¹); 0 if inputs invalid or penmanRate unavailable
 */
function sublimationRateCO2(T, solarFlux, atmPressure, e_a, r_a = 100, albedo = 0.6) {
  if (typeof penmanRate !== "function") {
    // Safe fallback: no penman implementation present
    return 0;
  }
  if (![T, solarFlux, atmPressure, e_a, r_a].every(isFiniteNumber) || T <= 0 || atmPressure <= 0) {
    return 0;
  }
  const Delta_s = slopeSVPCO2(T);     // Pa/K
  const e_s     = saturationPressureCO2(T); // Pa
  return penmanRate({
    T,
    solarFlux,
    atmPressure,
    e_a,
    latentHeat: L_S_CO2,
    albedo,
    r_a,
    Delta_s,
    e_s
  });
}

/**
 * Rapid sublimation heuristic (kg·m⁻²·s⁻¹) when T >> frostpoint.
 * Scales linearly with (T - T_sublimation) and available surface mass.
 * @param {number} temperature       K
 * @param {number} availableDryIce   kg·m⁻² (surface reservoir)
 * @param {number} [dt=1]            seconds; the returned mass rate is per second (dt used for safety clamp)
 * @returns {number}                 kg·m⁻²·s⁻¹
 */
function rapidSublimationRateCO2(temperature, availableDryIce, dt = 1) {
  const sublimationPoint = 195;          // K (heuristic frostpoint threshold for surface CO₂ ice)
  const k = 1e-8;                        // s⁻¹·K⁻¹ multiplier (heuristic)
  if (!isFiniteNumber(temperature) || !isFiniteNumber(availableDryIce) || availableDryIce <= 0) return 0;
  if (temperature <= sublimationPoint) return 0;

  const diffK = temperature - sublimationPoint;
  const rate  = availableDryIce * k * diffK;   // kg·m⁻²·s⁻¹
  // Clamp so that we cannot remove more than the reservoir in dt
  return clamp(rate, 0, availableDryIce / Math.max(dt, 1e-6));
}

/**
 * Frost point (sublimation) pressure at temperature T (Pa).
 * This is simply `saturationPressureCO2(T)`; provided for clarity.
 * @param {number} T K
 * @returns {number} Pa
 */
function co2FrostPointPressure(T) {
  return saturationPressureCO2(T);
}

/**
 * Frost point (sublimation) temperature for a given CO₂ partial pressure (Pa).
 * Inverts the sublimation Clausius–Clapeyron relation below the triple point,
 * and falls back to scanning above the triple point using the Wagner branch.
 * @param {number} P Pa
 * @returns {number} K
 */
function co2FrostPointTemperature(P) {
  if (!isFiniteNumber(P) || P <= 0) throw new RangeError("Pressure must be > 0 Pa");

  // Below triple point: analytic inversion from Clausius–Clapeyron
  if (P <= P_TRPL) {
    // ln(P/P_t) = -(L/R)*(1/T - 1/T_t)  ->  1/T = 1/T_t + (R/L)*ln(P_t/P)
    const invT = (1 / T_TRPL) + (R_CO2 / L_S_CO2) * Math.log(P_TRPL / P);
    return 1 / invT;
  }

  // Above triple point: find T where saturation matches P using a robust bracketed search
  // Limit to [T_TRPL, T_CRIT]; return T_CRIT if P >= P_CRIT.
  if (P >= P_CRIT) return T_CRIT;

  let lo = T_TRPL, hi = T_CRIT;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const Pm  = saturationPressureCO2(mid);
    if (Math.abs(Pm - P) / P < 1e-6) return mid;
    if (Pm > P) hi = mid; else lo = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Estimate a potential CO₂ condensation rate factor for a zone.
 * Returned value is a factor (tons·s⁻¹) if "condensation parameter" were 1.
 * NOTE: Retains original heuristic while hardening math & guards.
 */
function calculateCO2CondensationRateFactor({
  zoneArea,
  co2VaporPressure,
  dayTemperature,
  nightTemperature
}) {
  const condensationTemperatureCO2 = 195; // K
  const safeArea = Math.max(0, zoneArea || 0);
  const safePv   = Math.max(0, co2VaporPressure || 0);

  const potential = (T) => {
    if (!isFiniteNumber(T) || safeArea <= 0 || safePv <= 0) return 0;
    if (T >= condensationTemperatureCO2) return 0;

    const dT = condensationTemperatureCO2 - T;
    const start = 5.0, maxd = 45.0;

    let scale = 0;
    if (dT > maxd) {
      scale = 1.0;
    } else if (dT > start) {
      scale = (dT - start) / (maxd - start);
    }

    // Heuristic base factor retained (units project-specific)
    const base = safeArea * safePv / 1000;
    return isFiniteNumber(base) && base > 0 ? base * scale : 0;
  };

  const night = potential(nightTemperature);
  const day   = potential(dayTemperature);
  return 0.5 * (night + day);
}

/* ------------------------------------------------------------------ */
/* Exports (CJS + browser globals)                                    */
/* ------------------------------------------------------------------ */
const api = {
  // Core
  saturationPressureCO2,
  slopeSVPCO2,
  psychrometricConstantCO2,
  sublimationRateCO2,
  rapidSublimationRateCO2,
  calculateCO2CondensationRateFactor,
  // Utilities
  co2FrostPointPressure,
  co2FrostPointTemperature,
  // Constants for external reference
  STEFAN_BOLTZMANN,
  L_S_CO2,
  R_CO2,
  T_TRPL,
  P_TRPL,
  T_CRIT,
  P_CRIT
};

// Backwards-compatibility aliases
api.calculateSaturationPressureCO2 = saturationPressureCO2;

if (isNode) {
  module.exports = api;
} else {
  Object.assign(globalThis, api);
}
