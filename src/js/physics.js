const R_AIR = 287;
  function calculateAtmosphericPressure(mass, gravity, radius) {
    // Check for valid input values
    if (mass < 0) {
        throw new Error("Mass must be a positive number.");
    }
    if (gravity <= 0) {
        throw new Error("Gravity must be a positive number.");
    }
    if (radius <= 0) {
        throw new Error("Radius must be a positive number.");
    }

    // Calculate the surface area of the planet (A = 4 * π * R^2)
    const surfaceArea = 4 * Math.PI * Math.pow(radius*1e3, 2);

    // Calculate the atmospheric pressure (P = (m * g) / A)
    const pressure = (1e3*mass * gravity) / surfaceArea;

    // Return the pressure in Pascals (Pa)
    return pressure;
}

// Calculate atmospheric emissivity directly from saturated optical depth
function calculateEmissivity(composition, surfacePressureBar, gSurface){
  const { total: tau, contributions } = opticalDepthSat(composition, surfacePressureBar, gSurface);
  return {
    emissivity: 1 - Math.exp(-tau),
    tau,
    contributions
  };
}
// Function to calculate air density (rho_a)
function airDensity(atmPressure, T) {
    // atmPressure: Atmospheric pressure in Pa
    // T: Temperature in Kelvin (K)
    return atmPressure / (R_AIR * T); // kg/m³
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

// ─── Replace/add near your existing constants ─────────────────────────────
const COLUMN_MASS_REF = 5.0e4;   // μ0 in kg/m² (reference column for scaling)
const ALPHA = 1.0;               // keep
const BETA  = 0.55;              // was 0.6 in old pressure law

// Keep original strengths EXCEPT water (we tune only H2O)
const GAMMA = {
  h2o           : 10.0,     // tuned so Earth ≈ 288 K
  co2           : 10.0,
  ch4           : 150.0,
  h2so4         : 50.0,
  greenhousegas : 235000.0
};

// Saturation only for CH4 (and H2SO4 if you like)
const MU_SAT = { ch4: 50.0, h2so4: 2000.0 }; // kg/m²
const SAT_EXP = { ch4: 1.0, h2so4: 1.0 };    // exponent n_i

/*  Each entry describes how *that* condensate behaves.
      refMix  – mixing ratio (mass fraction) that saturates availability (=1)
      cfMax   – maximum cloud-fraction achievable
      pScale  – pressure scale (bar) for cloud build-up
      aBase   – core albedo of an optically thick deck
      aVar    – extra brightening with pressure          */
const CLOUD_SPEC = {
  h2o  : {                         
    refMix : 0.01,
    cfMax  : 0.50,
    pScale : 0.8,
    aBase  : 0.60,
    aVar   : 0.18
  },
  ch4  : { refMix: 0.02,  cfMax: 0.10, pScale: 2.0, aBase: 0.60, aVar: 0.10 },
  h2so4: { refMix: 1e-4,  cfMax: 0.99, pScale: 5.0, aBase: 0.75, aVar: 0.05 }
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

// ───────────────────────────────────────────────────────────
//  Cloud & haze properties from composition + pressure + τ
// ───────────────────────────────────────────────────────────
function cloudAndHazeProps (pBar, tau, comp = {}) {

  let cfTot = 0;      // summed cloud-fraction
  let aCloudWeighted = 0;

  // --- blend all condensables --------------------------------
  for (const gas in CLOUD_SPEC) {
    const spec = CLOUD_SPEC[gas];
    const mix  = comp[gas] || 0;           // mass fraction

    if (mix <= 0) continue;                // nothing of this gas

    const availability = Math.min(1, mix / spec.refMix);

    const cf = spec.cfMax *
               (1 - Math.exp(-pBar / spec.pScale)) *
               availability;               // cloud cover from this gas

    const aGas = spec.aBase +
                 spec.aVar * Math.tanh(pBar / (2 * spec.pScale));

    aCloudWeighted += cf * aGas;
    cfTot          += cf;
  }

  // normalise albedo if any clouds at all
  const aCloud = cfTot > 0 ? aCloudWeighted / cfTot : 0;

  // --- photochemical haze (depends mainly on τ) --------------
  const cfHaze = Math.min(0.90, tau / 2.0);                // saturates by τ≈5
  const aHaze  = 0.02 + 0.23 * (1 - Math.exp(-tau / 3.0)); // ≈0.25 at τ≈5

  return { cfCloud: Math.min(0.99, cfTot), aCloud, cfHaze, aHaze };
}

function autoSlabHeatCapacity(rotationPeriodH, surfacePressureBar, surfaceFractions, g = 9.81, kappaSoil = 7e-7, rhoCSoil = 1.4e6) {
  const f = surfaceFractions || {};
  const fOcean = f.ocean || 0.0;
  const fIce = f.ice || 0.0;
  const fOther = 1.0 - fOcean - fIce;

  const hSoil = Math.sqrt(kappaSoil * rotationPeriodH * 3600 / Math.PI);
  const CSoil = rhoCSoil * hSoil;
  const COcean = 4.2e6 * 50.0;
  const CIce = 1.9e6 * 0.05;

  const cpAir = 850.0;
  const CAtm = cpAir * (surfacePressureBar * 1e5) / g;

  return fOther * CSoil + fOcean * COcean + fIce * CIce + CAtm;
}

function effectiveTemp(albedo, flux) {
  return Math.pow((1 - albedo) * flux / (4 * SIGMA), 0.25);
}

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
    const tau_i = G * Math.pow(R, BETA);
    total += tau_i;
    contributions[k] = tau_i;
  }
  return { total, contributions };
}

