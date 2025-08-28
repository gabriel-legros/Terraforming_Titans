/**
 * Estimate surface radiation (mSv/day) on a body with no intrinsic magnetosphere,
 * given atmospheric/overburden column mass and distance inside a parent planet's belts.
 *
 * Sources included:
 *   • GCR (galactic cosmic rays)  → attenuated by column mass
 *   • Parent magnetosphere ("belt") → scaled with distance from parent, then attenuated
 *   • (Optional) average SEP term → attenuated; default 0 for quiet-Sun average
 *
 * @param {number} column_gcm2  Column mass above surface in g/cm² (e.g., Earth ~1030)
 * @param {number} distance_Rp  Distance from parent, in units of parent radii (e.g., R_J or R_S)
 * @param {number} parentBeltAtRef_mSvPerDay  Airless surface belt dose at refDistance_Rp (mSv/day)
 * @param {number} [refDistance_Rp=1]  Reference distance (same units as distance_Rp)
 * @param {object} [options]
 * @param {number} [options.gcrAirless=1.3]    Airless-surface GCR baseline (mSv/day)
 * @param {number} [options.L_gcr=150]         GCR attenuation length (g/cm²)
 * @param {number} [options.L_belt=30]         Belt-particle attenuation length (g/cm²)
 * @param {number} [options.sepAirless=0]      Average daily SEP term, airless (mSv/day)
 * @param {number} [options.L_sep=15]          SEP attenuation length (g/cm²)
 * @param {number} [options.beltFalloffExp=8]  Distance falloff exponent n for belts
 * @returns {{ total:number,
 *             components:{ gcr:number, belt:number, sep:number },
 *             meta:{ column_gcm2:number, beltAirlessAtDistance:number } }}
 */
function estimateSurfaceDoseByColumn(column_gcm2,
                                     distance_Rp,
                                     parentBeltAtRef_mSvPerDay,
                                     refDistance_Rp = 1,
                                     options = {}) {
  const {
    gcrAirless = 1.3,
    L_gcr = 150,
    L_belt = 30,
    sepAirless = 0,
    L_sep = 15,
    beltFalloffExp = 8, // tweak per system; see notes below
  } = options;

  const safe = (x) => Math.max(0, Number.isFinite(x) ? x : 0);
  const col = safe(column_gcm2);

  // Distance scaling for parent belts: K * (r / r_ref)^(-n)
  const r = Math.max(safe(distance_Rp), 1e-9);
  const rRef = Math.max(safe(refDistance_Rp), 1e-9);
  const beltAirlessAtDistance = safe(parentBeltAtRef_mSvPerDay) *
                                Math.pow(r / rRef, -beltFalloffExp);

  // Exponential attenuation by column mass: D = D0 * exp(-column / L)
  const atten = (D0, L) => safe(D0) * Math.exp(-col / Math.max(1e-9, L));

  const gcr  = atten(gcrAirless,            L_gcr);
  const belt = atten(beltAirlessAtDistance, L_belt);
  const sep  = atten(sepAirless,            L_sep);

  const total = gcr + belt + sep;
  return { total, components: { gcr, belt, sep },
           meta: { column_gcm2: col, beltAirlessAtDistance } };
}


// Support CommonJS environments (tests) while remaining browser friendly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { estimateSurfaceDoseByColumn, radiationPenalty };
}

/**
 * radiationPenalty
 * ----------------
 * Returns the fractional growth-rate penalty (0 → none, 1 → total arrest)
 * produced by a given daily radiation dose.
 *
 * Calibrated anchor points:
 *   – D = 0 mSv · day⁻¹   → P = 0.00   (no penalty)
 *   – D = 0.40 mSv · day⁻¹ → P ≈ 0.25  (Mars-level penalty)
 *   – D = 65 mSv · day⁻¹  → P ≈ 0.99  (Ganymede-level penalty)
 *
 * @param {number} dose_mSvDay  Radiation dose-rate in millisieverts per day
 * @returns {number}            Penalty fraction 0 ≤ P < 1
 */
function radiationPenalty(dose_mSvDay) {
  // Hill-function parameters
  const D0 = 1.07;  // “half-inhibition” dose, mSv·day⁻¹
  const a  = 1.12;  // curvature exponent

  const D = Math.max(dose_mSvDay, 1e-12);        // protect against zero / negatives
  return 1 / (1 + Math.pow(D0 / D, a));
}
