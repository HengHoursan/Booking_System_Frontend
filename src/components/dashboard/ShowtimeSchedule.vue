<template>
  <el-card class="schedule-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="header-title">
          <el-icon><Calendar /></el-icon>
          {{ $t("dashboard.scheduleTitle") }}
        </span>
        <el-button
          v-if="!hideViewAll"
          link
          type="primary"
          @click="router.push('/admin/showtimes')"
        >
          {{ $t("dashboard.viewAll") }}
        </el-button>
      </div>
    </template>

    <!-- Date Filter -->
    <div class="date-picker-row">
      <el-radio-group v-model="selectedDateFilter" @change="onDateFilterChange">
        <el-radio-button value="today">
          {{ $t("actions.today", "Today") }}
        </el-radio-button>
        <el-radio-button value="tomorrow">
          {{ $t("actions.tomorrow", "Tomorrow") }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- Loading -->
    <div v-if="loading" v-loading="true" style="min-height: 180px" />

    <!-- Schedule List -->
    <div v-else-if="showtimes.length > 0" class="schedule-list">
      <div
        v-for="(showtime, index) in showtimes"
        :key="showtime.id"
        class="schedule-item animate-in"
        :class="{ 
          'is-active': interactiveMode && selectedId === showtime.id,
          'is-disabled': showtime.status !== 'scheduled' || showtime.isFull
        }"
        :style="{ animationDelay: `${index * 60}ms` }"
        @click="viewShowtime(showtime.id)"
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
        <div v-else class="thumb-fallback movie-thumb">
          <el-icon><Film /></el-icon>
        </div>

        <!-- Info -->
        <div class="showtime-info">
          <div class="movie-title" :title="showtime.movie_title">
            {{ showtime.movie_title }}
          </div>
          <div v-if="showtime.movie_genres?.length" class="movie-genres">
            {{ showtime.movie_genres.join(" / ") }}
          </div>
          <div class="meta-row">
            <el-icon class="meta-icon"><Location /></el-icon>
            <span class="meta-text">{{ showtime.theater_name }} • {{ showtime.hall_name }}</span>
            <el-icon class="meta-icon" style="margin-left: 12px"
              ><Clock
            /></el-icon>
            <span class="meta-text">{{
              formatDuration(showtime.duration_minutes)
            }}</span>
          </div>
        </div>

        <!-- Status badge -->
        <div class="status-col">
          <el-tag
            :type="getStatusType(showtime.status)"
            size="small"
            round
            effect="light"
          >
            {{ $t(`showtimes.statuses.${showtime.status}`) }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Calendar /></el-icon>
      <p>{{ $t("dashboard.noShowtimesToday") }}</p>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Calendar, Film, Location, Clock } from "@element-plus/icons-vue";
import { showtimeService } from "@/services/showtimeService";
import { seatService } from "@/services/seatService";
import { seatBookingService } from "@/services/seatBookingService";
import dayjs from "dayjs";

const props = defineProps({
  hideViewAll: {
    type: Boolean,
    default: false,
  },
  interactiveMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select"]);

const router = useRouter();

const selectedDateFilter = ref("today");
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));
const showtimes = ref([]);
const loading = ref(false);
const selectedId = ref(null);

const onDateFilterChange = (val) => {
  if (val === "today") {
    selectedDate.value = dayjs().format("YYYY-MM-DD");
  } else if (val === "tomorrow") {
    selectedDate.value = dayjs().add(1, "day").format("YYYY-MM-DD");
  }
  loadSchedule();
};

const getStatusType = (status) => {
  switch (status) {
    case "scheduled":
      return "primary";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "info";
  }
};

const formatDuration = (mins) => {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const viewShowtime = (id) => {
  if (props.interactiveMode) {
    selectedId.value = id;
    // Core logic: Emit the selected showtime ID up to the parent component (Dashboard.vue)
    emit("select", id);
  } else {
    router.push({ name: "ShowtimeDetail", params: { id } });
  }
};

const loadSchedule = async () => {
  loading.value = true;
  try {
    const response = await showtimeService.getShowtimes({
      show_date: selectedDate.value,
      forBooking: true,
      per_page: 15,
      sort_by: "start_time",
      sort_order: "asc",
    });

    if (response.data && response.data.length > 0) {
      // Fetch seat occupancy for each showtime to determine if it's fully booked
      const showtimesWithOccupancy = await Promise.all(
        response.data.map(async (showtime) => {
          try {
            const bookedSeatsResponse = await seatBookingService.getSeatBookings({
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

            const isFull = totalCount > 0 && bookedCount >= totalCount;
            return {
              ...showtime,
              isFull
            };
          } catch (e) {
            console.error(`Failed to load occupancy for showtime ${showtime.id}`, e);
            return { ...showtime, isFull: false };
          }
        })
      );
      showtimes.value = showtimesWithOccupancy;
    } else {
      showtimes.value = [];
    }

    // Core logic: Auto-select the first showtime in the list so the seat map isn't initially empty
    if (props.interactiveMode && showtimes.value.length > 0) {
      viewShowtime(showtimes.value[0].id);
    }
  } catch (e) {
    console.error("Failed to load schedule:", e);
    showtimes.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadSchedule();
});
</script>

<style scoped>
.schedule-card {
  border-radius: 20px;
  border: 1px solid var(--el-border-color-lighter);
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.date-picker-row {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

/* Schedule list */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
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

/* Disabled styling for completed/cancelled showtimes */
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
.time-divider {
  width: 1px;
  height: 10px;
  background: var(--el-border-color);
  margin: 3px 0;
}
.time-end {
  font-size: 13px;
  color: var(--el-text-color-secondary);
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
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.movie-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.movie-genres {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}
.meta-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.meta-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Status */
.status-col {
  flex-shrink: 0;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--el-text-color-secondary);
  gap: 12px;
}
.empty-icon {
  font-size: 48px;
  opacity: 0.35;
}

/* Animation */
.animate-in {
  opacity: 0;
  animation: slideIn 0.4s ease forwards;
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Custom scrollbar */
.schedule-list::-webkit-scrollbar {
  width: 4px;
}
.schedule-list::-webkit-scrollbar-track {
  background: transparent;
}
.schedule-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}
</style>
