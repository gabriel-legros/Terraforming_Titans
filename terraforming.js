class Terraforming {
    constructor(resources, celestialParameters) {
      this.resources = resources;
      this.celestialParameters = celestialParameters;
      this.water = {
        name: 'Water',
        value: 0,
        target: 0.70,
        unlocked: false,
        humidity: 0
      };
      this.atmosphere = {
        name: 'Atmosphere',
        value: 0,
        target: 101.325,
        unlocked: false
      };
      this.temperature = {
        name: 'Temperature',
        value: 0,
        target: 288.15, // 15°C in Kelvin
        solarFlux: 0,
        effectiveTempNoAtmosphere: 0,
        emissivity: 0,
        unlocked: false
      };
      this.life = {
        name: 'Life',
        value: 0,
        target: 50,
        unlocked: false
      };
      this.magnetosphere = {
        name: 'Magnetosphere',
        value: 0,
        target: 100,
        unlocked: false
      };
      this.toxicity = {
        name: 'Toxicity',
        value: 100,
        target: 0,
        unlocked: false
      };

      this.updateSurfaceTemperature();
    }

    updateResources(accumulatedChanges, deltaTime){
      this.applyEvaporationAndSublimation(accumulatedChanges, deltaTime);
    }

    updateSurfaceTemperature() {
      const distanceFromSunInMeters = this.celestialParameters.distanceFromSun * 149597870700; // Convert AU to meters
      const radiusInMeters = this.celestialParameters.radius * 1000; // Convert km to meters
      const albedo = this.calculateEffectiveAlbedo();
  
      let greenhouseGasMass = 0;
      let inertMass = 0;
  
      for (const gas in this.resources.atmospheric) {
        if (gas === 'carbonDioxide' || gas === 'atmosphericWater') {
          greenhouseGasMass += 1e3*this.resources.atmospheric[gas].value;
        } else {
          inertMass += 1e3*this.resources.atmospheric[gas].value;
        }
      }
  
      const {
        solarFlux,
        effectiveTempNoAtmosphere,
        emissivity,
        surfaceTemperature
      } = calculateEffectiveTemperature(
        distanceFromSunInMeters,
        radiusInMeters,
        albedo,
        inertMass,
        greenhouseGasMass
      );
  
      this.temperature.value = surfaceTemperature;
      this.temperature.solarFlux = solarFlux;
      this.temperature.effectiveTempNoAtmosphere = effectiveTempNoAtmosphere;
      this.temperature.emissivity = emissivity;
    }

      calculateEffectiveAlbedo() {
        const baseAlbedo = this.celestialParameters.albedo;
        const oceanAlbedo = 0.06;
        const waterRatio = this.water.value / 100;
    
        const effectiveAlbedo = baseAlbedo * (1 - waterRatio) + oceanAlbedo * waterRatio;
        return effectiveAlbedo;
      }
    
      calculateSolarEnergy() {
        // Calculate the solar energy received based on celestial parameters
        const solarConstant = 1361; // Solar constant in W/m^2
        const distanceFactor = Math.pow(149.6 / this.celestialParameters.distanceFromSun, 2); // Inverse square law
        return solarConstant * distanceFactor;
      }
  
      update(deltaTime) {
        // Update temperature based on the new calculateSurfaceTemperature function
        this.updateSurfaceTemperature();
    
        // Update atmospheric pressure
        this.atmosphere.value = this.calculateTotalPressure();
    
        // Update water level
        this.calculateWaterCoverage();
      }
  
    unlock(aspect) {
      if (this[aspect]) {
        this[aspect].unlocked = true;
      }
    }

    initializeTerraforming(){
        createTerraformingUI();
    }
    
    calculateTotalPressure() {
      let totalPressure = 0;
  
      for (const gas in this.resources.atmospheric) {
        const gasPressure = calculateGasPressure(gas);
        totalPressure += gasPressure;
      }
  
      return totalPressure / 1000; // Convert from Pa to kPa
    }

    calculateHumidity() {
      const satVapPress = saturationVaporPressureBuck(this.temperature.value - 273.15);
      return calculateGasPressure('atmosphericWater')/satVapPress;
    }

    calculateWaterCoverage() {
      const surfaceArea = 4*Math.PI*Math.pow(this.celestialParameters.radius*1000,2);
      const waterAmount = resources['surface']['liquidWater'].value;
      const waterRatio = 0.0001 * waterAmount / surfaceArea;
      if(waterRatio <= 0.001){
        this.water.value = 10*waterRatio;
      }
      else if(waterRatio > 0.001 && waterRatio < 1){
        this.water.value = 0.143317*Math.log(waterRatio)+1;
      }
      else if (waterRatio >= 1){
        this.water.value = 1;
      }
      else{
        this.water.value = 0;
      }
    }

    applyEvaporationAndSublimation(accumulatedChanges, deltaTime){
      const timeMultiplier = 86400*(deltaTime/1000);

      const evpRate = evaporationRate(this.temperature.value, this.temperature.solarFlux, this.atmosphere.value);
      const sublRate = sublimationRate(this.temperature.value, this.temperature.solarFlux, this.atmosphere.value);

    }
  }

  function calculateGasPressure(gas) {
    const mass = terraforming.resources.atmospheric[gas].value;
    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
  
    return calculateAtmosphericPressure(mass, gravity, radius);
  }

  function calculateAtmosphericPressure(mass, gravity, radius) {
    // Check for valid input values
    if (mass < 0) {
        throw new Error("Mass must be a positive number.");
    }
    if (gravity <= 0) {
        throw new Error("Gravity must be a positive number.");
    }
    if (radius <= 0) {
        throw new Error("Radius must be a positive number.");
    }

    // Calculate the surface area of the planet (A = 4 * π * R^2)
    const surfaceArea = 4 * Math.PI * Math.pow(radius*1e3, 2);

    // Calculate the atmospheric pressure (P = (m * g) / A)
    const pressure = (1e3*mass * gravity) / surfaceArea;

    // Return the pressure in Pascals (Pa)
    return pressure;
}

