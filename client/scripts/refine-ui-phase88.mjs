import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {parse} from '@babel/parser';
const root=path.resolve(import.meta.dirname,'../src');
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const editFile=(file,fn)=>{const p=path.join(root,file);writeFileSync(p,fn(readFileSync(p,'utf8')));};
for(const file of files(root).filter(f=>f.endsWith('.jsx')&&!f.includes(`${path.sep}ui${path.sep}`))){
 const source=readFileSync(file,'utf8'),ast=parse(source,{sourceType:'module',plugins:['jsx']}),edits=[];
 function visit(node){
  if(!node||typeof node!=='object')return;
  if(node.type==='JSXElement'&&node.openingElement.name.name==='EntityTitle'){
   const as=node.openingElement.attributes.find(a=>a.name?.name==='as');
   const kids=node.children.filter(c=>c.type!=='JSXText'||c.value.trim());
   // Image links, hit areas and card containers are not typography primitives.
   if(as?.value?.expression?.name==='Link'&&(node.openingElement.selfClosing||kids.some(c=>c.type==='JSXElement'&&!['EntityTitle','span'].includes(c.openingElement.name.name))||/image|thumb|hit-area/.test(source.slice(node.openingElement.start,node.openingElement.end)))){
    edits.push([node.openingElement.name.start,node.openingElement.name.end,'Link'],[as.start,as.end,'']);
    if(node.closingElement)edits.push([node.closingElement.name.start,node.closingElement.name.end,'Link']);
   }
  }
  for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
 }
 visit(ast);let result=source;for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))result=result.slice(0,start)+text+result.slice(end);
 // Explicit state variants replace remaining dynamic legacy action classes.
 result=result.replace('variant="danger" className={`nx69-icon-action ${item.isActive?\'nx69-icon-danger\':\'\'}`}','variant={item.isActive?"danger":"success"}');
 result=result.replace('variant="secondary" className={`nx69-icon-action nx69-sale-action ${product.showSaleBadge ? "nx70-sale-on" : "nx70-sale-off"}`}','variant={product.showSaleBadge ? "success" : "secondary"}');
 if(result!==source)writeFileSync(file,result);
}
editFile('pages/delivery/DeliveryDashboard.jsx',s=>s.replace('tab!=="active"','tab!=="all"').replace('setSearch("");setTab("active");setPage(1);','setSearch("");setTab("all");setPage(1);'));
editFile('pages/admin/AdminDelivery.jsx',s=>s.replace('<p>No delivery issues awaiting review.</p>','<EmptyState icon="check-circle" title="No delivery issues awaiting review" description="Issues reported by your delivery team will appear here."/>'));
editFile('pages/admin/AdminCoupons.jsx',s=>s.replace('<Pagination {...targetPager} label="targets" onPageChange={targetPager.setPage}/>','{form.scope!=="order"&&<Pagination {...targetPager} label="targets" onPageChange={targetPager.setPage}/>}').replace('<div className="nx63-target-list">','<div className="nx63-target-list">{!displayed.length&&<EmptyState icon="search" title="No matching targets" description="Try another search or target type."/>}'));
editFile('pages/customer/CartPage.jsx',s=>s.replace('import { ','import { EmptyState, EntityTitle, ').replace(/<div className="store-empty empty-cart">[\s\S]*?<\/div>/,'<EmptyState icon="bag" title="Your cart is waiting" description="Explore the collection and add something you love." action={<Button as={Link} variant="primary" to="/products">Start shopping</Button>}/>').replace('<h2>{item.name || "Unavailable product"}</h2>','<EntityTitle as="h2" size="lg">{item.name || "Unavailable product"}</EntityTitle>'));
editFile('pages/customer/Compare.jsx',s=>s.replace('import { ','import { EmptyState, ').replace(/<div className="nx69-compare-empty">[\s\S]*?<\/div>/,'<EmptyState icon="compare" title="Your comparison is empty" description="Tap Compare on a product card to add it here." action={<Button as={Link} variant="primary" to="/products">Find products</Button>}/>'));
editFile('pages/customer/Wishlist.jsx',s=>s.replace('<h2>{p.name}</h2>','<EntityTitle as="h2" size="lg">{p.name}</EntityTitle>'));
editFile('components/common/ProductCard.jsx',s=>s.replace('<EntityTitle as="h3" size="lg"><EntityTitle as={Link} to={detailUrl}>','<EntityTitle as="h3" size="lg"><Link to={detailUrl}>').replace('{product.name}</EntityTitle></EntityTitle>','{product.name}</Link></EntityTitle>'));
editFile('components/admin/DeliveryExecutivePicker.jsx',s=>s.replace('import { ','import { EmptyState, ').replace(/<p className="nx53-team-empty">\{team.length === 0 \? .*?<\/p>/,'<EmptyState icon="users" title={team.length?"No matching executives":"No delivery executives yet"} description={team.length?"Try another name, email or phone.":"Create an active delivery account first."}/>'));
editFile('components/admin/DeliveryBatchAssignmentDialog.jsx',s=>s.replace('import { ','import { EmptyState, ').replace('<p>No delivery executives match your search.</p>','<EmptyState icon="users" title="No matching delivery executives" description="Try another name, email or phone."/>'));

editFile('pages/customer/ProductList.jsx',s=>{
 s=s.replace('import { ','import { ClearFilters, EmptyState, ');
 s=s.replace('          setProducts(data.products || []);',`          const lastPage=Math.max(1,Number(data.pagination?.pages)||1);
          if(Number(params.get('page')||1)>lastPage){
            const next=new URLSearchParams(queryString);next.set('page',String(lastPage));setSearchParams(next,{replace:true});return;
          }
          setProducts(data.products || []);`);
 s=s.replace('[queryString, selectedCategory,liveRevision]','[queryString, selectedCategory,liveRevision,setSearchParams]');
 s=s.replace('      <div className="catalogue-results-bar">','      <div className="catalogue-results-bar"><ClearFilters active={[...searchParams].some(([key,value])=>key!=="page"&&value&&!(key==="sort"&&value==="newest")&&!(key==="view"&&value==="products"))} onClear={()=>setSearchParams(new URLSearchParams())}/>');
 s=s.replace(/<div className="store-empty">\s*<h2>Category unavailable<\/h2>\s*<p>This category is inactive or does not exist.<\/p>\s*<\/div>/,'<EmptyState icon="grid" title="Category unavailable" description="This category is inactive or does not exist."/>');
 s=s.replace(/<div className="store-empty">\s*<h2>No matching products<\/h2>[\s\S]*?<\/div>/,'<EmptyState icon="search" title={searchParams.size||selectedCategory?"No matching products":"No products yet"} description={parentCategory?`No active products are assigned to ${activeCategory.name} yet. Try ${parentCategory.name} or remove a filter.`:"Try another search or check back for new products."} action={parentCategory&&<Button as={Link} variant="primary" to={`/categories/${encodeURIComponent(parentCategory.slug)}`}>Browse {parentCategory.name}</Button>}/>');
 return s.replace('pagination.pages > 1','pagination.total > 0');
});
console.log('Refined semantics and empty states.');
