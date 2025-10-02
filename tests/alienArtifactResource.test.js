const { getPlanetParameters } = require('../src/js/planet-parameters.js');

describe('Alien artifact resource', () => {
  test('not unlocked by default', () => {
    const params = getPlanetParameters('mars');
    expect(params.resources.special.alienArtifact.unlocked).toBe(false);
  });
});
