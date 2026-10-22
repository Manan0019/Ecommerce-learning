const clean = (v, max) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= max && !/[<>\u0000-\u001f]/.test(v) ? v.trim() : null;
export const DEFAULT_FOOTER = Object.freeze({headlinePrimary:'GOOD THINGS,',headlineAccent:'FOUND HERE.',tickerItems:['NEXORA','DISCOVER','CHOOSE','LOVE YOUR FINDS'],artworkUrl:null});
export function validateFooterContent(data){
  const headlinePrimary=clean(data?.headlinePrimary,80);
  const headlineAccent=clean(data?.headlineAccent,80);
  const tickerItems=data?.tickerItems;
  if(!headlinePrimary||!headlineAccent||!Array.isArray(tickerItems)||tickerItems.length<2||tickerItems.length>12)return null;
  const items=tickerItems.map(v=>clean(v,38));
  if(items.some(v=>v===null))return null;
  return {headlinePrimary,headlineAccent,tickerItems:items};
}
export function footerFromRow(row){return row?{headlinePrimary:row.headline_primary,headlineAccent:row.headline_accent,tickerItems:row.ticker_items,artworkUrl:row.artwork_url||null}:DEFAULT_FOOTER;}
