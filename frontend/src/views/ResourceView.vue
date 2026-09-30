<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { api, errorMessage } from "../api/client";
import { useAuthStore } from "../stores/auth";
import { resources } from "../resources";
import type { DataRow, Page, Resource } from "../types";

const props = defineProps<{ resource: Resource }>();
const narrowScreen = window.matchMedia("(max-width: 700px)");
const compact = ref(narrowScreen.matches);
function updateCompact(event: MediaQueryListEvent) {
  compact.value = event.matches;
}
onMounted(() => narrowScreen.addEventListener("change", updateCompact));
onUnmounted(() => narrowScreen.removeEventListener("change", updateCompact));
const config = computed(() => resources[props.resource]);
const auth = useAuthStore();
const router = useRouter();
const rows = ref<DataRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const query = ref("");
const activeQuery = ref("");
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);
const editorOpen = ref(false);
const editId = ref<number | null>(null);
const form = reactive<Record<string, any>>({});
const formRef = ref<FormInstance>();
const formError = ref("");
const detail = ref<DataRow | null>(null);
const detailOpen = ref(false);
const passwordOpen = ref(false);
const passwordUser = ref<DataRow | null>(null);
const password = ref("");
const passwordError = ref("");
let requestId = 0;
const visibleFields = computed(() =>
  config.value.fields.filter((f) => !(editId.value !== null && f.createOnly)),
);
const columns = computed(() =>
  config.value.fields.filter((f) => f.type !== "textarea" && !f.createOnly),
);
const rules = computed<FormRules>(() =>
  Object.fromEntries(
    visibleFields.value.map((f) => [
      f.key,
      [
        ...(f.required
          ? [{ required: true, message: "请填写" + f.label, trigger: "blur" }]
          : []),
        ...(f.type === "number"
          ? [
              {
                type: "integer" as const,
                min: 1,
                max: 2147483647,
                message: "请输入正整数课时",
                trigger: "blur",
              },
            ]
          : []),
        ...(f.max
          ? [
              {
                max: f.max,
                message: "最多 " + f.max + " 个字符",
                trigger: "blur",
              },
            ]
          : []),
        ...(f.min
          ? [
              {
                min: f.min,
                message: "至少 " + f.min + " 个字符",
                trigger: "blur",
              },
            ]
          : []),
      ],
    ]),
  ),
);
function display(value: unknown) {
  return value === "" || value === undefined || value === null
    ? "—"
    : String(value);
}
function time(value: string | number) {
  return new Date(
    String(value) + (String(value).endsWith("Z") ? "" : "Z"),
  ).toLocaleString("zh-CN", { hour12: false });
}

