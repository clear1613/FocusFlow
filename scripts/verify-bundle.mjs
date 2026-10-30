import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

const html = await readFile('dist/index.html', 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+\.js)"/);
assert(entry, 'Built HTML must contain a JavaScript entry');
const file = join('dist/assets', basename(entry[1]));
const { size } = await stat(file);
assert(size <= 300_000, `Entry JavaScript is ${size} bytes; budget is 300000. Keep optional views and chart code out of the entry.`);
console.log(`Bundle budget verified: entry ${size} / 300000 bytes.`);
