<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElAlert, ElButton, ElForm, ElFormItem, ElInput } from "element-plus";
import { useAuthStore } from "../stores/auth";
import { errorMessage } from "../api/client";

const auth = useAuthStore();
const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
async function submit() {
  error.value = "";
  if (!username.value.trim() || !password.value) {
    error.value = "请输入用户名和密码";
    return;
  }
  loading.value = true;
  try {
    await auth.login(username.value.trim(), password.value);
    password.value = "";
    await router.replace("/courses");
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <section class="login-story">
      <a class="brand" href="/"
        ><span class="brand-mark">t.</span
        ><span>training<small>培训管理系统</small></span></a
      >
      <div class="login-message">
        <p class="eyebrow">LEARN. GROW. TOGETHER.</p>
        <h1>让每一次学习，<br />井然有序。</h1>
        <p>课程、学员与团队，在同一个工作空间有序协作。</p>
        <div class="login-visual" aria-hidden="true">
          <div><span>01</span>课程管理</div>
          <div><span>02</span>学员档案</div>
          <div><span>03</span>团队协作</div>
        </div>
      </div>
      <small>TRAINING MANAGEMENT</small>
    </section>
    <section class="login-form-panel">
      <div class="login-form">
        <p class="eyebrow">WELCOME BACK</p>
        <h2>登录工作空间</h2>
        <p class="muted">使用管理员为你分配的账号登录。</p>
        <ElAlert
          v-if="error"
          :title="error"
          type="error"
          :closable="false"
          show-icon
          class="form-alert"
        /><ElForm label-position="top" @submit.prevent="submit"
          ><ElFormItem label="用户名"
            ><ElInput
              v-model="username"
              aria-label="用户名"
              autocomplete="username"
              placeholder="请输入用户名"
              :maxlength="100"
              size="large" /></ElFormItem
          ><ElFormItem label="密码"
            ><ElInput
              v-model="password"
              aria-label="密码"
              type="password"
              show-password
              autocomplete="current-password"
              placeholder="请输入密码"
              :maxlength="256"
              size="large" /></ElFormItem
          ><ElButton
            native-type="submit"
            type="primary"
            size="large"
            :loading="loading"
            class="login-submit"
            >登录</ElButton
          ></ElForm
        >
        <p class="login-help">没有账号或忘记密码？请联系管理员。</p>
      </div>
      <p class="login-footer">training · 培训管理系统</p>
    </section>
  </main>
</template>
