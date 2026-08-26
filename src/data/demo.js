// Demo data: vessels + spill polygon for Gulf of Mexico
// Spill center: ~27.5°N, 89.0°W (near Deepwater Horizon site)

export const SPILL_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Oil Spill Alpha-7', confidence: 0.91 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-89.35, 27.62],
          [-89.10, 27.70],
          [-88.85, 27.58],
          [-88.78, 27.38],
          [-88.95, 27.22],
          [-89.20, 27.18],
          [-89.48, 27.32],
          [-89.52, 27.50],
          [-89.35, 27.62],
        ]],
      },
    },
  ],
}

export const INITIAL_VESSELS = [
  {
    id: 'V001',
    name: 'MV OLYMPUS TITAN',
    imo: '9234501',
    type: 'Tanker',
    flag: 'GR',
    lat: 27.45, // Gulf of Mexico (Suspect)
    lon: -89.12,
    heading: 142,
    speed: 11.4, // knots
    score: 87,
    distance: 12.3, // nm from spill
    timeGap: 4,    // hours
    isSuspect: true,
  },
  {
    id: 'V002',
    name: 'MV PETRO CROWN',
    imo: '9345612',
    type: 'Crude Carrier',
    flag: 'MT',
    lat: 56.50, // North Sea
    lon: 3.20,
    heading: 210,
    speed: 8.7,
    score: 63,
    distance: 28.7,
    timeGap: 7,
    isSuspect: false,
  },
  {
    id: 'V003',
    name: 'MV SEA ATLAS',
    imo: '9456723',
    type: 'Chemical Tanker',
    flag: 'PA',
    lat: 26.50, // Persian Gulf
    lon: 53.00,
    heading: 65,
    speed: 13.1,
    score: 41,
    distance: 41.2,
    timeGap: 11,
    isSuspect: false,
  },
  {
    id: 'V004',
    name: 'MV NORDIC SPIRIT',
    imo: '9567834',
    type: 'Product Tanker',
    flag: 'NO',
    lat: 15.00, // South China Sea
    lon: 115.00,
    heading: 350,
    speed: 6.2,
    score: 29,
    distance: 58.9,
    timeGap: 14,
    isSuspect: false,
  },
  {
    id: 'V005',
    name: 'MV GULF PIONEER',
    imo: '9678945',
    type: 'VLCC',
    flag: 'LR',
    lat: 35.90, // Strait of Gibraltar
    lon: -5.50,
    heading: 290,
    speed: 15.3,
    score: 22,
    distance: 74.1,
    timeGap: 18,
    isSuspect: false,
  },
  {
    id: 'V006',
    name: 'MV ARCTIC STAR',
    imo: '9789056',
    type: 'Tanker',
    flag: 'RU',
    lat: -34.00, // Cape of Good Hope
    lon: 18.00,
    heading: 100,
    speed: 12.1,
    score: 15,
    distance: 85.0,
    timeGap: 24,
    isSuspect: false,
  },
  {
    id: 'V007',
    name: 'MV PACIFIC DAWN',
    imo: '9890167',
    type: 'Crude Carrier',
    flag: 'JP',
    lat: 34.00, // Coast of Japan
    lon: 142.00,
    heading: 45,
    speed: 14.5,
    score: 10,
    distance: 120.0,
    timeGap: 36,
    isSuspect: false,
  },
]

export const SYSTEM_STATS = {
  iou: 0.847,
  vessels: 5,
  detectTime: 2.3, // seconds (detect → correlate)
}

export const DEMO_SECTOR = 'GULF OF MEXICO · SECTOR GOM-7'
export const MAP_CENTER = [-89.1, 27.5]
export const MAP_ZOOM_START = 1
export const MAP_ZOOM_END = 6.5

// Globe hero: camera starts over the mid-Atlantic so the zoom
// creates a cinematic westward rotation into the Gulf of Mexico.
export const GLOBE_START_CENTER = [10, 20]
export const GLOBE_START_ZOOM = 1.5
export const GLOBE_START_BEARING = 15
