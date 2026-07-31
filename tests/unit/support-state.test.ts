import { canTransitionTicket } from "@/modules/communications/services/support.service";

describe("support ticket state machine", () => {
  it("allows normal support workflow transitions", () => {
    expect(canTransitionTicket("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionTicket("IN_PROGRESS", "WAITING_FOR_USER")).toBe(true);
    expect(canTransitionTicket("WAITING_FOR_USER", "RESOLVED")).toBe(true);
  });

  it("rejects invalid ticket status transitions", () => {
    expect(canTransitionTicket("OPEN", "OPEN")).toBe(false);
    expect(canTransitionTicket("CLOSED", "RESOLVED")).toBe(false);
    expect(canTransitionTicket("RESOLVED", "OPEN")).toBe(true);
  });
});
