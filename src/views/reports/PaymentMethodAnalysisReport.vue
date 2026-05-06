<template>
  <div class="payment-analysis-report">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title-section">
            <el-button
              @click="$router.push('/admin/reports')"
              link
              :icon="ArrowLeft"
              class="mr-2"
            />
            <h2 class="text-xl font-bold">
              {{ $t("reports.paymentMethodAnalysis") }}
            </h2>
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

      <!-- Filters -->
      <div class="filters-section mb-6">
        <el-form :inline="true" :model="filters" class="demo-form-inline">
          <el-form-item :label="$t('reports.dateRange')">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              :range-separator="$t('reports.to')"
              :start-placeholder="$t('reports.startDate')"
              :end-placeholder="$t('reports.endDate')"
              @change="handleFilterChange"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadData" :icon="Search">
              {{ $t("reports.search") }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards mb-8">
        <div class="summary-card">
          <div class="card-label">{{ $t("reports.totalTransactions") }}</div>
          <div class="card-value">{{ totalTransactions }}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">{{ $t("reports.totalRevenue") }}</div>
          <div class="card-value text-green-600">
            ${{ totalRevenue.toFixed(2) }}
          </div>
        </div>
        <div class="summary-card">
          <div class="card-label">
            {{ $t("reports.successfulTransactions") }}
          </div>
          <div class="card-value text-blue-600">{{ totalSuccessful }}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">{{ $t("reports.failedTransactions") }}</div>
          <div class="card-value text-red-600">{{ totalFailed }}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">{{ $t("reports.expiredTransactions") }}</div>
          <div class="card-value text-gray-500">{{ totalExpired }}</div>
        </div>
      </div>

      <!-- Table -->
      <el-table
        :data="reportData"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column type="index" label="#" width="60" />
        <el-table-column
          prop="payment_method"
          :label="$t('reports.paymentMethod')"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-tag>{{ row.payment_method || "N/A" }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="total_transactions"
          :label="$t('reports.totalTransactions')"
          width="180"
          align="center"
          sortable
        />
        <el-table-column
          prop="successful_transactions"
          :label="$t('reports.successful')"
          width="150"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-tag type="success" size="small">
              {{ row.successful_transactions }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="failed_transactions"
          :label="$t('reports.failed')"
          width="140"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-tag type="danger" size="small">
              {{ row.failed_transactions }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="pending_transactions"
          :label="$t('reports.pending')"
          width="140"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-tag type="warning" size="small">
              {{ row.pending_transactions }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="expired_transactions"
          :label="$t('reports.expired')"
          width="100"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.expired_transactions }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="success_rate"
          :label="$t('reports.successRate')"
          width="150"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-progress
              :percentage="row.success_rate"
              :color="getProgressColor(row.success_rate)"
              :show-text="false"
            />
            <span class="text-xs">{{ row.success_rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="failed_rate"
          :label="$t('reports.failedRate')"
          width="140"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <span class="text-red-600">{{ row.failed_rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="total_revenue"
          :label="$t('reports.revenue')"
          width="180"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="font-bold text-indigo-600"
              >${{ row.total_revenue?.toFixed(2) }}</span
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="revenue_contribution_percentage"
          :label="$t('reports.revenueContribution')"
          width="180"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-progress
              :percentage="row.revenue_contribution_percentage"
              :color="getProgressColor(row.revenue_contribution_percentage)"
              :show-text="false"
            />
            <span class="text-xs"
              >{{ row.revenue_contribution_percentage }}%</span
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="avg_transaction_value"
          :label="$t('reports.avgTransactionValue')"
          width="200"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span>${{ row.avg_transaction_value?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="first_transaction_date"
          :label="$t('reports.firstTransactionDate')"
          width="180"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <span v-if="row.first_transaction_date">
              {{ formatDate(row.first_transaction_date) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="last_transaction_date"
          :label="$t('reports.lastTransactionDate')"
          width="180"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <span v-if="row.last_transaction_date">
              {{ formatDate(row.last_transaction_date) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import {
  ArrowLeft,
  Download,
  DocumentCopy,
  InfoFilled,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import reportService from "@/services/reportService";
import { exportToCSV, exportToExcel, printTable } from "@/utils/exportUtils";
import dayjs from "dayjs";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";

const { t } = useI18n();
const appStore = useAppStore();
const loading = ref(false);
const reportData = ref([]);
const dateRange = ref([]);

const filters = reactive({
  dateFrom: "",
  dateTo: "",
});

// Computed properties for summary
const totalTransactions = computed(() => {
  return reportData.value.reduce(
    (sum, item) => sum + item.total_transactions,
    0,
  );
});

const totalRevenue = computed(() => {
  return reportData.value.reduce((sum, item) => sum + item.total_revenue, 0);
});

const totalSuccessful = computed(() => {
  return reportData.value.reduce(
    (sum, item) => sum + item.successful_transactions,
    0,
  );
});

const totalFailed = computed(() => {
  return reportData.value.reduce(
    (sum, item) => sum + item.failed_transactions,
    0,
  );
});

const totalExpired = computed(() => {
  return reportData.value.reduce(
    (sum, item) => sum + item.expired_transactions,
    0,
  );
});

// Watch for dateRange change to update filters
watch(dateRange, (val) => {
  if (val && val.length === 2) {
    filters.dateFrom = val[0];
    filters.dateTo = val[1];
  } else {
    filters.dateFrom = "";
    filters.dateTo = "";
  }
});

const loadData = async () => {
  loading.value = true;
  try {
    const response =
      await reportService.getPaymentMethodAnalysisReport(filters);
    reportData.value = response.data || [];
  } catch (error) {
    ElMessage.error(t("reports.failedToLoadData"));
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = () => {
  loadData();
};

const getProgressColor = (percentage) => {
  if (percentage >= 80) return "#67C23A";
  if (percentage >= 60) return "#409EFF";
  if (percentage >= 40) return "#E6A23C";
  return "#F56C6C";
};

const formatDate = (date) => {
  if (!date) return "-";
  return dayjs(date).format("YYYY-MM-DD");
};

const handleExport = (type) => {
  const data = reportData.value.map((item) => ({
    [t("reports.paymentMethod")]: item.payment_method,
    [t("reports.totalTransactions")]: item.total_transactions,
    [t("reports.successful")]: item.successful_transactions,
    [t("reports.failed")]: item.failed_transactions,
    [t("reports.pending")]: item.pending_transactions,
    [t("reports.expired")]: item.expired_transactions,
    [t("reports.successRate")]: `${item.success_rate}%`,
    [t("reports.failedRate")]: `${item.failed_rate}%`,
    [t("reports.revenue")]: item.total_revenue,
    [t("reports.revenueContribution")]:
      `${item.revenue_contribution_percentage}%`,
    [t("reports.avgTransactionValue")]: item.avg_transaction_value,
    [t("reports.firstTransactionDate")]: formatDate(
      item.first_transaction_date,
    ),
    [t("reports.lastTransactionDate")]: formatDate(item.last_transaction_date),
  }));

  const filename = `${t("reports.paymentMethodAnalysis")
    .toLowerCase()
    .replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}`;

  if (type === "csv") {
    exportToCSV(data, filename);
  } else if (type === "excel") {
    exportToExcel(data, filename, {
      summary: [
        {
          label: t("reports.totalRevenue") || "Total Revenue",
          value: totalRevenue.value,
        },
      ],
    });
  } else if (type === "pdf") {
    const pdfData = reportData.value.map((item) => ({
      method: item.payment_method,
      transactions: item.total_transactions,
      successful: item.successful_transactions,
      failed: item.failed_transactions,
      pending: item.pending_transactions,
      expired: item.expired_transactions,
      successRate: `${item.success_rate}%`,
      failedRate: `${item.failed_rate}%`,
      revenue: item.total_revenue,
      contribution: `${item.revenue_contribution_percentage}%`,
      avgValue: item.avg_transaction_value,
      firstDate: formatDate(item.first_transaction_date),
      lastDate: formatDate(item.last_transaction_date),
    }));

    const columns = [
      { header: t("reports.paymentMethod"), dataKey: "method" },
      { header: t("reports.totalTransactions"), dataKey: "transactions" },
      { header: t("reports.successful"), dataKey: "successful" },
      { header: t("reports.failed"), dataKey: "failed" },
      { header: t("reports.pending"), dataKey: "pending" },
      { header: t("reports.expired"), dataKey: "expired" },
      { header: t("reports.successRate"), dataKey: "successRate" },
      { header: t("reports.failedRate"), dataKey: "failedRate" },
      { header: t("reports.revenue"), dataKey: "revenue" },
      { header: t("reports.revenueContribution"), dataKey: "contribution" },
      { header: t("reports.avgTransactionValue"), dataKey: "avgValue" },
      { header: t("reports.firstTransactionDate"), dataKey: "firstDate" },
      { header: t("reports.lastTransactionDate"), dataKey: "lastDate" },
    ];
    printTable(pdfData, columns, t("reports.paymentMethodAnalysis"), {
      summary: [
        {
          label: t("reports.totalRevenue") || "Total Revenue",
          value: totalRevenue.value,
        },
      ],
    });
  }
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("nav.reportsNav"), path: "/admin/reports" },
    {
      title: t("reports.paymentMethodAnalysis"),
      path: "/admin/reports/payment-methods",
    },
  ]);
  loadData();
});
</script>

<style scoped>
.payment-analysis-report {
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

.filters-section {
  background-color: var(--el-fill-color-blank);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  width: 100%;
}

@media (max-width: 1200px) {
  .summary-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}

.summary-card {
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--el-border-color-lighter);
}

.card-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
}

:deep(.el-card__header) {
  padding: 20px 30px;
}

:deep(.el-table th.el-table__cell) {
  padding: 12px 0;
  background-color: var(--el-fill-color-light);
}

:deep(.el-table .cell) {
  white-space: nowrap;
}

.info-section {
  border-left: 4px solid #409eff;
}
</style>
