import { CONFIG } from './config.js';
import { makeRng } from './random.js';

export function createWorld(seed) {
  const rng = makeRng(seed);
  const grid = CONFIG.city.grid; // 9
  const blockSize = CONFIG.city.blockSize; // 60
  const roadWidth = CONFIG.city.roadWidth; // 12
  const step = blockSize + roadWidth; // 72
  const halfGrid = Math.floor(grid / 2); // 4

  const roads = [];
  const buildings = [];

  // Generate vertical road strips
  for (let c = -halfGrid - 1; c <= halfGrid; c++) {
    const rx = c * step + blockSize / 2;
    const rzMin = (-halfGrid - 0.5) * step;
    const rzMax = (halfGrid + 0.5) * step;
    roads.push({
      x: rx - roadWidth / 2,
      z: rzMin,
      w: roadWidth,
      d: rzMax - rzMin,
      axis: 'v',
      center: rx
    });
  }

  // Generate horizontal road strips
  for (let r = -halfGrid - 1; r <= halfGrid; r++) {
    const rz = r * step + blockSize / 2;
    const rxMin = (-halfGrid - 0.5) * step;
    const rxMax = (halfGrid + 0.5) * step;
    roads.push({
      x: rxMin,
      z: rz - roadWidth / 2,
      w: rxMax - rxMin,
      d: roadWidth,
      axis: 'h',
      center: rz
    });
  }

  // Coastal water region along west edge
  const waterX = CONFIG.city.waterX; // -300
  const water = {
    x: waterX - 150,
    z: (-halfGrid - 1) * step,
    w: 150,
    d: (grid + 2) * step,
    color: CONFIG.colors.water
  };

  // Specific shops list with assigned block coordinates (gx, gz)
  const shopAssignments = [
    { name: 'Jewelry Store', kind: 'shop', gx: -2, gz: -2 },
    { name: 'Marina', kind: 'shop', gx: -4, gz: 2 },
    { name: 'Warehouse', kind: 'shop', gx: 3, gz: -2 },
    { name: 'Hospital', kind: 'shop', gx: 2, gz: 2 },
    { name: 'Mansion', kind: 'shop', gx: -3, gz: 3 },
    { name: 'Safehouse', kind: 'safehouse', gx: 0, gz: 0 },
    { name: 'Garage', kind: 'garage', gx: -2, gz: 2 },
    { name: 'Yacht Club', kind: 'shop', gx: -4, gz: -2 }
  ];

  const shops = [];
  const assignedBlocks = new Set();
  shopAssignments.forEach(s => {
    assignedBlocks.add(`${s.gx},${s.gz}`);
    shops.push({
      x: s.gx * step,
      z: s.gz * step,
      name: s.name,
      kind: s.kind
    });
  });

  // Generate buildings for all blocks
  const buildingColors = CONFIG.colors.building;
  const spawnPoint = { x: 0, z: 6 };

  for (let gx = -halfGrid; gx <= halfGrid; gx++) {
    for (let gz = -halfGrid; gz <= halfGrid; gz++) {
      const bxCenter = gx * step;
      const bzCenter = gz * step;

      const count = rng.int(1, 2);
      for (let i = 0; i < count; i++) {
        let bw, bd, bx, bz;
        if (count === 1) {
          bw = blockSize - 8;
          bd = blockSize - 8;
          bx = bxCenter;
          bz = bzCenter;
        } else {
          bw = blockSize / 2 - 6;
          bd = blockSize - 8;
          bx = bxCenter + (i === 0 ? -bw / 2 - 2 : bw / 2 + 2);
          bz = bzCenter;
        }

        const h = rng.int(CONFIG.city.buildingMinH, CONFIG.city.buildingMaxH);
        const color = rng.pick(buildingColors);

        // CRITICAL RULE: spawn must stay clear (0, 6) with 2-unit margin
        const minX = bx - bw / 2 - 2;
        const maxX = bx + bw / 2 + 2;
        const minZ = bz - bd / 2 - 2;
        const maxZ = bz + bd / 2 + 2;

        const coversSpawn = (
          spawnPoint.x >= minX && spawnPoint.x <= maxX &&
          spawnPoint.z >= minZ && spawnPoint.z <= maxZ
        );

        if (!coversSpawn) {
          buildings.push({
            x: bx,
            z: bz,
            w: bw,
            d: bd,
            h: h,
            color: color
          });
        }
      }
    }
  }

  // Traffic cars (~14)
  const traffic = [];
  const trafficColors = ['#cc2222', '#2222cc', '#cccc22', '#cccccc', '#22cc22', '#ee8811', '#8822cc'];
  for (let i = 0; i < 14; i++) {
    const road = rng.pick(roads);
    const t = rng.float(0.1, 0.9);
    let x, z, angle;
    if (road.axis === 'v') {
      x = road.x + road.w / 2;
      z = road.z + road.d * t;
      angle = rng.pick([0, Math.PI]);
    } else {
      x = road.x + road.w * t;
      z = road.z + road.d / 2;
      angle = rng.pick([-Math.PI / 2, Math.PI / 2]);
    }
    traffic.push({
      x,
      z,
      angle,
      speed: rng.float(8, 14),
      color: rng.pick(trafficColors),
      roadIndex: roads.indexOf(road)
    });
  }

  // Pedestrians (~24)
  const peds = [];
  for (let i = 0; i < 24; i++) {
    const road = rng.pick(roads);
    const t = rng.float(0.05, 0.95);
    let x, z;
    const offset = roadWidth / 2 + 3;
    if (road.axis === 'v') {
      x = road.x + road.w / 2 + (rng.next() > 0.5 ? offset : -offset);
      z = road.z + road.d * t;
    } else {
      x = road.x + road.w * t;
      z = road.z + road.d / 2 + (rng.next() > 0.5 ? offset : -offset);
    }
    peds.push({
      x,
      z,
      angle: rng.float(0, Math.PI * 2),
      speed: rng.float(1, 2.2),
      patrolDist: rng.float(30, 80),
      traveled: 0
    });
  }

  // Parked cars (~10)
  const parked = [];
  for (let i = 0; i < 10; i++) {
    const road = rng.pick(roads);
    const t = rng.float(0.1, 0.9);
    let x, z, angle;
    const parkOffset = roadWidth / 2 + 4;
    if (road.axis === 'v') {
      x = road.x + road.w / 2 + (rng.next() > 0.5 ? parkOffset : -parkOffset);
      z = road.z + road.d * t;
      angle = rng.next() > 0.5 ? 0 : Math.PI;
    } else {
      x = road.x + road.w * t;
      z = road.z + road.d / 2 + (rng.next() > 0.5 ? parkOffset : -parkOffset);
      angle = rng.next() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    parked.push({
      x,
      z,
      angle,
      color: rng.pick(trafficColors),
      taken: false
    });
  }

  // Police cars (6) parked at police station block
  const police = [];
  const policeBaseX = 2 * step + 10;
  const policeBaseZ = 2 * step + 10;
  for (let i = 0; i < CONFIG.police.maxUnits; i++) {
    police.push({
      x: policeBaseX + (i % 3) * 6,
      z: policeBaseZ + Math.floor(i / 3) * 8,
      angle: 0,
      speed: 0,
      active: false
    });
  }

  // Helicopter on hospital roof
  const hospitalBlockX = 2 * step;
  const hospitalBlockZ = 2 * step;
  const heli = {
    x: hospitalBlockX,
    y: 35,
    z: hospitalBlockZ,
    active: false,
    angle: 0
  };

  return {
    city: {
      blocks: grid * grid,
      roads,
      buildings
    },
    water,
    traffic,
    peds,
    parked,
    police,
    heli,
    shops,
    spawn: spawnPoint
  };
}

export function updateWorld(world, dt, player, wanted) {
  const roads = world.city.roads;
  const boundsMax = 350;
  const boundsMin = -350;

  // 1. Update traffic cars
  if (world.traffic) {
    for (const car of world.traffic) {
      car.x += Math.sin(car.angle) * car.speed * dt;
      car.z += Math.cos(car.angle) * car.speed * dt;

      if (car.x > boundsMax || car.x < boundsMin || car.z > boundsMax || car.z < boundsMin) {
        const road = roads[Math.floor(Math.random() * roads.length)];
        const t = Math.random();
        if (road.axis === 'v') {
          car.x = road.x + road.w / 2;
          car.z = road.z + road.d * t;
          car.angle = Math.random() > 0.5 ? 0 : Math.PI;
        } else {
          car.x = road.x + road.w * t;
          car.z = road.z + road.d / 2;
          car.angle = Math.random() > 0.5 ? -Math.PI / 2 : Math.PI / 2;
        }
      }

      if (Math.random() < 0.02) {
        car.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2);
      }
    }
  }

  // 2. Update pedestrians
  if (world.peds) {
    for (const ped of world.peds) {
      ped.x += Math.sin(ped.angle) * ped.speed * dt;
      ped.z += Math.cos(ped.angle) * ped.speed * dt;
      ped.traveled += ped.speed * dt;

      if (ped.traveled > ped.patrolDist || ped.x > boundsMax || ped.x < boundsMin || ped.z > boundsMax || ped.z < boundsMin) {
        ped.angle += Math.PI + (Math.random() - 0.5);
        ped.traveled = 0;
      }
    }
  }

  // 3. Update police units
  if (world.police && player) {
    const activeCount = wanted > 0 ? Math.min(wanted, CONFIG.police.maxUnits) : 0;
    for (let i = 0; i < world.police.length; i++) {
      const cop = world.police[i];
      if (i < activeCount) {
        if (!cop.active) {
          const angle = Math.random() * Math.PI * 2;
          const dist = CONFIG.police.spawnDist || 90;
          cop.x = player.x + Math.sin(angle) * dist;
          cop.z = player.z + Math.cos(angle) * dist;
          cop.active = true;
        }

        const dx = player.x - cop.x;
        const dz = player.z - cop.z;
        const targetAngle = Math.atan2(dx, dz);
        cop.angle = targetAngle;

        const speed = (wanted >= 2) ? CONFIG.police.chaseSpeed : CONFIG.police.baseSpeed;
        cop.speed = speed;

        cop.x += Math.sin(cop.angle) * cop.speed * dt;
        cop.z += Math.cos(cop.angle) * cop.speed * dt;
      } else {
        cop.active = false;
        cop.speed = 0;
      }
    }
  }

  // 4. Update helicopter (wanted >= 3)
  if (world.heli && player) {
    if (wanted >= 3) {
      world.heli.active = true;
      const time = Date.now() * 0.001;
      const circleRadius = 40;
      const circleSpeed = 0.5;
      world.heli.x = player.x + Math.sin(time * circleSpeed) * circleRadius;
      world.heli.z = player.z + Math.cos(time * circleSpeed) * circleRadius;
      world.heli.y = 60;
    } else {
      world.heli.active = false;
    }
  }
}
