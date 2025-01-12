function formatNumber(value, integer = false, precision = 1) {
    const absValue = Math.abs(value);
    let formatted;
  
    if (absValue >= 1e18 - 1e15) {
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
    } else if (absValue <= 1e-12) {
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