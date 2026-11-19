const { Store } = require("../src/store");
const { SnackService } = require("../src/snack-service");

async function main() {
  const store = new Store();
  const service = new SnackService(store);

  // Fixed date makes the demo output predictable.
  const now = new Date("2026-11-19T09:00:00.000Z");

  const request = service.reportEmptyBox(1, now);
  const assignment = store.data.assignments.find((item) => item.requestId === request.id);

  console.log(`Refill request #${request.id} created for Oslo.`);
  if (!assignment) {
    console.log("No eligible volunteer is currently available.");
    return;
  }

  const volunteer = store.data.employees.find((item) => item.id === assignment.employeeId);
  console.log(`Assigned to ${volunteer.name}.`);

  const accepted = await service.acceptAssignment(assignment.id, volunteer.id);
  console.log(`Assignment accepted: ${accepted}`);

  const purchase = service.recordPurchase(
    request.id,
    volunteer.id,
    450,
    "Snacks for kitchen box",
    now
  );
  const claim = service.submitReimbursementClaim(purchase.id, now);

  console.log(`Purchase recorded: ${purchase.amount} ${purchase.currency}`);
  console.log(`Reimbursement status: ${claim.status}`);
  console.log("\nMonthly totals:");
  console.table(service.monthlyTotals("2026-11"));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
