import test from "node:test";
import assert from "node:assert/strict";
import { activeCatalogueFilters, removeCatalogueFilter } from "../src/services/activeFilters.js";
const facets = [{ key:"variant_size",label:"Size",options:[{value:"30",label:"30"},{value:"32",label:"32"}] }];
test("active chips show SKU facets plus search, price and stock", () => {
  const params = new URLSearchParams("q=jeans&inStock=true&minPrice=1000&maxPrice=3500&variant_size=30%2C32");
  assert.deepEqual(activeCatalogueFilters(params,facets).map(c=>c.label),[
    "Search: jeans","In stock","From ₹1,000","Up to ₹3,500","Size: 30","Size: 32"
  ]);
});
test("removing one SKU chip leaves other values, sort and category alone", () => {
  const params = new URLSearchParams("variant_size=30%2C32&sort=newest&category=jeans&page=3");
  const next = removeCatalogueFilter(params,{key:"variant_size",value:"30"});
  assert.equal(next.get("variant_size"),"32");
  assert.equal(next.get("category"),"jeans");
  assert.equal(next.get("sort"),"newest");
  assert.equal(next.get("page"),null);
});
test("removing search resets search without disturbing product view",()=>{
  const next = removeCatalogueFilter(new URLSearchParams("q=shoe&view=colors"),{key:"q"});
  assert.equal(next.get("q"),null);
  assert.equal(next.get("view"),"colors");
});
