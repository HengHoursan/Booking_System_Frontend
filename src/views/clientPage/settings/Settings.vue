<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import api from "@/utils/api";
import {
  ArrowLeft,
  User as UserIcon,
  AtSign,
  Shield,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Pencil,
  Ticket,
  Activity,
  Sun,
  Moon,
} from "lucide-vue-next";
import { isDark, toggleDark } from "@/composables/useTheme";

import { useRouter } from "vue-router";
import { setLanguage, availableLocales } from "@/i18n";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/uiStore";
import { useNotificationStore } from "@/stores/notification";

const router = useRouter();
const { t, locale } = useI18n();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const uiStore = useUiStore();
const unreadCount = computed(() => notificationStore.unreadCount);

// Real user data from API
const user = ref({
  first_name: "",
  last_name: "",
  username: "",
  telegram_id: null,
  photo_url: "",
  auth_date: "",
});

const fullName = ref("");
const isLoading = ref(true);

onMounted(async () => {
  try {
    const res = await api.get("/customer/auth/profile");
    if (res.data?.success && res.data?.data?.customer) {
      const customerData = res.data.data.customer;

      const nameParts = (customerData.name || "").split(" ");
      user.value = {
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        username: customerData.username || "",
        telegram_id: customerData.telegramId || null,
        photo_url: customerData.photoUrl || "",
        auth_date: customerData.createdAt || "",
      };
      fullName.value = customerData.name || "Customer";
    }
  } catch (error) {
    console.error("Failed to fetch customer profile:", error);
  } finally {
    isLoading.value = false;
  }
});

const handleLogout = async () => {
  const confirmed = await uiStore.confirm({
    title: t("settings.logoutConfirm.title"),
    message:
      t("settings.logoutConfirm.message") || "Are you sure you want to log out?",
    confirmText: t("settings.logoutConfirm.confirmButton"),
    cancelText: t("common.cancel"),
    type: "danger",
  });

  if (confirmed) {
    setTimeout(async () => {
      await authStore.logout();
      router.push({ name: "Login Page", query: { loggedOut: "1" } });
    }, 1000);
  }
};

const currentLocale = computed({
  get: () => locale.value,
  set: (val) => setLanguage(val),
});

// Menu sections
const menuItems = computed(() => [
  {
    label: t("settings.account"),
    items: [
      {
        id: "personalInfo",
        icon: UserIcon,
        title: t("settings.personalInfo"),
        subtitle: t("settings.personalInfoDesc"),
        action: () => router.push({ name: "Personal Info" }),
      },
      {
        id: "privacySecurity",
        icon: Shield,
        title: t("settings.privacySecurity"),
        subtitle: t("settings.privacySecurityDesc"),
        action: () => router.push({ name: "Privacy Security" }),
      },
      {
        id: "activityLogs",
        icon: Activity,
        title: t("settings.activityHistory"),
        subtitle: t("settings.activityHistoryDesc"),
        action: () => router.push({ name: "Activity Logs" }),
      },
    ],
  },

  {
    label: t("settings.preferences"),
    items: [
      {
        id: "notifications",
        icon: Bell,
        title: t("settings.notifications"),
        subtitle: t("settings.notificationsDesc"),
        action: () => router.push({ name: "Notifications Setting" }),
        badge: unreadCount.value > 0 ? unreadCount.value : null,
      },
      {
        id: "language",
        icon: Globe,
        title: t("settings.language"),
        subtitle: t("settings.languageDesc"),
        type: "dropdown",
      },
      {
        id: "tickets",
        icon: Ticket,
        title: t("my_tickets"),
        subtitle: t("tickets_subtitle") || "View your booking history",
        action: () => router.push({ name: "My Tickets" }),
      },
    ],
  },
  {
    label: t("settings.appearance") || "Appearance",
    items: [
      {
        id: "theme",
        icon: isDark.value ? Moon : Sun,
        title: isDark.value ? (t("settings.darkMode") || "Dark Mode") : (t("settings.lightMode") || "Light Mode"),
        subtitle: t("settings.themeDesc") || "Toggle between light and dark theme",
        type: "toggle",
      },
    ],
  },
]);
</script>

