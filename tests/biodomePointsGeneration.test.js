const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('biodome points generation', () => {
  function createDesigner(biodomeCount, activeCount = biodomeCount, baseMax = 10) {
    const dom = new JSDOM(``, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    ctx.buildings = { biodome: { count: biodomeCount, active: activeCount } };
    ctx.resources = { surface: { biomass: { value: 0 } } };
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInContext(lifeCode + '; this.LifeDesigner = LifeDesigner;', ctx);
    const designer = new ctx.LifeDesigner();
    designer.baseMaxPoints = baseMax;
    return { designer, ctx };
  }

    test('gains points based on log10(10 * biodomes) per hour', () => {
      const { designer } = createDesigner(2, 2, 20);
      designer.update(3600000); // one hour
      expect(designer.biodomePoints).toBeCloseTo(Math.log10(20));
      expect(Math.floor(designer.biodomePoints)).toBe(1);
      expect(designer.biodomePointRate).toBeCloseTo(Math.log10(20));
    });

  test('accumulates fractional progress across updates', () => {
    const { designer } = createDesigner(2, 2, 20);
    designer.update(1800000); // half hour
    expect(Math.floor(designer.biodomePoints)).toBe(0);
    designer.update(1800000); // another half hour
    expect(Math.floor(designer.biodomePoints)).toBe(1);
  });

    test('maxLifeDesignPoints adds floor of biodome points', () => {
      const { designer } = createDesigner(2, 2, 10);
      designer.update(3600000); // ~1.3 points
      expect(designer.maxLifeDesignPoints()).toBe(11);
      designer.update(3600000); // ~2.6 points total
      expect(designer.maxLifeDesignPoints()).toBe(12);
    });

    test('uses active biodomes for point generation', () => {
      const { designer } = createDesigner(5, 2, 20);
      designer.update(3600000); // one hour
      expect(designer.biodomePoints).toBeCloseTo(Math.log10(20));
      expect(designer.biodomePointRate).toBeCloseTo(Math.log10(20));
    });
  });
