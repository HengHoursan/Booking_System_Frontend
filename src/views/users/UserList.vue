<template>
  <div class="user-list">
    <div class="page-header">
      <h2>{{ $t("users.title") }}</h2>
      <el-button
        v-permission="'users.create'"
        type="primary"
        @click="openCreateDialog"
      >
        <el-icon>
          <Plus />
        </el-icon>
        {{ $t("users.addUser") }}
      </el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <div class="toolbar">
        <el-input
          v-model="searchText"
          :placeholder="$t('users.searchUsers')"
          class="search-input"
          :prefix-icon="Search"
          clearable
          style="width: 250px"
          @input="debouncedSearch"
        />
        <el-select
          v-model="statusFilter"
          :placeholder="$t('users.filterByStatus')"
          clearable
          style="width: 250px"
        >
          <el-option :label="$t('table.selectAll')" value="" />
          <el-option :label="$t('users.active')" value="active" />
          <el-option :label="$t('users.inactive')" value="inactive" />
        </el-select>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table
        :data="users"
        v-loading="loading"
        style="width: 100%"
        :empty-text="$t('messages.noData')"
        ref="userTable"
        @selection-change="handleSelectionChange"
      >
        <!-- <el-table-column type="selection" width="55" /> -->
        <!-- <el-table-column prop="id" label="ID" width="80" /> -->
        <el-table-column prop="name" :label="$t('users.name')" />
        <el-table-column prop="username" :label="$t('users.username')" />
        <el-table-column prop="email" :label="$t('users.email')" />
        <el-table-column prop="phone" :label="$t('users.phone')" width="180">
          <template #default="{ row }">
            <span v-if="row.phone">{{ row.phone }}</span>
            <el-text v-else type="info" size="small">{{ $t('common.notSet') }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="role" :label="$t('users.role')" width="150">
          <template #default="{ row }">
            <el-tag
              :type="
                row.role === 'admin' || row.role === 'superadmin'
                  ? 'warning'
                  : 'info'
              "
            >
              {{ $t(`users.${row.role}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="$t('users.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ $t(`users.${row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- <el-table-column
            prop="created_at"
            :label="$t('users.created')"
            width="160"
        /> -->
        <el-table-column :label="$t('users.actions')" width="200">
          <template #default="{ row }">
            <el-dropdown trigger="click" @command="handleActionCommand">
              <el-button type="primary" size="small">
                {{ $t('users.actions') }}
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-permission="'users.edit'"
                    :command="{ action: 'edit', user: row }"
                  >
                    <el-icon><Edit /></el-icon>
                    {{ $t("users.edit") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-permission="'users.edit'"
                    :command="{ action: 'resetPassword', user: row }"
                    divided
                  >
                    <el-icon><Key /></el-icon>
                    {{ $t("users.resetPassword") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-permission="'users.edit'"
                    :command="{ action: 'updatePhone', user: row }"
                  >
                    <el-icon><Phone /></el-icon>
                    {{ $t("users.updatePhone") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-permission="'users.delete'"
                    :command="{ action: 'delete', user: row }"
                    divided
                  >
                    <el-icon><Delete /></el-icon>
                    {{ $t("users.delete") }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- Bulk Actions -->
      <div class="bulk-actions" v-if="selectedUsers.length > 0">
        <el-button type="danger" @click="bulkDeleteUsers">
          {{ $t("users.deleteSelected") }} ({{ selectedUsers.length }})
        </el-button>
        <el-button type="default" @click="cancelSelection">
          {{ $t("actions.cancel") }}
        </el-button>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :small="false"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- User Form Dialog -->
    <UserFormDialog
      v-model="showFormDialog"
      :user-id="selectedUserId"
      @success="handleFormSuccess"
    />

    <!-- Password Reset Dialog -->
    <PasswordResetDialog
      v-model="showPasswordResetDialog"
      :user="selectedUser"
      @success="handlePasswordResetSuccess"
    />

    <!-- Phone Update Dialog -->
    <PhoneUpdateDialog
      v-model="showPhoneUpdateDialog"
      :user="selectedUser"
      @success="handlePhoneUpdateSuccess"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useAppStore } from "@/stores/app";
import { userService } from "@/services/userService";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search, ArrowDown, Edit, Key, Phone, Delete } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { debounce } from "lodash-es";
import UserFormDialog from "@/components/users/UserFormDialog.vue";
import PasswordResetDialog from "@/components/users/PasswordResetDialog.vue";
import PhoneUpdateDialog from "@/components/users/PhoneUpdateDialog.vue";

const appStore = useAppStore();

// Reactive data
const loading = ref(false);
const searchText = ref("");
const statusFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const users = ref([]);
const userTable = ref(null);
const selectedUsers = ref([]);
const showFormDialog = ref(false);
const selectedUserId = ref("");
const showPasswordResetDialog = ref(false);
const showPhoneUpdateDialog = ref(false);
const selectedUser = ref(null);
const { t } = useI18n();

// Debounced search function
const debouncedSearch = debounce(() => {
  currentPage.value = 1; // Reset to first page when searching
  loadUsers();
}, 500);

// Watch for filter changes
watch([statusFilter], () => {
  currentPage.value = 1;
  loadUsers();
});

// Load users from API
const loadUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      per_page: pageSize.value,
      search: searchText.value || undefined,
      status: statusFilter.value || undefined,
    };

    const response = await userService.getUsers(params);

    // Handle different response formats
    if (response.data) {
      users.value = response.data;
      total.value = response.total || response.meta?.total || 0;
    } else {
      users.value = response;
      total.value = response.length;
    }
  } catch (error) {
    console.error("Failed to load users:", error);
    ElMessage.error(t("users.loadError"));
    // Keep existing data if error occurs
  } finally {
    loading.value = false;
  }
};

// Handle pagination changes
const handleSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadUsers();
};

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage;
  loadUsers();
};

// Handle table selection
const handleSelectionChange = (selection) => {
  selectedUsers.value = selection;
};

const cancelSelection = () => {
  selectedUsers.value = [];
  if (userTable.value) {
    userTable.value.clearSelection();
  }
};

// Open create dialog
const openCreateDialog = () => {
  selectedUserId.value = "";
  showFormDialog.value = true;
};

// Edit user
const editUser = (id) => {
  selectedUserId.value = id;
  showFormDialog.value = true;
};

// Handle form success
const handleFormSuccess = () => {
  loadUsers();
};

// Handle dropdown action commands
const handleActionCommand = (command) => {
  const { action, user } = command;
  
  switch (action) {
    case 'edit':
      editUser(user.id);
      break;
    case 'resetPassword':
      resetUserPassword(user);
      break;
    case 'updatePhone':
      updateUserPhone(user);
      break;
    case 'delete':
      deleteUser(user.id);
      break;
  }
};

// Reset user password
const resetUserPassword = (user) => {
  selectedUser.value = user;
  showPasswordResetDialog.value = true;
};

// Update user phone
const updateUserPhone = (user) => {
  selectedUser.value = user;
  showPhoneUpdateDialog.value = true;
};

// Handle password reset success
const handlePasswordResetSuccess = () => {
  loadUsers();
  selectedUser.value = null;
};

// Handle phone update success
const handlePhoneUpdateSuccess = () => {
  loadUsers();
  selectedUser.value = null;
};

// Delete single user
const deleteUser = async (id) => {
  try {
    await ElMessageBox.confirm(t("users.confirmDelete"), t("actions.delete"), {
      confirmButtonText: t("actions.delete"),
      cancelButtonText: t("actions.cancel"),
      type: "warning",
    });

    await userService.deleteUser(id);
    ElMessage.success(t("users.deleteSuccess"));

    // Reload users or remove from local array
    if (users.value.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    loadUsers();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete user:", error);
    }
  }
};

// Bulk delete users
const bulkDeleteUsers = async () => {
  try {
    await ElMessageBox.confirm(
      t("users.confirmDeleteMultiple", { count: selectedUsers.value.length }),
      t("actions.delete"),
      {
        confirmButtonText: t("actions.delete"),
        cancelButtonText: t("actions.cancel"),
        type: "warning",
      },
    );

    const userIds = selectedUsers.value.map((user) => user.id);
    await userService.bulkDeleteUsers(userIds);

    ElMessage.success(
      t("users.deleteMultipleSuccess", { count: selectedUsers.value.length }),
    );
    cancelSelection();
    loadUsers();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete users:", error);
    }
  }
};

console.log(users.value);
// Initialize component
onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("users.title"), path: "/admin/users" },
    { title: t("users.allUsers"), path: "/admin/users" },
  ]);

  loadUsers();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.search-input {
  width: 300px;
}

.bulk-actions {
  margin: 16px 0;
  padding: 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* Loading state */
.el-table__empty-text {
  color: var(--el-text-color-secondary);
}

/* Selection highlighting */
:deep(.el-table__row.current-row) {
  background-color: var(--el-color-primary-light-9);
}

.filter-card {
  margin-bottom: 10px;
}
</style>
