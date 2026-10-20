// The order request key is stable for retries of one checkout intent; when
// products, quantities or address change, use a fresh key.
export function checkoutIntentKey(items, selectedId, address) {
  const lines = [...items].map(({productId,variantId,quantity}) => ({
    productId:String(productId), variantId:variantId == null ? null : String(variantId), quantity,
  })).sort((a,b)=>`${a.productId}:${a.variantId??''}`.localeCompare(`${b.productId}:${b.variantId??''}`));
  return JSON.stringify({lines,selectedId:String(selectedId),address:selectedId==='new'?address:null});
}

export function checkoutAcceptable({estimate,estimateFor,intentKey,cartValid,codEnabled,posting,estimating}) {
  return Boolean(estimate && estimateFor === intentKey && cartValid && codEnabled && !posting && !estimating);
}
