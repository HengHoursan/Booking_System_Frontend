<template>
  <div class="detailed-report">
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
              {{
                $t("reports.bookingReportDetailed") || "Detailed Booking Report"
              }}
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
          <el-form-item :label="$t('reports.status')">
            <el-select
              v-model="filters.booking_status"
              :placeholder="$t('reports.allStatuses')"
              clearable
              @change="handleFilterChange"
              style="width: 240px"
            >
              <el-option :label="$t('reports.allStatuses')" value="" />
              <el-option :label="$t('bookings.pending')" value="Pending" />
              <el-option :label="$t('bookings.completed')" value="Completed" />
              <el-option :label="$t('bookings.expired')" value="Expired" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('customers.customerType')">
            <el-select
              v-model="filters.customerType"
              :placeholder="$t('customers.allCustomers')"
              clearable
              style="width: 240px"
            >
              <el-option :label="$t('customers.allTypes')" value="" />
              <el-option :label="$t('customers.member')" value="member" />
              <el-option :label="$t('customers.walkin')" value="walkin" />
              <!-- <el-option :label="$t('customers.guest')" value="guest" /> -->
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <!-- Table -->
      <el-table
        :data="reportData"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column
          prop="booking_date"
          :label="$t('reports.date')"
          width="160"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.booking_date) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="reference_code"
          :label="$t('reports.ref')"
          width="120"
        />
        <el-table-column
          prop="customer_name"
          :label="$t('reports.customer')"
          min-width="150"
        />
        <el-table-column
          prop="movie_title"
          :label="$t('reports.movie')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="booking_status"
          :label="$t('reports.status')"
          width="130"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.booking_status)">{{
              $t(`bookings.${row.booking_status.toLowerCase()}`)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="seat_count"
          :label="$t('reports.seats')"
          width="80"
          align="center"
        />
        <el-table-column
          prop="total_price"
          :label="$t('reports.total')"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            <span class="font-bold">${{ row.total_price?.toFixed(2) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-section mt-6 flex justify-end">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.limit"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>

      <!-- <div
        class="summary-footer mt-6 p-4 bg-gray-50 rounded-lg flex justify-between items-center"
      >
        <span class="text-gray-600"
          >{{ $t("reports.totalBookings") }}:
          <strong class="text-black">{{ reportData.length }}</strong></span
        >
        <span class="text-xl font-bold text-green-600">
          {{ $t("reports.totalValue") }}: ${{ totalValue.toFixed(2) }}
        </span>
      </div> -->
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { ArrowLeft, Download, DocumentCopy, Search } from "@element-plus/icons-vue";
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
  booking_status: "",
  customerType: "",
  page: 1,
  limit: 10,
});

const total = ref(0);

const totalValue = computed(() => {
  return reportData.value.reduce(
    (sum, item) => sum + (item.total_price || 0),
    0,
  );
});

const formatDateTime = (date) => {
  return dayjs(date).format("YYYY-MM-DD HH:mm");
};

const getStatusTag = (status) => {
  const tags = {
    Completed: "success",
    Pending: "warning",
    Expired: "danger",
  };
  return tags[status] || "";
};

// Watch for filter changes
watch(
  () => ({ ...filters }),
  (newFilters, oldFilters) => {
    // If any filter other than page/limit changed, reset to page 1
    const filterChanged =
      newFilters.dateFrom !== oldFilters.dateFrom ||
      newFilters.dateTo !== oldFilters.dateTo ||
      newFilters.booking_status !== oldFilters.booking_status ||
      newFilters.customerType !== oldFilters.customerType;

    if (filterChanged && filters.page !== 1) {
      filters.page = 1;
      return;
    }
    loadData();
  },
  { deep: true },
);

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
    const response = await reportService.getDetailedBookingReport(filters);
    reportData.value = response.data || [];
    total.value = response.total || 0;
  } catch (error) {
    ElMessage.error("Failed to load booking data");
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleExport = (type) => {
  const data = reportData.value.map((item) => ({
    [t("dashboard.date")]: formatDateTime(item.booking_date),
    [t("dashboard.ref")]: item.reference_code,
    [t("dashboard.customer")]: item.customer_name,
    [t("dashboard.movie")]: item.movie_title,
    [t("dashboard.status")]: t(`bookings.${item.booking_status.toLowerCase()}`),
    [t("dashboard.seats")]: item.seat_count,
    [t("dashboard.total")]: item.total_price,
  }));

  const filename = `${t("dashboard.bookingReport")
    .toLowerCase()
    .replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}`;

  if (type === "csv") {
    exportToCSV(data, filename);
  } else if (type === "excel") {
    exportToExcel(data, filename, {
      summary: [
        { label: t("reports.totalValue") || "Total Value", value: totalValue.value }
      ]
    });
  } else if (type === "pdf") {
    const pdfData = reportData.value.map((item) => ({
      date: formatDateTime(item.booking_date),
      ref: item.reference_code,
      customer: item.customer_name,
      movie: item.movie_title,
      status: t(`bookings.${item.booking_status.toLowerCase()}`),
      seats: item.seat_count,
      total: item.total_price,
    }));

    const columns = [
      { header: t("dashboard.date"), dataKey: "date" },
      { header: t("dashboard.ref"), dataKey: "ref" },
      { header: t("dashboard.customer"), dataKey: "customer" },
      { header: t("dashboard.movie"), dataKey: "movie" },
      { header: t("dashboard.status"), dataKey: "status" },
      { header: t("dashboard.seats"), dataKey: "seats" },
      { header: t("dashboard.total"), dataKey: "total" },
    ];
    printTable(pdfData, columns, t("dashboard.bookingReportDetailed"), {
      summary: [
        { label: t("reports.totalValue") || "Total Value", value: totalValue.value }
      ]
    });
  }
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("nav.reportsNav"), path: "/admin/reports" },
    { title: t("reports.bookingReport"), path: "/admin/reports/bookings" },
  ]);
  loadData();
});
</script>

<style scoped>
.detailed-report {
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
  width: 100%;
  border: 1px solid var(--el-border-color-lighter);
}
</style>
