// FundingModule Class
class FundingModule extends EffectableEntity {
  constructor(resources, fundingRate) {
    super({config : 'Funding Module'});

    this.resources = resources;
    this.fundingRate = fundingRate; // Set the funding rate from planet parameters
  }

  // Method to get the effective production multiplier
  getEffectiveProductionMultiplier() {
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'productionMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getEffectiveFunding(){
    return this.fundingRate * this.getEffectiveProductionMultiplier();
  }

  // Method to update funding over time
  update(deltaTime) {
    const baseFundingIncrease = this.fundingRate * this.getEffectiveProductionMultiplier();
    const fundingIncrease = baseFundingIncrease * deltaTime / 1000; // Calculate the increase in funding based on the rate
      resources.colony.funding.modifyRate(
        baseFundingIncrease,
        'Funding',
        'funding'
      );
  }
}