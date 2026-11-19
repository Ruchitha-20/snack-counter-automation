function createSeedData() {
  return {
    offices: [
      { id: 1, name: "Oslo", currency: "NOK", monthlyBudget: 6000 },
      { id: 2, name: "Bengaluru", currency: "INR", monthlyBudget: 15000 }
    ],
    employees: [
      { id: 101, name: "Erik", officeId: 1, available: true, completedRefills: 1, lastRefillAt: "2026-10-20T09:00:00.000Z" },
      { id: 102, name: "Nora", officeId: 1, available: true, completedRefills: 0, lastRefillAt: null },
      { id: 103, name: "Jonas", officeId: 1, available: true, completedRefills: 2, lastRefillAt: "2026-10-10T09:00:00.000Z" },
      { id: 201, name: "Ananya", officeId: 2, available: true, completedRefills: 1, lastRefillAt: "2026-10-18T09:00:00.000Z" },
      { id: 202, name: "Ravi", officeId: 2, available: true, completedRefills: 0, lastRefillAt: null },
      { id: 203, name: "Meera", officeId: 2, available: true, completedRefills: 2, lastRefillAt: "2026-10-12T09:00:00.000Z" }
    ],
    snackBoxes: [
      { id: 1, officeId: 1, name: "Kitchen snack box" },
      { id: 2, officeId: 2, name: "Main pantry snack box" }
    ],
    refillRequests: [],
    assignments: [],
    purchases: [],
    claims: []
  };
}

module.exports = { createSeedData };
