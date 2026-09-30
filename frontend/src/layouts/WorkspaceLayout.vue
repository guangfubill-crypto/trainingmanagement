<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElMessage } from "element-plus";
import { useAuthStore } from "../stores/auth";
import { errorMessage } from "../api/client";
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const leaving = ref(false);
const title = computed(
  () =>
    ({ courses: "课程管理", students: "学员管理", users: "用户管理" })[
      route.name as "courses" | "students" | "users"
    ] || "培训管理",
);
async function logout() {
  leaving.value = true;
  try {
    await auth.logout();
    await router.replace("/login");
  } catch (e) {
    ElMessage.error(errorMessage(e));
  } finally {
    leaving.value = false;
  }
}
</script>
<template>
  <div class="workspace">
    <aside class="sidebar">
      <RouterLink class="brand" to="/courses"
        ><span class="brand-mark">t.</span
        ><span>training<small>培训管理系统</small></span></RouterLink
      >
      <div class="nav-label">工作空间</div>
      <nav class="app-nav" aria-label="主导航">
        <RouterLink to="/courses"
          ><span aria-hidden="true">01</span>课程管理</RouterLink
        ><RouterLink to="/students"
          ><span aria-hidden="true">02</span>学员管理</RouterLink
        ><RouterLink v-if="auth.isAdmin" to="/users"
          ><span aria-hidden="true">03</span>用户管理</RouterLink
        >
      </nav>
      <div class="account-card">
        <span class="avatar">{{
          auth.user?.username.slice(0, 1).toUpperCase()
        }}</span>
        <div>
          <strong>{{ auth.user?.username }}</strong
          ><small>{{ auth.isAdmin ? "管理员" : "普通用户 · 只读访问" }}</small>
        </div>
      </div>
      <div class="sidebar-footer">
        TRAINING MANAGEMENT<span>让每一次学习井然有序</span>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <span
          >工作空间 <span class="breadcrumb">/ {{ title }}</span></span
        ><ElButton text :loading="leaving" @click="logout">退出登录</ElButton>
      </header>
      <main class="business-main"><RouterView :key="route.path" /></main>
    </div>
  </div>
</template>
