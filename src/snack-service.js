const { Lock } = require("./lock");

const ACTIVE_REQUEST_STATUSES = new Set(["OPEN", "ASSIGNED", "ACCEPTED"]);

class SnackService {
  constructor(store, options = {}) {
    this.store = store;
    this.assignmentTimeoutMs = options.assignmentTimeoutMs ?? 4 * 60 * 60 * 1000;
    this.lock = new Lock();
  }

  reportEmptyBox(snackBoxId, now = new Date()) {
    const box = this.store.data.snackBoxes.find((item) => item.id === snackBoxId);
    if (!box) throw new Error("Snack box not found");

    const existing = this.store.data.refillRequests.find(
      (request) => request.snackBoxId === snackBoxId && ACTIVE_REQUEST_STATUSES.has(request.status)
    );
    if (existing) return existing;

    const request = {
      id: this.store.data.refillRequests.length + 1,
      snackBoxId,
      officeId: box.officeId,
      status: "OPEN",
      createdAt: now.toISOString(),
      assignedEmployeeId: null
    };

    this.store.data.refillRequests.push(request);
    this.assignVolunteer(request.id, now);
    return request;
  }

  chooseVolunteer(officeId, excludedEmployeeIds = []) {
    const activeEmployeeIds = new Set(
      this.store.data.assignments
        .filter((assignment) => assignment.status === "ASSIGNED" || assignment.status === "ACCEPTED")
        .map((assignment) => assignment.employeeId)
    );

    return this.store.data.employees
      .filter((employee) =>
        employee.officeId === officeId &&
        employee.available &&
        !activeEmployeeIds.has(employee.id) &&
        !excludedEmployeeIds.includes(employee.id)
      )
      .sort((a, b) => {
        if (a.completedRefills !== b.completedRefills) {
          return a.completedRefills - b.completedRefills;
        }
        const aLast = a.lastRefillAt ? new Date(a.lastRefillAt).getTime() : 0;
        const bLast = b.lastRefillAt ? new Date(b.lastRefillAt).getTime() : 0;
        if (aLast !== bLast) return aLast - bLast;
        return a.id - b.id;
      })[0] || null;
  }

  assignVolunteer(requestId, now = new Date(), excludedEmployeeIds = []) {
    const request = this.getRequest(requestId);
    const volunteer = this.chooseVolunteer(request.officeId, excludedEmployeeIds);

    if (!volunteer) {
      request.status = "OPEN";
      request.assignedEmployeeId = null;
      return null;
    }

    const assignment = {
      id: this.store.data.assignments.length + 1,
      requestId,
      employeeId: volunteer.id,
      status: "ASSIGNED",
      assignedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.assignmentTimeoutMs).toISOString()
    };

    this.store.data.assignments.push(assignment);
    request.status = "ASSIGNED";
    request.assignedEmployeeId = volunteer.id;
    return assignment;
  }

  async acceptAssignment(assignmentId, employeeId) {
    return this.lock.runExclusive(async () => {
      const assignment = this.store.data.assignments.find((item) => item.id === assignmentId);
      if (!assignment) throw new Error("Assignment not found");
      if (assignment.employeeId !== employeeId) throw new Error("Assignment belongs to another volunteer");
      if (assignment.status !== "ASSIGNED") return false;

      const request = this.getRequest(assignment.requestId);
      if (request.status !== "ASSIGNED") return false;

      assignment.status = "ACCEPTED";
      assignment.acceptedAt = new Date().toISOString();
      request.status = "ACCEPTED";
      return true;
    });
  }

  expireAndReassign(now = new Date()) {
    const expired = this.store.data.assignments.filter(
      (assignment) =>
        assignment.status === "ASSIGNED" &&
        new Date(assignment.expiresAt).getTime() <= now.getTime()
    );

    const results = [];
    for (const oldAssignment of expired) {
      oldAssignment.status = "EXPIRED";
      const request = this.getRequest(oldAssignment.requestId);
      request.status = "OPEN";
      request.assignedEmployeeId = null;

      const replacement = this.assignVolunteer(
        request.id,
        now,
        [oldAssignment.employeeId]
      );
      results.push({ requestId: request.id, previousEmployeeId: oldAssignment.employeeId,
        newEmployeeId: replacement ? replacement.employeeId : null });
    }
    return results;
  }

  recordPurchase(requestId, employeeId, amount, description, now = new Date()) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Purchase amount must be greater than zero");

    const request = this.getRequest(requestId);
    if (request.status !== "ACCEPTED") throw new Error("Request must be accepted before purchase");
    if (request.assignedEmployeeId !== employeeId) throw new Error("Only the assigned volunteer can record this purchase");

    const office = this.getOffice(request.officeId);
    const month = now.toISOString().slice(0, 7);
    const spent = this.store.data.purchases
      .filter((purchase) => purchase.officeId === office.id && purchase.month === month)
      .reduce((sum, purchase) => sum + purchase.amount, 0);

    if (spent + amount > office.monthlyBudget) {
      throw new Error(`Monthly budget exceeded for ${office.name}`);
    }

    const purchase = {
      id: this.store.data.purchases.length + 1,
      requestId,
      employeeId,
      officeId: office.id,
      amount,
      currency: office.currency,
      description,
      month,
      purchasedAt: now.toISOString()
    };

    this.store.data.purchases.push(purchase);
    request.status = "PURCHASED";
    return purchase;
  }

  submitReimbursementClaim(purchaseId, now = new Date()) {
    const purchase = this.store.data.purchases.find((item) => item.id === purchaseId);
    if (!purchase) throw new Error("Purchase not found");

    const existing = this.store.data.claims.find((claim) => claim.purchaseId === purchaseId);
    if (existing) return existing;

    const claim = {
      id: this.store.data.claims.length + 1,
      purchaseId,
      employeeId: purchase.employeeId,
      amount: purchase.amount,
      currency: purchase.currency,
      status: "CLAIM_SUBMITTED",
      submittedAt: now.toISOString()
    };

    this.store.data.claims.push(claim);
    return claim;
  }

  monthlyTotals(month) {
    return this.store.data.offices.map((office) => {
      const total = this.store.data.purchases
        .filter((purchase) => purchase.officeId === office.id && purchase.month === month)
        .reduce((sum, purchase) => sum + purchase.amount, 0);

      return {
        office: office.name,
        month,
        currency: office.currency,
        spent: Number(total.toFixed(2)),
        budget: office.monthlyBudget,
        remaining: Number((office.monthlyBudget - total).toFixed(2))
      };
    });
  }

  getRequest(requestId) {
    const request = this.store.data.refillRequests.find((item) => item.id === requestId);
    if (!request) throw new Error("Refill request not found");
    return request;
  }

  getOffice(officeId) {
    const office = this.store.data.offices.find((item) => item.id === officeId);
    if (!office) throw new Error("Office not found");
    return office;
  }
}

module.exports = { SnackService };
