<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Calendar,
  Save,
  Loader2,
  Edit2,
  X,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import api from "@/utils/api";
import { toLocalPhone, toInternationalPhone, formatDate } from "@/utils/formatters";

import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/uiStore";

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();

const isLoading = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);
const uiStore = useUiStore();

const userProfile = computed(() => {
  const customerData = authStore.user || {};
  return {
    id: customerData.id,
    name: customerData.name || t("settings.noneProvided"),
    phone: customerData.phone || "",
    username: customerData.username || "",
    createdAt: customerData.createdAt
      ? formatDate(customerData.createdAt)
      : t("settings.noneProvided"),
  };
});

// For local editing
const editForm = ref({
  phone: "",
});

const initEditForm = () => {
  editForm.value = {
    phone: toLocalPhone(userProfile.value.phone),
  };
};

watch(() => userProfile.value, initEditForm, { immediate: true });

const toggleEdit = () => {
  if (isEditing.value) {
    // Cancel editing
    editForm.value = {
      phone: toLocalPhone(userProfile.value.phone),
    };
  }
  isEditing.value = !isEditing.value;
};

const handleSave = async () => {
  try {
    isSaving.value = true;
    // Client-side phone validation
    const phoneVal = editForm.value.phone.replace(/\D/g, ""); // Remove non-digits
    if (!/^0\d{8,9}$/.test(phoneVal)) {
      uiStore.showToast(t("validation.phoneInvalid"), "warning");
      isSaving.value = false;
      return;
    }

    // Convert to international format for server
    const internationalPhone = toInternationalPhone(editForm.value.phone);

    await authStore.updateProfile({
      phone: internationalPhone,
    });

    isEditing.value = false;
    uiStore.showToast(t("settings.updateSuccess"), "success");
  } catch (error) {
    console.error("Failed to update profile:", error);
    uiStore.showToast(
      error.response?.data?.message || t("settings.updateError"),
      "error",
    );
  } finally {
    isSaving.value = false;
  }
};

const handlePhoneInput = (e) => {
  const value = e.target.value.replace(/\D/g, "").substring(0, 10);
  editForm.value.phone = value;
};
</script>

<template>
  <div
    class="personal-info-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300"
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
            <ArrowLeft :size="18" class="text-slate-500 dark:text-neutral-400" />
          </button>
          <h1 class="text-sm font-bold">{{ t("settings.personalInfo") }}</h1>
        </div>

        <button
          v-if="!isLoading"
          @click="toggleEdit"
          class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          :class="
            isEditing
              ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20'
              : 'bg-white dark:bg-white/[0.05] text-slate-500 dark:text-neutral-300 border border-slate-200 dark:border-white/[0.08]'
          "
        >
          <template v-if="isEditing">
            <X :size="12" />
            {{ t("settings.cancel") }}
          </template>
          <template v-else>
            <Edit2 :size="12" />
            {{ t("actions.edit") }}
          </template>
        </button>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-5 py-6">
        <div v-if="isLoading" class="flex justify-center py-10">
          <div
            class="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <div v-else class="space-y-4">
          <!-- Name Section (Read Only) -->
          <div
            class="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4 flex items-center gap-4 backdrop-blur-sm shadow-sm dark:shadow-none transition-all"
          >
            <div
              class="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 flex-shrink-0"
            >
              <UserIcon :size="20" />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mb-0.5"
              >
                {{ t("users.name") }}
              </p>
              <p class="text-sm font-medium text-slate-900 dark:text-white truncate">
                {{ userProfile.name }}
              </p>
            </div>
          </div>

          <div
            v-if="userProfile.username"
            class="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4 flex items-center gap-4 shadow-sm dark:shadow-none transition-all"
          >
            <div
              class="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 flex-shrink-0"
            >
              <UserIcon :size="20" />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mb-0.5"
              >
                {{ t("users.username") }}
              </p>
              <p class="text-sm font-medium text-slate-900 dark:text-white truncate">
                @{{ userProfile.username }}
              </p>
            </div>
          </div>


          <div
            class="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4 flex items-center gap-4 group transition-colors shadow-sm dark:shadow-none"
            :class="{
              'border-sky-500/30 bg-sky-500/[0.05] dark:bg-sky-500/[0.08]':
                isEditing,
            }"
          >
            <div
              class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0"
            >
              <Phone :size="20" />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mb-0.5"
              >
                {{ t("users.phone") }}
              </p>
              <input
                v-if="isEditing"
                v-model="editForm.phone"
                type="tel"
                maxlength="10"
                @input="handlePhoneInput"
                :placeholder="t('settings.phonePlaceholder')"
                class="w-full bg-transparent border-none text-sm font-medium text-slate-900 dark:text-white p-0 focus:ring-0 placeholder-slate-400 dark:placeholder-neutral-600 outline-none"
              />
              <p
                v-else
                class="text-sm font-medium text-slate-900 dark:text-white truncate"
              >
                {{
                  toLocalPhone(userProfile.phone) || t("settings.noneProvided")
                }}
              </p>
            </div>
          </div>


          <div
            class="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4 flex items-center gap-4 shadow-sm dark:shadow-none transition-all"
          >
            <div
              class="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 flex-shrink-0"
            >
              <Calendar :size="20" />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mb-0.5"
              >
                {{ t("settings.memberSince") }}
              </p>
              <p class="text-sm font-medium text-slate-900 dark:text-white truncate">
                {{ userProfile.createdAt }}
              </p>
            </div>
          </div>

          <!-- Save Button -->
          <div v-if="isEditing" class="pt-6">
            <button
              @click="handleSave"
              :disabled="isSaving"
              class="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 font-bold"
            >
              <Loader2 v-if="isSaving" :size="18" class="animate-spin" />
              <Save v-else :size="18" />
              <span>{{
                isSaving ? t("settings.saving") : t("settings.save")
              }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.personal-info-page {
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
