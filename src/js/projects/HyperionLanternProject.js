class HyperionLanternProject extends Project {
  constructor(config, name) {
    super(config, name);
    const defaultPower = 1e15;
    this.investments = 1;
    this.active = 0;
    this.amount = 1;
    this.powerPerInvestment = this.attributes.powerPerInvestment || defaultPower;
  }

  calculateEnergyUsage(){
    if(!this.isCompleted){
      return 0;
    }
    return this.active * this.powerPerInvestment;
  }

  calculateFlux(celestialParameters){
    if(!celestialParameters){
      return 0;
    }
    const power = this.calculateEnergyUsage();
    if(power <= 0){
      return 0;
    }
    const area = celestialParameters.crossSectionArea || celestialParameters.surfaceArea;
    return power / area;
  }
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
      this.amount = multiplyByTen(this.amount);
      this.updateLanternButtonTexts();
    });
    amountContainer.appendChild(multiplyButton);

    const divideButton = document.createElement('button');
    divideButton.textContent = '/10';
    divideButton.addEventListener('click', () => {
      this.amount = divideByTen(this.amount);
      this.updateLanternButtonTexts();
    });
    amountContainer.appendChild(divideButton);

    lanternControls.appendChild(amountContainer);

    const decreaseButton = document.createElement('button');
    decreaseButton.addEventListener('click', () => {
      if (this.active > 0) {
        this.active = Math.max(0, this.active - this.amount);
        updateProjectUI(this.name);
      }
    });
    decreaseButton.disabled = !this.isCompleted;

    const increaseButton = document.createElement('button');
    increaseButton.addEventListener('click', () => {
      if (this.active < this.investments) {
        this.active = Math.min(this.investments, this.active + this.amount);
        updateProjectUI(this.name);
      }
    });
    increaseButton.disabled = !this.isCompleted;

    const investButton = document.createElement('button');
    const investCost = this.attributes.investmentCost?.colony || {};
    investButton.addEventListener('click', () => {
      const amount = this.amount;
      const reqComponents = (investCost.components || 0) * amount;
      const reqElectronics = (investCost.electronics || 0) * amount;
      const reqGlass = (investCost.glass || 0) * amount;
      if (resources.colony.components.value >= reqComponents &&
          resources.colony.electronics.value >= reqElectronics &&
          resources.colony.glass.value >= reqGlass) {
        if(investCost.components){
          resources.colony.components.value -= reqComponents;
        }
        if(investCost.electronics){
          resources.colony.electronics.value -= reqElectronics;
        }
        if(investCost.glass){
          resources.colony.glass.value -= reqGlass;
        }
        this.investments += amount;
        updateProjectUI(this.name);
      }
    });
    investButton.disabled = !this.isCompleted;

    const investmentContainer = document.createElement('div');
    investmentContainer.classList.add('lantern-investment-container');
    investmentContainer.appendChild(decreaseButton);
    investmentContainer.appendChild(increaseButton);
    investmentContainer.appendChild(investButton);

    const capacityDisplay = document.createElement('p');
    capacityDisplay.id = 'lantern-capacity';
    lanternControls.appendChild(capacityDisplay);
    lanternControls.appendChild(investmentContainer);

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
    this.updateLanternButtonTexts();
  }

  updateLanternButtonTexts() {
    const elements = projectElements[this.name];
    if(!elements) return;
    const amount = this.amount;
    if(elements.lanternIncrease){
      elements.lanternIncrease.textContent = `+${formatNumber(amount, true)}`;
    }
    if(elements.lanternDecrease){
      elements.lanternDecrease.textContent = `-${formatNumber(amount, true)}`;
    }
    if(elements.lanternInvest){
      const investCost = this.attributes.investmentCost?.colony || {};
      const parts = [];
      if(investCost.components){
        parts.push(`${formatNumber(investCost.components * amount, true)} Components`);
      }
      if(investCost.electronics){
        parts.push(`${formatNumber(investCost.electronics * amount, true)} Electronics`);
      }
      if(investCost.glass){
        parts.push(`${formatNumber(investCost.glass * amount, true)} Glass`);
      }
      elements.lanternInvest.textContent = `Invest ${parts.join(' & ')}`;
      const haveComponents = resources.colony.components.value;
      const haveElectronics = resources.colony.electronics.value;
      const haveGlass = resources.colony.glass.value;
      const reqComponents = (investCost.components || 0) * amount;
      const reqElectronics = (investCost.electronics || 0) * amount;
      const reqGlass = (investCost.glass || 0) * amount;
      const canAfford = haveComponents >= reqComponents && haveElectronics >= reqElectronics && haveGlass >= reqGlass;
      elements.lanternInvest.style.color = canAfford ? 'inherit' : 'red';
    }
    if(elements.lanternAmountDisplay){
      elements.lanternAmountDisplay.textContent = formatNumber(amount, true);
    }
  }

  updateUI() {
    const elements = projectElements[this.name];
    if(!elements) return;
    const completed = this.isCompleted;
    if(elements.lanternDecrease){
      elements.lanternDecrease.disabled = !completed || this.active <= 0;
    }
    if(elements.lanternIncrease){
      elements.lanternIncrease.disabled = !completed || this.active >= this.investments;
    }
    if(elements.lanternInvest){
      elements.lanternInvest.disabled = !completed;
    }
    if(elements.lanternCapacity){
      const powerPerInvestment = this.attributes.powerPerInvestment || 0;
      const activePower = this.active * powerPerInvestment;
      const maxPower = this.investments * powerPerInvestment;
      elements.lanternCapacity.textContent = `Active: ${formatNumber(activePower, false, 2)} W / Capacity: ${formatNumber(maxPower, false, 2)} W`;
    }
    if(elements.lanternFlux){
      const flux = terraforming.calculateLanternFlux();
      elements.lanternFlux.textContent = `Flux: ${formatNumber(flux, false, 2)} W/m²`;
    }
    this.updateLanternButtonTexts();
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.HyperionLanternProject = HyperionLanternProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HyperionLanternProject;
}
