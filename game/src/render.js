/**
 * Vice Point 6D - 3D Renderer & 2D HUD
 * Implements 3D scene rendering via WebGL wrapper and 2D heads-up display.
 */

import { CONFIG, MISSIONS, RADIO_STATIONS } from './config.js';
import {
  matIdentity,
  matTranslate,
  matScale,
  matRotateY,
  matMultiply,
  matPerspective,
  matLookAt,
  matFromPosAngle
} from './gl.js';

// --- Color Utility ---
/**
 * Parses a CSS hex color string (e.g. '#ff7733') into an RGBA Float32Array [r, g, b, a].
 * @param {string} hex 
 * @param {number} alpha 
 * @returns {Array<number>}
 */
function parseColor(hex, alpha = 1.0) {
  if (!hex || typeof hex !== 'string') return [0.5, 0.5, 0.5, alpha];
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b, alpha];
}

const SKY_COLOR = parseColor(CONFIG.colors.sky);
const GRASS_COLOR = parseColor(CONFIG.colors.grass);
const WATER_COLOR = parseColor(CONFIG.colors.water);
const ROAD_COLOR = parseColor(CONFIG.colors.road);
const SIDEWALK_COLOR = parseColor(CONFIG.colors.sidewalk);

// --- 3D Scene Rendering ---

/**
 * Renders the 3D world scene using the WebGL rendering context.
 * @param {Object} glCtx WebGL wrapper context
 * @param {Object} game Game state object
 */
