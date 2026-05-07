<template>
  <div class="backup-schedule-container">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <h3 class="section-title">{{ t('backup.scheduleConfiguration') }}</h3>
        <p class="section-description">
          {{ t('backup.backupScheduleDescription') }}
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="loadSchedule" :loading="isLoading">
          <RefreshCw :size="16" />
          {{ t('backup.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- Current Schedule Status -->
    <div class="status-section">
      <el-card class="status-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">{{ t('backup.currentScheduleStatus') }}</span>
            <el-tag :type="currentSchedule?.enabled ? 'success' : 'info'" size="large">
              {{ currentSchedule?.enabled ? t('backup.enabled') : t('backup.disabled') }}
            </el-tag>
          </div>
        </template>
        <div v-if="currentSchedule" class="schedule-info">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <span class="info-label">{{ t('backup.schedule') }}</span>
                <span class="info-value">{{ getCronDescription(currentSchedule.cronExpression) }}</span>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <span class="info-label">{{ t('backup.retention') }}</span>
                <span class="info-value">{{ currentSchedule.retentionDays }} {{ t('backup.days') }}</span>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <span class="info-label">{{ t('backup.lastUpdated') }}</span>
                <span class="info-value">{{ formatDateTime(currentSchedule.updatedAt) }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </div>

    <!-- Config Form -->
    <div class="config-section">
      <el-card class="config-card">
        <template #header>
          <span class="card-title">{{ t('backup.scheduleConfiguration') }}</span>
        </template>
        <el-form :model="scheduleForm" :rules="scheduleRules" ref="scheduleFormRef" label-width="140px">
          <el-form-item :label="t('backup.enableSchedule')" prop="enabled">
            <el-switch v-model="scheduleForm.enabled" />
          </el-form-item>
          <el-form-item :label="t('backup.cronExpression')" prop="cronExpression">
            <el-select v-model="scheduleForm.cronExpression" placeholder="Select schedule" style="width: 100%">
              <el-option
                v-for="item in cronOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <div class="cron-help">{{ getCronDescription(scheduleForm.cronExpression) }}</div>
          </el-form-item>
          <el-form-item :label="t('backup.description')" prop="description">
            <el-input v-model="scheduleForm.description" />
          </el-form-item>
          <el-form-item :label="t('backup.retentionDays')" prop="retentionDays">
            <el-input-number v-model="scheduleForm.retentionDays" :min="1" :max="365" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="isSaving" @click="saveSchedule">
              {{ t('backup.saveConfiguration') }}
            </el-button>
            <el-button @click="resetForm">{{ t('backup.reset') }}</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { backupService } from '@/services/backupService';
import { RefreshCw } from 'lucide-vue-next';

const { t } = useI18n();

const currentSchedule = ref(null);
const isLoading = ref(false);
const isSaving = ref(false);
const scheduleFormRef = ref();

const cronOptions = [
  { label: t('backup.dailyAtMidnight'), value: '0 0 * * *' },
  { label: t('backup.dailyAt6AM'), value: '0 6 * * *' },
  { label: t('backup.dailyAt12PM'), value: '0 12 * * *' },
  { label: t('backup.dailyAt6PM'), value: '0 18 * * *' },
];

const scheduleForm = reactive({
  enabled: false,
  cronExpression: '0 0 * * *',
  description: t('backup.scheduledBackup'),
  retentionDays: 7
});

const scheduleRules = {
  cronExpression: [{ required: true, message: t('backup.cronExpressionRequired'), trigger: 'blur' }],
  description: [{ required: true, message: t('backup.descriptionRequired'), trigger: 'blur' }],
  retentionDays: [{ required: true, message: t('backup.retentionDaysRequired'), trigger: 'blur' }]
};

const loadSchedule = async () => {
  try {
    isLoading.value = true;
    const response = await backupService.getSchedule();
    if (response.success) {
      currentSchedule.value = response.data;
      Object.assign(scheduleForm, response.data);
    }
  } finally { isLoading.value = false; }
};

const saveSchedule = async () => {
  try {
    const valid = await scheduleFormRef.value.validate();
    if (!valid) return;
    isSaving.value = true;
    const response = await backupService.configureSchedule(scheduleForm);
    if (response.success) {
      ElMessage.success(t('backup.messages.scheduleConfigurationSaved'));
      await loadSchedule();
    }
  } finally { isSaving.value = false; }
};

const resetForm = () => {
  if (currentSchedule.value) { Object.assign(scheduleForm, currentSchedule.value); }
  else { Object.assign(scheduleForm, { enabled: false, cronExpression: '0 0 * * *', description: t('backup.scheduledBackup'), retentionDays: 7 }); }
};

const getCronDescription = (expression) => {
  const option = cronOptions.find(opt => opt.value === expression);
  if (option) return option.label;

  // Fallback for known values if they are not in the select yet (e.g. initial load)
  if (expression === '0 0 * * *') return t('backup.dailyAtMidnight');
  if (expression === '0 6 * * *') return t('backup.dailyAt6AM');
  if (expression === '0 12 * * *') return t('backup.dailyAt12PM');
  if (expression === '0 18 * * *') return t('backup.dailyAt6PM');

  return t('backup.customSchedule');
};

const formatDateTime = (dateString) => dateString ? new Date(dateString).toLocaleString() : t('backup.never');

onMounted(() => loadSchedule());
</script>

<style scoped>
.backup-schedule-container { padding: 0; background: var(--el-bg-color); min-height: 100%; }
.header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.section-title { margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: var(--el-text-color-primary); }
.section-description { margin: 0; color: var(--el-text-color-secondary); font-size: 14px; }
.header-actions { display: flex; gap: 12px; }
.status-section, .config-section { margin-bottom: 24px; }
.status-card, .config-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 600; color: var(--el-text-color-primary); }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 12px; color: var(--el-text-color-secondary); }
.info-value { font-size: 14px; font-weight: 600; color: var(--el-text-color-primary); }
.cron-help { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
</style>