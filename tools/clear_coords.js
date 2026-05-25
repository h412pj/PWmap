#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = 'd:/PWmap';
const RES_PATH = path.join(ROOT, 'data', 'resources.json');
const BACKUP_PATH = path.join(ROOT, 'data', 'resources.json.bak');

const raw = fs.readFileSync(RES_PATH, 'utf8');
fs.writeFileSync(BACKUP_PATH, raw, 'utf8');
const data = JSON.parse(raw);
let changed = 0;
for(const item of data){
  if(Array.isArray(item.coords) && item.coords.length){
    item.coords = [];
    changed++;
  }
}
fs.writeFileSync(RES_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`Cleared coords for ${changed} items. Backup: ${BACKUP_PATH}`);
