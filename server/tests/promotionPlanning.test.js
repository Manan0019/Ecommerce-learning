import test from "node:test";
import assert from "node:assert/strict";
import { normalizePromotionOrder, parsePromotionSchedule, promotionStatus, homeBannerCount } from "../services/promotionPlanning.js";

test("promotion reorder accepts exact IDs once, rejects stale/duplicate/invalid lists", () => {
  assert.deepEqual(normalizePromotionOrder(["9","2","3"],["2","3","9"]),["9","2","3"]);
  for (const ids of [["2","2","9"],["2","9"],["2","9","10"],["9","0","2"],[9,"2","3"]])
    assert.equal(normalizePromotionOrder(ids,["2","3","9"]),null);
});
test("schedule validates offset-aware timestamps and sequence",()=>{
  assert.deepEqual(parsePromotionSchedule("", ""),{startsAt:null,endsAt:null});
  const valid=parsePromotionSchedule("2026-10-20T12:00:00+05:30","2026-10-21T12:00:00+05:30");
  assert.equal(valid.startsAt,"2026-10-20T06:30:00.000Z");
  assert.equal(parsePromotionSchedule("2026-10-21T12:00:00Z","2026-10-20T12:00:00Z"),null);
  assert.equal(parsePromotionSchedule("2026-10-20T12:00", ""),null);
  assert.equal(parsePromotionSchedule("2026-02-30T12:00:00Z", ""),null);
});
test("scheduled and ended banners never appear live",()=>{
  const now=Date.parse("2026-10-20T12:00:00Z");
  assert.equal(promotionStatus({isActive:false},now),"hidden");
  assert.equal(promotionStatus({isActive:true,startsAt:"2026-10-20T12:01:00Z"},now),"scheduled");
  assert.equal(promotionStatus({isActive:true,endsAt:"2026-10-20T11:59:00Z"},now),"ended");
  assert.equal(promotionStatus({isActive:true,startsAt:"2026-10-20T11:00:00Z",endsAt:"2026-10-20T13:00:00Z"},now),"live");
});
test("homepage count is restricted to 1, 2 or 3",()=>{
  for(const n of [1,2,3]) assert.equal(homeBannerCount(n),n);
  for(const n of [0,4,2.5,"2.2","",null]) assert.equal(homeBannerCount(n),null);
});
