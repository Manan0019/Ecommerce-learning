export const orderStages = Object.freeze(["placed", "confirmed", "processing", "shipped", "delivered"]);
export const orderStageNames = Object.freeze({
  placed: "Placed", confirmed: "Confirmed", processing: "Preparing",
  shipped: "Dispatched", delivered: "Delivered", cancelled: "Cancelled",
  cod_collected: "Cash received", payment_pending:"Awaiting payment", payment_verified:"Online payment verified", payment_review:"Payment review", payment_expired:"Payment expired"
});
export function getOrderStageProgress(status) {
  const step = orderStages.indexOf(status);
  return { cancelled: status === "cancelled", current: step, completed: step >= 0 ? orderStages.slice(0, step + 1) : [] };
}
