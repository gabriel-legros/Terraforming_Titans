var ZonalResource;
var ZonalResources;

(function () {
  class ZonalResourceClass {
    constructor(zones) {
      Object.defineProperty(this, '_zones', { value: zones.slice() });
      Object.defineProperty(this, '_values', { value: {} });
      Object.defineProperty(this, '_remainders', { value: {} });
      for (const zone of zones) {
        this._values[zone] = 0;
        this._remainders[zone] = 0;
        Object.defineProperty(this, zone, {
          enumerable: true,
          get: () => this.get(zone),
          set: value => this.set(zone, value),
        });
      }
    }

    get(zone) {
      return this._values[zone] || 0;
    }

    set(zone, value) {
      this._values[zone] = Math.max(0, value || 0);
      this._remainders[zone] = 0;
      return this._values[zone];
    }

    change(zone, amount) {
      const currentValue = this.get(zone);
      const currentRemainder = this.getRemainder(zone);
      let actualChange = amount;
      if (amount < 0 && -amount >= currentValue) {
        actualChange = -Math.min(-amount, Math.max(0, currentValue + currentRemainder));
      }

      const combinedChange = currentRemainder + actualChange;
      let nextValue = Math.max(0, currentValue + combinedChange);
      const representedChange = nextValue - currentValue;
      let nextRemainder = combinedChange - representedChange;
      if (nextValue === 0) {
        if (nextRemainder > 0) {
          nextValue = nextRemainder;
          nextRemainder = 0;
        } else if (nextRemainder < 0) {
          nextRemainder = 0;
        }
      }

      this._values[zone] = nextValue;
      this._remainders[zone] = nextRemainder;
      return actualChange;
    }

    getRemainder(zone) {
      return this._remainders[zone] || 0;
    }

    setRemainder(zone, value) {
      const remainder = value || 0;
      if (this.get(zone) === 0) {
        if (remainder > 0) {
          this._values[zone] = remainder;
        }
        this._remainders[zone] = 0;
        return;
      }
      this._remainders[zone] = remainder;
    }

    getTotal(zone) {
      return this.get(zone) + this.getRemainder(zone);
    }

    copyTo(target) {
      for (const zone of this._zones) {
        target._values[zone] = this._values[zone];
        target._remainders[zone] = this._remainders[zone];
      }
    }

    getRemainders() {
      return { ...this._remainders };
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

    getRemainders() {
      const remainders = {};
      for (const resourceKey of this._resourceKeys) {
        remainders[resourceKey] = this[resourceKey].getRemainders();
      }
      return remainders;
    }
  }

  ZonalResource = ZonalResourceClass;
  ZonalResources = ZonalResourcesClass;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZonalResource, ZonalResources };
  }
})();
