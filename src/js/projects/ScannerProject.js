class ScannerProject extends Project {
  applyScannerEffect() {
    if (
      this.attributes.scanner &&
      this.attributes.scanner.searchValue &&
      this.attributes.scanner.depositType
    ) {
      const depositType = this.attributes.scanner.depositType;
      const additionalStrength = this.attributes.scanner.searchValue;
      oreScanner.adjustScanningStrength(
        depositType,
        oreScanner.scanData[depositType].currentScanningStrength + additionalStrength
      );
      console.log(
        `Scanner strength for ${depositType} increased by ${additionalStrength}. New scanning strength: ${oreScanner.scanData[depositType].currentScanningStrength}`
      );
      oreScanner.startScan(depositType);
      console.log(
        `Scanning for ${depositType} started after applying scanner effect from ${this.name}`
      );
    }
  }

  complete() {
    super.complete();
    if (
      this.attributes &&
      this.attributes.scanner &&
      this.attributes.scanner.canSearchForDeposits
    ) {
      this.applyScannerEffect();
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.ScannerProject = ScannerProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScannerProject;
}
