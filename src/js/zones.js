const ZONES = ['tropical', 'temperate', 'polar'];

// Function to calculate the surface area of a spherical segment between two latitudes (in radians)
function sphericalSegmentArea(phi1, phi2) {
    return 2 * Math.PI * (Math.sin(phi2) - Math.sin(phi1));
  }
  
  // Function to calculate the area of a disk segment between two latitudes (in radians)
  function diskSegmentArea(phi1, phi2) {
    const y1 = Math.sin(phi1);
    const y2 = Math.sin(phi2);
  
    // Using numerical integration for the disk area
    function integrateDiskSegment(y1, y2, numSteps = 1000) {
        const stepSize = (y2 - y1) / numSteps;
        let area = 0;
        for (let i = 0; i < numSteps; i++) {
            const y = y1 + i * stepSize;
            area += 2 * Math.sqrt(1 - Math.pow(y, 2)) * stepSize;
        }
        return area;
    }
  
    return integrateDiskSegment(y1, y2);
  }
    
  // Convert degrees to radians
  function degreesToRadians(degrees) {
      return degrees * Math.PI / 180;
  }
  
  // Latitudes in degrees for different regions
  const tropicalLatitude = 23.5;
  const polarLatitude = 66.5;
  
  // Convert latitudes to radians
  const phiTropic = degreesToRadians(tropicalLatitude);
  const phiPolar = degreesToRadians(polarLatitude);
  
  // Surface areas
  const tropicalSurfaceArea = sphericalSegmentArea(-phiTropic, phiTropic);
  const temperateSurfaceArea = 2 * sphericalSegmentArea(phiTropic, phiPolar);
  const polarSurfaceArea = 2 * sphericalSegmentArea(phiPolar, Math.PI / 2);

  const totalSurfaceArea = tropicalSurfaceArea + temperateSurfaceArea + polarSurfaceArea;
  
  // Disk areas
  const tropicalDiskArea = diskSegmentArea(-phiTropic, phiTropic);
  const temperateDiskArea = 2 * diskSegmentArea(phiTropic, phiPolar);
  const polarDiskArea = 2 * diskSegmentArea(phiPolar, Math.PI / 2);
  
  // Ratios
  const tropicalRatio = tropicalDiskArea / tropicalSurfaceArea;
  const temperateRatio = temperateDiskArea / temperateSurfaceArea;
  const polarRatio = polarDiskArea / polarSurfaceArea;

  function getZoneRatio(zone) {
    switch (zone) {
      case 'tropical':
        return tropicalRatio;
      case 'temperate':
        return temperateRatio;
      case 'polar':
        return polarRatio;
      default:
        throw new Error(`Invalid zone: ${zone}`);
    }
  }

  function getZonePercentage(zone) {
    switch (zone) {
        case 'global': // Added case for global
            return 1.0;
        case 'tropical':
          return tropicalSurfaceArea / totalSurfaceArea;
        case 'temperate':
          return temperateSurfaceArea / totalSurfaceArea;
        case 'polar':
          return polarSurfaceArea / totalSurfaceArea;
        default:
          console.warn(`Invalid zone requested for percentage: ${zone}. Returning 0.`); // Changed error to warning
          return 0; // Return 0 instead of throwing error
    }
  }

/**
 * Estimate fractional coverage.
 * Linear branch:  C(x) = 50 x                for 0 ≤ x ≤ R0
 * Log branch:     C(x) = A ln x + 1          for R0 < x < 1
 *   with A = 50 · R0 and R0 ≈ 0.00292658,
 * giving a C¹-smooth curve that passes through (0,0) and (1,1).
 */
function estimateCoverage(amount, zoneArea, scale = 0.0001) {
  const resourceRatio = (scale * amount) / zoneArea;

  // ---- curve parameters for slope 50 ----
  const R0           = 0.002926577381;    // breakpoint (solves 50·R0·(1-ln R0)=1)
  const LINEAR_SLOPE = 50;                // m
  const LOG_A        = LINEAR_SLOPE * R0; // ≈ 0.146328864
  const LOG_B        = 1;                 // forces point (1,1)
  // ---------------------------------------

  let coverage;
  if (resourceRatio <= 0) {
    coverage = 0;
  } else if (resourceRatio <= R0) {
    // Linear segment
    coverage = LINEAR_SLOPE * resourceRatio;
  } else if (resourceRatio < 1) {
    // Log segment
    coverage = LOG_A * Math.log(resourceRatio) + LOG_B;
  } else {
    coverage = 1;
  }

  return Math.max(0, Math.min(coverage, 1));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ZONES,
    getZoneRatio,
    getZonePercentage,
    estimateCoverage,
  };
} else {
  globalThis.ZONES             = ZONES;
  globalThis.getZoneRatio      = getZoneRatio;
  globalThis.getZonePercentage = getZonePercentage;
  globalThis.estimateCoverage  = estimateCoverage;
}

