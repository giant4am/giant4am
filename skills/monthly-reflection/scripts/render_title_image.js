#!/usr/bin/env node
/**
 * Renders a 966px-wide blog title banner PNG for the monthly-reflection skill.
 *
 * Usage:
 *   node render_title_image.js "<title>" "<date label>" <height> <output_path>
 *
 * height must be between 50 and 300 (px). Falls back to 966x260 sizing rules
 * documented in SKILL.md if the caller doesn't compute one.
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  const [, , titleArg, dateArg, heightArg, outputArg] = process.argv;

  if (!titleArg || !outputArg) {
    console.error('Usage: node render_title_image.js "<title>" "<date label>" <height> <output_path>');
    process.exit(1);
  }

  const title = titleArg;
  const dateLabel = dateArg || '';
  let height = parseInt(heightArg, 10);
  if (!Number.isFinite(height)) height = 260;
  height = Math.max(50, Math.min(300, height));
  const width = 966;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {
    margin: 0; padding: 0;
    width: ${width}px; height: ${height}px;
    overflow: hidden;
  }
  body {
    position: relative;
    background: linear-gradient(135deg, #14131c 0%, #1d1b29 55%, #241f33 100%);
    font-family: 'Noto Serif KR', 'Nanum Myeongjo', Batang, 'Apple SD Gothic Neo', serif;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    padding: 0 56px;
  }
  .accent-line {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 6px;
    background: linear-gradient(180deg, #dcac54, #b3791f);
  }
  .eyebrow {
    font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #dcac54;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: #dcac54; }
  h1 {
    margin: 0;
    color: #f3efe3;
    font-size: 42px;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.01em;
    max-width: 820px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .date {
    font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif;
    font-size: 13px;
    color: #9c96b0;
    margin-top: 16px;
    font-variant-numeric: tabular-nums;
  }
</style>
</head>
<body>
  <div class="accent-line"></div>
  <div class="eyebrow"><span class="dot"></span>새벽거인 · 한달기록</div>
  <h1>${escapeHtml(title)}</h1>
  ${dateLabel ? `<div class="date">${escapeHtml(dateLabel)}</div>` : ''}
</body>
</html>`;

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmpHtmlPath = path.join(os.tmpdir(), `title-image-${Date.now()}.html`);
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

  console.log(`Saved ${width}x${height} title image to ${outputArg}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
