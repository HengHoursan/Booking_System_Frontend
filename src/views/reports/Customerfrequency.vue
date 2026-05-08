<template>
  <div class="customer-frequency">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="title-section">
            <el-button
              @click="$router.push('/admin/reports')"
              link
              :icon="ArrowLeft"
              class="mr-2"
            />
            <h2>{{ $t("reports.customerFrequency") }}</h2>
          </div>
          <div class="action-section">
            <el-button 
              type="primary" 
              @click="handleExport('csv')"
              :icon="Download"
              class="export-btn"
            >
              CSV
            </el-button>
            <el-button 
              type="success" 
              @click="handleExport('excel')"
              :icon="Download"
              class="export-btn"
            >
              Excel
            </el-button>
            <el-button 
              type="danger" 
              @click="handleExport('pdf')"
              :icon="DocumentCopy"
              class="export-btn"
            >
              Print
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="customerData"
        v-loading="loading"
        style="width: 100%"
        stripe
        :default-sort="{ prop: 'total_bookings', order: 'descending' }"
      >
        <el-table-column type="index" label="#" width="60" />

        <el-table-column
          :label="$t('reports.customer')"
          min-width="150"
        >
          <template #default="{ row }">
            <span>
              {{ row.customer_name ? row.customer_name : $t('customers.' + row.customer_type) || "N/A" }}
            </span>
          </template>
        </el-table-column>

        <el-table-column
          prop="customer_phone"
          :label="$t('reports.phone')"
          min-width="130"
        >
          <template #default="{ row }">
            <span>{{ toLocalPhone(row.customer_phone) || "" }}</span>
          </template>
        </el-table-column>

        <!-- <el-table-column
          prop="customer_email"
          :label="$t('reports.email')"
          min-width="180"
        >
          <template #default="{ row }">
            <span>{{ row.customer_email || "" }}</span>
          </template>
        </el-table-column> -->

        <el-table-column
          prop="total_bookings"
          :label="$t('reports.totalBookings')"
          width="160"
          sortable
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="primary" size="large">{{
              row.total_bookings
            }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="total_spend"
          :label="$t('reports.totalValue')"
          width="150"
          sortable
          align="right"
        >
          <template #default="{ row }">
            <span class="amount">${{ formatAmount(row.total_spend) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-section mt-6 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>

      <div v-if="!loading && customerData.length === 0" class="empty-state">
        <el-empty :description="$t('reports.noDataAvailable')" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { Refresh, ArrowLeft, Download, DocumentCopy } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import reportService from "@/services/reportService";
import { useAppStore } from "@/stores/app";
import { exportToCSV, exportToExcel, printTable } from "@/utils/exportUtils";
import dayjs from "dayjs";
import { toLocalPhone } from "../../utils/formatters";

const appStore = useAppStore();
const { t } = useI18n();
const loading = ref(false);
const customerData = ref([]);
const total = ref(0);

const pagination = reactive({
  page: 1,
  limit: 10,
});

const formatAmount = (amount) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const loadData = async () => {
  loading.value = true;
  try {
    const response =
      await reportService.getCustomerBookingFrequency(pagination);
    customerData.value = response.data || [];
    console.table(customerData.value);
    total.value = response.total || 0;
  } catch (error) {
    console.error("Failed to load customer booking frequency:", error);
    ElMessage.error(t("messages.loadDataFailed"));
  } finally {
    loading.value = false;
  }
};

const handleExport = (type) => {
  const data = customerData.value.map((item) => ({
    [t("reports.customerName")]: item.customer_name || t('customers.' + item.customer_type) || "N/A",
    [t("reports.phone")]: item.customer_phone || "N/A",
    [t("reports.email")]: item.customer_email || "N/A",
    [t("reports.totalBookings")]: item.total_bookings,
    [t("reports.totalValue")]: item.total_spend,
  }));

  const filename = `${t("reports.customerFrequency")
    .toLowerCase()
    .replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}`;

  if (type === "csv") {
    exportToCSV(data, filename);
  } else if (type === "excel") {
    exportToExcel(data, filename);
  } else if (type === "pdf") {
    const pdfData = customerData.value.map((item, index) => ({
      index: index + 1,
      customer_name: item.customer_name || t('customers.' + item.customer_type) || "N/A",
      phone: item.customer_phone || "N/A",
      email: item.customer_email || "N/A",
      total_bookings: item.total_bookings,
      total_spend: `$${formatAmount(item.total_spend)}`,
    }));

    const columns = [
      { header: "#", dataKey: "index" },
      { header: t("reports.customerName"), dataKey: "customer_name" },
      { header: t("reports.phone"), dataKey: "phone" },
      { header: t("reports.email"), dataKey: "email" },
      { header: t("reports.totalBookings"), dataKey: "total_bookings" },
      { header: t("reports.totalValue"), dataKey: "total_spend" },
    ];
    printTable(pdfData, columns, t("reports.customerFrequency"));
  }
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("nav.reportsNav"), path: "/admin/reports" },
    {
      title: t("reports.customerFrequency"),
      path: "/admin/reports/customer-frequency",
    },
  ]);

  loadData();
});
</script>

<style scoped>
.customer-frequency {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
}

.action-section {
  display: flex;
  gap: 8px;
  align-items: center;
}

.export-btn {
  transition: all 0.3s ease;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(151, 50, 50, 0.15);
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.amount {
  font-weight: 600;
  color: var(--el-color-success);
  font-size: 15px;
}

.empty-state {
  padding: 40px 0;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background-color: var(--el-fill-color-light);
  font-weight: 600;
}
</style>
