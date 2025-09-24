const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Bosch Reactor building', () => {
  test('is locked by default and converts CO2 and hydrogen into water', () => {
    const filePath = path.join(__dirname, '..', 'src/js', 'buildings-parameters.js');
    const code = fs.readFileSync(filePath, 'utf8');

    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);

    const boschReactor = ctx.buildingsParameters.boschReactor;
    const oxygenFactory = ctx.buildingsParameters.oxygenFactory;

    expect(boschReactor).toBeDefined();
    expect(oxygenFactory).toBeDefined();

    expect(boschReactor.unlocked).toBe(false);
    expect(boschReactor.category).toBe('terraforming');
    expect(boschReactor.cost.colony).toEqual({
      metal: 100,
      glass: 10,
      components: 2,
      electronics: 1,
    });

    expect(boschReactor.consumption.colony.energy).toBe(100_000);
    expect(boschReactor.consumption.atmospheric).toMatchObject({
      carbonDioxide: 100,
      hydrogen: 9.09,
    });

    expect(boschReactor.production.colony).toMatchObject({ water: 81.82 });
    Object.values(boschReactor.production).forEach((category) => {
      expect(category.carbon).toBeUndefined();
    });
  });
});
