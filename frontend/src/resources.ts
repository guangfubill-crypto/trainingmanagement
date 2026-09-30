import type { Resource } from "./types";
export interface Field {
  key: string;
  label: string;
  type?: "number" | "textarea" | "role" | "password";
  required?: boolean;
  max?: number;
  min?: number;
  createOnly?: boolean;
}
export interface ResourceConfig {
  title: string;
  singular: string;
  intro: string;
  search: string;
  fields: Field[];
}
export const resources: Record<Resource, ResourceConfig> = {
  courses: {
    title: "课程管理",
    singular: "课程",
    intro: "集中维护课程资料，让培训安排清晰有序。",
    search: "搜索课程编号或名称",
    fields: [
      { key: "code", label: "课程编号", required: true, max: 32 },
      { key: "name", label: "课程名称", required: true, max: 100 },
      { key: "instructor", label: "讲师", required: true, max: 100 },
      { key: "hours", label: "课时", type: "number", required: true },
      { key: "description", label: "课程描述", type: "textarea", max: 2000 },
    ],
  },
  students: {
    title: "学员管理",
    singular: "学员",
    intro: "统一管理学员档案，让每一份信息准确可查。",
    search: "搜索学号或姓名",
    fields: [
      { key: "student_no", label: "学号", required: true, max: 32 },
      { key: "name", label: "姓名", required: true, max: 100 },
      { key: "phone", label: "联系电话", max: 32 },
      { key: "notes", label: "备注", type: "textarea", max: 2000 },
    ],
  },
  users: {
    title: "用户管理",
    singular: "用户",
    intro: "管理团队账号与角色，为协作设置清晰的权限。",
    search: "搜索用户名",
    fields: [
      { key: "username", label: "用户名", required: true, max: 100 },
      { key: "role", label: "角色", type: "role", required: true },
      {
        key: "password",
        label: "初始密码",
        type: "password",
        required: true,
        min: 8,
        max: 256,
        createOnly: true,
      },
    ],
  },
};
