import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

fs.mkdirSync(outputDir, { recursive: true });

const htmlPath = path.join(__dirname, 'game', 'index.html');
if (!fs.existsSync(htmlPath)) {
  throw new Error(`game/index.html not found at ${htmlPath}`);
}

const gameSrc = path.join(__dirname, 'game');
if (fs.existsSync(gameSrc)) {
  fs.cpSync(gameSrc, path.join(outputDir, 'game'), { recursive: true });
}

const ssSrc = path.join(__dirname, 'screenshots');
const ssDest = path.join(outputDir, 'screenshots');
fs.mkdirSync(ssDest, { recursive: true });
if (fs.existsSync(ssSrc)) {
  fs.cpSync(ssSrc, ssDest, { recursive: true });
}

const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
});

fs.writeFileSync(path.join(outputDir, 'dossier.json'), dossierBytes);
console.log('Output directory:', outputDir, 'dossier written.');
