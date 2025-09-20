/* Albedo physics refactor: additive deltas + shortwave AOD
   - Keeps IR opticalDepth() for greenhouse
   - Adds opticalDepthSW() for visible (albedo) contributions
   - Rewrites calculateActualAlbedoPhysics() to use the new scheme
   - Removes cloudAndHazeProps() and replaces with cloudPropsOnly()
*/

const R_AIR = 287;

// ===== Tunables (safe defaults) ======================================
// Cap Bond albedo at a realistic maximum (prevents A -> 1)
const MAX_BOND_ALBEDO = 0.9;
// Above this threshold, additional brightening has diminishing returns
const ALBEDO_SOFTCAP_THRESHOLD = 0.8;
// Higher K => stronger diminishing returns near the cap
const ALBEDO_SOFTCAP_K = 2.0;
const A_HAZE_CH4_MAX  = 0.25; // calibrated so τ_CH4≈0.907 lifts A_surf=0.19 → ≈0.250 with small clouds
const K_CH4_ALB       = 3;     // how quickly CH4 haze brightening saturates

const A_CALCITE_HEADROOM_MAX = 0.3; // calcite can add up to +0.3 in the limit
const K_CALCITE_ALB  = 1.0;          // saturates near τ_eff ≈ 1
const OPTICS = {
  calcite: { omega0: 0.98, g: 0.70 } // bright & moderately forward-scattering
};

// ---------- Shortwave (visible) optical depth ----------
const K_CH4_SW        = 2.0;     // haze build-up rate vs methane column
const MU_CH4_SAT      = 4.0;     // kg/m²: methane column where haze nearly saturates
const EPS_EXT_CALCITE = 1500;    // m²/kg: calcite mass-extinction (tunable)

// Haze coverage saturator (diagnostic only)
const K_HAZE_COVERAGE = 5.5; // larger → coverage approaches 1 faster vs τ

// Effective τ to reflect scattering usefulness (optional but helpful)
function tauEff(tau, {omega0, g}) {
  return Math.max(0, (1 - omega0 * g)) * Math.max(0, tau);
}

function hazeCoverageFromTau(tau) {
  return 1 - Math.exp(-K_HAZE_COVERAGE * Math.max(0, tau));
}

function calculateAtmosphericPressure(mass, gravity, radius) {
  if (mass <= 0){return 0};
  if (gravity <= 0) throw new Error("Gravity must be a positive number.");
  if (radius <= 0) throw new Error("Radius must be a positive number.");
  const surfaceArea = 4 * Math.PI * Math.pow(radius*1e3, 2);
  const pressure = (1e3*mass * gravity) / surfaceArea;
  return pressure; // Pa
}

// Calculate atmospheric emissivity directly from *IR* optical depth
function calculateEmissivity(composition, surfacePressureBar, gSurface){
  const { total: tau, contributions } = opticalDepth(composition, surfacePressureBar, gSurface);
  return { emissivity: 1 - Math.exp(-tau), tau, contributions };
}

// Air density (kg/m³)
function airDensity(atmPressure, T) {
  return atmPressure / (R_AIR * T);
}

function calculateDayNightTemperatureVariation(temperature, columnMass){
  if(columnMass < 1){
    return temperature/0.75;
  } else {
    return temperature/(0.75 + 0.255*Math.pow(Math.log10(columnMass), 2.91));
  }
}

// ───────────────────────────────────────────────────────────
// Improved weather model derived from planet_temp_model.py
// ───────────────────────────────────────────────────────────
const SIGMA = 5.670374419e-8;

// ─── Existing IR greenhouse parameters ─────────────────────────────
const COLUMN_MASS_REF = 5.0e4;   // μ0 in kg/m² (reference column for scaling)
const BETA  = 0.55;              // was 0.6 in old pressure law

// Keep original strengths EXCEPT water (we tune only H2O)
const GAMMA = {
  h2o           : 8,
  co2           : 10.0,
  ch4           : 20.0,
  greenhousegas : 2500.0
};

// Saturation only for CH4 (and H2SO4 if you like)
const MU_SAT = { ch4: 3}; // kg/m²
const SAT_EXP = { ch4: 1.0};    // exponent n_i

