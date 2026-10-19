import test from "node:test";
import assert from "node:assert/strict";
import {validBannerDestination, validBannerPlacement, isExternalBannerDestination, productDestination} from "../services/bannerTargeting.js";

test("placements preserve old home/category cases and add product pages",()=>{
  for(const [position,category,product] of [
    ["home",null,null],["category","7",null],["both","7",null],
    ["product",null,"123"],["home_product",null,"123"]
  ])assert.equal(validBannerPlacement(position,category,product),true,position);
  for(const [position,category,product] of [
    ["home",null,"1"],["home","7",null],["product","7","1"],
    ["category",null,"7"],["both",null,null],["home_product",null,null],
    ["product",null,"0"],["unknown",null,null]
  ])assert.equal(validBannerPlacement(position,category,product),false,position);
});
test("banner destinations permit product/category links and HTTPS, reject unsafe schemes",()=>{
  for(const good of ["/products", "/categories/laptop", "/products/14?variant=12", "https://example.com/offer"])
    assert.equal(validBannerDestination(good),true,good);
  for(const bad of ["//evil.example", "javascript:alert(1)", "http://example.com", "https://me:pw@example.com", "", "/\\evil.com"])
    assert.equal(validBannerDestination(bad),false,bad);
  assert.equal(isExternalBannerDestination("https://example.com"),true);
  assert.equal(productDestination("72"),"/products/72");
  assert.throws(()=>productDestination("0"));
});
