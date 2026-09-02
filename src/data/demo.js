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
export const MAP_ZOOM_END = 5.5

// Globe hero: camera starts over the Pacific so the Americas/Atlantic 
// are pushed off-axis to the right edge, fitting the asymmetric HUD.
export const GLOBE_START_CENTER = [-105, 25]
export const GLOBE_START_ZOOM = 2.8
export const GLOBE_START_BEARING = -5

// ── Globe spill marker data ────────────────────────────────────────────────────
export const SPILL_LOCATIONS = [
  {
    id: 'SPILL-001',
    name: 'ALPHA-7',
    lat: 27.45,
    lon: -89.1,
    confidence: 0.91,
    areaKm2: 247,
    timestamp: '2026-08-24T14:32:00Z',
    sarScene: 'S1A_IW_GRDH_20260824',
    resolution: '10m GRD',
    pass: 'Ascending · T047',
    model: 'YOLOv8-seg',
    iou: 0.847,
    severity: 'CRITICAL',
    nearbyVessels: [
      { id: 'V001', name: 'MV OLYMPUS TITAN', type: 'Tanker', flag: 'GR', distance: 12.3, heading: 142, speed: 11.4, score: 87, timeGap: 4, isSuspect: true },
      { id: 'V002', name: 'MV PETRO CROWN', type: 'Crude Carrier', flag: 'MT', distance: 28.7, heading: 210, speed: 8.7, score: 63, timeGap: 7, isSuspect: false },
    ],
    suspectVessel: 'V001',
    reportSummary: 'Large crude oil slick detected via SAR backscatter anomaly. Primary suspect MV OLYMPUS TITAN identified within 12.3 nm, AIS blackout of 4h correlates with spill timestamp. MRCC alert dispatched.',
  },
  {
    id: 'SPILL-002',
    name: 'BETA-3',
    lat: 4.2,
    lon: 3.8,
    confidence: 0.87,
    areaKm2: 185,
    timestamp: '2026-08-23T09:15:00Z',
    sarScene: 'S1B_IW_GRDH_20260823',
    resolution: '10m GRD',
    pass: 'Descending · T168',
    model: 'YOLOv8-seg',
    iou: 0.812,
    severity: 'HIGH',
    nearbyVessels: [
      { id: 'V010', name: 'MV LAGOS SPIRIT', type: 'VLCC', flag: 'NG', distance: 8.1, heading: 195, speed: 6.3, score: 78, timeGap: 3, isSuspect: true },
      { id: 'V011', name: 'MV ATLANTIC CROWN', type: 'Product Tanker', flag: 'LR', distance: 34.5, heading: 310, speed: 12.1, score: 42, timeGap: 9, isSuspect: false },
    ],
    suspectVessel: 'V010',
    reportSummary: 'Oil slick in Niger Delta offshore zone. VLCC MV LAGOS SPIRIT flagged for proximity and AIS gap during STS transfer window.',
  },
  {
    id: 'SPILL-003',
    name: 'GAMMA-1',
    lat: 26.8,
    lon: 52.5,
    confidence: 0.79,
    areaKm2: 92,
    timestamp: '2026-08-22T18:44:00Z',
    sarScene: 'S1A_IW_GRDH_20260822',
    resolution: '10m GRD',
    pass: 'Ascending · T079',
    model: 'YOLOv8-seg',
    iou: 0.798,
    severity: 'MEDIUM',
    nearbyVessels: [
      { id: 'V020', name: 'MV PERSIAN WAVE', type: 'Chemical Tanker', flag: 'IR', distance: 15.7, heading: 88, speed: 9.8, score: 71, timeGap: 6, isSuspect: true },
      { id: 'V021', name: 'MV GULF TRADER', type: 'Tanker', flag: 'AE', distance: 22.0, heading: 145, speed: 14.2, score: 55, timeGap: 5, isSuspect: false },
      { id: 'V022', name: 'MV QATAR EXPRESS', type: 'LNG Carrier', flag: 'QA', distance: 40.3, heading: 270, speed: 16.5, score: 28, timeGap: 12, isSuspect: false },
    ],
    suspectVessel: 'V020',
    reportSummary: 'Chemical sheen detected near Strait of Hormuz. MV PERSIAN WAVE showed anomalous speed reduction and heading change consistent with discharge event.',
  },
  {
    id: 'SPILL-004',
    name: 'DELTA-5',
    lat: 14.5,
    lon: 114.8,
    confidence: 0.83,
    areaKm2: 156,
    timestamp: '2026-08-21T06:20:00Z',
    sarScene: 'S1B_IW_GRDH_20260821',
    resolution: '10m GRD',
    pass: 'Ascending · T011',
    model: 'YOLOv8-seg',
    iou: 0.831,
    severity: 'HIGH',
    nearbyVessels: [
      { id: 'V030', name: 'MV JADE FORTUNE', type: 'Crude Carrier', flag: 'PA', distance: 5.9, heading: 22, speed: 3.1, score: 92, timeGap: 2, isSuspect: true },
      { id: 'V031', name: 'MV PACIFIC ARROW', type: 'Container', flag: 'SG', distance: 45.2, heading: 180, speed: 18.3, score: 15, timeGap: 14, isSuspect: false },
    ],
    suspectVessel: 'V030',
    reportSummary: 'Major spill in South China Sea near Paracel Islands. MV JADE FORTUNE found nearly stationary 5.9 nm from centre with AIS transponder off for 2h. Flag state Panama notified.',
  },
  {
    id: 'SPILL-005',
    name: 'EPSILON-2',
    lat: 57.8,
    lon: 1.9,
    confidence: 0.74,
    areaKm2: 68,
    timestamp: '2026-08-20T11:05:00Z',
    sarScene: 'S1A_IW_GRDH_20260820',
    resolution: '10m GRD',
    pass: 'Descending · T088',
    model: 'YOLOv8-seg',
    iou: 0.762,
    severity: 'MEDIUM',
    nearbyVessels: [
      { id: 'V040', name: 'MV NORTH VIKING', type: 'Shuttle Tanker', flag: 'NO', distance: 19.4, heading: 315, speed: 10.5, score: 61, timeGap: 8, isSuspect: true },
      { id: 'V041', name: 'MV EKOFISK SUPPLY', type: 'OSV', flag: 'NO', distance: 7.2, heading: 90, speed: 5.0, score: 44, timeGap: 1, isSuspect: false },
    ],
    suspectVessel: 'V040',
    reportSummary: 'Thin oil film detected near Ekofisk field, North Sea. Likely operational discharge. MV NORTH VIKING identified as closest tanker with departure vector from spill origin.',
  },
  {
    id: 'SPILL-006',
    name: 'ZETA-9',
    lat: 36.2,
    lon: 12.5,
    confidence: 0.69,
    areaKm2: 41,
    timestamp: '2026-08-19T22:30:00Z',
    sarScene: 'S1B_IW_GRDH_20260819',
    resolution: '10m GRD',
    pass: 'Ascending · T036',
    model: 'YOLOv8-seg',
    iou: 0.715,
    severity: 'LOW',
    nearbyVessels: [
      { id: 'V050', name: 'MV SICILIA NOVA', type: 'Product Tanker', flag: 'IT', distance: 31.0, heading: 260, speed: 13.7, score: 38, timeGap: 10, isSuspect: true },
    ],
    suspectVessel: 'V050',
    reportSummary: 'Small bilge discharge suspected in central Mediterranean, south of Sicily. Low confidence — possible natural seep or lookalike. MV SICILIA NOVA flagged as nearest vessel.',
  },
]

