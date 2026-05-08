<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useBookingStore } from "@/stores/booking";
import { isDark, toggleDark } from "@/composables/useTheme";
import {
  ArrowLeft,
  QrCode,
  Store,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sun,
  Moon,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/uiStore";
import { bookingService } from "@/services/bookingService";
import { paymentService } from "@/services/paymentService";
import ClientBakongQR from "@/components/payments/ClientBakongQR.vue";
import PhoneNumberDialog from "@/components/common/PhoneNumberDialog.vue";

const router = useRouter();
const { t, te } = useI18n();
const bookingStore = useBookingStore();

const paymentMethods = computed(() => [
  {
    id: "bakong",
    name: t("client.checkout.bakongName"),
    icon: QrCode,
    description: t("client.checkout.bakongDesc"),
    tag: t("client.checkout.instant"),
  },
  // {
  //   id: "cash",
  //   name: t("client.checkout.cashName"),
  //   icon: Store,
  //   description: t("client.checkout.cashDesc"),
  //   tag: t("client.checkout.flexible"),
  // },
]);

const selectedMethod = ref("bakong");
const isProcessing = ref(false);
const isHandlingQRClose = ref(false);
// Handle QR visibility and persistence
const showBakongQR = ref(false);
const paymentData = computed({
  get: () => bookingStore.paymentData,
  set: (val) => (bookingStore.paymentData = val),
});

const totalPrice = computed(() => bookingStore.totalPrice);

const authStore = useAuthStore();
const uiStore = useUiStore();

const showPhoneDialog = ref(false);
const isUpdatingPhone = ref(false);
const phoneError = ref("");

const savePhoneNumber = async (phone) => {
  isUpdatingPhone.value = true;
  try {
    phoneError.value = "";
    await authStore.updateProfile({ phone });
    showPhoneDialog.value = false;
    // After saving, continue with booking
    handleCompleteBooking();
  } catch (error) {
    console.error("Failed to update phone number:", error);
    const msg = error.response?.data?.message;
    phoneError.value = msg && te(msg) ? t(msg) : (msg || t("profile.updateFailed"));
  } finally {
    isUpdatingPhone.value = false;
  }
};

const handleCompleteBooking = async () => {
  if (isProcessing.value) return;
  if (
    !bookingStore.selectedShowtime ||
    bookingStore.selectedSeats.length === 0
  ) {
    uiStore.showToast(t("messages.error"), "error");
    return;
  }

  // Check if user has phone number
  if (!authStore.user?.phone) {
    showPhoneDialog.value = true;
    return;
  }

  isProcessing.value = true;
  try {
    const bookingData = {
      customerId: authStore.user?.id || authStore.user?._id,
      showtimeId: bookingStore.selectedShowtime.id,
      seats: bookingStore.selectedSeats.map((s) => s.id),
      seat_count: bookingStore.selectedSeats.length,
      total_price: bookingStore.totalPrice,
      payment_method:
        selectedMethod.value === "bakong" ? "Bakong" : "PayAtCinema",
    };

    const response = await bookingService.createBooking(bookingData, {
      skipGlobalError: true,
    });
    console.log("Booking response:", response);

    if (response?.success && response?.data?.booking) {
      const bookingId = response.data.booking._id || response.data.booking.id;

      // If Bakong, we might need to create a payment record or handle QR
      if (selectedMethod.value === "bakong") {
        try {
          const paymentRes = await paymentService.createPayment(
            {
              bookingId: bookingId,
              amount: bookingStore.totalPrice,
              payment_method: "Bakong",
              currency: "USD",
              status: "Pending",
              description: `Booking for ${bookingStore.selectedShowtime.movie_title}`,
            },
            { skipGlobalError: true },
          );
          console.log("Payment creation response:", paymentRes);
          if (paymentRes?.success && paymentRes?.data?.payment) {
            paymentData.value = paymentRes.data.payment;
            showBakongQR.value = true;
            return; // Don't redirect yet
          } else {
            // Payment creation failed but response was returned (e.g. business logic error)
            await bookingService.cancelBooking(bookingId);
            uiStore.showToast(
              paymentRes?.message || t("payments.initiateFailed"),
              "error",
            );
          }
        } catch (paymentErr) {
          console.error("Payment initiation failed:", paymentErr);
          // Gateway error or network issue - cancel the booking to avoid stale pending
          await bookingService.cancelBooking(bookingId);

          const backendMsg = paymentErr.response?.data?.message || "";
          let errorMsg = t("messages.paymentInitiateFailed");

          if (backendMsg.includes("Too many pending")) {
            errorMsg = t("messages.pendingLimitReached");
          }

          uiStore.showToast(errorMsg, "error");
        }
      }

      // If Cash, redirect immediately
      if (selectedMethod.value === "cash") {
        router.push({
          path: "/layout/confirmation",
          query: { bookingId: bookingId },
        });
      }
    } else {
      console.warn("Booking creation unsuccessful:", response);
      uiStore.showToast(response?.message || t("messages.error"), "error");
    }
  } catch (error) {
    console.error("Booking failed with exception:", error);
    const backendMsg = error.response?.data?.message || "";
    let errorMsg = t("messages.createFailed");

    if (backendMsg.includes("already have an active booking")) {
      errorMsg = t("messages.bookingExists");
    } else if (backendMsg.includes("Too many pending")) {
      errorMsg = t("messages.pendingLimitReached");
    } else if (backendMsg) {
      errorMsg = backendMsg;
    }

    uiStore.showToast(errorMsg, "error");
  } finally {
    isProcessing.value = false;
  }
};

const handlePaymentSuccess = () => {
  const bId =
    paymentData.value.bookingId?._id ||
    paymentData.value.bookingId?.id ||
    paymentData.value.bookingId;

  // Clear payment data from store upon success
  bookingStore.paymentData = null;
  showBakongQR.value = false;

  uiStore.showToast(t("payments.paymentSuccess"), "success");

  router.push({
    path: "/layout/confirmation",
    query: { bookingId: bId },
  });
};

const handleQRClose = async (isPaid) => {
  if (isHandlingQRClose.value) return;
  isHandlingQRClose.value = true;

  if (isPaid) {
    handlePaymentSuccess();
    isHandlingQRClose.value = false;
    return;
  }

  // Close the QR modal immediately so the user sees feedback fast
  showBakongQR.value = false;

  // Grab and clear payment data before async work to prevent re-entry
  const currentPayment = bookingStore.paymentData;
  bookingStore.paymentData = null;

  if (!currentPayment) {
    isHandlingQRClose.value = false;
    return;
  }

  const bId =
    currentPayment.bookingId?._id ||
    currentPayment.bookingId?.id ||
    currentPayment.bookingId;

  isProcessing.value = true;
  try {
    if (bId) {
      try {
        await bookingService.cancelBooking(bId, { skipGlobalError: true });
      } catch (e) {
        console.error("Manual cancel failed:", e);
      }
    }
    uiStore.showToast(t("payments.paymentFailed"), "warning");
  } finally {
    isProcessing.value = false;
    isHandlingQRClose.value = false;
  }
};

const handleQRExpired = async () => {
  // If we're already handling a close, don't trigger again
  if (isHandlingQRClose.value) return;

  const currentPayment = bookingStore.paymentData;
  if (!currentPayment) return;

  const bId =
    currentPayment.bookingId?._id ||
    currentPayment.bookingId?.id ||
    currentPayment.bookingId;

  isProcessing.value = true;
  try {
    if (bId) {
      await bookingService.cancelBooking(bId, { skipGlobalError: true });
    }
    // Clear local state
    bookingStore.paymentData = null;
    showBakongQR.value = false;
    uiStore.showToast(t("payments.paymentExpired"), "warning");
  } catch (error) {
    console.error("Failed to handle payment expiration:", error);
  } finally {
    isProcessing.value = false;
  }
};

onMounted(() => {
  // Check if we have an existing pending payment on mount (e.g. after reload)
  if (
    bookingStore.paymentData &&
    bookingStore.paymentData.status === "Pending"
  ) {
    const expiration = bookingStore.paymentData.expiration;
    const expTime = expiration ? new Date(expiration).getTime() : 0;

    // Only show if it hasn't expired yet
    if (expTime > Date.now()) {
      showBakongQR.value = true;
    } else {
      // If it already expired while page was closed, clear it
      handleQRExpired();
    }
  }
});
</script>

<template>
  <div
    class="checkout-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden pb-32 transition-colors duration-300"
  >
    <div class="checkout-bg"></div>

    <div class="relative z-10 max-w-2xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button
            @click="router.back()"
            class="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-600 dark:text-white cursor-pointer transition-colors"
          >
            <ArrowLeft :size="20" />
          </button>
          <h1 class="text-xl font-bold">{{ t("client.checkout.title") }}</h1>
        </div>

        <div class="flex items-center gap-3"></div>
      </header>

      <div class="space-y-4">
        <div
          v-for="method in paymentMethods"
          :key="method.id"
          @click="selectedMethod = method.id"
          class="group relative overflow-hidden rounded-3xl border transition-all cursor-pointer p-5"
          :class="
            selectedMethod === method.id
              ? 'bg-sky-50 dark:bg-sky-500/[0.08] border-sky-500/50'
              : 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1]'
          "
        >
          <div class="flex items-start justify-between">
            <div class="flex gap-4">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
                :class="
                  selectedMethod === method.id
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-neutral-400'
                "
              >
                <component :is="method.icon" :size="24" />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-bold">{{ method.name }}</h3>
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-neutral-500 font-bold uppercase tracking-wider"
                  >
                    {{ method.tag }}
                  </span>
                </div>
                <p
                  class="text-sm text-slate-500 dark:text-neutral-400 max-w-[200px] leading-relaxed"
                >
                  {{ method.description }}
                </p>
              </div>
            </div>

            <div
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
              :class="
                selectedMethod === method.id
                  ? 'border-sky-500 bg-sky-500'
                  : 'border-slate-200 dark:border-white/[0.1]'
              "
            >
              <CheckCircle2
                v-if="selectedMethod === method.id"
                :size="14"
                class="text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Summary -->
      <div
        class="mt-12 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-sm dark:shadow-none"
      >
        <div class="flex justify-between items-center mb-4">
          <span
            class="text-slate-500 dark:text-neutral-400 text-sm font-medium"
            >{{ t("client.checkout.toPayToday") }}</span
          >
          <span class="text-2xl font-bold text-slate-900 dark:text-white"
            >${{ totalPrice.toFixed(2) }}</span
          >
        </div>
        <div
          class="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]"
        >
          <span
            class="text-xs text-slate-500 dark:text-neutral-500 leading-relaxed"
          >
            {{ t("client.checkout.termsInfo") }}
          </span>
        </div>
      </div>
    </div>

    <!-- Bottom Action -->
    <div
      class="fixed bottom-0 left-0 right-0 z-40 p-4 checkout-footer-blur transition-colors duration-300"
    >
      <div class="max-w-2xl mx-auto">
        <button
          @click="handleCompleteBooking"
          :disabled="isProcessing"
          class="w-full h-[60px] flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-sm cursor-pointer shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="isProcessing" class="animate-spin" :size="20" />
          <span v-else>{{ t("client.checkout.completeBooking") }}</span>
        </button>
      </div>
    </div>

    <!-- Bakong QR Modal -->
    <div
      v-if="showBakongQR"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <ClientBakongQR
        :payment="paymentData"
        @close="handleQRClose"
        @paid="handlePaymentSuccess"
        @expired="handleQRExpired"
      />
    </div>

    <!-- Phone Number Dialog -->
    <PhoneNumberDialog
      v-model:show="showPhoneDialog"
      :is-updating="isUpdatingPhone"
      :server-error="phoneError"
      @save="savePhoneNumber"
      @clear-error="phoneError = ''"
    />
  </div>
</template>

<style scoped>
.checkout-footer-blur {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.dark .checkout-footer-blur {
  background: rgba(10, 10, 12, 0.95);
}

.checkout-bg {
  position: fixed;
  inset: 0;
  background: radial-gradient(
    circle at 80% 0%,
    rgba(14, 165, 233, 0.05) 0%,
    transparent 40%
  );
  pointer-events: none;
}
</style>
