const {
  AmmoniaCycle,
  calculateSaturationPressureAmmonia,
  boilingPointAmmonia
} = require('../src/js/terraforming/ammonia-cycle.js');

describe('ammonia cycle physics', () => {
  test('matches the triple-point saturation pressure', () => {
    const pressure = calculateSaturationPressureAmmonia(195.4);
    expect(pressure).toBeCloseTo(6060, 0);
  });

  test('boiling point resolves near 1 atm', () => {
    const temperature = boilingPointAmmonia(101325);
    expect(temperature).toBeCloseTo(239.81, 2);
  });

  test('defaults to the expected condensation parameter', () => {
    const cycle = new AmmoniaCycle();
    expect(cycle.equilibriumCondensationParameter).toBeCloseTo(0.002, 6);
  });
});
