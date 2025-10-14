const GRAVITY_LINEAR_THRESHOLD = 10;
const GRAVITY_EXPONENTIAL_THRESHOLD = 20;
const GRAVITY_LINEAR_RATE = 0.1;
const GRAVITY_EXPONENTIAL_INTERVAL = 10;

function createNoGravityPenalty() {
  return { multiplier: 1, linearIncrease: 0, exponentialIncrease: 0 };
}

function calculatePenaltyComponents(gravity) {
  if (!Number.isFinite(gravity)) {
    return createNoGravityPenalty();
  }

  const linearExcess = Math.max(0, gravity - GRAVITY_LINEAR_THRESHOLD);
  const linearIncrease = linearExcess * GRAVITY_LINEAR_RATE;

  let exponentialIncrease = 0;
  if (gravity > GRAVITY_EXPONENTIAL_THRESHOLD) {
    const exponent = (gravity - GRAVITY_EXPONENTIAL_THRESHOLD) / GRAVITY_EXPONENTIAL_INTERVAL;
    exponentialIncrease = Math.pow(2, exponent) - 1;
  }

  const multiplier = 1 + linearIncrease + exponentialIncrease;
  return { multiplier, linearIncrease, exponentialIncrease };
}

function calculateGravityCostPenalty(input) {
  if (Number.isFinite(input)) {
    return calculatePenaltyComponents(input);
  }

  const params = input || {};
  const gravity = Number.isFinite(params.gravity) ? params.gravity : null;
  if (!Number.isFinite(gravity)) {
    return createNoGravityPenalty();
  }

  const totalLand = Number.isFinite(params.totalLand) ? Math.max(params.totalLand, 0) : 0;
  const usedLand = Number.isFinite(params.usedLand) ? Math.max(params.usedLand, 0) : 0;
  const equatorialGravity = Number.isFinite(params.equatorialGravity)
    ? params.equatorialGravity
    : gravity;

  const surfacePenalty = calculatePenaltyComponents(gravity);

  if (!(totalLand > 0) || usedLand <= 0) {
    return equatorialGravity === gravity
      ? surfacePenalty
      : calculatePenaltyComponents(equatorialGravity);
  }

  const landFraction = Math.min(1, usedLand / totalLand);
  if (!(landFraction > 0)) {
    return equatorialGravity === gravity
      ? surfacePenalty
      : calculatePenaltyComponents(equatorialGravity);
  }

  const equatorialPortion = Math.min(landFraction, 0.25);
  const surfacePortion = Math.max(0, landFraction - 0.25);
  const usedPortion = equatorialPortion + surfacePortion;

  if (!(usedPortion > 0)) {
    return equatorialGravity === gravity
      ? surfacePenalty
      : calculatePenaltyComponents(equatorialGravity);
  }

  const equatorialPenalty = equatorialGravity === gravity
    ? surfacePenalty
    : calculatePenaltyComponents(equatorialGravity);

  const equatorialWeight = equatorialPortion / usedPortion;
  const surfaceWeight = surfacePortion / usedPortion;

  const linearIncrease =
    equatorialPenalty.linearIncrease * equatorialWeight +
    surfacePenalty.linearIncrease * surfaceWeight;
  const exponentialIncrease =
    equatorialPenalty.exponentialIncrease * equatorialWeight +
    surfacePenalty.exponentialIncrease * surfaceWeight;

  return {
    multiplier: 1 + linearIncrease + exponentialIncrease,
    linearIncrease,
    exponentialIncrease,
  };
}

function calculateApparentEquatorialGravity(params = {}) {
  const gravity = Number.isFinite(params.gravity) ? params.gravity : 0;
  const radiusKm = Number.isFinite(params.radius) ? params.radius : 0;
  const rotationHours = Number.isFinite(params.rotationPeriod) ? params.rotationPeriod : 0;

  if (!gravity || !radiusKm || !rotationHours) {
    return gravity;
  }

  const radiusMeters = radiusKm * 1000;
  const rotationSeconds = rotationHours * 3600;
  if (!rotationSeconds) {
    return gravity;
  }

  const angularVelocity = (2 * Math.PI) / rotationSeconds;
  const centrifugal = angularVelocity * angularVelocity * radiusMeters;
  return Math.max(0, gravity - centrifugal);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createNoGravityPenalty,
    calculateGravityCostPenalty,
    calculateApparentEquatorialGravity,
  };
} else if (typeof window !== 'undefined') {
  window.createNoGravityPenalty = createNoGravityPenalty;
  window.calculateGravityCostPenalty = calculateGravityCostPenalty;
  window.calculateApparentEquatorialGravity = calculateApparentEquatorialGravity;
}
