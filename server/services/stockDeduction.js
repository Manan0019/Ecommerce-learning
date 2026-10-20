// Final, guarded stock update: optimistic SQL predicate is a last line of
// defense even though order placement already locks the product/SKU rows.
// The caller MUST run this inside the same database transaction as INSERT.
export async function deductStock(db, line) {
  const params = [line.quantity, line.variantId || line.productId];
  const sql = line.variantId
    ? 'UPDATE product_variants SET stock=stock-$1,updated_at=NOW() WHERE id=$2 AND stock >= $1 RETURNING id'
    : 'UPDATE products SET stock=stock-$1 WHERE id=$2 AND stock >= $1 RETURNING id';
  const result = await db.query(sql, params);
  if (result.rows.length !== 1) {
    const conflict = new Error('Stock changed while finalizing your order.');
    conflict.code = 'NX_STOCK_CHANGED';
    throw conflict;
  }
}
