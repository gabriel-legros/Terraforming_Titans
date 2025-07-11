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

let terraformingTabsInitialized = false;
let terraformingSummaryInitialized = false;

function initializeTerraformingTabs() {
  if (terraformingTabsInitialized) {
    return;
  }

  // Set up event listeners for terraforming sub-tabs
  document.querySelectorAll('.terraforming-subtab').forEach(subtab => {
      subtab.addEventListener('click', () => {
          const subtabContentId = subtab.dataset.subtab;
          activateTerraformingSubtab(subtabContentId);
      });
  });

  // Activate the 'energy' category
  activateTerraformingSubtab('summary-terraforming');

  terraformingTabsInitialized = true;
}

function activateTerraformingSubtab(subtabId) {
  // Remove active class from all subtabs and subtab-contents
  document.querySelectorAll('.terraforming-subtab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.terraforming-subtab-content').forEach((t) => t.classList.remove('active'));
  
  // Add active class to the clicked subtab and corresponding content
  document.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');
  document.getElementById(subtabId).classList.add('active');

  if(subtabId === 'milestone-terraforming' && typeof markMilestonesViewed === 'function') {
    markMilestonesViewed();
  }
}

function createTerraformingSummaryUI() {
    if (terraformingSummaryInitialized) {
      return;
    }

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

    terraformingSummaryInitialized = true;
  }