/*  Cloud spec kept for cloud appearance only (no haze here)
    refMix  – mixing ratio (mass fraction) that saturates availability (=1)
    cfMax   – maximum cloud-fraction achievable
    pScale  – pressure scale (bar) for cloud build-up
    aBase   – core albedo of an optically thick deck
    aVar    – extra brightening with pressure          */
const CLOUD_SPEC = {
  h2o  : { refMix: 0.01, cfMax: 0.50, pScale: 0.8, aBase: 0.60, aVar: 0.18 },
  ch4  : { refMix: 0.02, cfMax: 0.10, pScale: 2.0, aBase: 0.60, aVar: 0.10 },
  h2so4: { refMix: 1e-4, cfMax: 0.99, pScale: 5.0, aBase: 0.75, aVar: 0.05 }
};

const DEFAULT_SURFACE_ALBEDO = {
  ocean: 0.06,
  ice: 0.65,
  snow: 0.85,
  co2_ice: 0.50,
  hydrocarbon: 0.10,
  hydrocarbonIce :0.50,
  biomass: 0.20
};

// ===== IR optical depth for greenhouse (unchanged) ==================
function opticalDepth(comp, pBar, gSurface) {
  const pPa   = pBar * 1e5;
  const mcolT = pPa / gSurface;  // total column mass (kg/m²)
  let total = 0;
  const contributions = {};

  for (const key in comp) {
    const x = comp[key] ?? comp[key.toLowerCase()] ?? 0; // tolerate key case
    if (x <= 0) continue;

    const k = key.toLowerCase();
    const G = GAMMA[k] ?? 0;
    if (!G) continue;

    const mu_i = x * mcolT;                      // column mass of gas i
    const R    = mu_i / COLUMN_MASS_REF;         // dimensionless
    let tau_i;

    if (k === 'ch4') {
      const saturationThreshold = 0.0003;
      if (R <= saturationThreshold) {
        tau_i = G * Math.pow(R, BETA);
      } else {
        tau_i = G * (Math.pow(saturationThreshold, BETA) + 0.28*Math.pow(R - saturationThreshold,0.9));
      }
    } else if (k === 'co2') {
      const saturationThreshold = 0.0003;
      if(R <= saturationThreshold){
        tau_i = G * Math.pow(R, BETA);
      }
      else{
        tau_i = G * (Math.pow(saturationThreshold, BETA) + Math.pow(R - saturationThreshold,0.9));
      }
    }
    else  {
      // Default behavior for other gases
      tau_i = G * Math.pow(R, BETA);
    }

    total += tau_i;
    contributions[k] = tau_i;
  }
  return { total, contributions };
}

// ===== NEW: shortwave (visible) optical depth for albedo ============
function opticalDepthSW(composition, pBar, gSurface, aerosols = {}) {
  const pPa   = pBar * 1e5;
  const mcolT = pPa / gSurface;             // kg/m² total air column

  // --- CH4 photochemical haze from methane column mass (not IR τ) ---
  const x_ch4   = composition.ch4 || 0;     // mass fraction
  const mu_ch4  = x_ch4 * mcolT;            // kg/m² methane column
  const tau_ch4 = 1 - Math.exp(-K_CH4_SW * (mu_ch4 / MU_CH4_SAT));

  // --- Calcite aerosol AOD from its column mass (kg/m²) ---
  const M_calcite   = aerosols.calcite || 0; // pass your evolving column here
  const tau_calcite = EPS_EXT_CALCITE * M_calcite;

  const contributions = { ch4_haze: tau_ch4, calcite: tau_calcite };
  return { total: tau_ch4 + tau_calcite, contributions };
}

// ===== Clouds only (no haze) ========================================
function cloudPropsOnly(pBar, comp = {}) {
  let cfTot = 0;
  let aCloudWeighted = 0;
  for (const gas in CLOUD_SPEC) {
    const spec = CLOUD_SPEC[gas];
    const mix  = comp[gas] || 0; // mass fraction
    if (mix <= 0) continue;

    const availability = Math.min(1, mix / spec.refMix);
    const cf = spec.cfMax * (1 - Math.exp(-pBar / spec.pScale)) * availability;
    const aGas = spec.aBase + spec.aVar * Math.tanh(pBar / (2 * spec.pScale));

    aCloudWeighted += cf * aGas;
    cfTot          += cf;
  }
  const cfCloud = Math.min(0.99, cfTot);
  const aCloud  = cfTot > 0 ? aCloudWeighted / cfTot : 0;
  return { cfCloud, aCloud };
}

