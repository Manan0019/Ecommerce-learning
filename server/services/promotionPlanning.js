/** Pure rules for the promotion studio: no database or time-zone assumptions. */
export function normalizePromotionOrder(ids, currentIds) {
  if (!Array.isArray(ids) || !Array.isArray(currentIds) || ids.length !== currentIds.length || ids.length > 500) return null;
  const valid = id => typeof id === "string" && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
  if (!ids.every(valid) || new Set(ids).size !== ids.length) return null;
  const current = new Set(currentIds.map(String));
  return current.size === ids.length && ids.every(id => current.has(id)) ? ids : null;
}

export function parsePromotionSchedule(start, end) {
  const parse = value => {
    if (value == null || value === "") return null;
    if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return NaN;
    const parts = value.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(?:\.\d{1,3})?)?(Z|([+-])(\d\d):(\d\d))$/);
    if(!parts) return NaN;
    const [,year,month,day,hour,minute,second,tz,,offHour,offMinute] = parts;
    if(+month<1||+month>12||+day<1||+day>new Date(Date.UTC(+year,+month,0)).getUTCDate()||
       +hour>23||+minute>59||+(second||0)>59|| (tz!=="Z"&&(+offHour>23||+offMinute>59))) return NaN;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2020 && date.getUTCFullYear() <= 2100 ? date : NaN;
  };
  const startsAt = parse(start), endsAt = parse(end);
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return null;
  if (startsAt && endsAt && startsAt.getTime() >= endsAt.getTime()) return null;
  return { startsAt: startsAt ? startsAt.toISOString() : null, endsAt: endsAt ? endsAt.toISOString() : null };
}
export function promotionStatus(banner, now = Date.now()) {
  if (!banner.isActive) return "hidden";
  const start = banner.startsAt ? Date.parse(banner.startsAt) : null;
  const end = banner.endsAt ? Date.parse(banner.endsAt) : null;
  if (start !== null && start > now) return "scheduled";
  if (end !== null && end <= now) return "ended";
  return "live";
}
export function homeBannerCount(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 6 && String(value) === String(n) ? n : null;
}

/** Admin-facing rotation settings, validated independently of display count. */
export function homeRotationSeconds(value) {
  const n=Number(value);
  return Number.isInteger(n) && n>=3 && n<=15 && String(value)===String(n) ? n : null;
}
export function homeAutoplaySetting(value) {
  return typeof value === "boolean" ? value : null;
}
