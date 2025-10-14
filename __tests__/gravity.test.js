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
  });
});
