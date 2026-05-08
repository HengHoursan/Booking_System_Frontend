<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Phone, X, Loader2 } from "lucide-vue-next";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  isUpdating: {
    type: Boolean,
    default: false,
  },
  serverError: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:show", "save", "cancel"]);

const { t } = useI18n();
const phoneNumber = ref("");
const error = ref("");

const validatePhone = (phone) => {
  if (!phone) return false;
  // Validation: 9 or 10 digits (Cambodian standard)
  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone.length >= 9 && cleanPhone.length <= 10;
};

const handlePhoneInput = (e) => {
  const value = e.target.value.replace(/\D/g, "").substring(0, 10);
  phoneNumber.value = value;
  error.value = "";
  emit("clear-error");
};

const handleSave = () => {
  error.value = "";
  if (!validatePhone(phoneNumber.value)) {
    error.value = t("client.phoneNumberDialog.invalidPhone");
    return;
  }
  emit("save", phoneNumber.value);
};

const handleCancel = () => {
  if (props.isUpdating) return;
  emit("update:show", false);
  emit("cancel");
};

// Reset state when shown
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      phoneNumber.value = "";
      error.value = "";
    }
  }
);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/80 backdrop-blur-sm"
        @click="handleCancel"
      ></div>

      <!-- Dialog Card -->
      <Transition name="scale">
        <div
          v-if="show"
          class="relative w-full max-w-sm bg-white dark:bg-[#0a0a0c] border border-slate-200 dark:border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.1)] dark:shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
        >
          <div class="p-8">
            <!-- Header -->
            <div class="flex justify-between items-start mb-6">
              <div
                class="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center"
              >
                <Phone :size="28" />
              </div>
              <button
                @click="handleCancel"
                :disabled="isUpdating"
                class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 dark:text-neutral-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- Content -->
            <div class="space-y-2 mb-8">
              <h3 class="text-2xl font-bold text-slate-900 dark:text-white">
                {{ t("client.phoneNumberDialog.title") }}
              </h3>
              <p
                class="text-slate-500 dark:text-neutral-400 text-sm leading-relaxed"
              >
                {{ t("client.phoneNumberDialog.message") }}
              </p>
            </div>

            <!-- Input -->
            <div class="space-y-4 mb-8">
              <div class="relative">
                <input
                  v-model="phoneNumber"
                  type="tel"
                  :placeholder="t('client.phoneNumberDialog.placeholder')"
                  :disabled="isUpdating"
                  maxlength="10"
                  @input="handlePhoneInput"
                  class="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all disabled:opacity-50"
                  @keyup.enter="handleSave"
                />
                <Phone
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  :size="20"
                />
              </div>
              <p v-if="error || serverError" class="text-xs text-red-500 font-medium ml-1">
                {{ error || serverError }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-3">
              <button
                @click="handleSave"
                :disabled="isUpdating"
                class="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <Loader2 v-if="isUpdating" class="animate-spin" :size="20" />
                <span>{{ t("client.phoneNumberDialog.save") }}</span>
              </button>
              <button
                @click="handleCancel"
                :disabled="isUpdating"
                class="w-full h-14 rounded-2xl font-bold text-sm text-slate-500 dark:text-neutral-300 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all active:scale-[0.98] disabled:opacity-30 disabled:scale-100"
              >
                {{ t("client.phoneNumberDialog.cancel") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-leave-active {
  animation: scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) reverse;
}

@keyframes scale-in {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
