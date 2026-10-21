/** Presentation-only helpers. Backend enforces eligibility and assignment ownership. */
export const isOpenDelivery = assignment =>
  ['assigned', 'out_for_delivery'].includes(assignment?.deliveryStatus) &&
  !['delivered', 'cancelled'].includes(assignment?.orderStatus);

export function deliveryTeamWithWorkload(staff = [], assignments = []) {
  const openCounts = new Map();
  for (const assignment of assignments) {
    if (!isOpenDelivery(assignment)) continue;
    const id = String(assignment.executiveId);
    openCounts.set(id, (openCounts.get(id) || 0) + 1);
  }
  return staff.map(person => ({
    ...person,
    openDeliveries: openCounts.get(String(person.id)) || 0
  })).sort((a, b) => {
    if (Boolean(a.isActive) !== Boolean(b.isActive)) return a.isActive ? -1 : 1;
    return String(a.fullName || '').localeCompare(String(b.fullName || ''));
  });
}

export function filterDeliveryTeam(team, search = '') {
  const term = String(search).trim().toLocaleLowerCase();
  if (!term) return team;
  return team.filter(person => [person.fullName, person.email, person.mobile]
    .some(value => String(value || '').toLocaleLowerCase().includes(term)));
}
