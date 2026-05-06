<template>
  <PermissionGuard permissions="customers.view" show-fallback>
    <div class="customer-list">
      <!-- <div class="page-header">
        <h2>{{ $t("customers.title") }}</h2>
        <el-button 
          v-permission="'customers.create'"
          type="primary" 
          @click="goToCreatePage"
        >
          <el-icon><Plus /></el-icon>
          {{ $t("customers.addCustomer") }}
        </el-button>
      </div> -->

    <el-card class="filter-card" shadow="never">
      <div class="toolbar">
        <el-input
          v-model="searchText"
          :placeholder="$t('customers.searchCustomers')"
          class="search-input"
          :prefix-icon="Search"
          clearable
          style="width: 250px"
          @input="debouncedSearch"
        />
        <el-select
          v-model="statusFilter"
          :placeholder="$t('customers.filterByStatus')"
          clearable
          style="width: 200px"
        >
          <el-option :label="$t('table.selectAll')" value="" />
          <el-option :label="$t('customers.active')" value="true" />
          <el-option :label="$t('customers.inactive')" value="false" />
        </el-select>
        <el-select
          v-model="customerTypeFilter"
          :placeholder="$t('customers.filterByType')"
          clearable
          style="width: 200px"
        >
          <el-option :label="$t('table.selectAll')" value="" />
          <el-option :label="$t('customers.member')" value="member" />
          <el-option :label="$t('customers.walkin')" value="walkin" />
          <el-option :label="$t('customers.guest')" value="guest" />
        </el-select>
        <div class="deleted-switch">
          <span>{{ $t("customers.showDeleted") }}</span>
          <el-switch
            v-model="includeDeleted"
            inline-prompt
            style="margin-left: 8px"
          />
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table
        :data="customers"
        v-loading="loading"
        style="width: 100%"
        :empty-text="$t('messages.noData')"
        ref="customerTable"
      >
        <el-table-column prop="name" :label="$t('customers.name')">
          <template #default="{ row }">
            {{ row.name || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" :label="$t('customers.phone')">
          <template #default="{ row }">
            {{ toLocalPhone(row?.phone) || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="customerType"
          :label="$t('customers.customerType')"
          width="150"
        >
          <template #default="{ row }">
            <el-tag :type="getCustomerTypeTag(row.customerType)">
              {{ $t(`customers.${row.customerType}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="isActive"
          :label="$t('customers.status')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag v-if="row.deleted_at" type="danger" size="small">
              {{ $t("customers.deleted") }}
            </el-tag>
            <el-tag v-else :type="row.isActive ? 'success' : 'info'">
              {{ $t(`customers.${row.isActive ? "active" : "inactive"}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('actions.title')"
          fixed="right"
          width="100"
        >
          <template #default="{ row }">
            <el-dropdown
              trigger="click"
              @command="(command) => handleCommand(command, row)"
            >
              <el-button size="small" :icon="MoreFilled" circle @click.stop />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="canViewCustomers"
                    command="view"
                    class="text-info"
                    :disabled="!!row.deleted_at"
                  >
                    <el-icon><View /></el-icon>
                    {{ $t("actions.view") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canEditCustomers"
                    command="edit"
                    class="text-primary"
                    :disabled="!!row.deleted_at"
                  >
                    <el-icon><Edit /></el-icon>
                    {{ $t("actions.edit") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canDeleteCustomers && !row.deleted_at"
                    command="delete"
                    class="text-danger"
                  >
                    <el-icon><Delete /></el-icon>
                    {{ $t("actions.delete") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canEditCustomers && row.deleted_at"
                    command="restore"
                    class="text-success"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                    {{ $t("actions.restore") }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canEditCustomers && !row.deleted_at"
                    command="toggleStatus"
                    :class="row.isActive ? 'text-warning' : 'text-success'"
                  >
                    <el-icon><SwitchButton /></el-icon>
                    {{
                      row.isActive
                        ? $t("customers.inactive")
                        : $t("customers.active")
                    }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

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
  </div>
  </PermissionGuard>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { customerService } from "@/services/customerService";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search, MoreFilled, View, Edit, Delete, RefreshLeft, SwitchButton } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { debounce } from "lodash-es";
import { toLocalPhone } from "@/utils/formatters";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { usePermissions } from "@/composables/usePermissions";
import PermissionGuard from "@/components/common/PermissionGuard.vue";

const appStore = useAppStore();
const router = useRouter();
const { t } = useI18n();
const { canViewCustomers, canCreateCustomers, canEditCustomers, canDeleteCustomers } = usePermissions();

const loading = ref(false);
const searchText = ref("");
const statusFilter = ref("");
const customerTypeFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const customers = ref([]);
const customerTable = ref(null);
const includeDeleted = ref(false);

// Auto-refresh the customer list when filters change, the tab is focused, or global CRUD occurs
useAutoRefresh(() => loadCustomers(true), {
  deps: [
    statusFilter,
    customerTypeFilter,
    includeDeleted,
    () => appStore.dataVersion,
  ],
});

watch([statusFilter, customerTypeFilter, includeDeleted], () => {
  currentPage.value = 1;
});

const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  loadCustomers();
}, 500);

const loadCustomers = async (isBackground = false) => {
  if (!isBackground) {
    loading.value = true;
  }
  try {
    const params = {
      page: currentPage.value,
      per_page: pageSize.value,
      search: searchText.value || undefined,
      isActive: statusFilter.value !== "" ? statusFilter.value : undefined,
      customerType: customerTypeFilter.value || undefined,
      includeDeleted: includeDeleted.value ? "only" : undefined,
    };

    const response = await customerService.getCustomers(params);

    customers.value = response.data;
    console.log(customers.value);
    total.value = response.total;
  } catch (error) {
    console.error("Failed to load customers:", error);
    if (!isBackground) {
      ElMessage.error(t("customers.loadError"));
    }
  } finally {
    if (!isBackground) {
      loading.value = false;
    }
  }
};

const handleSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadCustomers();
};

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage;
  loadCustomers();
};

const goToCreatePage = () => {
  router.push({ name: "CreateCustomer", params: { id: null } });
};

const toggleStatus = async (customer) => {
  try {
    const newStatus = !customer.isActive;
    const actionKey = newStatus ? "activate" : "deactivate";

    await ElMessageBox.confirm(
      t(`messages.confirm.${actionKey}`, {
        name: customer.name || toLocalPhone(customer.phone) || customer.username || "this customer",
      }),
      t("messages.confirm.title"),
      {
        // Fix: Use a specific action label instead of the full sentence
        confirmButtonText: t(`actions.${actionKey}`),
        cancelButtonText: t("actions.cancel"),
        type: newStatus ? "success" : "warning",
        // Add this to control width via CSS
        customClass: "wide-message-box",
        draggable: true, // Optional: makes it feel more "high-end"
      },
    );

    const response = await customerService.updateCustomer(customer.id, {
      isActive: newStatus,
    });

    if (response.success || response) {
      ElMessage.success(
        t(`messages.${newStatus ? "activated" : "deactivated"}`),
      );
      appStore.triggerRefresh();
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("Toggle customer status error:", error);
      ElMessage.error(t("errors.updateFailed"));
    }
  }
};

const editCustomer = (id) => {
  router.push({ name: "EditCustomer", params: { id } });
};

const viewCustomer = (id) => {
  router.push({ name: "CustomerDetail", params: { id } });
};

const deleteCustomer = async (id) => {
  try {
    await ElMessageBox.confirm(
      t("customers.confirmDelete"),
      t("actions.delete"),
      {
        confirmButtonText: t("actions.delete"),
        cancelButtonText: t("actions.cancel"),
        type: "warning",
      },
    );

    await customerService.deleteCustomer(id);
    ElMessage.success(t("customers.deleteSuccess"));

    if (customers.value.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    appStore.triggerRefresh();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete customer:", error);
      ElMessage.error(t("customers.deleteError"));
    }
  }
};

const restoreCustomer = async (id) => {
  try {
    await ElMessageBox.confirm(
      t("customers.confirmRestore"),
      t("customers.restore"),
      {
        confirmButtonText: t("actions.restore"),
        cancelButtonText: t("actions.cancel"),
        type: "success",
      },
    );

    const res = await customerService.restoreCustomer(id);
    if (res.success) {
      ElMessage.success(t("customers.restoreSuccess"));
      appStore.triggerRefresh();
    } else {
      ElMessage.error(res.message || t("customers.restoreError"));
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to restore customer:", error);
      ElMessage.error(t("customers.restoreError"));
    }
  }
};

const handleCommand = (command, row) => {
  switch (command) {
    case "view":
      viewCustomer(row.id);
      break;
    case "edit":
      editCustomer(row.id);
      break;
    case "delete":
      deleteCustomer(row.id);
      break;
    case "restore":
      restoreCustomer(row.id);
      break;
    case "toggleStatus":
      toggleStatus(row);
      break;
  }
};

const getCustomerTypeTag = (type) => {
  switch (type) {
    case "member":
      return "success";
    case "walkin":
      return "info";
    case "guest":
      return "warning";
    default:
      return "primary";
  }
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("customers.title"), path: "/admin/customers" },
  ]);
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
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.filter-card {
  margin-bottom: 10px;
}
.deleted-switch {
  display: flex;
  align-items: center;
  margin-left: auto;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.text-info {
  color: var(--el-color-info);
}
.text-primary {
  color: var(--el-color-primary);
}
.text-danger {
  color: var(--el-color-danger);
}
.text-success {
  color: var(--el-color-success);
}
.text-warning {
  color: var(--el-color-warning);
}
</style>
