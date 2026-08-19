class StarLifter extends Building {
  consume(accumulatedChanges, deltaTime, accumulatedSpecialChanges) {
    super.consume(accumulatedChanges, deltaTime, accumulatedSpecialChanges);

    const stellarMassConsumption = this.currentConsumption.underground?.stellarMass || 0;
    if (!(stellarMassConsumption > 0)) {
      return;
    }

    accumulatedChanges.underground.stellarMass += stellarMassConsumption;
    const removedMass = disposeDynamicWorldStellarMass(terraforming, stellarMassConsumption);
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
