const isNodeChem = typeof module !== 'undefined' && module.exports;

const METHANE_COMBUSTION_PARAMETER = 1e-15; // Rate coefficient for CH4/O2 combustion
const OXYGEN_COMBUSTION_THRESHOLD = 12000; // 12 kPa - minimum oxygen pressure for combustion
const METHANE_COMBUSTION_THRESHOLD = 100; // 0.1 kPa - minimum methane pressure for combustion
const CALCITE_HALF_LIFE_SECONDS = 240; // Calcite aerosol half-life
const CALCITE_DECAY_CONSTANT = Math.log(2) / CALCITE_HALF_LIFE_SECONDS;
const SULFURIC_ACID_RAIN_THRESHOLD_K = 570;
const SULFURIC_ACID_REFERENCE_TEMPERATURE_K = 300;
const SULFURIC_ACID_REFERENCE_DECAY_CONSTANT = Math.log(2) / 300;

// ------------------------------
// Physically-motivated H escape
// (Jeans escape at the exobase)
// ------------------------------

// --- physical constants ---
const KB = 1.380649e-23;       // Boltzmann constant [J/K]
const M_H = 1.6735575e-27;     // mass of atomic hydrogen [kg]

// --- model knobs (tuneable, but physically interpretable) ---
// Exosphere temperature model: solarFlux -> T_exo (K).
// Earth-calibrated relationship from satellite orbital decay studies.
// T∞ = T0 * (1 - exp(-ν * F10.7))
const EXO_TEMP_T0 = 1437;           // K, best-fit asymptotic temperature
const EXO_TEMP_NU = 9.57e-7;        // Jy^-1, best-fit coefficient
const SOLAR_FLUX_EARTH = 1361;      // W/m^2, solar constant at 1 AU
const F10_7_AT_1AU = 1_500_000;           // Jy, typical solar 10.7 cm radio flux at 1 AU (solar flux units)

// When λ is large, exp(-λ) is so tiny that escape is effectively zero.
// This cutoff makes it *exactly* zero (your requirement).
const JEANS_LAMBDA_CUTOFF = 50;

// Effective collision cross-sections (order-of-magnitude; used to place exobase).
// You can tweak by factors of ~2–5 without breaking the model.
const SIGMA_H  = 2e-19;  // [m^2]
const SIGMA_H2 = 3e-19;  // [m^2]

// Keep your existing photodissociation logic (optional, but reasonable):
const HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX = 500;
const HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION = 0.6;

// Optional diffusion-limit cap (important if H is a trace gas in a heavy atmosphere).
// Φ_DL ≈ C * f_T(H). For Earth C≈2.5e13 cm^-2 s^-1 = 2.5e17 m^-2 s^-1. 
const DIFFUSION_LIMIT_C_EARTH = 2.5e17; // [H atoms m^-2 s^-1]

// --- temperature proxy ---
// Earth-calibrated exosphere temperature from solar flux
// Uses the relationship: T∞ = T0 * (1 - exp(-ν * F10.7))
// where F10.7 is scaled from the input solar flux
function estimateExosphereTemperatureK(solarFlux){
  const S = Math.max(0, solarFlux);
  
  // Scale factor relative to Earth's solar flux
  const f = S / SOLAR_FLUX_EARTH;
  
  // Convert to local F10.7 equivalent (in Jy)
  const F10_7_local = f * F10_7_AT_1AU;
  
  // Apply the empirical relationship
  const T_exo = EXO_TEMP_T0 * (1 - Math.exp(-EXO_TEMP_NU * F10_7_local));
  
  return T_exo;
}

