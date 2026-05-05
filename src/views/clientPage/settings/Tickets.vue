<script setup>
import { ref, onMounted } from "vue";
import { useUiStore } from "@/stores/uiStore";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import api from "@/utils/api";
import {
  ArrowLeft,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Inbox,
  Armchair,
  DollarSign,
  CreditCard,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
} from "lucide-vue-next";

const router = useRouter();
const { t } = useI18n();

const activeTab = ref("upcoming");
const bookings = ref([]);
const isLoading = ref(true);
const uiStore = useUiStore();
const selectedBooking = ref(null);

const getStatusLabel = (status) => {
  if (!status) return t("n_a");
  const key = `bookings.${status.toLowerCase()}`;
  const translated = t(key);
  return translated === key ? status : translated;
};

const getMethodLabel = (method) => {
  if (!method) return t("n_a");
  const key = `bookings.${method.toLowerCase()}`;
  const translated = t(key);
  return translated === key ? method : translated;
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Expired":
    case "Failed":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
  }
};

const getStatusDot = (status) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-400";
    case "Pending":
      return "bg-amber-400";
    case "Expired":
    case "Failed":
      return "bg-red-400";
    default:
      return "bg-neutral-400";
  }
};

const fetchBookings = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/customer/bookings", {
      params: { type: activeTab.value },
    });
    if (res.data?.success) {
      bookings.value = res.data.data.bookings;
    }
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchBookings();
});

