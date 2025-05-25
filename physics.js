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

function calculateEffectiveTemperatureNoAtm(modifiedSolarFlux, albedo, zoneRatio){
  // Constants
  const stefanBoltzmann = 5.670374419e-8; // Stefan-Boltzmann constant (W·m⁻²·K⁻⁴)

  // Calculate the effective temperature without atmosphere (Teff)
  const effectiveTempNoAtmosphere = Math.pow(
    (zoneRatio*modifiedSolarFlux * (1 - albedo)) / (stefanBoltzmann),
    0.25
  );
  
  return effectiveTempNoAtmosphere;
}

function calculateEffectiveTemperature(
  modifiedSolarFlux,
  albedo,
  emissivity,
  zoneRatio
) {
  const effectiveTempNoAtmosphere = calculateEffectiveTemperatureNoAtm(modifiedSolarFlux, albedo, zoneRatio);

  // Calculate the surface temperature with greenhouse effect (Tsurface)
  const multiplier = Math.pow(1 / (1 - emissivity / 2), 0.25);
  const surfaceTemperature = effectiveTempNoAtmosphere * multiplier;

  return surfaceTemperature
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
const GAMMA = { h2o: 90.0, co2: 10.0, ch4: 150.0, greenhousegas: 235000.0 };
const ALPHA = 1.0;
const BETA = 0.6;

const DEFAULT_SURFACE_ALBEDO = {
  ocean: 0.06,
  ice: 0.65,
  snow: 0.85,
  co2_ice: 0.50,
  hydrocarbon: 0.10
};

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
    const x = comp[gas];
    const g = gas.toLowerCase();
    tau += (GAMMA[g] || 0) * Math.pow(x, ALPHA) * Math.pow(pBar, BETA);
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
  const rockFrac = 1.0 - Object.values(fractions).reduce((a, b) => a + b, 0);
  if (rockFrac < 0) return rockAlb;
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
    slabHeatCapacity = autoSlabHeatCapacity(rotationPeriodH, surfacePressureBar, surfaceFractions, gSurface);
  }
  const aSurf = surfaceAlbedoMix(groundAlbedo, surfaceFractions, surfaceAlbedos);
  const cf = cloudFraction(surfacePressureBar);
  const aCloud = 0.55 + 0.20 * Math.tanh(surfacePressureBar / 5.0);
  const A = (1 - cf) * aSurf + cf * aCloud;

  const TEff = effectiveTemp(A, flux);
  const tau = opticalDepth(composition, surfacePressureBar);
  const TSurf = TEff * Math.pow(1 + 0.75 * tau, 0.25);

  const dT = diurnalAmplitude(A, flux, TSurf, slabHeatCapacity, rotationPeriodH);
  return { day: TSurf + 0.5 * dT, night: TSurf - 0.5 * dT, mean: TSurf };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAtmosphericPressure,
    calculateEmissivity,
    calculateEffectiveTemperatureNoAtm,
    calculateEffectiveTemperature,
    airDensity,
    calculateDayNightTemperatureVariation,
    autoSlabHeatCapacity,
    effectiveTemp,
    opticalDepth,
    cloudFraction,
    surfaceAlbedoMix,
    diurnalAmplitude,
    dayNightTemperaturesModel
  };
}
