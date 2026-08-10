var ZonalResource;
var ZonalResources;
var PreciseDecimalClass;

if (typeof module !== 'undefined' && module.exports) {
  ({ PreciseDecimal: PreciseDecimalClass } = require('../precise-decimal.js'));
} else {
  PreciseDecimalClass = PreciseDecimal;
}

(function () {
  const MAX_NORMAL_CHANGE_ERROR_RATIO = 1e-12;

  class ZonalResourceClass {
    constructor(zones) {
      Object.defineProperty(this, '_zones', { value: zones.slice() });
      Object.defineProperty(this, '_values', { value: {} });
      for (const zone of zones) {
        this._values[zone] = 0;
        Object.defineProperty(this, zone, {
          enumerable: true,
          get: () => this.get(zone),
          set: value => this.set(zone, value),
        });
      }
    }

    get(zone) {
      const value = this._values[zone];
      return value instanceof PreciseDecimalClass ? value.toNumber() : value || 0;
    }

    getExact(zone) {
      const value = this._values[zone];
      return value instanceof PreciseDecimalClass ? value : PreciseDecimalClass.from(value);
    }

    isPrecise(zone) {
      return this._values[zone] instanceof PreciseDecimalClass;
    }

    set(zone, value) {
      if (value && value.preciseDecimal) {
        this._storeDecimal(zone, PreciseDecimalClass.from(value));
      } else {
        this._values[zone] = Math.max(0, value || 0);
      }
      return this.get(zone);
    }

    change(zone, amount) {
      const storedValue = this._values[zone];
      if (storedValue instanceof PreciseDecimalClass) {
        return this._changePrecise(zone, storedValue, amount);
      }

      const currentValue = storedValue || 0;
      let actualChange = amount;
      if (amount < 0 && -amount >= currentValue) {
        actualChange = -currentValue;
      }

      const nextValue = Math.max(0, currentValue + actualChange);
      const representedChange = nextValue - currentValue;
      const changeError = Math.abs(representedChange - actualChange);
      if (
        actualChange !== 0
        && changeError > Math.abs(actualChange) * MAX_NORMAL_CHANGE_ERROR_RATIO
      ) {
        const exactValue = PreciseDecimalClass.from(currentValue).add(actualChange);
        this._storeDecimal(zone, exactValue);
      } else {
        this._values[zone] = nextValue;
      }
      return actualChange;
    }

    _changePrecise(zone, currentValue, amount) {
      let nextValue = currentValue.add(amount);
      let actualChange = amount;
      if (nextValue.coefficient < 0n) {
        actualChange = -currentValue.toNumber();
        nextValue = PreciseDecimalClass.zero();
      }
      this._storeDecimal(zone, nextValue);
      return actualChange;
    }

    _storeDecimal(zone, value) {
      const numberValue = value.toNumber();
      this._values[zone] = PreciseDecimalClass.from(numberValue).equals(value)
        ? numberValue
        : value;
    }

    getTotal(zone) {
      return this.get(zone);
    }

    copyTo(target) {
      for (const zone of this._zones) {
        target._values[zone] = this._values[zone];
      }
    }

    toJSON() {
      const values = {};
      for (const zone of this._zones) {
        const value = this._values[zone];
        values[zone] = value instanceof PreciseDecimalClass ? value.serialize() : value;
      }
      return values;
    }
  }

  class ZonalResourcesClass {
    constructor(resourceKeys, zones) {
      Object.defineProperty(this, '_resourceKeys', { value: resourceKeys.slice() });
      Object.defineProperty(this, '_zones', { value: zones.slice() });
      for (const resourceKey of resourceKeys) {
        Object.defineProperty(this, resourceKey, {
          enumerable: true,
          value: new ZonalResourceClass(zones),
        });
      }
    }

    get(resourceKey, zone) {
      return this[resourceKey].get(zone);
    }

    set(resourceKey, zone, value) {
      return this[resourceKey].set(zone, value);
    }

    change(resourceKey, zone, amount) {
      return this[resourceKey].change(zone, amount);
    }

    getTotal(resourceKey, zone) {
      return this[resourceKey].getTotal(zone);
    }

    clone() {
      const clone = new ZonalResourcesClass(this._resourceKeys, this._zones);
      for (const resourceKey of this._resourceKeys) {
        this[resourceKey].copyTo(clone[resourceKey]);
      }
      return clone;
    }
  }

  ZonalResource = ZonalResourceClass;
  ZonalResources = ZonalResourcesClass;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZonalResource, ZonalResources };
  }
})();