<template>
  <div class="settings-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
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
            <ArrowLeft :size="18" class="text-slate-500 dark:text-neutral-400" />
          </button>
          <h1 class="text-sm font-bold">{{ t("settings.title") }}</h1>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Profile Preview Card -->
        <div class="px-5 py-6">
          <div
            class="settings-profile-card bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-6 shadow-sm dark:shadow-none"
          >
            <div class="flex items-center gap-4">
              <!-- Avatar -->
              <div class="relative">
                <div
                  v-if="user.photo_url"
                  class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-white/[0.1]"
                >
                  <img
                    :src="user.photo_url"
                    :alt="fullName"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="settings-avatar w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-slate-200 dark:border-white/[0.1]"
                >
                  <span class="text-xl font-bold text-white">
                    {{ user.first_name.charAt(0)
                    }}{{ user.last_name.charAt(0) }}
                  </span>
                </div>
                <!-- Edit badge -->
                <button
                  @click="router.push({ name: 'Personal Info' })"
                  class="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center border-2 border-white dark:border-[#0a0a0c] cursor-pointer"
                >
                  <Pencil :size="10" class="text-white" />
                </button>
              </div>

              <!-- User Info -->
              <div class="flex-1 min-w-0">
                <h2 class="text-base font-bold truncate">{{ fullName }}</h2>
                <div class="flex items-center gap-1.5 mt-1">
                  <AtSign :size="12" class="text-sky-400 flex-shrink-0" />
                  <span class="text-sm text-sky-400 font-medium truncate">
                    {{ user.username }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 mt-1.5">
                  <!-- Telegram icon -->
                  <svg
                    viewBox="0 0 24 24"
                    class="h-3 w-3 fill-neutral-500 flex-shrink-0"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.13 7.19c-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59l2.76-2.69c.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02l-5.54 3.69c-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.75 3.78-1.64 6.3-2.73 7.55-3.26 3.58-1.51 4.34-1.77 4.83-1.77.11 0 .35.03.5.15.13.1.17.24.18.33 0 .06 0 .16-.02.2z"
                    />
                  </svg>
                  <span class="text-[11px] text-slate-500 dark:text-neutral-500">{{
                    t("settings.telegramConnected")
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Telegram Info Strip -->
            <div class="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.04]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div
                    class="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-sky-400">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.13 7.19c-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59l2.76-2.69c.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02l-5.54 3.69c-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.75 3.78-1.64 6.3-2.73 7.55-3.26 3.58-1.51 4.34-1.77 4.83-1.77.11 0 .35.03.5.15.13.1.17.24.18.33 0 .06 0 .16-.02.2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                      {{ t("users.username") }}
                    </p>
                    <p class="text-[11px] text-sky-400 font-medium">
                      @{{ user.username }}
                    </p>
                  </div>
                </div>
                <div
                  class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                >
                  <span class="text-[10px] font-semibold text-emerald-400">{{
                    t("validation.verified")
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Menu Sections -->
        <div class="px-5 space-y-6 pb-6">
          <div v-for="section in menuItems" :key="section.label">
            <h3
              class="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-600 mb-3 px-1"
            >
              {{ section.label }}
            </h3>
            <div
              class="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm dark:shadow-none"
            >
              <button
                v-for="item in section.items"
                :key="item.id"
                @click="item.action ? item.action() : (item.type === 'toggle' ? toggleDark() : null)"
                class="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <div
                  class="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center flex-shrink-0"
                >
                  <component
                    :is="item.icon"
                    :size="16"
                    class="text-slate-500 dark:text-neutral-400"
                  />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ item.title }}</p>
                  <p class="text-[11px] text-slate-500 dark:text-neutral-500 mt-0.5">
                    {{ item.subtitle }}
                  </p>
                </div>

                <!-- Badge -->
                <div
                  v-if="item.badge"
                  class="h-5 min-w-[20px] rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center px-1.5"
                >
                  <span class="text-[10px] font-bold text-red-400">{{
                    item.badge > 9 ? "9+" : item.badge
                  }}</span>
                </div>

                <div
                  v-if="item.type === 'dropdown' && item.id === 'language'"
                  class="flex items-center gap-2"
                  @click.stop
                >
                  <select
                    v-model="currentLocale"
                    class="bg-slate-100 dark:bg-white/[0.05] text-xs font-medium text-slate-700 dark:text-neutral-300 outline-none border border-slate-200 dark:border-white/[0.05] px-2 py-1 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <option
                      v-for="lang in availableLocales"
                      :key="lang.code"
                      :value="lang.code"
                      class="bg-white dark:bg-[#0a0a0c] text-slate-900 dark:text-white"
                    >
                      {{ lang.nativeName }}
                    </option>
                  </select>
                </div>

                <div v-else-if="item.type === 'toggle'" class="flex items-center" @click.stop="toggleDark()">
                   <div :class="[
                      'w-10 h-5 rounded-full transition-colors relative cursor-pointer',
                      isDark ? 'bg-sky-500' : 'bg-slate-200'
                   ]">
                      <div :class="[
                        'absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200',
                        isDark ? 'translate-x-5' : 'translate-x-0'
                      ]"></div>
                   </div>
                </div>
                <div v-else-if="item.rightText" class="flex items-center gap-2">
                  <span
                    class="text-xs font-medium text-neutral-300 bg-white/[0.05] px-2 py-1 rounded-md"
                    >{{ item.rightText }}</span
                  >
                </div>

                <ChevronRight
                  v-if="!item.rightText && item.type !== 'dropdown' && item.type !== 'toggle'"
                  :size="16"
                  class="text-slate-300 dark:text-neutral-600 flex-shrink-0"
                />
              </button>
            </div>
          </div>

          <!-- Sign Out -->
          <div>
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-white/[0.02] border border-red-500/10 dark:border-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/[0.04] cursor-pointer transition-colors shadow-sm dark:shadow-none"
            >
              <LogOut :size="16" class="text-red-400" />
              <span class="text-sm font-semibold text-red-400">{{
                t("client.logout")
              }}</span>
            </button>
          </div>

          <!-- App footer -->
          <div class="text-center pb-4">
            <p class="text-[10px] text-slate-400 dark:text-neutral-700">Ninja Booking v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
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

.settings-profile-card {
  transition: all 0.3s ease;
}

.settings-avatar {
  background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
}

/* Premium Custom Toast */
.premium-toast {
  box-shadow:
    0 10px 40px -10px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.toast-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  transform-origin: left;
  animation: toast-progress 3s linear forwards;
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.toast-enter-active {
  animation: toast-in 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.toast-leave-active {
  animation: toast-out 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
}
</style>
