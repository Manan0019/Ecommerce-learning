import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
function change(file,fn){const filename=path.join(root,file);const old=readFileSync(filename,'utf8');writeFileSync(filename,fn(old));}
function replace(s,a,b){if(!s.includes(a))throw new Error('Missing source: '+a.slice(0,90));return s.replace(a,b);}
function addUI(s,names){return s.replace('import { ',`import { ${names}, `);}
const localHook=(s,depth='../../')=>`import usePagination from '${depth}hooks/usePagination';\n`+s;

change('components/admin/DeliveryTeamTable.jsx',s=>{
 s=localHook(s);s=s.replace(/const pageNumbers = [\s\S]*?\n};\r?\n/,'');
 s=s.replace("  const [pageSize, setPageSize] = useState(10);",'').replace("  const [page, setPage] = useState(1);",'');
 s=s.replace(/  const totalPages = [\s\S]*?  const resetPage =/,"  const {page:currentPage,pages:totalPages,items:visible,setPage} = usePagination(filtered, JSON.stringify([query,status,sort]));\n  const resetPage =");
 s=s.replace(/      <FormField className="nx86-staff-select nx86-staff-per-page">[\s\S]*?<\/FormField>/,'');
 return s.replace('pageSize={pageSize} ','');
});
change('pages/admin/AdminInventory.jsx',s=>{
 s=localHook(s).replace(",[page,setPage]=useState(1)",'');
 s=s.replace(/  const pages=Math.max\(1,Math.ceil\(visible.length\/10\)\),slice=.*?;/,"  const {page,pages,items:slice,setPage}=usePagination(visible,JSON.stringify([query,state]));");
 return s.replace('data?.items.length===0?', 'data?.items.length===0?').replace('<div className="admin-table-wrap nx84-inventory-scroll"','<div className="admin-table-wrap nx84-inventory-scroll"').replace(':\n      <TableContainer',':!visible.length?<EmptyState icon="search" title="No matching stock alerts" description="Try a different search or stock filter."/>:\n      <TableContainer');
});
change('pages/admin/AdminCategories.jsx',s=>{
 s=localHook(s).replace('  const [page,setPage]=useState(1);','');
 return s.replace(/  const categoryPages=.*?;\r?\n  const currentPage=.*?;\r?\n  const pagedCategories=.*?;/,"  const {page:currentPage,pages:categoryPages,items:pagedCategories,setPage}=usePagination(filteredCategories,JSON.stringify([query,levelFilter,statusFilter]));");
});
change('pages/customer/Orders.jsx',s=>{
 s=localHook(s).replace(' const [page,setPage]=useState(1);','');
 s=s.replace(/const totalPages=Math.max\(1,Math.ceil\(visibleOrders.length\/10\)\);const currentPage=Math.min\(page,totalPages\);const pagedOrders=visibleOrders.slice\(\(currentPage-1\)\*10,currentPage\*10\);/,"const {page:currentPage,pages:totalPages,items:pagedOrders,setPage}=usePagination(visibleOrders,JSON.stringify([filter,search]));");
 return s;
});
change('pages/delivery/DeliveryDashboard.jsx',s=>{
 s=localHook(s).replace(/const \[page,setPage\]=useState\(1\);/,'');
 s=s.replace(/  const perPage=10;\r?\n  const pages=.*?;\r?\n  const visible=.*?;/,"  const {page,pages,items:visible,setPage}=usePagination(filtered,JSON.stringify([tab,search]));");
 s=s.replace('pageSize={perPage} ','');
 s=s.replace('placeholder="Search order, name or city"/>','placeholder="Search order, name or city"/><ClearFilters active={Boolean(search)||tab!=="active"} onClear={()=>{setSearch("");setTab("active");setPage(1);}}/>');
 return s;
});
change('pages/admin/AdminDelivery.jsx',s=>{
 s=localHook(s).replace(",[ordersPage,setOrdersPage]=useState(1)",'').replace(",[activityPage,setActivityPage]=useState(1)",'');
 s=s.replace(/ const ordersLimit=10, ordersPages=.*?;/," const {page:ordersPage,pages:ordersPages,items:ordersSlice,setPage:setOrdersPage}=usePagination(matchingOrders,JSON.stringify([orderQuery,orderStatus]));");
 s=s.replace(/ const activityLimit=10, activityPages=.*?;/," const {page:activityPage,pages:activityPages,items:activitySlice,setPage:setActivityPage}=usePagination(matchingActivity,JSON.stringify([activityQuery,activityStatus]));");
 s=s.replace('pageSize={ordersLimit} ','').replace('pageSize={activityLimit} ','');
 s=s.replace('<strong>{matchingOrders.length} matches</strong>','<strong>{matchingOrders.length} matches</strong><ClearFilters active={Boolean(orderQuery)||orderStatus!=="all"} onClear={()=>{setOrderQuery("");setOrderStatus("all");setOrdersPage(1);}}/>');
 s=s.replace('<strong>{matchingActivity.length} matches</strong>','<strong>{matchingActivity.length} matches</strong><ClearFilters active={Boolean(activityQuery)||activityStatus!=="all"} onClear={()=>{setActivityQuery("");setActivityStatus("all");setActivityPage(1);}}/>');
 return s;
});
change('components/delivery/EarningsLedger.jsx',s=>{
 s=localHook(addUI(s,'ClearFilters, SearchField'));
 s=s.replace(' const [collectionPage,setCollectionPage]=useState(1),[earningPage,setEarningPage]=useState(1);'," const [query,setQuery]=useState('');");
 s=s.replace(' const collectionRows=collections?.rows||[], earningRows=earnings?.rows||[];',` const matches=row=>Object.values(row).some(value=>String(value??'').toLowerCase().includes(query.trim().toLowerCase()));
 const collectionRows=(collections?.rows||[]).filter(matches),earningRows=(earnings?.rows||[]).filter(matches);
 const filterKey=JSON.stringify([period,range.from,range.to,executiveId,query]);`);
 s=s.replace(/ const collectionPages=.*?;\r?\n const currentCollectionPage=.*?;/,` const {page:currentCollectionPage,pages:collectionPages,items:visibleCollections,setPage:setCollectionPage}=usePagination(collectionRows,filterKey);
 const {page:currentEarningPage,pages:earningPages,items:visibleEarnings,setPage:setEarningPage}=usePagination(earningRows,filterKey);`);
 s=s.replace('collectionRows.slice((currentCollectionPage-1)*10,currentCollectionPage*10).map','visibleCollections.map').replace('earningRows.slice((currentEarningPage-1)*10,currentEarningPage*10).map','visibleEarnings.map');
 s=s.replace('<div className="nx81-finance-filters">','<div className="nx81-finance-filters" data-unsaved-ignore="true"><SearchField label="Search financial records" value={query} onChange={e=>setQuery(e.target.value)}/><ClearFilters active={Boolean(query)||period!=="month"||Boolean(executiveId)} onClear={()=>{setQuery("");setPeriod("month");setRange(presetBounds("month"));setExecutiveId("");}}/>');
 s=s.replace('<TableBody>{visibleCollections.map','<TableBody>{!visibleCollections.length&&<TableRow><TableCell colSpan={6}><EmptyState icon="search" title="No receipts in this view" description="Try a different reporting period or search."/></TableCell></TableRow>}{visibleCollections.map');
 s=s.replace('!earnings?.rows?.length&&<EmptyState','!earningRows.length&&<EmptyState');
 return s;
});
change('pages/admin/AdminReviews.jsx',s=>{
 s=localHook(addUI(s,'SearchField, ClearFilters'));
 s=s.replace(' const [page,setPage]=useState(1);'," const [query,setQuery]=useState('');");
 s=s.replace(' return <AdminLayout',` const matches=rows.filter(row=>[row.product_name,row.reviewer_name,row.title,row.body,row.status].some(value=>String(value||'').toLowerCase().includes(query.toLowerCase())));
 const {page,pages,items:visible,setPage}=usePagination(matches,query);
 return <AdminLayout`);
 s=s.replace('<div className="nx61-review-moderation">','<div className="nx61-review-moderation"><div className="nx77-table-toolbar"><SearchField label="Search reviews" value={query} onChange={e=>setQuery(e.target.value)}/><ClearFilters active={Boolean(query)} onClear={()=>setQuery("")}/></div>{rows.length>0&&!matches.length&&<EmptyState icon="search" title="No matching reviews" description="Try a different product, reviewer or review text."/>}');
 s=s.replace('rows.slice((Math.min(page,Math.max(1,Math.ceil(rows.length/10)))-1)*10,Math.min(page,Math.max(1,Math.ceil(rows.length/10)))*10).map','visible.map');
 return s.replace('pages={Math.max(1,Math.ceil(rows.length/10))} total={rows.length}','pages={pages} total={matches.length}');
});
change('pages/admin/AdminBanners.jsx',s=>{
 s=localHook(addUI(s,'ClearFilters, Pagination'));
 const filter="items.filter(item=>(!promotionSearch||`${item.title} ${item.subtitle||''} ${placementLabel(item)}`.toLowerCase().includes(promotionSearch.toLowerCase()))&&(promotionFilter==='all'||(promotionFilter==='disabled'?bannerStatus(item)!=='Live':bannerStatus(item).toLowerCase()===promotionFilter)))";
 s=replace(s,' return <AdminLayout',` const filteredPromotions=${filter};\n const promotionPager=usePagination(filteredPromotions,JSON.stringify([promotionSearch,promotionFilter]));\n return <AdminLayout`);
 s=replace(s,filter+'.map','promotionPager.items.map');
 s=s.replace('aria-label="Filter promotions by status"','aria-label="Filter promotions by status"');
 s=s.replace('<option value="disabled">Not live</option></Select></div>','<option value="disabled">Not live</option></Select><ClearFilters active={Boolean(promotionSearch)||promotionFilter!=="all"} onClear={()=>{setPromotionSearch("");setPromotionFilter("all");}}/></div>');
 s=s.replace('{!items.length&&<EmptyState','{items.length>0&&!filteredPromotions.length&&<EmptyState icon="search" title="No matching promotions" description="Clear your search or choose a different status."/>}{!items.length&&<EmptyState');
 s=s.replace('    {opened&&<Modal','    <Pagination {...promotionPager} label="promotions" onPageChange={promotionPager.setPage}/>\n    {opened&&<Modal');
 return s;
});
change('pages/admin/AdminFeatured.jsx',s=>{
 s=localHook(s);
 s=s.replace(' const totalPages=', ' const featuredPager=usePagination(items.map((item,index)=>({item,index})));\n const totalPages=');
 s=s.replace('{items.map((item,index)=><li','{featuredPager.items.map(({item,index})=><li');
 s=s.replace('   <p className="nx24-helper">','   <Pagination {...featuredPager} label="featured products" onPageChange={featuredPager.setPage}/>\n   <p className="nx24-helper">');
 s=s.replace('setTotal(Number(r.total??r.products?.length??0));','setTotal(Number(r.total??r.products?.length??0));setPage(current=>Math.min(current,Math.max(1,Math.ceil(Number(r.total??r.products?.length??0)/10))));');
 return s;
});
change('pages/admin/AdminCoupons.jsx',s=>{
 s=localHook(addUI(s,'Pagination, ClearFilters'));
 s=s.replace(' const displayed=targets;',` const targetPager=usePagination(targets,JSON.stringify([filter,form.scope]));
 const couponPager=usePagination(coupons);
 const displayed=targetPager.items;`);
 s=s.replace('placeholder="Search products by name"','placeholder="Search products by name"');
 s=s.replace("{form.scope==='categories'&&<FormField",'<Pagination {...targetPager} label="targets" onPageChange={targetPager.setPage}/><ClearFilters active={Boolean(filter)} label="Clear target search" onClear={()=>setFilter("")}/>'+"{form.scope==='categories'&&<FormField");
 s=s.replace(':coupons.map(c=><article',':couponPager.items.map(c=><article');
 s=s.replace(' {confirmPublish&&',' <Pagination {...couponPager} label="coupons" onPageChange={couponPager.setPage}/>\n {confirmPublish&&');
 return s;
});
change('pages/customer/Wishlist.jsx',s=>{
 s=localHook(addUI(s,'Pagination'));
 s=s.replace(' return <CustomerLayout',' const pager=usePagination(products);\n return <CustomerLayout').replace('{products.map((p)', '{pager.items.map((p)');
 return s.replace(' </CustomerLayout>',' <Pagination {...pager} label="saved products" onPageChange={pager.setPage}/>\n </CustomerLayout>');
});
change('pages/customer/Categories.jsx',s=>{
 s=localHook(addUI(s,'Pagination'));
 s=s.replace('  return <CustomerLayout','  const pager=usePagination(top);\n  return <CustomerLayout').replace('{top.map((category, index)', '{pager.items.map((category, index)');
 return s.replace('  </CustomerLayout>','  <Pagination {...pager} label="categories" onPageChange={pager.setPage}/>\n  </CustomerLayout>');
});
change('components/customer/ProductReviews.jsx',s=>{
 s=localHook(addUI(s,'EmptyState, Pagination'));
 s=s.replace(' return <section',' const pager=usePagination(data.reviews,String(productId));\n return <section').replace('{data.reviews.map(review','{pager.items.map(review');
 s=s.replace('<p className="nx61-muted">No published reviews yet. Only verified delivered purchases can be reviewed.</p>','<EmptyState icon="star" title="No published reviews yet" description="Reviews from verified delivered purchases will appear here."/>');
 return s.replace('   {!adminPreview&&reviewEligible','   <Pagination {...pager} label="reviews" onPageChange={pager.setPage}/>\n   {!adminPreview&&reviewEligible');
});

