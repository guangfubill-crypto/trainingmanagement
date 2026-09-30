<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElAlert, ElButton, ElForm, ElFormItem, ElInput } from 'element-plus'
import { api, errorMessage } from '../api/client'
const username = ref('admin'), password = ref(''), confirmation = ref(''), error = ref('')
const saving = ref(false)
const router = useRouter()
async function submit() {
  if (saving.value) return
  error.value = ''
  if (!username.value.trim() || password.value.length < 8) { error.value = '请输入用户名和至少 8 位密码'; return }
  if (password.value !== confirmation.value) { error.value = '两次密码不一致'; return }
  saving.value = true
  try { await api.post('/setup', { username: username.value.trim(), password: password.value }); password.value = ''; confirmation.value = ''; await router.replace('/login') }
  catch(e) { error.value = errorMessage(e) }
  finally { saving.value = false }
}
</script>
<template><main class="login-page" style="display:flex;justify-content:center"><section class="login-form-panel" style="width:480px;max-width:100%"><div class="login-form"><p class="eyebrow">TRAINING · 本地桌面版</p><h2>设置你的工作空间</h2><p class="muted">首次使用，请创建管理员账号。数据保存在这台电脑上。</p><ElAlert v-if="error" :title="error" type="error" :closable="false" class="form-alert" /><ElForm label-position="top" @submit.prevent="submit"><ElFormItem label="管理员用户名"><ElInput v-model="username" aria-label="管理员用户名" :maxlength="100" autocomplete="username" /></ElFormItem><ElFormItem label="管理员密码"><ElInput v-model="password" aria-label="管理员密码" type="password" show-password :maxlength="256" autocomplete="new-password" /></ElFormItem><ElFormItem label="确认密码"><ElInput v-model="confirmation" aria-label="确认密码" type="password" :maxlength="256" autocomplete="new-password" /></ElFormItem><ElButton type="primary" native-type="submit" :loading="saving" class="login-submit">创建管理员</ElButton></ElForm></div></section></main></template>
