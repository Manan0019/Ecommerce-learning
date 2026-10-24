import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
const root = path.resolve(import.meta.dirname, '../src');
const files = dir => readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const jsx = files(root).filter(f=>f.endsWith('.jsx')).map(f=>readFileSync(f,'utf8')).join('\n');
const retired = JSON.parse(readFileSync(path.resolve(import.meta.dirname,'../ui-migration.json'),'utf8')).retiredClasses.filter(name => !jsx.includes(name));
const special = /gallery|card-arrow|card-dot|quick-image|star-target|rating|swatch|slider|range-input|nav-toggle|menu-toggle|notification-list|carousel|promotion-dot|promotion-arrow|file-drop/;
const appearance = /^(font(?:-.+)?|letter-spacing|line-height|text-transform|color|background(?:-.+)?|border(?:-.+)?|border-radius|box-shadow|outline(?:-.+)?|transition(?:-.+)?|animation(?:-.+)?|transform)$/;
let selectorsRemoved=0, declarationsRemoved=0, importantRemoved=0;
for (const file of files(path.join(root,'styles/modules')).filter(f=>f.endsWith('.css') && !/foundation[\\/](tokens|design-system)\.css$/.test(f))) {
  const sheet=postcss.parse(readFileSync(file,'utf8'));
  sheet.walkRules(rule=>{
    const original = postcss.list.comma(rule.selector);
    const selectors = original.filter(selector=>!retired.some(name=>new RegExp('\\.'+name+'(?![\\w-])').test(selector)));
    selectorsRemoved+=original.length-selectors.length;
    if(!selectors.length){rule.remove();return;}
    rule.selector=selectors.join(',');
    const controls = selectors.every(s=>/(?:^|[\s>,(:])(?:button|input|select|textarea|label|th|td|table)(?=[\s.#[:>,)]|$)|\.(?:nx-ui-|admin-(?:primary-action|secondary-action|danger-action|status)|nx\d+-(?:icon-action|icon-btn|close-control|search-field|search-input|field-label))/.test(s));
    // Specialized native interactions retain their local geometry and appearance.
    if(controls && !selectors.some(s=>special.test(s))) rule.walkDecls(decl=>{
      if(appearance.test(decl.prop)){decl.remove();declarationsRemoved++;}
    });
    // Old important declarations cannot outrank component ownership across layers.
    if(selectors.some(s=>/button|input|select|textarea|label|\bth\b|\btd\b|\btable\b|nx\d+-(?:icon|close|search|field|product-title|staff-name|bell-count)|\.auth-|\.admin-/.test(s)) && !selectors.some(s=>special.test(s))) {
      rule.walkDecls(decl=>{if(decl.important){decl.important=false;importantRemoved++;}});
    }
    if(!rule.nodes?.length)rule.remove();
  });
  sheet.walkAtRules(rule=>{if(rule.nodes && !rule.nodes.length)rule.remove();});
  writeFileSync(file,sheet.toString());
}
const summary={selectorsRemoved,declarationsRemoved,importantRemoved,retiredClasses:retired};
writeFileSync(path.resolve(import.meta.dirname,'../ui-style-cleanup.json'),JSON.stringify(summary,null,2)+'\n');
console.log(summary);
