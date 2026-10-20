export const orderStages = Object.freeze(["placed", "confirmed", "processing", "shipped", "delivered"]);
export const orderStageNames = Object.freeze({
  placed: "Placed", confirmed: "Confirmed", processing: "Preparing",
  shipped: "Dispatched", delivered: "Delivered", cancelled: "Cancelled",
  cod_collected: "Cash received"
});
export function getOrderStageProgress(status) {
  const step = orderStages.indexOf(status);
  return { cancelled: status === "cancelled", current: step, completed: step >= 0 ? orderStages.slice(0, step + 1) : [] };
}
