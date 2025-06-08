const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getPlanetParameters } = require('../planet-parameters.js');
const EffectableEntity = require('../effectable-entity.js');

describe('createResources assigns names correctly', () => {
  test('resource name equals key and display name equals definition name', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'resource.js'), 'utf8');
    const ctx = { EffectableEntity, console };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);

    const params = getPlanetParameters('mars');
    const original = JSON.parse(JSON.stringify(params.resources));
    const resources = ctx.createResources(params.resources);

    for (const category in original) {
      for (const key in original[category]) {
        const def = original[category][key];
        expect(resources[category][key].name).toBe(key);
        expect(resources[category][key].displayName).toBe(def.name);
      }
    }
  });
});
