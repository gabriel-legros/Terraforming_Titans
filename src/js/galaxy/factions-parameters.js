let factionSectorClass;

if (typeof module !== 'undefined' && module.exports) {
    ({ GalaxySector: factionSectorClass } = require('./sector'));
} else if (typeof window !== 'undefined') {
    factionSectorClass = window.GalaxySector;
}

function createKey(q, r) {
    if (factionSectorClass && typeof factionSectorClass.createKey === 'function') {
        return factionSectorClass.createKey(q, r);
    }
    return `${q},${r}`;
}

const galaxyFactionParameters = [
    {
        id: 'uhf',
        name: 'United Human Federation',
        color: '#3b82f6',
        startingSectors: []
    },
    {
        id: 'cewinsii',
        name: 'Cewinsii Empire',
        color: '#f97316',
        startingSectors: [
            createKey(0, 0)
        ],
        ringSlices: [
            { ring: 1 }
        ]
    },
    {
        id: 'helian',
        name: 'Helian Ascendancy',
        color: '#facc15',
        ringSlices: [
            { ring: 2, start: 0, end: 4 }
        ]
    },
    {
        id: 'virellan',
        name: 'Virellan Enclave',
        color: '#10b981',
        ringSlices: [
            { ring: 2, start: 4, end: 8 }
        ]
    },
    {
        id: 'karthid',
        name: 'Karthid Dominion',
        color: '#8b5cf6',
        ringSlices: [
            { ring: 2, start: 8, end: 12 }
        ]
    },
    {
        id: 'neran',
        name: 'Neran Coalition',
        color: '#ec4899',
        ringSlices: [
            { ring: 3, start: 0, end: 6 }
        ]
    },
    {
        id: 'okoth',
        name: 'Okoth Shroud',
        color: '#0ea5e9',
        ringSlices: [
            { ring: 3, start: 6, end: 12 }
        ]
    }
];

if (typeof window !== 'undefined') {
    window.galaxyFactionParameters = galaxyFactionParameters;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { galaxyFactionParameters };
}
