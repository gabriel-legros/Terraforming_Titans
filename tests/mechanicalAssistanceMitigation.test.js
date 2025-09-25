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
        getConsumption() {
          const clone = {};
          for (const category in this.consumption || {}) {
            clone[category] = { ...this.consumption[category] };
          }
          return clone;
        }
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
      colony.updateNeedsRatio = function() {
        this.filledNeeds.food = 1;
        this.filledNeeds.energy = 1;
        if (ctx.colonySliderSettings.mechanicalAssistance > 0) {
          this.filledNeeds.components = 1;
        } else {
          delete this.filledNeeds.components;
        }
      };
    colony.happiness = 0;
    ctx.colonies.test = colony;
    colony.updateHappiness(1000);
    const noMit = colony.happiness;

    ctx.colonySliderSettings.mechanicalAssistance = 0.4;
    colony.happiness = 0;
    colony.updateHappiness(1000);
    const withMit = colony.happiness;

    const baseTotalHappiness = Math.min(colony.filledNeeds.food || 0, colony.filledNeeds.energy || 0) * 50;
    const basePenalty = 1 - (noMit * 100) / baseTotalHappiness;
    const mitigationFactor = 1 - ctx.colonySliderSettings.mechanicalAssistance * (colony.filledNeeds.components || 0) * 0.25;
    const expectedMitigated = (baseTotalHappiness * (1 - basePenalty * mitigationFactor)) / 100;

    expect(noMit).toBeCloseTo(0.3);
    expect(withMit).toBeCloseTo(expectedMitigated);
    expect(withMit).toBeGreaterThan(noMit);
  });
});
