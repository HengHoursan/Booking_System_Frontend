<template>
  <el-form
    ref="multipleShowtimeForm"
    :model="multipleShowtimeData"
    :rules="multipleRules"
    label-position="top"
    @submit.prevent="submitMultipleForm"
  >
    <el-form-item :label="$t('showtimes.theater')" prop="theater_id">
      <el-select
        v-model="multipleShowtimeData.theater_id"
        :placeholder="$t('showtimes.selectTheaterForAll')"
        filterable
        @change="onTheaterChange"
        style="width: 300px"
      >
        <el-option
          v-for="theater in theaters"
          :key="theater.id"
          :label="theater.name"
          :value="theater.id"
        ></el-option>
      </el-select>
    </el-form-item>

    <el-divider />

    <div class="showtime-row-header">
      <span class="col-movie">{{ $t("showtimes.movie") }} *</span>
      <span class="col-hall">{{ $t("showtimes.hall") }} *</span>
      <span class="col-date">{{ $t("showtimes.showDate") }} *</span>
      <span class="col-time">{{ $t("showtimes.startTime") }} *</span>
      <span class="col-time">{{ $t("showtimes.endTime") }} *</span>
      <span class="col-status">{{ $t("showtimes.status") }} *</span>
      <span class="col-action"></span>
    </div>

    <div
      v-for="(item, index) in multipleShowtimeData.showtimes"
      :key="item.key || item.id"
      class="showtime-row"
    >
      <el-form-item
        :prop="'showtimes.' + index + '.movie_id'"
        :rules="showtimeRowRules.movie_id"
        class="col-movie"
      >
        <el-select
          v-model="item.movie_id"
          :placeholder="$t('showtimes.selectMovie')"
          filterable
        >
          <el-option
            v-for="movie in movies"
            :key="movie.id"
            :label="movie.title"
            :value="movie.id"
          ></el-option>
        </el-select>
      </el-form-item>

      <el-form-item
        :prop="'showtimes.' + index + '.hall_id'"
        :rules="showtimeRowRules.hall_id"
        class="col-hall"
      >
        <el-select
          v-model="item.hall_id"
          :placeholder="$t('showtimes.selectHall')"
          filterable
          :disabled="!multipleShowtimeData.theater_id"
        >
          <el-option
            v-for="hall in halls"
            :key="hall.id"
            :label="hall.hall_name"
            :value="hall.id"
          ></el-option>
        </el-select>
      </el-form-item>

      <el-form-item
        :prop="'showtimes.' + index + '.show_date'"
        :rules="showtimeRowRules.show_date"
        class="col-date"
      >
        <el-date-picker
          v-model="item.show_date"
          type="date"
          :placeholder="$t('showtimes.selectShowDate')"
          style="width: 100%"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledDate"
        />
      </el-form-item>

      <el-form-item
        :prop="'showtimes.' + index + '.start_time'"
        :rules="showtimeRowRules.start_time"
        class="col-time"
      >
        <el-time-picker
          v-model="item.start_time"
          :placeholder="$t('showtimes.selectStartTime')"
          format="HH:mm"
          value-format="HH:mm"
          style="width: 100%"
          :disabled-hours="() => getDisabledHours(item.show_date)"
          :disabled-minutes="(hour) => getDisabledMinutes(hour, item.show_date)"
        />
      </el-form-item>

      <el-form-item
        :prop="'showtimes.' + index + '.end_time'"
        :rules="showtimeRowRules.end_time"
        class="col-time"
      >
        <el-time-picker
          v-model="item.end_time"
          :placeholder="$t('showtimes.selectEndTime')"
          format="HH:mm"
          value-format="HH:mm"
          style="width: 100%"
          readonly
        />
      </el-form-item>

      <el-form-item
        :prop="'showtimes.' + index + '.status'"
        :rules="showtimeRowRules.status"
        class="col-status"
      >
        <el-select v-model="item.status" :placeholder="$t('showtimes.status')">
          <el-option
            v-for="status in showtimeService.STATUS_OPTIONS"
            :key="status.value"
            :label="$t(`showtimes.statuses.${status.value}`)"
            :value="status.value"
          />
        </el-select>
      </el-form-item>

      <el-button
        @click="removeShowtimeRow(index)"
        type="danger"
        :icon="Delete"
        circle
        plain
        class="col-action"
        :disabled="multipleShowtimeData.showtimes.length <= 1 || isUpdateMode"
      />
    </div>

    <el-form-item v-if="!isUpdateMode">
      <el-button @click="addShowtimeRow" :icon="Plus">{{
        $t("actions.addRow")
      }}</el-button>
    </el-form-item>

    <el-divider />

    <el-form-item>
      <el-button
        v-permission="isUpdateMode ? 'showtimes.edit' : 'showtimes.create'"
        type="primary"
        @click="submitMultipleForm"
      >
        {{
          isUpdateMode
            ? $t("actions.update")
            : isDuplicateMode
              ? $t("actions.duplicate")
              : $t("actions.create")
        }}
      </el-button>
      <el-button @click="$router.back()">{{ $t("actions.cancel") }}</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, reactive, computed, defineProps, defineEmits, watch } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { showtimeService } from "@/services/showtimeService";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { Plus, Delete } from "@element-plus/icons-vue";

