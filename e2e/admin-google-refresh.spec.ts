import { expect, test, type Page, type Route } from "@playwright/test";
import { installMockApi } from "./mock-api";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const connectionId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const endpoint = `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/refresh`;
const connection = {
  id: connectionId,
  workspaceId,
  provider: "GOOGLE_ADS",
  status: "CONNECTED",
};

async function reply(route: Route, json: unknown, status = 200) {
  await route.fulfill({
    status,
    json,
    headers: {
      "access-control-allow-origin":
        route.request().headers().origin ?? "http://localhost:3000",
      "access-control-allow-credentials": "true",
      "access-control-expose-headers": "x-request-id",
      "x-request-id": requestId,
    },
  });
}

async function diagnostics(page: Page, role = "OWNER") {
  await installMockApi(page);
  await page.route("**/api/v1/admin/session", (route) => reply(route, { authenticated: true }));
  await page.route("**/api/v1/admin/diagnostics", (route) => {
    const row = {
      ...connection,
      workspace: { id: workspaceId, name: "Own workspace" },
      _count: { accounts: 2 },
    };
    return reply(route, {
      connections: [
        row,
        {
          ...row,
          id: "other-connection",
          workspace: { id: "foreign", name: "Other workspace" },
        },
        { ...row, id: "another-provider", provider: "META_ADS" },
        { ...row, id: "disconnected", status: "DISCONNECTED" },
      ],
    });
  });
  await page.route("**/api/v1/workspaces", (route) =>
    reply(route, [{ id: workspaceId, role, accessStatus: "ACTIVE" }]),
  );
  await page.goto("/admin");
  await page.getByRole("button", { name: "Диагностика" }).click();
  await expect(page.getByText("Other workspace")).toBeVisible();
}

test("refreshes only the chosen Google connection once with workspace CSRF", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.startsWith("/api/v1/"))
      posts.push(path);
  });
  await diagnostics(page);
  const button = page.getByRole("button", { name: "Обновить OAuth-токен" });
  await expect(button).toHaveCount(1);
  await expect(page.getByRole("row").filter({ has: button })).toContainText(connectionId);
  expect(posts).toEqual([]);
  await page.route("**" + endpoint, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    expect(route.request().headers()["x-csrf-token"]).toBe("mock-csrf");
    return reply(route, connection);
  });
  await button.evaluate((element: HTMLButtonElement) => {
    element.click();
    element.click();
  });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Токен доступа Google Ads действителен" }),
  ).toContainText(requestId);
  await expect(button).toBeDisabled();
  expect(posts).toEqual([endpoint]);
});

test("a platform admin without workspace management cannot start a refresh", async ({
  page,
}) => {
  await diagnostics(page, "MEMBER");
  await expect(
    page.getByRole("button", { name: "Обновить OAuth-токен" }),
  ).toHaveCount(0);
});

for (const failure of [
  "csrf",
  "forbidden",
  "wrong-connection",
  "network",
] as const) {
  test(`stops after ${failure} without a repeat or a success message`, async ({
    page,
  }) => {
    await diagnostics(page);
    let posts = 0;
    if (failure === "csrf")
      await page.route("**/api/v1/auth/csrf", (route) => reply(route, {}, 403));
    await page.route("**" + endpoint, async (route) => {
      if (route.request().method() === "OPTIONS") return route.fallback();
      posts++;
      if (failure === "network") return route.abort("failed");
      if (failure === "forbidden") return reply(route, {}, 403);
      return reply(route, { ...connection, id: "different" });
    });
    const button = page.getByRole("button", { name: "Обновить OAuth-токен" });
    await button.click();
    await expect(
      page
        .getByRole("alert")
        .filter({
          hasText:
            failure === "forbidden"
              ? "Нужна авторизованная"
              : "Результат не подтверждён",
        }),
    ).toBeVisible();
    await expect(button).toBeDisabled();
    await expect(
      page.getByText("Токен доступа Google Ads действителен.", { exact: true }),
    ).toHaveCount(0);
    expect(posts).toBe(failure === "csrf" ? 0 : 1);
  });
}
