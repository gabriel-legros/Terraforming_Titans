const path = require('path');

global.EffectableEntity = class {
  constructor() {
    this.booleanFlags = new Set();
  }
  applyBooleanFlag() {}
  removeBooleanFlag() {}
  isBooleanFlagSet(flagId) {
    return this.booleanFlags.has(flagId);
  }
};

global.lifeParameters = {};

const Terraforming = require(path.join('..', 'src/js/terraforming/terraforming.js'));

describe('Terraforming requirement selection', () => {
  test('uses specialAttributes.terraformingRequirementId when provided', () => {
    const resources = {
      surface: { land: { value: 1 } },
      atmospheric: { carbonDioxide: { value: 0 }, oxygen: { value: 0 }, inertGas: { value: 0 }, hydrogen: { value: 0 }, atmosphericMethane: { value: 0 } },
    };

    const celestialParameters = {
      radius: 1,
      surfaceArea: 4 * Math.PI,
      crossSectionArea: Math.PI,
      gravity: 9.81,
      hasNaturalMagnetosphere: false,
      parentBody: {},
    };

    const specialAttributes = { terraformingRequirementId: 'gabbagian' };
    const terraforming = new Terraforming(resources, celestialParameters, specialAttributes);
    expect(terraforming.requirements.id).toBe('gabbagian');
    expect(terraforming.requirements.lifeDesign.metabolism.primaryProcessId).toBe('methanogenesis');
  });
});