const props = defineProps({
  movies: { type: Array, required: true },
  theaters: { type: Array, required: true },
  halls: { type: Array, required: true },
  initialTheaterId: { type: String, default: "" },
  initialData: { type: Array, default: null },
  isDuplicateMode: { type: Boolean, default: false },
  isUpdateMode: { type: Boolean, default: false },
  showtimeId: { type: String, default: "" },
});

const emit = defineEmits(["theater-changed", "submitted"]);

const router = useRouter();
const appStore = useAppStore();
const { t } = useI18n();
const multipleShowtimeForm = ref(null);

const multipleShowtimeData = reactive({
  theater_id: props.initialTheaterId,
  showtimes: [],
});

watch(
  () => props.initialData,
  (newData) => {
    if (newData && newData.length > 0) {
      multipleShowtimeData.showtimes = JSON.parse(JSON.stringify(newData));
    } else {
      multipleShowtimeData.showtimes = [
        {
          key: Date.now(),
          movie_id: "",
          hall_id: "",
          show_date: "",
          start_time: "",
          end_time: "",
          status: "scheduled",
        },
      ];
    }
  },
  { immediate: true },
);

watch(
  () => props.initialTheaterId,
  (newId) => {
    multipleShowtimeData.theater_id = newId;
  },
);

const multipleRules = computed(() => ({
  theater_id: [
    {
      required: true,
      message: t("validations.theaterRequired"),
      trigger: "change",
    },
  ],
}));

const showtimeRowRules = computed(() => ({
  movie_id: [
    {
      required: true,
      message: t("validations.movieRequiredShort"),
      trigger: "change",
    },
  ],
  hall_id: [
    {
      required: true,
      message: t("validations.hallRequiredShort"),
      trigger: "change",
    },
  ],
  show_date: [
    {
      required: true,
      message: t("validations.dateRequiredShort"),
      trigger: "change",
    },
  ],
  start_time: [
    {
      required: true,
      message: t("validations.startTimeRequiredShort"),
      trigger: "blur",
    },
  ],
  status: [
    {
      required: true,
      message: t("validations.statusRequiredShort"),
      trigger: "change",
    },
  ],
}));

const onTheaterChange = () => {
  emit("theater-changed", multipleShowtimeData.theater_id);
  multipleShowtimeData.showtimes.forEach((item) => (item.hall_id = ""));
};

const submitMultipleForm = () => {
  multipleShowtimeForm.value.validate(async (valid) => {
    if (valid) {
      appStore.setLoading(true);
      try {
        const payload = {
          showtimes: multipleShowtimeData.showtimes.map((s) => ({
            movie_id: s.movie_id,
            hall_id: s.hall_id,
            show_date: s.show_date,
            start_time: s.start_time,
            end_time: s.end_time,
            status: s.status,
            theater_id: multipleShowtimeData.theater_id,
          })),
        };

        if (props.isUpdateMode) {
          // Update mode - single showtime update
          if (multipleShowtimeData.showtimes.length === 1) {
            const showtimeData = payload.showtimes[0];
            await showtimeService.updateShowtime(
              props.showtimeId,
              showtimeData,
            );
            ElMessage.success(t("showtimes.updateSuccess"));
          } else {
            ElMessage.error(t("showtimes.updateSingleOnly"));
            return;
          }
        } else if (props.isDuplicateMode) {
          payload.showtimes.forEach((s, index) => {
            const originalShowtime = multipleShowtimeData.showtimes[index];
            if (
              originalShowtime.id &&
              typeof originalShowtime.id === "string"
            ) {
              s._id = originalShowtime.id;
            }
          });
          await showtimeService.duplicateBulkShowtimes(payload);
          ElMessage.success(t("showtimes.duplicateSuccess"));
        } else {
          await showtimeService.createBulkShowtimes(payload);
          ElMessage.success(t("showtimes.createMultipleSuccess"));
        }
        emit("submitted");
      } catch (error) {
        console.error("Form submission failed:", error);

        const responseData = error?.response?.data;
        let detailedErrors = "";

        if (responseData?.success === false && responseData?.data?.errors) {
          detailedErrors = responseData.data.errors
            .map((e) => `<li>${e.error}</li>`)
            .join("");
        } else if (responseData?.errors && Array.isArray(responseData.errors)) {
          detailedErrors = responseData.errors
            .map((e) => `<li>${e.error || e.message}</li>`)
            .join("");
        }

        const message = detailedErrors
          ? `<div style="text-align: left;"><strong>${responseData?.message || t("messages.error")}</strong><ul style="margin-top: 5px; padding-left: 15px;">${detailedErrors}</ul></div>`
          : responseData?.message || t("messages.error");

        ElMessage({
          message,
          type: "error",
          grouping: true,
          duration: 7000,
          dangerouslyUseHTMLString: !!detailedErrors,
        });
      } finally {
        appStore.setLoading(false);
      }
    }
  });
};

