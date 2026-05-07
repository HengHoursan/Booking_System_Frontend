<template>
  <div class="seats-list">
    <!-- Page Header -->
    <div class="page-header">
      <h2>{{ $t("seats.seatBookingHistory") }}</h2>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" class="filter-form">
        <el-form-item :label="$t('showtimes.showDate')">
          <el-date-picker
            v-model="filters.show_date"
            type="date"
            :placeholder="$t('showtimes.showDate') || 'Select Show Date'"
            clearable
            style="width: 160px"
            value-format="YYYY-MM-DD"
            @change="onDateChange"
          />
        </el-form-item>

        <el-form-item :label="$t('theaters.theater')">
          <el-select 
            v-model="filters.theater_id" 
            :placeholder="$t('theaters.selectTheater')"
            clearable
            style="width: 200px"
            @change="onTheaterChange"
          >
            <el-option
              v-for="theater in theaters"
              :key="theater.id"
              :label="theater.name"
              :value="theater.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('halls.hall')">
          <el-select 
            v-model="filters.hall_id" 
            :placeholder="$t('halls.selectHall')"
            clearable
            :disabled="!filters.theater_id"
            style="width: 160px"
            @change="loadShowtimes"
          >
            <el-option
              v-for="hall in halls"
              :key="hall.id"
              :label="hall.hall_name"
              :value="hall.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Visual Showtime Picker -->
    <el-card class="showtime-picker-card" shadow="never">
      <div class="showtime-section-header">
        <div class="showtime-label">
          <el-icon><Clock /></el-icon>
          <span>{{ $t('showtimes.pastShowtimes') || 'Past Showtimes' }}:</span>
        </div>
      </div>

      <!-- Horizontal Scrollable List -->
      <div v-loading="loading.showtimes" class="showtime-list-container">
        <div v-if="showtimeList.length > 0" class="showtime-horizontal-scroll">
          <div
            v-for="showtime in showtimeList"
            :key="showtime.id"
            class="showtime-card"
            :class="{ 'is-active': filters.showtimeId === showtime.id }"
            @click="selectShowtime(showtime.id)"
          >
            <div class="card-time">{{ showtime.start_time }}</div>
            <div class="card-movie" :title="showtime.movie_title">{{ showtime.movie_title }}</div>
            <div class="card-hall">{{ showtime.hall_name }}</div>
          </div>
        </div>
        <div v-else class="no-showtimes">
          <el-icon class="empty-icon"><Calendar /></el-icon>
          <p>{{ $t('dashboard.noShowtimesToday') }}</p>
        </div>
      </div>
    </el-card>

    <!-- Occupancy Stats -->
    <div v-if="filters.showtimeId" class="occupancy-stats animate-in">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">{{ $t('dashboard.totalCapacity') }}</div>
            <div class="stat-value">{{ occupancy.total }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card booked">
            <div class="stat-label">{{ $t('dashboard.bookedSeats') }}</div>
            <div class="stat-value">{{ occupancy.booked }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card free">
            <div class="stat-label">{{ $t('dashboard.freeSeats') }}</div>
            <div class="stat-value">{{ occupancy.free }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card" :class="{ 'is-full': occupancy.isFull }">
            <div class="stat-label">{{ $t('bookings.occupancy') }}</div>
            <div class="stat-value">{{ occupancy.isFull ? $t('bookings.full') : occupancy.percent + '%' }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- Visual Layout Preview -->
    <el-card v-if="filters.showtimeId" shadow="never" class="mt-4">
      <SeatLayoutPreview 
        :showtime-id="filters.showtimeId" 
        hide-header
        readonly 
      />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { showtimeService } from "@/services/showtimeService";
import { theaterService } from "@/services/theaterService";
import { hallService } from "@/services/hallService";
import { seatBookingService } from "@/services/seatBookingService";
import { useAppStore } from "@/stores/app";
import { formatDate, toLocalPhone } from "@/utils/formatters";
import { Search, Phone, ChatLineSquare, Calendar, Clock } from "@element-plus/icons-vue";
import SeatLayoutPreview from "@/components/dashboard/SeatLayoutPreview.vue";
import { seatService } from "@/services/seatService";
import dayjs from "dayjs";

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();

// ... existing code ...

const viewBooking = (bookingId) => {
  if (bookingId) {
    router.push({ name: "BookingDetail", params: { id: bookingId } });
  }
};

// ... existing code ...

// Reactive data
const loading = reactive({
  showtimes: false,
  seatBookingHistory: false,
});
const seatBookingHistory = ref([]);
const showtimeList = ref([]);
const selectedDateFilter = ref("today");
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));
const theaters = ref([]);
const halls = ref([]);

const filters = reactive({
  showtimeId: "",
  show_date: dayjs().format("YYYY-MM-DD"),
  theater_id: "",
  hall_id: "",
});

const occupancy = reactive({
  total: 0,
  booked: 0,
  free: 0,
  percent: 0,
  isFull: false
});

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
const seatBookingActions = ref([
  { value: "booked", label: "Booked" },
  // { value: "locked", label: "Locked" },
  { value: "failed", label: "Failed" },
]);
const seatTypes = ref([
  { value: "regular", label: "Regular" },
  { value: "vip", label: "VIP" },
  { value: "queen", label: "Queen" },
  { value: "couple", label: "Couple" },
]);
const pagination = reactive({
  currentPage: 1,
  perPage: 10,
  total: 0,
});

// Load filter data
const loadTheaters = async () => {
  try {
    const response = await theaterService.getTheaters({ status: "active" });
    theaters.value = response.data || [];
  } catch (error) {
    console.error("Failed to load theaters:", error);
  }
};

const loadHalls = async (theaterId) => {
  if (!theaterId) {
    halls.value = [];
    return;
  }
  try {
    const response = await hallService.getHalls({ theater_id: theaterId });
    halls.value = response.data || [];
  } catch (error) {
    console.error("Failed to load halls:", error);
  }
};

const loadShowtimes = async () => {
  loading.showtimes = true;
  try {
    const response = await showtimeService.getShowtimes({
      show_date: filters.show_date,
      theater_id: filters.theater_id || undefined,
      hall_id: filters.hall_id || undefined,
      per_page: 50,
      sort_by: "start_time",
      sort_order: "asc",
    });
    showtimeList.value = response.data || [];
    
    // Clear selected showtime if it's no longer in the list
    if (filters.showtimeId && !showtimeList.value.find(s => s.id === filters.showtimeId)) {
      filters.showtimeId = "";
    }
  } catch (error) {
    console.error("Failed to load showtimes:", error);
  } finally {
    loading.showtimes = false;
  }
};

const onTheaterChange = (val) => {
  filters.hall_id = "";
  loadHalls(val);
  loadShowtimes();
};

const calculateOccupancy = async (showtimeId) => {
  const showtime = showtimeList.value.find(s => s.id === showtimeId);
  if (!showtime) return;

  try {
    const [bookedResponse, allSeatsResponse] = await Promise.all([
      seatBookingService.getSeatBookings({
        showtimeId,
        status: "booked",
        limit: 1,
      }),
      seatService.getSeatsByHall(showtime.hall_id, { per_page: 100 })
    ]);

    occupancy.booked = bookedResponse.total || 0;
    occupancy.total = allSeatsResponse.data.length || 0;
    occupancy.free = occupancy.total - occupancy.booked;
    occupancy.percent = occupancy.total > 0 ? Math.round((occupancy.booked / occupancy.total) * 100) : 0;
    occupancy.isFull = occupancy.total > 0 && occupancy.booked >= occupancy.total;
  } catch (e) {
    console.error("Failed to calculate occupancy:", e);
  }
};

const onDateChange = (val) => {
  if (val) {
    loadShowtimes();
  }
};

const selectShowtime = (id) => {
  filters.showtimeId = id;
  calculateOccupancy(id);
  handleFilterChange();
};

// Main data loading
const loadSeatBookingHistory = async () => {
  loading.seatBookingHistory = true;
  try {
    const params = {
      page: pagination.currentPage,
      limit: pagination.per_page,
      showtimeId: filters.showtimeId || undefined,
      seat_type: filters.seat_type || undefined,
      search: filters.search || undefined,
      page: pagination.currentPage,
      limit: pagination.perPage,
      action: filters.action || undefined,
      show_date: filters.show_date || undefined,
      start_time: filters.start_time || undefined,
    };
    const response = await seatBookingService.getSeatBookingHistory(params);
    if (response.data) {
      seatBookingHistory.value = response.data.histories.map(h => ({
        ...h,
        action: h.action === 'expired' ? 'failed' : h.action
      }));
      console.log(seatBookingHistory.value);
      pagination.currentPage = response.data.pagination.currentPage;
      pagination.perPage = response.data.pagination.limit;
      pagination.total = response.data.pagination.totalCount;
    } else {
      seatBookingHistory.value = [];
      Object.assign(pagination, { currentPage: 1, perPage: 10, total: 0 });
    }
  } catch (error) {
    console.error("Load seat booking history error:", error);
    ElMessage.error(
      error.response?.data?.message || t("errors.loadDataFailed"),
    );
    seatBookingHistory.value = [];
    Object.assign(pagination, { currentPage: 1, perPage: 10, total: 0 });
  } finally {
    loading.seatBookingHistory = false;
  }
};
const handleFilterChange = () => {
  pagination.currentPage = 1;
  loadSeatBookingHistory();
};

// Pagination handlers
const handleSizeChange = (val) => {
  pagination.perPage = val;
  pagination.currentPage = 1;
  loadSeatBookingHistory();
};

const handleCurrentChange = (val) => {
  pagination.currentPage = val;
  loadSeatBookingHistory();
};

// Color getters
const getActionColor = (action) => {
  const colors = {
    booked: "info",
    locked: "warning",
    failed: "danger",
  };
  return colors[action] || "";
};

const getSeatTypeColor = (type) => {
  const colors = {
    regular: "",
    vip: "warning",
    queen: "success",
    recliner: "info",
  };
  return colors[type] || "";
};
// Watchers (autoload when filters change)
watch(
  () => [
    filters.search,
    filters.action,
    filters.showtimeId,
    filters.show_date,
    filters.start_time,
    filters.seat_type,
  ],
  () => {
    pagination.currentPage = 1;
    loadSeatBookingHistory();
  },
  { deep: true },
);

// Lifecycle
onMounted(() => {
  loadTheaters();
  loadShowtimes();
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    {
      title: t("seats.seatBookingHistory"),
      path: "/admin/seat-booking-history",
    },
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

.filter-card {
  margin-bottom: 10px;
}

.filter-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 0;
}

.seat-tags,
.seat-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.seat-tag {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-8);
}

.type-tag {
  font-weight: 500;
}
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Occupancy Stats */
.occupancy-stats {
  margin-bottom: 20px;
}

.stat-card {
  background: var(--el-bg-color);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  font-weight: bold;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.stat-card.booked .stat-value {
  color: var(--el-color-primary);
}

.stat-card.free .stat-value {
  color: var(--el-color-success);
}

.stat-card.is-full {
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-5);
}

.stat-card.is-full .stat-value {
  color: var(--el-color-danger);
}

.grid-view-container {
  margin-top: 10px;
}

/* Animations */
.animate-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Showtime Picker Styling */
.showtime-picker-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.showtime-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.showtime-label .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.showtime-section-header {
  margin-bottom: 12px;
}

.showtime-list-container {
  min-height: 60px;
}

.showtime-horizontal-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 8px 2px;
  scrollbar-width: thin;
}

.showtime-horizontal-scroll::-webkit-scrollbar {
  height: 6px;
}

.showtime-horizontal-scroll::-webkit-scrollbar-thumb {
  background: var(--el-border-color-lighter);
  border-radius: 3px;
}

.showtime-card {
  flex: 0 0 130px;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.showtime-card:hover {
  background: var(--el-fill-color);
  transform: translateY(-1px);
}

.showtime-card.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}

.card-time {
  font-size: 16px;
  font-weight: 800;
  color: var(--el-color-primary);
  margin-bottom: 2px;
}

.card-movie {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 1px;
}

.card-hall {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.no-showtimes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 4px;
  opacity: 0.5;
}
</style>
