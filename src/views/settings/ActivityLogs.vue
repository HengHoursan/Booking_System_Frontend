<template>
  <div class="activity-logs-view">
    <div
      class="header-actions mb-6 flex flex-wrap gap-4 items-center justify-between"
    >
      <div
        class="filter-group flex gap-2 flex-nowrap overflow-x-auto pb-2 sm:pb-0"
      >
        <el-select
          v-model="filters.role"
          :placeholder="t('system.rolePermissions') || 'Role'"
          clearable
          class="role-select"
          @change="fetchLogs(1)"
        >
          <el-option label="Superadmin" value="superadmin" />
          <el-option label="Admin" value="admin" />
          <el-option label="Cashier" value="cashier" />
        </el-select>

        <el-select
          v-model="filters.action"
          :placeholder="t('activity_logs.columns.action') || 'Action'"
          clearable
          class="action-select"
          @change="fetchLogs(1)"
        >
          <el-option
            v-for="action in actionOptions"
            :key="action"
            :label="t(`activity_logs.actions.${action}`) || action"
            :value="action"
          />
        </el-select>

        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="-"
          :start-placeholder="t('datetime.today')"
          :end-placeholder="t('datetime.today')"
          class="date-filter-range"
          @change="fetchLogs(1)"
        />
      </div>

      <el-tooltip :content="t('actions.refresh')" placement="top">
        <el-button
          circle
          :icon="RotateCw"
          @click="fetchLogs(1)"
          :loading="loading"
          class="refresh-btn"
        />
      </el-tooltip>
    </div>

    <!-- Logs List (Flattened) -->
    <div v-loading="loading" class="logs-container">
      <template v-if="logs.length > 0">
        <div class="logs-list">
          <div v-for="log in logs" :key="log._id" class="log-row">
            <div class="log-aside">
              <div class="log-indicator" :class="getActionClass(log.action)">
                <component :is="getActionIcon(log.action)" :size="20" />
              </div>
              <div class="timeline-line"></div>
            </div>

            <div class="log-main">
              <div class="log-top">
                <h4 class="log-action-text font-bold">
                  {{
                    t(`activity_logs.actions.${log.action}`) ||
                    formatAction(log.action)
                  }}
                </h4>
                <time class="log-time-text">{{
                  formatTime(log.createdAt)
                }}</time>
              </div>

              <div class="log-details mt-2 space-y-2">
                <div class="log-meta-group">
                  <!-- User Info (New) -->
                  <div v-if="log.userId" class="meta-bubble user-info">
                    <UserCog :size="14" />
                    <span class="font-bold">{{
                      log.userId.name || "System"
                    }}</span>
                    <el-tag
                      size="small"
                      :type="getRoleType(log.userId.role)"
                      effect="dark"
                      class="ml-2 role-tag"
                    >
                      {{ log.userId.role?.toUpperCase() }}
                    </el-tag>
                  </div>

                  <div class="meta-bubble">
                    <Monitor :size="14" />
                    <span>{{ log.metadata?.device || "Unknown Device" }}</span>
                  </div>
                  <div v-if="log.metadata?.os" class="meta-bubble">
                    <Globe :size="14" />
                    <span>{{ log.metadata.os }}</span>
                    <span v-if="log.metadata.browser" class="mx-1 opacity-30"
                      >|</span
                    >
                    <span v-if="log.metadata.browser">{{
                      log.metadata.browser
                    }}</span>
                  </div>
                  <div
                    v-if="log.metadata?.ip || log.ipAddress"
                    class="meta-bubble"
                  >
                    <MapPin :size="14" />
                    <span>{{ log.metadata?.ip || log.ipAddress }}</span>
                  </div>
                </div>

                <!-- Detailed Metadata -->
                <div
                  v-if="log.metadata?.referenceCode"
                  class="metadata-details"
                >
                  <div class="detail-tag">
                    <span class="label">REF:</span>
                    <span class="value">{{ log.metadata.referenceCode }}</span>
                  </div>
                  <div v-if="log.metadata?.totalPrice" class="detail-tag">
                    <span class="label">AMOUNT:</span>
                    <span class="value price"
                      >${{ log.metadata.totalPrice }}</span
                    >
                  </div>
                  <div v-if="log.metadata.paymentMethod" class="detail-tag">
                    <span class="label">PAYMENT METHOD:</span>
                    <span class="value">{{ log.metadata.paymentMethod }}</span>
                  </div>
                </div>
              </div>

              <div v-if="log.status === 'FAILED'" class="log-failure-box">
                <AlertCircle :size="14" />
                <span>{{
                  log.metadata?.reason || t("activity_logs.actionFailed")
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-footer mt-10">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            :page-size="pagination.limit"
            layout="prev, pager, next, total"
            :total="pagination.totalCount"
            @current-change="fetchLogs"
            class="premium-pagination"
          />
        </div>
      </template>

      <div v-else class="empty-state-wrapper">
        <div class="empty-state-content">
          <div class="empty-illustration">
            <div class="icon-orb">
              <Activity :size="48" />
            </div>
            <div class="pulse-ring"></div>
          </div>
          <h3 class="empty-title">{{ t("activity_logs.noActivities") }}</h3>
          <p class="empty-desc">{{ t("activity_logs.noActivitiesDesc") }}</p>
          <el-button
            type="primary"
            plain
            round
            class="refresh-link"
            @click="fetchLogs(1)"
          >
            {{ t("actions.refresh") }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";
import {
  LogIn,
  LogOut,
  UserPlus,
  UserCheck,
  UserMinus,
  UserCog,
  ShieldCheck,
  Clock,
  TicketCheck,
  Ticket,
  CalendarDays,
  Armchair,
  XCircle,
  RotateCcw,
  Trash2,
  ShieldAlert,
  Activity,
  RotateCw,
  UserCircle,
  KeyRound,
  Lock,
  Clapperboard,
  Building2,
  Layout,
  CreditCard,
  FileOutput,
  Tags,
  FileUp,
  FileX,
  FileText,
  Bell,
  Monitor,
  Globe,
  MapPin,
  AlertCircle,
} from "lucide-vue-next";
import { userService } from "@/services/userService";
import { ElMessage } from "element-plus";

const { t } = useI18n();
const appStore = useAppStore();
const loading = ref(false);
const logs = ref([]);
const pagination = ref({
  currentPage: 1,
  limit: 10,
  totalCount: 0,
});

const filters = ref({
  role: "",
  action: "",
  dateRange: null,
});

const actionOptions = [
  "LOGIN",
  "LOGOUT",
  "REGISTER",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET",
  "PROFILE_UPDATE",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DELETE",
  "USER_RESTORE",
  "USER_FORCE_DELETE",
  "USER_STATUS_UPDATE",
  "CUSTOMER_CREATE",
  "CUSTOMER_UPDATE",
  "CUSTOMER_DELETE",
  "CUSTOMER_RESTORE",
  "CUSTOMER_FORCE_DELETE",
  "ROLE_CREATE",
  "ROLE_DELETE",
  "PERMISSION_CREATE",
  "PERMISSION_DELETE",
  "MOVIE_CREATE",
  "MOVIE_UPDATE",
  "MOVIE_DELETE",
  "MOVIE_RESTORE",
  "MOVIE_FORCE_DELETE",
  "MOVIE_STATUS_UPDATE",
  "THEATER_CREATE",
  "THEATER_UPDATE",
  "THEATER_DELETE",
  "THEATER_RESTORE",
  "THEATER_FORCE_DELETE",
  "HALL_CREATE",
  "HALL_UPDATE",
  "HALL_DELETE",
  "HALL_RESTORE",
  "HALL_FORCE_DELETE",
  "SHOWTIME_CREATE",
  "SHOWTIME_UPDATE",
  "SHOWTIME_DELETE",
  "SHOWTIME_RESTORE",
  "SHOWTIME_FORCE_DELETE",
  "SHOWTIME_STATUS_UPDATE",
  "SEAT_CREATE",
  "SEAT_UPDATE",
  "SEAT_DELETE",
  "SEAT_RESTORE",
  "SEAT_FORCE_DELETE",
  "SEAT_BOOKING_UPDATE",
  "PROMOTION_CREATE",
  "PROMOTION_UPDATE",
  "PROMOTION_DELETE",
  "PROMOTION_RESTORE",
  "PROMOTION_FORCE_DELETE",
  "PROMOTION_STATUS_UPDATE",
  "PAYMENT_CREATE",
  "PAYMENT_UPDATE",
  "PAYMENT_DELETE",
  "PAYMENT_STATUS_UPDATE",
  "PAYMENT_VERIFIED",
  "INVOICE_GENERATE",
  "INVOICE_DELETE",
  "NOTIFICATION_CREATE",
  "NOTIFICATION_UPDATE",
  "NOTIFICATION_DELETE",
  "NOTIFICATION_SEND",
  "REPORT_GENERATE",
  "FILE_UPLOAD",
  "FILE_DELETE",
  "BOOK_CREATE_PENDING",
  "BOOK_CREATE_COMPLETED",
  "BOOK_COMPLETED",
  "BOOK_UPDATE",
  "BOOK_UPDATE_SEATS",
  "BOOK_EXPIRE",
  "BOOK_EXPIRE_PENDING",
  "BOOK_EXPIRE_COMPLETED",
  "BOOK_RESTORE",
  "BOOK_DELETE",
  "BOOK_FORCE_DELETE",
  "BOOK_EXPIRED",
];

const fetchLogs = async (page = 1) => {
  loading.value = true;
  try {
    const params = {
      page,
      limit: pagination.value.limit,
    };
    if (filters.value.role) params.role = filters.value.role;
    if (filters.value.action) params.action = filters.value.action;

    // Handle both single date and daterange
    if (filters.value.dateRange) {
      if (
        Array.isArray(filters.value.dateRange) &&
        filters.value.dateRange.length === 2
      ) {
        params.startDate = filters.value.dateRange[0].toISOString();
        params.endDate = filters.value.dateRange[1].toISOString();
      } else {
        // Single date handle
        const date = new Date(filters.value.dateRange);
        params.startDate = date.toISOString();
        params.endDate = date.toISOString();
      }
    }

    const response = await userService.getActivityLogs(params);
    if (response) {
      logs.value = response.logs || response.data?.logs || [];
      const meta = response.pagination || response.data?.pagination || {};
      pagination.value = {
        ...pagination.value,
        currentPage: meta.currentPage || page,
        totalCount: meta.totalCount || 0,
      };
    }
  } catch (error) {
    console.error("Fetch logs error:", error);
    ElMessage.error(t("activity_logs.fetchFailed"));
  } finally {
    loading.value = false;
  }
};

const getActionIcon = (action) => {
  const icons = {
    // --- Auth & Profile ---
    LOGIN: LogIn,
    LOGOUT: LogOut,
    REGISTER: UserCircle,
    PASSWORD_RESET_REQUEST: Lock,
    PASSWORD_RESET: KeyRound,
    PROFILE_UPDATE: UserCheck,

    // --- User & Role Management ---
    USER_CREATE: UserPlus,
    USER_UPDATE: UserCheck,
    USER_DELETE: UserMinus,
    USER_RESTORE: RotateCcw,
    USER_FORCE_DELETE: ShieldAlert,
    USER_STATUS_UPDATE: UserCog,
    ROLE_CREATE: ShieldCheck,
    ROLE_DELETE: ShieldAlert,
    PERMISSION_CREATE: ShieldCheck,
    PERMISSION_DELETE: ShieldAlert,

    // --- Customer Management ---
    CUSTOMER_CREATE: UserPlus,
    CUSTOMER_UPDATE: UserCheck,
    CUSTOMER_DELETE: UserMinus,
    CUSTOMER_RESTORE: RotateCcw,
    CUSTOMER_FORCE_DELETE: ShieldAlert,

    // --- Movie & Show Management ---
    MOVIE_CREATE: Clapperboard,
    MOVIE_UPDATE: Clapperboard,
    MOVIE_DELETE: Trash2,
    MOVIE_RESTORE: RotateCcw,
    MOVIE_FORCE_DELETE: ShieldAlert,
    MOVIE_STATUS_UPDATE: Activity,
    THEATER_CREATE: Building2,
    THEATER_UPDATE: Building2,
    THEATER_DELETE: Trash2,
    THEATER_RESTORE: RotateCcw,
    THEATER_FORCE_DELETE: ShieldAlert,
    HALL_CREATE: Layout,
    HALL_UPDATE: Layout,
    HALL_DELETE: Trash2,
    HALL_RESTORE: RotateCcw,
    HALL_FORCE_DELETE: ShieldAlert,
    SHOWTIME_CREATE: CalendarDays,
    SHOWTIME_UPDATE: CalendarDays,
    SHOWTIME_DELETE: Trash2,
    SHOWTIME_RESTORE: RotateCcw,
    SHOWTIME_FORCE_DELETE: ShieldAlert,
    SHOWTIME_STATUS_UPDATE: Activity,

    // --- Seat Management ---
    SEAT_CREATE: Armchair,
    SEAT_UPDATE: Armchair,
    SEAT_DELETE: Trash2,
    SEAT_RESTORE: RotateCcw,
    SEAT_FORCE_DELETE: ShieldAlert,
    SEAT_BOOKING_UPDATE: Armchair,

    // --- Booking Lifecycle ---
    BOOK_CREATE_PENDING: Clock,
    BOOK_CREATE_COMPLETED: TicketCheck,
    BOOK_COMPLETED: TicketCheck,
    BOOK_UPDATE: CalendarDays,
    BOOK_UPDATE_SEATS: Armchair,
    BOOK_EXPIRE: XCircle,
    BOOK_EXPIRE_PENDING: Clock,
    BOOK_EXPIRE_COMPLETED: XCircle,
    BOOK_RESTORE: RotateCcw,
    BOOK_DELETE: Trash2,
    BOOK_FORCE_DELETE: ShieldAlert,
    BOOK_EXPIRED: Clock,

    // --- Payments & Invoices ---
    PAYMENT_CREATE: CreditCard,
    PAYMENT_UPDATE: CreditCard,
    PAYMENT_DELETE: Trash2,
    PAYMENT_STATUS_UPDATE: Activity,
    PAYMENT_VERIFIED: ShieldCheck,
    INVOICE_GENERATE: FileOutput,
    INVOICE_DELETE: Trash2,

    // --- Promotion Management ---
    PROMOTION_CREATE: Tags,
    PROMOTION_UPDATE: Tags,
    PROMOTION_DELETE: Trash2,
    PROMOTION_RESTORE: RotateCcw,
    PROMOTION_FORCE_DELETE: ShieldAlert,
    PROMOTION_STATUS_UPDATE: Activity,

    // --- Notifications ---
    NOTIFICATION_CREATE: Bell,
    NOTIFICATION_UPDATE: Bell,
    NOTIFICATION_DELETE: Trash2,
    NOTIFICATION_SEND: Bell,

    // --- System Operations ---
    REPORT_GENERATE: FileText,
    FILE_UPLOAD: FileUp,
    FILE_DELETE: FileX,
  };

  return icons[action] || Activity;
};

const getActionClass = (action) => {
  if (action?.includes("DELETE") || action?.includes("FORCE"))
    return "indicator-danger";
  if (
    action?.includes("EXPIRE") ||
    action?.includes("EXPIRED") ||
    action?.includes("PASSWORD_RESET_REQUEST")
  )
    return "indicator-warning";
  if (
    action?.includes("CREATE") ||
    action?.includes("RESTORE") ||
    action?.includes("REGISTER") ||
    action?.includes("VERIFIED") ||
    action?.includes("GENERATE") ||
    action?.includes("UPLOAD") ||
    action?.includes("SEND")
  )
    return "indicator-success";
  if (action?.includes("UPDATE") || action?.includes("STATUS"))
    return "indicator-warning";
  if (action?.includes("LOGIN") || action?.includes("LOGOUT"))
    return "indicator-primary";
  return "indicator-neutral";
};

const getRoleType = (role) => {
  const types = {
    superadmin: "danger",
    admin: "warning",
    cashier: "success",
  };
  return types[role?.toLowerCase()] || "info";
};

const formatAction = (action) => {
  return action.replace(/_/g, " ");
};

const formatTime = (date) => {
  return new Date(date).toLocaleString();
};

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/dashboard" },
    { title: t("settings.title"), path: "/settings" },
    { title: t("activity_logs.title"), path: "/settings/activity-logs" },
  ]);
  fetchLogs();
});
</script>

