<template>
  <div class="showtime-list">
    <div class="page-header">
      <h2>{{ $t("showtimes.title") }}</h2>
      <el-button
        v-permission="'showtimes.create'"
        type="primary"
        @click="$router.push({ name: 'CreateShowtime' })"
      >
        <el-icon><Plus /></el-icon>
        {{ $t("showtimes.addShowtime") }}
      </el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <!-- Filters Toolbar -->
      <div class="toolbar">
        <!-- Search -->
        <el-input
          v-model="filters.search"
          :placeholder="$t('showtimes.searchShowtimes')"
          class="search-input"
          :prefix-icon="Search"
          clearable
          style="width: 200px"
          @input="debouncedSearch"
        />

        <!-- Status -->
        <el-select
          v-model="filters.status"
          :placeholder="$t('showtimes.filterByStatus')"
          clearable
          style="width: 200px"
        >
          <el-option
            v-for="status in showtimeService.STATUS_OPTIONS"
            :key="status.value"
            :label="$t(`showtimes.statuses.${status.value}`)"
            :value="status.value"
          />
        </el-select>

        <!-- Theater -->
        <el-select
          v-model="filters.theater_id"
          :placeholder="$t('showtimes.filterByTheater')"
          clearable
          style="width: 200px"
          filterable
          @change="handleTheaterFilterChange"
        >
          <el-option
            v-for="theater in theaters"
            :key="theater.id"
            :label="theater.name"
            :value="theater.id"
          />
        </el-select>

        <!-- Hall -->
        <el-select
          v-model="filters.hall_id"
          :placeholder="$t('showtimes.filterByHall')"
          :disabled="!filters.theater_id"
          clearable
          filterable
          style="width: 200px"
        >
          <el-option
            v-for="hall in filteredHalls"
            :key="hall.id"
            :label="hall.hall_name"
            :value="hall.id"
          />
        </el-select>

        <!-- Show Date -->
        <el-date-picker
          v-model="filters.show_date"
          type="date"
          :placeholder="$t('showtimes.showDate')"
          clearable
          style="width: 200px"
          value-format="YYYY-MM-DD"
          @change="loadShowtimes"
        />

      </div>
    </el-card>

    <div class="grid-header" v-if="showtimes.length > 0">
      <el-checkbox
        :model-value="isAllSelected"
        :indeterminate="isIndeterminate"
        @change="handleSelectAllChange"
        class="select-all-toggle"
      >
        {{ $t("actions.selectAll") }}
      </el-checkbox>
    </div>

    <div v-loading="loading">
      <!-- Showtime Grid -->
      <el-row :gutter="20" class="showtime-grid" v-if="showtimes.length > 0">
        <el-col
          v-for="showtime in showtimes"
          :key="showtime.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="4"
          class="mb-4"
        >
          <div
            class="showtime-card"
            :class="{ 'is-selected': isSelected(showtime.id) }"
            @click="toggleSelection(showtime)"
          >
            <div class="card-selection">
              <el-checkbox
                :model-value="isSelected(showtime.id)"
                @change="toggleSelection(showtime)"
                @click.stop
              />
            </div>

            <div class="card-poster">
              <el-image :src="showtime.movie_poster" fit="cover">
                <template #error>
                  <div class="image-placeholder">
                    <el-icon><Film /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="status-badge">
                <el-tag
                  :type="getStatusTagType(showtime.status)"
                  size="small"
                  effect="dark"
                  round
                >
                  {{ $t(`showtimes.statuses.${showtime.status}`) }}
                </el-tag>
              </div>
            </div>

            <div class="card-content">
              <h3 class="movie-title">{{ showtime.movie_title }}</h3>

              <div class="info-group">
                <div class="info-item">
                  <el-icon><Location /></el-icon>
                  <span>{{ showtime.theater_name }}</span>
                </div>

                <div class="info-item">
                  <el-icon><Monitor /></el-icon>
                  <span>{{ showtime.hall_name }}</span>
                </div>

                <div class="info-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(showtime.show_date) }}</span>
                </div>
              </div>

              <div class="time-display">
                <div class="time-box">
                  <span class="time-label">{{
                    $t("showtimes.startTime")
                  }}</span>
                  <span class="time-value">{{ showtime.start_time }}</span>
                </div>
                <div class="time-arrow">
                  <el-icon><ArrowRight /></el-icon>
                </div>
                <div class="time-box">
                  <span class="time-label">{{ $t("showtimes.endTime") }}</span>
                  <span class="time-value">{{ showtime.end_time }}</span>
                </div>
              </div>

              <div class="card-actions">
                <el-button-group class="action-upgrade">
                  <el-tooltip :content="$t('showtimes.view')" placement="top">
                    <el-button
                      size="small"
                      @click.stop="viewShowtime(showtime.id)"
                      class="action-btn view"
                    >
                      <el-icon><View /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="$t('showtimes.edit')" placement="top">
                    <el-button
                      size="small"
                      type="primary"
                      @click.stop="editShowtime(showtime.id)"
                      class="action-btn edit"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="$t('showtimes.delete')" placement="top">
                    <el-button
                      size="small"
                      type="danger"
                      @click.stop="deleteShowtime(showtime.id)"
                      class="action-btn delete"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </el-button-group>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- Empty State -->
      <el-empty
        v-else-if="!loading"
        :description="$t('messages.noData')"
        :image-size="200"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="$router.push({ name: 'CreateShowtime' })"
          >
            {{ $t("showtimes.addShowtime") }}
          </el-button>
        </template>
      </el-empty>
    </div>
    <!-- Bulk Actions (Below Pagination) -->
    <transition name="el-zoom-in-bottom">
      <div v-if="selectedShowtimes.length > 0" class="bulk-actions-bottom">
        <div class="action-buttons">
          <el-button
            type="danger"
            @click="forceDeleteSelectedShowtimes"
            v-permission="'showtimes.delete'"
          >
            {{ $t("actions.deleteSelected") }} ({{ selectedShowtimes.length }})
          </el-button>
          <el-button
            type="primary"
            @click="duplicateSelectedShowtimes"
            v-permission="'showtimes.create'"
          >
            {{ $t("actions.duplicateSelected") }} ({{ selectedShowtimes.length }})
          </el-button>
          <el-button @click="cancelSelection">
            {{ $t("actions.cancel") }}
          </el-button>
        </div>
      </div>
    </transition>

    <!-- Pagination -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="pagination.current_page"
        v-model:page-size="pagination.per_page"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { showtimeService } from "@/services/showtimeService";