export function renderGame(glCtx, game) {
  if (!glCtx || !game) return;

  // 1. Begin frame with warm sunset sky color
  glCtx.beginFrame(SKY_COLOR);

  const canvas = glCtx.gl.canvas;
  const aspect = canvas.width / canvas.height || (16 / 9);

  // 2. Compute Chase Camera from Player or Car
  let targetX = game.player.x;
  let targetZ = game.player.z;
  let targetAngle = game.player.angle;
  let targetY = 1.0;

  if (game.player.inCar) {
    targetX = game.player.inCar.x;
    targetZ = game.player.inCar.z;
    targetAngle = game.player.inCar.angle;
    targetY = 1.2;
  }

  const camDist = CONFIG.camera.dist;
  const camHeight = CONFIG.camera.height;

  const eyeX = targetX - Math.sin(targetAngle) * camDist;
  const eyeY = targetY + camHeight;
  const eyeZ = targetZ - Math.cos(targetAngle) * camDist;

  const lookX = targetX;
  const lookY = targetY + 0.5;
  const lookZ = targetZ;

  const viewMat = matLookAt([eyeX, eyeY, eyeZ], [lookX, lookY, lookZ], [0, 1, 0]);
  const projMat = matPerspective(60 * Math.PI / 180, aspect, 0.1, 1000);

  glCtx.setCamera(viewMat, projMat);

  // 3. Draw Ground (Grass Plane)
  const groundSize = 2500;
  const groundMat = matFromPosAngle(0, -0.1, 0, 0, groundSize, 0.1, groundSize);
  glCtx.box(groundMat, GRASS_COLOR[0], GRASS_COLOR[1], GRASS_COLOR[2], 1.0);

  // 4. Draw Water
  if (game.world && game.world.water) {
    const w = game.world.water;
    const waterMat = matFromPosAngle(w.x + w.w / 2, 0.05, w.z + w.d / 2, 0, w.w, 0.1, w.d);
    glCtx.box(waterMat, WATER_COLOR[0], WATER_COLOR[1], WATER_COLOR[2], 0.85);
  }

  // 5. Draw Roads
  if (game.world && game.world.city && game.world.city.roads) {
    for (const road of game.world.city.roads) {
      const rx = road.x !== undefined ? road.x : 0;
      const rz = road.z !== undefined ? road.z : 0;
      const rw = road.w !== undefined ? road.w : CONFIG.city.roadWidth;
      const rd = road.d !== undefined ? road.d : CONFIG.city.blockSize;
      const roadMat = matFromPosAngle(rx + rw / 2, 0.02, rz + rd / 2, road.angle || 0, rw, 0.05, rd);
      glCtx.box(roadMat, ROAD_COLOR[0], ROAD_COLOR[1], ROAD_COLOR[2], 1.0);
    }
  }

  // 6. Draw Buildings
  if (game.world && game.world.city && game.world.city.buildings) {
    for (let i = 0; i < game.world.city.buildings.length; i++) {
      const b = game.world.city.buildings[i];
      const colorHex = b.color || CONFIG.colors.building[i % CONFIG.colors.building.length];
      const col = parseColor(colorHex);
      const bMat = matFromPosAngle(b.x, b.h / 2, b.z, 0, b.w, b.h, b.d);
      glCtx.box(bMat, col[0], col[1], col[2], 1.0);
    }
  }

  // 7. Draw Shops
  if (game.world && game.world.shops) {
    for (const shop of game.world.shops) {
      const shopH = 8;
      const shopMat = matFromPosAngle(shop.x, shopH / 2, shop.z, 0, 10, shopH, 10);
      glCtx.box(shopMat, 0.9, 0.3, 0.8, 1.0);

      // Shop sign quad on top
      const signMat = matFromPosAngle(shop.x, shopH + 1, shop.z, 0, 6, 0.5, 2);
      glCtx.box(signMat, 1.0, 1.0, 0.2, 1.0);
    }
  }

  // 8. Draw Traffic Cars
  if (game.world && game.world.traffic) {
    for (const car of game.world.traffic) {
      const col = parseColor(car.color || '#3366cc');
      const carMat = matFromPosAngle(car.x, 0.7, car.z, car.angle || 0, 2.0, 1.4, 4.0);
      glCtx.box(carMat, col[0], col[1], col[2], 1.0);

      // Roof box
      const roofMat = matFromPosAngle(car.x, 1.5, car.z, car.angle || 0, 1.6, 0.8, 2.2);
      glCtx.box(roofMat, col[0] * 0.8, col[1] * 0.8, col[2] * 0.8, 1.0);
    }
  }

  // 9. Draw Parked Cars
  if (game.world && game.world.parked) {
    for (const pCar of game.world.parked) {
      if (pCar.taken) continue;
      const col = parseColor(pCar.color || '#cc6633');
      const carMat = matFromPosAngle(pCar.x, 0.7, pCar.z, pCar.angle || 0, 2.0, 1.4, 4.0);
      glCtx.box(carMat, col[0], col[1], col[2], 1.0);

      const roofMat = matFromPosAngle(pCar.x, 1.5, pCar.z, pCar.angle || 0, 1.6, 0.8, 2.2);
      glCtx.box(roofMat, col[0] * 0.8, col[1] * 0.8, col[2] * 0.8, 1.0);
    }
  }

  // 10. Draw Police Units
  if (game.world && game.world.police) {
    for (const cop of game.world.police) {
      if (!cop.active) continue;
      // White body
      const copMat = matFromPosAngle(cop.x, 0.7, cop.z, cop.angle || 0, 2.0, 1.4, 4.0);
      glCtx.box(copMat, 0.95, 0.95, 0.95, 1.0);

      // Dark roof + flashing light
      const roofMat = matFromPosAngle(cop.x, 1.5, cop.z, cop.angle || 0, 1.6, 0.8, 2.2);
      glCtx.box(roofMat, 0.2, 0.2, 0.2, 1.0);

      const flash = Math.sin(game.time * 15) > 0 ? [1, 0, 0] : [0, 0, 1];
      const lightMat = matFromPosAngle(cop.x, 2.0, cop.z, cop.angle || 0, 0.6, 0.3, 0.6);
      glCtx.box(lightMat, flash[0], flash[1], flash[2], 1.0);
    }
  }

  // 11. Draw Pedestrians
  if (game.world && game.world.peds) {
    for (const ped of game.world.peds) {
      const pedMat = matFromPosAngle(ped.x, 0.9, ped.z, ped.angle || 0, 0.6, 1.8, 0.6);
      glCtx.box(pedMat, 0.8, 0.7, 0.5, 1.0);
    }
  }

  // 12. Draw Helicopter
  if (game.world && game.world.heli && game.world.heli.active) {
    const heli = game.world.heli;
    const heliMat = matFromPosAngle(heli.x, heli.y || 25, heli.z, game.time * 2, 3.0, 2.0, 6.0);
    glCtx.box(heliMat, 0.2, 0.2, 0.25, 1.0);

    // Rotor
    const rotorMat = matFromPosAngle(heli.x, (heli.y || 25) + 1.2, heli.z, game.time * 20, 8.0, 0.1, 0.8);
    glCtx.box(rotorMat, 0.1, 0.1, 0.1, 0.9);
  }

  // 13. Draw Player
  if (game.player.inCar) {
    const c = game.player.inCar;
    const col = parseColor(c.color || '#ffcc00');
    const carMat = matFromPosAngle(c.x, 0.7, c.z, c.angle, 2.0, 1.4, 4.0);
    glCtx.box(carMat, col[0], col[1], col[2], 1.0);

    const roofMat = matFromPosAngle(c.x, 1.5, c.z, c.angle, 1.6, 0.8, 2.2);
    glCtx.box(roofMat, col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 1.0);
  } else {
    const pMat = matFromPosAngle(game.player.x, 0.95, game.player.z, game.player.angle, 0.7, 1.9, 0.7);
    glCtx.box(pMat, 0.9, 0.2, 0.2, 1.0);
  }

  // 14. Draw Mission Target Beacon
  if (game.mission && game.mission.target) {
    const t = game.mission.target;
    const pulseH = 15 + Math.sin(game.time * 5) * 5;
    const beaconMat = matFromPosAngle(t.x, pulseH / 2, t.z, game.time * 2, 3.0, pulseH, 3.0);
    glCtx.box(beaconMat, 1.0, 0.8, 0.1, 0.45); // Translucent yellow/orange beacon
  }
}


