function isNearlyWhole(value, epsilon = 1e-9) {
  return Math.abs(value - Math.round(value)) < epsilon;
}

function formatNumber(value, integer = false, precision = 1, allowSmall = false) {
    const absValue = Math.abs(value);
    let formatted;
    let scientificThreshold = 1e30;
    try {
      scientificThreshold = gameSettings.scientificNotationThreshold ?? scientificThreshold;
    } catch (error) {
      scientificThreshold = scientificThreshold;
    }

    if (absValue >= scientificThreshold) {
      formatted = absValue.toExponential(precision).replace('e+', 'e');
      return value < 0 ? '-' + formatted : formatted;
    }

    if (absValue >= 1e39 - 1e36) {
      const scaled = absValue / 1e39;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Dd' : scaled.toFixed(precision) + 'Dd';
    } else if (absValue >= 1e36 - 1e33) {
      const scaled = absValue / 1e36;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Ud' : scaled.toFixed(precision) + 'Ud';
    } else if (absValue >= 1e33 - 1e30) {
      const scaled = absValue / 1e33;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'De' : scaled.toFixed(precision) + 'Dc';
    } else if (absValue >= 1e30 - 1e27) {
      const scaled = absValue / 1e30;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'No' : scaled.toFixed(precision) + 'No';
    } else if (absValue >= 1e27 - 1e24) {
      const scaled = absValue / 1e27;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Oc' : scaled.toFixed(precision) + 'Oc';
    } else if (absValue >= 1e24 - 1e21) {
      const scaled = absValue / 1e24;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Sp' : scaled.toFixed(precision) + 'Sp';
    } else if (absValue >= 1e21 - 1e18) {
      const scaled = absValue / 1e21;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Sx' : scaled.toFixed(precision) + 'Sx';
    } else if (absValue >= 1e18 - 1e15) {
      const scaled = absValue / 1e18;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Qi' : scaled.toFixed(precision) + 'Qi';
    } else if (absValue >= 1e15 - 1e12) {
      const scaled = absValue / 1e15;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'Q' : scaled.toFixed(precision) + 'Q';
    } else if (absValue >= 1e12 - 1e9) {
      const scaled = absValue / 1e12;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'T' : scaled.toFixed(precision) + 'T';
    } else if (absValue >= 1e9 - 1e6) {
      const scaled = absValue / 1e9;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'B' : scaled.toFixed(precision) + 'B';
    } else if (absValue >= 1e6 - 1e3) {
      const scaled = absValue / 1e6;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'M' : scaled.toFixed(precision) + 'M';
    } else if (absValue >= 1e3 - 1) {
      const scaled = absValue / 1e3;
      formatted = integer && isNearlyWhole(scaled) ? Math.round(scaled) + 'k' : scaled.toFixed(precision) + 'k';
    } else if (absValue >= 1e-2) {
      formatted = integer && absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(precision);
    } else if (absValue >= 1e-3 - 1e-6) {
      formatted = (absValue / 1e-3).toFixed(precision) + 'm'; // Milli
    } else if (absValue >= 1e-6 - 1e-9) {
      formatted = (absValue / 1e-6).toFixed(precision) + 'µ'; // Micro
    } else if (absValue >= 1e-9 - 1e-12) {
      formatted = (absValue / 1e-9).toFixed(precision) + 'n'; // Nano
    } else if (allowSmall && absValue >= 1e-12 - 1e-15) {
        formatted = (absValue / 1e-12).toFixed(precision) + 'p'; // Pico
    } else if (allowSmall && absValue >= 1e-15 - 1e-18) {
        formatted = (absValue / 1e-15).toFixed(precision) + 'f'; // Femto
    } else if (absValue < 1e-12 && !allowSmall) {
      formatted = 0;
      value = 0;
    } else if (absValue < 1e-18){
      formatted = 0;
      value = 0;
    }
    else {
      formatted = absValue.toExponential(1).replace('e+', 'e'); // Scientific notation
    }
  
    return value < 0 ? '-' + formatted : formatted;
  }
  