async function load() {
  const id = ++requestId;
  loading.value = true;
  loadError.value = "";
  try {
    const { data } = await api.get<Page<DataRow>>("/" + props.resource, {
      params: {
        q: activeQuery.value,
        page: page.value,
        page_size: pageSize.value,
      },
    });
    if (id !== requestId) return;
    rows.value = data.items;
    total.value = data.total;
    if (page.value > 1 && !data.items.length) {
      page.value = Math.max(1, Math.ceil(data.total / pageSize.value));
      await load();
    }
  } catch (e) {
    if (id === requestId) {
      rows.value = [];
      loadError.value = errorMessage(e);
    }
  } finally {
    if (id === requestId) loading.value = false;
  }
}
function search() {
  activeQuery.value = query.value.trim();
  page.value = 1;
  void load();
}
function clearSearch() {
  query.value = "";
  search();
}
function changeSize() {
  page.value = 1;
  void load();
}
async function edit(row?: DataRow) {
  formError.value = "";
  editId.value = row?.id ?? null;
  Object.keys(form).forEach((key) => delete form[key]);
  try {
    const fresh = row
      ? (await api.get<DataRow>("/" + props.resource + "/" + row.id)).data
      : null;
    for (const f of config.value.fields)
      form[f.key] =
        fresh?.[f.key] ??
        (f.type === "number" ? 1 : f.type === "role" ? "user" : "");
    editorOpen.value = true;
  } catch (e) {
    ElMessage.error(errorMessage(e));
  }
}
async function save() {
  if (saving.value) return;
  for (const field of visibleFields.value)
    if (field.type !== "password" && typeof form[field.key] === "string")
      form[field.key] = form[field.key].trim();
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  formError.value = "";
  try {
    const body = Object.fromEntries(
      visibleFields.value.map((f) => [f.key, form[f.key]]),
    );
    const path = "/" + props.resource;
    if (editId.value === null) await api.post(path, body);
    else await api.patch(path + "/" + editId.value, body);
    editorOpen.value = false;
    ElMessage.success("保存成功");
    if (props.resource === "users" && editId.value === auth.user?.id) {
      await auth.refresh();
      if (!auth.isAdmin) {
        await router.replace("/courses");
        return;
      }
    }
    await load();
  } catch (e) {
    formError.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
async function showDetail(row: DataRow) {
  try {
    detail.value = (
      await api.get<DataRow>("/" + props.resource + "/" + row.id)
    ).data;
    detailOpen.value = true;
  } catch (e) {
    ElMessage.error(errorMessage(e));
  }
}
async function remove(row: DataRow) {
  try {
    await ElMessageBox.confirm(
      "确定删除“" + (row.name || row.username) + "”吗？此操作不可撤销。",
      "删除" + config.value.singular,
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }
  try {
    await api.delete("/" + props.resource + "/" + row.id);
    ElMessage.success("已删除");
    await load();
  } catch (e) {
    ElMessage.error(errorMessage(e));
  }
}
function resetDialog(row: DataRow) {
  passwordUser.value = row;
  password.value = "";
  passwordError.value = "";
  passwordOpen.value = true;
}
async function resetPassword() {
  if (saving.value) return;
  passwordError.value = "";
  if (password.value.length < 8 || password.value.length > 256) {
    passwordError.value = "密码长度应为 8–256 个字符";
    return;
  }
  saving.value = true;
  try {
    await api.post("/users/" + passwordUser.value!.id + "/password", {
      password: password.value,
    });
    password.value = "";
    passwordOpen.value = false;
    ElMessage.success("密码已重置，该用户需要重新登录");
    if (passwordUser.value!.id === auth.user?.id) {
      auth.clear();
      await router.replace("/login");
    }
  } catch (e) {
    passwordError.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>

<template>
  <section>
    <div class="welcome">
      <div>
        <p class="eyebrow">TRAINING WORKSPACE / {{ resource.toUpperCase() }}</p>
        <h1>{{ config.title }}</h1>
        <p class="intro">{{ config.intro }}</p>
      </div>
      <ElButton v-if="auth.isAdmin" type="primary" size="large" @click="edit()"
        >＋ 新增{{ config.singular }}</ElButton
      ><ElTag v-else type="info" effect="plain">只读访问</ElTag>
    </div>
    <section class="data-panel" :aria-label="config.title + '列表'">
      <div class="data-toolbar">
        <form class="search-form" @submit.prevent="search">
          <ElInput
            v-model="query"
            :aria-label="config.search"
            :placeholder="config.search"
            clearable
            :maxlength="100"
            @clear="clearSearch"
          /><ElButton native-type="submit" :loading="loading">搜索</ElButton>
        </form>
        <span class="record-count"
          >共 <strong>{{ total }}</strong> 条记录</span
        >
      </div>
      <ElAlert
        v-if="loadError"
        :title="loadError"
        type="error"
        :closable="false"
        show-icon
        class="table-error"
        ><ElButton text @click="load">重新加载</ElButton></ElAlert
      >
      <div v-if="loading" class="loading-notice" role="status">正在加载…</div>
      <p v-if="compact && rows.length" class="mobile-table-hint">
        左右滑动表格，查看完整信息与操作
      </p>
      <ElTable
        :data="rows"
        row-key="id"
        style="width: 100%"
        :aria-label="config.title"
        :class="{ 'is-loading': loading }"
      >
        <ElTableColumn
          v-for="field in columns"
          :key="field.key"
          :prop="field.key"
          :label="field.label"
          :min-width="field.key === 'name' ? 170 : 120"
          show-overflow-tooltip
          ><template #default="{ row }"
            ><ElTag
              v-if="field.type === 'role'"
              :type="row.role === 'admin' ? 'success' : 'info'"
              effect="light"
              >{{ row.role === "admin" ? "管理员" : "普通用户" }}</ElTag
            ><span
              v-else
              :class="{
                'primary-cell': ['name', 'username'].includes(field.key),
              }"
              >{{ display(row[field.key]) }}</span
            ></template
          ></ElTableColumn
        >
        <ElTableColumn
          label="操作"
          :width="auth.isAdmin ? (resource === 'users' ? 280 : 190) : 80"
          :fixed="compact ? false : 'right'"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="showDetail(row as DataRow)"
              >详情</ElButton
            ><template v-if="auth.isAdmin"
              ><ElButton link type="primary" @click="edit(row as DataRow)"
                >编辑</ElButton
              ><ElButton
                v-if="resource === 'users'"
                link
                type="primary"
                @click="resetDialog(row as DataRow)"
                >重置密码</ElButton
              ><ElButton
                link
                type="danger"
                :disabled="resource === 'users' && row.id === auth.user?.id"
                @click="remove(row as DataRow)"
                >删除</ElButton
              ></template
            ></template
          ></ElTableColumn
        >
        <template #empty
          ><ElEmpty
            :description="
              loadError
                ? '加载失败，请重试'
                : activeQuery
                  ? '没有匹配的记录，试试其他关键词'
                  : '还没有' + config.singular + '记录'
            "
            :image-size="90"
            ><ElButton
              v-if="auth.isAdmin && !activeQuery && !loadError"
              type="primary"
              plain
              @click="edit()"
              >新增第一条{{ config.singular }}</ElButton
            ></ElEmpty
          ></template
        >
      </ElTable>
      <div class="table-footer">
        <span>按创建顺序排列</span
        ><ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="sizes, prev, pager, next"
          @current-change="load"
          @size-change="changeSize"
        />
      </div>
    </section>
    <p class="permission-note">
      {{
        auth.isAdmin
          ? "你可以新增、编辑和删除记录。删除操作不可撤销，请谨慎确认。"
          : "当前账号具有查看权限。如需修改信息，请联系管理员。"
      }}
    </p>
    <ElDialog
      v-model="editorOpen"
      :title="(editId === null ? '新增' : '编辑') + config.singular"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <ElAlert
        v-if="formError"
        :title="formError"
        type="error"
        :closable="false"
        class="form-alert"
      />
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="save"
      >
        <ElFormItem
          v-for="field in visibleFields"
          :key="field.key"
          :label="field.label"
          :prop="field.key"
        >
          <ElInputNumber
            v-if="field.type === 'number'"
            v-model="form[field.key]"
            :aria-label="field.label"
            :min="1"
            :max="2147483647"
            :precision="0"
          />
          <ElSelect
            v-else-if="field.type === 'role'"
            v-model="form[field.key]"
            :aria-label="field.label"
            ><ElOption label="普通用户" value="user" /><ElOption
              label="管理员"
              value="admin"
          /></ElSelect>
          <ElInput
            v-else
            v-model="form[field.key]"
            :aria-label="field.label"
            :type="
              field.type === 'textarea'
                ? 'textarea'
                : field.type === 'password'
                  ? 'password'
                  : 'text'
            "
            :show-password="field.type === 'password'"
            :autocomplete="field.type === 'password' ? 'new-password' : 'off'"
            :maxlength="field.max"
            :rows="3"
            :show-word-limit="field.type === 'textarea'"
          />
        </ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton :disabled="saving" @click="editorOpen = false">取消</ElButton
        ><ElButton type="primary" :loading="saving" @click="save"
          >保存</ElButton
        ></template
      >
    </ElDialog>
    <ElDialog
      v-model="detailOpen"
      :title="config.singular + '详情'"
      width="520px"
      destroy-on-close
      ><dl v-if="detail" class="detail-list">
        <template
          v-for="field in config.fields.filter((f) => !f.createOnly)"
          :key="field.key"
          ><dt>{{ field.label }}</dt>
          <dd>
            {{
              field.type === "role"
                ? detail.role === "admin"
                  ? "管理员"
                  : "普通用户"
                : display(detail[field.key])
            }}
          </dd></template
        >
        <dt>创建时间</dt>
        <dd>{{ time(detail.created_at) }}</dd>
      </dl>
      <template #footer
        ><ElButton @click="detailOpen = false">关闭</ElButton></template
      ></ElDialog
    >
    <ElDialog
      v-model="passwordOpen"
      title="重置密码"
      width="460px"
      :close-on-click-modal="false"
      :show-close="!saving"
      :close-on-press-escape="!saving"
      destroy-on-close
      ><p class="muted">
        为 {{ passwordUser?.username }} 设置新密码，已有登录会话将立即失效。
      </p>
      <ElAlert
        v-if="passwordError"
        :title="passwordError"
        type="error"
        :closable="false"
        class="form-alert"
      /><ElForm label-position="top" @submit.prevent="resetPassword"
        ><ElFormItem label="新密码"
          ><ElInput
            v-model="password"
            aria-label="新密码"
            type="password"
            show-password
            autocomplete="new-password"
            :maxlength="256"
            placeholder="至少 8 个字符" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton :disabled="saving" @click="passwordOpen = false"
          >取消</ElButton
        ><ElButton type="primary" :loading="saving" @click="resetPassword"
          >确认重置</ElButton
        ></template
      ></ElDialog
    >
  </section>
</template>
