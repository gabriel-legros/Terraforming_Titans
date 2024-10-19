class Terraforming {
    constructor(resources, celestialParameters) {
      this.resources = resources;
      this.celestialParameters = celestialParameters;
      this.temperature = {
        name: 'Temperature',
        value: this.calculateTemperature(),
        target: 15,
        unlocked: false
      };
      this.atmosphere = {
        name: 'Atmosphere',
        value: this.calculateAtmosphere(),
        target: 101.325,
        unlocked: false
      };
      this.water = {
        name: 'Water',
        value: 0,
        target: 70,
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
    }

    calculateTemperature() {
        // Calculate the initial temperature based on celestial parameters
        const distanceFactor = Math.pow(this.celestialParameters.distanceFromSun / 149.6, 2); // Inverse square law
        const initialTemperature = -55; // Initial temperature of Mars
        const solarEnergyAbsorbed = (1 - this.celestialParameters.albedo) * this.calculateSolarEnergy(); // Calculate the amount of solar energy absorbed based on the albedo
        return initialTemperature * distanceFactor + solarEnergyAbsorbed;
      }
    
      calculateAtmosphere() {
        // Calculate the initial atmospheric pressure based on resources
        const initialPressure = 0.6; // Initial atmospheric pressure of Mars
        const co2Level = this.resources.atmospheric.carbonDioxide.value;
        const pressureIncrease = co2Level * 0.001;
        return initialPressure + pressureIncrease;
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
        // Update terraforming aspects based on resources and other factors
        // Example: Increase temperature based on atmospheric CO2 levels
        const co2Level = this.resources.atmospheric.carbonDioxide.value;
        const temperatureIncrease = co2Level * 0.001 * (deltaTime / 1000);
        this.temperature.value = Math.min(this.temperature.value + temperatureIncrease, this.temperature.target);
        // Update other aspects similarly based on your game's mechanics
    }
  
    unlock(aspect) {
      if (this[aspect]) {
        this[aspect].unlocked = true;
      }
    }

    initializeTerraforming(){
        createTerraformingUI();
    }

    update() {
        // Update atmospheric pressure
        this.atmosphere.value = this.calculateTotalPressure();
      }
    
      calculateTotalPressure() {
        let totalPressure = 0;
    
        for (const gas in this.resources.atmospheric) {
          const gasPressure = calculateGasPressure(gas);
          totalPressure += gasPressure;
        }
    
        return totalPressure / 1000; // Convert from Pa to kPa
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