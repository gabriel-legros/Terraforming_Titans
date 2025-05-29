const { multiplyByTen, divideByTen } = require('../buildCount.js');

describe('multiplyByTen', () => {
  test('multiplies the count by 10', () => {
    expect(multiplyByTen(2)).toBe(20);
  });
});

describe('divideByTen', () => {
  test('divides the count by 10', () => {
    expect(divideByTen(50)).toBe(5);
  });

  test('does not go below 1', () => {
    expect(divideByTen(1)).toBe(1);
  });
});
