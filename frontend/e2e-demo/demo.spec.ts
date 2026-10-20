import { test, expect, type Page } from "@playwright/test";

async function enter(page: Page, role = "管理员") {
  await page.goto("./");
  await page.getByRole("button", { name: `以${role}体验`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "课程管理", exact: true })).toBeVisible();
}
async function search(page: Page, label: string, q: string) {
  await page.getByRole("textbox", { name: label }).fill(q);
  await page.getByRole("button", { name: "搜索", exact: true }).click();
}
async function course(page: Page, code: string, name: string) {
  await page.getByRole("button", { name: "＋ 新增课程", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新增课程", exact: true });
  await dialog.getByRole("textbox", { name: "课程编号", exact: true }).fill(code);
  await dialog.getByRole("textbox", { name: "课程名称", exact: true }).fill(name);
  await dialog.getByRole("textbox", { name: "讲师", exact: true }).fill("演示讲师");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
}

test("管理员课程增改查删、唯一性、刷新和重置", async ({ page }) => {
  await enter(page);
  await course(page, "DEMO-101", "新建演示课程");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await search(page, "搜索课程编号或名称", "DEMO-101");
  const row = page.getByRole("row").filter({ hasText: "DEMO-101" });
  await expect(row).toContainText("新建演示课程");
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "课程名称", exact: true }).fill("课程修改成功");
  await page.getByRole("dialog").getByRole("button", { name: "保存", exact: true }).click();
  await expect(row).toContainText("课程修改成功");
  await row.getByRole("button", { name: "详情", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "课程详情", exact: true })).toContainText("课程修改成功");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await course(page, "DEMO-101", "重复编号");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("已存在");
  await page.getByRole("dialog").getByRole("button", { name: "取消", exact: true }).click();
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "重置演示数据", exact: true }).click();
  await page.getByRole("button", { name: "确认重置", exact: true }).click();
  await expect(page.getByRole("button", { name: "以管理员体验", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "以管理员体验", exact: true }).click();
  await expect(page.getByText("12 条记录", { exact: false })).toBeVisible();
});

test("学员与用户可操作，最后管理员受保护且不收集密码", async ({ page }) => {
  await enter(page);
  await page.getByRole("link", { name: /学员管理/ }).click();
  await page.getByRole("button", { name: "＋ 新增学员", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "学号", exact: true }).fill("S-TEST");
  await dialog.getByRole("textbox", { name: "姓名", exact: true }).fill("模拟学员");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "S-TEST" })).toContainText("模拟学员");
  await page.getByRole("link", { name: /用户管理/ }).click();
  await expect(page.getByRole("button", { name: "重置密码", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "＋ 新增用户", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "初始密码", exact: true })).toHaveCount(0);
  await dialog.getByRole("textbox", { name: "用户名", exact: true }).fill("演示HR");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "演示HR" })).toBeVisible();
  const admin = page.getByRole("row").filter({ hasText: "demo_admin" });
  await expect(admin.getByRole("button", { name: "删除", exact: true })).toBeDisabled();
  await admin.getByRole("button", { name: "编辑", exact: true }).click();
  await dialog.getByRole("combobox", { name: "角色", exact: true }).press("Enter");
  await page.getByRole("option", { name: "普通用户", exact: true }).click();
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("最后一个管理员");
});

test("普通用户只读、受限路由、退出与深链接刷新", async ({ page }) => {
  await page.goto("./#/students");
  await expect(page.getByRole("button", { name: "以普通用户体验", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "以普通用户体验", exact: true }).click();
  await expect(page.getByText("只读访问", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /新增|编辑|删除/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /用户管理/ })).toHaveCount(0);
  await page.goto("./#/users");
  await expect(page).toHaveURL(/#\/courses$/);
  await page.getByRole("link", { name: /学员管理/ }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "学员管理", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "以管理员体验", exact: true })).toBeVisible();
});

test("子路径资源、分页、手机布局及无后台请求", async ({ page }) => {
  const calls: string[] = [];
  const errors: string[] = [];
  page.on("request", req => { if (new URL(req.url()).pathname.startsWith("/api")) calls.push(req.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await enter(page);
  await expect(page.getByRole("row").filter({ hasText: "C001" })).toBeVisible();
  await page.locator(".btn-next").click();
  await expect(page.getByRole("row").filter({ hasText: "C011" })).toBeVisible();
  await page.screenshot({ path: "test-results/demo-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/demo-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});
