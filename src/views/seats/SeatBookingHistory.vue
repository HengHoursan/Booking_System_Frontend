<template>
  <div class="seats-list">
    <!-- Page Header -->
    <div class="page-header">
      <h2>{{ $t("seats.seatBookingHistory") }}</h2>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" class="filter-form">
        <el-form-item>
          <el-input
            v-model="filters.search"
            :placeholder="$t('seats.search')"
            :prefix-icon="Search"
            clearable
            @keyup.enter="loadSeatBookingHistory"
            @clear="loadSeatBookingHistory"
            style="width: 230px"
          />
        </el-form-item>
        <!-- Removed old showtime dropdown -->
        <el-form-item>
          <el-date-picker
            v-model="filters.show_date"
            type="date"
            :placeholder="$t('showtimes.showDate')"
            clearable
            style="width: 200px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <!-- <el-form-item>
          <el-time-picker
            v-model="filters.start_time"
            :placeholder="$t('showtimes.startTime')"
            format="HH:mm"
            value-format="HH:mm"
            clearable
            style="width: 150px"
          />
        </el-form-item> -->

        <el-form-item>
          <el-select
            v-model="filters.action"
            clearable
            :placeholder="$t('seats.filterByStatus')"
            @change="handleFilterChange"
            style="min-width: 200px"
          >
            <el-option
              v-for="action in seatBookingActions"
              :key="action.value"
              :label="$t(`seats.statuses.${action.value}`)"
              :value="action.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="filters.seat_type"
            :placeholder="$t('seats.filterByType')"
            clearable
            @change="handleFilterChange"
            style="min-width: 200px"
          >
            <el-option
              v-for="type in seatTypes"
              :key="type.value"
              :label="$t(`seats.types.${type.value}`)"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Visual Showtime Picker -->
    <el-card class="showtime-picker-card" shadow="never">
      <div class="picker-header">
        <div class="date-selector">
          <el-radio-group v-model="selectedDateFilter" size="default" @change="onDateFilterChange">
            <el-radio-button label="today">{{ $t('actions.today') || 'Today' }}</el-radio-button>
            <el-radio-button label="tomorrow">{{ $t('actions.tomorrow') || 'Tomorrow' }}</el-radio-button>
          </el-radio-group>
        </div>
        <div class="showtime-label">
          <el-icon><Clock /></el-icon>
          <span>{{ $t('showtimes.title') || 'Showtimes' }}:</span>
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

    <!-- Seats Table -->
    <el-card shadow="never">
      <el-table
        :data="seatBookingHistory"
        v-loading="loading.seatBookingHistory"
        style="width: 100%"
        :element-loading-text="$t('common.loading')"
        :empty-text="$t('messages.noData')"
        row-key="_id"
      >
        <el-table-column
          prop="booking.reference_code"
          :label="$t('bookings.referenceCode')"
          width="150"
        />
        <el-table-column :label="$t('customers.customer')" width="250">
          <template #default="{ row }">
            <div v-if="row.booking">
              <div>
                <strong>
                  {{
                    row.booking.name ||
                    (row.booking.phone
                      ? "Walk-in Customer"
                      : row.booking.email
                        ? "Guest Customer"
                        : "-")
                  }}
                </strong>
              </div>
              <div
                v-if="row.booking.phone"
                class="text-muted"
                style="display: flex; align-items: center; gap: 4px"
              >
                <el-icon><Phone /></el-icon>
                <span>{{ toLocalPhone(row.booking.phone) }}</span>
              </div>
              <div
                v-if="row.booking.email"
                class="text-muted"
                style="display: flex; align-items: center; gap: 4px"
              >
                <el-icon><ChatLineSquare /></el-icon>
                <span>{{ row.booking.email }}</span>
              </div>
              <el-tag
                :type="getCustomerTypeTag(row.booking.customerType)"
                size="small"
                v-if="row.booking.customerType"
                style="margin-top: 4px"
              >
                {{ $t(`customers.${row.booking.customerType}`) }}
              </el-tag>
            </div>
            <div v-else>
              <span class="text-muted">No customer data</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="showtime.movie"
          :label="$t('movies.movieTitle')"
          width="250"
        />
        <el-table-column :label="$t('seats.indentifier')" width="150">
          <template #default="{ row }">
            <div class="seat-tags">
              <el-tag
                v-for="seat in row.seats"
                :key="seat._id"
                size="small"
                effect="plain"
                class="seat-tag"
              >
                {{ seat.seat_identifier }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('seats.type')" width="180">
          <template #default="{ row }">
            <div class="seat-types">
              <el-tag
                v-for="(type, index) in [
                  ...new Set(row.seats.map((s) => s.seat_type)),
                ]"
                :key="index"
                :type="getSeatTypeColor(type)"
                size="small"
                class="type-tag"
              >
                {{ $t(`seats.types.${type}`) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="showtime.show_date"
          :label="$t('showtimes.showDate')"
          width="200"
          ><template #default="{ row }">
            {{ formatDate(row.showtime.show_date) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="showtime.start_time"
          :label="$t('showtimes.startTime')"
          width="200"
        />
        <el-table-column prop="action" :label="$t('seats.status')" width="150">
          <template #default="{ row }">
            <el-tag :type="getActionColor(row.action)">
              {{ $t(`seats.statuses.${row.action}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- <el-table-column :label="$t('common.actions')" fixed="right" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.booking"
              size="small"
              type="primary"
              plain
              @click="viewBooking(row.booking._id)"
            >
              {{ $t('actions.view') }}
            </el-button>
          </template>
        </el-table-column> -->
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.perPage"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { showtimeService } from "@/services/showtimeService";
import { seatBookingService } from "@/services/seatBookingService";
import { useAppStore } from "@/stores/app";
import { formatDate, toLocalPhone } from "@/utils/formatters";
import { Search, Phone, ChatLineSquare, Calendar, Clock } from "@element-plus/icons-vue";
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

const filters = reactive({
  search: "",
  action: "",
  showtimeId: "",
  seat_type: "",
  show_date: "",
  start_time: "",
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
const loadShowtimes = async () => {
  loading.showtimes = true;
  try {
    const response = await showtimeService.getShowtimes({
      show_date: selectedDate.value,
      status: "scheduled",
      forBooking: true,
      per_page: 50,
      sort_by: "start_time",
      sort_order: "asc",
    });
    showtimeList.value = response.data || [];
  } catch (error) {
    console.error("Failed to load showtimes:", error);
  } finally {
    loading.showtimes = false;
  }
};

const onDateFilterChange = (val) => {
  if (val === "today") {
    selectedDate.value = dayjs().format("YYYY-MM-DD");
    loadShowtimes();
  } else if (val === "tomorrow") {
    selectedDate.value = dayjs().add(1, "day").format("YYYY-MM-DD");
    loadShowtimes();
  }
};

const selectShowtime = (id) => {
  if (filters.showtimeId === id) {
    filters.showtimeId = ""; // Toggle off if clicked again
  } else {
    filters.showtimeId = id;
  }
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
onMounted(async () => {
  await loadShowtimes();
  await loadSeatBookingHistory();
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