<style scoped>
.activity-logs-view {
  animation: fadeIn 0.4s ease-out;
}

.filter-group {
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 100%;
}

.role-select {
  width: 130px !important;
}

.action-select {
  width: 200px !important;
}

.date-filter-range {
  width: 320px !important;
}

.view-title {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 8px 0;
  color: var(--primary-color);
}

.view-subtitle {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.logs-container {
  position: relative;
  min-height: 200px;
}

.timeline-container {
  position: relative;
}

.logs-list {
  display: flex;
  flex-direction: column;
}

.log-row {
  display: flex;
  gap: 20px;
  padding-bottom: 24px;
  position: relative;
}

.log-row:last-child {
  padding-bottom: 0;
}

.log-aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.log-indicator {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: all 0.3s;
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: var(--el-border-color-lighter);
  margin: 8px 0;
  opacity: 0.6;
}

.log-row:last-child .timeline-line {
  display: none;
}

.indicator-primary {
  background: rgba(var(--el-color-primary-rgb), 0.15);
  color: var(--primary-color);
}
.indicator-success {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.indicator-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.indicator-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.indicator-neutral {
  background: rgba(100, 116, 139, 0.15);
  color: #64748b;
}

.log-main {
  flex: 1;
  padding-top: 2px;
}

.log-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.log-action-text {
  font-size: 15px;
  color: var(--text-color-primary);
  margin: 0;
}

.log-time-text {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.log-meta-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-bubble {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
}

.meta-bubble.user-info {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

.role-tag {
  border-radius: 4px;
  font-weight: 800;
  font-size: 10px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metadata-details {
  display: flex;
  gap: 12px;
}

.detail-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: var(--el-font-family-mono, monospace);
}

.detail-tag .label {
  color: var(--el-text-color-secondary);
  font-weight: 600;
  font-size: 10px;
}

.detail-tag .value {
  color: var(--el-color-primary);
  font-weight: 700;
  background: rgba(var(--el-color-primary-rgb), 0.05);
  padding: 2px 8px;
  border-radius: 4px;
}

.detail-tag .value.price {
  color: #10b981;
  background: #f0fdf4;
}

.log-failure-box {
  margin-top: 12px;
  background: #fef2f2;
  color: #ef4444;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px dashed #fecaca;
}

.pagination-footer {
  display: flex;
  justify-content: center;
}

/* Custom Empty State Styles */
.empty-state-wrapper {
  padding: 80px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-state-content {
  text-align: center;
  max-width: 320px;
}

.empty-illustration {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-orb {
  width: 80px;
  height: 80px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  border: 4px solid white;
  box-shadow: 0 8px 16px rgba(var(--el-color-primary-rgb), 0.1);
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid var(--el-color-primary-light-8);
  border-radius: 50%;
  opacity: 0.5;
}

.empty-illustration::after {
  content: "";
  position: absolute;
  width: 120%;
  height: 120%;
  background: radial-gradient(
    circle,
    rgba(var(--el-color-primary-rgb), 0.05) 0%,
    transparent 70%
  );
  border-radius: 50%;
  z-index: 0;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.empty-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.refresh-link {
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 12px 28px;
  height: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.refresh-link:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 15px rgba(var(--el-color-primary-rgb), 0.15);
}

/* Animations removed */

@media (max-width: 640px) {
  .log-top {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