// Function to update the terraforming UI elements
function updateTerraformingUI() {
    updatePlayTimeDisplay();
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

function updatePlayTimeDisplay() {
    const el = document.getElementById('play-time-display');
    if (!el) return;
    el.textContent = `Time since awakening : ${formatPlayTime(playTimeSeconds)}`;
}

// Functions to create and update each terraforming aspect box

function createTemperatureBox(row) {
    const temperatureBox = document.createElement('div');
    temperatureBox.classList.add('terraforming-box');
    temperatureBox.id = 'temperature-box';
    const tempInfo = document.createElement('span');
    tempInfo.classList.add('info-tooltip-icon');
    tempInfo.title = 'Temperature is a critical factor for terraforming. It\'s determined by a complex interplay of factors:\n\n- Key Equations: The model uses the Stefan-Boltzmann law to calculate the effective temperature from solar flux and albedo. The greenhouse effect is then added based on the atmosphere\'s optical depth, and the day-night temperature variation is calculated based on the planet\'s heat capacity and rotation speed.\n- Solar Flux: The base energy received from the star, which can be augmented by structures like Space Mirrors.\n- Albedo: The planet\'s reflectivity. A high albedo (from ice and clouds) reflects more light, cooling the planet. A low albedo (from oceans and dark rock) absorbs more light, warming it.\n- Greenhouse Effect: Atmospheric gases like CO2, H2O, and CH4 trap heat. The amount of trapping is determined by the atmosphere\'s optical depth, which depends on the partial pressures of these gases and the total atmospheric pressure.\n- Rotation Speed: A slower rotation leads to more extreme temperature differences between day and night.\n- Heat Capacity: The planet\'s ability to store and release heat, influenced by its surface composition (rock, ocean, ice) and atmospheric density.\n\nTemperature directly impacts:\n- Water Cycle: Driving evaporation, sublimation, melting, and freezing.\n- Life: Each species has specific temperature ranges for survival and growth.\n- Colonist Comfort: Extreme temperatures increase energy consumption for life support.';
    tempInfo.innerHTML = '&#9432;';
    temperatureBox.innerHTML = `
      <h3>${terraforming.temperature.name}</h3>
      <p>Current average: <span id="temperature-current"></span><span class="temp-unit"></span></p>
      <p>Effective Temp (No Atm): <span id="effective-temp-no-atm"></span> <span class="temp-unit"></span></p>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>T (<span class="temp-unit"></span>)</th>
            <th>Delta (<span class="temp-unit"></span>)</th>
            <th>Day (<span class="temp-unit"></span>)</th>
            <th>Night (<span class="temp-unit"></span>)</th>
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
    const temperatureHeading = temperatureBox.querySelector('h3');
    if (temperatureHeading) {
      temperatureHeading.appendChild(tempInfo);
    }

    const tempPenaltySpan = document.createElement('p');
    tempPenaltySpan.id = 'temperature-energy-penalty';
    tempPenaltySpan.textContent = "Colony energy cost multiplier from temperature :"
    temperatureBox.appendChild(tempPenaltySpan);

    const targetSpan = document.createElement('span');
    targetSpan.id = 'temperature-target';
    targetSpan.textContent = "";
    targetSpan.classList.add('terraforming-target')
    targetSpan.style.marginTop = 'auto';
    temperatureBox.appendChild(targetSpan);

    row.appendChild(temperatureBox);
  }
  
  function updateTemperatureBox() {
    const temperatureBox = document.getElementById('temperature-box');

    const unit = getTemperatureUnit();
    temperatureBox.querySelectorAll('.temp-unit').forEach(el => el.textContent = unit);
    const targetSpan = document.getElementById('temperature-target');
    if(targetSpan){
      targetSpan.textContent = `Target : Average between ${formatNumber(toDisplayTemperature(278.15), false, 2)}${unit} and ${formatNumber(toDisplayTemperature(293.15), false, 2)}${unit}.`;
    }

    const temperatureCurrent = document.getElementById('temperature-current');
    temperatureCurrent.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.value), false, 2);
  
    const effectiveTempNoAtm = document.getElementById('effective-temp-no-atm');
    effectiveTempNoAtm.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.effectiveTempNoAtmosphere), false, 2);
  
    const tropicalTemp = document.getElementById('tropical-temp');
    tropicalTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.value), false, 2);
    const tropicalDelta = document.getElementById('tropical-delta');
    const tropicalChange = terraforming.temperature.zones.tropical.value - terraforming.temperature.zones.tropical.initial;
    tropicalDelta.textContent = `${tropicalChange >= 0 ? '+' : ''}${formatNumber(tropicalChange, false, 2)}`;
    const tropicalDay = document.getElementById('tropical-day');
    tropicalDay.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.day), false, 2);
    const tropicalNight = document.getElementById('tropical-night');
    tropicalNight.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.night), false, 2);
  
    const temperateTemp = document.getElementById('temperate-temp');
    temperateTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.value), false, 2);
    const temperateDelta = document.getElementById('temperate-delta');
    const temperateChange = terraforming.temperature.zones.temperate.value - terraforming.temperature.zones.temperate.initial;
    temperateDelta.textContent = `${temperateChange >= 0 ? '+' : ''}${formatNumber(temperateChange, false, 2)}`;
    const temperateDay = document.getElementById('temperate-day');
    temperateDay.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.day), false, 2);
    const temperateNight = document.getElementById('temperate-night');
    temperateNight.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.night), false, 2);
  
    const polarTemp = document.getElementById('polar-temp');
    polarTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.value), false, 2);
    const polarDelta = document.getElementById('polar-delta');
    const polarChange = terraforming.temperature.zones.polar.value - terraforming.temperature.zones.polar.initial;
    polarDelta.textContent = `${polarChange >= 0 ? '+' : ''}${formatNumber(polarChange, false, 2)}`;
    const polarDay = document.getElementById('polar-day');
    polarDay.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.day), false, 2);
    const polarNight = document.getElementById('polar-night');
    polarNight.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.night), false, 2);

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
    const atmInfo = document.createElement('span');
    atmInfo.classList.add('info-tooltip-icon');
    atmInfo.title = 'The atmosphere is the gaseous envelope of the planet, critical for life and climate.\n\n- Composition: The mix of gases (Nitrogen, Oxygen, CO2, etc.) determines its properties. Each gas has a partial pressure, and the sum is the total atmospheric pressure.\n- Greenhouse Effect: Gases like CO2, Water Vapor, and Methane trap heat, warming the planet. This is quantified by the Optical Depth. A higher optical depth means a stronger greenhouse effect and higher temperatures.\n- Pressure & Density: Higher pressure increases the efficiency of wind turbines. It\'s also necessary to maintain liquid water on the surface and for colonists\' life support.\n- Atmospheric-Surface Interactions: The atmosphere facilitates the water and hydrocarbon cycles through evaporation and condensation. It also interacts with life, with organisms both consuming and producing atmospheric gases.';
    atmInfo.innerHTML = '&#9432;';

    let innerHTML = `
      <h3>${terraforming.atmosphere.name}</h3>
      <p>Current: <span id="atmosphere-current"></span> kPa</p>
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
  
    // Iterate through gases defined in the global resources to build the table structure
    for (const gas in resources.atmospheric) {
        innerHTML += `
          <tr>
            <td>${resources.atmospheric[gas].displayName}</td>
            <td><span id="${gas}-pressure">0.00</span></td> <!-- Initial placeholder, updated by updateAtmosphereBox -->
            <td><span id="${gas}-delta">N/A</span></td> <!-- Initial placeholder -->
            <td><span class='gas-range'>${getGasRangeString(gas)}</span></td>
          </tr>
        `;
    }
  
    innerHTML += `
        </tbody>
      </table>
      <p class="no-margin">Optical depth: <span id="optical-depth"></span></p>
      <p class="no-margin">Wind turbine multiplier: <span id="wind-turbine-multiplier">${(terraforming.calculateWindTurbineMultiplier()*100).toFixed(2)}</span>%</p>
    `;
  
    atmosphereBox.innerHTML = innerHTML;
    const atmosphereHeading = atmosphereBox.querySelector('h3');
    if (atmosphereHeading) {
      atmosphereHeading.appendChild(atmInfo);
    }

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
    // Calculate total pressure on the fly
    atmosphereCurrent.textContent = terraforming.calculateTotalPressure().toFixed(2);

    const opticalDepth = document.getElementById('optical-depth');
    if (opticalDepth) {
      opticalDepth.textContent = terraforming.temperature.opticalDepth.toFixed(2);
    }


    const windMultiplier = document.getElementById('wind-turbine-multiplier');
    if (windMultiplier) {
      windMultiplier.textContent = `${(terraforming.calculateWindTurbineMultiplier()*100).toFixed(2)}`;
    }
  
    // Iterate through gases defined in the global resources (which the UI table expects)
    for (const gas in resources.atmospheric) {
        // Calculate current global pressure for this gas on the fly (in Pa)
        const currentAmount = resources.atmospheric[gas]?.value || 0;
        const currentGlobalPressurePa = calculateAtmosphericPressure(
            currentAmount,
            terraforming.celestialParameters.gravity,
            terraforming.celestialParameters.radius
        );

        const gasPressureElement = document.getElementById(`${gas}-pressure`);
        if (gasPressureElement) {
            // Display the pressure in Pa
            gasPressureElement.textContent = formatNumber(currentGlobalPressurePa, false, 2);
        }

        // Calculate initial pressure from initial parameters
        const initialAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;
        const initialGlobalPressurePa = calculateAtmosphericPressure(
             initialAmount,
             terraforming.celestialParameters.gravity,
             terraforming.celestialParameters.radius
        );

        const gasDeltaElement = document.getElementById(`${gas}-delta`);
        if (gasDeltaElement) {
            const delta = currentGlobalPressurePa - initialGlobalPressurePa; // Delta in Pa
            gasDeltaElement.textContent = `${delta >= 0 ? '+' : ''}${formatNumber(delta, false, 2)}`;
        }
    }
  }
  
function createWaterBox(row) {
    const waterBox = document.createElement('div');
    waterBox.classList.add('terraforming-box');
    waterBox.id = 'water-box';
    const waterInfo = document.createElement('span');
    waterInfo.classList.add('info-tooltip-icon');
    waterInfo.title = 'The planetary water cycle is a dynamic system crucial for climate and life, governed by physical equations:\n\n- Evaporation & Sublimation: Calculated using a modified Penman equation, which considers solar flux, temperature, and atmospheric pressure to determine the rate at which water becomes vapor.\n- Precipitation: Occurs when atmospheric water vapor exceeds the saturation point, calculated by the Buck Equation. The excess moisture falls as rain or snow depending on the temperature.\n- Melting & Freezing: These rates are determined by a linear relationship to how far the temperature is above or below the freezing point (273.15K).\n- Surface Flow: A realistic fluid dynamics model where flow is proportional to the square root of the level difference between zones, adjusted for elevation and viscosity. Ice can also melt and flow from colder to warmer zones.\n- Impact: The resulting water and ice coverage affects planetary albedo, temperature, and the potential for life.';
    waterInfo.innerHTML = '&#9432;';
    // Use static text/placeholders, values will be filled by updateWaterBox
    waterBox.innerHTML = `
      <h3>Water</h3>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value (t/s)</th>
            <th>Rate (kg/m²/s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Evaporation rate</td>
            <td><span id="evaporation-rate">N/A</span></td>
            <td><span id="evaporation-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>Sublimation rate</td>
            <td><span id="sublimation-rate">N/A</span></td>
            <td><span id="sublimation-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>Rainfall rate</td>
            <td><span id="rainfall-rate">N/A</span></td>
            <td><span id="rainfall-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>Snowfall rate</td>
            <td><span id="snowfall-rate">N/A</span></td>
            <td><span id="snowfall-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>Melting rate</td>
            <td><span id="melting-rate">N/A</span></td>
            <td><span id="melting-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>Freezing rate</td>
            <td><span id="freezing-rate">N/A</span></td>
            <td><span id="freezing-rate-kg">N/A</span></td>
          </tr>
        </tbody>
      </table>
      <p class="no-margin">Water coverage: <span id="water-current">0.00</span>%</p>
      <p class="no-margin">Ice coverage: <span id="ice-current">0.00</span>%</p>
    `;

    const waterHeading = waterBox.querySelector('h3');
    if (waterHeading) {
      waterHeading.appendChild(waterInfo);
    }

    const targetSpan = document.createElement('span');
    targetSpan.textContent = "Target : Water coverage > 20%.";
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    waterBox.appendChild(targetSpan);

    row.appendChild(waterBox);
  }

  function formatWaterRate(value) {
    return formatNumber(Math.abs(value) < 1e-4 ? 0 : value);
  }
  
  function updateWaterBox() {
    const waterBox = document.getElementById('water-box');
    const zones = ZONES;
    const surfaceArea = terraforming.celestialParameters.surfaceArea;

    // Totals are no longer calculated here; they are read from terraforming object
    // let totalLiquid = 0; // Not needed for rate display
    // let totalIce = 0; // Not needed for rate display
    // let totalEvaporationRate = 0; // Read from terraforming.totalEvaporationRate
    // let totalSublimationRate = 0; // Read from terraforming.totalWaterSublimationRate
    // let totalRainfallRate = 0; // Read from terraforming.totalRainfallRate
    // let totalSnowfallRate = 0; // Read from terraforming.totalSnowfallRate
    // let totalMeltingRate = 0; // Read from terraforming.totalMeltRate
    // let totalFreezingRate = 0; // Read from terraforming.totalFreezeRate

    // zones.forEach(zone => { // Loop no longer needed for rates
    //     totalLiquid += terraforming.zonalWater[zone].liquid || 0;
    //     totalIce += terraforming.zonalWater[zone].ice || 0;
    //     // Remove rate summing from zonal data
    // });

    // Calculate average coverage percentages using the centralized helper function

    const avgLiquidCoverage = calculateAverageCoverage(terraforming, 'liquidWater');
    const avgIceCoverage = calculateAverageCoverage(terraforming, 'ice');

    // Update border based on average liquid coverage vs target
    if (avgLiquidCoverage > terraforming.waterTarget) { // Use the stored global target
        waterBox.style.borderColor = 'green';
    } else {
        waterBox.style.borderColor = 'red';
    }

    // Update UI elements
    const waterCurrent = document.getElementById('water-current');
    waterCurrent.textContent = (avgLiquidCoverage * 100).toFixed(2);

    const iceCurrent = document.getElementById('ice-current');
    iceCurrent.textContent = (avgIceCoverage * 100).toFixed(2);

    // Update rates (displaying total tons/s from terraforming object)
    document.getElementById('evaporation-rate').textContent = formatWaterRate(terraforming.totalEvaporationRate);
    document.getElementById('sublimation-rate').textContent = formatWaterRate(terraforming.totalWaterSublimationRate); // Corrected property name
    document.getElementById('rainfall-rate').textContent = formatWaterRate(terraforming.totalRainfallRate);
    document.getElementById('snowfall-rate').textContent = formatWaterRate(terraforming.totalSnowfallRate);
    document.getElementById('melting-rate').textContent = formatWaterRate(terraforming.totalMeltRate); // Corrected property name
    document.getElementById('freezing-rate').textContent = formatWaterRate(terraforming.totalFreezeRate); // Corrected property name

    // Update rates (displaying kg/m²/s average)
    const safeSurfaceArea = surfaceArea > 0 ? surfaceArea : 1; // Avoid division by zero
    document.getElementById('evaporation-rate-kg').textContent = formatWaterRate(terraforming.totalEvaporationRate * 1000 / safeSurfaceArea);
    // Use the stored total rates from terraforming object for kg/m²/s display
    const sublimationRateKg = document.getElementById('sublimation-rate-kg');
    sublimationRateKg.textContent = formatWaterRate(terraforming.totalWaterSublimationRate * 1000 / safeSurfaceArea); // Corrected property name

    const rainfallRateKg = document.getElementById('rainfall-rate-kg');
    rainfallRateKg.textContent = formatWaterRate(terraforming.totalRainfallRate * 1000 / safeSurfaceArea);

    const snowfallRateKg = document.getElementById('snowfall-rate-kg');
    snowfallRateKg.textContent = formatWaterRate(terraforming.totalSnowfallRate * 1000 / safeSurfaceArea);

    const meltingRateKg = document.getElementById('melting-rate-kg');
    meltingRateKg.textContent = formatWaterRate(terraforming.totalMeltRate * 1000 / safeSurfaceArea); // Corrected property name

    const freezingRateKg = document.getElementById('freezing-rate-kg');
    freezingRateKg.textContent = formatWaterRate(terraforming.totalFreezeRate * 1000 / safeSurfaceArea); // Corrected property name
  }

  function createLifeBox(row) {
    const lifeBox = document.createElement('div');
    lifeBox.classList.add('terraforming-box');
    lifeBox.id = 'life-box';
    const lifeInfo = document.createElement('span');
    lifeInfo.classList.add('info-tooltip-icon');
    lifeInfo.title = 'Life is the pinnacle of the terraforming process. It is introduced via the Life Designer and its success depends on environmental conditions.\n\n- Environmental Tolerance: Each lifeform has specific temperature and moisture ranges required for survival and growth. It can only spread in zones where these conditions are met.\n- Atmospheric Interaction: Life can significantly alter the atmosphere through processes like photosynthesis (consuming CO2, producing O2) and respiration.\n- Terraforming Goal: Achieving a high percentage of biomass coverage is a key objective for completing the terraforming of a planet.';
    lifeInfo.innerHTML = '&#9432;';
    // Use static text/placeholders, values will be filled by updateLifeBox
    lifeBox.innerHTML = `
      <h3>Life</h3> <!-- Static name -->
      <table id="life-coverage-table">
        <thead>
          <tr>
            <th>Region</th>
            <th>Coverage (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Overall</td><td id="life-coverage-overall">0.00</td></tr>
          <tr><td>Polar</td><td id="life-coverage-polar">0.00</td></tr>
          <tr><td>Temperate</td><td id="life-coverage-temperate">0.00</td></tr>
          <tr><td>Tropical</td><td id="life-coverage-tropical">0.00</td></tr>
        </tbody>
      </table>
      <table id="life-luminosity-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Photosynthesis Multiplier (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Tropical</td><td id="life-luminosity-tropical">0.00</td></tr>
          <tr><td>Temperate</td><td id="life-luminosity-temperate">0.00</td></tr>
          <tr><td>Polar</td><td id="life-luminosity-polar">0.00</td></tr>
        </tbody>
      </table>
      `;

    const lifeHeading = lifeBox.querySelector('h3');
    if (lifeHeading) {
      lifeHeading.appendChild(lifeInfo);
    }

    const targetSpan = document.createElement('span');
    targetSpan.textContent = "Target : Life coverage above 50%.";
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    lifeBox.appendChild(targetSpan);

    row.appendChild(lifeBox);
}

function updateLifeBox() {
    const lifeBox = document.getElementById('life-box');
    const zones = ZONES;
    const surfaceArea = terraforming.celestialParameters.surfaceArea;

    // Calculate total biomass from zonal data
    let totalBiomass = 0;
    zones.forEach(zone => {
        totalBiomass += terraforming.zonalSurface[zone].biomass || 0;
    });

    // Calculate average biomass coverage percentage using the centralized helper function
    const avgBiomassCoverage = calculateAverageCoverage(terraforming, 'biomass');

    // Update border based on average biomass coverage vs target
    // TODO: The getLifeStatus function itself needs updating in terraforming.js
    //       to use the new avgBiomassCoverage calculation. For now, we replicate the check.
    if (avgBiomassCoverage > terraforming.life.target) {
        lifeBox.style.borderColor = 'green';
    } else {
        lifeBox.style.borderColor = 'red';
    }

    // Calculate zonal coverage percentages
    const polarCov = calculateZonalCoverage(terraforming, 'polar', 'biomass');
    const temperateCov = calculateZonalCoverage(terraforming, 'temperate', 'biomass');
    const tropicalCov = calculateZonalCoverage(terraforming, 'tropical', 'biomass');

    // Update life coverage display
    const overallEl = document.getElementById('life-coverage-overall');
    if (overallEl) overallEl.textContent = (avgBiomassCoverage * 100).toFixed(2);
    const polarEl = document.getElementById('life-coverage-polar');
    if (polarEl) polarEl.textContent = (polarCov * 100).toFixed(2);
    const temperateEl = document.getElementById('life-coverage-temperate');
    if (temperateEl) temperateEl.textContent = (temperateCov * 100).toFixed(2);
    const tropicalEl = document.getElementById('life-coverage-tropical');
    if (tropicalEl) tropicalEl.textContent = (tropicalCov * 100).toFixed(2);

    const lumTrop = document.getElementById('life-luminosity-tropical');
    if (lumTrop) lumTrop.textContent = (terraforming.calculateZonalSolarPanelMultiplier('tropical')*100).toFixed(2);
    const lumTemp = document.getElementById('life-luminosity-temperate');
    if (lumTemp) lumTemp.textContent = (terraforming.calculateZonalSolarPanelMultiplier('temperate')*100).toFixed(2);
    const lumPolar = document.getElementById('life-luminosity-polar');
    if (lumPolar) lumPolar.textContent = (terraforming.calculateZonalSolarPanelMultiplier('polar')*100).toFixed(2);
  }
  
  // Function to create the magnetosphere box, with conditional text based on boolean flag
  function createMagnetosphereBox(row) {
    const magnetosphereBox = document.createElement('div');
    magnetosphereBox.classList.add('terraforming-box');
    magnetosphereBox.id = 'magnetosphere-box';
    const magInfo = document.createElement('span');
    magInfo.classList.add('info-tooltip-icon');
    magInfo.title = 'The magnetosphere is a planet\'s magnetic shield against harmful solar wind and cosmic radiation.\n\n- Protection: A strong magnetosphere prevents the solar wind from stripping away the planet\'s atmosphere over time, making long-term habitability possible.\n- Life Support: It shields surface life from damaging radiation, which is essential for complex organisms to thrive. Activating the magnetic shield provides a significant boost to life growth rates.\n- Terraforming Goal: Establishing a magnetosphere is a critical step for securing a planet\'s atmosphere and biosphere, making it a key terraforming objective.';
    magInfo.innerHTML = '&#9432;';

    const magnetosphereStatusText = projectManager.isBooleanFlagSet('terraforming', 'magneticShield')
      ? 'The planet is sufficiently protected, providing a 50% boost to life growth'
      : 'No magnetosphere';

    magnetosphereBox.innerHTML = `
      <h3>${terraforming.magnetosphere.name}</h3>
      <p>Status: <span id="magnetosphere-status">${magnetosphereStatusText}</span></p>
    `;
    const magnetosphereHeading = magnetosphereBox.querySelector('h3');
    if (magnetosphereHeading) {
      magnetosphereHeading.appendChild(magInfo);
    }

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
    const lumInfo = document.createElement('span');
    lumInfo.classList.add('info-tooltip-icon');
    lumInfo.title = 'Luminosity measures the total solar energy (flux) reaching the planet\'s surface, which is the primary driver of its climate.\n\n- Solar Flux: The base energy is determined by the star\'s output and the planet\'s distance from it. This can be augmented by building orbital structures like Space Mirrors.\n- Albedo: The planet\'s reflectivity. A portion of the incoming flux is reflected back into space. This is determined by the mix of surface types (rock, ocean, ice, biomass) and cloud cover. A lower albedo means more energy is absorbed.\n- Impact: The final modified solar flux directly determines the planet\'s temperature, the efficiency of solar panels, and the growth rate of photosynthetic life.';
    lumInfo.innerHTML = '&#9432;';
    luminosityBox.innerHTML = `
      <h3>${terraforming.luminosity.name}</h3>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Albedo <span class="info-tooltip-icon" title="Albedo is the measure of reflectivity. Key values:\n- Rock (Base): Varies by planet\n- Ocean: 0.06\n- Water Ice: 0.6\n- Dry Ice: 0.6\n- Biomass: 0.20\n- Black Dust: 0.05\n- Methane Ocean: 0.1">&#9432;</span></td>
            <td><span id="effective-albedo">${terraforming.luminosity.albedo.toFixed(2)}</span></td>
            <td><span id="albedo-delta"></span></td>
          </tr>
          <tr>
            <td>Solar Flux (W/m²)</td>
            <td><span id="modified-solar-flux">${terraforming.luminosity.modifiedSolarFlux.toFixed(1)}</span><span id="solar-flux-breakdown" class="info-tooltip-icon" title="">&#9432;</span></td>
            <td><span id="solar-flux-delta"></span></td>
          </tr>
        </tbody>
      </table>
      <p>Solar panel multiplier: <span id="solar-panel-multiplier">${(terraforming.calculateSolarPanelMultiplier()*100).toFixed(2)}</span>%</p>
    `;
    const luminosityHeading = luminosityBox.querySelector('h3');
    if (luminosityHeading) {
      luminosityHeading.appendChild(lumInfo);
    }
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
    if (effectiveAlbedo) {
      effectiveAlbedo.textContent = terraforming.luminosity.albedo.toFixed(2);
    }

    const albedoDeltaEl = document.getElementById('albedo-delta');
    if (albedoDeltaEl) {
      const deltaA = terraforming.luminosity.albedo - terraforming.celestialParameters.albedo;
      albedoDeltaEl.textContent = `${deltaA >= 0 ? '+' : ''}${formatNumber(deltaA, false, 2)}`;
    }

    const modifiedSolarFlux = document.getElementById('modified-solar-flux');
    if (modifiedSolarFlux) {
      modifiedSolarFlux.textContent = terraforming.luminosity.modifiedSolarFlux.toFixed(1);
    }

    const solarFluxDeltaEl = document.getElementById('solar-flux-delta');
    if (solarFluxDeltaEl) {
      const deltaF = terraforming.luminosity.modifiedSolarFlux - terraforming.luminosity.solarFlux;
      solarFluxDeltaEl.textContent = `${deltaF >= 0 ? '+' : ''}${formatNumber(deltaF, false, 2)}`;
    }

    const fluxTooltip = document.getElementById('solar-flux-breakdown');
    if (fluxTooltip && terraforming.luminosity.zonalFluxes) {
      const z = terraforming.luminosity.zonalFluxes;
      fluxTooltip.title = `Tropical: ${z.tropical.toFixed(1)}\nTemperate: ${z.temperate.toFixed(1)}\nPolar: ${z.polar.toFixed(1)}`;
    }

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
        if (typeof spaceManager !== 'undefined') {
            spaceManager.updateCurrentPlanetTerraformedStatus(true);
        }
        // Refresh the space UI so the new status is displayed immediately
        if (typeof updateSpaceUI === 'function') {
            updateSpaceUI();
        }
        // Re-evaluate the button state after completing terraforming
        if (typeof updateCompleteTerraformingButton === 'function') {
            updateCompleteTerraformingButton();
        }
    }
  });
}

// Function to update the button state
function updateCompleteTerraformingButton() {
  const button = document.getElementById('complete-terraforming-button');

  if (!button) return;

  if (terraforming.readyForCompletion) {
      button.style.backgroundColor = 'green';
      button.style.cursor = 'pointer';
      button.disabled = false; // Enable the button
  } else {
      button.style.backgroundColor = 'red';
      button.style.cursor = 'not-allowed';
      button.disabled = true; // Disable the button
  }
}