const { planetParameters } = require('../src/js/planet-parameters.js');
const { generateRandomPlanet, RWG_TYPE_BASE_COLORS } = require('../src/js/rwg.js');

describe('Story planet base colors', () => {
  const expected = {
    mars: '#8a2a2a',
    titan: '#8a6a38',
    callisto: '#828a93',
    ganymede: '#786355',
    vega2: '#a87d4f',
    // Venus should reflect basaltic surface rock color, not atmospheric tint
    venus: '#7a6f5f',
  };

  Object.entries(expected).forEach(([key, color]) => {
    test(`${key} defines a base color`, () => {
      expect(planetParameters[key]).toBeDefined();
      expect(planetParameters[key].visualization).toBeDefined();
      expect(planetParameters[key].visualization.baseColor).toBe(color);
    });
  });
});

describe('Random world generator base colors', () => {
  Object.entries(RWG_TYPE_BASE_COLORS).forEach(([type, color], index) => {
    test(`type ${type} uses mapped base color`, () => {
      const seed = `color-${type}-${index}`;
      const { override } = generateRandomPlanet(seed, { type });
      expect(override.visualization).toBeDefined();
      expect(override.visualization.baseColor).toBe(color);
    });
  });
});
