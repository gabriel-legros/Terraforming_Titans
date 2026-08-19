class StarLifter extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.superchargeMultiplier = 1;
    this.superchargeUnlocked = false;
    this.superchargeMaxMultiplier = 10;
    this.superchargeExponent = 3;
  }

  syncLifterSuperchargeUpgrades(lifters) {
    this.superchargeUnlocked = lifters.hasSuperchargeUnlocked();
    this.superchargeMaxMultiplier = lifters.getEffectiveSuperchargeMaxMultiplier();
    this.superchargeExponent = lifters.getEffectiveSuperchargeExponent();
  }

  getEffectiveSuperchargeMaxMultiplier() {
    return this.superchargeUnlocked
      ? this.superchargeMaxMultiplier
      : 1;
  }

  getEffectiveSuperchargeMultiplier() {
    const parsed = Number(this.superchargeMultiplier);
    const selected = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
    return Math.min(selected, this.getEffectiveSuperchargeMaxMultiplier());
  }

  setSuperchargeMultiplier(value) {
    const parsed = Number(value);
    const selected = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
    this.superchargeMultiplier = Math.min(
      selected,
      this.getEffectiveSuperchargeMaxMultiplier()
    );
  }

  getEffectiveResourceConsumptionMultiplier(category, resource) {
    const multiplier = super.getEffectiveResourceConsumptionMultiplier(category, resource);
    const supercharge = this.getEffectiveSuperchargeMultiplier();
    if (category === 'underground' && resource === 'stellarMass') {
      return multiplier * supercharge;
    }
    if (category === 'space' && resource === 'energy') {
      return multiplier * Math.pow(supercharge, this.superchargeExponent);
    }
    return multiplier;
  }

  initializeCustomUI(context = {}) {
    const { hideButton, cachedElements: cache } = context;
    const control = document.createElement('div');
    control.classList.add('star-lifter-supercharge-control');

    const label = document.createElement('label');
    label.classList.add('star-lifter-supercharge-label');
    label.htmlFor = `${this.name}-supercharge-slider`;
    label.textContent = t('ui.buildings.starLifter.supercharge');

    const value = document.createElement('span');
    value.classList.add('star-lifter-supercharge-value');

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `${this.name}-supercharge-slider`;
    slider.min = '1';
    slider.max = '1';
    slider.step = '1';
    slider.value = '1';
    slider.disabled = true;
    slider.classList.add('star-lifter-supercharge-slider');
    slider.addEventListener('input', () => {
      this.setSuperchargeMultiplier(slider.value);
      this.updateUI(cache);
    });

    const energyValue = document.createElement('span');
    energyValue.classList.add('star-lifter-supercharge-energy');
    value.textContent = 'x1';
    energyValue.textContent = t('ui.buildings.starLifter.superchargeEnergy', { value: '1' });

    control.append(label, value, energyValue, slider);
    hideButton.parentElement.insertAdjacentElement('beforebegin', control);

    cache.starLifterSupercharge = {
      control,
      slider,
      value,
      energyValue
    };
  }

  updateUI(elements) {
    const superchargeElements = elements?.starLifterSupercharge;
    if (!superchargeElements) {
      return;
    }

    const supercharge = this.getEffectiveSuperchargeMultiplier();
    const max = this.getEffectiveSuperchargeMaxMultiplier();
    const energyMultiplier = Math.pow(supercharge, this.superchargeExponent);
    const sliderValue = String(supercharge);
    const maxValue = String(max);
    const valueText = `x${formatNumber(supercharge, true, 0)}`;
    const energyText = t('ui.buildings.starLifter.superchargeEnergy', {
      value: formatNumber(energyMultiplier, true)
    });

    if (superchargeElements.slider.max !== maxValue) {
      superchargeElements.slider.max = maxValue;
    }
    if (superchargeElements.slider.value !== sliderValue) {
      superchargeElements.slider.value = sliderValue;
    }
    superchargeElements.slider.disabled = max <= 1;
    if (superchargeElements.value.textContent !== valueText) {
      superchargeElements.value.textContent = valueText;
    }
    if (superchargeElements.energyValue.textContent !== energyText) {
      superchargeElements.energyValue.textContent = energyText;
    }
  }

  getStellarLiftProductivityDetails(resources, deltaTime) {
    const stellarMass = resources.underground.stellarMass;
    const requiredAmount = Math.max(0, stellarMass.consumptionRate * (deltaTime / 1000));
    const availableAmount = getDynamicWorldStellarLiftableMassTons(terraforming);
    return {
      availableAmount,
      requiredAmount,
      ratio: requiredAmount > 0
        ? Math.max(0, Math.min(availableAmount / requiredAmount, 1))
        : 0
    };
  }

  calculateBaseMinRatio(resources, deltaTime, ignoreMap) {
    const ignoreStellarMass = ignoreMap?.underground?.stellarMass === true;
    const baseRatio = super.calculateBaseMinRatio(resources, deltaTime, {
      ...ignoreMap,
      underground: {
        ...ignoreMap?.underground,
        stellarMass: true
      }
    });
    if (ignoreStellarMass) {
      return baseRatio;
    }
    return Math.min(
      baseRatio,
      this.getStellarLiftProductivityDetails(resources, deltaTime).ratio
    );
  }

  getBaseProductivityFactors(resources, deltaTime, ignoreMap) {
    const ignoreStellarMass = ignoreMap?.underground?.stellarMass === true;
    const details = super.getBaseProductivityFactors(resources, deltaTime, {
      ...ignoreMap,
      underground: {
        ...ignoreMap?.underground,
        stellarMass: true
      }
    });
    if (ignoreStellarMass) {
      return details;
    }

    const stellarMass = resources.underground.stellarMass;
    const stellarDetails = this.getStellarLiftProductivityDetails(resources, deltaTime);
    details.minRatio = Math.min(details.minRatio, stellarDetails.ratio);
    details.factors.push({
      type: 'resource',
      category: 'underground',
      resource: 'stellarMass',
      label: stellarMass.displayName,
      ratio: stellarDetails.ratio,
      availableAmount: stellarDetails.availableAmount,
      requiredAmount: stellarDetails.requiredAmount,
      largestDemands: Object.entries(stellarMass.projectedConsumptionRateBySource)
        .filter(([, rate]) => rate > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, rate]) => ({ source, amount: rate * (deltaTime / 1000) }))
    });
    return details;
  }

  consume(accumulatedChanges, deltaTime, accumulatedSpecialChanges) {
    super.consume(accumulatedChanges, deltaTime, accumulatedSpecialChanges);

    const stellarMassConsumption = this.currentConsumption.underground?.stellarMass || 0;
    if (!(stellarMassConsumption > 0)) {
      return;
    }

    accumulatedChanges.underground.stellarMass += stellarMassConsumption;
    const removedMass = disposeDynamicWorldStellarLiftableMass(
      terraforming,
      stellarMassConsumption
    );
    this.currentConsumption.underground.stellarMass = removedMass;

    const unconsumedMass = stellarMassConsumption - removedMass;
    if (unconsumedMass > 0 && deltaTime > 0) {
      resources.underground.stellarMass.modifyRate(
        unconsumedMass * (1000 / deltaTime),
        this.getRateSource(),
        'building'
      );
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      superchargeMultiplier: this.superchargeMultiplier
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    const parsed = Number(state.superchargeMultiplier);
    this.superchargeMultiplier = Number.isFinite(parsed)
      ? Math.max(1, Math.round(parsed))
      : 1;
  }
}

registerBuildingConstructor(StarLifter);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StarLifter };
}
