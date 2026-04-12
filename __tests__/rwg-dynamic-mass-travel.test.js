const { createGameDom, advanceTicks } = require('./helpers/jsdom-game-harness');

describe('RWG dynamic mass travel', () => {
  jest.setTimeout(120000);

  it('keeps the generated planetary mass ledger instead of inheriting Mars defaults', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      window.spaceManager.setRwgLock('mars', true);
      window.eval('rwgManager.enableDynamicMass = true;');

      const seed = '576149816|planet|chthonian|hz-inner';
      const result = window.generateRandomPlanet(seed);
      window.applyDynamicMassSelection(result, true);

      const generatedMassKg = result.merged.celestialParameters.baseMass;
      expect(generatedMassKg).toBeGreaterThan(1e26);
      expect(result.merged.celestialParameters.basePlanetaryMass).toBeNull();

      const travelled = window.spaceManager.travelToRandomWorld(result, seed);
      expect(travelled).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 50));
      advanceTicks(window, 2, 10);

      const currentCelestial = window.currentPlanetParameters.celestialParameters;
      const planetaryMassTons = window.resources.underground.planetaryMass.value;

      expect(currentCelestial.baseMass).toBe(generatedMassKg);
      expect(currentCelestial.basePlanetaryMass).toBeGreaterThan(generatedMassKg * 0.99);
      expect(currentCelestial.mass).toBeGreaterThan(generatedMassKg * 0.99);
      expect(planetaryMassTons).toBeGreaterThan((generatedMassKg / 1000) * 0.99);
      expect(planetaryMassTons).toBeGreaterThan(1e23);
    } finally {
      dom.window.close();
    }
  });
});