change('pages/admin/AdminProducts.jsx',s=>s.replace('setProducts(data.products || []);setTotal(Number(data.total||0));','setProducts(data.products || []);setTotal(Number(data.total||0));setPage(current=>Math.min(current,Math.max(1,Math.ceil(Number(data.total||0)/10))));').replace('title="No products found" description="Try another search or clear your filters."','title={summary.total?"No matching products":"No products yet"} description={summary.total?"Try another search or clear your filters.":"Add your first product to build the catalogue."}'));
change('pages/admin/AdminCustomers.jsx',s=>s.replace('setTotal(Number(data.total ?? data.customers?.length ?? 0));','setTotal(Number(data.total ?? data.customers?.length ?? 0));setPage(current=>Math.min(current,Math.max(1,Math.ceil(Number(data.total??data.customers?.length??0)/10))));').replace('title="No customers found" description="New customer accounts will appear here."','title={search?"No matching customers":"No customers yet"} description={search?"Try a different name, email or ID.":"New customer accounts will appear here."}'));
change('pages/admin/AdminOrders.jsx',s=>s.replace('const perPage=10;','').replace('setServerPagination(d.pagination||{total:0,pages:1,page:1});','setServerPagination(d.pagination||{total:0,pages:1,page:1});setOrderPage(current=>Math.min(current,Math.max(1,d.pagination?.pages||1)));').replace('setServerPagination(result.pagination||{total:0,pages:1,page:1});','setServerPagination(result.pagination||{total:0,pages:1,page:1});setOrderPage(current=>Math.min(current,Math.max(1,result.pagination?.pages||1)));'));

