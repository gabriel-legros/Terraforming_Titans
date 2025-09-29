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
            { ring: 2, start: 1, end: 3 },
            { ring: 3, start: 1, end: 5 },
            { ring: 4, start: 1, end: 6 },
            { ring: 4, start: 24, end: 24 },
            { ring: 5, start: 1, end: 8 },
            { ring: 6, start: 1, end: 9 }
        ]
    },
    {
        id: 'virellan',
        name: 'Virellan Enclave',
        color: '#10b981',
        ringSlices: [
            { ring: 2, start: 4, end: 5 },
            { ring: 3, start: 6, end: 8 },
            { ring: 4, start: 7, end: 10 },
            { ring: 5, start: 9, end: 13 },
            { ring: 6, start: 10, end: 15 }
        ]
    },
    {
        id: 'karthid',
        name: 'Karthid Dominion',
        color: '#8b5cf6',
        ringSlices: [
            { ring: 2, start: 6, end: 8 },
            { ring: 3, start: 9, end: 11 },
            { ring: 4, start: 11, end: 14 },
            { ring: 5, start: 14, end: 17 },
            { ring: 6, start: 16, end: 21 }
        ]
    },
    {
        id: 'neran',
        name: 'Neran Coalition',
        color: '#ec4899',
        ringSlices: [
            { ring: 2, start: 9, end: 10 },
            { ring: 3, start: 12, end: 15 },
            { ring: 4, start: 15, end: 19 },
            { ring: 5, start: 18, end: 24 },
            { ring: 6, start: 22, end: 30 }
        ]
    },
    {
        id: 'okoth',
        name: 'Okoth Shroud',
        color: '#0ea5e9',
        ringSlices: [
            { ring: 2, start: 11, end: 12 },
            { ring: 3, start: 16, end: 18 },
            { ring: 4, start: 20, end: 23 },
            { ring: 5, start: 25, end: 30 },
            { ring: 6, start: 31, end: 36 }
        ]
    }
];

const galaxySectorControlOverrides = {
    [createKey(4, -5)]: {
        uhf: 0.1,
        helian: 0.9
    }
};

if (typeof window !== 'undefined') {
    window.galaxyFactionParameters = galaxyFactionParameters;
    window.galaxySectorControlOverrides = galaxySectorControlOverrides;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { galaxyFactionParameters, galaxySectorControlOverrides };
}
