/** A small, structured, plain-text product guide. No HTML or inferred product claims. */
const TYPES = new Set(['general', 'clothing', 'electronics', 'beauty']);
const invalid = () => { throw new Error('INVALID_BUYING_GUIDE'); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function text(value, max) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max * 2) invalid();
  const trimmed = value.trim();
  if (trimmed.length > max) invalid();
  return trimmed;
}
function textList(value, maxItems, maxChars) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems) invalid();
  return value.map(item => text(item, maxChars)).filter(Boolean);
}
export function validateBuyingGuide(input) {
  if (input == null || input === '') return {};
  let value = input;
  if (typeof input === 'string') {
    if (input.length > 16000) invalid();
    try { value = JSON.parse(input); } catch { invalid(); }
  }
  if (!record(value)) invalid();
  if (!Object.keys(value).length) return {};
  const kind = value.kind == null || value.kind === '' ? 'general' : value.kind;
  if (!TYPES.has(kind)) invalid();
  if (value.sizeChart != null && !record(value.sizeChart)) invalid();
  if (value.compatibility != null && !record(value.compatibility)) invalid();
  if (value.beauty != null && !record(value.beauty)) invalid();
  const columns = textList(value.sizeChart?.columns, 5, 48);
  if (columns.length && columns.length < 2) invalid();
  const rawRows = value.sizeChart?.rows ?? [];
  if (!Array.isArray(rawRows) || rawRows.length > 16) invalid();
  const rows = rawRows.map(row => {
    if (!Array.isArray(row) || row.length !== columns.length) invalid();
    return row.map(cell => text(cell, 70));
  }).filter(row => row.some(Boolean));
  if (rows.length && columns.length < 2) invalid();
  const faqs = value.faqs ?? [];
  if (!Array.isArray(faqs) || faqs.length > 8) invalid();
  const normalizedFaqs = faqs.map(faq => {
    if (!record(faq)) invalid();
    const question = text(faq.question, 170);
    const answer = text(faq.answer, 900);
    if (!question && !answer) return null;
    if (!question || !answer) invalid();
    return { question, answer };
  }).filter(Boolean);
  const result = {
    kind,
    introduction: text(value.introduction, 800),
    sizeChart: {columns, rows, note: text(value.sizeChart?.note, 400)},
    compatibility: {
      models: textList(value.compatibility?.models, 30, 110),
      notes: text(value.compatibility?.notes, 700)
    },
    beauty: {
      ingredients: text(value.beauty?.ingredients, 900),
      instructions: text(value.beauty?.instructions, 900),
      cautions: text(value.beauty?.cautions, 700)
    },
    care: text(value.care, 800),
    faqs: normalizedFaqs
  };
  if (!hasBuyingGuideContent(result)) return {};
  return result;
}

export function hasBuyingGuideContent(guide) {
  return Boolean(guide && (
    guide.introduction || guide.care || guide.sizeChart?.rows?.length ||
    guide.compatibility?.models?.length || guide.compatibility?.notes ||
    guide.beauty?.ingredients || guide.beauty?.instructions || guide.beauty?.cautions ||
    guide.faqs?.length
  ));
}
