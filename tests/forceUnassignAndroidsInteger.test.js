const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('forceUnassignAndroids ceiling enforcement', () => {
  test('unassigns the ceiling of the over-cap difference using an integer', () => {
    const ctx = { console, EffectableEntity };
    ctx.resources = {
      colony: {
        colonists: { value: 10, cap: 100 },
        workers: { value: 0, cap: 0 },
        androids: { value: 3, cap: 10 }
      }
    };

    const getAssignedAndroids = jest.fn();
    getAssignedAndroids.mockReturnValueOnce(5).mockReturnValue(3);
    const forceUnassignAndroids = jest.fn();
    ctx.projectManager = { getAssignedAndroids, forceUnassignAndroids };

    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'population.js'), 'utf8');
    vm.runInContext(code + '; this.PopulationModule = PopulationModule;', ctx);
    const module = new ctx.PopulationModule(ctx.resources, { workerRatio: 0.5 });

    module.updateWorkerCap();

    expect(forceUnassignAndroids).toHaveBeenCalledWith(2);
    const arg = forceUnassignAndroids.mock.calls[0][0];
    expect(Number.isInteger(arg)).toBe(true);
  });
});
