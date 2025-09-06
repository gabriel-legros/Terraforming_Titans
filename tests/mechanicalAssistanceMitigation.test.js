const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Mechanical Assistance mitigation', () => {
  test('reduces gravity penalty multiplicatively', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony.js'), 'utf8');
    const ctx = {
      EffectableEntity: class {},
      Building: class {
        constructor(config) {
          this.consumption = config.consumption || {};
          this.storage = { colony: { colonists: 100 } };
          this.active = 1;
          this.baseComfort = config.baseComfort || 0;
          this.happiness = 0;
        }
        initializeFromConfig() {}
        getConsumptionResource(cat, res) { return { amount: this.consumption?.[cat]?.[res] || 0 }; }
        getEffectiveConsumptionMultiplier() { return 1; }
        getEffectiveResourceConsumptionMultiplier() { return 1; }
      },
      colonies: {},
      resources: { colony: { colonists: { value: 100, cap: 100 } } },
      terraforming: { celestialParameters: { gravity: 18 } },
      milestonesManager: { getHappinessBonus: () => 0 },
      colonySliderSettings: { mechanicalAssistance: 0 }
    };
    vm.createContext(ctx);
    vm.runInContext(code + '; this.Colony = Colony;', ctx);
    const colony = new ctx.Colony({ consumption: { colony: { food: 1, energy: 1 } }, baseComfort: 0 }, 'test');
    colony.updateNeedsRatio = function() { this.filledNeeds.food = 1; this.filledNeeds.energy = 1; };
    colony.happiness = 0;
    ctx.colonies.test = colony;
    colony.updateHappiness(1000);
    const noMit = colony.happiness;

    ctx.colonySliderSettings.mechanicalAssistance = 0.4;
    colony.happiness = 0;
    colony.updateHappiness(1000);
    const withMit = colony.happiness;

    expect(noMit).toBeCloseTo(0.3);
    expect(withMit).toBeCloseTo(0.32);
  });
});
