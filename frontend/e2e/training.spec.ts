import { test, expect, type Page } from "@playwright/test";

const origin = { Origin: "http://127.0.0.1:5174" };
async function login(
  page: Page,
  username = "admin",
  password = "Admin-test-123",
) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "用户名", exact: true })
    .fill(username);
  await page.getByRole("textbox", { name: "密码", exact: true }).fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/courses$/);
}
async function search(page: Page, label: string, value: string) {
  await page.getByRole("textbox", { name: label }).fill(value);
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "正在加载" }),
  ).toHaveCount(0);
}
test("登录错误、刷新恢复、退出及未登录路由", async ({ page }) => {
  await page.goto("/courses");
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({ path: "test-results/desktop-login.png", fullPage: true });
  await page
    .getByRole("textbox", { name: "用户名", exact: true })
    .fill("admin");
  await page.getByRole("textbox", { name: "密码", exact: true }).fill("wrong");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("用户名或密码错误");
  await login(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "课程管理", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login$/);
});

test("管理员课程完整流程、校验和删除取消", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "＋ 新增课程", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新增课程", exact: true });
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog.getByText("请填写课程编号")).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "课程编号", exact: true })
    .fill("UI-COURSE");
  await dialog
    .getByRole("textbox", { name: "课程名称", exact: true })
    .fill("浏览器课程");
  await dialog
    .getByRole("textbox", { name: "讲师", exact: true })
    .fill("王老师");
  await dialog
    .getByRole("spinbutton", { name: "课时", exact: true })
    .fill("12");
  await dialog
    .getByRole("textbox", { name: "课程描述", exact: true })
    .fill("实践课程");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await search(page, "搜索课程编号或名称", "UI-COURSE");
  let row = page.getByRole("row").filter({ hasText: "UI-COURSE" });
  await row.getByRole("button", { name: "详情", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "课程详情" })).toContainText(
    "实践课程",
  );
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "课程名称", exact: true })
    .fill("课程已更新");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(row).toContainText("课程已更新");
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByText("没有匹配的记录，试试其他关键词")).toBeVisible();
});

test("管理员学员完整流程和服务端唯一性提示", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /学员管理/ }).click();
  await page.getByRole("button", { name: "＋ 新增学员", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "学号", exact: true })
    .fill("UI-STUDENT");
  await dialog
    .getByRole("textbox", { name: "姓名", exact: true })
    .fill("张同学");
  await dialog
    .getByRole("textbox", { name: "联系电话", exact: true })
    .fill("13800000000");
  await dialog
    .getByRole("textbox", { name: "备注", exact: true })
    .fill("浏览器验收");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "＋ 新增学员", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "学号", exact: true })
    .fill("UI-STUDENT");
  await dialog.getByRole("textbox", { name: "姓名", exact: true }).fill("重复");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("已存在");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "UI-STUDENT" });
  await row.getByRole("button", { name: "详情", exact: true }).click();
  await expect(dialog).toContainText("浏览器验收");
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "姓名", exact: true })
    .fill("李同学");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(row).toContainText("李同学");
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect(row).toHaveCount(0);
});

test("管理员用户创建、编辑、重置密码和删除", async ({ page, browser }) => {
  await login(page);
  await page.getByRole("link", { name: /用户管理/ }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "admin" })
      .getByRole("button", { name: "删除", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "＋ 新增用户", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "用户名", exact: true })
    .fill("ui-user");
  await dialog
    .getByRole("textbox", { name: "初始密码", exact: true })
    .fill("UI-user-123");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  let row = page.getByRole("row").filter({ hasText: "ui-user" });
  await row.getByRole("button", { name: "详情", exact: true }).click();
  await expect(dialog).toContainText("普通用户");
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "用户名", exact: true })
    .fill("ui-renamed");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  row = page.getByRole("row").filter({ hasText: "ui-renamed" });
  await expect(row).toBeVisible();
  const otherContext = await browser.newContext({
    baseURL: "http://127.0.0.1:5174",
  });
  const other = await otherContext.newPage();
  await login(other, "ui-renamed", "UI-user-123");
  await row.getByRole("button", { name: "重置密码", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "新密码", exact: true })
    .fill("Reset-ui-123");
  await dialog.getByRole("button", { name: "确认重置", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await other.reload();
  await expect(other).toHaveURL(/\/login$/);
  await login(other, "ui-renamed", "Reset-ui-123");
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect(row).toHaveCount(0);
  await other.reload();
  await expect(other).toHaveURL(/\/login$/);
  await otherContext.close();
});

test("搜索分页和普通用户只读、接口越权", async ({ page }) => {
  await login(page);
  for (let index = 0; index < 11; index++) {
    const response = await page.request.post("/api/courses", {
      headers: origin,
      data: {
        code: "PAGE-" + index,
        name: "分页课程" + index,
        instructor: "教师",
        hours: 3,
      },
    });
    expect(response.status()).toBe(201);
  }
  await page.reload();
  await expect(page.locator(".record-count")).toContainText("11");
  await page.screenshot({ path: "test-results/desktop-courses.png", fullPage: true });
  await page.getByRole("listitem", { name: "第 2 页", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "PAGE-10" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出登录" }).click();
  await login(page, "reader", "Reader-test-123");
  await expect(page.getByText("只读访问", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /新增|编辑|删除/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /用户管理/ })).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: "PAGE-0" })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("分页课程0");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.goto("/users");
  await expect(page).toHaveURL(/\/courses$/);
  expect((await page.request.get("/api/users")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/courses", {
        headers: origin,
        data: { code: "HACK", name: "x", instructor: "x", hours: 1 },
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("link", { name: /学员管理/ }).click();
  await expect(
    page.getByRole("button", { name: /新增|编辑|删除/ }),
  ).toHaveCount(0);
});

test("会话失效跳转、网络错误和手机布局", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/mobile-courses.png",
    fullPage: true,
  });
  await page.route("**/api/courses?**", (route) => route.abort());
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("无法连接服务器");
  await page.unroute("**/api/courses?**");
  await page.getByRole("button", { name: "重新加载" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.request.post("/api/auth/logout", { headers: origin });
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/mobile-login.png",
    fullPage: true,
  });
});
