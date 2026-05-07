<template>
  <div class="seats-list">
    <!-- Page Header -->
    <div class="page-header">
      <h2>{{ $t("seats.seatBooking") }}</h2>
    </div>

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
        <div v-if="showtimes.length > 0" class="showtime-horizontal-scroll">
          <div
            v-for="showtime in showtimes"
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

    <!-- Grid View (Visual Layout) -->
    <div class="grid-view-container">
      <SeatLayoutPreview
        :showtime-id="filters.showtimeId"
        hide-header
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { showtimeService } from "@/services/showtimeService";
import { useAppStore } from "@/stores/app";
import SeatLayoutPreview from "@/components/dashboard/SeatLayoutPreview.vue";
import { Calendar, Clock } from "@element-plus/icons-vue";
import dayjs from "dayjs";

const { t } = useI18n();
const appStore = useAppStore();

// Reactive data
const loading = reactive({
  showtimes: false,
});
const showtimes = ref([]);
const selectedDateFilter = ref("today");
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));

const filters = reactive({
  showtimeId: "",
});

// Load full showtimes for the picker
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
    showtimes.value = response.data || [];
    
    // Auto-select first showtime if none selected
    if (showtimes.value.length > 0 && !filters.showtimeId) {
      filters.showtimeId = showtimes.value[0].id;
    } else if (showtimes.value.length === 0) {
      filters.showtimeId = "";
    }
  } catch (error) {
    console.error("Failed to load showtimes:", error);
    ElMessage.error(t("errors.loadDataFailed"));
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
  filters.showtimeId = id;
};

const handleFilterChange = () => {
  // Handled by selectShowtime
};

// Lifecycle
onMounted(async () => {
  await loadShowtimes();
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("seats.seatBooking"), path: "/admin/seat-booking" },
  ]);
});
</script>

<style scoped>
.seats-list {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

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
  padding: 40px;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.grid-view-container {
  margin-top: 10px;
}
</style>
