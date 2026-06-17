import fs from 'fs';
import path from 'path';

const staticDir = path.join(process.cwd(), '.vercel', 'output', 'static');
const swPath = path.join(staticDir, 'sw.js');
const assetsDir = path.join(staticDir, 'assets');

if (fs.existsSync(assetsDir) && fs.existsSync(swPath)) {
  const files = fs.readdirSync(assetsDir);
  const assetPaths = files
    .filter(f => f.endsWith('.js') || f.endsWith('.css'))
    .map(f => `/assets/${f}`);
  
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  const injectionStr = assetPaths.map(p => `  "${p}",`).join('\n');
  swContent = swContent.replace('const urlsToCache = [', `const urlsToCache = [\n${injectionStr}`);
  
  // also force SW version bump by appending a comment with current timestamp
  swContent += `\n// Generated at ${Date.now()}`;
  
  fs.writeFileSync(swPath, swContent);
  console.log(`Injected ${assetPaths.length} assets into sw.js for offline precaching.`);
} else {
  console.log('Skipping SW asset injection: static dir or sw.js not found.');
}
