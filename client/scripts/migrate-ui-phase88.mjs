// One-time, range-preserving migration. Run only against the Phase 87 source.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '../src');
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const record = { files: [], retiredClasses: new Set() };
for (const file of files(root).filter(f => f.endsWith('.jsx') && !f.includes(`${path.sep}ui${path.sep}`))) {
  const source = execFileSync('git', ['show', `HEAD:client/src/${path.relative(root, file).replaceAll('\\', '/')}`], { encoding: 'utf8' });
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const edits = [], imports = new Set();
  const attr = (el, name) => el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === name);
  const raw = node => source.slice(node.start, node.end);
  const classText = el => { const a = attr(el, 'className'); return a ? raw(a.value) : ''; };
  const edit = (start, end, text) => edits.push({ start, end, text });
  const add = (el, text) => edit(el.openingElement.name.end, el.openingElement.name.end, ' ' + text);
  const rename = (el, name, extra = '') => {
    imports.add(name); edit(el.openingElement.name.start, el.openingElement.name.end, name + (extra ? ' ' + extra : ''));
    if (el.closingElement) edit(el.closingElement.name.start, el.closingElement.name.end, name);
  };
  const stripClass = (el, pattern) => {
    const a = attr(el, 'className'); if (!a || a.value?.type !== 'StringLiteral') return;
    const old = a.value.value.split(/\s+/), next = old.filter(x => !pattern.test(x));
    old.filter(x => !next.includes(x)).forEach(x => record.retiredClasses.add(x));
    if (!next.length) edit(a.start, a.end, ''); else edit(a.value.start, a.value.end, JSON.stringify(next.join(' ')));
  };
  function visit(node, ancestors = []) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement') {
      const name = node.openingElement.name.name, cls = classText(node);
      const children = node.children.filter(c => !(c.type === 'JSXText' && !c.value.trim()));
      const search = children.find(c => c.type === 'JSXElement' && c.openingElement.name.name === 'SearchInput');
      if (search && /^(label|div)$/.test(name) && /(?:admin-search|nx\d+-(?:search|staff-search|customer-search|delivery-search|order-search|batch-search|category-search))/.test(cls)) {
        edit(node.start, node.end, raw(search).replaceAll('SearchInput', 'SearchField'));
        imports.add('SearchField');
        const ca = attr(node, 'className'); if (ca?.value?.type === 'StringLiteral') ca.value.value.split(/\s+/).forEach(x => record.retiredClasses.add(x));
        return;
      }
      if (name === 'SearchInput') rename(node, 'SearchField');
      if (name === 'input') {
        const type = attr(node, 'type')?.value?.value;
        if (type === 'checkbox' || type === 'radio') rename(node, 'Checkbox');
        else if (!['range', 'hidden'].includes(type)) rename(node, 'TextField');
      }
      if (name === 'textarea') rename(node, 'Textarea');
      if (name === 'label') {
        const inline = /type=["'](?:checkbox|radio)["']/.test(raw(node));
        rename(node, 'FormField', inline ? 'inline' : '');
      }
      const tableTags = { thead: 'TableHead', tbody: 'TableBody', tr: 'TableRow', th: 'TableHeader', td: 'TableCell' };
      if (tableTags[name]) {
        const numeric = name === 'td' && /\{(?:money|paise)\(|\{(?:product|category|member)\.(?:stock|displayStock|productCount|openDeliveries)/.test(raw(node));
        const actions = name === 'td' && /(?:row-actions|executive-actions|staff-actions)/.test(raw(node));
        rename(node, tableTags[name], actions ? 'actions' : numeric ? 'numeric' : '');
      }
      if (name === 'div' && /(?:admin-table-wrap|nx46-table-wrap|nx81-table-scroll|nx71-featured-table-wrap)/.test(cls) && attr(node, 'className')?.value?.type === 'StringLiteral') rename(node, 'TableContainer');
      if (['div', 'section', 'article'].includes(name) && /(?:^|["'\s])admin-panel(?:\s|["'])/.test(cls)) rename(node, 'Card', `as="${name}"`);
      if (name === 'div' && /(?:admin-row-actions|nx69-row-actions|nx80-executive-actions|nx86-staff-actions)/.test(cls)) {
        rename(node, 'IconActionGroup'); stripClass(node, /^(admin-row-actions|nx69-row-actions|nx80-executive-actions|nx86-staff-actions|nx-actions)$/);
      }
      if (['strong', 'h3', 'Link'].includes(name) && !/button|action/.test(cls) && (/nx46-product-title|nx86-staff-name/.test(cls) || /\{(?:product|category|p|item|member|customer|r)\.(?:name|productName|fullName|product_name)\}/.test(raw(node)) && !/className=.{0,30}(?:money|price)/.test(raw(node)))) {
        rename(node, 'EntityTitle', name === 'Link' ? 'as={Link}' : name === 'strong' ? '' : `as="${name}" size="lg"`);
        stripClass(node, /^(nx46-product-title|nx86-staff-name)$/);
      }
      if (name === 'small' && /(?:\.(?:brand|sku|category|slug)|staff-meta)/.test(raw(node))) rename(node, 'EntitySubtitle');
      if (name === 'span' && /nx46-bell-count|nx24-sidebar-count|nx69-compare-count/.test(cls)) rename(node, 'CountBadge');
      if (name === 'span' && /admin-status|nx46-pill|nx24-out|nx24-low/.test(cls)) {
        let tone = 'neutral';
        const ca = attr(node, 'className');
        if (ca.value.type === 'StringLiteral') tone = /out/.test(cls) ? 'danger' : /low|warning/.test(cls) ? 'warning' : /good|is-active/.test(cls) ? 'success' : 'neutral';
        let extra = `tone="${tone}"`;
        if (ca.value.type === 'JSXExpressionContainer') {
          const exp = ca.value.expression;
          if (exp.type === 'TemplateLiteral' && exp.expressions[0]?.type === 'ConditionalExpression') {
            const cond = exp.expressions[0];
            const yes = cond.consequent.value;
            if (typeof yes === 'string') extra = `tone={${raw(cond.test)} ? "${/good|is-active/.test(yes) ? 'success' : /warning|low/.test(yes) ? 'warning' : 'neutral'}" : "neutral"}`;
          } else if (exp.type === 'ConditionalExpression' && exp.consequent.value === 'nx24-out') extra = `tone={${raw(exp.test)} ? "danger" : "warning"}`;
        }
        rename(node, 'StatusBadge', extra); edit(ca.start, ca.end, '');
      }
      if (name === 'button' || name === 'Link' && /button|action|nx27-secondary|nx62-secondary/.test(cls)) {
        const context = ancestors.filter(a => a.type === 'JSXElement').slice(-3).map(classText).join(' ');
        const specialized = /(?:gallery|card-arrows|card-dots|quick-image|star-target|rating-star|color-chip|swatch|nav-toggle|menu-toggle|delivery-list-card|notification-list|state-suggestions|category-option|category-row|picker-option|variant-option|payment-option|batch-person|recipient-option|carousel|promotion-dot|promotion-arrow)/.test(cls + ' ' + context);
        const iconOnly = !specialized && (/(?:icon-action|icon-btn|icon-button|close-control|animated-close)/.test(cls) || children.length === 1 && children[0].type === 'JSXElement' && ['UiIcon', 'svg'].includes(children[0].openingElement.name.name));
        const variant = specialized ? 'plain' : /danger|delete-button/.test(cls) ? 'danger' : /primary|auth-submit/.test(cls) || attr(node, 'type')?.value?.value === 'submit' ? 'primary' : /text-action/.test(cls) ? 'ghost' : 'secondary';
        rename(node, iconOnly ? 'IconButton' : 'Button', `${name === 'Link' ? 'as={Link} ' : ''}variant="${variant}"`);
        stripClass(node, /^(?:button|button-primary|button-secondary|admin-primary-action|admin-secondary-action|admin-danger-action|nx69-icon-action|nx69-icon-danger|nx80-icon-btn|nx80-icon-danger|nx-icon-button|nx65-close-control|nx64-animated-close|auth-submit|nx27-secondary|nx62-secondary)$/);
        if (iconOnly && !attr(node, 'aria-label') && !attr(node, 'title')) add(node, 'aria-label="Action"');
      }
      ancestors = [...ancestors, node];
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'tokens', 'comments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, ancestors));
      else if (value && typeof value === 'object') visit(value, ancestors);
    }
  }
  visit(ast);
  const existing = ast.program.body.filter(n => n.type === 'ImportDeclaration' && /\/ui\/index/.test(n.source.value));
  for (const imp of existing) {
    for (const s of imp.specifiers) if (s.imported?.name !== 'SearchInput') imports.add(s.imported?.name || s.local.name);
    edit(imp.start, imp.end, '');
  }
  if (!edits.length) continue;
  const uiPath = path.relative(path.dirname(file), path.join(root, 'components/ui/index')).replaceAll('\\', '/');
  edit(0, 0, `import { ${[...imports].sort().join(', ')} } from "${uiPath.startsWith('.') ? uiPath : './' + uiPath}";\n`);
  edits.sort((a,b) => b.start-a.start || b.end-a.end);
  let result = source;
  for (const e of edits) result = result.slice(0,e.start) + e.text + result.slice(e.end);
  try { parse(result, { sourceType: 'module', plugins: ['jsx'] }); }
  catch (error) { writeFileSync(path.resolve(import.meta.dirname, '../migration-debug.txt'), result); console.error(file); throw error; }
  writeFileSync(file, result);
  record.files.push(path.relative(root,file).replaceAll('\\','/'));
}
writeFileSync(path.resolve(import.meta.dirname,'../ui-migration.json'),JSON.stringify({...record, retiredClasses:[...record.retiredClasses]},null,2)+'\n');
console.log(`Migrated ${record.files.length} source files.`);
