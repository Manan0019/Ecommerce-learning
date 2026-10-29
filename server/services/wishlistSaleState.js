/** The storefront SALE label is a merchandising choice, not a synonym for a discount.
 * Keep wishlist cards, saved-alert baselines and notifications in sync with the
 * product detail page: a discount must exist AND the admin must enable SALE.
 * `p` denotes products and `v` the active-variant aggregate in each query.
 */
export const wishlistOnSaleSql = `(COALESCE(p.show_sale_badge,FALSE)
  AND (p.mrp > p.price OR COALESCE(v.has_discount,FALSE)))`;
