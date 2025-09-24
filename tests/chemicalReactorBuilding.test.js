const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Chemical Reactor building', () => {
  test('is locked by default and exposes multi-recipe synthesis options', () => {
    const filePath = path.join(__dirname, '..', 'src/js', 'buildings-parameters.js');
    const code = fs.readFileSync(filePath, 'utf8');

    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);

    const chemicalReactor = ctx.buildingsParameters.boschReactor;

    expect(chemicalReactor).toBeDefined();
    expect(chemicalReactor.name).toBe('Chemical Reactor');
    expect(chemicalReactor.unlocked).toBe(false);
    expect(chemicalReactor.category).toBe('terraforming');
    expect(chemicalReactor.cost.colony).toEqual({
      metal: 100,
      glass: 10,
      components: 2,
      electronics: 1,
    });

    expect(chemicalReactor.consumption.colony.energy).toBe(100_000);
    expect(chemicalReactor.production).toEqual({});
    expect(chemicalReactor.defaultRecipe).toBe('recipe1');

    const { recipes } = chemicalReactor;
    expect(recipes).toBeDefined();

    const primaryRecipe = recipes.recipe1;
    expect(primaryRecipe.shortName).toBe('Chemical Reactor');
    expect(primaryRecipe.consumption.atmospheric).toMatchObject({
      carbonDioxide: 100,
      hydrogen: 9.09,
    });
    expect(primaryRecipe.production.colony).toMatchObject({ water: 81.82 });

    const waterSynthesis = recipes.recipe2;
    expect(waterSynthesis.shortName).toBe('Water Synthesis');
    expect(waterSynthesis.consumption.atmospheric).toMatchObject({
      oxygen: 72.73,
      hydrogen: 9.09,
    });
    expect(waterSynthesis.production.colony).toMatchObject({ water: 81.82 });

    const methane = recipes.recipe3;
    expect(methane.shortName).toBe('Methane Synthesis');
    expect(methane.consumption.atmospheric).toMatchObject({
      carbonDioxide: 100,
      hydrogen: 18.18,
    });
    expect(methane.production.atmospheric).toMatchObject({ atmosphericMethane: 36.36 });
    expect(methane.production.colony).toMatchObject({ water: 81.82 });
  });
});
