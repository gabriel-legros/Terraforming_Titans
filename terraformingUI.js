// Function to create the terraforming UI elements


function getGasRangeString(gasName) {
  // Check if the gas exists in the object
  const gas = terraformingGasTargets[gasName];
  
  if (gas) {
    // Return the range string
    return `${formatNumber(gas.min, true)} < P < ${formatNumber(gas.max, true)}`;
  } else {
    // Handle invalid gas names
    return '';
  }
}

function initializeTerraformingTabs() {
  // Set up event listeners for terraforming sub-tabs
  document.querySelectorAll('.terraforming-subtab').forEach(subtab => {
      subtab.addEventListener('click', () => {
          const subtabContentId = subtab.dataset.subtab;
          activateTerraformingSubtab(subtabContentId);
      });
  });

  // Add event listeners for "Toggle Completed" buttons
  document.querySelectorAll('.toggle-completed-button').forEach(button => {
      button.addEventListener('click', () => {
          toggleCompletedTesearch();
      });
  });

  // Activate the 'energy' category
  activateTerraformingSubtab('summary-terraforming');
}

function activateTerraformingSubtab(subtabId) {
  // Remove active class from all subtabs and subtab-contents
  document.querySelectorAll('.terraforming-subtab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.terraforming-subtab-content').forEach((t) => t.classList.remove('active'));
  
  // Add active class to the clicked subtab and corresponding content
  document.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');
  document.getElementById(subtabId).classList.add('active');
}

function createTerraformingSummaryUI() {
    const terraformingContainer = document.getElementById('summary-terraforming');
  
    // Create the first row of boxes
    const row1 = document.createElement('div');
    row1.classList.add('terraforming-row');
  
    // Create the second row of boxes
    const row2 = document.createElement('div');
    row2.classList.add('terraforming-row');
  
    // Create and append the boxes for each terraforming aspect
    createTemperatureBox(row1);
    createAtmosphereBox(row1);
    createWaterBox(row1);
    createLuminosityBox(row2);
    createLifeBox(row2);
    createMagnetosphereBox(row2);
  
    // Append the rows to the terraforming container
    terraformingContainer.appendChild(row1);
    terraformingContainer.appendChild(row2);

    // Add the "Complete Terraforming" button below the rows
    createCompleteTerraformingButton(terraformingContainer);
  }

// Function to update the terraforming UI elements
function updateTerraformingUI() {
    updateTemperatureBox();
    updateAtmosphereBox();
    updateWaterBox();
    updateLuminosityBox();
    updateLifeBox();
    updateMagnetosphereBox();
    updateLifeUI();

    // Update the button state
    updateCompleteTerraformingButton();
  }

// Functions to create and update each terraforming aspect box

