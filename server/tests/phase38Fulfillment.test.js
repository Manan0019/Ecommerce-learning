import test from "node:test";
import assert from "node:assert/strict";
import { canChangeOrderStatus, canConfirmCodCollection, validateDispatch } from "../services/codOrderRules.js";

test("COD order proceeds one stage at a time", () => {
  for (const [from, to] of [["placed","confirmed"],["confirmed","processing"],["processing","shipped"],["shipped","delivered"]]) {
    assert.equal(canChangeOrderStatus(from,to), true, `${from} → ${to}`);
  }
  assert.equal(canChangeOrderStatus("placed","delivered"),false);
  assert.equal(canChangeOrderStatus("processing","delivered"),false);
  assert.equal(canChangeOrderStatus("shipped","cancelled"),false);
  assert.equal(canChangeOrderStatus("delivered","cancelled"),false);
  assert.equal(canChangeOrderStatus("cancelled","shipped"),false);
  assert.equal(canChangeOrderStatus("delivered","delivered"),false);
});
test("only placed and confirmed orders can be cancelled and stock restored", () => {
  assert.equal(canChangeOrderStatus("placed","cancelled"),true);
  assert.equal(canChangeOrderStatus("confirmed","cancelled"),true);
  assert.equal(canChangeOrderStatus("processing","cancelled"),false);
  assert.equal(canChangeOrderStatus("cancelled","cancelled"),false);
});
test("dispatch requires a usable delivery partner", () => {
  assert.match(validateDispatch({}),/partner/i);
  assert.match(validateDispatch(null),/partner/i);
  assert.equal(validateDispatch({deliveryPartner:"Local delivery"}),null);
  assert.equal(validateDispatch({deliveryPartner:"Courier",trackingReference:"AWB-0092/X"}),null);
  assert.match(validateDispatch({deliveryPartner:"a"}),/partner/i);
  assert.match(validateDispatch({deliveryPartner:"a".repeat(81)}),/partner/i);
});
test("tracking IDs reject markup and overlong inputs", () => {
  assert.match(validateDispatch({deliveryPartner:"Courier",trackingReference:"<script>"}),/reference/i);
  assert.match(validateDispatch({deliveryPartner:"Courier",trackingReference:"A".repeat(101)}),/reference/i);
  assert.match(validateDispatch({deliveryPartner:"Courier",trackingReference:123}),/reference/i);
});
test("cash collection can only be recorded once after delivery", () => {
  assert.equal(canConfirmCodCollection("placed","cod_pending"),false);
  assert.equal(canConfirmCodCollection("shipped","cod_pending"),false);
  assert.equal(canConfirmCodCollection("cancelled","cod_pending"),false);
  assert.equal(canConfirmCodCollection("delivered","cod_pending"),true);
  assert.equal(canConfirmCodCollection("delivered","cod_collected"),false);
});
