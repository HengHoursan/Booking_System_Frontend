<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  Activity,
  LogIn,
  LogOut,
  Ticket,
  XOctagon,
  CalendarClock,
  Smartphone,
  Globe,
  Monitor,
  ShieldAlert,
} from "lucide-vue-next";
import { customerService } from "@/services/customerService";
import { useUiStore } from "@/stores/uiStore";

const router = useRouter();
const { t } = useI18n();
const uiStore = useUiStore();

const logs = ref([]);
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
});
const isLoading = ref(true);

const fetchLogs = async (page = 1) => {
  isLoading.value = true;
  try {
    const res = await customerService.getActivityLogs({ page, limit: 15 });
    if (res.success) {
      logs.value = res.data.logs;
      pagination.value = res.data.pagination;
    }
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    uiStore.showToast(t("messages.error"), "error");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchLogs();
});

const getActionIcon = (action) => {
  switch (action) {
    case "LOGIN":
      return LogIn;
    case "LOGOUT":
      return LogOut;
    case "BOOK_CREATE_PENDING":
    case "BOOK_CREATE_COMPLETED":
      return Ticket;
    case "BOOK_EXPIRE":
    case "BOOK_EXPIRE_PENDING":
    case "BOOK_EXPIRE_COMPLETED":
    case "BOOK_EXPIRED":
      return XOctagon;
    case "ACCOUNT_DEACTIVATED":
      return ShieldAlert;
    default:
      return Activity;
  }
};

const getActionColor = (action) => {
  switch (action) {
    case "LOGIN":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "LOGOUT":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "BOOK_CREATE_COMPLETED":
      return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    case "BOOK_EXPIRE":
    case "BOOK_EXPIRE_PENDING":
    case "BOOK_EXPIRE_COMPLETED":
    case "BOOK_EXPIRED":
    case "ACCOUNT_DEACTIVATED":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-neutral-400 bg-white/5 border-white/10";
  }
};

const getDeviceIcon = (deviceType) => {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return Smartphone;
    case "tablet":
      return Monitor;
    default:
      return Globe;
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActionLabel = (action) => {
  // Try to find translation or fallback to readable string
  const key = `activity.${action.toLowerCase()}`;
  const translated = t(key);
  if (translated !== key) return translated;

  return action.replace(/_/g, " ");
};
</script>

<template>
  <div
    class="activity-logs-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300"
  >
    <!-- Background -->
    <div class="activity-bg"></div>

    <!-- Header -->
    <header
      class="relative z-10 py-4 px-5 flex items-center gap-4 border-b border-slate-200 dark:border-white/[0.05] bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-md"
    >
      <button
        @click="router.back()"
        class="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.08] cursor-pointer"
      >
        <ArrowLeft :size="20" class="text-slate-500 dark:text-neutral-400" />
      </button>
      <div>
        <h1 class="text-lg font-bold leading-none text-slate-900 dark:text-white">
          {{ t("activity_logs.title") }}
        </h1>
        <p class="text-xs text-slate-400 dark:text-neutral-500 mt-1.5">
          {{ t("activity_logs.titleDesc") }}
        </p>
      </div>
    </header>

    <!-- Content -->
    <div class="relative z-10 flex-1 overflow-y-auto px-5 py-6">
      <div
        v-if="isLoading && logs.length === 0"
        class="flex flex-col items-center justify-center py-20 opacity-50"
      >
        <div
          class="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent mb-4"
        ></div>
      </div>

      <div
        v-else-if="logs.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div
          class="w-20 h-20 rounded-3xl bg-white dark:bg-white/[0.03] flex items-center justify-center mb-6 border border-slate-200 dark:border-white/[0.06] shadow-sm dark:shadow-none"
        >
          <Activity :size="32" class="text-slate-300 dark:text-neutral-600" />
        </div>
        <h3 class="text-lg font-bold text-slate-400 dark:text-neutral-300 mb-2">
          {{ t("activity_logs.noActivities") }}
        </h3>
        <p class="text-slate-400 dark:text-neutral-500 text-sm max-w-[240px]">
          {{ t("activity_logs.noActivitiesDesc") }}
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="log in logs"
          :key="log._id"
          class="log-card p-4 rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all shadow-sm dark:shadow-none"
        >
          <div class="flex gap-4">
            <!-- Action Icon -->
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0"
              :class="getActionColor(log.action)"
            >
              <component :is="getActionIcon(log.action)" :size="22" />
            </div>

            <!-- Log Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h4 class="font-bold text-sm truncate uppercase tracking-wider text-slate-800 dark:text-white">
                  {{ getActionLabel(log.action) }}
                </h4>
                <span class="text-[10px] font-bold text-neutral-500 shrink-0">
                  {{ formatDate(log.createdAt) }}
                </span>
              </div>

              <div class="mt-2 flex flex-wrap gap-3">
                <div
                  v-if="log.metadata?.device"
                  class="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium"
                >
                  <component
                    :is="getDeviceIcon(log.metadata.device)"
                    :size="12"
                    class="text-neutral-500"
                  />
                  {{ log.metadata.os }}
                  {{ log.metadata.browser ? `(${log.metadata.browser})` : "" }}
                </div>
                <div
                  v-if="log.ipAddress"
                  class="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium"
                >
                  <CalendarClock :size="12" class="text-slate-400 dark:text-neutral-500" />
                  IP: {{ log.ipAddress }}
                </div>
              </div>

              <!-- Status tag for failed actions -->
              <div
                v-if="log.status === 'FAILED'"
                class="mt-2 text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5"
              >
                <XOctagon :size="10" />
                {{ t("activity_logs.actionFailed") }}
              </div>
              <p
                v-if="log.metadata?.reason"
                class="mt-1 text-[10px] text-red-400/80 italic"
              >
                {{ t("activity_logs.reason") }}: {{ log.metadata.reason }}
              </p>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="pagination.totalPages > 1"
          class="flex items-center justify-center gap-4 py-6"
        >
          <button
            @click="fetchLogs(pagination.currentPage - 1)"
            :disabled="pagination.currentPage === 1"
            class="px-4 py-2 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-xs font-bold text-slate-600 dark:text-white disabled:opacity-30 cursor-pointer shadow-sm dark:shadow-none"
          >
            {{ t("actions.previous") }}
          </button>
          <span class="text-xs font-bold text-slate-400 dark:text-neutral-500">
            {{
              t("activity_logs.pageOf", {
                page: pagination.currentPage,
                total: pagination.totalPages,
              })
            }}
          </span>
          <button
            @click="fetchLogs(pagination.currentPage + 1)"
            :disabled="pagination.currentPage === pagination.totalPages"
            class="px-4 py-2 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-xs font-bold text-slate-600 dark:text-white disabled:opacity-30 cursor-pointer shadow-sm dark:shadow-none"
          >
            {{ t("actions.next") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-logs-page {
  /* background: #0a0a0c; */
}

.activity-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(14, 165, 233, 0.08) 0%,
      transparent 40%
    ),
    radial-gradient(
      circle at 0% 100%,
      rgba(139, 92, 246, 0.05) 0%,
      transparent 40%
    );
  pointer-events: none;
}

.log-card {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.03),
    rgba(255, 255, 255, 0.01)
  );
}
</style>
