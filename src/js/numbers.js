function formatNumber(value, integer = false, precision = 1, allowSmall = false) {
    const absValue = Math.abs(value);
    let formatted;

    if (absValue >= 1e30 - 1e27) {
      formatted = integer && absValue % 1e30 === 0 ? (absValue / 1e30) + 'No' : (absValue / 1e30).toFixed(precision) + 'No';
    } else if (absValue >= 1e27 - 1e24) {
      formatted = integer && absValue % 1e27 === 0 ? (absValue / 1e27) + 'Oc' : (absValue / 1e27).toFixed(precision) + 'Oc';
    } else if (absValue >= 1e24 - 1e21) {
      formatted = integer && absValue % 1e24 === 0 ? (absValue / 1e24) + 'Sp' : (absValue / 1e24).toFixed(precision) + 'Sp';
    } else if (absValue >= 1e21 - 1e18) {
      formatted = integer && absValue % 1e21 === 0 ? (absValue / 1e21) + 'Sx' : (absValue / 1e21).toFixed(precision) + 'Sx';
    } else if (absValue >= 1e18 - 1e15) {
      formatted = integer && absValue % 1e18 === 0 ? (absValue / 1e18) + 'Qn' : (absValue / 1e18).toFixed(precision) + 'Qn';
    } else if (absValue >= 1e15 - 1e12) {
      formatted = integer && absValue % 1e15 === 0 ? (absValue / 1e15) + 'Q' : (absValue / 1e15).toFixed(precision) + 'Q';
    } else if (absValue >= 1e12 - 1e9) {
      formatted = integer && absValue % 1e12 === 0 ? (absValue / 1e12) + 'T' : (absValue / 1e12).toFixed(precision) + 'T';
    } else if (absValue >= 1e9 - 1e6) {
      formatted = integer && absValue % 1e9 === 0 ? (absValue / 1e9) + 'B' : (absValue / 1e9).toFixed(precision) + 'B';
    } else if (absValue >= 1e6 - 1e3) {
      formatted = integer && absValue % 1e6 === 0 ? (absValue / 1e6) + 'M' : (absValue / 1e6).toFixed(precision) + 'M';
    } else if (absValue >= 1e3 - 1) {
      formatted = integer && absValue % 1e3 === 0 ? (absValue / 1e3) + 'k' : (absValue / 1e3).toFixed(precision) + 'k';
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
    } else {
      formatted = absValue.toExponential(1); // Scientific notation
    }
  
    return value < 0 ? '-' + formatted : formatted;
  }
  
function formatBigInteger(number) {
    // Convert the number to a string and use regex to add commas
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    return `${hours}h ${minutes}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatNumber,
      formatBigInteger,
      formatBuildingCount,
      toDisplayTemperature,
      toDisplayTemperatureDelta,
      getTemperatureUnit,
      formatPlayTime,
      formatDuration,
    };
  }