import { theaterService } from "@/services/theaterService";
import { hallService } from "@/services/hallService";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  Search,
  Location,
  Calendar,
  View,
  Edit,
  Delete,
  Film,
  ArrowRight,
  Monitor,
  Close,
  CopyDocument,
} from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { debounce } from "lodash-es";
import { formatDate } from "@/utils/formatters";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

const router = useRouter();
const appStore = useAppStore();
const { t } = useI18n();

const loading = ref(false);
const showtimes = ref([]);
const theaters = ref([]);
const halls = ref([]);
const filteredHalls = ref([]);
const selectedShowtimes = ref([]);

const isSelected = (id) => selectedShowtimes.value.some((s) => s.id === id);

const toggleSelection = (showtime) => {
  const index = selectedShowtimes.value.findIndex((s) => s.id === showtime.id);
  if (index > -1) {
    selectedShowtimes.value.splice(index, 1);
  } else {
    selectedShowtimes.value.push(showtime);
  }
};

const isAllSelected = computed(() => {
  return (
    showtimes.value.length > 0 &&
    selectedShowtimes.value.length === showtimes.value.length
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedShowtimes.value.length > 0 &&
    selectedShowtimes.value.length < showtimes.value.length
  );
});

const handleSelectAllChange = (val) => {
  if (val) {
    selectedShowtimes.value = [...showtimes.value];
  } else {
    selectedShowtimes.value = [];
  }
};

// Filters
const filters = reactive({
  search: "",
  status: "",
  theater_id: "",
  hall_id: "",
  show_date: new Date().toISOString().split("T")[0], // Default to today
  sort_by: "start_time",
  sort_order: "asc",
});

// Pagination
const pagination = reactive({
  current_page: 1,
  per_page: 10,
  total: 0,
  total_pages: 0,
  has_next_page: false,
  has_prev_page: false,
});

// Debounced search
const debouncedSearch = debounce(() => {
  pagination.current_page = 1;
  loadShowtimes();
}, 500);

// Auto-refresh showtimes when filters change, the tab is focused, or global CRUD occurs
useAutoRefresh(() => loadShowtimes(), {
  deps: [filters, () => appStore.dataVersion],
});

// API Calls
const loadShowtimes = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      search: filters.search || undefined,
      status: filters.status || undefined,
      theater_id: filters.theater_id || undefined,
      hall_id: filters.hall_id || undefined,
      show_date: filters.show_date || undefined,
    };
    const response = await showtimeService.getShowtimes(params);
    if (response.data) {
      showtimes.value = response.data;
      pagination.total = response.total;
      pagination.current_page = response.current_page;
      pagination.per_page = response.per_page;
      pagination.total_pages = response.total_pages;
    }
  } catch (error) {
    console.error("Failed to load showtimes:", error);
    ElMessage.error(t("showtimes.loadFailed"));
  } finally {
    loading.value = false;
  }
};

const loadTheaters = async () => {
  try {
    const response = await theaterService.getTheaters({ per_page: 100 });
    if (response && response.data) {
      theaters.value = response.data;
    }
  } catch (error) {
    console.error("Load theaters error:", error);
  }
};

const loadHalls = async () => {
  try {
    const response = await hallService.getHalls({
      per_page: 100,
      status: "active", // Only load active halls
    });
    if (response && response.data) {
      halls.value = response.data;
    }
  } catch (error) {
    console.error("Load halls error:", error);
  }
};

// Handle theater filter change
const handleTheaterFilterChange = () => {
  filters.hall_id = "";
  filteredHalls.value = filters.theater_id
    ? halls.value.filter((hall) => hall.theater_id === filters.theater_id)
    : [];
};

