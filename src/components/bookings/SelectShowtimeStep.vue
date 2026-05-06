<template>
  <div class="step-content">
    <div class="filter-controls">
      <el-input
        style="width: 650px"
        v-model="showtimeSearch"
        :placeholder="$t('bookings.searchByMovie')"
        clearable
        @input="debouncedLoadShowtimes"
      />
      <div class="date-filter-buttons">
        <el-button
          :type="selectedDateFilter === 'today' ? 'primary' : 'default'"
          @click="selectedDateFilter = 'today'"
        >
          {{ $t("actions.today") }}
        </el-button>
        <el-button
          :type="selectedDateFilter === 'tomorrow' ? 'primary' : 'default'"
          @click="selectedDateFilter = 'tomorrow'"
        >
          {{ $t("actions.tomorrow") }}
        </el-button>
      </div>
    </div>

    <div
      v-if="loading.showtimes"
      v-loading="loading.showtimes"
      style="min-height: 200px"
    ></div>
    <div v-else class="showtime-list">
      <div v-if="showtimeOptions.length > 0" class="schedule-list">
        <div
          v-for="(showtime, index) in showtimeOptions"
          :key="showtime.id"
          @click="!isFull(showtime) && selectShowtime(showtime)"
          class="schedule-item animate-in"
          :class="{ 
            'is-active': modelValue?.id === showtime.id,
            'is-disabled': isFull(showtime)
          }"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- Time column -->
          <div class="time-col">
            <div class="time-start">{{ showtime.start_time }}</div>
          </div>

          <!-- Movie poster -->
          <el-image
            v-if="showtime.movie_poster"
            :src="showtime.movie_poster"
            fit="cover"
            class="movie-thumb"
          >
            <template #error>
              <div class="thumb-fallback">
                <el-icon><Film /></el-icon>
              </div>
            </template>
          </el-image>

          <!-- Info -->
          <div class="showtime-info">
            <div class="movie-title" :title="showtime.movie_title">
              {{ showtime.movie_title }}
            </div>
            <div class="meta-row">
              <el-icon class="meta-icon"><MapPin /></el-icon>
              <span class="meta-text">{{ showtime.theater_name }} • {{ showtime.hall_name }}</span>
            </div>
          </div>

          <!-- Occupancy column -->
          <div class="occupancy-col">
            <div class="occupancy-labels">
              <span class="occupancy-text">
                <el-icon style="vertical-align: text-bottom; margin-right: 4px;"><Ticket /></el-icon>
                {{ showtime.bookedCount }} / {{ showtime.totalCount }} {{ $t("bookings.seats") }}
              </span>
              <span
                class="occupancy-percentage"
                :class="{ 'high-occupancy': showtime.occupancy > 0.9 }"
              >
                {{ Math.round(showtime.occupancy * 100) }}%
              </span>
            </div>
            <div class="progress-bar-background">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${showtime.occupancy * 100}%`,
                  backgroundColor: getProgressBarColor(showtime.occupancy),
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-showtimes-placeholder">
        <div class="placeholder-icon-container">
          <el-icon :size="40"><Search /></el-icon>
        </div>
        <h3 class="placeholder-title">{{ $t("bookings.noShowtimesFound") }}</h3>
        <p class="placeholder-subtitle">
          {{ $t("bookings.tryAdjustingFilters") }}
        </p>
        <el-button
          link
          type="primary"
          @click="showtimeSearch = ''"
          class="clear-filters-button"
        >
          {{ $t("bookings.clearAllFilters") }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { Film } from "@element-plus/icons-vue";
import { Calendar, Clock, MapPin, Ticket, Search } from "lucide-vue-next";
import { showtimeService } from "@/services/showtimeService";
import { seatService } from "@/services/seatService";
import { seatBookingService } from "@/services/seatBookingService";
import { formatDate } from "@/utils/formatters";

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  activeStep: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["update:modelValue"]);

const { t } = useI18n();

const loading = reactive({
  showtimes: false,
});

const showtimeOptions = ref([]);
const showtimeSearch = ref("");
const selectedDateFilter = ref("today");

const loadShowtimes = async () => {
  loading.showtimes = true;
  try {
    const params = {
      search: showtimeSearch.value,
      forBooking: true,
      per_page: 10,
      sort_by: "start_time",
      sort_order: "asc",
    };

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (selectedDateFilter.value === "today") {
      params.show_date = today.toISOString().split("T")[0];
    } else if (selectedDateFilter.value === "tomorrow") {
      params.show_date = tomorrow.toISOString().split("T")[0];
    }
    const response = await showtimeService.getShowtimes(params);
    if (response && response.data) {
      const showtimesWithOccupancy = await Promise.all(
        response.data.map(async (showtime) => {
          try {
            const bookedSeatsResponse =
              await seatBookingService.getSeatBookings({
                showtimeId: showtime.id,
                status: "booked",
                limit: 1,
              });
            const bookedCount = bookedSeatsResponse.total || 0;

            const allSeatsResponse = await seatService.getSeatsByHall(
              showtime.hall_id,
              { per_page: 100 },
            );
            const totalCount = allSeatsResponse.data.length || 0;

            const occupancy = totalCount > 0 ? bookedCount / totalCount : 0;
            return {
              ...showtime,
              occupancy,
              bookedCount,
              totalCount,
            };
          } catch (e) {
            console.error(
              `Failed to load occupancy for showtime ${showtime.id}`,
              e,
            );
            return {
              ...showtime,
              show_date: formatDate(showtime.start_time),
              occupancy: 0,
              bookedCount: "?",
              totalCount: "?",
            };
          }
        }),
      );
      showtimeOptions.value = showtimesWithOccupancy;
    }
  } catch (error) {
    console.error("Failed to load showtimes:", error);
    ElMessage.error(t("errors.loadDataFailed"));
  } finally {
    loading.showtimes = false;
  }
};

let debounceTimer;
const debouncedLoadShowtimes = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadShowtimes();
  }, 300);
};

const isFull = (showtime) => {
  return showtime.totalCount > 0 && showtime.bookedCount >= showtime.totalCount;
};

const selectShowtime = (showtime) => {
  if (props.modelValue?.id === showtime.id) {
    emit("update:modelValue", null);
  } else {
    emit("update:modelValue", showtime);
  }
};

const getProgressBarColor = (occupancy) => {
  if (occupancy > 0.9) {
    return "var(--el-color-danger)";
  } else if (occupancy > 0.7) {
    return "var(--el-color-warning)";
  } else {
    return "var(--el-color-success)";
  }
};

watch(selectedDateFilter, () => {
  loadShowtimes();
});

// Reload showtimes when navigating back to step 0 to refresh seat occupancy
watch(
  () => props.activeStep,
  (newStep, oldStep) => {
    if (newStep === 0 && oldStep !== 0) {
      loadShowtimes();
    }
  },
);

onMounted(() => {
  loadShowtimes();
});
</script>

<style scoped>
.step-content {
  margin: 0px;
  padding: 20px 0;
}

.filter-controls {
  display: flex;
  flex-grow: 1;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 10px;
}

.date-filter-buttons {
  display: flex;
}

/* Schedule List Styles */
.showtime-list {
  width: 100%;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 6px;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: all 0.2s;
}

.schedule-item:hover:not(.is-disabled) {
  background: var(--el-fill-color);
  border-color: var(--el-color-primary-light-5);
  transform: translateX(4px);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.12);
}

.schedule-item.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

/* Disabled/Full Opacity Styling (matches client page) */
.schedule-item.is-disabled {
  opacity: 0.45;
  filter: grayscale(100%);
  cursor: not-allowed;
  border-color: var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

/* Time column */
.time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 46px;
  flex-shrink: 0;
}
.time-start {
  font-size: 15px;
  font-weight: 800;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: "JetBrains Mono", monospace;
}

/* Movie thumbnail */
.movie-thumb {
  width: 48px;
  height: 70px;
  border-radius: 6px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--el-fill-color);
}
.thumb-fallback {
  width: 48px;
  height: 70px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 24px;
}

/* Info */
.showtime-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.movie-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.meta-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  display: inline-flex;
}
.meta-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Occupancy */
.occupancy-col {
  width: 140px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.occupancy-labels {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 11px;
  font-weight: 600;
}

.occupancy-text {
  color: var(--el-text-color-secondary);
}

.occupancy-percentage {
  color: var(--el-text-color-regular);
}

.occupancy-percentage.high-occupancy {
  color: var(--el-color-danger);
}

.progress-bar-background {
  height: 6px;
  width: 100%;
  background-color: var(--el-border-color-lighter);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  transition: all 1s ease-out;
  border-radius: 9999px;
}

/* Placeholder */
.no-showtimes-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
  background-color: var(--el-fill-color-lighter);
  border-radius: 12px;
  border: 1px dashed var(--el-border-color);
  text-align: center;
}

.placeholder-icon-container {
  background-color: var(--el-fill-color-light);
  padding: 1rem;
  border-radius: 50%;
  margin-bottom: 1rem;
  color: var(--el-text-color-secondary);
}

.placeholder-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.placeholder-subtitle {
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  font-size: 13px;
}

.clear-filters-button {
  margin-top: 16px;
}

/* Animation */
.animate-in {
  opacity: 0;
  animation: slideIn 0.3s ease forwards;
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar */
.schedule-list::-webkit-scrollbar {
  width: 6px;
}
.schedule-list::-webkit-scrollbar-track {
  background: transparent;
}
.schedule-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}
</style>