function opticalDepthSat(comp, pBar, gSurface) {
  const pPa   = pBar * 1e5;
  const mcolT = pPa / gSurface;
  let total = 0;
  const contributions = {};

  for (const key in comp) {
    const x = comp[key] ?? comp[key.toLowerCase()] ?? 0;
    if (x <= 0) continue;

    const k = key.toLowerCase();
    const G = GAMMA[k] ?? 0;
    if (!G) continue;

    const mu_i = x * mcolT;
    const R    = mu_i / COLUMN_MASS_REF;

    let tau_i = G * Math.pow(R, BETA);
    if (MU_SAT[k]) {
      const n = SAT_EXP[k] ?? 1.0;
      tau_i /= (1 + Math.pow(mu_i / MU_SAT[k], n)); // saturation only for CH4/H2SO4
    }
    total += tau_i;
    contributions[k] = tau_i;
  }
  return { total, contributions };
}

function cloudFraction(pBar) {
  const cf = 1.0 - Math.exp(-pBar / 3.0);
  return Math.min(cf, 0.99);
}

// Calculate actual (Bond) albedo and cloud/haze fractions
function calculateActualAlbedoPhysics(surfaceAlbedo, pressureBar, composition = {}, gSurface) {
  const { total: tau } = opticalDepth(composition, pressureBar, gSurface);
  const { cfCloud, aCloud, cfHaze, aHaze } =
        cloudAndHazeProps(pressureBar, tau, composition);
  const A_noCloud = (1 - cfHaze) * surfaceAlbedo + cfHaze * aHaze;
  const A         = (1 - cfCloud) * A_noCloud + cfCloud * aCloud;
  return { albedo: A, cfCloud, cfHaze };
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
  gSurface = 9.81
}) {
  if (slabHeatCapacity === null) {
    slabHeatCapacity = autoSlabHeatCapacity(
      rotationPeriodH, surfacePressureBar, surfaceFractions, gSurface);
  }

  const aSurf = surfaceAlbedoMix(groundAlbedo, surfaceFractions, surfaceAlbedos);

  // greenhouse optical depth
  const { total: tau } = opticalDepth(composition, surfacePressureBar, gSurface);
  const { total: tauSat } = opticalDepthSat(composition, surfacePressureBar, gSurface);

  // NEW: smoothly blended clouds + haze
  const { cfCloud, aCloud, cfHaze, aHaze } =
        cloudAndHazeProps(surfacePressureBar, tau, composition);

  // Bond albedo
  const A_noCloud = (1 - cfHaze) * aSurf + cfHaze * aHaze;
  const A         = (1 - cfCloud) * A_noCloud + cfCloud * aCloud;

  // Temperatures
  const T_eff  = effectiveTemp(A, flux);
  const T_surf = T_eff * Math.pow(1 + 0.75 * tauSat, 0.25);

  const dT = diurnalAmplitude(A, flux, T_surf, slabHeatCapacity, rotationPeriodH);

  return {
    day   : T_surf + 0.5 * dT,
    night : T_surf - 0.5 * dT,
    mean  : T_surf,
    albedo: A,
    equilibriumTemperature: T_eff,
    cfCloud, cfHaze          // diagnostics if you want them
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
    opticalDepth,
    opticalDepthSat,
    cloudFraction,
    surfaceAlbedoMix,
    diurnalAmplitude,
    dayNightTemperaturesModel,
    calculateActualAlbedoPhysics,
    DEFAULT_SURFACE_ALBEDO
  };
}