// Pagination handlers
const handleSizeChange = (newSize) => {
  pagination.per_page = newSize;
  pagination.current_page = 1;
  loadShowtimes();
};

const handleCurrentChange = (newPage) => {
  pagination.current_page = newPage;
  loadShowtimes();
};

// Actions
const viewShowtime = (id) =>
  router.push({ name: "ShowtimeDetail", params: { id } });
const editShowtime = (id) =>
  router.push({ name: "EditShowtime", params: { id } });

const deleteShowtime = async (id) => {
  try {
    await ElMessageBox.confirm(
      t("showtimes.deleteConfirm"),
      t("showtimes.deleteTitle"),
      {
        confirmButtonText: t("actions.delete"),
        cancelButtonText: t("actions.cancel"),
        type: "warning",
      },
    );
    await showtimeService.deleteShowtime(id);
    ElMessage.success(t("showtimes.deleteSuccess"));
    appStore.triggerRefresh();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete showtime:", error);
      ElMessage.error(t("showtimes.deleteFailed"));
    }
  }
};

const forceDeleteSelectedShowtimes = async () => {
  try {
    await ElMessageBox.confirm(
      t("showtimes.deleteSelectedConfirm", {
        count: selectedShowtimes.value.length,
      }),
      t("showtimes.deleteTitle"),
      {
        confirmButtonText: t("actions.delete"),
        cancelButtonText: t("actions.cancel"),
        type: "warning",
      },
    );
    const ids = selectedShowtimes.value.map((s) => s.id);
    await showtimeService.forceDeleteBulkShowtimes(ids);
    ElMessage.success(t("showtimes.deleteSuccess"));
    appStore.triggerRefresh();
    cancelSelection();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete selected showtimes:", error);
      const errorMsg =
        error.response?.data?.message || t("showtimes.deleteFailed");
      ElMessage.error(errorMsg);
    }
  }
};
const cancelSelection = () => {
  selectedShowtimes.value = [];
};
const duplicateSelectedShowtimes = () => {
  const ids = selectedShowtimes.value.map((s) => s.id);
  router.push({
    name: "DuplicateShowtime",
    params: { ids: ids.join(",") },
  });
};
// Helpers
const getStatusTagType = (status) => {
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

// Init
onMounted(async () => {
  await Promise.all([loadTheaters(), loadHalls()]);

  if (filters.theater_id) handleTheaterFilterChange();

  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/" },
    { title: t("showtimes.title") },
  ]);
});
</script>

<style scoped>
.filter-card {
  margin-bottom: 24px;
  border-radius: 12px;
  background: var(--el-bg-color-overlay);
  backdrop-filter: blur(10px);
  border: 1px solid var(--el-border-color-lighter);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
}

.bulk-actions-bottom {
  margin: 24px 0 16px 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.selection-info {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.selection-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-count {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.selection-right {
  display: flex;
  gap: 8px;
}

.close-selection {
  border: none;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  transition: all 0.3s ease;
}

.close-selection:hover {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  transform: rotate(90deg);
}

/* Header Transition */
.header-fade-enter-active,
.header-fade-leave-active {
  transition: all 0.3s ease;
}

.header-fade-enter-from,
.header-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.toolbar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.grid-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.select-all-toggle {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.showtime-grid {
  margin-top: 0;
}

.showtime-card {
  position: relative;
  background: var(--el-bg-color);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.showtime-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary-light-5);
}

.showtime-card.is-selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.card-selection {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  background: var(--el-bg-color-overlay);
  padding: 4px;
  border-radius: 6px;
  line-height: 1;
}

.card-poster {
  position: relative;
  height: 160px;
  overflow: hidden;
}

.card-poster .el-image {
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}

.showtime-card:hover .card-poster .el-image {
  transform: scale(1.05);
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--el-text-color-placeholder);
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.card-content {
  padding: 12px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.movie-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}

.info-group {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.info-item .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.time-display {
  background: var(--el-fill-color-lighter);
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.time-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.time-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.time-arrow {
  color: var(--el-text-color-placeholder);
  font-size: 18px;
}

.card-actions {
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.action-upgrade {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.action-btn {
  padding: 8px 12px !important;
  border: none !important;
  transition: all 0.2s ease;
}

.action-btn.view {
  background-color: var(--el-fill-color-light) !important;
  color: var(--el-text-color-regular) !important;
}

.action-btn.view:hover {
  background-color: var(--el-fill-color) !important;
}

.action-btn.edit {
  background-color: var(--el-color-primary-light-8) !important;
  color: var(--el-color-primary) !important;
}

.action-btn.edit:hover {
  background-color: var(--el-color-primary) !important;
  color: white !important;
}

.action-btn.delete {
  background-color: var(--el-color-danger-light-8) !important;
  color: var(--el-color-danger) !important;
}

.action-btn.delete:hover {
  background-color: var(--el-color-danger) !important;
  color: white !important;
}

.pagination {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

.mb-6 {
  margin-bottom: 24px;
}
</style>
