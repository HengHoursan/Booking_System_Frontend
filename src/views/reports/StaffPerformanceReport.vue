<template>
  <div class="staff-performance-report">
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
              {{ $t("reports.staffPerformance") }}
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
      <div class="filters mb-6">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="To"
              :start-placeholder="$t('reports.startDate')"
              :end-placeholder="$t('reports.endDate')"
              @change="loadData"
            />
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-button type="primary" @click="loadData" :icon="Search">
              {{ $t("reports.search") }}
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- Staff Performance Table -->
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        style="width: 100%"
        :default-sort="{ prop: 'total_revenue_generated', order: 'descending' }"
      >
        <el-table-column type="index" label="#" width="60" />
        <el-table-column
          prop="staff_name"
          :label="$t('reports.staffName')"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="staff_email"
          :label="$t('reports.email')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="staff_role"
          :label="$t('reports.role')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag size="small">{{ row.staff_role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="total_bookings_processed"
          :label="$t('reports.totalBookingsProcessed')"
          width="150"
          align="center"
          sortable
        />
        <el-table-column
          prop="total_revenue_generated"
          :label="$t('reports.totalRevenueGenerated')"
          width="160"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="font-bold text-indigo-600"
              >${{ row.total_revenue_generated?.toFixed(2) || 0 }}</span
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="avg_booking_value"
          :label="$t('reports.avgBookingValue')"
          width="140"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span>${{ row.avg_booking_value?.toFixed(2) || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="completion_rate"
          :label="$t('reports.completionRate')"
          width="130"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-progress
              :percentage="row.completion_rate || 0"
              :show-text="false"
              color="#67c23a"
            />
            <span class="text-xs">{{ row.completion_rate || 0 }}%</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="expiration_rate"
          :label="$t('reports.expirationRate')"
          width="130"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-progress
              :percentage="row.expiration_rate || 0"
              :show-text="false"
              color="#909399"
            />
            <span class="text-xs">{{ row.expiration_rate || 0 }}%</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="total_seats_sold"
          :label="$t('reports.totalSeatsSold')"
          width="130"
          align="center"
          sortable
        />
        <el-table-column
          prop="completed_bookings"
          :label="$t('reports.completedBookings')"
          width="130"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="success">{{ row.completed_bookings }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="expired_bookings"
          :label="$t('reports.expiredBookings')"
          width="130"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="info">{{ row.expired_bookings }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination mt-6">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  ArrowLeft,
  Download,
  DocumentCopy,
  Search,
  InfoFilled,
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
const dateRange = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const tableData = ref([]);

const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    if (dateRange.value && dateRange.value.length === 2) {
      params.dateFrom = dayjs(dateRange.value[0]).format("YYYY-MM-DD");
      params.dateTo = dayjs(dateRange.value[1]).format("YYYY-MM-DD");
    }

    const response = await reportService.getStaffPerformanceReport(params);
    tableData.value = response.data || [];
    total.value = response.total || 0;
  } catch (error) {
    ElMessage.error(t("reports.failedToLoadData"));
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleExport = (type) => {
  const filename = `${t("reports.staffPerformance")
    .toLowerCase()
    .replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}`;

  if (type === "csv") {
    const data = tableData.value.map((item) => ({
      [t("reports.staffName")]: item.staff_name,
      [t("reports.email")]: item.staff_email,
      [t("reports.role")]: item.staff_role,
      [t("reports.totalBookingsProcessed")]: item.total_bookings_processed,
      [t("reports.totalRevenueGenerated")]: item.total_revenue_generated,
      [t("reports.avgBookingValue")]: item.avg_booking_value,
      [t("reports.completionRate")]: item.completion_rate,
      [t("reports.expirationRate")]: item.expiration_rate,
      [t("reports.totalSeatsSold")]: item.total_seats_sold,
    }));
    exportToCSV(data, filename);
  } else if (type === "excel") {
    const data = tableData.value.map((item) => ({
      [t("reports.staffName")]: item.staff_name,
      [t("reports.email")]: item.staff_email,
      [t("reports.role")]: item.staff_role,
      [t("reports.totalBookingsProcessed")]: item.total_bookings_processed,
      [t("reports.totalRevenueGenerated")]: item.total_revenue_generated,
      [t("reports.avgBookingValue")]: item.avg_booking_value,
      [t("reports.completionRate")]: item.completion_rate,
      [t("reports.expirationRate")]: item.expiration_rate,
      [t("reports.totalSeatsSold")]: item.total_seats_sold,
    }));
    const totalRevenue = tableData.value.reduce((sum, item) => sum + (item.total_revenue_generated || 0), 0);
    exportToExcel(data, filename, {
      summary: [
        { label: t("reports.totalRevenueGenerated") || "Total Revenue", value: totalRevenue }
      ]
    });
  } else if (type === "pdf") {
    const pdfData = tableData.value.map((item) => ({
      name: item.staff_name,
      email: item.staff_email,
      role: item.staff_role,
      bookings: item.total_bookings_processed,
      revenue: item.total_revenue_generated,
      avgValue: item.avg_booking_value,
      completion: item.completion_rate,
      cancellation: item.cancellation_rate,
      seats: item.total_seats_sold,
    }));

    const columns = [
      { header: t("reports.staffName"), dataKey: "name" },
      { header: t("reports.email"), dataKey: "email" },
      { header: t("reports.role"), dataKey: "role" },
      { header: t("reports.totalBookingsProcessed"), dataKey: "bookings" },
      { header: t("reports.totalRevenueGenerated"), dataKey: "revenue" },
      { header: t("reports.avgBookingValue"), dataKey: "avgValue" },
      { header: t("reports.completionRate"), dataKey: "completion" },
      { header: t("reports.expirationRate"), dataKey: "expiration" },
      { header: t("reports.totalSeatsSold"), dataKey: "seats" },
    ];
    const totalRevenue = tableData.value.reduce((sum, item) => sum + (item.total_revenue_generated || 0), 0);
    printTable(pdfData, columns, t("reports.staffPerformance"), {
      summary: [
        { label: t("reports.totalRevenueGenerated") || "Total Revenue", value: totalRevenue }
      ]
    });
  }
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("nav.reportsNav"), path: "/admin/reports" },
    {
      title: t("reports.staffPerformance"),
      path: "/admin/reports/staff-performance",
    },
  ]);
  loadData();
});
</script>

<style scoped>
.staff-performance-report {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--el-fill-color-blank);
  padding: 16px;
  margin: -16px -16px 16px -16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
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

.filters {
  background-color: var(--el-fill-color-blank);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.info-section {
  border-left: 4px solid #409eff;
}
</style>
