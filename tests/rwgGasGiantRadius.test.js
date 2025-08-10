const { generateRandomPlanet } = require('../src/js/rwg.js');

describe('Random World Generator Gas Giant radius', () => {
  test('moons include parent body radius', () => {
    const { override } = generateRandomPlanet('seed-gg-radius', { isMoon: true });
    const parent = override.celestialParameters.parentBody;
    expect(parent).toBeDefined();
    expect(typeof parent.radius).toBe('number');
    expect(Number.isNaN(parent.radius)).toBe(false);
  });
});
