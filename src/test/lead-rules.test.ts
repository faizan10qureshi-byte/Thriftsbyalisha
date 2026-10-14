import { describe, expect, it } from "vitest";
import { isLeadStale } from "@/lib/format";

const now = Date.parse("2026-10-14T12:00:00Z");
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

describe("lead no-reply flag", () => {
  it("flags open leads with no reply after 24h", () => {
    expect(isLeadStale({ status: "New", first_contact_at: hoursAgo(25), last_reply_at: null }, now)).toBe(true);
  });
  it("does not flag recent leads", () => {
    expect(isLeadStale({ status: "Contacted", first_contact_at: hoursAgo(50), last_reply_at: hoursAgo(2) }, now)).toBe(false);
  });
  it("never flags closed leads", () => {
    expect(isLeadStale({ status: "Lost", first_contact_at: hoursAgo(200), last_reply_at: null }, now)).toBe(false);
  });
});
