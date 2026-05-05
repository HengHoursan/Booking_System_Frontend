<template>
  <div class="role-permissions">
    <!-- <el-page-header :content="$t('system.rolePermissions')" /> -->

    <!-- Summary by role -->

    <!-- Manage role-permission assignments -->
    <el-card class="mt-3" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t("system.manageRoleAssignments") }}</span>
          <div class="header-actions">
            <el-input
              v-model="search"
              size="small"
              :placeholder="$t('system.searchPermissions')"
              clearable
              style="width: 150px"
            />
            <el-select
              v-model="selectedModule"
              size="small"
              :placeholder="$t('system.filterByModule')"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="mod in modules"
                :key="mod"
                :label="mod"
                :value="mod"
              />
            </el-select>
            <el-button
              :loading="loadingAssignments"
              size="small"
              @click="refreshAll"
              >{{ $t("actions.refresh") }}
            </el-button>
          </div>
        </div>
      </template>

      <el-skeleton v-if="loadingAssignments" rows="6" animated />

      <div v-else>
        <el-empty
          v-if="allPermissions.length === 0"
          :description="$t('system.noPermissions')"
        />
        <el-table
          v-else
          :data="allPermissions"
          style="width: 100%"
          size="small"
        >
          <el-table-column :label="$t('system.module')" width="140">
            <template #default="{ row }">{{ row.module }}</template>
          </el-table-column>
          <el-table-column :label="$t('system.permission')">
            <template #default="{ row }">
              <div class="perm-name">
                <div class="display">{{ row.displayName }}</div>
                <div class="internal">{{ row.name }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            v-for="r in rolesForAssignments"
            :key="r.name"
            :label="r.displayName"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              <el-switch
                :model-value="isAssigned(row.name, r.name)"
                :loading="isToggling(row.name, r.name)"
                :disabled="!isSuperAdmin"
                @change="(val) => onToggle(row, r.name, val)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- Create permission dialog -->
    <el-dialog
      v-model="createDialogVisible"
      :title="$t('system.createPermission')"
      width="520px"
    >
      <el-form :model="createForm" label-width="120px">
        <el-form-item :label="$t('system.displayName')">
          <el-input
            v-model="createForm.displayName"
            :placeholder="$t('system.exampleEditUsers')"
          />
        </el-form-item>
        <el-form-item :label="$t('system.name')">
          <el-input
            v-model="createForm.name"
            :placeholder="$t('system.exampleUsersEdit')"
          />
        </el-form-item>
        <el-form-item :label="$t('system.module')">
          <el-input
            v-model="createForm.module"
            :placeholder="$t('system.exampleUsers')"
          />
        </el-form-item>
        <el-form-item :label="$t('system.description')">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            :placeholder="$t('system.optionalDescription')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createDialogVisible = false"
            >{{ $t("actions.cancel") }}
          </el-button>
          <el-button
            type="primary"
            :loading="creating"
            @click="createPermission"
            >{{ $t("actions.create") }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Create role dialog -->
    <el-dialog
      v-model="createRoleDialogVisible"
      :title="$t('system.createRole')"
      width="480px"
    >
      <el-form :model="createRoleForm" label-width="120px">
        <el-form-item :label="$t('system.displayName')">
          <el-input
            v-model="createRoleForm.displayName"
            :placeholder="$t('system.exampleManager')"
          />
        </el-form-item>
        <el-form-item :label="$t('system.name')">
          <el-input
            v-model="createRoleForm.name"
            :placeholder="$t('system.exampleManagerKey')"
          />
        </el-form-item>
        <el-form-item :label="$t('system.description')">
          <el-input
            v-model="createRoleForm.description"
            type="textarea"
            :rows="3"
            :placeholder="$t('system.optionalDescription')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createRoleDialogVisible = false"
            >{{ $t("actions.cancel") }}
          </el-button>
          <el-button type="primary" :loading="creatingRole" @click="createRole"
            >{{ $t("system.createRole") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import api from "@/utils/api";
import { usePermissions } from "@/composables/usePermissions";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";

const { isSuperAdmin } = usePermissions();
const { t } = useI18n();

// Filter state
const search = ref("");
const selectedModule = ref("");
const modules = ref([]);

// Summary state
const loading = ref(false);
const rolePermissions = ref({});
const appStore = useAppStore();

// Assignment state
const loadingAssignments = ref(false);
const allPermissions = ref([]);
const permissionMap = ref({}); // name -> permission object (with _id)
const assignments = ref({}); // permissionName -> { [roleName]: boolean }
const toggling = ref({}); // key permission:role -> boolean
const roles = ref([
  { name: "superadmin", displayName: "Super Admin" },
  { name: "admin", displayName: "Admin" },
  { name: "cashier", displayName: "Cashier" },
  { name: "user", displayName: "User" },
]); // fixed roles list

const rolesForAssignments = computed(() => {
  // Exclude superadmin (implicit all)
  return roles.value.filter((r) => r.name !== "superadmin");
});

// Create dialog state
const createDialogVisible = ref(false);
const creating = ref(false);
const createForm = ref({
  displayName: "",
  name: "",
  module: "",
  description: "",
});

// Create role dialog state
const createRoleDialogVisible = ref(false);
const creatingRole = ref(false);
const createRoleForm = ref({ displayName: "", name: "", description: "" });

const refreshAll = async () => {
  search.value = "";
  selectedModule.value = "";
  await Promise.all([fetchRolePermissions(), fetchAllPermissions()]);
  buildAssignments();
};

const fetchRolePermissions = async () => {
  loading.value = true;
  try {
    const res = await api.get("/permissions/roles");
    if (res.data?.success) {
      rolePermissions.value = res.data.data || {};
    }
  } catch (error) {
    console.error("Failed to fetch role permissions:", error);
    const msg =
      error?.response?.data?.message ||
      error.message ||
      t("system.failedToLoadRolePermissions");
    if (error?.response?.status === 403) {
      window?.ElMessage?.error?.(t("system.accessDeniedAdmin"));
    } else {
      window?.ElMessage?.error?.(msg);
    }
  } finally {
    loading.value = false;
  }
};

const fetchAllPermissions = async () => {
  loadingAssignments.value = true;
  try {
    const params = {};
    if (search.value) params.search = search.value;
    if (selectedModule.value) params.module = selectedModule.value;

    const res = await api.get("/permissions/all", { params });
    console.log("all permission data:", res.data.data);
    if (res.data?.success) {
      allPermissions.value = res.data.data.permissions || [];
      if (!search.value && !selectedModule.value) {
        modules.value = res.data.data.modules || [];
      }
      const map = {};
      for (const p of allPermissions.value) map[p.name] = p;
      permissionMap.value = map;
    }
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
  } finally {
    loadingAssignments.value = false;
  }
};

const fetchAllRoles = async () => {
  try {
    const res = await api.get("/roles");
    if (res.data?.success) {
      roles.value = res.data.data || [];
    }
  } catch (error) {
    console.error("Failed to fetch roles:", error);
  }
};

const buildAssignments = () => {
  const result = {};
  const roleNames = roles.value.map((r) => r.name);

  for (const perm of allPermissions.value) {
    const defaults = {};
    for (const rn of roleNames) defaults[rn] = false;
    result[perm.name] = defaults;
  }

  for (const rn of roleNames) {
    const perms = rolePermissions.value?.[rn]?.permissions || [];
    for (const name of perms) {
      if (!result[name]) {
        const defaults = {};
        for (const rnx of roleNames) defaults[rnx] = false;
        result[name] = defaults;
      }
      result[name][rn] = true;
    }
  }

  assignments.value = result;
};

const isAssigned = (permName, roleName) =>
  assignments.value?.[permName]?.[roleName] || false;
const toggleKey = (permName, roleName) => `${permName}:${roleName}`;
const isToggling = (permName, roleName) =>
  !!toggling.value[toggleKey(permName, roleName)];

const onToggle = async (perm, roleName, val) => {
  const key = toggleKey(perm.name, roleName);
  const p = permissionMap.value[perm.name];
  if (!p?._id) {
    // Try fallback using name-only payloads if id missing
    try {
      toggling.value[key] = true;
      if (val) {
        await api.post("/permissions/assign", {
          role: roleName,
          permission: perm.name,
        });
      } else {
        await api.post("/permissions/remove", {
          role: roleName,
          permission: perm.name,
        });
      }
      assignments.value[perm.name][roleName] = val;
      window?.ElMessage?.success?.(t("system.updated"));
    } catch (error) {
      console.error("Update assignment failed:", error);
      window?.ElMessage?.error?.(
        error?.response?.data?.message || t("system.updateFailed"),
      );
    } finally {
      toggling.value[key] = false;
    }
    return;
  }
  try {
    toggling.value[key] = true;
    if (val) {
      try {
        await api.post("/permissions/assign", {
          role: roleName,
          permissionId: p._id,
        });
      } catch (err) {
        if (err?.response?.status === 400 || err?.response?.status === 422) {
          await api.post("/permissions/assign", {
            role: roleName,
            permission: perm.name,
          });
        } else {
          throw err;
        }
      }
    } else {
      try {
        await api.post("/permissions/remove", {
          role: roleName,
          permissionId: p._id,
        });
      } catch (err) {
        if (err?.response?.status === 400 || err?.response?.status === 422) {
          await api.post("/permissions/remove", {
            role: roleName,
            permission: perm.name,
          });
        } else {
          throw err;
        }
      }
    }
    assignments.value[perm.name][roleName] = val;
    window?.ElMessage?.success?.(t("system.updated"));
  } catch (error) {
    console.error("Update assignment failed:", error);
    window?.ElMessage?.error?.(
      error?.response?.data?.message || t("system.updateFailed"),
    );
  } finally {
    toggling.value[key] = false;
  }
};

const createPermission = async () => {
  if (
    !createForm.value.displayName ||
    !createForm.value.name ||
    !createForm.value.module
  ) {
    window?.ElMessage?.warning?.(t("system.validationError"));
    return;
  }
  creating.value = true;
  try {
    await api.post("/permissions", createForm.value);
    window?.ElMessage?.success?.(t("system.createSuccess"));
    createDialogVisible.value = false;
    createForm.value = {
      displayName: "",
      name: "",
      module: "",
      description: "",
    };
    await refreshAll();
  } catch (error) {
    console.error("Create permission failed:", error);
    window?.ElMessage?.error?.(
      error?.response?.data?.message || t("system.createFailed"),
    );
  } finally {
    creating.value = false;
  }
};

const openCreateDialog = () => {
  createDialogVisible.value = true;
};

const openCreateRoleDialog = () => {
  createRoleDialogVisible.value = true;
};

const createRole = async () => {
  if (!createRoleForm.value.displayName || !createRoleForm.value.name) {
    window?.ElMessage?.warning?.(t("system.roleValidationError"));
    return;
  }
  creatingRole.value = true;
  try {
    await api.post("/roles", createRoleForm.value);
    window?.ElMessage?.success?.(t("system.roleCreateSuccess"));
    createRoleDialogVisible.value = false;
    createRoleForm.value = { displayName: "", name: "", description: "" };
    await refreshAll();
  } catch (error) {
    console.error("Create role failed:", error);
    window?.ElMessage?.error?.(
      error?.response?.data?.message || t("system.roleCreateFailed"),
    );
  } finally {
    creatingRole.value = false;
  }
};

watch(selectedModule, fetchAllPermissions);

let searchDebounceTimer;
watch(search, () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchAllPermissions();
  }, 300);
});

onMounted(async () => {
  await refreshAll();
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/dashboard" },
    { title: t("settings.title"), path: "/settings" },
    {
      title: t("system.rolePermissions"),
      path: "/admin/system/role-permissions",
    },
  ]);
});
</script>

<style scoped>
.mt-3 {
  margin-top: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-info {
  padding: 16px 0;
}

.permissions-by-module {
  margin-top: 16px;
}

.module-section {
  margin-bottom: 24px;
}

.module-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-tag {
  margin: 2px;
}

.no-permissions {
  text-align: center;
  padding: 40px 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.perm-name .display {
  font-weight: 500;
}

.perm-name .internal {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
