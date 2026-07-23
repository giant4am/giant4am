#!/usr/bin/env node
/**
 * Renders a 1200x675px text-free body banner PNG for the monthly-reflection
 * skill's blog draft (a plain visual to drop into the post body — no title,
 * no words). Abstract gradient + soft blobs in the brand navy/gold palette,
 * randomized per run so consecutive days don't look identical.
 *
 * Usage:
 *   node render_body_banner.js <output_path>
 */

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    const { execSync } = require('child_process');
    const path = require('path');
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(path.join(globalRoot, 'playwright'));
  }
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

async function main() {
  const [, , outputArg] = process.argv;
  if (!outputArg) {
    console.error('Usage: node render_body_banner.js <output_path>');
    process.exit(1);
  }

  const width = 1200;
  const height = 675;

  // Brand palette: warm gold (title-image accent) plus the teal/plum used
  // elsewhere in this project's Notion/artifact work, so the body banner
  // reads as part of the same visual family, not a random gradient.
  const palette = ['#dcac54', '#b3791f', '#79c2c0', '#b79bdb'];

  // Jitter one blob per grid cell instead of pure-random placement, so the
  // composition stays balanced across the frame instead of clustering.
  const cols = 3;
  const rows = 2;
  const cellW = width / cols;
  const cellH = height / rows;
  const blobs = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.25) continue; // leave a little empty space
      const size = randRange(320, 560);
      const cellCenterX = cellW * (c + 0.5);
      const cellCenterY = cellH * (r + 0.5);
      blobs.push({
        size,
        left: cellCenterX - size / 2 + randRange(-cellW * 0.2, cellW * 0.2),
        top: cellCenterY - size / 2 + randRange(-cellH * 0.2, cellH * 0.2),
        color: palette[Math.floor(Math.random() * palette.length)],
        opacity: randRange(0.14, 0.32),
        blur: randRange(55, 90),
      });
    }
  }

  const blobDivs = blobs
    .map(
      (b) => `<div style="
        position:absolute;
        left:${b.left}px; top:${b.top}px;
        width:${b.size}px; height:${b.size}px;
        border-radius:50%;
        background:${b.color};
        opacity:${b.opacity.toFixed(2)};
        filter:blur(${b.blur.toFixed(0)}px);
      "></div>`
    )
    .join('\n');

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; width:${width}px; height:${height}px; overflow:hidden;
  background: linear-gradient(135deg, #14131c 0%, #1d1b29 55%, #241f33 100%);
  position: relative;">
  <div style="position:absolute; left:0; top:0; bottom:0; width:8px;
    background:linear-gradient(180deg, #dcac54, #b3791f);"></div>
  ${blobDivs}
</body>
</html>`;

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmpHtmlPath = path.join(os.tmpdir(), `body-banner-${Date.now()}.html`);
  fs.writeFileSync(tmpHtmlPath, html, 'utf8');

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('file://' + tmpHtmlPath);
    await page.screenshot({ path: outputArg });
  } finally {
    await browser.close();
    fs.unlinkSync(tmpHtmlPath);
  }

  console.log(`Saved ${width}x${height} body banner to ${outputArg}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
