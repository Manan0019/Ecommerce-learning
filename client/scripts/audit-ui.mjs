import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const root = path.resolve(import.meta.dirname, '../src');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const inventory = [];
for (const file of files(root).filter(file => file.endsWith('.jsx'))) {
  const source = readFileSync(file, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const counts = {};
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement') {
      const name = node.name.name;
      counts[name] = (counts[name] || 0) + 1;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(ast);
  inventory.push({ file: path.relative(root, file).replaceAll('\\', '/'), counts });
}
const totals = {};
for (const { counts } of inventory) for (const [name, count] of Object.entries(counts)) totals[name] = (totals[name] || 0) + count;
const controls = ['select', 'Select', 'SearchInput', 'SearchField', 'input', 'TextField', 'textarea', 'Textarea', 'label', 'FormField', 'button', 'Button', 'IconButton', 'table', 'DataTable', 'Pagination'];
console.log(`${inventory.length} JSX files audited.`, Object.fromEntries(controls.map(name => [name, totals[name] || 0])));
if (process.argv.includes('--write')) writeFileSync(path.resolve(import.meta.dirname, '../ui-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