function formatBigInteger(number) {
    // Convert the number to a string and use regex to add commas
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

function formatShipCount(value) {
  if (value === Infinity) return '∞';
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

  function toDisplayTemperature(kelvin) {
    const useC = (typeof gameSettings !== 'undefined' && gameSettings.useCelsius);
    return useC ? kelvin - 273.15 : kelvin;
  }

  function toDisplayTemperatureDelta(kelvinDelta) {
    return kelvinDelta;
  }

function getTemperatureUnit() {
    return (typeof gameSettings !== 'undefined' && gameSettings.useCelsius) ? '°C' : 'K';
  }

  function formatPlayTime(days) {
    const years = Math.floor(days / 365);
    const remainingDays = Math.floor(days % 365);
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    }
    parts.push(`${remainingDays} day${remainingDays !== 1 ? 's' : ''}`);
    return parts.join(' ');
  }

function formatDuration(seconds) {
  const yearSeconds = 365 * 24 * 3600;
  if (seconds >= yearSeconds) {
    const years = Math.floor(seconds / yearSeconds);
    return `${formatNumber(years, true)} year${years !== 1 ? 's' : ''}`;
  }
  if (seconds >= 24 * 3600) {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    return `${days}d ${hours}h`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  }
  return `${Math.floor(seconds)}s`;
}

function formatDurationDetailed(seconds) {
  const yearSeconds = 365 * 24 * 3600;
  const years = Math.floor(seconds / yearSeconds);
  let remaining = seconds - years * yearSeconds;
  const days = Math.floor(remaining / (24 * 3600));
  remaining -= days * 24 * 3600;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  if (years > 0) {
    return `${formatNumber(years, true)} year${years !== 1 ? 's' : ''} ${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${Math.floor(seconds)}s`;
}

function formatBuildingCount(value) {
  if (Math.abs(value) > 1e6) {
    return formatNumber(value, false, 3);
  }
  return formatBigInteger(value);
}

function formatScientific(value, precision = 1) {
  return value.toExponential(precision).replace('e+', 'e');
}

function parseFlexibleNumber(value) {
  let text;
  try {
    text = String(value ?? '').trim();
  } catch (error) {
    return NaN;
  }

  if (text === '') return NaN;

  text = text.replace(/[,_\s]/g, '');

  const suffixMap = new Map([
    ['Dd', 1e39],
    ['dd', 1e39],
    ['Ud', 1e36],
    ['ud', 1e36],
    ['De', 1e33],
    ['de', 1e33],
    ['Dc', 1e33],
    ['dc', 1e33],
    ['No', 1e30],
    ['no', 1e30],
    ['Oc', 1e27],
    ['oc', 1e27],
    ['Sp', 1e24],
    ['sp', 1e24],
    ['Sx', 1e21],
    ['sx', 1e21],
    ['Qi', 1e18],
    ['qi', 1e18],
    ['Q', 1e15],
    ['q', 1e15],
    ['T', 1e12],
    ['t', 1e12],
    ['B', 1e9],
    ['b', 1e9],
    ['M', 1e6],
    ['K', 1e3],
    ['k', 1e3],
    ['m', 1e-3], // Milli
    ['µ', 1e-6], // Micro
    ['u', 1e-6],
    ['U', 1e-6],
    ['n', 1e-9], // Nano
    ['N', 1e-9],
    ['p', 1e-12], // Pico
    ['P', 1e-12],
    ['f', 1e-15], // Femto
    ['F', 1e-15],
  ]);

  const numberMatch = text.match(/^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:e[+-]?\d+)?/i);
  const numericText = numberMatch ? numberMatch[0] : '';
  const suffixText = text.slice(numericText.length);

  if (numericText === '') return NaN;

  let numericValue = Number(numericText);
  if (!Number.isFinite(numericValue)) {
    numericValue = Number.parseFloat(numericText);
  }
  if (!Number.isFinite(numericValue)) {
    numericValue = Number(text);
  }
  if (!Number.isFinite(numericValue)) {
    numericValue = Number.parseFloat(text);
  }
  if (!Number.isFinite(numericValue)) return NaN;

  if (suffixText === '') return numericValue;

  const factor = suffixMap.get(suffixText);
  if (factor) return numericValue * factor;

  const sortedSuffixes = Array.from(suffixMap.keys()).sort((a, b) => b.length - a.length);
  const matched = sortedSuffixes.find((suffix) => suffixText.startsWith(suffix));
  if (!matched) return numericValue;
  return numericValue * suffixMap.get(matched);
}

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatNumber,
      formatBigInteger,
      formatShipCount,
      formatBuildingCount,
      formatScientific,
      parseFlexibleNumber,
      toDisplayTemperature,
      toDisplayTemperatureDelta,
      getTemperatureUnit,
      formatPlayTime,
      formatDuration,
      formatDurationDetailed,
    };
  }
