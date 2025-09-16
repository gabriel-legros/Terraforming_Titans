const researchParameters = require('../src/js/research-parameters.js');

describe('Life research unlocks terraforming life subtab', () => {
  test('Life Designing and Production enables terraforming life subtab flag', () => {
    const lifeResearch = (researchParameters.terraforming || []).find(r => r.id === 'life');
    expect(lifeResearch).toBeDefined();
    const unlocksLifeSubtab = lifeResearch.effects.some(effect =>
      effect.target === 'terraforming' &&
      effect.type === 'booleanFlag' &&
      effect.flagId === 'lifeDesignerUnlocked' &&
      effect.value === true
    );
    expect(unlocksLifeSubtab).toBe(true);
  });
});
