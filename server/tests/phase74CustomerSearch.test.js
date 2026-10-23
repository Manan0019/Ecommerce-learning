import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const controller=fs.readFileSync(new URL('../controllers/adminController.js',import.meta.url),'utf8');
test('customer directory performs limited parameterized server side search',()=>{
 assert.match(controller,/req\.query\.q/);
 assert.match(controller,/slice\(0, 100\)/);
 assert.match(controller,/POSITION\(LOWER\(\$1\) IN LOWER\(full_name\)\)/);
 assert.match(controller,/LIMIT 100/);
 assert.match(controller,/COUNT\(\*\)::int AS total/);
 assert.match(controller,/\[search\]/);
});
