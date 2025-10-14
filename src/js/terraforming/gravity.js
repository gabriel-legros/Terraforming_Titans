const GRAVITY_LINEAR_THRESHOLD = 10;
const GRAVITY_EXPONENTIAL_THRESHOLD = 20;
const GRAVITY_LINEAR_RATE = 0.1;
const GRAVITY_EXPONENTIAL_INTERVAL = 10;

function createNoGravityPenalty() {
  return { multiplier: 1, linearIncrease: 0, exponentialIncrease: 0 };
}

function calculateGravityCostPenalty(gravity) {
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
