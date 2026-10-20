import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { resources } from "../resources";
import type { DataRow, Resource } from "../types";

const dataKey = `training-demo-v1:${import.meta.env.BASE_URL}`;
const sessionKey = `${dataKey}:actor`;
interface DemoState {
  version: 1;
  courses: DataRow[];
  students: DataRow[];
  users: DataRow[];
}
const created_at = "2026-10-01T08:00:00";
function seed(): DemoState {
  const names = ["新员工入职培训", "AI办公实战", "面试官基础训练", "沟通与反馈", "Excel数据整理", "项目协作基础", "管理者入门", "时间管理", "客户服务技巧", "企业文化介绍", "演示文稿表达", "信息安全基础"];
  return {
    version: 1,
    courses: names.map((name, i) => ({ id: i + 1, code: `C${String(i + 1).padStart(3, "0")}`, name, instructor: ["陈老师", "林老师", "王老师"][i % 3], hours: i % 3 + 2, description: "虚构培训课程，用于体验课程管理流程。", created_at })),
    students: ["林晓", "陈晨", "王宁", "赵悦", "周岚", "李明"].map((name, i) => ({ id: i + 1, student_no: `S${String(i + 1).padStart(3, "0")}`, name, phone: "", notes: "虚构学员，仅用于演示", created_at })),
    users: [
      { id: 1, username: "demo_admin", role: "admin", created_at },
      { id: 2, username: "demo_viewer", role: "user", created_at },
    ],
  };
}
function load(): DemoState {
  const raw = localStorage.getItem(dataKey);
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (value.version === 1 && ["courses", "students", "users"].every(key => Array.isArray(value[key]) && value[key].every((row: DataRow) => Number.isInteger(row.id) && typeof row.created_at === "string"))) return value;
    } catch { /* Invalid local demo data is replaced by the fictional seed. */ }
  }
  const initial = seed();
  localStorage.setItem(dataKey, JSON.stringify(initial));
  return initial;
}

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const response = (data: unknown, status = 200) => ({ data, status, statusText: String(status), headers: new AxiosHeaders(), config });
  const fail = (status: number, detail: string): never => {
    throw new AxiosError(detail, status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST", config, undefined, response({ detail }, status));
  };
  try {
    const state = load();
    const path = (config.url || "").split("?")[0].replace(/\/$/, "");
    const method = (config.method || "get").toLowerCase();
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data || {};
    const persist = () => localStorage.setItem(dataKey, JSON.stringify(state));
    if (path === "/runtime" && method === "get") return response({ mode: "demo", setup_required: false });
    if (path === "/auth/demo" && method === "post") {
      if (!["admin", "user"].includes(body.role)) fail(422, "请选择有效体验角色");
      const actor = state.users.find(user => user.role === body.role);
      if (!actor) fail(409, "此角色的演示用户已被删除，请重置演示数据");
      sessionStorage.setItem(sessionKey, String(actor!.id));
      return response(actor);
    }
    if (path === "/auth/logout" && method === "post") {
      sessionStorage.removeItem(sessionKey);
      return response(null, 204);
    }
    // Reset is available on the role picker too, so a modified account cannot lock out the demo.
    if (path === "/demo/reset" && method === "post") {
      localStorage.setItem(dataKey, JSON.stringify(seed()));
      sessionStorage.removeItem(sessionKey);
      return response(null, 204);
    }
    const actor = state.users.find(user => String(user.id) === sessionStorage.getItem(sessionKey));
    if (!actor) fail(401, "请先选择体验角色");
    if (path === "/auth/me" && method === "get") return response(actor);
    const match = path.match(/^\/(courses|students|users)(?:\/(\d+))?$/);
    if (!match) fail(404, "演示功能不存在");
    const resource = match![1] as Resource;
    const id = match![2] ? Number(match![2]) : null;
    if ((resource === "users" || method !== "get") && actor!.role !== "admin") fail(403, "当前角色只有查看权限");
    const list = state[resource];
    if (method === "get" && id === null) {
      const q = String(config.params?.q || "").trim().toLowerCase();
      const page = Math.max(1, Number(config.params?.page) || 1);
      const page_size = Math.min(100, Math.max(1, Number(config.params?.page_size) || 10));
      const keys = resource === "courses" ? ["code", "name"] : resource === "students" ? ["student_no", "name"] : ["username"];
      const filtered = list.filter(row => keys.some(key => String(row[key]).toLowerCase().includes(q)));
      return response({ items: filtered.slice((page - 1) * page_size, page * page_size), total: filtered.length, page, page_size });
    }
    const existing = id === null ? undefined : list.find(row => row.id === id);
    if (id !== null && !existing) fail(404, "记录不存在");
    if (method === "get") return response(existing);
    const protectAdmin = () => {
      if (existing?.role === "admin" && state.users.filter(user => user.role === "admin").length <= 1) fail(409, "不能删除或降级最后一个管理员");
    };
    if (method === "delete" && existing) {
      if (resource === "users") {
        if (existing.id === actor!.id) fail(409, "不能删除当前登录账号");
        protectAdmin();
      }
      list.splice(list.indexOf(existing), 1);
      persist();
      return response(null, 204);
    }
    if ((method === "post" && id === null) || (method === "patch" && existing)) {
      const fields = resources[resource].fields.filter(field => field.type !== "password");
      const next: DataRow = existing ? { ...existing } : { id: Math.max(0, ...list.map(row => row.id)) + 1, created_at: new Date().toISOString().replace(/Z$/, "") };
      for (const field of fields) {
        const raw = body[field.key] ?? next[field.key] ?? (field.type === "number" ? 1 : field.type === "role" ? "user" : "");
        const value = typeof raw === "string" ? raw.trim() : raw;
        if (field.required && (value === "" || value === undefined)) fail(422, "请填写" + field.label);
        if (field.type === "number") {
          if (!Number.isInteger(value) || value < 1 || value > 2147483647) fail(422, "请输入正整数课时");
        } else if (typeof value !== "string" || (field.max && value.length > field.max)) fail(422, field.label + "格式或长度不符合要求");
        if (field.type === "role" && !["admin", "user"].includes(value)) fail(422, "角色不符合要求");
        next[field.key] = value;
      }
      const unique = resource === "courses" ? "code" : resource === "students" ? "student_no" : "username";
      if (list.some(row => row.id !== id && row[unique] === next[unique])) fail(409, "编号或用户名已存在");
      if (resource === "users" && next.role === "user") protectAdmin();
      if (existing) list.splice(list.indexOf(existing), 1, next);
      else list.push(next);
      persist();
      return response(next, existing ? 200 : 201);
    }
    return fail(405, "演示模式不支持此操作");
  } catch (error) {
    if (error instanceof AxiosError) throw error;
    return fail(500, "无法保存演示数据，请允许浏览器存储后重试");
  }
};
