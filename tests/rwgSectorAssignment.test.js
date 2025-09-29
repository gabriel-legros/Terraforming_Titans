global.EffectableEntity = class {};

const { generateRandomPlanet } = require('../src/js/rwg.js');

describe('Random world generator sector assignment', () => {
  afterEach(() => {
    delete global.galaxyManager;
    delete global.spaceManager;
  });

  afterAll(() => {
    delete global.EffectableEntity;
  });

  test('assigns the default sector when no managers are available', () => {
    delete global.galaxyManager;
    delete global.spaceManager;
    const result = generateRandomPlanet(12345);
    expect(result?.merged?.celestialParameters?.sector).toBe('R5-07');
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

  test('honors a locked sector provided by the space manager', () => {
    global.spaceManager = {
      getRwgSectorLock: () => 'Core'
    };
    delete global.galaxyManager;
    const result = generateRandomPlanet(98765);
    expect(result?.merged?.celestialParameters?.sector).toBe('Core');
  });
});