change('components/customer/ActiveFilterChips.jsx',s=>addUI(s,'ClearFilters').replace('<Button variant="secondary" className="nx32-filter-clear" type="button" onClick={onClear}>Clear filters</Button>','<ClearFilters active onClear={onClear}/>'));
change('components/customer/ProductFilters.jsx',s=>addUI(s,'ClearFilters').replace(/          <Button variant="secondary" type="button" onClick=\{\(\) => onFilterChange\(null, \[\]\)\}>\s*Clear all\s*<\/Button>/,'          <ClearFilters active={[...params.keys()].some(key=>!["page","category","q","sort","view"].includes(key))} disabled={disabled} onClear={()=>onFilterChange(null,[])}/>'));
change('components/customer/PriceRangeSlider.jsx',s=>addUI(s,'ClearFilters').replace('{(modified || hasFilter) && <Button variant="secondary" className="nx30-price-reset" type="button" onClick={reset} disabled={disabled}>Reset</Button>}','<ClearFilters active={modified||hasFilter} label="Clear price range" onClear={reset} disabled={disabled}/>'));
change('components/layout/StoreHeader.jsx',s=>s.replace(/function SearchIcon\(\) \{.*?\}\r?\n/,'').replace('<Button variant="primary" type="submit" className="nx47-search-submit" aria-label="Search"><SearchIcon /></Button>','<Button variant="primary" type="submit" aria-label="Search products">Search</Button>'));
change('components/admin/FileUploadField.jsx',s=>s.replace('FormField, TextField','FormField').replace('<TextField ref={inputRef}','<input ref={inputRef}'));

console.log('Completed list, filter and pagination migrations.');
