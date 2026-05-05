<template>
  <div class="dashboard-container">
    <!-- Welcome Header -->
    <header class="dashboard-header animate-fade-in">
      <div class="header-content">
        <h1 class="welcome-text">
          {{ $t("nav.dashboard") }}
        </h1>
        <p class="subtitle-text">
          {{ welcomeMessage }}, {{ currentUser?.name || "Admin" }}!
          <span class="date-text">{{ currentDate }}</span>
        </p>
      </div>
      <!-- <div class="header-actions">
        <el-button type="primary" class="premium-btn" :icon="Bell">
          {{ $t("common.notification") }}
        </el-button>
      </div> -->
    </header>

    <!-- Statistics Cards -->
    <el-row :gutter="24" class="stats-row">
      <el-col
        v-for="(stat, index) in stats"
        :key="index"
        :xs="24"
        :sm="12"
        :lg="6"
        class="animate-slide-up"
        :style="{ animationDelay: `${index * 100}ms` }"
      >
        <el-card class="premium-stat-card" :class="stat.type">
          <div class="stat-glass-effect"></div>
          <div class="stat-content">
            <div class="stat-icon-wrapper">
              <el-icon><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-main">
              <span class="stat-label">{{
                $t(`dashboard.${stat.label}`)
              }}</span>
              <div class="stat-value-row">
                <h3 class="stat-value">
                  <span v-if="stat.isCurrency">$</span>{{ stat.value }}
                </h3>
                <span
                  class="stat-trend"
                  :class="stat.trend > 0 ? 'up' : 'down'"
                >
                  <el-icon>
                    <CaretTop v-if="stat.trend > 0" />
                    <CaretBottom v-else />
                  </el-icon>
                  {{ Math.abs(stat.trend) }}%
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts Section -->
    <div class="charts-section animate-slide-up" style="animation-delay: 400ms">
      <DashboardCharts />
    </div>
    <!-- Seat Layout Preview & Showtime Schedule -->
    <el-row
      :gutter="24"
      class="widgets-row animate-slide-up"
      style="animation-delay: 600ms; margin-top: 24px"
    >
      <el-col :xs="24" :lg="12">
        <!-- Core logic: interactive-mode lets clicking a card emit @select instead of navigating -->
        <ShowtimeSchedule interactive-mode @select="handleShowtimeSelect" />
      </el-col>
      <el-col :xs="24" :lg="12">
        <!-- Core logic: Receives the selectedShowtimeId and dynamically updates its seat map -->
        <SeatLayoutPreview
          :showtime-id="selectedShowtimeId"
          :hide-header="true"
        />
      </el-col>
    </el-row>
    <!-- Bottom Content: Recent Bookings & Activities -->
    <el-row
      :gutter="24"
      class="bottom-row animate-slide-up"
      style="animation-delay: 500ms; margin-top: 24px"
    >
      <el-col :xs="24" :lg="16">
        <el-card class="premium-table-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="header-title">
                <el-icon><Tickets /></el-icon>
                {{ $t("dashboard.recentBookings") }}
              </span>
              <el-button
                link
                type="primary"
                @click="router.push('/admin/bookings')"
              >
                {{ $t("dashboard.viewAll") }}
              </el-button>
            </div>
          </template>
          <el-table
            :data="recentBookings"
            style="width: 100%"
            v-loading="loading"
          >
            <el-table-column
              prop="reference_code"
              :label="$t('bookings.referenceCode')"
              width="130"
            >
              <template #default="{ row }">
                <span class="ref-code">#{{ row.reference_code }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="$t('bookings.customer')" min-width="150">
              <template #default="{ row }">
                {{ row.customer?.name || $t("customers.walkin") }}
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('bookings.movie')"
              min-width="180"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.movie?.title || " " }}
              </template>
            </el-table-column>
            <el-table-column
              prop="total_price"
              :label="$t('bookings.amount')"
              width="100"
            >
              <template #default="{ row }">
                <span class="amount-text">${{ row.total_price }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="booking_status"
              :label="$t('bookings.status')"
              width="120"
            >
              <template #default="{ row }">
                <el-tag
                  :type="getStatusType(row.booking_status)"
                  size="small"
                  effect="light"
                  round
                >
                  {{ $t(`bookings.${row.booking_status.toLowerCase()}`) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              fixed="right"
              :label="$t('bookings.actions')"
              width="100"
            >
              <template #default="{ row }">
                <el-button
                  circle
                  size="small"
                  :icon="View"
                  @click="viewBooking(row.id)"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card class="activity-feed-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="header-title">
                <el-icon><Bell /></el-icon>
                {{ $t("dashboard.recentActivities") }}
              </span>
            </div>
          </template>
          <div class="activity-timeline">
            <div
              v-for="activity in recentActivities"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-marker" :class="activity.type"></div>
              <div class="activity-content">
                <p class="activity-text">{{ activity.text }}</p>
                <span class="activity-time">{{ activity.time }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { useI18n } from "vue-i18n";
import {
  User,
  VideoCamera,
  Tickets,
  Money,
  Bell,
  View,
  CaretTop,
  CaretBottom,
} from "@element-plus/icons-vue";
import reportService from "@/services/reportService";
import { bookingService } from "@/services/bookingService";
import { userService } from "@/services/userService";
import DashboardCharts from "@/components/dashboard/DashboardCharts.vue";
import SeatLayoutPreview from "@/components/dashboard/SeatLayoutPreview.vue";
import ShowtimeSchedule from "@/components/dashboard/ShowtimeSchedule.vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const { t } = useI18n();

const currentUser = computed(() => authStore.user);
const loading = ref(false);

const selectedShowtimeId = ref("");
const handleShowtimeSelect = (id) => {
  selectedShowtimeId.value = id;
};

const currentDate = computed(() => dayjs().format("dddd, D MMMM YYYY"));
const welcomeMessage = computed(() => {
  const hour = dayjs().hour();
  if (hour < 12) return t("dashboard.goodMorning");
  if (hour < 18) return t("dashboard.goodAfternoon");
  return t("dashboard.goodEvening");
});

// Statistics
const totalUsers = ref(0);
const totalMovies = ref(0);
const totalBookings = ref(0);
const totalRevenue = ref(0);
const userTrend = ref(0);
const movieTrend = ref(0);
const bookingTrend = ref(0);
const revenueTrend = ref(0);

const stats = computed(() => [
  {
    label: "totalUsers",
    value: totalUsers.value,
    icon: User,
    type: "users",
    trend: userTrend.value,
  },
  {
    label: "totalMovies",
    value: totalMovies.value,
    icon: VideoCamera,
    type: "movies",
    trend: movieTrend.value,
  },
  {
    label: "totalBookings",
    value: totalBookings.value,
    icon: Tickets,
    type: "bookings",
    trend: bookingTrend.value,
  },
  {
    label: "totalRevenue",
    value: totalRevenue.value,
    icon: Money,
    type: "revenue",
    isCurrency: true,
    trend: revenueTrend.value,
  },
]);

// Recent activities
const recentActivities = ref([]);

const recentBookings = ref([]);

const getStatusType = (status) => {
  switch (status) {
    case "Completed":
      return "success";
    case "Pending":
      return "warning";
    case "Expired":
      return "danger";
    default:
      return "info";
  }
};

const viewBooking = (id) => {
  router.push(`/bookings/${id}`);
};

const loadDashboardData = async () => {
  loading.value = true;
  try {
    const [
      customersData,
      bookingsData,
      revenueData,
      moviesData,
      bookingsList,
      logsData,
    ] = await Promise.all([
      reportService.getTotalCustomers(),
      reportService.getTotalBookings(),
      reportService.getTotalRevenue(),
      reportService.getTotalMovies(),
      bookingService.getBookings({ limit: 5 }),
      userService.getActivityLogs({ limit: 8 }),
    ]);

    totalUsers.value = customersData.totalCustomers || 0;
    totalBookings.value = bookingsData.totalBookings || 0;
    totalRevenue.value = revenueData.totalRevenue || 0;
    totalMovies.value = moviesData.totalMovies || 0;

    userTrend.value = customersData.trend || 0;
    bookingTrend.value = bookingsData.trend || 0;
    revenueTrend.value = revenueData.trend || 0;
    movieTrend.value = moviesData.trend || 0;

    recentBookings.value = bookingsList.data || [];

    // Map real activity logs to dashboard format
    const logs = logsData.logs || logsData.data?.logs || [];
    recentActivities.value = logs.map((log) => {
      const name = log.userId?.name || t("dashboard.activity.system");
      const actionKey = `dashboard.activity.${log.action}`;
      // Use translated action label if it exists, else fall back to formatted raw action
      const formattedRawAction = log.action
        .replace(/force_delete/i, "delete")
        .replace(/_/g, " ")
        .toLowerCase();

      const actionLabel =
        t(actionKey) !== actionKey ? t(actionKey) : formattedRawAction;
      return {
        id: log._id,
        text: `${name} ${actionLabel}`,
        time: dayjs(log.createdAt).fromNow(),
        type: getActionType(log.action),
      };
    });
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  } finally {
    loading.value = false;
  }
};

const getActionType = (action) => {
  if (action.includes("DELETE") || action.includes("EXPIRE")) return "danger";
  if (action.includes("CREATE") || action.includes("COMPLETED"))
    return "success";
  if (action.includes("UPDATE")) return "warning";
  return "info";
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
  ]);
  loadDashboardData();
});
</script>

<style scoped>
.dashboard-container {
  padding: 10px;
  height: 100%;
}

/* Header Styling */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}
.welcome-text {
  padding: 10px 0 5px 0;
  font-size: 30px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(to right, var(--el-text-color-primary), #6366f1);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle-text {
  color: var(--el-text-color-secondary);
  font-size: 15px;
  margin: 10px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-text {
  padding: 4px 12px;
  background: var(--el-fill-color-light);
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
}

/* Premium Stat Cards */
.stats-row {
  margin-bottom: 32px;
}

.premium-stat-card {
  border: none;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--el-bg-color);
  cursor: default;
}

.premium-stat-card:hover {
  cursor: pointer;
}

.stat-glass-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  pointer-events: none;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px 4px;
  position: relative;
  z-index: 1;
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin-right: 20px;
  flex-shrink: 0;
}

