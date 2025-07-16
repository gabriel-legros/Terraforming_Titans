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

// Calculate atmospheric emissivity directly from optical depth
function calculateEmissivity(composition, surfacePressureBar){
  const tau = opticalDepth(composition, surfacePressureBar);
  return 1 - Math.exp(-tau);
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
// Include Safe GHG (modeled after SF6) with a very high optical depth factor
const GAMMA = {           // absorption strength
  h2o : 84.0,
  co2 : 10.0,
  ch4 : 150.0,
  h2so4 : 50.0,           //  NEW  (approx. – tweak as you like)
  greenhousegas : 235000.0
};
const ALPHA = 1.0;
const BETA = 0.6;

const SAT_COEFF = {       // pressure-saturation scaling (bar-1)
  h2o  : 0.0,
  co2  : 0,
  ch4  : 4,
  h2so4: 0.1              //  NEW
};

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

function opticalDepth(comp, pBar) {
  let tau = 0;
  for (const gas in comp) {
    const x   = comp[gas];          // mixing ratio
    const key = gas.toLowerCase();
    const G   = GAMMA[key] ?? 0;    // absorption strength
    tau += G * Math.pow(x, ALPHA) * Math.pow(pBar, BETA);
  }
  return tau;
}

function opticalDepthSat(comp, pBar) {
  let tau = 0;
  for (const gas in comp) {
    const x   = comp[gas];          // mixing ratio
    const key = gas.toLowerCase();
    const G   = GAMMA[key] ?? 0;    // absorption strength
    const B   = SAT_COEFF[key] ?? 0;
    tau += G * Math.pow(x, ALPHA) * Math.pow(pBar, BETA) / (1 + B * pBar);
  }
  return tau;
}

function cloudFraction(pBar) {
  const cf = 1.0 - Math.exp(-pBar / 3.0);
  return Math.min(cf, 0.99);
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
  const tau = opticalDepth(composition, surfacePressureBar);
  const tauSat = opticalDepthSat(composition, surfacePressureBar);

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
    cloudFraction,
    surfaceAlbedoMix,
    diurnalAmplitude,
    dayNightTemperaturesModel,
    DEFAULT_SURFACE_ALBEDO
  };
}
