#!/usr/bin/env node
/*
 Merge coordinates from cords.txt into data/resources.json by resource name.
 - Parses blocks: Name line, followed by many lines like: "Мир X Y (EL)"
 - Replaces coords array for matching items
 - Writes backup data/resources.json.bak
*/
const fs = require('fs');
const path = require('path');

const ROOT = 'd:/PWmap';
const CORDS_PATH = path.join(ROOT, 'cords.txt');
const RES_PATH = path.join(ROOT, 'data', 'resources.json');
const BACKUP_PATH = path.join(ROOT, 'data', 'resources.json.bak');

function parseCordsTxt(txt){
  const lines = txt.split(/\r?\n/);
  const blocks = [];
  let current = null;
  const re = /^Мир\s+(\-?\d+)\s+(\-?\d+)\s*\((\-?\d+)\)/i;
  for(const raw of lines){
    const line = raw.trim();
    if(!line){ continue; }
    const m = re.exec(line);
    if(m){
      if(!current){ continue; }
      const x = parseInt(m[1],10);
      const y = parseInt(m[2],10);
      const el = parseInt(m[3],10);
      current.coords.push({ x, y, el });
      continue;
    }
    // New block name
    current = { name: line, coords: [] };
    blocks.push(current);
  }
  return blocks;
}

function main(){
  const txt = fs.readFileSync(CORDS_PATH, 'utf8');
  const blocks = parseCordsTxt(txt);
  const byName = new Map(blocks.map(b => [b.name, b.coords]));
  const raw = fs.readFileSync(RES_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, raw, 'utf8');
  const data = JSON.parse(raw);
  let updated = 0, skipped = 0;
  // First pass: replace coords from txt
  for(const item of data){
    const coords = byName.get(item.name);
    if(coords && Array.isArray(coords) && coords.length){
      const key = (c)=>`${Number(c.x)},${Number(c.y)},${Number(c.el)}`;
      const seen = new Set();
      const unique = [];
      for(const c of coords){ const k = key(c); if(!seen.has(k)){ seen.add(k); unique.push({ x:Number(c.x), y:Number(c.y), el:Number(c.el) }); } }
      item.coords = unique;
      updated++;
    } else {
      skipped++;
    }
  }
  // Second pass: find identical coords arrays and assign canonical with desc links
  const sig = (arr)=>JSON.stringify((arr||[]).map(c=>[c.x,c.y,c.el]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]));
  const groups = new Map();
  for(const item of data){
    const s = sig(item.coords);
    if(!groups.has(s)) groups.set(s, []);
    groups.get(s).push(item);
  }
  let unified = 0;
  for(const [s, items] of groups.entries()){
    if(s === '[]' || items.length < 2) continue;
    const canonical = items[0];
    for(let i=1;i<items.length;i++){
      const it = items[i];
      // Remove duplicate coords and add link to canonical
      it.coords = [];
      const targetId = canonical.id || canonical.name;
      const link = `[[См. ${canonical.name}*res:${targetId}]]`;
      if(it.desc1){ it.desc1 = `${it.desc1}\n${link}`; } else { it.desc1 = link; }
      unified++;
    }
  }
  fs.writeFileSync(RES_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Done. Updated ${updated}, skipped ${skipped}, unified groups: ${unified}. Backup: ${BACKUP_PATH}`);
}

main();
