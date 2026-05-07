<template>
  <div class="client-qr-container">
    <div class="glass-morph-overlay bg-white/95 dark:bg-[#0f0f14]/85 border border-slate-200 dark:border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]"></div>

    <div class="qr-card-wrapper">
      <!-- Decorative Ticket Notches -->
      <div class="ticket-notch notch-left bg-slate-50 dark:bg-[#0a0a0c]"></div>
      <div class="ticket-notch notch-right bg-slate-50 dark:bg-[#0a0a0c]"></div>

      <div class="card-header-premium">
        <div class="header-content">
          <span class="premium-label">{{ $t("payments.paymentDetails") }}</span>
          <div class="header-line"></div>
        </div>
        <button class="close-action-btn bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white" @click="onClose" aria-label="Close">
          <X :size="18" />
        </button>
      </div>

      <div class="card-main-body">
        <div class="amount-section bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]">
          <p class="label-muted text-slate-400 dark:text-neutral-500">{{ $t("payments.amount") }}</p>
          <div class="price-display">
            <span class="currency-symbol">$</span>
            <span class="value-large text-slate-900 dark:text-white">{{
              payment?.amount?.toLocaleString()
            }}</span>
            <span class="currency-code text-slate-400 dark:text-neutral-500">{{ payment?.currency }}</span>
          </div>
        </div>

        <div v-if="showQR" class="qr-interaction-zone">
          <div class="qr-canvas-frame">
            <div class="qr-frame-border"></div>
            <div class="corner t-l"></div>
            <div class="corner t-r"></div>
            <div class="corner b-l"></div>
            <div class="corner b-r"></div>
            <div class="qr-inner-shadow border border-slate-100 dark:border-transparent" ref="qrRef">
              <qrcode-vue
                :value="payment.qr"
                :size="200"
                level="H"
                render-as="canvas"
              />
            </div>
          </div>

          <div class="timer-badge-unique bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
            <div class="timer-icon text-amber-500 dark:text-amber-400">
              <Clock :size="14" />
            </div>
            <div class="timer-text-group">
              <span class="timer-label text-slate-400 dark:text-neutral-500">{{ $t("payments.expiresIn") }}</span>
              <span
                class="timer-countdown text-slate-900 dark:text-white"
                :class="{ 'text-red-500 dark:text-red-400': remainingTime < 60000 }"
              >
                {{ formatTime(remainingTime) }}
              </span>
            </div>
          </div>

          <div class="screenshot-info-premium bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
            <div class="info-icon">
              <Camera :size="18" />
            </div>
            <p class="info-message">
              {{ $t("payments.screenshotInstruction") }}
            </p>
          </div>

          <p class="hint-text-premium text-slate-400 dark:text-neutral-500">{{ $t("payments.scanToPay") }}</p>
        </div>

        <div v-if="expired" class="status-view-unique">
          <div class="status-icon-box error">
            <AlertCircle :size="40" />
          </div>
          <h3 class="status-title-large error">
            {{ $t("payments.paymentExpired") }}
          </h3>
          <p class="status-subtitle-premium">
            {{ $t("payments.expiredTryAgain") || "Please close and try booking again." }}
          </p>
        </div>

        <div v-if="isPaid" class="status-view-unique">
          <div class="status-icon-box success">
            <CheckCircle :size="40" />
          </div>
          <h3 class="status-title-large success text-slate-900 dark:text-white">
            {{ $t("payments.paymentSuccess") }}
          </h3>
          <p class="status-subtitle-premium text-slate-500 dark:text-neutral-500">
            {{ $t("payments.paymentCompleted") }}
          </p>
        </div>
      </div>

      <div class="card-footer-action">
        <button @click="onClose" class="btn-client-dismiss border border-slate-200 dark:border-white/[0.08] text-slate-400 dark:text-neutral-500 hover:text-slate-900 dark:hover:text-white">
          {{ $t("actions.close") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed, watch } from "vue";
import QrcodeVue from "qrcode.vue";
import {
  X,
  Camera,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-vue-next";
import { useSocket } from "@/services/socketService";
import { paymentService } from "@/services/paymentService";
import { useUiStore } from "@/stores/uiStore";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const uiStore = useUiStore();

const props = defineProps({
  payment: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["close", "paid", "expired"]);

const qrRef = ref(null);
const remainingTime = ref(0);
const isPaid = ref(false);
const hasExpiredToast = ref(false);

let countdownInterval = null;
let successTimeout = null;
let isCancelled = false;

const formatTime = (ms) => {
  if (ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const expired = computed(() => !isPaid.value && remainingTime.value <= 0);
const showQR = computed(
  () => !isPaid.value && !expired.value && props?.payment?.qr,
);

const onClose = () => emit("close", isPaid.value);

// Add polling for robustness (fallback for WebSocket)
let pollingInterval = null;

const startPolling = () => {
  if (!props.payment?.md5 || isCancelled) return;
  
  // Clear any existing polling
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(async () => {
    if (isPaid.value || isCancelled) {
      clearInterval(pollingInterval);
      return;
    }
    
    try {
      // We only poll if the QR is still visible and not expired
      if (showQR.value) {
        console.log("[BakongQR] Polling status for md5:", props.payment.md5);
        const response = await paymentService.checkPaymentStatus(props.payment.md5);
        console.log("[BakongQR] Polling response:", response);

        const status = (response?.status || "").toUpperCase();
        const isCompleted = status === "COMPLETED" || 
                            status === "SUCCESS" || 
                            response?.data?.paid === true ||
                            response?.data?.status === "Completed";

        if (response?.success && isCompleted) {
          console.log("[BakongQR] Payment confirmed via Polling fallback!");
          isPaid.value = true;
          stopActivities();
          successTimeout = setTimeout(() => {
            console.log("[BakongQR] Emitting 'paid' event to parent");
            emit("paid");
            successTimeout = null;
          }, 1500);
        }
      }
    } catch (err) {
      // Silent fail for polling errors
      console.debug("Polling failed:", err);
    }
  }, 5000); // Check every 5 seconds
};

const stopActivities = () => {
  isCancelled = true;
  clearInterval(countdownInterval);
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (successTimeout) {
    clearTimeout(successTimeout);
    successTimeout = null;
  }
};

// Socket listener for real-time payment status
const { onEvent } = useSocket();

onEvent("payment:status", (data) => {
  if (isPaid.value || isCancelled) return;
  
  // Helper to extract ID string from object or string
  const getID = (obj) => {
    if (!obj) return null;
    return (obj._id || obj.id || obj).toString();
  };

  const currentBookingId = getID(props.payment?.bookingId);
  const eventBookingId = getID(data?.bookingId);
  
  // Verify this payment update is for our current payment
  // Checking both md5 and bookingId for maximum reliability
  const isMatch = (data?.md5 && data.md5 === props.payment?.md5) || 
                  (eventBookingId && eventBookingId === currentBookingId);

    if (isMatch) {
      console.log("[BakongQR] Match found in socket event:", data);
      const status = (data.status || "").toUpperCase();
      const isCompleted = status === "COMPLETED" || 
                          status === "SUCCESS" || 
                          data.paid;
                          
      if (isCompleted) {
        console.log("[BakongQR] Payment confirmed via Socket.io!");
        isPaid.value = true;
        stopActivities();
        successTimeout = setTimeout(() => {
          console.log("[BakongQR] Emitting 'paid' event to parent");
          emit("paid");
          successTimeout = null;
        }, 1500);
      }
    }
});

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    let expirationTime = 0;
    if (typeof props.payment?.expiration === "string") {
      expirationTime = new Date(props.payment.expiration).getTime();
    } else if (props.payment?.expiration) {
      expirationTime = props.payment.expiration;
    } else {
      expirationTime = Date.now() + 5 * 60 * 1000;
    }
    const time = expirationTime - Date.now();
    remainingTime.value = time;

    if (time <= 0 && !hasExpiredToast.value && !isPaid.value) {
      hasExpiredToast.value = true;
      stopActivities();
      // Notify parent that payment has expired
      emit("expired");
    }
  }, 1000);
};

watch(
  () => props.payment,
  (newPayment) => {
    stopActivities();
    isCancelled = false;
    hasExpiredToast.value = false;

    if (newPayment) {
      isPaid.value = newPayment.paid || newPayment.status === "Completed";
      let expTime = newPayment.expiration
        ? new Date(newPayment.expiration).getTime()
        : Date.now() + 5 * 60 * 1000;
      remainingTime.value = expTime - Date.now();

      if (isPaid.value) {
        emit("paid");
        return;
      }

      if (remainingTime.value > 0) {
        startCountdown();
        startPolling(); // Start fallback polling alongside socket
      }
    }
  },
  { immediate: true, deep: true },
);

onUnmounted(() => stopActivities());
</script>

<style scoped>
.client-qr-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.glass-morph-overlay {
  position: absolute;
  inset: 0;
  /* background: rgba(15, 15, 20, 0.85); */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 32px;
  /* border: 1px solid rgba(255, 255, 255, 0.08); */
  /* box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.6); */
  z-index: -1;
}

.qr-card-wrapper {
  width: 100%;
  padding: 32px;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Ticket Notches */
.ticket-notch {
  position: absolute;
  top: 50%;
  width: 24px;
  height: 24px;
  /* background: #0a0a0c; /* Matches site background */
  border-radius: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.notch-left {
  left: -12px;
}

.notch-right {
  right: -12px;
}

.card-header-premium {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.premium-label {
  font-size: 11px;
  font-weight: 800;
  color: #0ea5e9;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.header-line {
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #0ea5e9, transparent);
}

.close-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.dark .close-action-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #a8abb2;
}

.close-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.amount-section {
  text-align: center;
  padding: 24px;
  /* background: rgba(255, 255, 255, 0.03); */
  border-radius: 20px;
  /* border: 1px solid rgba(255, 255, 255, 0.05); */
  margin-bottom: 32px;
}

.label-muted {
  font-size: 10px;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 8px;
}

.dark .label-muted {
  color: rgba(255, 255, 255, 0.4);
}

.price-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.currency-symbol {
  font-size: 20px;
  font-weight: 800;
  color: #8b5cf6;
}

.value-large {
  font-size: 42px;
  font-weight: 900;
  /* color: #fff; */
  letter-spacing: -0.01em;
}

.currency-code {
  font-size: 14px;
  font-weight: 700;
  color: #4b5563;
}

.dark .currency-code {
  color: rgba(255, 255, 255, 0.5);
}

.qr-interaction-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.qr-canvas-frame {
  position: relative;
  background: #fff;
  padding: 12px;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.qr-frame-border {
  position: absolute;
  inset: -1px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 3px solid #0ea5e9;
  z-index: 5;
}

.t-l {
  top: -8px;
  left: -8px;
  border-right: none;
  border-bottom: none;
  border-radius: 12px 0 0 0;
}
.t-r {
  top: -8px;
  right: -8px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 12px 0 0;
}
.b-l {
  bottom: -8px;
  left: -8px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 12px;
}
.b-r {
  bottom: -8px;
  right: -8px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 12px 0;
}

.timer-badge-unique {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  /* background: rgba(255, 255, 255, 0.03); */
  /* border: 1px solid rgba(255, 255, 255, 0.08); */
  border-radius: 100px;
}

.timer-icon {
  color: #eab308;
}

.timer-countdown {
  font-size: 18px;
  font-weight: 800;
  /* color: #fff; */
  font-variant-numeric: tabular-nums;
}

.text-critical {
  color: #ef4444;
}

.timer-label {
  display: block;
  font-size: 9px;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  margin-bottom: -2px;
}

.dark .timer-label {
  color: rgba(255, 255, 255, 0.4);
}

.btn-client-primary {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: none;
  border-radius: 16px;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 24px -6px rgba(14, 165, 233, 0.4);
}

.btn-client-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px rgba(14, 165, 233, 0.5);
}

.btn-client-secondary {
  width: 100%;
  height: 52px;
  /* background: rgba(255, 255, 255, 0.05); */
  /* border: 1px solid rgba(255, 255, 255, 0.1); */
  border-radius: 16px;
  /* color: #fff; */
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-client-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.screenshot-info-premium {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  width: 100%;
  text-align: left;
}

.info-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.info-message {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

.hint-text-premium {
  font-size: 11px;
  color: #4b5563;
  text-align: center;
  line-height: 1.6;
}

.dark .hint-text-premium {
  color: rgba(255, 255, 255, 0.4);
}

.status-view-unique {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  text-align: center;
}

.status-icon-box {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.status-icon-box.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-icon-box.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status-title-large {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 8px;
}

.status-title-large.success {
  /* color: #fff; */
}
.status-title-large.error {
  color: #ef4444;
}

.status-subtitle-premium {
  font-size: 14px;
  color: #4b5563;
  font-weight: 500;
}

.dark .status-subtitle-premium {
  color: rgba(255, 255, 255, 0.5);
}

.btn-client-dismiss {
  width: 100%;
  padding: 16px;
  background: transparent;
  /* border: 1px solid rgba(255, 255, 255, 0.08); */
  border-radius: 16px;
  color: #1f2937;
  border-color: #d1d5db;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 16px;
}

.dark .btn-client-dismiss {
  color: rgba(255, 255, 255, 0.5);
}

.btn-client-dismiss:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

@media (max-width: 440px) {
  .client-qr-container {
    padding: 16px;
  }
  .ticket-notch {
    display: none;
  }
}
</style>