function createTemperatureBox(row) {
    const temperatureBox = document.createElement('div');
    temperatureBox.classList.add('terraforming-box');
    temperatureBox.id = 'temperature-box';
    temperatureBox.innerHTML = `
      <h3>${terraforming.temperature.name}</h3>
      <p>Current average: <span id="temperature-current">${terraforming.temperature.value}</span>K</p>
      <p>Effective Temp (No Atm): <span id="effective-temp-no-atm">${terraforming.temperature.effectiveTempNoAtmosphere.toFixed(2)}</span> K</p>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>T (K)</th>
            <th>Delta (K)</th>
            <th>Day (K)</th>
            <th>Night (K)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tropical</td>
            <td><span id="tropical-temp">${terraforming.temperature.zones.tropical.value.toFixed(2)}</span></td>
            <td><span id="tropical-delta"></span></td>
            <td><span id="tropical-day">${terraforming.temperature.zones.tropical.day.toFixed(2)}</span></td>
            <td><span id="tropical-night">${terraforming.temperature.zones.tropical.night.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>Temperate</td>
            <td><span id="temperate-temp">${terraforming.temperature.zones.temperate.value.toFixed(2)}</span></td>
            <td><span id="temperate-delta"></span></td>
            <td><span id="temperate-day">${terraforming.temperature.zones.temperate.day.toFixed(2)}</span></td>
            <td><span id="temperate-night">${terraforming.temperature.zones.temperate.night.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>Polar</td>
            <td><span id="polar-temp">${terraforming.temperature.zones.polar.value.toFixed(2)}</span></td>
            <td><span id="polar-delta"></span></td>
            <td><span id="polar-day">${terraforming.temperature.zones.polar.day.toFixed(2)}</span></td>
            <td><span id="polar-night">${terraforming.temperature.zones.polar.night.toFixed(2)}</span></td>
          </tr>
        </tbody>
      </table>
    `;

    const tempPenaltySpan = document.createElement('p');
    tempPenaltySpan.id = 'temperature-energy-penalty';
    tempPenaltySpan.textContent = "Colony energy cost multiplier from temperature :"
    temperatureBox.appendChild(tempPenaltySpan);

    const targetSpan = document.createElement('span');
    targetSpan.textContent = "Target : Average between 278.15K and 293.15K.";
    targetSpan.classList.add('terraforming-target')
    targetSpan.style.marginTop = 'auto';
    temperatureBox.appendChild(targetSpan);

    row.appendChild(temperatureBox);
  }
  
  function updateTemperatureBox() {
    const temperatureBox = document.getElementById('temperature-box');

    const temperatureCurrent = document.getElementById('temperature-current');
    temperatureCurrent.textContent = formatNumber(terraforming.temperature.value, false, 2);
  
    const effectiveTempNoAtm = document.getElementById('effective-temp-no-atm');
    effectiveTempNoAtm.textContent = formatNumber(terraforming.temperature.effectiveTempNoAtmosphere, false, 2);
  
    const tropicalTemp = document.getElementById('tropical-temp');
    tropicalTemp.textContent = formatNumber(terraforming.temperature.zones.tropical.value, false, 2);
    const tropicalDelta = document.getElementById('tropical-delta');
    const tropicalChange = terraforming.temperature.zones.tropical.value - terraforming.temperature.zones.tropical.initial;
    tropicalDelta.textContent = `${tropicalChange >= 0 ? '+' : ''}${formatNumber(tropicalChange, false, 2)}`;
    const tropicalDay = document.getElementById('tropical-day');
    tropicalDay.textContent = formatNumber(terraforming.temperature.zones.tropical.day, false, 2);
    const tropicalNight = document.getElementById('tropical-night');
    tropicalNight.textContent = formatNumber(terraforming.temperature.zones.tropical.night, false, 2);
  
    const temperateTemp = document.getElementById('temperate-temp');
    temperateTemp.textContent = formatNumber(terraforming.temperature.zones.temperate.value, false, 2);
    const temperateDelta = document.getElementById('temperate-delta');
    const temperateChange = terraforming.temperature.zones.temperate.value - terraforming.temperature.zones.temperate.initial;
    temperateDelta.textContent = `${temperateChange >= 0 ? '+' : ''}${formatNumber(temperateChange, false, 2)}`;
    const temperateDay = document.getElementById('temperate-day');
    temperateDay.textContent = formatNumber(terraforming.temperature.zones.temperate.day, false, 2);
    const temperateNight = document.getElementById('temperate-night');
    temperateNight.textContent = formatNumber(terraforming.temperature.zones.temperate.night, false, 2);
  
    const polarTemp = document.getElementById('polar-temp');
    polarTemp.textContent = formatNumber(terraforming.temperature.zones.polar.value, false, 2);
    const polarDelta = document.getElementById('polar-delta');
    const polarChange = terraforming.temperature.zones.polar.value - terraforming.temperature.zones.polar.initial;
    polarDelta.textContent = `${polarChange >= 0 ? '+' : ''}${formatNumber(polarChange, false, 2)}`;
    const polarDay = document.getElementById('polar-day');
    polarDay.textContent = formatNumber(terraforming.temperature.zones.polar.day, false, 2);
    const polarNight = document.getElementById('polar-night');
    polarNight.textContent = formatNumber(terraforming.temperature.zones.polar.night, false, 2);

    if(terraforming.getTemperatureStatus()){
      temperatureBox.style.borderColor = 'green';
    } else {
      temperatureBox.style.borderColor = 'red';
    }

    const temperatureEnergyPenalty = document.getElementById('temperature-energy-penalty');
    temperatureEnergyPenalty.textContent = `Colony energy cost multiplier from temperature : ${terraforming.calculateColonyEnergyPenalty().toFixed(2)}`
  }

  function createAtmosphereBox(row) {
    const atmosphereBox = document.createElement('div');
    atmosphereBox.classList.add('terraforming-box');
    atmosphereBox.id = 'atmosphere-box';
  
    let innerHTML = `
      <h3>${terraforming.atmosphere.name}</h3>
      <p>Current: <span id="atmosphere-current"></span> kPa</p>
      <p>Emissivity: <span id="emissivity"></span></p>
      <table>
        <thead>
          <tr>
            <th>Gas</th>
            <th>Pressure (Pa)</th>
            <th>Delta (Pa)</th>
            <th>Target (Pa)</th>
          </tr>
        </thead>
        <tbody>
    `;
  
    for (const gas in terraforming.resources.atmospheric) {
      innerHTML += `
        <tr>
          <td>${terraforming.resources.atmospheric[gas].displayName}</td>
          <td><span id="${gas}-pressure">${formatNumber(calculateGasPressure(gas), false, 2)}</span></td>
          <td><span id="${gas}-delta"></span></td>
          <td><span class='gas-range'>${getGasRangeString(gas)}</span></td>
        </tr>
      `;
    }
  
    innerHTML += `
        </tbody>
      </table>
    `;
  
    atmosphereBox.innerHTML = innerHTML;

    row.appendChild(atmosphereBox);
  }
  
  function updateAtmosphereBox() {
    const atmosphereBox = document.getElementById('atmosphere-box');
    if(terraforming.getAtmosphereStatus()){
      atmosphereBox.style.borderColor = 'green';
    } else {
      atmosphereBox.style.borderColor = 'red';
    }

    const atmosphereCurrent = document.getElementById('atmosphere-current');
    atmosphereCurrent.textContent = terraforming.atmosphere.value.toFixed(2);
  
    const emissivity = document.getElementById('emissivity');
    emissivity.textContent = terraforming.temperature.emissivity.toFixed(2);
  
    for (const gas in terraforming.resources.atmospheric) {
      const gasPressure = document.getElementById(`${gas}-pressure`);
      const currentPressure = calculateGasPressure(gas);
      gasPressure.textContent = formatNumber(currentPressure, false, 2);
  
      const gasInitial = terraforming.atmosphere.gases[gas].initial;
      const gasDelta = document.getElementById(`${gas}-delta`);
      delta = currentPressure - gasInitial;
      gasDelta.textContent = `${delta >= 0 ? '+' : ''}${formatNumber(delta, false, 2)}`;
    }
  }
  
  function createWaterBox(row) {
    const waterBox = document.createElement('div');
    waterBox.classList.add('terraforming-box');
    waterBox.id = 'water-box';
    waterBox.innerHTML = `
      <h3>${terraforming.water.name}</h3>
      <p>Water coverage: <span id="water-current">${(terraforming.water.value * 100).toFixed(2)}</span>%</p>
      <p>Ice coverage: <span id="ice-current">${(terraforming.water.iceValue * 100).toFixed(2)}</span>%</p>
      <table>
        <tr>
          <td>Evaporation rate:</td>
          <td><span id="evaporation-rate">${formatNumber(terraforming.water.evaporationRate)}</span> /s</td>
          <td><span id="evaporation-rate-kg">${formatNumber(terraforming.water.evaporationRate * 1000 / this.celestialParameters.surfaceArea)}</span> kg/m²/s</td>
        </tr>
        <tr>
          <td>Sublimation rate:</td>
          <td><span id="sublimation-rate">${formatNumber(terraforming.water.sublimationRate)}</span> /s</td>
          <td><span id="sublimation-rate-kg">${formatNumber(terraforming.water.sublimationRate * 1000 / this.celestialParameters.surfaceArea)}</span> kg/m²/s</td>
        </tr>
        <tr>
          <td>Rainfall rate:</td>
          <td><span id="rainfall-rate">${formatNumber(terraforming.water.rainfallRate)}</span> /s</td>
          <td><span id="rainfall-rate-kg">${formatNumber(terraforming.water.rainfallRate * 1000 / this.celestialParameters.surfaceArea)}</span> kg/m²/s</td>
        </tr>
        <tr>
          <td>Snowfall rate:</td>
          <td><span id="snowfall-rate">${formatNumber(terraforming.water.snowfallRate)}</span> /s</td>
          <td><span id="snowfall-rate-kg">${formatNumber(terraforming.water.snowfallRate * 1000 / this.celestialParameters.surfaceArea)}</span> kg/m²/s</td>
        </tr>
        <tr>
          <td>Melting rate:</td>
          <td><span id="melting-rate">${formatNumber(terraforming.water.meltingRate)}</span> /s</td>
          <td><span id="melting-rate-kg">${formatNumber(terraforming.water.meltingRate * 1000 / this.celestialParameters.surfaceArea)}</span> kg/m²/s</td>
        </tr>
        <tr>
          <td>Freezing rate:</td>
          <td><span id="freezing-rate">${formatNumber(terraforming.water.freezingRate)}</span> /s</td>
          <td><span id="freezing-rate-kg">${formatNumber(terraforming.water.freezingRate * 1000 / this.celestialParameters.surfaceArea)}</span> kg/m²/s</td>
        </tr>
      </table>
    `;

    const targetSpan = document.createElement('span');
    targetSpan.textContent = "Target : Water coverage > 20%.";
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    waterBox.appendChild(targetSpan);

    row.appendChild(waterBox);
  }
  
  function updateWaterBox() {
    const waterBox = document.getElementById('water-box');
    if(terraforming.getWaterStatus()){
      waterBox.style.borderColor = 'green';
    } else {
      waterBox.style.borderColor = 'red';
    }

    const waterCurrent = document.getElementById('water-current');
    waterCurrent.textContent = (terraforming.water.value * 100).toFixed(2);
  
    const iceCurrent = document.getElementById('ice-current');
    iceCurrent.textContent = (terraforming.water.iceValue * 100).toFixed(2);
  
    const evaporationRate = document.getElementById('evaporation-rate');
    evaporationRate.textContent = formatNumber(terraforming.water.evaporationRate);
  
    const sublimationRate = document.getElementById('sublimation-rate');
    sublimationRate.textContent = formatNumber(terraforming.water.sublimationRate);
  
    const rainfallRate = document.getElementById('rainfall-rate');
    rainfallRate.textContent = formatNumber(terraforming.water.rainfallRate);
  
    const snowfallRate = document.getElementById('snowfall-rate');
    snowfallRate.textContent = formatNumber(terraforming.water.snowfallRate);
  
    const meltingRate = document.getElementById('melting-rate');
    meltingRate.textContent = formatNumber(terraforming.water.meltingRate);
  
    const freezingRate = document.getElementById('freezing-rate');
    freezingRate.textContent = formatNumber(terraforming.water.freezingRate);
  
    const evaporationRateKg = document.getElementById('evaporation-rate-kg');
    evaporationRateKg.textContent = formatNumber(terraforming.water.evaporationRate * 1000 / this.celestialParameters.surfaceArea);
  
    const sublimationRateKg = document.getElementById('sublimation-rate-kg');
    sublimationRateKg.textContent = formatNumber(terraforming.water.sublimationRate * 1000 / this.celestialParameters.surfaceArea);
  
    const rainfallRateKg = document.getElementById('rainfall-rate-kg');
    rainfallRateKg.textContent = formatNumber(terraforming.water.rainfallRate * 1000 / this.celestialParameters.surfaceArea);
  
    const snowfallRateKg = document.getElementById('snowfall-rate-kg');
    snowfallRateKg.textContent = formatNumber(terraforming.water.snowfallRate * 1000 / this.celestialParameters.surfaceArea);
  
    const meltingRateKg = document.getElementById('melting-rate-kg');
    meltingRateKg.textContent = formatNumber(terraforming.water.meltingRate * 1000 / this.celestialParameters.surfaceArea);
  
    const freezingRateKg = document.getElementById('freezing-rate-kg');
    freezingRateKg.textContent = formatNumber(terraforming.water.freezingRate * 1000 / this.celestialParameters.surfaceArea);
  }

  function createLifeBox(row) {
    const lifeBox = document.createElement('div');
    lifeBox.classList.add('terraforming-box');
    lifeBox.id = 'life-box';
    lifeBox.innerHTML = `
      <h3>${terraforming.life.name}</h3>
      <p>Life coverage: <span id="life-current">${(terraforming.life.biomassCoverage * 100).toFixed(2)}</span>%</p>
      `;

    const targetSpan = document.createElement('span');
    targetSpan.textContent = "Target : Life coverage above 50%.";
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    lifeBox.appendChild(targetSpan);

    row.appendChild(lifeBox);
}

