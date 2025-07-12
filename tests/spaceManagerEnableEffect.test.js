const fs = require('fs');
const path = require('path');
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
const { planetParameters } = require('../src/js/planet-parameters.js');

describe('enable effect on SpaceManager', () => {
  test('addAndReplace enables a planet', () => {
    const ctx = { console, planetParameters };
    vm.createContext(ctx);
    vm.runInContext(`${effectCode}\n${spaceCode}; this.EffectableEntity = EffectableEntity; this.SpaceManager = SpaceManager;`, ctx);
    ctx.spaceManager = new ctx.SpaceManager(planetParameters);
    expect(ctx.spaceManager.isPlanetEnabled('callisto')).toBe(false);
    ctx.spaceManager.addAndReplace({ type: 'enable', targetId: 'callisto', effectId: 't1', sourceId: 't1' });
    expect(ctx.spaceManager.isPlanetEnabled('callisto')).toBe(true);
  });
});
