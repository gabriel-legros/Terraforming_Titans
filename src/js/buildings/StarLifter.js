class StarLifter extends Building {
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
}

registerBuildingConstructor(StarLifter);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StarLifter };
}
