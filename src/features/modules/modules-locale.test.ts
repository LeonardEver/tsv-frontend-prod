import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { modulesListFixture } from "@/test/msw/handlers";
import { changeLocale } from "@/i18n";
import { fetchAllModules } from "./modules.api";

afterEach(async () => { await changeLocale("en"); });

describe("module inventory language isolation", () => {
  it("keeps every page in the starting language when the user switches mid-request", async () => {
    await changeLocale("en");
    const requested: Array<string | null> = [];
    server.use(http.get("*/api/v1/modules", async ({ request }) => {
      requested.push(request.headers.get("Accept-Language"));
      const firstPage = !new URL(request.url).searchParams.has("cursor");
      if (firstPage) await changeLocale("pt-BR");
      return HttpResponse.json({
        modules: [modulesListFixture.modules[firstPage ? 0 : 1]],
        pagination: { next_cursor: firstPage ? "next-page" : null, has_more: firstPage, page_size: 1 },
      });
    }));
    const result = await fetchAllModules();
    expect(requested).toEqual(["en", "en"]);
    expect(result.modules).toEqual(modulesListFixture.modules.slice(0, 2));
  });
});
