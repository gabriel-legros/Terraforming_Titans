class OreScanning {
    constructor(planetParameters) {
      this.underground = planetParameters.resources.underground;
      // Extract all deposit parameters from marsParameters
      // Track progress and scanning strength for each deposit type
      this.scanData = {};
      for (const depositType in this.underground) {
        const depositParams = this.underground[depositType];
        this.scanData[depositType] = {
          D_current: depositParams.initialValue,
          currentScanProgress: 0,
          currentScanningStrength: 0,
          remainingTime: 0
        };
      }
  
      this.loadFromConfig(planetParameters);
    }

    // Method to save the current state of ore scanning
    saveState() {
      const savedState = {};
      for (const depositType in this.scanData) {
        const scanData = this.scanData[depositType];
        savedState[depositType] = {
          D_max: scanData.D_max,
          A_total: scanData.A_total,
          D_current: scanData.D_current,
          currentScanProgress: scanData.currentScanProgress,
          currentScanningStrength: scanData.currentScanningStrength,
          remainingTime: scanData.remainingTime
        };
      }
      return savedState;
    }

    // Method to load the saved state of ore scanning
    loadState(savedState) {
      for (const depositType in savedState) {
        if (this.scanData[depositType]) {
          Object.assign(this.scanData[depositType], savedState[depositType]);
        }
      }
      this.loadFromConfig(currentPlanetParameters);
    }

    loadFromConfig(planetParameters){
      const newUnderground = planetParameters.resources.underground;

      // Track progress and scanning strength for each deposit type
      for (const depositType in newUnderground) {
        const depositParams = newUnderground[depositType];
        const old_max = this.scanData[depositType].D_max;
        this.scanData[depositType].D_max = depositParams.maxDeposits;
        this.scanData[depositType].A_total = depositParams.areaTotal;
        if(old_max < this.scanData[depositType].D_max){
          this.startScan(depositType);
        }
      }
    }

    // Method to calculate the expected time or effort to find the next deposit, scaling with scanning strength
    calculateExpectedTime(depositType, scanningStrength = 1) {
      const scanData = this.scanData[depositType];
      if (!scanData || scanData.D_current >= scanData.D_max) {
        return Infinity;  // No more deposits available or invalid deposit type
      }

      // Expected time grows with the number of deposits found and scales with scanning strength
      const densityFactor = (scanData.D_max - scanData.D_current) / scanData.A_total;
      const baseTime = 1 / densityFactor;  // Base time depends on the remaining deposit density
      return baseTime / scanningStrength;  // The expected time decreases as scanning strength increases
    }

    // Modified startScan method in OreScanning class
    startScan(depositType) {
      const scanData = this.scanData[depositType];
      if (!scanData) {
        console.log(`Invalid deposit type: ${depositType}`);
        return;
      }

      // Start a new scan if no existing scan in progress or after completing the previous one
      if (scanData.remainingTime <= 0 || scanData.currentScanProgress >= 1) {
        scanData.remainingTime = this.calculateExpectedTime(depositType, scanData.currentScanningStrength);
        scanData.currentScanProgress = 0;  // Reset progress for a new scan
      }

      console.log(`Scan started for ${depositType} with strength ${scanData.currentScanningStrength}, expected time: ${scanData.remainingTime}`);
    }

    // Method to update scanning progress for a specific deposit type
    updateScan(deltaTime) {
      for (const depositType in this.scanData) {
        const scanData = this.scanData[depositType];
        if (!scanData) {
          console.log(`Invalid deposit type: ${depositType}`);
          continue;
        }

        if (scanData.D_current >= scanData.D_max) {
          continue;
        }

        if (scanData.remainingTime <= 0) {
          continue;
        }

        // Update progress
        const progressIncrement = deltaTime / scanData.remainingTime;
        scanData.currentScanProgress += progressIncrement;

        if (scanData.currentScanProgress >= 1) {
          // Deposit found, increment the count and add to resources
          scanData.D_current++;
          resources.underground[depositType].addDeposit(); // Add a deposit to the resource system

          console.log(`Deposit found! Total ${depositType} deposits found: ${scanData.D_current}/${scanData.D_max}`);

          // Reset scan if there are more deposits available
          if (scanData.D_current < scanData.D_max) {
            this.startScan(depositType); // Start a new scan
          } else {
            console.log(`All ${depositType} deposits have been found. No further scans will be started.`);
            scanData.remainingTime = 0;  // Stop scanning since no more deposits can be found
          }
        }
      }
    }

    // Method to adjust scanning strength midway for a specific deposit type
    adjustScanningStrength(depositType, newScanningStrength) {
      const scanData = this.scanData[depositType];
      if (!scanData) {
        console.log(`Invalid deposit type: ${depositType}`);
        return;
      }

      // Update the scanning strength
      scanData.currentScanningStrength = newScanningStrength;

      if (scanData.remainingTime <= 0) {
        // If no active scan, just update the strength
        console.log(`No active scan for ${depositType} to adjust. Scanning strength set to ${scanData.currentScanningStrength}.`);
        return;
      }

      // Calculate the new expected time with the updated strength
      const newExpectedTime = this.calculateExpectedTime(depositType, newScanningStrength);

      // Adjust the remaining time based on progress and update scanning progress proportionally
      scanData.remainingTime = newExpectedTime;
      console.log(`Scanning strength for ${depositType} adjusted to ${newScanningStrength}. New remaining time: ${scanData.remainingTime}`);
    }

    // Getter for the current state of deposits found
    getCurrentDepositCount(depositType) {
      const scanData = this.scanData[depositType];
      return scanData ? scanData.D_current : null;
    }
}
