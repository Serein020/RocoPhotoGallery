import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');

const apiFile = path.join(
  projectRoot,
  'src',
  'pages',
  'api',
  'photos.js',
);

const apiBackupFile = path.join(
  projectRoot,
  'src',
  'pages',
  'api',
  'photos.js.netlify-backup',
);

const isNetlify = Boolean(process.env.NETLIFY);

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hideCloudflareApi() {
  if (!fs.existsSync(apiFile)) {
    return;
  }

  if (fs.existsSync(apiBackupFile)) {
    fs.rmSync(apiBackupFile, { force: true });
  }

  fs.renameSync(apiFile, apiBackupFile);

  console.log('Netlify build: temporarily hidden src/pages/api/photos.js');
}

function restoreCloudflareApi() {
  if (!fs.existsSync(apiBackupFile)) {
    return;
  }

  if (fs.existsSync(apiFile)) {
    fs.rmSync(apiFile, { force: true });
  }

  fs.renameSync(apiBackupFile, apiFile);

  console.log('Netlify build: restored src/pages/api/photos.js');
}

function main() {
  if (!isNetlify) {
    console.log('Cloudflare/local build: keeping src/pages/api/photos.js');

    runCommand('npm', ['run', 'generate:photos']);
    runCommand('npx', ['astro', 'build']);

    return;
  }

  console.log('Netlify build detected.');

  let hidden = false;

  try {
    hideCloudflareApi();
    hidden = true;

    runCommand('npm', ['run', 'generate:photos']);
    runCommand('npx', ['astro', 'build']);
  } finally {
    if (hidden) {
      restoreCloudflareApi();
    }
  }
}

main();
