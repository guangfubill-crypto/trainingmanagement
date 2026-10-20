<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElButton, ElMessage, ElMessageBox } from "element-plus";
import { api, errorMessage } from "../api/client";
import { useAuthStore } from "../stores/auth";
const router = useRouter();
const auth = useAuthStore();
const resetting = ref(false);
async function reset() {
  try {
    await ElMessageBox.confirm("恢复初始模拟数据？当前浏览器中的演示修改会被清除。", "重置演示数据", { confirmButtonText: "确认重置", cancelButtonText: "取消", type: "warning" });
  } catch { return; }
  resetting.value = true;
  try {
    await api.post("/demo/reset");
    auth.clear();
    await router.replace("/login");
    ElMessage.success("演示数据已恢复，请重新选择体验角色");
  } catch (error) { ElMessage.error(errorMessage(error)); }
  finally { resetting.value = false; }
}
</script>
<template>
  <aside class="demo-notice" aria-label="在线演示说明">
    <div><strong>在线演示 · 模拟数据</strong><p>修改仅保存在当前浏览器。角色仅供体验，不使用真实密码，请勿填写真实个人资料。</p></div>
    <ElButton size="small" :loading="resetting" @click="reset">重置演示数据</ElButton>
  </aside>
</template>
