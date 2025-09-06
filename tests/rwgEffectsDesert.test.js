const { applyRWGEffects } = require('../src/js/rwgEffects.js');

test('desert and desiccated-desert worlds boost ore and sand production', () => {
  const effects = [];
  global.addEffect = (eff) => effects.push(eff);
  global.spaceManager = {
    randomWorldStatuses: {
      a: { terraformed: true, original: { override: { classification: { archetype: 'cold-desert' } } } },
      b: { terraformed: true, original: { override: { classification: { archetype: 'cold-desert' } } } },
      c: { terraformed: true, original: { override: { classification: { archetype: 'desiccated-desert' } } } },
      d: { terraformed: false, original: { override: { classification: { archetype: 'desiccated-desert' } } } },
    },
  };

  applyRWGEffects();

  const desert = effects.find(e => e.effectId === 'rwg-desert-ore');
  expect(desert).toBeDefined();
  expect(desert.target).toBe('building');
  expect(desert.targetId).toBe('oreMine');
  expect(desert.value).toBeCloseTo(1.2);

  const desiccated = effects.find(e => e.effectId === 'rwg-desiccated-sand');
  expect(desiccated).toBeDefined();
  expect(desiccated.target).toBe('building');
  expect(desiccated.targetId).toBe('sandQuarry');
  expect(desiccated.value).toBeCloseTo(1.1);

  delete global.addEffect;
  delete global.spaceManager;
});
