import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "./router";
import App from "./App.vue";
import "./style.css";
import "element-plus/dist/index.css";
import "./business.css";
import { useAuthStore } from "./stores/auth";

const app = createApp(App);
app.use(createPinia()).use(router);
window.addEventListener("session-expired", () => {
  useAuthStore().clear();
  void router.replace("/login");
});
app.mount("#app");
