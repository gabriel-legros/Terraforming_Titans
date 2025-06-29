class HyperionLanternProject extends Project {
  renderUI(container) {
    const lanternControls = document.createElement('div');
    lanternControls.classList.add('lantern-controls');

    const amountContainer = document.createElement('div');
    amountContainer.classList.add('build-count-buttons');
    const amountLabel = document.createElement('span');
    amountLabel.textContent = 'Amount: ';
    const amountDisplay = document.createElement('span');
    amountDisplay.id = 'lantern-amount';
    amountDisplay.classList.add('build-count-display');
    amountContainer.appendChild(amountLabel);
    amountContainer.appendChild(amountDisplay);

    const multiplyButton = document.createElement('button');
    multiplyButton.textContent = 'x10';
    multiplyButton.addEventListener('click', () => {
      lanternAmount = multiplyByTen(lanternAmount);
      updateLanternButtonTexts(this.name);
    });
    amountContainer.appendChild(multiplyButton);

    const divideButton = document.createElement('button');
    divideButton.textContent = '/10';
    divideButton.addEventListener('click', () => {
      lanternAmount = divideByTen(lanternAmount);
      updateLanternButtonTexts(this.name);
    });
    amountContainer.appendChild(divideButton);

    lanternControls.appendChild(amountContainer);

    const decreaseButton = document.createElement('button');
    decreaseButton.addEventListener('click', () => {
      if (terraforming.hyperionLantern.active > 0) {
        terraforming.hyperionLantern.active = Math.max(0, terraforming.hyperionLantern.active - lanternAmount);
        updateProjectUI(this.name);
      }
    });
    decreaseButton.disabled = !this.isCompleted;

    const increaseButton = document.createElement('button');
    increaseButton.addEventListener('click', () => {
      if (terraforming.hyperionLantern.active < terraforming.hyperionLantern.investments) {
        terraforming.hyperionLantern.active = Math.min(terraforming.hyperionLantern.investments, terraforming.hyperionLantern.active + lanternAmount);
        updateProjectUI(this.name);
      }
    });
    increaseButton.disabled = !this.isCompleted;

    const investButton = document.createElement('button');
    const investCost = this.attributes.investmentCost?.colony || {};
    investButton.addEventListener('click', () => {
      const reqComponents = (investCost.components || 0) * lanternAmount;
      const reqElectronics = (investCost.electronics || 0) * lanternAmount;
      if (resources.colony.components.value >= reqComponents &&
          resources.colony.electronics.value >= reqElectronics) {
        if(investCost.components){
          resources.colony.components.value -= reqComponents;
        }
        if(investCost.electronics){
          resources.colony.electronics.value -= reqElectronics;
        }
        terraforming.hyperionLantern.investments += lanternAmount;
        updateProjectUI(this.name);
      }
    });
    investButton.disabled = !this.isCompleted;

    const investmentContainer = document.createElement('div');
    investmentContainer.classList.add('lantern-investment-container');
    investmentContainer.appendChild(decreaseButton);
    investmentContainer.appendChild(increaseButton);
    investmentContainer.appendChild(investButton);

    lanternControls.appendChild(investmentContainer);

    const capacityDisplay = document.createElement('p');
    capacityDisplay.id = 'lantern-capacity';
    lanternControls.appendChild(capacityDisplay);

    const fluxDisplay = document.createElement('p');
    fluxDisplay.id = 'lantern-flux';
    lanternControls.appendChild(fluxDisplay);

    container.appendChild(lanternControls);

    projectElements[this.name] = {
      ...projectElements[this.name],
      lanternDecrease: decreaseButton,
      lanternIncrease: increaseButton,
      lanternInvest: investButton,
      lanternCapacity: capacityDisplay,
      lanternFlux: fluxDisplay,
      lanternAmountDisplay: amountDisplay,
      lanternMultiply: multiplyButton,
      lanternDivide: divideButton
    };
    updateLanternButtonTexts(this.name);
  }

  updateUI() {
    const elements = projectElements[this.name];
    if(!elements) return;
    const completed = this.isCompleted;
    if(elements.lanternDecrease){
      elements.lanternDecrease.disabled = !completed || terraforming.hyperionLantern.active <= 0;
    }
    if(elements.lanternIncrease){
      elements.lanternIncrease.disabled = !completed || terraforming.hyperionLantern.active >= terraforming.hyperionLantern.investments;
    }
    if(elements.lanternInvest){
      elements.lanternInvest.disabled = !completed;
    }
    if(elements.lanternCapacity){
      const powerPerInvestment = this.attributes.powerPerInvestment || 0;
      const activePower = terraforming.hyperionLantern.active * powerPerInvestment;
      const maxPower = terraforming.hyperionLantern.investments * powerPerInvestment;
      elements.lanternCapacity.textContent = `Active: ${formatNumber(activePower, false, 2)} W / Capacity: ${formatNumber(maxPower, false, 2)} W`;
    }
    if(elements.lanternFlux){
      const flux = terraforming.calculateLanternFlux();
      elements.lanternFlux.textContent = `Flux: ${formatNumber(flux, false, 2)} W/m²`;
    }
    updateLanternButtonTexts(this.name);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HyperionLanternProject;
}
