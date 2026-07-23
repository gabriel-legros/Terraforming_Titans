const GRAVITY_PENALTY_PARAMETERS = terraformingParameters.gameplay.gravityPenalty;
const GRAVITY_LINEAR_THRESHOLD = GRAVITY_PENALTY_PARAMETERS.linearThresholdMS2;
const GRAVITY_EXPONENTIAL_THRESHOLD = GRAVITY_PENALTY_PARAMETERS.exponentialThresholdMS2;
const GRAVITY_LINEAR_RATE = GRAVITY_PENALTY_PARAMETERS.linearRatePerMS2;
const GRAVITY_EXPONENTIAL_INTERVAL = GRAVITY_PENALTY_PARAMETERS.exponentialDoublingIntervalMS2;
const GRAVITY_COST_MULTIPLIER_CAP = GRAVITY_PENALTY_PARAMETERS.maximumCostMultiplier;

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

  const multiplier = Math.min(
    GRAVITY_COST_MULTIPLIER_CAP,
    1 + linearIncrease + exponentialIncrease
  );
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

  const equatorialGravity = Number.isFinite(params.equatorialGravity)
    ? params.equatorialGravity
    : gravity;

  const surfacePenalty = calculatePenaltyComponents(gravity);

  const equatorialPenalty = equatorialGravity === gravity
    ? surfacePenalty
    : calculatePenaltyComponents(equatorialGravity);

  // Assume full land development: 25% equatorial + 75% full surface.
  const equatorialWeight = GRAVITY_PENALTY_PARAMETERS.equatorialWeight;
  const surfaceWeight = GRAVITY_PENALTY_PARAMETERS.surfaceWeight;

  const linearIncrease =
    equatorialPenalty.linearIncrease * equatorialWeight +
    surfacePenalty.linearIncrease * surfaceWeight;
  const exponentialIncrease =
    equatorialPenalty.exponentialIncrease * equatorialWeight +
    surfacePenalty.exponentialIncrease * surfaceWeight;

  return {
    multiplier: Math.min(
      GRAVITY_COST_MULTIPLIER_CAP,
      1 + linearIncrease + exponentialIncrease
    ),
    linearIncrease,
    exponentialIncrease,
  };
}

function calculateApparentEquatorialGravity(params = {}) {
  const gravity = Number.isFinite(params.gravity) ? params.gravity : 0;
  const radiusKm = Number.isFinite(params.radius) ? params.radius : 0;
  // Use spinPeriod for gravity calculations (physical rotation affecting centrifugal force)
  // Fall back to rotationPeriod for backward compatibility
  const spinHours = Number.isFinite(params.spinPeriod)
    ? params.spinPeriod
    : (Number.isFinite(params.rotationPeriod) ? params.rotationPeriod : 0);

  if (!gravity || !radiusKm || !spinHours) {
    return gravity;
  }

  const radiusMeters = radiusKm * 1000;
  const spinSeconds = spinHours * 3600;
  if (!spinSeconds) {
    return gravity;
  }

  const angularVelocity = (2 * Math.PI) / spinSeconds;
  const centrifugal = angularVelocity * angularVelocity * radiusMeters;
  return Math.max(0, gravity - centrifugal);
}
