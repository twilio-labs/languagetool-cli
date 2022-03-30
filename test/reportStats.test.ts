import { ReportStats } from "../lib/types";

describe("ReportStats", () => {
  test("incrementing a counter", () => {
    const stats = new ReportStats();
    expect(stats.getCounter("foo")).toEqual(0);
    stats.incrementCounter("foo");
    expect(stats.getCounter("foo")).toEqual(1);
  });

  test("calculating total of all counters", () => {
    const stats = new ReportStats();
    const expectedTotal = 50;
    for (let i = 0; i < expectedTotal / 2; i++) {
      stats.incrementCounter("foo");
      stats.incrementCounter("bar");
    }
    expect(stats.sumAllCounters()).toEqual(expectedTotal);
  });
});
