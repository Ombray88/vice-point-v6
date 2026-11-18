import { CONFIG, MISSIONS, SAVE_KEY, BEST_KEY, RADIO_STATIONS } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createWorld, updateWorld } from './world.js';
import { createGL } from './gl.js';
import { renderGame, drawHUD } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const urlParams = new URLSearchParams(window.location.search);
const shot = urlParams.get('shot');
const seed = Number(urlParams.get('seed')) || 1;

const rng = makeRng(seed);
const world = createWorld(seed);
const input = createInput();
input.attach();
const audio = createAudio();

const player = {
  x: world.spawn.x,
  z: world.spawn.z,
  angle: 0,
  speed: 0,
  inCar: null,
  health: CONFIG.player.health
};

const game = {
  world,
  player,
  wanted: 0,
  money: CONFIG.player.startMoney,
  missionIndex: 0,
  mission: MISSIONS[0],
  missionDist: 0,
  screen: 'title',
  radio: 0,
  time: 0,
  respect: 0,
  policeCount: 0,
  paused: false
};

try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    if (typeof data.money === 'number') game.money = data.money;
    if (typeof data.missionIndex === 'number' && data.missionIndex >= 0 && data.missionIndex < MISSIONS.length) {
      game.missionIndex = data.missionIndex;
      game.mission = MISSIONS[game.missionIndex];
      game.wanted = game.mission.wanted || 0;
    }
  }
} catch (e) {}

const gameCanvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const glCtx = createGL(gameCanvas);

function resizeGameCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (gameCanvas.width !== Math.floor(w * dpr) || gameCanvas.height !== Math.floor(h * dpr)) {
    gameCanvas.width = Math.floor(w * dpr);
    gameCanvas.height = Math.floor(h * dpr);
    gameCanvas.style.width = w + 'px';
    gameCanvas.style.height = h + 'px';
  }
  if (hudCanvas.width !== Math.floor(w * dpr) || hudCanvas.height !== Math.floor(h * dpr)) {
    hudCanvas.width = Math.floor(w * dpr);
    hudCanvas.height = Math.floor(h * dpr);
    hudCanvas.style.width = w + 'px';
    hudCanvas.style.height = h + 'px';
  }
}

resizeGameCanvas();
window.addEventListener('resize', resizeGameCanvas);

