// Function to create the terraforming UI elements
function createTerraformingUI() {
    const terraformingContainer = document.querySelector('.terraforming-container');
  
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
    createMagnetosphereBox(row2);
    createLifeBox(row2);
    createToxicityBox(row2);
  
    // Append the rows to the terraforming container
    terraformingContainer.appendChild(row1);
    terraformingContainer.appendChild(row2);
  }

// Function to update the terraforming UI elements
function updateTerraformingUI() {
    updateTemperatureBox();
    updateAtmosphereBox();
    updateWaterBox();
    updateLifeBox();
    updateMagnetosphereBox();
    updateToxicityBox();
  }

// Functions to create and update each terraforming aspect box

function createTemperatureBox(row) {
    const temperatureBox = document.createElement('div');
    temperatureBox.classList.add('terraforming-box');
    temperatureBox.id = 'temperature-box';
    temperatureBox.innerHTML = `
      <h3>${terraforming.temperature.name}</h3>
      <p>Current: <span id="temperature-current">${terraforming.temperature.value}</span>K</p>
      <p>Target: <span id="temperature-target">${terraforming.temperature.target}</span>K</p>
      <p>Base Albedo: <span id="base-albedo">${terraforming.celestialParameters.albedo}</span></p>
      <p>Ocean Albedo: <span id="ocean-albedo">0.06</span></p>
      <p>Effective Albedo: <span id="effective-albedo">${terraforming.calculateEffectiveAlbedo().toFixed(2)}</span></p>
      <p>Solar Flux: <span id="solar-flux">${terraforming.temperature.solarFlux.toFixed(2)}</span> W/m²</p>
      <p>Effective Temp (No Atm): <span id="effective-temp-no-atm">${terraforming.temperature.effectiveTempNoAtmosphere.toFixed(2)}</span> K</p>
      <p>Emissivity: <span id="emissivity">${terraforming.temperature.emissivity.toFixed(2)}</span></p>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Temperature (K)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tropical</td>
            <td><span id="tropical-temp">${terraforming.temperature.zones.tropical.value.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>Temperate</td>
            <td><span id="temperate-temp">${terraforming.temperature.zones.temperate.value.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>Polar</td>
            <td><span id="polar-temp">${terraforming.temperature.zones.polar.value.toFixed(2)}</span></td>
          </tr>
        </tbody>
      </table>
    `;
    row.appendChild(temperatureBox);
  }
  
  function updateTemperatureBox() {
    const temperatureCurrent = document.getElementById('temperature-current');
    temperatureCurrent.textContent = terraforming.temperature.value.toFixed(1);
  
    const solarFlux = document.getElementById('solar-flux');
    solarFlux.textContent = terraforming.temperature.solarFlux.toFixed(1);

    const effectiveAlbedo = document.getElementById('effective-albedo');
    effectiveAlbedo.textContent = terraforming.calculateEffectiveAlbedo().toFixed(1);

    const effectiveTempNoAtm = document.getElementById('effective-temp-no-atm');
    effectiveTempNoAtm.textContent = terraforming.temperature.effectiveTempNoAtmosphere.toFixed(1);
  
    const emissivity = document.getElementById('emissivity');
    emissivity.textContent = terraforming.temperature.emissivity.toFixed(1);

    const tropicalTemp = document.getElementById('tropical-temp');
    tropicalTemp.textContent = terraforming.temperature.zones.tropical.value.toFixed(1);
  
    const temperateTemp = document.getElementById('temperate-temp');
    temperateTemp.textContent = terraforming.temperature.zones.temperate.value.toFixed(1);
  
    const polarTemp = document.getElementById('polar-temp');
    polarTemp.textContent = terraforming.temperature.zones.polar.value.toFixed(1);
  }

  function createAtmosphereBox(row) {
    const atmosphereBox = document.createElement('div');
    atmosphereBox.classList.add('terraforming-box');
    atmosphereBox.id = 'atmosphere-box';
  
    let innerHTML = `
      <h3>${terraforming.atmosphere.name}</h3>
      <p>Current: <span id="atmosphere-current">${terraforming.atmosphere.value.toFixed(2)}</span> kPa</p>
      <p>Target: <span id="atmosphere-target">${terraforming.atmosphere.target}</span> kPa</p>
      <table>
        <thead>
          <tr>
            <th>Gas</th>
            <th>Pressure (Pa)</th>
          </tr>
        </thead>
        <tbody>
    `;
  
    for (const gas in terraforming.resources.atmospheric) {
      innerHTML += `
        <tr>
          <td>${terraforming.resources.atmospheric[gas].displayName}</td>
          <td><span id="${gas}-pressure">${formatNumber(calculateGasPressure(gas))}</span></td>
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
    const atmosphereCurrent = document.getElementById('atmosphere-current');
    atmosphereCurrent.textContent = terraforming.atmosphere.value.toFixed(2);
  
    for (const gas in terraforming.resources.atmospheric) {
      const gasPressure = document.getElementById(`${gas}-pressure`);
      gasPressure.textContent = formatNumber(calculateGasPressure(gas));
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
        </tr>
        <tr>
          <td>Sublimation rate:</td>
          <td><span id="sublimation-rate">${formatNumber(terraforming.water.sublimationRate)}</span> /s</td>
        </tr>
        <tr>
          <td>Rainfall rate:</td>
          <td><span id="rainfall-rate">${formatNumber(terraforming.water.rainfallRate)}</span> /s</td>
        </tr>
        <tr>
          <td>Snowfall rate:</td>
          <td><span id="snowfall-rate">${formatNumber(terraforming.water.snowfallRate)}</span> /s</td>
        </tr>
        <tr>
          <td>Melting rate:</td>
          <td><span id="melting-rate">${formatNumber(terraforming.water.meltingRate)}</span> /s</td>
        </tr>
        <tr>
          <td>Freezing rate:</td>
          <td><span id="freezing-rate">${formatNumber(terraforming.water.freezingRate)}</span> /s</td>
        </tr>
      </table>
    `;
    row.appendChild(waterBox);
  }
  
  function updateWaterBox() {
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
  }

  function createLifeBox(row) {
    const lifeBox = document.createElement('div');
    lifeBox.classList.add('terraforming-box');
    lifeBox.id = 'life-box';
    lifeBox.innerHTML = `
      <h3>${terraforming.life.name}</h3>
      <p>Current: <span id="life-current">${terraforming.life.value}</span>%</p>
      <p>Target: <span id="life-target">${terraforming.life.target}</span>%</p>
    `;
    row.appendChild(lifeBox);
  }
  
  function updateLifeBox() {
    const lifeCurrent = document.getElementById('life-current');
    lifeCurrent.textContent = terraforming.life.value.toFixed(2);
  }
  
  // Functions to create and update the magnetosphere box
  
  function createMagnetosphereBox(row) {
    const magnetosphereBox = document.createElement('div');
    magnetosphereBox.classList.add('terraforming-box');
    magnetosphereBox.id = 'magnetosphere-box';
    magnetosphereBox.innerHTML = `
      <h3>${terraforming.magnetosphere.name}</h3>
      <p>Current: <span id="magnetosphere-current">${terraforming.magnetosphere.value}</span>%</p>
      <p>Target: <span id="magnetosphere-target">${terraforming.magnetosphere.target}</span>%</p>
    `;
    row.appendChild(magnetosphereBox);
  }
  
  function updateMagnetosphereBox() {
    const magnetosphereCurrent = document.getElementById('magnetosphere-current');
    magnetosphereCurrent.textContent = terraforming.magnetosphere.value.toFixed(2);
  }
  
  // Functions to create and update the toxicity box
  
  function createToxicityBox(row) {
    const toxicityBox = document.createElement('div');
    toxicityBox.classList.add('terraforming-box');
    toxicityBox.id = 'toxicity-box';
    toxicityBox.innerHTML = `
      <h3>${terraforming.toxicity.name}</h3>
      <p>Current: <span id="toxicity-current">${terraforming.toxicity.value}</span>%</p>
      <p>Target: <span id="toxicity-target">${terraforming.toxicity.target}</span>%</p>
    `;
    row.appendChild(toxicityBox);
  }
  
  function updateToxicityBox() {
    const toxicityCurrent = document.getElementById('toxicity-current');
    toxicityCurrent.textContent = terraforming.toxicity.value.toFixed(2);
  }