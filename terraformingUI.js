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
    createLuminosityBox(row2);
    createLifeBox(row2);
    createMagnetosphereBox(row2);
  
    // Append the rows to the terraforming container
    terraformingContainer.appendChild(row1);
    terraformingContainer.appendChild(row2);
  }

// Function to update the terraforming UI elements
function updateTerraformingUI() {
    updateTemperatureBox();
    updateAtmosphereBox();
    updateWaterBox();
    updateLuminosityBox();
    updateLifeBox();
    updateMagnetosphereBox();
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
            <th>Temperature (K)</th>
            <th>Delta (K)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tropical</td>
            <td><span id="tropical-temp">${terraforming.temperature.zones.tropical.value.toFixed(2)}</span></td>
            <td><span id="tropical-delta"></span></td>
          </tr>
          <tr>
            <td>Temperate</td>
            <td><span id="temperate-temp">${terraforming.temperature.zones.temperate.value.toFixed(2)}</span></td>
            <td><span id="temperate-delta"></span></td>
          </tr>
          <tr>
            <td>Polar</td>
            <td><span id="polar-temp">${terraforming.temperature.zones.polar.value.toFixed(2)}</span></td>
            <td><span id="polar-delta"></span></td>
          </tr>
        </tbody>
      </table>
    `;
    row.appendChild(temperatureBox);
  }
  
  function updateTemperatureBox() {
    const temperatureCurrent = document.getElementById('temperature-current');
    temperatureCurrent.textContent = formatNumber(terraforming.temperature.value, false, 2);
  
    const effectiveTempNoAtm = document.getElementById('effective-temp-no-atm');
    effectiveTempNoAtm.textContent = formatNumber(terraforming.temperature.effectiveTempNoAtmosphere, false, 2);
  
    const tropicalTemp = document.getElementById('tropical-temp');
    tropicalTemp.textContent = formatNumber(terraforming.temperature.zones.tropical.value, false, 2);
    const tropicalDelta = document.getElementById('tropical-delta');
    const tropicalChange = terraforming.temperature.zones.tropical.value - terraforming.temperature.zones.tropical.initial;
    tropicalDelta.textContent = `${tropicalChange >= 0 ? '+' : ''}${formatNumber(tropicalChange, false, 2)}`;
  
    const temperateTemp = document.getElementById('temperate-temp');
    temperateTemp.textContent = formatNumber(terraforming.temperature.zones.temperate.value, false, 2);
    const temperateDelta = document.getElementById('temperate-delta');
    const temperateChange = terraforming.temperature.zones.temperate.value - terraforming.temperature.zones.temperate.initial;
    temperateDelta.textContent = `${temperateChange >= 0 ? '+' : ''}${formatNumber(temperateChange, false, 2)}`;
  
    const polarTemp = document.getElementById('polar-temp');
    polarTemp.textContent = formatNumber(terraforming.temperature.zones.polar.value, false, 2);
    const polarDelta = document.getElementById('polar-delta');
    const polarChange = terraforming.temperature.zones.polar.value - terraforming.temperature.zones.polar.initial;
    polarDelta.textContent = `${polarChange >= 0 ? '+' : ''}${formatNumber(polarChange, false, 2)}`;
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
  
    const emissivity = document.getElementById('emissivity');
    emissivity.textContent = terraforming.temperature.emissivity.toFixed(2);
  
    for (const gas in terraforming.resources.atmospheric) {
      const gasPressure = document.getElementById(`${gas}-pressure`);
      const currentPressure = calculateGasPressure(gas);
      gasPressure.textContent = formatNumber(currentPressure, false, 2);
  
      const gasInitial = terraforming.atmosphere.gases[gas].initial;
      const gasDelta = document.getElementById(`${gas}-delta`);
      delta = currentPressure - gasInitial;
      if(Math.abs(delta) < 0.01){
        delta = 0;
      }
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
      <h3>${terraforming.life.name}</h3>`;

    // Create a table for life parameters with headers
    const lifeTable = document.createElement('table');
    lifeTable.id = 'life-parameters-table';
    lifeTable.classList.add('life-parameters-table');
    lifeTable.innerHTML = `
      <thead>
        <tr>
          <th>Life Type</th>
          <th>Tmin (K)</th>
          <th>Tmax (K)</th>
          <th>Rain Req.</th>
          <th>Growth Rate</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    // Append rows for each life type but initially hide them
    const lifeTableBody = lifeTable.querySelector('tbody');
    for (const [lifeType, params] of Object.entries(lifeParameters)) {
        const row = document.createElement('tr');
        row.id = `${lifeType}-row`; // Unique ID for each life type row
        row.style.display = 'none'; // Initially hidden
        row.innerHTML = `
          <td>${lifeType.charAt(0).toUpperCase() + lifeType.slice(1)}</td>
          <td>${params.minTemperature}</td>
          <td>${params.maxTemperature}</td>
          <td>${formatNumber(params.minRainfall, true)}</td>
          <td>${params.growthRate.toFixed(4)}</td>
        `;
        lifeTableBody.appendChild(row);
    }

    lifeBox.appendChild(lifeTable);
    row.appendChild(lifeBox);
}

function updateLifeBox() {
    // Update visibility of each life type row based on the boolean flag status
    for (const lifeType in lifeParameters) {
        const lifeRow = document.getElementById(`${lifeType}-row`);
        if (lifeRow) {
            // Toggle visibility based on whether the flag is set
            lifeRow.style.display = terraforming.isBooleanFlagSet(lifeType) ? 'table-row' : 'none';
        }
    }
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
    const magnetosphereStatus = document.getElementById('magnetosphere-status');

    // Update status based on boolean flag
    const magnetosphereStatusText = terraforming.isBooleanFlagSet('magneticShield') 
      ? 'The planet is sufficiently protected, providing a 50% boost to life growth' 
      : 'No magnetosphere';

    magnetosphereStatus.textContent = magnetosphereStatusText;
  }
  
  //Luminosity
  function createLuminosityBox(row) {
    const luminosityBox = document.createElement('div');
    luminosityBox.classList.add('terraforming-box');
    luminosityBox.id = 'luminosity-box';
    luminosityBox.innerHTML = `
      <h3>${terraforming.luminosity.name}</h3>
      <p>Base Albedo: <span id="base-albedo">${terraforming.celestialParameters.albedo}</span></p>
      <p>Ocean Albedo: <span id="ocean-albedo">0.06</span></p>
      <p>Effective Albedo: <span id="effective-albedo">${terraforming.luminosity.albedo.toFixed(2)}</span></p>
      <p>Solar Flux: <span id="solar-flux">${terraforming.luminosity.solarFlux.toFixed(1)}</span> W/m²</p>
      <p>Modified Solar Flux: <span id="modified-solar-flux">${terraforming.luminosity.modifiedSolarFlux.toFixed(1)}</span> W/m²</p>
    `;
    row.appendChild(luminosityBox);
  }
  
  function updateLuminosityBox() {

    const effectiveAlbedo = document.getElementById('effective-albedo');
    effectiveAlbedo.textContent = terraforming.luminosity.albedo.toFixed(2);
  
    const solarFlux = document.getElementById('solar-flux');
    solarFlux.textContent = terraforming.luminosity.solarFlux.toFixed(1);
  
    const modifiedSolarFlux = document.getElementById('modified-solar-flux');
    modifiedSolarFlux.textContent = terraforming.luminosity.modifiedSolarFlux.toFixed(1);
  }