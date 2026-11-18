import { CONFIG } from './config.js';

export function stageShot(game, shotName) {
  const world = game.world;
  const player = game.player;
  const roads = world.city && world.city.roads ? world.city.roads : [];

  if (shotName === 'start') {
    game.screen = 'title';
    player.x = world.spawn.x;
    player.z = world.spawn.z;
    player.angle = 0;
    player.speed = 0;
    player.inCar = null;
    game.wanted = 0;
  } else if (shotName === 'play' || shotName === 'chase') {
    game.screen = 'play';
    game.wanted = shotName === 'chase' ? 3 : (game.mission && game.mission.wanted !== undefined ? game.mission.wanted : 0);

    const target = game.mission && game.mission.target ? game.mission.target : { x: 0, z: 0 };
    
    let bestRoad = roads[0] || { x: 0, z: 0, w: 10, d: 10, axis: 'v' };
    let bestDist = Infinity;
    for (const r of roads) {
      const rx = r.x + r.w / 2;
      const rz = r.z + r.d / 2;
      const d = Math.hypot(rx - target.x, rz - target.z);
      if (d < bestDist) {
        bestDist = d;
        bestRoad = r;
      }
    }

    const cx = bestRoad.x + bestRoad.w / 2;
    const cz = bestRoad.z + bestRoad.d / 2;

    let bestCar = world.parked && world.parked[0] ? world.parked[0] : { x: cx, z: cz, angle: 0, taken: false };
    let bestCarDist = Infinity;
    if (world.parked) {
      for (const car of world.parked) {
        const d = Math.hypot(car.x - cx, car.z - cz);
        if (d < bestCarDist) {
          bestCarDist = d;
          bestCar = car;
        }
      }
    }

    bestCar.x = cx;
    bestCar.z = cz;
    const dx = target.x - cx;
    const dz = target.z - cz;
    bestCar.angle = Math.atan2(dx, dz);
    bestCar.speed = 20;
    bestCar.taken = true;

    player.inCar = bestCar;
    player.x = bestCar.x;
    player.z = bestCar.z;
    player.angle = bestCar.angle;
    player.speed = bestCar.speed;

    game.missionDist = Math.hypot(player.x - target.x, player.z - target.z);

    if (shotName === 'chase') {
      const backAngle = bestCar.angle + Math.PI;
      if (world.police && world.police.length >= 2) {
        const cop1 = world.police[0];
        const cop2 = world.police[1];
        cop1.x = bestCar.x + Math.sin(backAngle) * 25;
        cop1.z = bestCar.z + Math.cos(backAngle) * 25;
        cop1.angle = bestCar.angle;
        cop1.speed = CONFIG.police.chaseSpeed || 22;
        cop1.active = true;

        cop2.x = bestCar.x + Math.sin(backAngle) * 40;
        cop2.z = bestCar.z + Math.cos(backAngle) * 40;
        cop2.angle = bestCar.angle;
        cop2.speed = CONFIG.police.chaseSpeed || 22;
        cop2.active = true;
      }
      game.policeCount = world.police ? world.police.filter(c => c.active).length : 2;

      if (world.heli) {
        world.heli.active = true;
        world.heli.x = player.x;
        world.heli.z = player.z;
        world.heli.y = 60;
      }
    }
  } else if (shotName === 'end') {
    game.screen = 'win';
    game.missionIndex = 7;
    game.money = 5000;
    game.wanted = 0;
    player.inCar = null;
    player.speed = 0;

    let yachtShop = world.shops && world.shops.find(s => s.name && s.name.toLowerCase().includes('yacht')) 
      || (world.shops ? world.shops[0] : { x: 0, z: 0 });

    player.x = yachtShop.x + 4;
    player.z = yachtShop.z;
    player.angle = 0;
  }
}
