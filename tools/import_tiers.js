#!/usr/bin/env node
/*
 Import 4 files with resource coordinates per tier (T1..T4) into data/resources.json
 - File format: blocks with a name line followed by many lines like: "Мир X Y (EL)"
 - Match resources by exact name (case-sensitive) in resources.json
 - Modes: --mode replace (default) or --mode merge (append + dedupe)
 - Assigns the item's tier to T1/T2/T3/T4 based on the source file
 - Writes backup to data/resources.json.bak
 Usage (PowerShell example):
   node tools/import_tiers.js --t1 "d:/PWmap/T1.txt" --t2 "d:/PWmap/T2.txt" --t3 "d:/PWmap/T3.txt" --t4 "d:/PWmap/T4.txt" --mode replace
*/
const fs = require('fs');
const path = require('path');

const ROOT = 'd:/PWmap';
const RES_PATH = path.join(ROOT, 'data', 'resources.json');
const BACKUP_PATH = path.join(ROOT, 'data', 'resources.json.bak');

function parseArgs(argv){
  const args = { mode: 'replace' };
  for(let i=2;i<argv.length;i++){
    const a = argv[i];
    if(a === '--mode' && argv[i+1]){ args.mode = String(argv[++i]).toLowerCase(); continue; }
    if(a.startsWith('--t1')){ args.t1 = argv[i].includes('=') ? a.split('=')[1] : argv[++i]; continue; }
    if(a.startsWith('--t2')){ args.t2 = argv[i].includes('=') ? a.split('=')[1] : argv[++i]; continue; }
    if(a.startsWith('--t3')){ args.t3 = argv[i].includes('=') ? a.split('=')[1] : argv[++i]; continue; }
    if(a.startsWith('--t4')){ args.t4 = argv[i].includes('=') ? a.split('=')[1] : argv[++i]; continue; }
  }
  return args;
}

function parseBlocks(txt){
  const lines = txt.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  const re = /^Мир\s+(\-?\d+)\s+(\-?\d+)\s*\((\-?\d+)\)/i;
  for(const raw of lines){
    const line = (raw||'').trim();
    if(!line) continue;
    const m = re.exec(line);
    if(m){
      if(!cur) continue; // ignore coords before any name
      cur.coords.push({ x: +m[1], y: +m[2], el: +m[3] });
      continue;
    }
    cur = { name: line, coords: [] };
    blocks.push(cur);
  }
  return blocks;
}

function dedupe(coords){
  const key = (c)=>`${Number(c.x)},${Number(c.y)},${Number(c.el)}`;
  const seen = new Set();
  const out = [];
  for(const c of coords){ const k = key(c); if(!seen.has(k)){ seen.add(k); out.push({ x:Number(c.x), y:Number(c.y), el:Number(c.el) }); } }
  return out;
}

function mergeCoords(oldArr, newArr){
  return dedupe([...(oldArr||[]), ...(newArr||[])]);
}

function importTier(data, tier, filePath, mode){
  if(!filePath) return { tier, filePath, updated: 0, missing: [], totalBlocks: 0 };
  const txt = fs.readFileSync(filePath, 'utf8');
  const blocks = parseBlocks(txt);
  const byName = new Map(blocks.map(b => [b.name, b.coords]));
  let updated = 0;
  const missing = [];
  for(const [name, coords] of byName.entries()){
    const item = data.find(it => it && it.name === name);
    if(!item){ missing.push(name); continue; }
    const clean = dedupe(coords);
    if(mode === 'merge') item.coords = mergeCoords(item.coords, clean); else item.coords = clean;
    item.tier = tier;
    updated++;
  }
  return { tier, filePath, updated, missing, totalBlocks: blocks.length };
}

function main(){
  const args = parseArgs(process.argv);
  if(!args.t1 && !args.t2 && !args.t3 && !args.t4){
    console.error('No input files provided. Use --t1/--t2/--t3/--t4 with paths.');
    process.exit(2);
  }
  if(args.mode !== 'replace' && args.mode !== 'merge'){
    console.error('Invalid --mode. Use replace or merge.');
    process.exit(2);
  }
  const raw = fs.readFileSync(RES_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, raw, 'utf8');
  const data = JSON.parse(raw);

  const reports = [];
  if(args.t1) reports.push(importTier(data, 'T1', args.t1, args.mode));
  if(args.t2) reports.push(importTier(data, 'T2', args.t2, args.mode));
  if(args.t3) reports.push(importTier(data, 'T3', args.t3, args.mode));
  if(args.t4) reports.push(importTier(data, 'T4', args.t4, args.mode));

  fs.writeFileSync(RES_PATH, JSON.stringify(data, null, 2), 'utf8');

  // Print summary
  let totalUpdated = 0, totalMissing = 0, totalBlocks = 0;
  for(const r of reports){
    totalUpdated += r.updated; totalMissing += r.missing.length; totalBlocks += r.totalBlocks;
    console.log(`[${r.tier}] file: ${r.filePath}`);
    console.log(`  blocks: ${r.totalBlocks}, updated: ${r.updated}, missing: ${r.missing.length}`);
    if(r.missing.length){ console.log(`  missing names (first 10): ${r.missing.slice(0,10).join(' | ')}`); }
  }
  console.log(`Done. Mode=${args.mode}. Total blocks=${totalBlocks}, updated=${totalUpdated}, missing=${totalMissing}. Backup: ${BACKUP_PATH}`);
}

main();