// Jeans escape mass loss for a single species (H or H2) in kg/s.
function jeansEscapeKgPerSecond(params) {
  const { massKg, particleMassKg: m, sigmaM2: sigma, temperatureK: T, gSurface: g0, surfaceAreaM2: A } = params;
  if (massKg <= 0 || T <= 0 || g0 <= 0 || A <= 0 || sigma <= 0 || m <= 0) return 0;

  // Planet radius from surface area (sphere)
  const R = Math.sqrt(A / (4 * Math.PI));

  // Column number density Ncol = particles per m^2
  const Ncol = massKg / (A * m);

  // Isothermal scale height (using T_exo as a single effective upper-atmosphere temperature)
  const H0 = (KB * T) / (m * g0);
  if (!(H0 > 0)) return 0;

  // If hydrostatic & isothermal: Ncol = n0 * H0  => n0 = Ncol/H0
  const n0 = Ncol / H0;

  // Exobase condition: mean free path ℓ = 1/(nσ) equals scale height H.
  // => n_exo = 1/(σ H). 
  //
  // If the column is too thin (Ncol*sigma <= 1), you effectively have no collisional region;
  // treat the exobase as "at the surface" (z=0) with n_exo ≈ n0.
  let zExo = 0;
  let rExo = R;
  let gExo = g0;
  let HExo = H0;
  let nExo = n0;

  if (Ncol * sigma > 1) {
    // For isothermal n(z)=n0 exp(-z/H0), solve n(z_exo)=1/(σH) => z_exo = H0 ln(Ncol*sigma)
    zExo = H0 * Math.log(Ncol * sigma);
    rExo = R + zExo;
    gExo = g0 * Math.pow(R / rExo, 2);      // gravity drop with altitude
    HExo = (KB * T) / (m * gExo);
    nExo = 1 / (sigma * HExo);
  }

  // Jeans parameter λ = (gravitational energy)/(thermal energy) at exobase. 
  const lambda = (m * gExo * rExo) / (KB * T);
  if (lambda > JEANS_LAMBDA_CUTOFF) return 0; // exactly zero in the "cold enough" regime

  // Jeans escape flux (particles m^-2 s^-1):
  // Φ_J = n_exo * sqrt(kT/(2πm)) * (1+λ) * exp(-λ) 
  const thermalPrefactor = Math.sqrt((KB * T) / (2 * Math.PI * m));
  const flux = nExo * thermalPrefactor * (1 + lambda) * Math.exp(-lambda);

  // Global escape rate:
  const numberPerSecond = flux * 4 * Math.PI * rExo * rExo;
  return numberPerSecond * m; // kg/s
}

// Main helper: returns tons lost during dt.
function computeHydrogenEscapeTons(params) {
  const { dtSeconds, hydrogenTons, gravity, solarFlux, surfaceArea: A, totalPressurePa } = params;
  if (dtSeconds <= 0 || hydrogenTons <= 0 || gravity <= 0 || A <= 0) return 0;

  const TExo = estimateExosphereTemperatureK(solarFlux);

  // Photodissociation split (keep your existing idea)
  const F = Math.max(0, solarFlux);
  const fluxRatio = F > 0 ? F / (F + HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX) : 0;
  const atomicFraction = Math.min(1, fluxRatio * HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION);
  const molecularFraction = Math.max(0, 1 - atomicFraction);

  const totalKg = hydrogenTons * KG_PER_TON;
  const atomicKg = totalKg * atomicFraction;       // H
  const molecularKg = totalKg * molecularFraction; // H2 (mass is still hydrogen mass)

  // Jeans escape
  const atomicLossKgPerSec = jeansEscapeKgPerSecond({
    massKg: atomicKg,
    particleMassKg: M_H,
    sigmaM2: SIGMA_H,
    temperatureK: TExo,
    gSurface: gravity,
    surfaceAreaM2: A,
  });

  const molecularLossKgPerSec = jeansEscapeKgPerSecond({
    massKg: molecularKg,
    particleMassKg: 2 * M_H,
    sigmaM2: SIGMA_H2,
    temperatureK: TExo,
    gSurface: gravity,
    surfaceAreaM2: A,
  });

  let totalLossKgPerSec = atomicLossKgPerSec + molecularLossKgPerSec;

  // Optional diffusion-limited cap (useful when H/H2 is not the bulk atmosphere).
  // Φ_DL ≈ C * f_T(H), where f_T(H) = f_H + 2 f_H2 ... 
  // We approximate mixing ratios using partial pressure fractions (ideal gas).
  if (totalPressurePa !== undefined && totalPressurePa > 0) {
    const pAtomic = (atomicKg * gravity) / A;
    const pMolecular = (molecularKg * gravity) / A;

    const fH  = pAtomic / totalPressurePa;
    const fH2 = pMolecular / totalPressurePa;
    const fTotalH = fH + 2 * fH2;

    const diffusionFluxHAtoms = DIFFUSION_LIMIT_C_EARTH * Math.max(0, fTotalH);
    const diffusionLimitKgPerSec = diffusionFluxHAtoms * A * M_H;

    totalLossKgPerSec = Math.min(totalLossKgPerSec, diffusionLimitKgPerSec);
  }

  const lossTons = (totalLossKgPerSec / KG_PER_TON) * dtSeconds;
  return Math.min(hydrogenTons, Math.max(0, lossTons));
}

