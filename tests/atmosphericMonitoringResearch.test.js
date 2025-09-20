const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Atmospheric Monitoring research', () => {
  test('adds flag to carbon, nitrogen, and hydrogen mining projects', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const colonization = ctx.researchParameters.colonization;
    const research = colonization.find(r => r.id === 'atmospheric_monitoring');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(1000000000);
    const carbonFlag = research.effects.find(e =>
      e.target === 'project' &&
      e.targetId === 'carbonSpaceMining' &&
      e.type === 'booleanFlag' &&
      e.flagId === 'atmosphericMonitoring' &&
      e.value === true
    );
    const nitrogenFlag = research.effects.find(e =>
      e.target === 'project' &&
      e.targetId === 'nitrogenSpaceMining' &&
      e.type === 'booleanFlag' &&
      e.flagId === 'atmosphericMonitoring' &&
      e.value === true
    );
    const hydrogenFlag = research.effects.find(e =>
      e.target === 'project' &&
      e.targetId === 'hydrogenSpaceMining' &&
      e.type === 'booleanFlag' &&
      e.flagId === 'atmosphericMonitoring' &&
      e.value === true
    );
    expect(carbonFlag).toBeDefined();
    expect(nitrogenFlag).toBeDefined();
    expect(hydrogenFlag).toBeDefined();
  });
});
