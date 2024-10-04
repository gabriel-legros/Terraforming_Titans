// FundingModule Class
class FundingModule {
  constructor(resources, fundingRate) {
    this.resources = resources;
    this.fundingRate = fundingRate; // Set the funding rate from planet parameters
  }

  // Method to update funding over time
  update(deltaTime) {
    const fundingIncrease = (this.fundingRate * deltaTime) / 1000; // Calculate the increase in funding based on the rate
    this.resources.colony.funding.increase(fundingIncrease); // Increase funding in the resources
  }
}