function autoSlabHeatCapacity(
  rotationPeriodH,
  surfacePressureBar,
  surfaceFractions,
  g = 9.81,
  kappaSoil = 7e-7,
  rhoCSoil = 1.4e6,
  options = {}
) {
  const f = surfaceFractions || {};
  const fOcean = f.ocean || 0.0;
  const fIce = f.ice || 0.0;
  const fOther = 1.0 - fOcean - fIce;

  const hSoil = Math.sqrt(kappaSoil * rotationPeriodH * 3600 / Math.PI);
  const CSoil = rhoCSoil * hSoil;
  const COcean = 4.2e6 * 50.0;
  const CIce = 1.9e6 * 0.05;

  const cpOverride = options?.airSpecificHeat;
  const cpAir = Number.isFinite(cpOverride) ? cpOverride : 850.0;
  const columnMass = (surfacePressureBar * 1e5) / g;

  let fallbackAtmosphere = cpAir * columnMass;
  const lapse = options?.lapseFactor;
  if (Number.isFinite(lapse)) {
    const denominator = 1 + lapse;
    fallbackAtmosphere = denominator === 0 ? 0 : fallbackAtmosphere / denominator;
  }

  const atmCapacity = options?.atmosphereCapacity;
  const CAtm = Number.isFinite(atmCapacity) ? atmCapacity : fallbackAtmosphere;

  return fOther * CSoil + fOcean * COcean + fIce * CIce + CAtm;
}

function effectiveTemp(albedo, flux) {
  return Math.pow((1 - albedo) * flux / (4 * SIGMA), 0.25);
}

function cloudFraction(pBar) {
  const cf = 1.0 - Math.exp(-pBar / 3.0);
  return Math.min(cf, 0.99);
}

// ===== Additive albedo builder ======================================
function albedoAdditive({
  surfaceAlbedo, pressureBar, composition = {}, gSurface = 9.81,
  aerosolsSW = {} // e.g., { calcite: columnMass_kg_per_m2 }
}) {
  // Shortwave AODs:
  const { contributions: sw } = opticalDepthSW(composition, pressureBar, gSurface, aerosolsSW);
  const tau_ch4_sw     = sw.ch4_haze || 0;
  const tau_calcite_sw = sw.calcite  || 0;

  // Start from clear sky
  const A_surf = surfaceAlbedo;

  // --- CH4 photochemical haze (additive delta) ---
  const headroom_ch4 = Math.max(0, A_HAZE_CH4_MAX - A_surf);
  const F_ch4        = 1 - Math.exp(-K_CH4_ALB * Math.max(0, tau_ch4_sw));
  const dA_ch4       = headroom_ch4 * F_ch4;
  let   A_base       = A_surf + dA_ch4;

  // --- Calcite aerosol (optional) ---
  const tau_calcite_eff = tauEff(tau_calcite_sw, OPTICS.calcite);
  const F_calcite       = 1 - Math.exp(-K_CALCITE_ALB * tau_calcite_eff);
  const headroom_calc   = Math.min(A_CALCITE_HEADROOM_MAX, 1 - A_base);
  const dA_calcite      = headroom_calc * F_calcite;
  A_base += dA_calcite;

  // --- Clouds last (brighten what’s left, never dim) ---
  const { cfCloud, aCloud } = cloudPropsOnly(pressureBar, composition);
  const dA_cloud = cfCloud * Math.max(0, aCloud - A_base);
  A_base += dA_cloud;

  // Apply soft cap above threshold to create an asymptotic approach to MAX_BOND_ALBEDO
  let A_final = A_base;
  if (A_final > ALBEDO_SOFTCAP_THRESHOLD) {
    const span = Math.max(1e-9, (MAX_BOND_ALBEDO - ALBEDO_SOFTCAP_THRESHOLD));
    const over = (A_final - ALBEDO_SOFTCAP_THRESHOLD) / span;
    // Asymptotic mapping toward the cap with diminishing returns
    const scaled = 1 - Math.exp(-ALBEDO_SOFTCAP_K * Math.max(0, over));
    A_final = ALBEDO_SOFTCAP_THRESHOLD + span * Math.min(1, scaled);
  }
  // Final hard clamp to safe bounds
  A_final = Math.max(0, Math.min(MAX_BOND_ALBEDO, A_final));
  return {
    albedo: A_final,
    components: { A_surf, dA_ch4, dA_calcite, dA_cloud },
    diagnostics: { tau_ch4_sw, tau_calcite_sw }
  };
}

