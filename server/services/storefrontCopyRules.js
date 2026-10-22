export const defaultStorefrontCopy=Object.freeze({
 ribbonLabel:'THE NEXORA EDIT',ribbonMessage:'Discover something worth keeping',
 featuredEyebrow:'LIVE CATALOGUE',featuredTitle:'Featured products',
 categoryEyebrow:'BROWSE WHAT YOU LOVE',categoryTitle:'Shop by category',
 editorialEyebrow:'THOUGHTFULLY SELECTED',editorialTitle:'Discover something new every day.',
 editorialDescription:'Explore products by category, brand and price, with useful details and a clear shopping cart.',
 editorialButton:'Browse products'
});
const max={ribbonLabel:46,ribbonMessage:94,featuredEyebrow:48,featuredTitle:70,categoryEyebrow:48,categoryTitle:70,editorialEyebrow:48,editorialTitle:110,editorialDescription:230,editorialButton:40};
export function validateStorefrontCopy(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const valid={};
 for(const [key,limit] of Object.entries(max)){
  if(typeof raw[key]!=='string')return null;
  const value=raw[key].trim().replace(/\s+/g,' ');
  if(value.length<2||value.length>limit||/[<>\u0000-\u001f]/.test(value))return null;
  valid[key]=value;
 }
 return valid;
}
export function storefrontCopyFromRow(row){return {...defaultStorefrontCopy,...((row&&typeof row.content==='object'&&!Array.isArray(row.content))?row.content:{})};}
