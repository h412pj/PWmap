const fs = require('fs');
const path = require('path');

const CORDS_PATH = path.join('d:/PWmap', 'cords.txt');

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
      if(!cur) continue; 
      cur.coords.push({ x: +m[1], y: +m[2], el: +m[3], raw: line });
      continue;
    }
    cur = { name: line, coords: [] };
    blocks.push(cur);
  }
  return blocks;
}

function analyze(blocks){
  const allMap = new Map(); 
  const internalDupMap = new Map();
  let total = 0;
  for(const b of blocks){
    const seen = new Set();
    for(const c of b.coords){
      total++;
      const k = `${c.x},${c.y},${c.el}`;
      if(!allMap.has(k)) allMap.set(k, { count: 0, names: new Set(), samples: [] });
      const rec = allMap.get(k);
      rec.count++;
      rec.names.add(b.name);
      if(rec.samples.length < 3) rec.samples.push({ name: b.name, raw: c.raw });
      if(seen.has(k)){
        internalDupMap.set(b.name, (internalDupMap.get(b.name)||0) + 1);
      }
      seen.add(k);
    }
  }
  const dups = [...allMap.entries()].filter(([k,v]) => v.count > 1);
  const across = dups.filter(([k,v]) => v.names.size > 1);
  return { totalCoords: total, uniqueCoords: allMap.size, duplicateCoords: dups.length, acrossNames: across.length, allMap, internalDupMap };
}

function main(){
  const txt = fs.readFileSync(CORDS_PATH, 'utf8');
  const blocks = parseBlocks(txt);
  const res = analyze(blocks);
  console.log('Total blocks:', blocks.length);
  console.log('Total coords:', res.totalCoords);
  console.log('Unique coords:', res.uniqueCoords);
  console.log('Duplicate coords tuples (appear >1 times):', res.duplicateCoords);
  console.log('Coords reused across different names:', res.acrossNames);
  const topDup = [...res.allMap.entries()].filter(([k,v])=>v.count>1).sort((a,b)=>b[1].count-a[1].count).slice(0,10);
  console.log('\nTop 10 duplicate coordinates by occurrences:');
  for(const [k,v] of topDup){
    const names = [...v.names];
    console.log(`${k} -> count=${v.count}; names=${names.slice(0,5).join(' | ')}${names.length>5?' …':''}`);
  }
  const perName = [...res.internalDupMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  console.log('\nTop names with internal duplicate coords:');
  for(const [n,c] of perName){ console.log(`${n}: ${c}`); }
}

main();