const addShowtimeRow = () => {
  // Disable adding rows in update mode
  if (props.isUpdateMode) {
    ElMessage.warning(t("showtimes.cannotAddInUpdateMode"));
    return;
  }

  const max_rows = 8;
  if (multipleShowtimeData.showtimes.length >= max_rows) {
    ElMessage.error(`${t("showtimes.limitError", { max: max_rows })}`);
    return;
  }

  multipleShowtimeData.showtimes.push({
    key: Date.now(),
    movie_id: "",
    hall_id: "",
    show_date: "",
    start_time: "",
    end_time: "",
    status: "scheduled",
  });
};

const removeShowtimeRow = (index) => {
  if (multipleShowtimeData.showtimes.length > 1) {
    multipleShowtimeData.showtimes.splice(index, 1);
  }
};

const calculateEndTime = (startTime, durationMinutes) => {
  if (!startTime || !durationMinutes) return "";
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  startDate.setMinutes(startDate.getMinutes() + durationMinutes);
  const hh = String(startDate.getHours()).padStart(2, "0");
  const mm = String(startDate.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const disabledDate = (time) => {
  return time.getTime() < new Date().setHours(0, 0, 0, 0);
};

const getDisabledHours = (showDate) => {
  if (!showDate) return [];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const localToday = `${year}-${month}-${day}`;

  if (showDate === localToday) {
    const hours = [];
    for (let i = 0; i < now.getHours(); i++) {
      hours.push(i);
    }
    return hours;
  }
  return [];
};

const getDisabledMinutes = (hour, showDate) => {
  if (!showDate) return [];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const localToday = `${year}-${month}-${day}`;

  if (showDate === localToday && hour === now.getHours()) {
    const minutes = [];
    for (let i = 0; i < now.getMinutes(); i++) {
      minutes.push(i);
    }
    return minutes;
  }
  return [];
};

watch(
  () => multipleShowtimeData.showtimes,
  (showtimes) => {
    showtimes.forEach((item) => {
      const movie = props.movies.find((m) => m.id === item.movie_id);
      if (movie && item.start_time) {
        item.end_time = calculateEndTime(
          item.start_time,
          movie.duration_minutes,
        );
      } else {
        item.end_time = "";
      }
    });
  },
  { deep: true },
);
</script>

<style scoped>
.showtime-row-header {
  display: flex;
  gap: 16px;
  align-items: center;
  font-weight: bold;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  font-size: 13px;
}

.showtime-row {
  display: flex;
  gap: 16px;
  align-items: flex-start; /* Align tops of inputs */
}

.showtime-row .el-form-item {
  margin-bottom: 16px;
}

.showtime-row .el-select,
.showtime-row .el-date-picker,
.showtime-row .el-time-picker {
  width: 100%;
}

.col-movie {
  flex: 2;
  min-width: 150px;
}
.col-hall {
  flex: 1.5;
  min-width: 120px;
}
.col-date {
  flex: 1.5;
  min-width: 130px;
}
.col-time {
  flex: 1.2;
  min-width: 110px;
}
.col-status {
  flex: 1.5;
  min-width: 120px;
}
.col-action {
  flex: 0 0 32px;
  padding-top: 4px;
}
</style>
