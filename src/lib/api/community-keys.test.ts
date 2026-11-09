import { describe, expect, it } from "vitest";
import { queryKeys } from "./keys";

// Regression: the Base Camp preview (useQuery) and the Community feed
// (useInfiniteQuery) must never share a cache entry — a shared entry made the
// infinite observer read `data.pages.length` on a plain `{ posts }` payload
// and crashed /community for every paid user who visited Base Camp first.
describe("community query keys", () => {
  it("keeps the Base Camp preview apart from the infinite feed", () => {
    const feed = queryKeys.community.posts(9, undefined, "latest");
    const preview = queryKeys.community.preview(9);
    expect(JSON.stringify(preview)).not.toBe(JSON.stringify(feed));
  });
});
