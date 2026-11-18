export const CONFIG = {
  city: {
    grid: 9,
    blockSize: 60,
    roadWidth: 12,
    buildingMinH: 14,
    buildingMaxH: 70,
    waterX: -300
  },
  player: {
    walkSpeed: 6,
    runSpeed: 10,
    health: 100,
    startMoney: 50
  },
  car: {
    accel: 22,
    topSpeed: 42,
    brake: 30,
    turn: 2.2,
    handbrake: 18
  },
  police: {
    baseSpeed: 26,
    chaseSpeed: 34,
    spawnDist: 90,
    maxUnits: 6
  },
  camera: {
    height: 9,
    dist: 16
  },
  colors: {
    sky: '#ff7733',
    road: '#222222',
    sidewalk: '#888888',
    building: ['#666677', '#776666', '#556677', '#777766', '#665555', '#555566'],
    water: '#114488',
    grass: '#225522'
  }
};

export const MISSIONS = [
  {
    id: 1,
    name: "First Day in Vice Point",
    briefing: "A new arrival drives to contact Rico at the marina.",
    objective: "Drive to the marina to meet Rico.",
    type: "drive-to",
    target: { x: -200, z: 150 },
    reward: 200,
    wanted: 0
  },
  {
    id: 2,
    name: "The Pickup",
    briefing: "Collect a package at the east-side warehouse.",
    objective: "Pick up the package at the warehouse.",
    type: "pickup",
    target: { x: 220, z: -100 },
    reward: 400,
    wanted: 1
  },
  {
    id: 3,
    name: "Getaway",
    briefing: "Lose a 3-star wanted level and reach the safehouse.",
    objective: "Lose the cops and reach the safehouse.",
    type: "escape",
    target: { x: 0, z: 0 },
    reward: 600,
    wanted: 3
  },
  {
    id: 4,
    name: "The Big Score",
    briefing: "Rob the jewelry store, deliver the goods to the garage across town.",
    objective: "Deliver stolen goods to the garage.",
    type: "deliver",
    target: { x: -180, z: -180 },
    reward: 900,
    wanted: 2
  },
  {
    id: 5,
    name: "Sky High",
    briefing: "Steal the helicopter from the hospital roof, fly to the skyscraper helipad.",
    objective: "Fly chopper to skyscraper helipad.",
    type: "fly-to",
    target: { x: 150, z: 180 },
    reward: 1200,
    wanted: 2
  },
  {
    id: 6,
    name: "Kingpin's Errand",
    briefing: "Deliver a package to the mansion in 90 seconds under 4-star heat.",
    objective: "Deliver package to mansion under high heat.",
    type: "deliver",
    target: { x: -220, z: 220 },
    reward: 1800,
    wanted: 4
  },
  {
    id: 7,
    name: "Vice Point Legend",
    briefing: "Survive 5-star heat and reach the yacht to escape.",
    objective: "Reach the yacht and escape Vice Point.",
    type: "survive",
    target: { x: -280, z: -280 },
    reward: 3000,
    wanted: 5
  }
];

export const SAVE_KEY = 'vice-point-v6.save';
export const BEST_KEY = 'vice-point-v6.best';

export const RADIO_STATIONS = [
  {
    name: "V-Chat / Synthwave",
    tempo: 100,
    scale: [0, 2, 3, 5, 7, 8, 10],
    wave: "sawtooth"
  },
  {
    name: "Vice Groove",
    tempo: 115,
    scale: [0, 3, 5, 7, 10],
    wave: "square"
  },
  {
    name: "Ocean View Talk",
    tempo: 80,
    scale: [0, 4, 7],
    wave: "triangle"
  }
];