// ===== Updated: Calculate actual (Bond) albedo =======================
// Signature unchanged to preserve game-wide calls
function calculateActualAlbedoPhysics(surfaceAlbedo, pressureBar, composition = {}, gSurface, aerosolsSW = {}) {
  // Build albedo via additive scheme (optionally with aerosols like calcite)
  const { albedo: A, diagnostics, components } = albedoAdditive({
    surfaceAlbedo,
    pressureBar,
    composition,
    gSurface,
    aerosolsSW
  });

  // Back-compat diagnostics
  const { cfCloud } = cloudPropsOnly(pressureBar, composition);
  const cfHaze = hazeCoverageFromTau(diagnostics.tau_ch4_sw || 0);

  return { albedo: A, cfCloud, cfHaze, components, diagnostics, maxCap: MAX_BOND_ALBEDO, softCapThreshold: ALBEDO_SOFTCAP_THRESHOLD };
}


function surfaceAlbedoMix(rockAlb, fractions, customAlb) {
  if (!fractions) return rockAlb;
  const albs = { ...DEFAULT_SURFACE_ALBEDO };
  if (customAlb) Object.assign(albs, customAlb);
  const rockFrac = Math.max(1.0 - Object.values(fractions).reduce((a, b) => a + b, 0),0);
  let a = rockFrac * rockAlb;
  for (const k in fractions) {
    a += fractions[k] * (albs[k] !== undefined ? albs[k] : rockAlb);
  }
  return a;
}

function diurnalAmplitude(albedo, flux, T, heatCap, rotH) {
  const omega = 2.0 * Math.PI / (Math.abs(rotH) * 3600.0);
  const num = (1 - albedo) * flux / 2.0;
  const den = Math.sqrt(heatCap * omega * 4.0 * SIGMA * Math.pow(T, 3));
  return num / den;
}

// ───────────────────────────────────────────────────────────
//  Main surface-temperature routine (signature unchanged)
// ───────────────────────────────────────────────────────────
function dayNightTemperaturesModel({
  groundAlbedo,
  flux,
  rotationPeriodH,
  surfacePressureBar,
  composition = {},
  slabHeatCapacity = null,
  surfaceFractions = null,
  surfaceAlbedos = null,
  gSurface = 9.81,
  aerosolsSW = {},
  autoSlabOptions = null
}) {
  if (slabHeatCapacity == null) {
    slabHeatCapacity = autoSlabHeatCapacity(
      rotationPeriodH,
      surfacePressureBar,
      surfaceFractions,
      gSurface,
      undefined,
      undefined,
      autoSlabOptions
    );
  }

  const aSurf = surfaceAlbedoMix(groundAlbedo, surfaceFractions, surfaceAlbedos);

  const { albedo: A } = albedoAdditive({
    surfaceAlbedo: aSurf,
    pressureBar: surfacePressureBar,
    composition,
    gSurface,
    aerosolsSW
  });

  // IR greenhouse as before
  const T_eff  = effectiveTemp(A, flux);
  const { total: tauGHG } = opticalDepth(composition, surfacePressureBar, gSurface);
  const T_surf = T_eff * Math.pow(1 + 0.75 * tauGHG, 0.25);
  const dT     = diurnalAmplitude(A, flux, T_surf, slabHeatCapacity, rotationPeriodH);

  return {
    day   : T_surf + 0.5 * dT,
    night : T_surf - 0.5 * dT,
    mean  : T_surf,
    albedo: A,
    equilibriumTemperature: T_eff
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAtmosphericPressure,
    calculateEmissivity,
    airDensity,
    calculateDayNightTemperatureVariation,
    autoSlabHeatCapacity,
    effectiveTemp,
    opticalDepth,        // IR only
    opticalDepthSW,      // shortwave (new)
    cloudFraction,
    surfaceAlbedoMix,
    diurnalAmplitude,
    dayNightTemperaturesModel,
    calculateActualAlbedoPhysics, // updated
    DEFAULT_SURFACE_ALBEDO,
    albedoAdditive,      // exported for testing & future tuning
    cloudPropsOnly       // exported to avoid breaking callers that need cloud stats
  };
}
