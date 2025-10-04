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
        name: 'UHF',
        color: '#3b82f6',
        startingSectors: [],
        defensiveness: null
    },
    {
        id: 'cewinsii',
        name: 'Cewinsii',
        color: '#f97316',
        startingSectors: [
            createKey(0, 0)
        ],
        ringSlices: [
            { ring: 1 }
        ],
        defensiveness: 0.8,
        autoOperationRange: {
            min: 0.1,
            max: 0.15
        }
    },
    {
        id: 'helian',
        name: 'Helian',
        color: '#facc15',
        defensiveness: 0.5,
        autoOperationRange: {
            min: 0.1,
            max: 0.3
        },
        ringSlices: [
            { ring: 2, start: 1, end: 3 },
            { ring: 3, start: 2, end: 5 },
            { ring: 4, start: 3, end: 7 },
            { ring: 5, start: 3, end: 9 },
            { ring: 6, start: 4, end: 10 }
        ]
    },
    {
        id: 'virellan',
        name: 'Virellan',
        color: '#10b981',
        defensiveness: 0.5,
        autoOperationRange: {
            min: 0.1,
            max: 0.3
        },
        ringSlices: [
            { ring: 2, start: 4, end: 5 },
            { ring: 3, start: 6, end: 8 },
            { ring: 4, start: 8, end: 10 },
            { ring: 5, start: 10, end: 13 },
            { ring: 6, start: 11, end: 15 }
        ]
    },
    {
        id: 'karthid',
        name: 'Karthid',
        color: '#8b5cf6',
        defensiveness: 0.5,
        autoOperationRange: {
            min: 0.1,
            max: 0.3
        },
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
        name: 'Neran',
        color: '#ec4899',
        defensiveness: 0.5,
        autoOperationRange: {
            min: 0.1,
            max: 0.3
        },
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
        name: 'Okoth',
        color: '#ef4444',
        defensiveness: 0.5,
        autoOperationRange: {
            min: 0.1,
            max: 0.3
        },
        ringSlices: [
            { ring: 2, start: 11, end: 12 },
            { ring: 3, start: 1, end: 1 },
            { ring: 3, start: 16, end: 18 },
            { ring: 4, start: 20, end: 24 },
            { ring: 4, start: 1, end: 2 },
            { ring: 5, start: 25, end: 30 },
            { ring: 5, start: 1, end: 2 },
            { ring: 6, start: 31, end: 36 },
            { ring: 6, start: 1, end: 3 },

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
