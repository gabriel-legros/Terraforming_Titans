const fs = require('fs');
const path = require('path');
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
const { planetParameters } = require('../src/js/planet-parameters.js');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(`${effectCode}\n${spaceCode}; this.EffectableEntity = EffectableEntity; this.SpaceManager = SpaceManager;`, ctx);

describe('enablePlanet allows unlocking new planets', () => {
  test('Callisto starts disabled and can be enabled', () => {
    const manager = new ctx.SpaceManager(planetParameters);
    expect(manager.isPlanetEnabled('callisto')).toBe(false);
    manager.enablePlanet('callisto');
    expect(manager.isPlanetEnabled('callisto')).toBe(true);
  });
});
