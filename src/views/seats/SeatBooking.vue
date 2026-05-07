<template>
  <div class="seats-list">
    <!-- Page Header -->
    <div class="page-header">
      <h2>{{ $t("seats.seatBooking") }}</h2>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" class="filter-form">
        <el-form-item>
          <el-select
            v-model="filters.showtimeId"
            filterable
            clearable
            :placeholder="$t('seats.selectShowtime')"
            @change="handleFilterChange"
            style="width: 400px"
            :loading="loading.showtimes"
          >
            <el-option
              v-for="item in showtimeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
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
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { showtimeService } from "@/services/showtimeService";
import { useAppStore } from "@/stores/app";
import SeatLayoutPreview from "@/components/dashboard/SeatLayoutPreview.vue";

const { t } = useI18n();
const appStore = useAppStore();

// Reactive data
const loading = reactive({
  showtimes: false,
});
const showtimeOptions = ref([]);

const filters = reactive({
  showtimeId: "",
});

// Load filter data
const loadShowtimes = async ({
  limit = 100,
  status = "scheduled",
  forBooking = true,
  search = "",
} = {}) => {
  loading.showtimes = true;
  try {
    showtimeOptions.value = await showtimeService.getDropdownShowtimes({
      limit,
      status,
      forBooking,
      search,
    });
  } catch (error) {
    console.error("Failed to load showtimes:", error);
    ElMessage.error(t("errors.loadDataFailed"));
  } finally {
    loading.showtimes = false;
  }
};

const handleFilterChange = () => {
  // SeatLayoutPreview handles its own loading via watcher on showtimeId
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

.grid-view-container {
  margin-top: 10px;
}
</style>