if (shot) {
  stageShot(game, shot);
  renderGame(glCtx, game);
  drawHUD(hudCanvas, game);
  window.__shotReady = true;
} else {
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.05));
    lastTime = now;

    if (input.pressed('Escape')) {
      game.paused = !game.paused;
    }

    if (game.screen === 'title') {
      if (input.pressed('Enter')) {
        game.screen = 'play';
        audio.start();
        audio.sfx('mission');
      }
    } else if (game.screen === 'win' || game.screen === 'busted') {
      if (input.pressed('Enter')) {
        game.money = CONFIG.player.startMoney;
        game.missionIndex = 0;
        game.mission = MISSIONS[0];
        player.x = world.spawn.x;
        player.z = world.spawn.z;
        player.speed = 0;
        player.inCar = null;
        player.health = CONFIG.player.health;
        game.wanted = 0;
        game.screen = 'play';
        audio.sfx('mission');
      }
    } else if (game.screen === 'play' && !game.paused) {
      // Input processing
      if (player.inCar === null) {
        let mx = 0, mz = 0;
        if (input.down['KeyW'] || input.down['ArrowUp']) mz -= 1;
        if (input.down['KeyS'] || input.down['ArrowDown']) mz += 1;
        if (input.down['KeyA'] || input.down['ArrowLeft']) mx -= 1;
        if (input.down['KeyD'] || input.down['ArrowRight']) mx += 1;

        if (mx !== 0 || mz !== 0) {
          const moveAngle = Math.atan2(mx, mz);
          player.angle = moveAngle;
          const speed = input.down['ShiftLeft'] ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
          player.x += Math.sin(moveAngle) * speed * dt;
          player.z += Math.cos(moveAngle) * speed * dt;
          player.speed = speed;
        } else {
          player.speed = 0;
        }

        if (input.pressed('KeyE')) {
          for (const car of world.parked) {
            if (!car.taken) {
              const dist = Math.hypot(player.x - car.x, player.z - car.z);
              if (dist < 4) {
                player.inCar = car;
                car.taken = true;
                audio.sfx('pickup');
                break;
              }
            }
          }
        }
        audio.setEngine(0);
      } else {
        const car = player.inCar;
        const topSpeed = CONFIG.car.topSpeed * (input.down['ShiftLeft'] ? 1.4 : 1.0);

        if (input.down['KeyW'] || input.down['ArrowUp']) {
          car.speed = Math.min(topSpeed, car.speed + CONFIG.car.accel * dt);
        } else if (input.down['KeyS'] || input.down['ArrowDown']) {
          car.speed = Math.max(-topSpeed / 3, car.speed - CONFIG.car.brake * dt);
        } else {
          car.speed *= Math.max(0, 1 - 3 * dt);
          if (Math.abs(car.speed) < 0.1) car.speed = 0;
        }

        if (input.down['Space']) {
          car.speed *= Math.max(0, 1 - CONFIG.car.handbrake * dt);
        }

        let steer = 0;
        if (input.down['KeyA'] || input.down['ArrowLeft']) steer += 1;
        if (input.down['KeyD'] || input.down['ArrowRight']) steer -= 1;

        if (steer !== 0 && Math.abs(car.speed) > 0.5) {
          const turnRate = CONFIG.car.turn * (input.down['Space'] ? 1.5 : 1.0) * (car.speed / topSpeed);
          car.angle += steer * turnRate * dt;
        }

        car.x += Math.sin(car.angle) * car.speed * dt;
        car.z += Math.cos(car.angle) * car.speed * dt;

        player.x = car.x;
        player.z = car.z;
        player.angle = car.angle;
        player.speed = car.speed;

        const engineFrac = Math.min(1, Math.abs(car.speed) / CONFIG.car.topSpeed);
        audio.setEngine(engineFrac);

        if (input.pressed('KeyE')) {
          car.taken = false;
          player.x = car.x + Math.cos(car.angle) * 2;
          player.z = car.z - Math.sin(car.angle) * 2;
          player.inCar = null;
          audio.setEngine(0);
        }

        if (input.pressed('KeyM')) {
          game.radio = (game.radio + 1) % RADIO_STATIONS.length;
          audio.setStation(game.radio);
        }
      }

      if (input.pressed('KeyR')) {
        player.x = world.spawn.x;
        player.z = world.spawn.z;
        player.speed = 0;
        player.inCar = null;
        game.wanted = game.mission.wanted || 0;
        player.health = CONFIG.player.health;
      }

      // Bounds & water collision
      const boundsMax = 340;
      const boundsMin = -340;
      const waterX = CONFIG.city.waterX;

      if (player.x < waterX) {
        player.x = waterX;
        if (player.inCar) player.inCar.x = waterX;
        player.speed = 0;
      }
      player.x = Math.max(boundsMin, Math.min(boundsMax, player.x));
      player.z = Math.max(boundsMin, Math.min(boundsMax, player.z));
      if (player.inCar) {
        player.inCar.x = player.x;
        player.inCar.z = player.z;
      }

      // Update world
      updateWorld(world, dt, player, game.wanted);

      // Mission logic
      game.missionDist = Math.hypot(player.x - game.mission.target.x, player.z - game.mission.target.z);
      if (game.missionDist < 10) {
        game.money += game.mission.reward;
        game.respect += 10;
        audio.sfx('mission');
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify({ money: game.money, missionIndex: game.missionIndex + 1 }));
          const best = Number(localStorage.getItem(BEST_KEY) || 0);
          if (game.money > best) {
            localStorage.setItem(BEST_KEY, String(game.money));
          }
        } catch (e) {}

        game.missionIndex++;
        if (game.missionIndex >= MISSIONS.length) {
          game.screen = 'win';
        } else {
          game.mission = MISSIONS[game.missionIndex];
          game.wanted = game.mission.wanted || 0;
        }
      }

      let copNear = false;
      if (game.wanted >= 5 && world.police) {
        for (const cop of world.police) {
          if (cop.active && Math.hypot(player.x - cop.x, player.z - cop.z) < 3) {
            copNear = true;
            break;
          }
        }
      }

      if ((game.wanted >= 5 && copNear) || player.health <= 0) {
        game.screen = 'busted';
        audio.sfx('crash');
      }

      game.policeCount = world.police ? world.police.filter(c => c.active).length : 0;

      if (game.wanted > 0 && Math.random() < 0.005) {
        audio.sfx('siren');
      }

      game.time += dt;
    }

    renderGame(glCtx, game);
    drawHUD(hudCanvas, game);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
