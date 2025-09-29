global.EffectableEntity = class {};

const { generateRandomPlanet } = require('../src/js/rwg.js');

describe('Random world generator sector assignment', () => {
  afterEach(() => {
    delete global.galaxyManager;
  });

  afterAll(() => {
    delete global.EffectableEntity;
  });

  test('assigns a deterministic fallback sector when galaxy manager is unavailable', () => {
    delete global.galaxyManager;
    const result = generateRandomPlanet(12345);
    expect(result?.merged?.celestialParameters?.sector).toBe('R4-10');
  });

  test('uses galaxy manager sector display names when available', () => {
    const stubSector = { getDisplayName: () => 'R2-03', q: 1, r: -1 };
    global.galaxyManager = {
      getSectors: () => [stubSector],
      radius: 6
    };
    const result = generateRandomPlanet(67890);
    expect(result?.merged?.celestialParameters?.sector).toBe('R2-03');
  });
});