function updateLifeBox() {
    const lifeBox = document.getElementById('life-box');
    if(terraforming.getWaterStatus()){
      lifeBox.style.borderColor = 'green';
    } else {
      lifeBox.style.borderColor = 'red';
    }

    // Update life coverage
    const lifeCoverageSpan = document.getElementById('life-current');
    lifeCoverageSpan.textContent = `${(terraforming.life.biomassCoverage * 100).toFixed(2)}`
  }
  
  // Function to create the magnetosphere box, with conditional text based on boolean flag
  function createMagnetosphereBox(row) {
    const magnetosphereBox = document.createElement('div');
    magnetosphereBox.classList.add('terraforming-box');
    magnetosphereBox.id = 'magnetosphere-box';

    const magnetosphereStatusText = projectManager.isBooleanFlagSet('terraforming', 'magneticShield') 
      ? 'The planet is sufficiently protected, providing a 50% boost to life growth' 
      : 'No magnetosphere';

    magnetosphereBox.innerHTML = `
      <h3>${terraforming.magnetosphere.name}</h3>
      <p>Status: <span id="magnetosphere-status">${magnetosphereStatusText}</span></p>
    `;
    
    row.appendChild(magnetosphereBox);
  }

  // Function to update the magnetosphere box with the latest values
  function updateMagnetosphereBox() {
    const magnetosphereBox = document.getElementById('magnetosphere-box');
    const magnetosphereStatus = document.getElementById('magnetosphere-status');

    // Update status based on boolean flag
    const magnetosphereStatusText = terraforming.isBooleanFlagSet('magneticShield') 
      ? 'The planet is sufficiently protected' 
      : 'No magnetosphere';

    magnetosphereStatus.textContent = magnetosphereStatusText;

    if(terraforming.getMagnetosphereStatus()){
      magnetosphereBox.style.borderColor = 'green';
    } else {
      magnetosphereBox.style.borderColor = 'red';
    }
  }
  
  //Luminosity
  function createLuminosityBox(row) {
    const luminosityBox = document.createElement('div');
    luminosityBox.classList.add('terraforming-box');
    luminosityBox.id = 'luminosity-box';
    luminosityBox.innerHTML = `
      <h3>${terraforming.luminosity.name}</h3>
      <p>Base Albedo: <span id="base-albedo">${terraforming.celestialParameters.albedo}</span></p>
      <p>Effective Albedo: <span id="effective-albedo">${terraforming.luminosity.albedo.toFixed(2)}</span></p>
      <p>Base Solar Flux: <span id="solar-flux">${terraforming.luminosity.solarFlux.toFixed(1)}</span> W/m²</p>
      <p>Modified Solar Flux: <span id="modified-solar-flux">${terraforming.luminosity.modifiedSolarFlux.toFixed(1)}</span> W/m²</p>
      <p>Solar panel multiplier: <span id="solar-panel-multiplier">${(terraforming.calculateSolarPanelMultiplier()*100).toFixed(2)}</span>%</p>
    `;
    row.appendChild(luminosityBox);

    const targetSpan = document.createElement('span');
    targetSpan.textContent = "Target : Modified solar flux between 600 and 2000.";
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    luminosityBox.appendChild(targetSpan);
  }
  
  function updateLuminosityBox() {
    const luminosityBox = document.getElementById('luminosity-box');
    if(terraforming.getLuminosityStatus()){
      luminosityBox.style.borderColor = 'green';
    } else {
      luminosityBox.style.borderColor = 'red';
    }

    const effectiveAlbedo = document.getElementById('effective-albedo');
    effectiveAlbedo.textContent = terraforming.luminosity.albedo.toFixed(2);
  
    const solarFlux = document.getElementById('solar-flux');
    solarFlux.textContent = terraforming.luminosity.solarFlux.toFixed(1);
  
    const modifiedSolarFlux = document.getElementById('modified-solar-flux');
    modifiedSolarFlux.textContent = terraforming.luminosity.modifiedSolarFlux.toFixed(1);

    const solarPanelMultiplier = document.getElementById('solar-panel-multiplier');
    solarPanelMultiplier.textContent = `${(terraforming.calculateSolarPanelMultiplier()*100).toFixed(2)}`;
  }

// Function to create the "Complete Terraforming" button
function createCompleteTerraformingButton(container) {
  const button = document.createElement('button');
  button.id = 'complete-terraforming-button';
  button.textContent = 'Complete Terraforming';
  button.style.width = '100%';
  button.style.padding = '15px';
  button.style.marginTop = '20px';
  button.style.backgroundColor = 'red';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.fontSize = '16px';
  button.style.cursor = 'not-allowed';
  button.disabled = true; // Initially disabled

  container.appendChild(button);

    // Add an event listener for the button
    button.addEventListener('click', () => {
      if (!button.disabled) {
          terraforming.completed = true;
      }
  });
}

// Function to update the button state
function updateCompleteTerraformingButton() {
  const button = document.getElementById('complete-terraforming-button');

  if (!button) return;

  if (terraforming.getTerraformingStatus()) {
      button.style.backgroundColor = 'green';
      button.style.cursor = 'pointer';
      button.disabled = false; // Enable the button
  } else {
      button.style.backgroundColor = 'red';
      button.style.cursor = 'not-allowed';
      button.disabled = true; // Disable the button
  }
}