// --- 2D HUD Rendering ---

/**
 * Draws the 2D Heads-Up Display on the given canvas context.
 * @param {HTMLCanvasElement} hudCanvas 
 * @param {Object} game Game state object
 */
export function drawHUD(hudCanvas, game) {
  if (!hudCanvas || !game) return;

  const ctx = hudCanvas.getContext('2d');
  if (!ctx) return;

  // Ensure canvas matches client size
  const width = hudCanvas.clientWidth || window.innerWidth;
  const height = hudCanvas.clientHeight || window.innerHeight;
  if (hudCanvas.width !== width || hudCanvas.height !== height) {
    hudCanvas.width = width;
    hudCanvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);

  const screen = game.screen || 'title';

  // --- Title Screen ---
  if (screen === 'title') {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7733';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('VICE POINT 6D', width / 2, height / 2 - 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('A 3D open-world crime game', width / 2, height / 2 - 130);

    // Mission List
    ctx.fillStyle = '#dddddd';
    ctx.font = '16px sans-serif';
    ctx.fillText('Missions:', width / 2, height / 2 - 85);

    for (let i = 0; i < MISSIONS.length; i++) {
      const m = MISSIONS[i];
      const active = i === (game.missionIndex || 0);
      ctx.fillStyle = active ? '#ffcc00' : '#aaaaaa';
      ctx.fillText(`${i + 1}. ${m.name} — ${m.objective}`, width / 2, height / 2 - 50 + i * 24);
    }

    ctx.fillStyle = '#ff7733';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press ENTER to start', width / 2, height / 2 + 130);
    return;
  }

  // --- Win Screen ---
  if (screen === 'win') {
    ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('VICE POINT LEGEND', width / 2, height / 2 - 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Final Money: $${game.money || 0}`, width / 2, height / 2);

    ctx.fillStyle = '#ff7733';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press ENTER to play again', width / 2, height / 2 + 80);
    return;
  }

  // --- Busted Screen ---
  if (screen === 'busted') {
    ctx.fillStyle = 'rgba(40, 10, 10, 0.9)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('BUSTED', width / 2, height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('The long arm of the law caught up with you.', width / 2, height / 2 + 10);

    ctx.fillStyle = '#ff7733';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press ENTER to try again', width / 2, height / 2 + 70);
    return;
  }

  // --- Play / Paused HUD ---
  if (screen === 'play' || screen === 'paused') {
    // 1. Money (Top-Left)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`$${game.money || 0}`, 24, 42);

    // 2. Wanted Stars (Under money)
    const wanted = game.wanted || 0;
    ctx.font = '20px sans-serif';
    let starsStr = '';
    for (let s = 0; s < 5; s++) {
      starsStr += s < wanted ? '★ ' : '☆ ';
    }
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(starsStr, 24, 72);

    // 3. Health Bar (Under stars)
    const health = game.player ? (game.player.health !== undefined ? game.player.health : 100) : 100;
    const barW = 160, barH = 14;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(24, 88, barW, barH);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(24, 88, (Math.max(0, health) / 100) * barW, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 88, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText('HP', 6, 100);

    // 4. Speedometer (Bottom-Left, when in car)
    if (game.player && game.player.inCar) {
      const speedMps = Math.hypot(game.player.inCar.speed || 0);
      const speedMph = Math.round(speedMps * 3.6 * 0.621371);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`${speedMph}`, 24, height - 60);
      ctx.font = '14px sans-serif';
      ctx.fillText('MPH', 24 + ctx.measureText(`${speedMph}`).width + 8, height - 60);
    }

    // 5. Radio Station Name (Bottom-Left)
    const radioIdx = game.radio !== undefined ? game.radio : 0;
    const station = RADIO_STATIONS[radioIdx % RADIO_STATIONS.length];
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(24, height - 42, 260, 28);
    ctx.fillStyle = '#ffcc00';
    ctx.font = '13px sans-serif';
    ctx.fillText(`♪ ${station ? station.name : 'Off'}`, 32, height - 24);

    // 6. Mission Panel (Top-Center)
    if (game.mission) {
      const panelW = 400, panelH = 64;
      const panelX = width / 2 - panelW / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(panelX, 16, panelW, panelH);
      ctx.strokeStyle = '#ff7733';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(panelX, 16, panelW, panelH);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff7733';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(game.mission.name.toUpperCase(), width / 2, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px sans-serif';
      ctx.fillText(game.mission.objective, width / 2, 54);

      const dist = Math.round(game.missionDist || 0);
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`Target: ${dist}m away`, width / 2, 72);
    }

    // 7. Minimap (Top-Right, 180x180)
    const mapSize = 180;
    const mapX = width - mapSize - 24;
    const mapY = 24;

    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, mapSize, mapSize);
    ctx.fillStyle = 'rgba(15, 20, 35, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#ff7733';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    // Minimap translation centered on player/car
    const pX = game.player.inCar ? game.player.inCar.x : game.player.x;
    const pZ = game.player.inCar ? game.player.inCar.z : game.player.z;
    const mapScaleFactor = 0.6; // Scale world to minimap

    ctx.translate(mapX + mapSize / 2, mapY + mapSize / 2);
    ctx.scale(mapScaleFactor, mapScaleFactor);
    ctx.translate(-pX, -pZ);

    // Draw Roads on minimap
    if (game.world && game.world.city && game.world.city.roads) {
      ctx.fillStyle = '#333333';
      for (const road of game.world.city.roads) {
        const rx = road.x || 0;
        const rz = road.z || 0;
        const rw = road.w || CONFIG.city.roadWidth;
        const rd = road.d || CONFIG.city.blockSize;
        ctx.fillRect(rx, rz, rw, rd);
      }
    }

    // Draw Buildings on minimap
    if (game.world && game.world.city && game.world.city.buildings) {
      ctx.fillStyle = '#444c5c';
      for (const b of game.world.city.buildings) {
        ctx.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
      }
    }

    // Draw Water on minimap
    if (game.world && game.world.water) {
      const w = game.world.water;
      ctx.fillStyle = '#114488';
      ctx.fillRect(w.x, w.z, w.w, w.d);
    }

    // Draw Mission Target on minimap
    if (game.mission && game.mission.target) {
      const t = game.mission.target;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(t.x, t.z, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Police on minimap
    if (game.world && game.world.police) {
      ctx.fillStyle = '#e74c3c';
      for (const cop of game.world.police) {
        if (!cop.active) continue;
        ctx.beginPath();
        ctx.arc(cop.x, cop.z, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player on minimap
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pX, pZ, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 8. Police Unit Count (Under minimap)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`UNITS: ${game.policeCount || 0}`, width - 24, mapY + mapSize + 22);

    // 9. Respect Meter (Bottom-Right or under police units)
    const respect = game.respect !== undefined ? game.respect : 0;
    const respW = 180, respH = 12;
    const respX = width - respW - 24;
    const respY = mapY + mapSize + 36;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(respX, respY, respW, respH);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(respX, respY, (Math.min(100, Math.max(0, respect)) / 100) * respW, respH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(respX, respY, respW, respH);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.fillText('RESPECT', respX + 4, respY + 10);

    // 10. Pause Overlay
    if (screen === 'paused' || game.paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('PAUSED — press ESC to resume', width / 2, height / 2);
    }
  }
}
