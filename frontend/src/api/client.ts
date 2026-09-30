import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  timeout: 5000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/auth/login", "/auth/me"].includes(error.config?.url)
    ) {
      window.dispatchEvent(new Event("session-expired"));
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "操作失败，请重试";
  if (!error.response) return "无法连接服务器，请检查网络或稍后重试";
  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (error.response.status === 422)
    return "输入不符合要求，请检查必填项、长度和格式";
  return "操作失败，请稍后重试";
}
