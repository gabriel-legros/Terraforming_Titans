var PreciseDecimal;

(function () {
  class PreciseDecimalClass {
    constructor(coefficient, exponent) {
      let normalizedCoefficient = coefficient;
      let normalizedExponent = exponent;
      if (normalizedCoefficient === 0n) {
        normalizedExponent = 0;
      } else {
        while (normalizedCoefficient % 10n === 0n) {
          normalizedCoefficient /= 10n;
          normalizedExponent += 1;
        }
      }
      this.coefficient = normalizedCoefficient;
      this.exponent = normalizedExponent;
      Object.freeze(this);
    }

    static from(value) {
      if (value instanceof PreciseDecimalClass) {
        return value;
      }
      const serialized = value && value.preciseDecimal;
      const text = String(serialized || value || 0).toLowerCase();
      const exponentParts = text.split('e');
      const decimalParts = exponentParts[0].split('.');
      const fraction = decimalParts[1] || '';
      let digits = decimalParts[0] + fraction;
      let sign = 1n;
      if (digits[0] === '-') {
        sign = -1n;
        digits = digits.slice(1);
      } else if (digits[0] === '+') {
        digits = digits.slice(1);
      }
      return new PreciseDecimalClass(
        sign * BigInt(digits || '0'),
        Number(exponentParts[1] || 0) - fraction.length
      );
    }

    static zero() {
      return new PreciseDecimalClass(0n, 0);
    }

    static min(left, right) {
      const leftValue = PreciseDecimalClass.from(left);
      const rightValue = PreciseDecimalClass.from(right);
      return leftValue.compare(rightValue) <= 0 ? leftValue : rightValue;
    }

    static max(left, right) {
      const leftValue = PreciseDecimalClass.from(left);
      const rightValue = PreciseDecimalClass.from(right);
      return leftValue.compare(rightValue) >= 0 ? leftValue : rightValue;
    }

    add(value) {
      const other = PreciseDecimalClass.from(value);
      const exponent = Math.min(this.exponent, other.exponent);
      const leftScale = 10n ** BigInt(this.exponent - exponent);
      const rightScale = 10n ** BigInt(other.exponent - exponent);
      return new PreciseDecimalClass(
        this.coefficient * leftScale + other.coefficient * rightScale,
        exponent
      );
    }

    subtract(value) {
      return this.add(PreciseDecimalClass.from(value).negate());
    }

    multiply(value) {
      const other = PreciseDecimalClass.from(value);
      return new PreciseDecimalClass(
        this.coefficient * other.coefficient,
        this.exponent + other.exponent
      );
    }

    negate() {
      return new PreciseDecimalClass(-this.coefficient, this.exponent);
    }

    abs() {
      return this.coefficient < 0n ? this.negate() : this;
    }

    compare(value) {
      const difference = this.subtract(value);
      if (difference.coefficient < 0n) return -1;
      if (difference.coefficient > 0n) return 1;
      return 0;
    }

    equals(value) {
      return this.compare(value) === 0;
    }

    lessThan(value) {
      return this.compare(value) < 0;
    }

    lessThanOrEqual(value) {
      return this.compare(value) <= 0;
    }

    greaterThan(value) {
      return this.compare(value) > 0;
    }

    greaterThanOrEqual(value) {
      return this.compare(value) >= 0;
    }

    isZero() {
      return this.coefficient === 0n;
    }

    isPositive() {
      return this.coefficient > 0n;
    }

    isNegative() {
      return this.coefficient < 0n;
    }

    isInteger() {
      return this.coefficient === 0n || this.exponent >= 0;
    }

    decimalPlaces() {
      return Math.max(0, -this.exponent);
    }

    toNumber() {
      return Number(this.toString());
    }

    toString() {
      return `${this.coefficient}e${this.exponent}`;
    }

    toPlainString() {
      if (this.coefficient === 0n) return '0';
      const negative = this.coefficient < 0n;
      const digits = (negative ? -this.coefficient : this.coefficient).toString();
      const decimalIndex = digits.length + this.exponent;
      let text;
      if (decimalIndex <= 0) {
        text = `0.${'0'.repeat(-decimalIndex)}${digits}`;
      } else if (decimalIndex >= digits.length) {
        text = digits + '0'.repeat(decimalIndex - digits.length);
      } else {
        text = `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
      }
      return negative ? `-${text}` : text;
    }

    serialize() {
      return { preciseDecimal: this.toString() };
    }

    toJSON() {
      return this.serialize();
    }
  }

  PreciseDecimal = PreciseDecimalClass;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PreciseDecimal };
  }
})();
