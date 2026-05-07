<template>
  <div class="showtime-utilization-report">
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
              {{ $t("reports.showtimeUtilization") }}
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

      <!-- Table -->
      <el-table
        :data="reportData"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column type="index" label="#" width="60" />
        <el-table-column
          prop="showtime_date"
          :label="$t('reports.showtimeDate')"
          width="180"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <span>{{ formatDate(row.showtime_date) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="start_time"
          :label="$t('reports.startTime')"
          width="120"
          align="center"
        />
        <el-table-column
          prop="end_time"
          :label="$t('reports.endTime')"
          width="120"
          align="center"
        />
        <el-table-column
          prop="movie_title"
          :label="$t('reports.movieTitle')"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column
          prop="theater_name"
          :label="$t('reports.theater')"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="hall_name"
          :label="$t('reports.hall')"
          width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="total_seats_available"
          :label="$t('reports.totalSeatsAvailable')"
          width="180"
          align="center"
          sortable
        />
        <el-table-column
          prop="seats_booked"
          :label="$t('reports.seatsBooked')"
          width="160"
          align="center"
          sortable
        />
        <el-table-column
          prop="seats_available"
          :label="$t('reports.seatsAvailable')"
          width="150"
          align="center"
          sortable
        />
        <el-table-column
          prop="occupancy_rate"
          :label="$t('reports.occupancyRate')"
          width="160"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-progress
              :percentage="row.occupancy_rate"
              :color="getProgressColor(row.occupancy_rate)"
              :show-text="false"
            />
            <span class="text-xs">{{ row.occupancy_rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="total_revenue"
          :label="$t('reports.revenue')"
          width="160"
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
          prop="revenue_per_seat"
          :label="$t('reports.revenuePerSeat')"
          width="170"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span>${{ row.revenue_per_seat?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="booking_count"
          :label="$t('reports.bookingCount')"
          width="140"
          align="center"
          sortable
        />
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
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
const total = ref(0);
const dateRange = ref([]);

const filters = reactive({
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 10,
});

// Watch for filter changes
watch(
  () => ({ ...filters }),
  (newFilters, oldFilters) => {
    const filterChanged =
      newFilters.dateFrom !== oldFilters.dateFrom ||
      newFilters.dateTo !== oldFilters.dateTo;

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
    const response = await reportService.getShowtimeUtilizationReport(filters);
    reportData.value = response.data || [];
    total.value = response.total || 0;
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

const formatDate = (date) => {
  if (!date) return "-";
  return dayjs(date).format("YYYY-MM-DD");
};

const getProgressColor = (percentage) => {
  if (percentage >= 80) return "#67C23A";
  if (percentage >= 60) return "#409EFF";
  if (percentage >= 40) return "#E6A23C";
  return "#F56C6C";
};

const handleExport = (type) => {
  const data = reportData.value.map((item) => ({
    [t("reports.showtimeDate")]: formatDate(item.showtime_date),
    [t("reports.startTime")]: item.start_time,
    [t("reports.endTime")]: item.end_time,
    [t("reports.movieTitle")]: item.movie_title,
    [t("reports.theater")]: item.theater_name,
    [t("reports.hall")]: item.hall_name,
    [t("reports.totalSeatsAvailable")]: item.total_seats_available,
    [t("reports.seatsBooked")]: item.seats_booked,
    [t("reports.seatsAvailable")]: item.seats_available,
    [t("reports.occupancyRate")]: `${item.occupancy_rate}%`,
    [t("reports.revenue")]: item.total_revenue,
    [t("reports.revenuePerSeat")]: item.revenue_per_seat,
    [t("reports.bookingCount")]: item.booking_count,
  }));

  const filename = `${t("reports.showtimeUtilization")
    .toLowerCase()
    .replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}`;

  if (type === "csv") {
    exportToCSV(data, filename);
  } else if (type === "excel") {
    const totalRevenue = reportData.value.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    exportToExcel(data, filename, {
      summary: [
        { label: t("reports.revenue") || "Total Revenue", value: totalRevenue }
      ]
    });
  } else if (type === "pdf") {
    const pdfData = reportData.value.map((item) => ({
      date: formatDate(item.showtime_date),
      startTime: item.start_time,
      endTime: item.end_time,
      movie: item.movie_title,
      theater: item.theater_name,
      hall: item.hall_name,
      totalSeats: item.total_seats_available,
      booked: item.seats_booked,
      available: item.seats_available,
      occupancy: `${item.occupancy_rate}%`,
      revenue: item.total_revenue,
      revenuePerSeat: item.revenue_per_seat,
      bookings: item.booking_count,
    }));

    const columns = [
      { header: t("reports.showtimeDate"), dataKey: "date" },
      { header: t("reports.startTime"), dataKey: "startTime" },
      { header: t("reports.endTime"), dataKey: "endTime" },
      { header: t("reports.movieTitle"), dataKey: "movie" },
      { header: t("reports.theater"), dataKey: "theater" },
      { header: t("reports.hall"), dataKey: "hall" },
      { header: t("reports.totalSeatsAvailable"), dataKey: "totalSeats" },
      { header: t("reports.seatsBooked"), dataKey: "booked" },
      { header: t("reports.seatsAvailable"), dataKey: "available" },
      { header: t("reports.occupancyRate"), dataKey: "occupancy" },
      { header: t("reports.revenue"), dataKey: "revenue" },
      { header: t("reports.revenuePerSeat"), dataKey: "revenuePerSeat" },
      { header: t("reports.bookingCount"), dataKey: "bookings" },
    ];
    const totalRevenue = reportData.value.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    printTable(pdfData, columns, t("reports.showtimeUtilization"), {
      summary: [
        { label: t("reports.revenue") || "Total Revenue", value: totalRevenue }
      ]
    });
  }
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("nav.reportsNav"), path: "/admin/reports" },
    { title: t("reports.showtimeUtilization"), path: "/admin/reports/showtimes" },
  ]);
  loadData();
});
</script>

<style scoped>
.showtime-utilization-report {
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

.pagination-section {
  display: flex;
  justify-content: flex-end;
}

.info-section {
  border-left: 4px solid #409eff;
}
</style>