function runAtmosphericChemistry(resources, params = {}) {
  const {
    globalOxygenPressurePa = 0,
    globalMethanePressurePa = 0,
    availableGlobalMethaneGas = 0,
    availableGlobalOxygenGas = 0,
    realSeconds = 0,
    durationSeconds = 0,
    surfaceArea = 1,
    surfaceTemperatureK = SULFURIC_ACID_RAIN_THRESHOLD_K,
    gravity = 0,
    solarFlux = 0,
    atmosphericPressurePa = 0
  } = params;

  let combustionMethaneAmount = 0;
  let combustionOxygenAmount = 0;
  let combustionWaterAmount = 0;
  let combustionCO2Amount = 0;

  if (
    globalOxygenPressurePa > OXYGEN_COMBUSTION_THRESHOLD &&
    globalMethanePressurePa > METHANE_COMBUSTION_THRESHOLD
  ) {
    const rate =
      METHANE_COMBUSTION_PARAMETER *
      (globalOxygenPressurePa - OXYGEN_COMBUSTION_THRESHOLD) *
      (globalMethanePressurePa - METHANE_COMBUSTION_THRESHOLD) *
      surfaceArea;

    combustionMethaneAmount = Math.min(
      rate * durationSeconds,
      availableGlobalMethaneGas,
      availableGlobalOxygenGas / 4
    );
    combustionOxygenAmount = combustionMethaneAmount * 4;
    combustionWaterAmount = combustionMethaneAmount * 2.25;
    combustionCO2Amount = combustionMethaneAmount * 2.75;
  }

  let calciteDecayAmount = 0;
  const currentCalcite = resources?.atmospheric?.calciteAerosol?.value || 0;
  if (realSeconds > 0 && currentCalcite > 0) {
    calciteDecayAmount =
      currentCalcite * (1 - Math.exp(-CALCITE_DECAY_CONSTANT * realSeconds));
  }

  let sulfuricAcidDecayAmount = 0;
  const currentSulfuricAcid = resources?.atmospheric?.sulfuricAcid?.value || 0;
  if (realSeconds > 0 && currentSulfuricAcid > 0 && surfaceTemperatureK < SULFURIC_ACID_RAIN_THRESHOLD_K) {
    const clampedTemperature = Math.max(
      SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
      surfaceTemperatureK
    );
    const temperatureFraction =
      (SULFURIC_ACID_RAIN_THRESHOLD_K - clampedTemperature) /
      (SULFURIC_ACID_RAIN_THRESHOLD_K - SULFURIC_ACID_REFERENCE_TEMPERATURE_K);
    const decayConstant = SULFURIC_ACID_REFERENCE_DECAY_CONSTANT * temperatureFraction;
    if (decayConstant > 0) {
      sulfuricAcidDecayAmount =
        currentSulfuricAcid * (1 - Math.exp(-decayConstant * realSeconds));
    }
  }

  let hydrogenDecayAmount = 0;
  const currentHydrogen = resources?.atmospheric?.hydrogen?.value || 0;

  if (realSeconds > 0 && currentHydrogen > 0) {
    hydrogenDecayAmount = computeHydrogenEscapeTons({
      dtSeconds: realSeconds*86400,
      hydrogenTons: currentHydrogen,
      gravity:gravity,              // m/s^2
      solarFlux:solarFlux,            // your heating proxy
      surfaceArea:surfaceArea,        // you said you can compute this easily
      atmosphericPressurePa:atmosphericPressurePa,    // OPTIONAL: pass if you want diffusion-limit behavior
    });
  }

  const methaneRate = durationSeconds > 0 ? (combustionMethaneAmount / durationSeconds) * 86400 : 0;
  const oxygenRate = durationSeconds > 0 ? (combustionOxygenAmount / durationSeconds) * 86400 : 0;
  const waterRate = durationSeconds > 0 ? (combustionWaterAmount / durationSeconds) * 86400 : 0;
  const co2Rate = durationSeconds > 0 ? (combustionCO2Amount / durationSeconds) * 86400 : 0;
  const calciteRate = realSeconds > 0 ? calciteDecayAmount / realSeconds : 0;
  const acidRainRate = realSeconds > 0 ? sulfuricAcidDecayAmount / realSeconds : 0;
  const hydrogenRate = realSeconds > 0 ? hydrogenDecayAmount / realSeconds : 0;

  const rateType = 'terraforming';
  resources?.atmospheric?.atmosphericWater?.modifyRate?.(
    waterRate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.carbonDioxide?.modifyRate?.(
    co2Rate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.atmosphericMethane?.modifyRate?.(
    -methaneRate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.oxygen?.modifyRate?.(
    -oxygenRate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.calciteAerosol?.modifyRate?.(
    -calciteRate,
    'Calcite Decay',
    rateType
  );
  resources?.atmospheric?.sulfuricAcid?.modifyRate?.(
    -acidRainRate,
    'Acid rain',
    rateType
  );
  resources?.atmospheric?.hydrogen?.modifyRate?.(
    -hydrogenRate,
    'Hydrogen Escape',
    rateType
  );

  return {
    changes: {
      atmosphericMethane: -combustionMethaneAmount,
      oxygen: -combustionOxygenAmount,
      atmosphericWater: combustionWaterAmount,
      carbonDioxide: combustionCO2Amount,
      calciteAerosol: -calciteDecayAmount,
      sulfuricAcid: -sulfuricAcidDecayAmount,
      hydrogen: -hydrogenDecayAmount,
    },
    rates: {
      methane: methaneRate,
      oxygen: oxygenRate,
      water: waterRate,
      co2: co2Rate,
      calcite: calciteRate,
      acidRain: acidRainRate,
      hydrogen: hydrogenRate,
    },
  };
}

if (isNodeChem) {
  module.exports = {
    runAtmosphericChemistry,
    METHANE_COMBUSTION_PARAMETER,
    OXYGEN_COMBUSTION_THRESHOLD,
    METHANE_COMBUSTION_THRESHOLD,
    CALCITE_HALF_LIFE_SECONDS,
    SULFURIC_ACID_RAIN_THRESHOLD_K,
    SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
    SULFURIC_ACID_REFERENCE_DECAY_CONSTANT,
    HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX,
    HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION,
    computeHydrogenEscapeTons,
  };
} else {
  globalThis.runAtmosphericChemistry = runAtmosphericChemistry;
  globalThis.METHANE_COMBUSTION_PARAMETER = METHANE_COMBUSTION_PARAMETER;
  globalThis.OXYGEN_COMBUSTION_THRESHOLD = OXYGEN_COMBUSTION_THRESHOLD;
  globalThis.METHANE_COMBUSTION_THRESHOLD = METHANE_COMBUSTION_THRESHOLD;
  globalThis.CALCITE_HALF_LIFE_SECONDS = CALCITE_HALF_LIFE_SECONDS;
  globalThis.SULFURIC_ACID_RAIN_THRESHOLD_K = SULFURIC_ACID_RAIN_THRESHOLD_K;
  globalThis.SULFURIC_ACID_REFERENCE_TEMPERATURE_K = SULFURIC_ACID_REFERENCE_TEMPERATURE_K;
  globalThis.SULFURIC_ACID_REFERENCE_DECAY_CONSTANT = SULFURIC_ACID_REFERENCE_DECAY_CONSTANT;
  globalThis.HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX = HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX;
  globalThis.HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION = HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION;
  globalThis.computeHydrogenEscapeTons = computeHydrogenEscapeTons;
}

