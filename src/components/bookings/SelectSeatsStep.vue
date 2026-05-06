<template>
  <div class="select-seats-step">
    <!-- <el-alert
      :title="$t('bookings.selectSeatsInstruction')"
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    ></el-alert> -->
    <div
      v-if="loading.seats"
      v-loading="loading.seats"
      style="min-height: 300px; width: 100%"
    ></div>
    <div v-else class="seat-map-container">
      <div class="screen-container">
        <div class="screen-arc"></div>
        <div class="screen-text">{{ $t("bookings.screen") }}</div>
      </div>

      <div class="seat-map">
        <div v-for="row in seatLayout" :key="row.row" class="seat-row">
          <div class="row-label left">
            <div
              class="row-type-dot"
              :style="{ backgroundColor: seatTypes[row.rowType]?.color }"
              :title="seatTypes[row.rowType]?.label"
            ></div>
            <span>{{ row.row }}</span>
          </div>
          <div class="seats-container">
            <div class="seats-section" v-if="row.sections.left.length">
              <div
                v-for="seat in row.sections.left"
                :key="seat.id"
                class="seat"
                :class="getSeatClass(seat)"
                @click="toggleSeat(seat)"
                :title="`${seat.row}-${seat.seat_number}`"
              >
                <span class="seat-number">{{ seat.seat_number }}</span>
              </div>
            </div>
            <div class="seats-section" v-if="row.sections.middle.length">
              <div
                v-for="seat in row.sections.middle"
                :key="seat.id"
                class="seat"
                :class="getSeatClass(seat)"
                @click="toggleSeat(seat)"
                :title="`${seat.row}-${seat.seat_number}`"
              >
                <span class="seat-number">{{ seat.seat_number }}</span>
              </div>
            </div>
            <div class="seats-section" v-if="row.sections.right.length">
              <div
                v-for="seat in row.sections.right"
                :key="seat.id"
                class="seat"
                :class="getSeatClass(seat)"
                @click="toggleSeat(seat)"
                :title="`${seat.row}${seat.seat_number}`"
              >
                <span class="seat-number">{{ seat.seat_number }}</span>
              </div>
            </div>
          </div>
          <div class="row-label right">
            <span>{{ row.row }}</span>
            <div
              class="row-type-dot"
              :style="{ backgroundColor: seatTypes[row.rowType]?.color }"
              :title="seatTypes[row.rowType]?.label"
            ></div>
          </div>
        </div>
      </div>

      <div class="legend">
        <!-- Row 1: Status -->
        <div class="legend-row status-row">
          <div class="legend-item">
            <div class="seat available"><span class="seat-number"></span></div>
            <span>{{ $t("seats.statuses.available") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat selected"><span class="seat-number"></span></div>
            <span>{{ $t("seats.statuses.selected") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat booked"><span class="seat-number"></span></div>
            <span>{{ $t("seats.statuses.booked") }}</span>
          </div>
          <div class="legend-item">
            <div class="seat unavailable">
              <span class="seat-number"></span>
            </div>
            <span>{{ $t("seats.statuses.unavailable") }}</span>
          </div>
          <div v-if="props.restrictToPrice !== null" class="legend-item">
            <div class="seat price-restricted">
              <span class="seat-number"></span>
            </div>
            <span>{{ $t("seats.statuses.priceRestricted") }}</span>
          </div>
        </div>

        <div class="legend-divider"></div>

        <!-- Row 2: Types -->
        <div class="legend-row types-row">
          <div v-for="(cfg, key) in seatTypes" :key="key" class="legend-item">
            <div class="seat-dot" :style="{ backgroundColor: cfg.color }"></div>
            <span>{{ cfg.label }} ${{ cfg.price.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { seatService } from "@/services/seatService";
import { seatBookingService } from "@/services/seatBookingService";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

const { t } = useI18n();

const props = defineProps({
  showtime: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Set,
    required: true,
  },
  excludeBookingId: {
    type: [String, Number],
    default: null,
  },
  restrictToPrice: {
    type: Number,
    default: null,
  },
});

// Auto-refresh seat data when showtime or booking changes, or when the tab is focused
useAutoRefresh(() => loadSeatData(), {
  deps: [() => props.showtime, () => props.excludeBookingId],
});

const emit = defineEmits(["update:modelValue", "update:selectedSeatDetails"]);

const loading = reactive({
  seats: false,
});

const hallSeats = ref([]);
const bookedSeats = ref([]);
const selectedSeats = ref([]);

const isSameId = (id1, id2) => {
  if (!id1 || !id2) return false;
  const s1 = (
    typeof id1 === "object" ? id1._id || id1.id || id1 : id1
  ).toString();
  const s2 = (
    typeof id2 === "object" ? id2._id || id2.id || id2 : id2
  ).toString();
  return s1 === s2;
};

const loadSeatData = async () => {
  if (!props.showtime?.hall_id) return;

  loading.seats = true;
  try {
    const [seatResponse, bookings] = await Promise.all([
      seatService.getSeatsByHall(props.showtime.hall_id, { per_page: 100 }),
      seatBookingService.getRawSeatBookingsForShowtime(props.showtime.id),
    ]);

    hallSeats.value = seatResponse.data;

    // Normalize bookings data to handle both object and array formats
    const rawBookings =
      bookings?.seatBookings || (Array.isArray(bookings) ? bookings : []);

    // Filter out seats that are booked by the current booking we are editing
    bookedSeats.value = rawBookings
      .filter((b) => {
        const bookingId = b.bookingId?._id || b.bookingId;
        return !isSameId(bookingId, props.excludeBookingId);
      })
      .map((b) => (b.seatId?._id || b.seatId)?.toString());

    // After loading seat data, we can emit the details of any already selected seats.
    const newSelectedSeats = new Set(props.modelValue);
    const selectedDetails = hallSeats.value.filter((s) => {
      const sId = (s._id || s.id)?.toString();
      return newSelectedSeats.has(sId);
    });
    emit("update:selectedSeatDetails", selectedDetails);
  } catch (error) {
    console.error("Failed to load seat data:", error);
  } finally {
    loading.seats = false;
  }
};

const seatRows = computed(() => {
  if (!hallSeats.value) return [];
  const rows = {};
  hallSeats.value.forEach((seat) => {
    if (!rows[seat.row]) {
      rows[seat.row] = { row: seat.row, seats: [], rowType: seat.seat_type };
    }
    rows[seat.row].seats.push(seat);
  });
  Object.values(rows).forEach((row) => {
    row.seats.sort((a, b) => a.seat_number - b.seat_number);
  });
  return Object.values(rows).sort((a, b) => a.row.localeCompare(b.row));
});

const seatLayout = computed(() => {
  if (!seatRows.value.length) return [];

  return seatRows.value.map((row) => {
    const seats = row.seats;
    const totalSeats = seats.length;

    let leftSeats = [],
      middleSeats = [],
      rightSeats = [];

    if (totalSeats < 7) {
      // For small rows, display as a single block
      middleSeats = seats;
    } else if (totalSeats < 13) {
      // For medium rows, split into two blocks
      const splitPoint = Math.ceil(totalSeats / 2);
      leftSeats = seats.slice(0, splitPoint);
      rightSeats = seats.slice(splitPoint);
    } else {
      // For large rows, split into three blocks
      const sideSize = Math.floor(totalSeats / 4);
      leftSeats = seats.slice(0, sideSize);
      middleSeats = seats.slice(sideSize, totalSeats - sideSize);
      rightSeats = seats.slice(totalSeats - sideSize);
    }

    return {
      ...row,
      rowType: row.rowType,
      sections: {
        left: leftSeats,
        middle: middleSeats,
        right: rightSeats,
      },
    };
  });
});

const getSeatClass = (seat) => {
  const seatId = (seat._id || seat.id)?.toString();
  const typeClass = `seat-type-${seat.seat_type || 'regular'}`;
  if (seat.status === "maintenance" || seat.status === "out_of_order")
    return `unavailable ${typeClass}`;
  if (bookedSeats.value.includes(seatId)) return `booked ${typeClass}`;
  if (props.modelValue.has(seatId)) return `selected ${typeClass}`;
  
  // If price restriction is enabled, mark seats with different prices as unavailable
  if (props.restrictToPrice !== null && seat.price !== props.restrictToPrice) {
    return `price-restricted ${typeClass}`;
  }
  
  return `available ${typeClass}`;
};

const seatTypes = computed(() => {
  const types = {};
  const typeColors = {
    vip: "#a855f7",
    couple: "#ec4899",
    queen: "#f59e0b",
    regular: "#3b82f6",
  };

  hallSeats.value.forEach((seat) => {
    if (!types[seat.seat_type]) {
      types[seat.seat_type] = {
        label: seat.seat_type.charAt(0).toUpperCase() + seat.seat_type.slice(1),
        color: typeColors[seat.seat_type] || "#3b82f6",
        price: seat.price || 0,
      };
    }
  });
  return types;
});

const toggleSeat = (seat) => {
  const seatId = (seat._id || seat.id)?.toString();
  if (
    bookedSeats.value.includes(seatId) ||
    seat.status === "maintenance" ||
    seat.status === "out_of_order"
  )
    return;

  // Check price restriction
  if (props.restrictToPrice !== null && seat.price !== props.restrictToPrice) {
    ElMessage.error(t("bookings.samePriceError", { price: props.restrictToPrice }));
    return;
  }

  const newSelectedSeats = new Set(props.modelValue);
  const isSelecting = !newSelectedSeats.has(seatId);

  if (isSelecting) {
    // Rule 1: Max 10 seats
    if (newSelectedSeats.size >= 10) {
      ElMessage.error(t("bookings.maxSeatsError", { count: 10 }));
      return;
    }

    // Rule 2: Same Row
    if (newSelectedSeats.size > 0) {
      const firstId = Array.from(newSelectedSeats)[0];
      const firstSeat = hallSeats.value.find(
        (s) => (s._id || s.id).toString() === firstId,
      );
      if (firstSeat && seat.row !== firstSeat.row) {
        ElMessage.error(t("bookings.sameRowError"));
        return;
      }

      // Rule 3: No gaps (Check if new seat creates a gap with existing ones)
      // This is a simplified check: get all seats in this row, sort them, and check continuity
      const rowSeats = hallSeats.value.filter((s) => s.row === seat.row);
      const selectedInRow = rowSeats.filter((s) => {
        const sId = (s._id || s.id).toString();
        return newSelectedSeats.has(sId) || sId === seatId;
      });

      if (selectedInRow.length > 1) {
        const sorted = [...selectedInRow].sort((a, b) => {
          const numA = parseInt(
            Array.isArray(a.seat_number) ? a.seat_number[0] : a.seat_number,
          );
          const numB = parseInt(
            Array.isArray(b.seat_number) ? b.seat_number[0] : b.seat_number,
          );
          return numA - numB;
        });

        for (let i = 0; i < sorted.length - 1; i++) {
          const numA = parseInt(
            Array.isArray(sorted[i].seat_number)
              ? sorted[i].seat_number[0]
              : sorted[i].seat_number,
          );
          const numB = parseInt(
            Array.isArray(sorted[i + 1].seat_number)
              ? sorted[i + 1].seat_number[0]
              : sorted[i + 1].seat_number,
          );
          if (numA + 1 !== numB) {
            ElMessage.error(t("bookings.noGapsError"));
            return;
          }
        }
      }
    }
  }

  if (newSelectedSeats.has(seatId)) {
    newSelectedSeats.delete(seatId);
  } else {
    newSelectedSeats.add(seatId);
  }
  emit("update:modelValue", newSelectedSeats);

  const selectedDetails = hallSeats.value.filter((s) => {
    const sId = (s._id || s.id)?.toString();
    return newSelectedSeats.has(sId);
  });
  emit("update:selectedSeatDetails", selectedDetails);
};
</script>

<style scoped>
.select-seats-step {
  margin: 0 auto;
  padding: 10px 16px;
  max-width: 11000px;
  outline: 1px solid var(--el-border-color-lighter);
}

.seat-map-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--el-bg-color);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.screen-container {
  width: 100%;
  text-align: center;
  margin-bottom: 24px;
  position: relative;
  height: 36px;
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
  text-transform: uppercase;
  font-weight: bold;
  font-size: 12px;
  letter-spacing: 2px;
}

.seat-map {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.seat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 40px;
  font-weight: bold;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.row-label.left {
  justify-content: flex-end;
}

.row-label.right {
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
  gap: 20px;
}

.seats-section {
  display: flex;
  gap: 6px;
}

.seat {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  font-weight: 600;
  position: relative;
}

.seat-number {
  font-size: 11px;
}

.seat.available {
  background-color: #e4e7ed;
  color: #909399;
}
.seat.available:hover {
  background-color: #dcdfe6;
  transform: translateY(-2px);
}

.seat.selected {
  background-color: #409eff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.seat.booked {
  background-color: #909399;
  color: white;
  opacity: 0.8;
  cursor: not-allowed;
}

.seat.unavailable {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
  cursor: not-allowed;
}

.seat.price-restricted {
  background-color: #fff7ed;
  border: 1px solid #fed7aa;
  color: #ea580c;
  cursor: not-allowed;
  opacity: 0.7;
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

.legend {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background-color: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-lighter);
}

.legend-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
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
  gap: 6px;
  font-size: 11px;
  color: var(--el-text-color-primary);
}

.legend-item .seat {
  width: 16px;
  height: 16px;
  cursor: default;
  transform: scale(1);
  box-shadow: none;
}

.seat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-item .seat:hover {
  transform: none;
}
.legend-item .seat .seat-number {
  display: none;
}
</style>
