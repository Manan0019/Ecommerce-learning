/** datetime-local UI uses the admin's local time; API saves UTC instants. */
export function toLocalDateTime(iso) {
  if (!iso) return "";
  const d=new Date(iso);
  if(!Number.isFinite(d.getTime()))return "";
  const two=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}
export function toUtcDateTime(local) {
  if(!local)return null;
  const d=new Date(local);
  return Number.isFinite(d.getTime())?d.toISOString():null;
}
export function bannerStatus(item, now=Date.now()) {
  if(!item.isActive)return "Hidden";
  if(item.startsAt && new Date(item.startsAt).getTime()>now)return "Scheduled";
  if(item.endsAt && new Date(item.endsAt).getTime()<=now)return "Ended";
  return "Live";
}
