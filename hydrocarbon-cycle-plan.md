# Plan for Implementing the Hydrocarbon Cycle

This plan outlines the necessary steps to introduce a new hydrocarbon cycle for the planet Titan, mirroring the existing water and dry-ice cycles.

---

## 1. New File Creation: `hydrocarbon-cycle.js`

A new file, `hydrocarbon-cycle.js`, will be created to encapsulate the logic for the hydrocarbon cycle. This file will be analogous to `water-cycle.js` and `dry-ice-cycle.js`.

**Contents of `hydrocarbon-cycle.js`:**

*   **Constants:**
    *   `L_V_METHANE`: Latent heat of vaporization for methane.
    *   Physical constants for methane (e.g., critical temperature, critical pressure) for the saturation pressure calculations.
*   **Functions:**
    *   `calculateSaturationPressureMethane(temperature)`: This function will calculate the saturation vapor pressure of methane at a given temperature. It should use an appropriate equation, similar to the Wagner equation in `dry-ice-cycle.js` but with constants for methane.
    *   `slopeSVPMethane(temperature)`: Calculates the derivative of the methane saturation vapor pressure curve, similar to `slopeSVPCO2`.
    *   `psychrometricConstantMethane(atmPressure)`: Calculates the psychrometric constant for methane.
    *   `evaporationRateMethane(T, solarFlux, atmPressure, e_a, r_a)`: Calculates the evaporation rate of liquid methane using the Penman equation, adapted from `evaporationRateWater`.
    *   `calculateMethaneCondensationRateFactor({zoneArea, methaneVaporPressure, dayTemperature, nightTemperature})`: Calculates the potential condensation rate of methane from the atmosphere, similar to `calculateCO2CondensationRateFactor`. This will determine the rate of "methane rain."

---

## 2. Modifications to Existing Files

Several existing files will need to be modified to integrate the new hydrocarbon cycle.

*   **`planet-parameters.js`:**
    *   **Add New Resources:** Under `titanOverrides`, new resources for the hydrocarbon cycle will be added to the `surface` and `atmospheric` categories.
        *   `surface.liquidMethane`: Represents lakes and seas of liquid methane.
        *   `surface.hydrocarbonIce`: Represents frozen hydrocarbons.
        *   `atmospheric.atmosphericMethane`: Represents gaseous methane in the atmosphere.
        *   The existing `liquidHydrocarbons` and `methane` resources will be reviewed and potentially repurposed or replaced by these more specific resources to allow for a full cycle implementation.
    *   **Zonal Data:** Add a new `zonalHydrocarbons` object to `titanOverrides` to define the initial distribution of liquid methane and hydrocarbon ice across the tropical, temperate, and polar zones, similar to `zonalWater`.

*   **`terraforming.js`:**
    *   **Import New Module:** Import the functions from the new `hydrocarbon-cycle.js` file.
    *   **`updateResources` function:** This is the core integration point.
        *   Call the new hydrocarbon cycle functions to calculate evaporation and condensation rates for methane in each zone.
        *   Use `resources.surface.liquidMethane.modifyRate()` and `resources.atmospheric.atmosphericMethane.modifyRate()` to update the resource values based on the calculated rates. The `rateType` will be `'terraforming'`.
    *   **State Management:** The `terraforming` module will need to manage the state of `liquidMethane` and `hydrocarbonIce` in each zone, similar to how it manages water and dry ice.

*   **`hydrology.js`:**
    *   **Create a new function `simulateSurfaceHydrocarbonFlow()`:** This function will be a direct adaptation of `simulateSurfaceWaterFlow()`. It will manage the flow of liquid methane between zones based on their relative amounts. It will also handle the "melting" of hydrocarbon ice into liquid methane when temperatures rise above methane's freezing point.

*   **`index.html`:**
    *   Add a `<script>` tag to load the new `hydrocarbon-cycle.js` file.

---

## 3. Hydrocarbon Cycle Logic

The logic for the hydrocarbon cycle will be based on the principles observed in the water and dry-ice cycles.

*   **States:**
    *   **Liquid Methane:** Present on the surface in lakes and seas. Its quantity will be tracked in `resources.surface.liquidMethane` and on a zonal basis.
    *   **Atmospheric Methane:** Gaseous methane in the atmosphere, tracked in `resources.atmospheric.atmosphericMethane`.
    *   **Hydrocarbon Ice:** Frozen hydrocarbons on the surface, tracked in `resources.surface.hydrocarbonIce`.

*   **Transitions:**
    *   **Evaporation:** Liquid methane will evaporate into atmospheric methane. The rate will be calculated by `evaporationRateMethane()`, driven by temperature and solar flux.
    *   **Condensation (Rain):** When the partial pressure of atmospheric methane exceeds the saturation pressure, it will condense and fall as methane rain. The rate will be calculated by `calculateMethaneCondensationRateFactor()`.
    *   **Freezing/Melting:** Liquid methane will freeze into hydrocarbon ice when the temperature drops below its freezing point. Hydrocarbon ice will melt into liquid methane when the temperature rises. This will be handled by an adapted version of `calculateMeltingFreezingRates()` from `hydrology.js`.
    *   **Surface Flow:** Liquid methane will flow between zones, from areas of higher concentration to lower concentration, managed by `simulateSurfaceHydrocarbonFlow()`.

---

## 4. Integration Plan with `terraforming.js`

The `updateResources` function in `terraforming.js` will be the central point of integration. The sequence of operations within the game loop should be:

1.  Calculate the temperature of each zone.
2.  Call `simulateSurfaceHydrocarbonFlow()` from the modified `hydrology.js` to handle liquid methane movement and melting.
3.  For each zone, call the functions from `hydrocarbon-cycle.js` to determine the rates of evaporation and condensation.
4.  Update the global resource values for `liquidMethane` and `atmosphericMethane` using `modifyRate()`, ensuring the `rateType` is set to `'terraforming'`.