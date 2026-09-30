export interface User {
  id: number;
  username: string;
  role: "admin" | "user";
  created_at: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export type Resource = "courses" | "students" | "users";
export interface DataRow {
  id: number;
  created_at: string;
  [key: string]: string | number;
}
