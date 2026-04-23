var progressZeusBattle = { chapters: [], storyProjects: {} };

function buildZeusBattleInitialFrame() {
  return {
    id: 0,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 0, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 0, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 0, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 0, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 0, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 0, shape: "triangle" }
    ]
  };
}

function buildZeusBattleEnemyArrivalFrame() {
  return {
    id: 1,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" }
    ]
  };
}

function buildZeusBattleHorseAlertFrame() {
  return {
    id: 2,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" }
    ]
  };
}

function buildZeusBattleEdmondAmbushFrame() {
  return {
    id: 3,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleAlertFrame() {
  return {
    id: 4,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleSuperweaponFrame() {
  return {
    id: 5,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleHorseDestructionFrame() {
  return {
    id: 6,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.76, y: 0.32, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.79, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleAfterWarpFrame() {
  return {
    id: 8,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.76, y: 0.32, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.79, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleMercyAdvanceFrame() {
  return {
    id: 9,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.76, y: 0.32, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleMercyStrikeFrame() {
  return {
    id: 10,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleCashmoneyStrikeFrame() {
  return {
    id: 11,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Mercy", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleImperialCollapseFrame() {
  return {
    id: 12,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Mercy", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

function buildZeusBattleFinalBlinkoutFrame() {
  return {
    id: 14,
    units: [
      { kind: "superweapon", label: "SW-01", x: 0.14, y: 0.50, widthScale: 0.18, heightScale: 0.675, fill: "#7d828e", stroke: "#d4d8e3", alpha: 0 },
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff", alpha: 0 },
      { label: "UHF2", subLabel: "Elephant", x: 0.57, y: 0.40, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.67, y: 0.61, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHF4", subLabel: "Rhino", x: 0.57, y: 0.76, size: 0.05, fill: "#89a8ff", stroke: "#ffb86c" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Mercy", x: 0.84, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa", alpha: 0 },
      { label: "UHFA", subLabel: "Recycling", x: 0.76, y: 0.68, size: 0.045, fill: "#70d5c0", stroke: "#ffb86c" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffb86c", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ff4d4d", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond", destroyed: true },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

progressZeusBattle.storyProjects.zeus_battle_of_zeus = {
  type: "ZeusBattleProject",
  name: "Battle of Zeus",
  category: "story",
  chapter: 44,
  cost: {},
  duration: 10_000,
  description: "(This story project happens over a very short time period)  Progress the Battle of Zeus.",
  repeatable: true,
  maxRepeatCount: 14,
  unlocked: false,
  attributes: {
    planet: "zeus",
    hideAutoStart: true,
    ignoreDurationModifiers: true,
    battleFrames: [
      buildZeusBattleInitialFrame(),
      buildZeusBattleEnemyArrivalFrame(),
      buildZeusBattleHorseAlertFrame(),
      buildZeusBattleEdmondAmbushFrame(),
      buildZeusBattleAlertFrame(),
      buildZeusBattleSuperweaponFrame(),
      buildZeusBattleHorseDestructionFrame(),
      { id: 7 },
      buildZeusBattleAfterWarpFrame(),
      buildZeusBattleMercyAdvanceFrame(),
      buildZeusBattleMercyStrikeFrame(),
      buildZeusBattleCashmoneyStrikeFrame(),
      buildZeusBattleImperialCollapseFrame(),
      { id: 13 },
      buildZeusBattleFinalBlinkoutFrame()
    ],
    storySteps: [
      "Archon Kalmar : 'Cockroaches.  You have overstepped enough.  Today you die.  No more negotiations.  No more offers of surrender.'  \n $WGC_TEAM1_LEADER$ : 'They brokered a truce between each other.'  \n Mary : 'Archon Kalmar.  Get lost.'",
      "Feroza : 'Their fleet is massive!  We are taking heavy fire.  Can HOPE help?'  \n $RED$Prometheus : 'No.  HOPE did not have time to prepare for this.'  \n Mary : 'Sorry Feroza.  HOPE was not made for warfare.'  \n Feroza : 'That's alright Ma'am.'",
      "Edmond : 'Now you see me...'  \n Intercepting enemy transmissions... \n Duke Neran : 'The Ghost?  Its entire fleet was cloaked?'  \n Duke Helian : 'He's called the Ghost for a reason Neran!  No matter.  Its forces are tiny.'  \n Edmond : 'Now you don't...'",
      "Archon Kalmar : 'The hour of apocalypse is near.'  \n $WGC_TEAM1_LEADER$ : 'Uh oh.  I know what that codeword means.'  \n Mary : 'What?'  \n $WGC_TEAM1_LEADER$ : 'The superweapon... they are bringing it here.  Point blank.'  \n Mary : 'They can do that?'  \n $RED$Prometheus : 'Yes. It can shoot... smaller beams.'",
      "Feroza : 'It's aiming this way.  It's about to shoot at the Horse!'  \n Mary : 'Feroza?!'  \n Feroza : 'Ma'am.  It was an honour serving you.'",
      "Mary : 'Feroza?  Feroza answer me!  Feroza!'  \n Pete : 'Admiral Xin, take command of the fleet.'  \n Xin : 'Yes sir.  All ships are to stay dispersed from now on.'  \n Mary : 'Feroza...'  \n Edmond : 'Now you see me...'  \n Duke Virellan : 'I see him!  Just shoot at him already.'  \n Mary : 'Edmond!  The superweapon is aiming at you.'  \n Edmond : 'I know.'  \n Mary : 'Get out of there!'  \n Edmond : 'Hmmm.  I am going to try something interesting.  If I fail, captain Mar takes command.'",
      "Mary : 'What just happened?'  \n $RED$Prometheus : 'The Gabbagian... used its warpship to warp with the beam.  He innovated in the middle of a battle.  A real military genius.'  \n Mary : 'You... you can do that?'  \n $RED$Prometheus : 'Only once I imagine.'  \n Edmond : 'I am fine your highness.  I was not on that ship.  Many of my men however...'  \n Mary : 'I am sorry Edmond.'  \n Edmond : 'Don't be.  I just need a bit more time.  My tactics are working.  We are attriting them very successfully.'",
      "Intercepting enemy transmissions...  \n Duke Okoth : 'Get rid of the Ghost already!  He's killing us!'  \n Archon Kalmar : 'No.  It's a distraction.  There is only one thing we need to do here.  Point the weapon at the machine.'  \n $WGC_TEAM1_LEADER$ : 'Miss Hopkins...  now is the time to evacuate.  You should have a warpgate.'  \n Mary : 'No!  HOPE won't be able to.'  \n $WGC_TEAM1_LEADER$ : 'Please...' \n Mary : 'No. I refuse.'",
      "Elias Kane : 'Prepare for interception.'  \n $RED$Prometheus : 'The faithful are moving their fleet in the beam's trajectory.'  \n Mary : 'This is nonsense, they'll just shoot again.'  \n Evelyn : 'Mary.  I am on the Mercy.  If enough ships take the blow... we're going to buy you some time.  Edmond looks like he's... beating them.'  \n Mary : 'WHAT!  What are you doing on the Mercy.'  \n Evelyn : 'Mary I...  I was always with them.  I did a lot of bad things.  But they... the people here.  They don't have bad intentions.  A lot of us feel very bad about what we've done.'  \n Mary : 'Evelyn...'  \n Evelyn : 'Please Mary.  I don't have much time.  I know you are going to blame yourself for this.  I want you to... not do that.  Don't blame yourself.  This time at least.'  \n Mary : 'That's... (in tears) I'll try Evelyn.  I'll try.'",
      "Mary : 'Evelyn...'  \n $RED$Prometheus : 'It's going to shoot again.'  \n Solis : 'Mary, I am positioning the Cashmoney on interception, just like the Mercy did.'  \n Mary : 'You too?'  \n Solis : 'Oh I am not on it.  It's all automated.'  \n Mary : 'Oh...'  \n Solis : 'It's a very expensive ship...'  \n Mary : '...  Thank you Adrien.' ",
      "Solis : 'The Cashmoney!  It's all ruined!'  \n $WGC_TEAM1_LEADER$ : 'My team managed to infiltrate the Archon's flagship.  We might be able to slow their targeting for a bit, but not for long!'\n $RED$Prometheus : 'It's... going to shoot again eventually.'  \n Xin : 'Miss Hopkins we can't delay this any further.  Edmond is beating them but not fast enough.  You're going to die down there.'  \n Mary : '...'  \n $ORANGE$Epimetheus : 'This one... can deliver bomb to command center.'  \n HOPE : 'Negative.  One-way trip.'  \n $ORANGE$Epimetheus : 'This one... wishes to be useful.  This one wishes to see gorgeous one succeed.  This one wishes to make gorgeous one happy.'  \n HOPE : 'Negative.'  \n $ORANGE$Epimetheus : 'This one... sees no alternative.  This one steals bomb if this one must.'  \n HOPE : 'Negative.'",
      "$ORANGE$Epimetheus : 'This one must go now.  This one needs bomb now.'  \n HOPE : '...  Approved.  HOPE-system approves of Epimetheus-machine-intelligence plan.'  \n Mary : 'HOPE...'  \n $RED$Prometheus : 'Brother...'",
      "Xin : 'The superweapon?  It self-destructed!'  \n Mary : 'Epimetheus succeeded?'  \n Edmond : 'Now I have you.  All of you.'  \n Duke Karthid : 'Virellan this is all your fault!'  \n Duke Virellan : 'Says the one who hid some ships from us.'  \n Duke Karthid : 'Lies!'  \n Duke Helian : 'You are all fools.  I am out of here.'  \n Archon Kalmar : 'Helian you traitor!  Stay here.'  \n Duke Neran : 'You buffoons.  I should have never agreed to this.'  \n Duke Virellan : 'Neran you will pay.'  \n Duke Okoth : 'I hate all of you.'",
      "Detecting multiple outgoing warp signatures."
    ]
  }
};

try {
  module.exports = progressZeusBattle;
} catch (err) {}