function calculateEffectiveTemperature(
  distanceFromSun,
  radius,
  albedo,
  inertMass,
  greenhouseGasMass
) {
  // Constants
  const solarLuminosity = 3.828e26; // Solar luminosity (W)
  const stefanBoltzmann = 5.670374419e-8; // Stefan-Boltzmann constant (W·m⁻²·K⁻⁴)
  const absorptionCoefficient = 0.0013; // Mean infrared absorption coefficient (m²/kg)
  const inertFactor = 0.1;
  // Calculate the solar flux at the planet's orbit (S)
  const solarFlux =
    solarLuminosity / (4 * Math.PI * Math.pow(distanceFromSun, 2)); // W/m²

  // Calculate the effective temperature without atmosphere (Teff)
  const effectiveTempNoAtmosphere = Math.pow(
    (solarFlux * (1 - albedo)) / (4 * stefanBoltzmann),
    0.25
  );

  // Calculate the planet's surface area (A)
  const surfaceArea = 4 * Math.PI * Math.pow(radius, 2); // m²

  // Calculate the column mass of greenhouse gases (m)
  const inertColumnMass = inertMass / surfaceArea;
  const ghgColumnMass = greenhouseGasMass / surfaceArea; // kg/m²

  // Calculate the atmospheric emissivity (epsilon)
  const emissivity = 1 - Math.exp(-absorptionCoefficient*(ghgColumnMass + inertFactor*inertColumnMass));

  // Calculate the surface temperature with greenhouse effect (Tsurface)
  const multiplier = Math.pow(1 / (1 - emissivity / 2), 0.25);
  const surfaceTemperature = effectiveTempNoAtmosphere * multiplier;

  return {
    solarFlux,
    effectiveTempNoAtmosphere,
    emissivity,
    surfaceTemperature
  };
}

function saturationVaporPressureBuck(T) {
  // Calculates the saturation vapor pressure (in Pa) as a function of temperature (in °C)
  // using the Buck equation over ice for T < 0°C and over liquid water for T ≥ 0°C.

  let e_s; // Saturation vapor pressure in kilopascals (kPa)

  if (T < 0) {
    // Buck equation over ice
    e_s =
      0.61115 *
      Math.exp(
        ((23.036 - T / 333.7) * T) / (279.82 + T)
      );
  } else {
    // Buck equation over liquid water
    e_s =
      0.61121 *
      Math.exp(
        ((18.678 - T / 234.5) * T) / (257.14 + T)
      );
  }

  // Convert saturation vapor pressure from kPa to Pa
  const e_s_Pa = e_s * 1000;

  return e_s_Pa; // Partial pressure in Pa
}

function derivativeSaturationVaporPressureBuck(T) {  //Temperature must be in Celsius
  let des_dT;

  if (T < 0) {
    // Buck equation derivative over ice
    const A = 0.61115;
    const C1 = 23.036;
    const C2 = 333.7;
    const C3 = 279.82;

    function f_ice(T) {
      return (C1 - T / C2) * (T / (C3 + T));
    }

    function df_ice(T) {
      const term1 = (C1 - T / C2) * (C3 / Math.pow(C3 + T, 2));
      const term2 = (-1 / C2) * (T / (C3 + T));
      return term1 + term2;
    }

    const es_ice = A * Math.exp(f_ice(T));
    des_dT = es_ice * df_ice(T);
  } else {
    // Buck equation derivative over water
    const A = 0.61121;
    const C1 = 18.678;
    const C2 = 234.5;
    const C3 = 257.14;

    function f_water(T) {
      return (C1 - T / C2) * (T / (C3 + T));
    }

    function df_water(T) {
      const term1 = (C1 - T / C2) * (C3 / Math.pow(C3 + T, 2));
      const term2 = (-1 / C2) * (T / (C3 + T));
      return term1 + term2;
    }

    const es_water = A * Math.exp(f_water(T));
    des_dT = es_water * df_water(T);
  }

  return des_dT * 1000; // Return the derivative in Pa/°C
}

function evaporationRate(T, solarFlux, atmPressure){
  T = T - 273.15;
  const albedo = 0.06;
  const Lv = (2.501 - 0.002361*T)*1e6;
  const drvBuck = derivativeSaturationVaporPressureBuck(T);
  const rad = (1 - albedo)*solarFlux;
  gamma = 1004*atmPressure/(0.622*Lv)         //c_p could be dynamic

  return drvBuck*rad/((drvBuck + gamma)* Lv);
}

function sublimationRate(T, solarFlux, atmPressure){
  T = T - 273.15;
  const albedo = 0.7;
  const Lv = (2.501 - 0.002361*T)*1e6;
  const drvBuck = derivativeSaturationVaporPressureBuck(T);
  const rad = (1 - albedo)*solarFlux;
  gamma = 1004*atmPressure/(0.622*Lv)         //c_p could be dynamic

  return drvBuck*rad/((drvBuck + gamma)* Lv);
}