.users .stat-icon-wrapper {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}
.movies .stat-icon-wrapper {
  background: linear-gradient(135deg, #f43f5e, #fb7185);
}
.bookings .stat-icon-wrapper {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
}
.revenue .stat-icon-wrapper {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.stat-main {
  flex-grow: 1;
}

.stat-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.stat-value {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.stat-trend {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.stat-trend.up {
  background: #f0fdf4;
  color: #16a34a;
}
.stat-trend.down {
  background: #fef2f2;
  color: #dc2626;
}

/* Charts & Tables */
.charts-section {
  margin-bottom: 32px;
}

.premium-table-card,
.activity-feed-card {
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

.ref-code {
  font-family: "JetBrains Mono", monospace;
  font-weight: 600;
  color: #6366f1;
}

.amount-text {
  font-weight: 700;
  color: var(--el-text-color-primary);
}

/* Activity timeline */
.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.activity-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.activity-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px var(--el-bg-color);
  z-index: 1;
}

.activity-marker.info {
  background: #6366f1;
}
.activity-marker.success {
  background: #10b981;
}
.activity-marker.warning {
  background: #f59e0b;
}
.activity-marker.danger {
  background: #ef4444;
}

.activity-item::before {
  content: "";
  position: absolute;
  left: 5.5px;
  top: 20px;
  bottom: -15px;
  width: 1px;
  background: var(--el-border-color-lighter);
}

.activity-item:last-child::before {
  display: none;
}

.activity-text {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* Animations */
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

.animate-slide-up {
  opacity: 0;
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
