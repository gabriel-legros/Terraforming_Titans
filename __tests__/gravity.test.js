const {
  calculateApparentEquatorialGravity,
  calculateGravityCostPenalty,
  createNoGravityPenalty,
} = require('../src/js/terraforming/gravity.js');

describe('gravity helpers', () => {
  describe('calculateApparentEquatorialGravity', () => {
    it('subtracts centrifugal acceleration at the equator', () => {
      const params = {
        gravity: 9.81,
        radius: 6371,
        rotationPeriod: 24,
      };

      const apparent = calculateApparentEquatorialGravity(params);
      expect(apparent).toBeGreaterThan(0);
      expect(apparent).toBeLessThan(params.gravity);
    });

    it('falls back to provided gravity when missing data', () => {
      expect(calculateApparentEquatorialGravity({ gravity: 12 })).toBe(12);
      expect(calculateApparentEquatorialGravity({ gravity: 12, radius: 0, rotationPeriod: 10 })).toBe(12);
      expect(calculateApparentEquatorialGravity({})).toBe(0);
    });
  });

  describe('calculateGravityCostPenalty', () => {
    it('returns the no-penalty object for non-finite gravity', () => {
      expect(calculateGravityCostPenalty(NaN)).toEqual(createNoGravityPenalty());
    });

    it('applies both linear and exponential increases', () => {
      const penalty = calculateGravityCostPenalty(30);
      expect(penalty.multiplier).toBeGreaterThan(1);
      expect(penalty.exponentialIncrease).toBeGreaterThan(0);
    });

    it('weights equatorial and surface penalties by used land share', () => {
      const gravity = 30;
      const equatorialGravity = 26;
      const totalLand = 100;
      const usedLand = 30;

      const blended = calculateGravityCostPenalty({
        gravity,
        equatorialGravity,
        totalLand,
        usedLand,
      });

      const equatorialPenalty = calculateGravityCostPenalty(equatorialGravity);
      const surfacePenalty = calculateGravityCostPenalty(gravity);

      const equatorialShare = 0.25 / (usedLand / totalLand);
      const surfaceShare = (usedLand / totalLand - 0.25) / (usedLand / totalLand);

      const expectedMultiplier =
        equatorialShare * equatorialPenalty.multiplier +
        surfaceShare * surfacePenalty.multiplier;
      const expectedLinear =
        equatorialShare * equatorialPenalty.linearIncrease +
        surfaceShare * surfacePenalty.linearIncrease;
      const expectedExponential =
        equatorialShare * equatorialPenalty.exponentialIncrease +
        surfaceShare * surfacePenalty.exponentialIncrease;

      expect(blended.multiplier).toBeCloseTo(expectedMultiplier, 6);
      expect(blended.linearIncrease).toBeCloseTo(expectedLinear, 6);
      expect(blended.exponentialIncrease).toBeCloseTo(expectedExponential, 6);
    });

    it('falls back to the equatorial penalty when no land is in use', () => {
      const gravity = 30;
      const equatorialGravity = 26;
      const totalLand = 100;

      const penalty = calculateGravityCostPenalty({
        gravity,
        equatorialGravity,
        totalLand,
        usedLand: 0,
      });

      const equatorialPenalty = calculateGravityCostPenalty(equatorialGravity);
      expect(penalty).toEqual(equatorialPenalty);
    });
  });
});
