const test = require("node:test");
const assert = require("node:assert/strict");
const { Store } = require("../src/store");
const { SnackService } = require("../src/snack-service");

function setup(options = {}) {
  const store = new Store();
  const service = new SnackService(store, options);
  return { store, service };
}

test("selects the volunteer with the fewest completed refills", () => {
  const { service } = setup();
  const request = service.reportEmptyBox(1, new Date("2026-11-19T09:00:00.000Z"));
  assert.equal(request.assignedEmployeeId, 102);
});

test("only one concurrent acceptance succeeds", async () => {
  const { store, service } = setup();
  const request = service.reportEmptyBox(1);
  const assignment = store.data.assignments[0];

  const results = await Promise.all([
    service.acceptAssignment(assignment.id, assignment.employeeId),
    service.acceptAssignment(assignment.id, assignment.employeeId)
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(request.status, "ACCEPTED");
});

test("expires an unaccepted assignment and assigns another volunteer", () => {
  const { store, service } = setup({ assignmentTimeoutMs: 1000 });
  const start = new Date("2026-11-19T09:00:00.000Z");
  const request = service.reportEmptyBox(1, start);
  const firstEmployeeId = request.assignedEmployeeId;

  const result = service.expireAndReassign(new Date(start.getTime() + 1500));
  assert.equal(result.length, 1);
  assert.notEqual(result[0].newEmployeeId, firstEmployeeId);
  assert.equal(request.status, "ASSIGNED");
});

test("does not create duplicate active requests for the same box", () => {
  const { store, service } = setup();
  const first = service.reportEmptyBox(1);
  const second = service.reportEmptyBox(1);

  assert.equal(first.id, second.id);
  assert.equal(store.data.refillRequests.length, 1);
});

test("rejects a purchase that exceeds the office monthly budget", async () => {
  const { store, service } = setup();
  const request = service.reportEmptyBox(1);
  const assignment = store.data.assignments[0];
  await service.acceptAssignment(assignment.id, assignment.employeeId);

  assert.throws(
    () => service.recordPurchase(request.id, assignment.employeeId, 7000, "Over budget"),
    /Monthly budget exceeded/
  );
});

test("records a purchase and submits a simulated reimbursement claim", async () => {
  const { store, service } = setup();
  const now = new Date("2026-11-19T09:00:00.000Z");
  const request = service.reportEmptyBox(1, now);
  const assignment = store.data.assignments[0];
  await service.acceptAssignment(assignment.id, assignment.employeeId);

  const purchase = service.recordPurchase(request.id, assignment.employeeId, 450, "Snacks", now);
  const claim = service.submitReimbursementClaim(purchase.id, now);

  assert.equal(request.status, "PURCHASED");
  assert.equal(claim.status, "CLAIM_SUBMITTED");
  assert.equal(claim.amount, 450);
  assert.equal(claim.currency, "NOK");
});

test("keeps monthly totals separate by office currency", () => {
  const { service } = setup();
  const totals = service.monthlyTotals("2026-11");

  assert.deepEqual(totals.map((item) => item.currency), ["NOK", "INR"]);
  assert.equal(totals[0].spent, 0);
  assert.equal(totals[1].spent, 0);
});
