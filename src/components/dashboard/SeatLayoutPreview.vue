<template>
  <el-card class="seat-layout-card" shadow="never">
    <template #header v-if="!hideHeader">
      <div class="card-header">
        <span class="header-title">
          <el-icon><Grid /></el-icon>
          {{ $t("dashboard.seatLayoutPreview") }}
        </span>
        <el-button link type="primary" @click="router.push('/admin/showtimes')">
          {{ $t("dashboard.viewAll") }}
        </el-button>
      </div>
    </template>

    <!-- Showtime Selector -->
    <div class="showtime-selector" v-if="!hideHeader">
      <el-select
        v-model="selectedShowtimeId"
        filterable
        clearable
        :placeholder="$t('dashboard.selectShowtimeToPreview')"
        style="width: 100%"
        :loading="loadingShowtimes"
        @change="onShowtimeChange"
      >
        <el-option
          v-for="item in showtimeOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>

    <!-- Initial empty state (no showtime selected) -->
    <div v-if="!selectedShowtimeId && !loadingSeats" class="empty-state">
      <el-icon class="empty-icon"><Film /></el-icon>
      <p class="empty-title">{{ $t("dashboard.selectShowtimeToPreview") }}</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loadingSeats" v-loading="true" style="min-height: 200px" />

    <!-- Seat Map (same pattern as booking flow) -->
    <div v-else-if="hallSeats.length > 0" class="seat-layout-wrapper">
      <!-- Summary strip -->
      <div class="seat-summary">
        <span class="pill available-pill">
          <span class="dot2"></span>
          {{ $t("dashboard.availableSeats") }}: {{ availableCount }}
        </span>
        <span class="pill booked-pill">
          <span class="dot2 dot-booked"></span>
          {{ $t("dashboard.bookedSeats") }}: {{ bookedCount }}
        </span>
        <span class="pill locked-pill" v-if="lockedCount > 0">
          <span class="dot2 dot-locked"></span>
          {{ $t("seats.statuses.locked") }}: {{ lockedCount }}
        </span>
        <span class="pill other-pill" v-if="unavailableCount > 0">
          <span class="dot2 dot-unavail"></span>
          {{ $t("dashboard.unavailableSeats") }}: {{ unavailableCount }}
        </span>
        <span class="total-text"
          >{{ $t("dashboard.totalSeats") }}: {{ hallSeats.length }}</span
        >
      </div>

      <!-- Screen -->
      <div class="screen-wrap">
        <div class="screen-arc"></div>
        <div class="screen-text">{{ $t("bookings.screen") }}</div>
      </div>

      <!-- Seat rows (same layout logic as SelectSeatsStep) -->
      <div class="seat-map">
        <div v-for="row in seatLayout" :key="row.row" class="seat-row">
          <!-- Left label -->
          <div class="row-label row-label-left">
            <div
              class="row-type-dot"
              :style="{ background: seatTypeColors[row.rowType] }"
              :title="row.rowType"
            />
            <span>{{ row.row }}</span>
          </div>
          <!-- Sections -->
          <div class="seats-container">
            <div class="seats-section" v-if="row.sections.left.length">
              <div
                v-for="seat in row.sections.left"
                :key="seat.id || seat._id"
                class="seat"
                :class="getSeatClass(seat)"
                @click="toggleSeat(seat)"
              >
                <span class="seat-number">{{ getSeatNum(seat) }}</span>
              </div>
            </div>
            <div class="seats-section" v-if="row.sections.middle.length">
              <div
                v-for="seat in row.sections.middle"
                :key="seat.id || seat._id"
                class="seat"
                :class="getSeatClass(seat)"
                @click="toggleSeat(seat)"
              >
                <span class="seat-number">{{ getSeatNum(seat) }}</span>
              </div>
            </div>
            <div class="seats-section" v-if="row.sections.right.length">
              <div
                v-for="seat in row.sections.right"
                :key="seat.id || seat._id"
                class="seat"
                :class="getSeatClass(seat)"
                @click="toggleSeat(seat)"
              >
                <span class="seat-number">{{ getSeatNum(seat) }}</span>
              </div>
            </div>
          </div>
          <!-- Right label -->
          <div class="row-label row-label-right">
            <span>{{ row.row }}</span>
            <div
              class="row-type-dot"
              :style="{ background: seatTypeColors[row.rowType] }"
            />
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <!-- Row 1: Status -->
        <div class="legend-row status-row">
          <div class="legend-item">
            <div class="seat seat-sm available"></div>
            <span>{{ $t("seats.statuses.available") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat seat-sm selected"></div>
            <span>{{ $t("seats.statuses.selected", "Selected") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat seat-sm booked"></div>
            <span>{{ $t("seats.statuses.booked") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat seat-sm locked-seat"></div>
            <span>{{ $t("seats.statuses.locked") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat seat-sm unavailable"></div>
            <span>{{ $t("seats.statuses.unavailable") }}</span>
          </div>
        </div>

        <div class="legend-divider"></div>

        <!-- Row 2: Types with prices -->
        <div class="legend-row types-row">
          <div v-for="(cfg, key) in seatTypes" :key="key" class="legend-item">
            <div class="seat-dot" :style="{ backgroundColor: cfg.color }"></div>
            <span>{{ cfg.label }} ${{ cfg.price.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="book-action">
        <div class="selected-summary" v-if="selectedSeatIds.size > 0">
          {{ selectedSeatIds.size }} {{ $t("bookings.seats") }} {{ $t("seats.statuses.selected") }}
        </div>
        <el-button
          type="primary"
          size="medium"
          class="book-now-btn"
          :icon="Tickets"
          @click="goToBooking"
        >
          {{ selectedSeatIds.size > 0 ? $t("bookings.continueToBooking", "Continue to Booking") : $t("dashboard.bookNow") }}
        </el-button>
      </div>
    </div>

    <!-- No seats in hall -->
    <div v-else-if="selectedShowtimeId && !loadingSeats" class="empty-state">
      <el-icon class="empty-icon"><Grid /></el-icon>
      <p class="empty-title">{{ $t("dashboard.noSeatsConfigured") }}</p>
      <p class="empty-hint">{{ $t("dashboard.noSeatsHint") }}</p>
      <el-button type="primary" link @click="router.push('/admin/seats')">
        {{ $t("dashboard.goToSeats") }} →
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Grid, Film, Tickets } from "@element-plus/icons-vue";
import { showtimeService } from "@/services/showtimeService";
import { seatService } from "@/services/seatService";
import { seatBookingService } from "@/services/seatBookingService";
import { ElMessage } from "element-plus";

const props = defineProps({
  showtimeId: {
    type: String,
    default: "",
  },
  hideHeader: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();
const { t } = useI18n();

const showtimeOptions = ref([]);
const selectedShowtimeId = ref("");
const hallSeats = ref([]); // all physical seats in the hall
const bookedSeatIds = ref([]); // seat IDs that are booked for this showtime
const lockedSeatIds = ref([]); // seat IDs that are locked (temp hold)
const selectedSeatIds = ref(new Set()); // seat IDs selected by user
const loadingShowtimes = ref(false);
const loadingSeats = ref(false);

const typeColorMap = {
  regular: "#3b82f6",
  vip: "#a855f7",
  couple: "#ec4899",
  queen: "#f59e0b",
};

// Dynamic seat types derived from actual seat data (matches SelectSeatsStep)
const seatTypes = computed(() => {
  const types = {};
  hallSeats.value.forEach((seat) => {
    if (!types[seat.seat_type]) {
      types[seat.seat_type] = {
        label: seat.seat_type.charAt(0).toUpperCase() + seat.seat_type.slice(1),
        color: typeColorMap[seat.seat_type] || "#3b82f6",
        price: seat.price || 0,
      };
    }
  });
  return types;
});

// Keep seatTypeColors as a simple lookup for the row dots
const seatTypeColors = computed(() => {
  const colors = {};
  Object.entries(seatTypes.value).forEach(([key, cfg]) => {
    colors[key] = cfg.color;
  });
  return Object.keys(colors).length > 0 ? colors : typeColorMap;
});

// ─── Seat status helpers ──────────────────────────────────────────────────────
const getSeatId = (seat) => (seat._id || seat.id)?.toString();

const getSeatClass = (seat) => {
  const typeClass = `seat-type-${seat.seat_type || 'regular'}`;
  if (seat.status === "maintenance" || seat.status === "out_of_order")
    return `unavailable ${typeClass}`;
  const id = getSeatId(seat);
  if (bookedSeatIds.value.includes(id)) return `booked ${typeClass}`;
  if (lockedSeatIds.value.includes(id)) return `locked-seat ${typeClass}`;
  if (selectedSeatIds.value.has(id)) return `selected ${typeClass}`;
  return `available ${typeClass}`;
};

const getSeatTypeColor = (seat) => {
  const color = seatTypes.value[seat.seat_type]?.color || typeColorMap[seat.seat_type] || '#3b82f6';
  return color;
};

const getSeatNum = (seat) => {
  const num = Array.isArray(seat.seat_number)
    ? seat.seat_number[0]
    : seat.seat_number;
  return num;
};

const toggleSeat = (seat) => {
  const id = getSeatId(seat);
  if (
    seat.status === "maintenance" ||
    seat.status === "out_of_order" ||
    bookedSeatIds.value.includes(id) ||
    lockedSeatIds.value.includes(id)
  ) {
    return;
  }
  if (selectedSeatIds.value.has(id)) {
    selectedSeatIds.value.delete(id);
  } else {
    if (selectedSeatIds.value.size >= 10) {
      ElMessage.warning(t("bookings.maxSeatsError", { count: 10 }));
      return;
    }
    selectedSeatIds.value.add(id);
  }
};

// ─── Layout computation (same logic as SelectSeatsStep) ───────────────────────
const seatRows = computed(() => {
  const rows = {};
  hallSeats.value.forEach((seat) => {
    if (!rows[seat.row])
      rows[seat.row] = { row: seat.row, seats: [], rowType: seat.seat_type };
    rows[seat.row].seats.push(seat);
  });
  Object.values(rows).forEach((r) =>
    r.seats.sort((a, b) => {
      const na = parseInt(
        Array.isArray(a.seat_number) ? a.seat_number[0] : a.seat_number,
      );
      const nb = parseInt(
        Array.isArray(b.seat_number) ? b.seat_number[0] : b.seat_number,
      );
      return na - nb;
    }),
  );
  return Object.values(rows).sort((a, b) => a.row.localeCompare(b.row));
});

const seatLayout = computed(() =>
  seatRows.value.map((row) => {
    const seats = row.seats;
    const total = seats.length;
    let left = [],
      middle = [],
      right = [];
    if (total < 7) {
      middle = seats;
    } else if (total < 13) {
      const sp = Math.ceil(total / 2);
      left = seats.slice(0, sp);
      right = seats.slice(sp);
    } else {
      const ss = Math.floor(total / 4);
      left = seats.slice(0, ss);
      middle = seats.slice(ss, total - ss);
      right = seats.slice(total - ss);
    }
    return { ...row, sections: { left, middle, right } };
  }),
);

// ─── Counts ───────────────────────────────────────────────────────────────────
const availableCount = computed(
  () =>
    hallSeats.value.filter((s) => {
      const id = getSeatId(s);
      return (
        s.status !== "maintenance" &&
        s.status !== "out_of_order" &&
        !bookedSeatIds.value.includes(id) &&
        !lockedSeatIds.value.includes(id)
      );
    }).length,
);
const bookedCount = computed(() => bookedSeatIds.value.length);
const lockedCount = computed(() => lockedSeatIds.value.length);
const unavailableCount = computed(
  () =>
    hallSeats.value.filter(
      (s) => s.status === "maintenance" || s.status === "out_of_order",
    ).length,
);

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadShowtimes = async () => {
  loadingShowtimes.value = true;
  try {
    showtimeOptions.value = await showtimeService.getDropdownShowtimes({
      limit: 10,
      status: "scheduled",
    });
  } catch (e) {
    console.error("Failed to load showtimes:", e);
  } finally {
    loadingShowtimes.value = false;
  }
};

const onShowtimeChange = async (id) => {
  hallSeats.value = [];
  bookedSeatIds.value = [];
  lockedSeatIds.value = [];
  selectedSeatIds.value.clear();
  if (!id) return;

  loadingSeats.value = true;
  try {
    // Get showtime detail to find hall_id
    const showtime = await showtimeService.getShowtime(id);
    const hallId = showtime?.hall_id;
    if (!hallId) return;

    // Fetch physical seats + booking status in parallel (same as SelectSeatsStep)
    const [seatResponse, rawBookings] = await Promise.all([
      seatService.getSeatsByHall(hallId, { per_page: 200 }),
      seatBookingService.getRawSeatBookingsForShowtime(id),
    ]);

    hallSeats.value = seatResponse?.data || [];

    // Parse booked / locked seat IDs from raw bookings
    const bookingsArr =
      rawBookings?.seatBookings ||
      (Array.isArray(rawBookings) ? rawBookings : []);

    bookedSeatIds.value = bookingsArr
      .filter((b) => b.status === "booked")
      .map((b) => (b.seatId?._id || b.seatId)?.toString())
      .filter(Boolean);

    lockedSeatIds.value = bookingsArr
      .filter((b) => b.status === "locked")
      .map((b) => (b.seatId?._id || b.seatId)?.toString())
      .filter(Boolean);
  } catch (e) {
    console.error("Failed to load seat layout:", e);
  } finally {
    loadingSeats.value = false;
  }
};

const goToBooking = () => {
  const query = {};
  if (selectedShowtimeId.value) query.showtime = selectedShowtimeId.value;
  if (selectedSeatIds.value.size > 0) query.seats = Array.from(selectedSeatIds.value).join(',');
  
  router.push({ path: "/bookings/create", query });
};

// Core logic: Listens for changes to the showtimeId prop (sent from Dashboard) 
// and triggers an automatic refresh of the seat fetching API.
watch(() => props.showtimeId, (newVal) => {
  if (newVal !== selectedShowtimeId.value) {
    selectedShowtimeId.value = newVal;
    onShowtimeChange(newVal);
  }
});

onMounted(() => {
  if (!props.hideHeader) {
    loadShowtimes();
  }
  if (props.showtimeId) {
    selectedShowtimeId.value = props.showtimeId;
    onShowtimeChange(props.showtimeId);
  }
});
</script>

<style scoped>
.seat-layout-card {
  border-radius: 20px;
  border: 1px solid var(--el-border-color-lighter);
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

.showtime-selector {
  margin-bottom: 16px;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 8px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
.empty-icon {
  font-size: 44px;
  opacity: 0.3;
  margin-bottom: 4px;
}
.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.empty-hint {
  margin: 0;
  font-size: 13px;
}

/* Summary strip */
.seat-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}
.pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.available-pill {
  background: #ecfdf5;
  color: #065f46;
}
.booked-pill {
  background: #f3f4f6;
  color: #111827;
}
.locked-pill {
  background: #fffbeb;
  color: #92400e;
}
.other-pill {
  background: #fef2f2;
  color: #991b1b;
}
.dot2 {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6ee7b7;
  flex-shrink: 0;
}
.dot-booked {
  background: #9ca3af;
}
.dot-locked {
  background: #fbbf24;
}
.dot-unavail {
  background: #f87171;
}
.total-text {
  margin-left: auto;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

/* Seat layout wrapper — matches SelectSeatsStep container */
.seat-layout-wrapper {
  background-color: var(--el-bg-color);
  padding: 40px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

/* Screen */
.screen-wrap {
  width: 100%;
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  height: 50px;
}
.screen-arc {
  width: 60%;
  height: 4px;
  background: var(--el-border-color-light);
  border-radius: 4px;
  position: absolute;
  left: 20%;
  top: 0;
}
.screen-text {
  position: relative;
  top: 15px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Seat map */
.seat-map {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 4px;
}
.seat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.row-label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 50px;
  font-weight: bold;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.row-label-left {
  justify-content: flex-end;
}
.row-label-right {
  justify-content: flex-start;
}
.row-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.seats-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 36px;
}
.seats-section {
  display: flex;
  gap: 12px;
}

/* Seats — matches SelectSeatsStep sizing */
.seat {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  font-weight: 600;
  position: relative;
}
.seat:hover {
  transform: translateY(-2px);
  filter: brightness(0.95);
}
.seat-number {
  font-size: 12px;
}

/* Status colours — exactly matches SelectSeatsStep */
.seat.available {
  background-color: #e4e7ed;
  color: #909399;
}
.seat.available:hover {
  background-color: #dcdfe6;
  transform: translateY(-2px);
}
.seat.booked {
  background-color: #909399;
  color: white;
  opacity: 0.8;
  cursor: not-allowed;
}
.seat.locked-seat {
  background: #fef3c7;
  border: 1.5px solid #fcd34d;
  color: #78350f;
  cursor: not-allowed;
}
.seat.unavailable {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
  cursor: not-allowed;
}
.seat.selected {
  background-color: #409eff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* Seat type colors for available seats */
.seat.available.seat-type-regular {
  background-color: #dbeafe;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}
.seat.available.seat-type-regular:hover {
  background-color: #bfdbfe;
}

.seat.available.seat-type-vip {
  background-color: #f3e8ff;
  color: #7c3aed;
  border: 1px solid #e9d5ff;
}
.seat.available.seat-type-vip:hover {
  background-color: #e9d5ff;
}

.seat.available.seat-type-couple {
  background-color: #fce7f3;
  color: #db2777;
  border: 1px solid #fbcfe8;
}
.seat.available.seat-type-couple:hover {
  background-color: #fbcfe8;
}

.seat.available.seat-type-queen {
  background-color: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
}
.seat.available.seat-type-queen:hover {
  background-color: #fde68a;
}

/* Legend — matches SelectSeatsStep two-row layout */
.legend {
  margin-top: 50px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  padding: 30px;
  background-color: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-lighter);
}
.legend-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 24px;
}
.legend-divider {
  width: 60%;
  height: 1px;
  background-color: var(--el-border-color-lighter);
  margin: 0 auto;
  opacity: 0.5;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.legend-item .seat {
  width: 18px;
  height: 20px;
  cursor: default;
  transform: scale(1);
  box-shadow: none;
}
.legend-item .seat:hover {
  transform: none;
}
.legend-item .seat .seat-number {
  display: none;
}
.seat-sm {
  cursor: default !important;
  transform: none !important;
}
.seat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* Book Now */
.book-action {
  margin-top: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 24px;
}
.selected-summary {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-color-primary);
}
.book-now-btn {
  border: none;
  padding: 12px 28px;
  font-weight: 700;
  border-radius: 12px;
  transition: all 0.25s;
}
</style>
