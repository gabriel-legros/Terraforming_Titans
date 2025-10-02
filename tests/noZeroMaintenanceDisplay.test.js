const { getProdConsSections } = (() => {
  global.document = { addEventListener: () => {} };
  return require('../src/js/structuresUI.js');
})();

describe('maintenance cost display', () => {
  test('getProdConsSections excludes zero maintenance costs', () => {
    const structure = {
      requiresMaintenance: true,
      maintenanceCost: { metal: 0, components: 5 },
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      active: 1,
      productivity: 1,
      name: 'testStruct',
      getModifiedProduction: () => ({}),
      getModifiedConsumption: () => ({})
    };

    const sections = getProdConsSections(structure);
    const maintSection = sections.find(sec => sec.key === 'maintenance');
    expect(maintSection.keys).toEqual(['colony.components']);
    expect(maintSection.data).toEqual({ components: 5 });
  });
});