const handleTabChange = (tab) => {
  activeTab.value = tab;
  fetchBookings();
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getSeatTypes = (populatedSeats) => {
  if (!populatedSeats || !populatedSeats.length) return "";

  const types = [
    ...new Set(
      populatedSeats.map((s) => {
        const t = s.seat_type || "";
        return t.charAt(0).toUpperCase() + t.slice(1);
      }),
    ),
  ];
  return types.join(", ");
};

// No QR download needed

const handleDeleteHistory = async (bookingId, event) => {
  if (event) event.stopPropagation();

  const confirmed = await uiStore.confirm({
    title: t("booking_actions.delete_confirm_title"),
    message: t("booking_actions.delete_confirm_msg"),
    confirmText: t("actions.delete"),
    cancelText: t("actions.cancel"),
    type: "danger",
  });

  if (!confirmed) return;

  try {
    const res = await api.delete(`/customer/bookings/${bookingId}`);
    if (res.data?.success) {
      uiStore.showToast(t("booking_actions.delete_success"), "success");
      fetchBookings();
    }
  } catch (error) {
    console.error("Delete history error:", error);
    uiStore.showToast(t("booking_actions.delete_error"), "error");
  }
};

const handleClearAllHistory = async () => {
  const confirmed = await uiStore.confirm({
    title: t("booking_actions.delete_all_confirm_title"),
    message: t("booking_actions.delete_all_confirm_msg"),
    confirmText: t("actions.delete"),
    cancelText: t("actions.cancel"),
    type: "danger",
  });

  if (!confirmed) return;

  try {
    const res = await api.delete("/customer/bookings/history/all");
    if (res.data?.success) {
      uiStore.showToast(t("booking_actions.delete_all_success"), "success");
      fetchBookings();
    }
  } catch (error) {
    console.error("Clear history error:", error);
    uiStore.showToast(t("booking_actions.delete_all_error"), "error");
  }
};
</script>

<template>
  <div
    class="tickets-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300"
  >
    <!-- Background -->
    <div class="tickets-bg"></div>

    <!-- Header -->
    <header
      class="relative z-10 py-2.5 px-4 flex items-center gap-3 border-b border-slate-200 dark:border-white/[0.05] bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-md"
    >
      <button
        @click="router.back()"
        class="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.08]"
      >
        <ArrowLeft :size="16" class="text-slate-500 dark:text-neutral-400" />
      </button>
      <div class="flex-1">
        <h1 class="text-xs font-bold leading-none text-slate-900 dark:text-white">{{ t("my_tickets") }}</h1>
        <p class="text-[9px] text-slate-400 dark:text-neutral-500 mt-1">
          {{ t("tickets_subtitle") }}
        </p>
      </div>
    </header>

    <!-- Tabs -->
    <div class="relative z-10 px-4 py-3 bg-white/40 dark:bg-[#0a0a0c]/40 backdrop-blur-sm">
      <div
        class="flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] shadow-inner dark:shadow-none"
      >
        <button
          @click="handleTabChange('upcoming')"
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300',
            activeTab === 'upcoming'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300',
          ]"
        >
          {{ t("upcoming") }}
        </button>
        <button
          @click="handleTabChange('history')"
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300',
            activeTab === 'history'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300',
          ]"
        >
          {{ t("history") }}
        </button>
      </div>
    </div>

    <!-- Ticket List -->
    <div class="relative z-10 flex-1 overflow-y-auto px-4 py-3">
      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center py-20 opacity-50"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent mb-4"
        ></div>
      </div>

      <div
        v-else-if="bookings.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-white dark:bg-white/[0.03] flex items-center justify-center mb-4 border border-slate-200 dark:border-white/[0.06] shadow-sm dark:shadow-none"
        >
          <Inbox :size="24" class="text-slate-300 dark:text-neutral-600" />
        </div>
        <p class="text-slate-400 dark:text-neutral-500 text-sm font-medium">
          {{ activeTab === "upcoming" ? t("no_tickets") : t("no_history") }}
        </p>
      </div>

      <div v-else class="space-y-3">
        <!-- Clear All Button -->
        <div
          v-if="activeTab === 'history' && bookings.length > 0"
          class="flex justify-end mb-2"
        >
          <button
            @click="handleClearAllHistory"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all active:scale-95"
          >
            <Trash2 :size="12" />
            {{ t("booking_actions.delete_all") }}
          </button>
        </div>

        <div
          v-for="booking in bookings"
          :key="booking._id"
          @click="selectedBooking = booking"
          class="premium-ticket relative group cursor-pointer active:scale-[0.98] transition-all duration-300"
        >
          <!-- Shiny Effect -->
          <div
            class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          ></div>

          <div
            class="relative rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-sm dark:shadow-none"
          >
            <!-- Top section -->
            <div class="px-4 pt-4 pb-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <h3
                    class="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors"
                  >
                    {{ booking.movie.title }}
                  </h3>
                  <div class="flex items-center gap-3 mt-2 text-neutral-500">
                    <div class="flex items-center gap-1.5">
                      <Calendar :size="12" class="text-slate-400 dark:text-neutral-600" />
                      <span class="text-[10px] font-medium text-slate-400 dark:text-neutral-500">{{
                        formatDate(booking.showtime.show_date)
                      }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Clock :size="12" class="text-slate-400 dark:text-neutral-600" />
                      <span class="text-[10px] font-medium text-slate-400 dark:text-neutral-500">{{
                        booking.showtime.start_time
                      }}</span>
                    </div>
                  </div>
                </div>

                <span
                  :class="[
                    'flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border flex-shrink-0 backdrop-blur-xl',
                    getStatusStyle(booking.booking_status),
                  ]"
                >
                  <span
                    :class="[
                      'w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]',
                      getStatusDot(booking.booking_status),
                    ]"
                  ></span>
                  {{ getStatusLabel(booking.booking_status) }}
                </span>

                <!-- Delete Button (History Only) -->
                <button
                  v-if="activeTab === 'history'"
                  @click="handleDeleteHistory(booking._id, $event)"
                  class="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all active:scale-90"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <!-- Enhanced Divider with Physical Cutouts -->
            <div class="relative flex items-center px-1">
              <div
                class="absolute -left-2 w-4 h-4 rounded-full bg-slate-50 dark:bg-[#0a0a0c] border-r border-slate-200 dark:border-white/[0.08]"
              ></div>
              <div
                class="flex-1 border-t-2 border-dashed border-slate-200 dark:border-white/[0.06] mx-3"
              ></div>
              <div
                class="absolute -right-2 w-4 h-4 rounded-full bg-slate-50 dark:bg-[#0a0a0c] border-l border-slate-200 dark:border-white/[0.08]"
              ></div>
            </div>

            <!-- Bottom section -->
            <div class="px-4 pb-4 pt-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center"
                >
                  <Ticket :size="12" class="text-sky-400" />
                </div>
                <div>
                  <p
                    class="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest leading-none mb-1"
                  >
                    {{ t("reference") }}
                  </p>
                  <p
                    class="text-[11px] font-black text-sky-600 dark:text-sky-400 tracking-wider leading-none"
                  >
                    {{ booking.reference_code }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="text-right">
                  <p
                    class="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest leading-none mb-1"
                  >
                    {{ t("hall") }}
                  </p>
                  <p class="text-[11px] font-bold text-slate-800 dark:text-white leading-none">
                    {{ booking.hall.hall_name }}
                  </p>
                </div>
                <div class="w-px h-5 bg-white/[0.05]"></div>
                <div class="text-right">
                  <p
                    class="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest leading-none mb-1"
                  >
                    {{ t("seat_type") }}
                  </p>
                  <p class="text-[11px] font-bold text-sky-600 dark:text-sky-400 leading-none">
                    {{ getSeatTypes(booking.populatedSeats) }}
                  </p>
                </div>
                <div class="w-px h-5 bg-white/[0.05]"></div>
                <div class="text-right">
                  <p
                    class="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest leading-none mb-1"
                  >
                    {{ t("bookings.seats") }}
                  </p>
                  <p class="text-[11px] font-bold text-slate-800 dark:text-white leading-none">
                    {{ booking.seat_count }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Ticket Detail Modal -->
    <Transition name="modal">
      <div
        v-if="selectedBooking"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6"
      >
        <div
          class="absolute inset-0 bg-[#050505]/60 backdrop-blur-2xl"
          @click="selectedBooking = null"
        ></div>

        <div
          class="relative w-full max-w-sm bg-gradient-to-b from-white to-slate-50 dark:from-[#15151a] dark:to-[#0a0a0c] border border-slate-200 dark:border-white/[0.08] rounded-[2rem] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_128px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] ticket-modal"
        >
          <!-- Modal Header -->
          <div class="px-6 pt-6 pb-3 text-center">
            <h2
              class="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight"
            >
              {{ selectedBooking.movie.title }}
            </h2>
            <div class="flex items-center justify-center">
              <span
                :class="[
                  'flex items-center gap-2 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border backdrop-blur-md',
                  getStatusStyle(selectedBooking.booking_status),
                ]"
              >
                <span
                  :class="[
                    'w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]',
                    getStatusDot(selectedBooking.booking_status),
                  ]"
                ></span>
                {{ getStatusLabel(selectedBooking.booking_status) }}
              </span>
            </div>
          </div>

          <!-- Modal Scroll Content -->
          <div class="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
            <!-- Quick Detail Row -->
            <div class="grid grid-cols-3 gap-2 mb-6">
              <div
                class="flex flex-col items-center gap-1.5 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-2.5"
              >
                <Calendar :size="14" class="text-sky-500 dark:text-sky-400" />
                <span
                  class="text-[9px] font-bold text-slate-500 dark:text-neutral-400 text-center"
                  >{{ formatDate(selectedBooking.showtime.show_date) }}</span
                >
              </div>
              <div
                class="flex flex-col items-center gap-1.5 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-2.5"
              >
                <Clock :size="14" class="text-sky-500 dark:text-sky-400" />
                <span
                  class="text-[9px] font-bold text-slate-500 dark:text-neutral-400 text-center"
                  >{{ selectedBooking.showtime.start_time }}</span
                >
              </div>
              <div
                class="flex flex-col items-center gap-1.5 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-2.5"
              >
                <MapPin :size="14" class="text-sky-500 dark:text-sky-400" />
                <span
                  class="text-[9px] font-bold text-slate-500 dark:text-neutral-400 text-center truncate w-full"
                  >{{ selectedBooking.hall.hall_name }}</span
                >
              </div>
            </div>

            <!-- Reference Code Card -->
            <div class="relative group mt-2 mb-6">
              <div
                class="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between shadow-lg backdrop-blur-md"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center"
                  >
                    <Ticket :size="14" class="text-sky-500 dark:text-sky-400" />
                  </div>
                  <span
                    class="text-xs font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider"
                  >
                    REFERENCE CODE
                  </span>
                </div>

                <p class="text-sm font-black text-sky-600 dark:text-sky-400 tracking-wider">
                  {{ selectedBooking.reference_code }}
                </p>
              </div>
            </div>

            <!-- Detailed Info List -->
            <div class="space-y-1">
              <div
                class="flex items-center justify-between py-3 border-b border-white/[0.04]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center"
                  >
                    <Armchair :size="14" class="text-neutral-500" />
                  </div>
                  <span
                    class="text-xs font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider"
                    >{{ $t("bookings.seats") }}</span
                  >
                </div>
                <span class="text-sm font-bold text-slate-800 dark:text-white">
                  {{
                    selectedBooking.populatedSeats
                      ?.map((s) => `${s.row}-${s.seat_number}`)
                      .join(", ") || t("n_a")
                  }}
                </span>
              </div>

              <div
                class="flex items-center justify-between py-3 border-b border-white/[0.04]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center"
                  >
                    <Armchair :size="14" class="text-sky-400" />
                  </div>
                  <span
                    class="text-xs font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider"
                    >{{ $t("seat_type") }}</span
                  >
                </div>
                <span class="text-sm font-bold text-sky-600 dark:text-sky-400">
                  {{ getSeatTypes(selectedBooking.populatedSeats) }}
                </span>
              </div>

              <div
                class="flex items-center justify-between py-3 border-b border-white/[0.04]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center"
                  >
                    <CreditCard :size="14" class="text-neutral-500" />
                  </div>
                  <span
                    class="text-xs font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider"
                    >{{ $t("payment_method") }}</span
                  >
                </div>
                <span class="text-sm font-bold text-slate-800 dark:text-white">{{
                  getMethodLabel(selectedBooking.payment_method)
                }}</span>
              </div>

              <div class="flex items-center justify-between py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-xl bg-sky-500/5 flex items-center justify-center"
                  >
                    <DollarSign :size="14" class="text-sky-400" />
                  </div>
                  <span
                    class="text-xs font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider"
                    >{{ $t("total_price") }}</span
                  >
                </div>
                <div class="text-right">
                  <span class="text-lg font-black text-sky-600 dark:text-sky-400"
                    >${{ selectedBooking.total_price }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div
            class="p-6 pt-3 bg-[#0a0a0c]/90 backdrop-blur-xl border-t border-white/[0.05]"
          >
            <button
              @click="selectedBooking = null"
              class="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-white/[0.05] text-white text-[13px] font-black hover:bg-slate-800 dark:hover:bg-white/[0.08] transition-all border border-slate-800 dark:border-white/[0.1] active:scale-[0.98] shadow-lg uppercase tracking-widest"
            >
              {{ t("actions.close") || "Close" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tickets-page {
  /* background: #0a0a0c; */
}

.tickets-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(14, 165, 233, 0.08) 0%,
      transparent 40%
    ),
    radial-gradient(
      circle at 100% 100%,
      rgba(139, 92, 246, 0.05) 0%,
      transparent 40%
    );
  pointer-events: none;
}

.premium-ticket {
  perspective: 1000px;
}

.premium-ticket:hover {
  transform: translateY(-4px);
  filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.4));
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
/* Modal Animations */
.modal-enter-active {
  animation: modal-in 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.modal-leave-active {
  animation: modal-in 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19) reverse;
}

@keyframes modal-in {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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

.qr-glow-effect {
  display: none;
}
</style>
