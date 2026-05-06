<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/stores/notification";
import { useUiStore } from "@/stores/uiStore";
import { getRelativeTime } from "@/utils/formatters";

const router = useRouter();
const { t, te } = useI18n();
const notificationStore = useNotificationStore();

/**
 * Resolve a localized title for a notification.
 * Titles don't need metadata interpolation, so always attempt translation.
 */
const getLocalizedTitle = (item) => {
  if (!item) return "";
  const key = `notifications_i18n.${item.type}.title`;
  if (te(key)) {
    return t(key, item.metadata || {});
  }
  return item.title;
};

/**
 * Resolve a localized message for a notification.
 * Uses metadata for interpolation when available.
 * Falls back to the raw message stored in the database for older notifications.
 */
const getLocalizedMessage = (item) => {
  if (!item) return "";
  const key = `notifications_i18n.${item.type}.message`;
  if (te(key) && item.metadata && Object.keys(item.metadata).length > 0) {
    return t(key, item.metadata);
  }
  return item.message;
};

const uiStore = useUiStore();

const showMessage = (text, type = "success") => {
  uiStore.showToast(text, type);
};

const notifications = computed(() => notificationStore.notifications);
const unreadCount = computed(() => notificationStore.unreadCount);

onMounted(() => {
  notificationStore.fetchNotifications();
});

const selectedNotification = ref(null);

const handleNotificationClick = async (item) => {
  selectedNotification.value = item;
  if (!item.isRead) {
    try {
      await notificationStore.markAsRead(item._id);
    } catch (error) {
      showMessage(t("messages.errorMarkingAsRead"), "error");
    }
  }
};

const markAllAsRead = async () => {
  try {
    await notificationStore.markAllAsRead();
    showMessage(t("messages.allMarkedAsRead"));
  } catch (error) {
    showMessage(t("messages.errorMarkingAllAsRead"), "error");
  }
};

const deleteNotification = async (id) => {
  try {
    await notificationStore.deleteNotification(id);
    showMessage(t("messages.notificationDeleted"));
  } catch (error) {
    showMessage(t("messages.errorDeletingNotification"), "error");
  }
};

const deleteAllNotifications = async () => {
  const confirmed = await uiStore.confirm({
    title: t("messages.clearAllNotificationsPrompt"),
    message:
      t("messages.clearAllNotificationsWarning") ||
      "This will permanently remove all your notifications.",
    confirmText: t("actions.clearAll"),
    cancelText: t("actions.cancel"),
    type: "danger",
  });

  if (confirmed) {
    try {
      await notificationStore.deleteAllNotifications();
      showMessage(t("messages.allNotificationsCleared"));
    } catch (error) {
      showMessage(t("messages.errorClearingNotifications"), "error");
    }
  }
};
</script>

<template>
  <div
    class="notifications-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300"
  >
    <!-- Background -->
    <div class="settings-bg"></div>

    <div class="relative z-10 min-h-screen flex flex-col">
      <!-- Header -->
      <header
        class="py-3 px-5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.05]"
      >
        <div class="flex items-center gap-3">
          <button
            @click="router.back()"
            class="w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.08] cursor-pointer"
          >
            <ArrowLeft
              :size="18"
              class="text-slate-500 dark:text-neutral-400"
            />
          </button>
          <h1 class="text-sm font-bold">{{ t("settings.notifications") }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            {{ t("actions.markAllAsRead") }}
          </button>
          <button
            v-if="notifications.length > 0"
            @click="deleteAllNotifications"
            class="text-xs font-medium text-red-400 hover:text-red-300 transition-colors ml-3"
          >
            {{ t("actions.clearAll") }}
          </button>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-5 py-6">
        <div v-if="notifications.length > 0" class="space-y-2">
          <div
            v-for="item in notifications"
            :key="item._id"
            @click="handleNotificationClick(item)"
            class="group rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden p-4 transition-all duration-300 cursor-pointer active:scale-[0.99] shadow-sm dark:shadow-none"
            :class="[
              item.isRead
                ? 'bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                : 'bg-white dark:bg-white/[0.05] border-sky-500/20 dark:border-sky-500/20 ring-1 ring-sky-500/10 hover:bg-slate-50 dark:hover:bg-white/[0.07]',
            ]"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 min-w-0 flex items-center gap-3">
                <span
                  v-if="!item.isRead"
                  class="w-2 h-2 rounded-full bg-sky-500 shadow-lg shadow-sky-500/40 flex-shrink-0"
                ></span>
                <div class="flex-1 min-w-0">
                  <h3
                    class="text-sm font-semibold truncate text-slate-900 dark:text-white group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors"
                  >
                    {{ getLocalizedTitle(item) }}
                  </h3>
                  <span
                    class="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5 block"
                  >
                    {{ getRelativeTime(item.createdAt) }}
                  </span>
                </div>
              </div>
              <button
                @click.stop="deleteNotification(item._id)"
                class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/[0.03] hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 text-slate-400 dark:text-neutral-500 transition-all"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
        <div
          v-else
          class="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02] p-10 text-center"
        >
          <p class="text-sm text-slate-400 dark:text-neutral-400">
            {{ t("messages.noNotifications") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Notification Detail Modal -->
    <div
      v-if="selectedNotification"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300"
    >
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-md"
        @click="selectedNotification = null"
      ></div>

      <div
        class="relative w-full max-w-sm bg-white dark:bg-[#0f0f12]/90 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300 backdrop-blur-xl"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500"
          >
            <Bell :size="20" />
          </div>
          <div class="flex-1 min-w-0">
            <h3
              class="text-base font-bold text-slate-900 dark:text-white leading-tight"
            >
              {{ getLocalizedTitle(selectedNotification) }}
            </h3>
            <p class="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
              {{ getRelativeTime(selectedNotification.createdAt) }}
            </p>
          </div>
        </div>

        <div class="max-h-[300px] overflow-y-auto mb-6 custom-scrollbar pr-2">
          <p
            class="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap"
          >
            {{ getLocalizedMessage(selectedNotification) }}
          </p>
        </div>

        <button
          @click="selectedNotification = null"
          class="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white/[0.05] text-white font-bold hover:bg-slate-800 dark:hover:bg-white/[0.08] transition-all border border-slate-800 dark:border-white/[0.08]"
        >
          {{ t("actions.close") || "Close" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-page {
  /* background: #0a0a0c; */
}

.settings-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(
      ellipse 80% 50% at 50% 0%,
      rgba(14, 165, 233, 0.04) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse 50% 40% at 80% 100%,
      rgba(139, 92, 246, 0.03) 0%,
      transparent 50%
    );
  pointer-events: none;
}
</style>
