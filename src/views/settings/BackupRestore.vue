<template>
  <div class="backup-restore-container">
    <!-- MongoDB Tools Status Alert -->
    <div class="tools-status-section" v-if="!mongoToolsAvailable">
      <el-alert
        title="ត្រូវការឧបករណ៍មូលដ្ឋានទិន្នន័យ MongoDB"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          <p>
            ប្រព័ន្ធបម្រុងទុកត្រូវការឧបករណ៍មូលដ្ឋានទិន្នន័យ MongoDB
            ដើម្បីដំឡើងនៅលើប្រព័ន្ធរបស់អ្នក។
          </p>
          <div class="install-instructions">
            <p><strong>ជម្រើសការដំឡើង៖</strong></p>
            <ul>
              <li>
                ទាញយកពី៖
                <a
                  href="https://www.mongodb.com/try/download/database-tools"
                  target="_blank"
                  >MongoDB Database Tools</a
                >
              </li>
              <li>
                ប្រើ Chocolatey៖
                <code>choco install mongodb-database-tools</code>
              </li>
              <li>
                ប្រើ Scoop៖ <code>scoop install mongodb-database-tools</code>
              </li>
            </ul>
            <p>
              <strong>បន្ទាប់ពីការដំឡើង៖</strong> ចាប់ផ្តើម terminal/IDE
              របស់អ្នកឡើងវិញ ហើយដំណើរការ
              <code>npm run check:mongodump</code> ដើម្បីផ្ទៀងផ្ទាត់។
            </p>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <h3 class="section-title">{{ t("backup.title") }}</h3>
        <p class="section-description">
          {{ t("backup.backupRestoreDescription") }}
        </p>
      </div>
      <div class="header-actions">
        <el-button
          v-if="canCreateBackups"
          type="primary"
          :loading="isCreatingBackup"
          @click="createBackup"
        >
          <Database :size="16" style="margin-right: 5px" />
          {{ t("backup.createBackup") }}
        </el-button>
        <el-button
          v-if="canRestoreBackups && backups.length > 0"
          type="warning"
          @click="showRestoreDialog()"
        >
          <RotateCcw :size="16" style="margin-right: 5px" />
          {{ t("backup.restoreDatabase") }}
        </el-button>
        <el-button @click="refreshBackups" :loading="isLoading">
          <RefreshCw :size="16" style="margin-right: 5px" />
          {{ t("backup.refresh") }}
        </el-button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-section" v-if="stats">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card" shadow="never">
            <div class="stat-container">
              <div class="stat-icon-box blue">
                <Archive :size="24" />
              </div>
              <div class="stat-details">
                <span class="stat-label">{{ t("backup.totalBackups") }}</span>
                <span class="stat-value">{{ stats.totalBackups }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card" shadow="never">
            <div class="stat-container">
              <div class="stat-icon-box green">
                <HardDrive :size="24" />
              </div>
              <div class="stat-details">
                <span class="stat-label">{{ t("backup.totalSize") }}</span>
                <span class="stat-value">{{ stats.totalSizeFormatted }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card" shadow="never">
            <div class="stat-container">
              <div class="stat-icon-box orange">
                <Clock :size="24" />
              </div>
              <div class="stat-details">
                <span class="stat-label">{{ t("backup.scheduled") }}</span>
                <span class="stat-value">{{ stats.scheduledBackups }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card" shadow="never">
            <div class="stat-container">
              <div class="stat-icon-box purple">
                <User :size="24" />
              </div>
              <div class="stat-details">
                <span class="stat-label">{{ t("backup.manual") }}</span>
                <span class="stat-value">{{ stats.manualBackups }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Backups List -->
    <div class="backups-section">
      <el-card class="backups-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">{{ t("backup.availableBackups") }}</span>
            <el-input
              v-model="searchQuery"
              :placeholder="t('backup.searchBackups')"
              style="width: 250px"
              clearable
            >
              <template #prefix>
                <Search :size="16" />
              </template>
            </el-input>
          </div>
        </template>

        <el-table
          :data="filteredBackups"
          v-loading="isLoading"
          :empty-text="t('backup.noBackupsFound')"
        >
          <el-table-column
            prop="name"
            :label="t('backup.backupName')"
            min-width="200"
          >
            <template #default="{ row }">
              <div class="backup-name">
                <span class="name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            prop="description"
            :label="t('backup.description')"
            min-width="150"
          >
            <template #default="{ row }">
              <span class="description-text">{{
                row.description || t("backup.noDescription")
              }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="size" :label="t('backup.size')" width="140">
            <template #default="{ row }">
              <div class="size-badge-standard">
                {{ backupService.formatBytes(row.size) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column
            prop="createdAt"
            :label="t('backup.created')"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column
            :label="t('backup.actions')"
            width="160"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button-group>
                <el-button size="small" @click="viewBackupDetails(row)">
                  <Eye :size="14" />
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  v-if="canRestoreBackups"
                  @click="showRestoreDialog(row)"
                >
                  <RotateCcw :size="14" />
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  v-if="canDeleteBackups"
                  @click="confirmDeleteBackup(row)"
                >
                  <Trash2 :size="14" />
                </el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- Create Backup Dialog (Premium Style) -->
    <el-dialog
      v-model="showCreateDialog"
      width="600px"
      class="premium-large-dialog"
      :show-close="false"
      append-to-body
    >
      <template #header>
        <div class="p-dialog-header">
          <div class="header-left">
            <div class="p-header-icon">
              <Database :size="18" />
            </div>
            <span class="p-header-title">{{ t("backup.createBackup") }}</span>
          </div>
          <el-button
            circle
            class="p-close-header-btn"
            @click="showCreateDialog = false"
          >
            <X :size="20" />
          </el-button>
        </div>
      </template>

      <div class="premium-details-container animate-fade-in">
        <!-- Quick Info Box -->
        <div class="premium-details-header">
          <div class="details-icon-outer manual">
            <div class="details-icon-inner">
              <Archive :size="32" />
            </div>
          </div>
          <div class="details-title-box">
            <h3 class="premium-backup-name" style="font-size: 18px; margin-bottom: 2px;">
              {{ t("backup.newBackupRequest") || 'New Backup Request' }}
            </h3>
            <p class="p-description">
              {{ t("backup.createBackupHint") || 'Capture a snapshot of the current database state.' }}
            </p>
          </div>
        </div>

        <el-form :model="createForm" label-position="top">
          <el-form-item :label="t('backup.description')">
            <el-input
              v-model="createForm.description"
              :placeholder="t('backup.messages.enterBackupDescription')"
              maxlength="255"
              show-word-limit
              type="textarea"
              :rows="4"
              class="premium-input-large"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="premium-dialog-footer">
          <el-button
            @click="showCreateDialog = false"
            class="p-action-btn primary"
          >
            {{ t("backup.cancel") }}
          </el-button>
          <el-button
            type="primary"
            :loading="isCreatingBackup"
            class="p-action-btn main"
            style="color: white;"
            @click="confirmCreateBackup"
          >
            <Database :size="16" />
            {{ t("backup.createBackup") }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Restore Dialog (Premium Style) -->
    <el-dialog
      v-model="showRestoreDialogVisible"
      width="800px"
      top="12vh"
      class="premium-large-dialog"
      :show-close="false"
      append-to-body
    >
      <template #header>
        <div class="p-dialog-header">
          <div class="header-left">
            <div class="p-header-icon warning">
              <RotateCcw :size="18" />
            </div>
            <span class="p-header-title">{{
              t("backup.restoreDatabase")
            }}</span>
          </div>
          <el-button
            circle
            class="p-close-header-btn"
            @click="showRestoreDialogVisible = false"
          >
            <X :size="20" />
          </el-button>
        </div>
      </template>

      <div class="premium-details-container animate-fade-in">
        <div class="restore-warning-premium">
          <div class="warning-icon-box">
            <AlertTriangle :size="32" />
          </div>
          <div class="warning-text-box">
            <h4>{{ t("backup.criticalAction") }}</h4>
            <p>{{ t("backup.messages.restoreWarningMessage") }}</p>
          </div>
        </div>

        <div class="premium-details-grid">
          <div class="premium-info-card full-width">
            <div class="p-card-icon"><Database :size="20" /></div>
            <div class="p-card-content">
              <span class="p-label">{{ t("backup.selectBackup") }}</span>
              <el-select
                v-model="restoreForm.selectedBackupName"
                class="premium-select"
                style="width: 100%"
                :placeholder="t('backup.messages.chooseBackupToRestore')"
                filterable
              >
                <el-option
                  v-for="backup in backups"
                  :key="backup.name"
                  :label="`${backup.name} (${formatDate(backup.createdAt)})`"
                  :value="backup.name"
                />
              </el-select>
            </div>
          </div>

          <div class="premium-info-card full-width">
            <div class="p-card-icon"><Trash2 :size="20" /></div>
            <div class="p-card-content">
              <div class="switch-row">
                <div class="switch-info">
                  <span class="p-label">{{ t("backup.dropDatabase") }}</span>
                  <p class="p-description">
                    {{ t("backup.messages.dropDatabaseHelp") }}
                  </p>
                </div>
                <el-switch
                  v-model="restoreForm.dropDatabase"
                  active-color="#ef4444"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="premium-dialog-footer">
          <el-button
            @click="showRestoreDialogVisible = false"
            class="p-action-btn primary"
          >
            {{ t("backup.cancel") }}
          </el-button>
          <el-button
            type="danger"
            class="p-action-btn danger"
            :loading="isRestoring"
            @click="confirmRestore"
          >
            <RotateCcw :size="16" style="margin-right: 5px" />
            {{ t("backup.restoreDatabase") }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Backup Details Dialog (THE FOCUS) -->
    <el-dialog
      v-model="showDetailsDialog"
      width="800px"
      top="12vh"
      class="premium-large-dialog"
      :show-close="false"
      append-to-body
    >
      <template #header>
        <div class="p-dialog-header">
          <div class="header-left">
            <div class="p-header-icon">
              <Database :size="24" />
            </div>
            <span class="p-header-title">{{ t("backup.backupDetails") }}</span>
          </div>
          <el-button
            circle
            class="p-close-header-btn"
            @click="showDetailsDialog = false"
          >
            <X :size="20" />
          </el-button>
        </div>
      </template>

      <div
        v-if="selectedBackup"
        class="premium-details-container animate-fade-in"
      >
        <div class="premium-details-header">
          <div class="details-icon-outer" :class="selectedBackup.type">
            <div class="details-icon-inner">
              <Archive v-if="selectedBackup.type === 'manual'" :size="40" />
              <Clock v-else :size="40" />
            </div>
          </div>
          <div class="details-title-box">
            <h2 class="premium-backup-name">{{ selectedBackup.name }}</h2>
            <div class="badge-row">
              <div :class="['premium-status-badge', selectedBackup.type]">
                <div class="status-dot"></div>
                {{ backupService.formatBackupType(selectedBackup.type) }}
              </div>
              <div class="premium-meta-badge">
                <HardDrive :size="14" />
                {{ backupService.formatBytes(selectedBackup.size) }}
              </div>
            </div>
          </div>
        </div>

        <div class="premium-details-grid">
          <div class="premium-info-card">
            <div class="p-card-icon"><AlignLeft :size="24" /></div>
            <div class="p-card-content">
              <span class="p-label">{{ t("backup.description") }}</span>
              <span class="p-value large">{{
                selectedBackup.description || t("backup.noDescription")
              }}</span>
            </div>
          </div>
          <div class="premium-info-card">
            <div class="p-card-icon"><Server :size="24" /></div>
            <div class="p-card-content">
              <span class="p-label">{{ t("backup.database") }}</span>
              <span class="p-value highlight-blue large">{{
                selectedBackup.database
              }}</span>
            </div>
          </div>
          <div class="premium-info-card">
            <div class="p-card-icon"><Calendar :size="24" /></div>
            <div class="p-card-content">
              <span class="p-label">{{ t("backup.created") }}</span>
              <span class="p-value large">{{
                formatDateTime(selectedBackup.createdAt)
              }}</span>
            </div>
          </div>
          <div class="premium-info-card">
            <div class="p-card-icon"><History :size="24" /></div>
            <div class="p-card-content">
              <span class="p-label">{{ t("backup.age") }}</span>
              <span class="p-value large">{{
                backupService.getBackupAge(selectedBackup.createdAt)
              }}</span>
            </div>
          </div>
          <div class="premium-info-card full-width">
            <div class="p-card-icon"><FileCode :size="24" /></div>
            <div class="p-card-content">
              <span class="p-label">{{ t("backup.path") }}</span>
              <div class="p-path-container">
                <code>{{ selectedBackup.path }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="premium-dialog-footer">
          <el-button
            @click="showDetailsDialog = false"
            class="p-action-btn primary"
          >
            {{ t("backup.close") }}
          </el-button>
          <el-button
            v-if="canRestoreBackups"
            type="warning"
            class="p-action-btn warning"
            @click="showRestoreDialog(selectedBackup)"
          >
            <RotateCcw :size="16" style="margin-right: 5px" />
            {{ t("backup.restore") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { usePermissions } from "@/composables/usePermissions";
import { backupService } from "@/services/backupService";
import {
  Database,
  RefreshCw,
  Archive,
  HardDrive,
  Clock,
  User,
  Search,
  Eye,
  RotateCcw,
  Trash2,
  AlertTriangle,
  X,
  AlignLeft,
  Server,
  Calendar,
  History,
  FileCode,
} from "lucide-vue-next";

const {
  canViewBackups,
  canCreateBackups,
  canRestoreBackups,
  canDeleteBackups,
} = usePermissions();
const { t } = useI18n();

const backups = ref([]);
const stats = ref(null);
const isLoading = ref(false);
const isCreatingBackup = ref(false);
const isRestoring = ref(false);
const searchQuery = ref("");
const mongoToolsAvailable = ref(true);

const showCreateDialog = ref(false);
const showRestoreDialogVisible = ref(false);
const showDetailsDialog = ref(false);
const selectedBackup = ref(null);

const createForm = ref({ description: "" });
const restoreForm = ref({ selectedBackupName: "", dropDatabase: false });

const filteredBackups = computed(() => {
  if (!searchQuery.value) return backups.value;
  const query = searchQuery.value.toLowerCase();
  return backups.value.filter(
    (backup) =>
      backup.name.toLowerCase().includes(query) ||
      (backup.description && backup.description.toLowerCase().includes(query)),
  );
});

const loadBackups = async () => {
  try {
    isLoading.value = true;
    const response = await backupService.getBackups();
    if (response.success) {
      backups.value = response.data;
      mongoToolsAvailable.value = true;
    } else {
      ElMessage.error(t("backup.messages.failedToLoadBackups"));
    }
  } catch (error) {
    console.error("Error loading backups:", error);
    ElMessage.error(t("backup.messages.errorLoadingBackups"));
  } finally {
    isLoading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = await backupService.getBackupStats();
    if (response.success) {
      stats.value = response.data;
    }
  } catch (error) {
    console.error("Error loading backup stats:", error);
  }
};

const refreshBackups = async () => {
  await Promise.all([loadBackups(), loadStats()]);
};

const createBackup = () => {
  createForm.value.description = "";
  showCreateDialog.value = true;
};

const confirmCreateBackup = async () => {
  try {
    isCreatingBackup.value = true;
    const response = await backupService.createBackup(
      createForm.value.description,
    );
    if (response.success) {
      ElMessage.success(t("backup.messages.backupCreatedSuccessfully"));
      showCreateDialog.value = false;
      await refreshBackups();
    } else {
      if (
        response.error &&
        response.error.includes("mongodump command not found")
      ) {
        ElMessageBox.alert(
          t("backup.messages.mongoToolsRequired"),
          t("backup.messages.mongoToolsTitle"),
          { confirmButtonText: t("backup.confirmTitle"), type: "warning" },
        );
      } else {
        ElMessage.error(response.message || t("backup.messages.failedToCreateBackup"));
      }
    }
  } catch (error) {
    console.error("Error creating backup:", error);
    ElMessage.error(t("backup.messages.errorCreatingBackup"));
  } finally {
    isCreatingBackup.value = false;
  }
};

const showRestoreDialog = (backup = null) => {
  if (backup) {
    selectedBackup.value = backup;
    restoreForm.value.selectedBackupName = backup.name;
  } else {
    selectedBackup.value = null;
    restoreForm.value.selectedBackupName = "";
  }
  restoreForm.value.dropDatabase = false;
  showRestoreDialogVisible.value = true;
};

const confirmRestore = async () => {
  if (!restoreForm.value.selectedBackupName) {
    ElMessage.error(t("backup.messages.pleaseSelectBackup"));
    return;
  }
  try {
    await ElMessageBox.confirm(
      t("backup.messages.confirmRestoreDatabase"),
      t("backup.messages.restoreTitle"),
      {
        confirmButtonText: t("backup.restore"),
        cancelButtonText: t("backup.cancel"),
        type: "warning",
        confirmButtonClass: "el-button--danger",
      },
    );
    isRestoring.value = true;
    const response = await backupService.restoreBackup(
      restoreForm.value.selectedBackupName,
      { dropDatabase: restoreForm.value.dropDatabase },
    );
    if (response.success) {
      ElMessage.success(t("backup.messages.databaseRestoredSuccessfully"));
      showRestoreDialogVisible.value = false;
    } else {
      ElMessage.error(response.message || t("backup.messages.failedToRestoreBackup"));
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("Error restoring backup:", error);
      ElMessage.error(t("backup.messages.errorRestoringBackup"));
    }
  } finally {
    isRestoring.value = false;
  }
};

const confirmDeleteBackup = async (backup) => {
  try {
    await ElMessageBox.confirm(
      t("backup.messages.confirmDeleteBackup", { name: backup.name }),
      t("backup.messages.deleteTitle"),
      {
        confirmButtonText: t("backup.delete"),
        cancelButtonText: t("backup.cancel"),
        type: "warning",
      },
    );
    const response = await backupService.deleteBackup(backup.name);
    if (response.success) {
      ElMessage.success(t("backup.messages.backupDeletedSuccessfully"));
      await refreshBackups();
    } else {
      ElMessage.error(response.message || t("backup.messages.failedToDeleteBackup"));
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("Error deleting backup:", error);
      ElMessage.error(t("backup.messages.errorDeletingBackup"));
    }
  }
};

const viewBackupDetails = (backup) => {
  selectedBackup.value = backup;
  showDetailsDialog.value = true;
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
const formatDateTime = (dateString) => new Date(dateString).toLocaleString();

onMounted(() => {
  refreshBackups();
});
</script>

<style scoped>
.backup-restore-container {
  padding: 0;
}
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.section-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.section-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.header-actions {
  display: flex;
}
.stats-section {
  margin-bottom: 24px;
}
.stat-card {
  border-radius: 12px;
  background: var(--el-bg-color-overlay);
  border: 1.5px solid var(--el-border-color-lighter);
  box-shadow: none;
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.backups-card {
  border-radius: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.name-text {
  font-family: monospace;
  font-size: 13px;
}
.description-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.restore-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(230, 162, 60, 0.1);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  color: #e6a23c;
}
.restore-warning p {
  margin: 0;
  font-size: 13px;
}
.switch-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 12px;
}
.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-container {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px;
}

.stat-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-box.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.stat-icon-box.green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}
.stat-icon-box.orange {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}
.stat-icon-box.purple {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.stat-details {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

/* PREMIUM VIEW DIALOG (THE FOCUS) */
/* PREMIUM LARGE DIALOG (Balanced for system content) */
.premium-large-dialog :deep(.el-dialog) {
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.25);
  background: var(--el-bg-color);
  max-height: 85vh;
  width: 800px;
  display: flex;
  flex-direction: column;
}

.premium-large-dialog :deep(.el-dialog__body) {
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.p-dialog-header {
  padding: 16px 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.p-header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.p-header-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.p-header-icon.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.p-header-icon.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.p-header-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.p-close-header-btn {
  border: none;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  width: 28px;
  height: 28px;
}

.premium-details-container {
  padding: 24px;
}

.premium-details-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--el-bg-color-overlay);
  border-radius: 16px;
  border: 1.5px solid var(--el-border-color-lighter);
}

.details-icon-outer {
  width: 70px;
  height: 70px;
  border-radius: 18px;
  padding: 5px;
}

.details-icon-outer.manual {
  background: rgba(99, 102, 241, 0.1);
}
.details-icon-outer.scheduled {
  background: rgba(16, 185, 129, 0.1);
}

.details-icon-inner {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.details-icon-inner :deep(svg) {
  width: 32px;
  height: 32px;
}

.manual .details-icon-inner {
  background: linear-gradient(135deg, #818cf8, #6366f1);
  color: white;
}
.scheduled .details-icon-inner {
  background: linear-gradient(135deg, #34d399, #10b981);
  color: white;
}

.premium-backup-name {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--el-text-color-primary);
  letter-spacing: -0.3px;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.premium-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 30px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.premium-status-badge.manual {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
}
.premium-status-badge.scheduled {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.premium-meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 30px;
  background: var(--el-bg-color-overlay);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--el-border-color-lighter);
}

.premium-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.premium-info-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--el-bg-color-overlay);
  border: 1.5px solid var(--el-border-color-lighter);
  display: flex;
  gap: 12px;
}

.premium-info-card:hover {
  border-color: #6366f1;
}

.premium-info-card.full-width {
  grid-column: span 2;
}

.p-card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.p-card-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.p-card-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}

.p-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.p-value.large {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.highlight-blue {
  color: #6366f1;
}

.p-path-container {
  margin-top: 5px;
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.p-path-container code {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.premium-dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.p-action-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.p-action-btn.primary {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  border: none;
}

.p-action-btn.warning {
  background: #f59e0b;
  border: none;
  color: white;
}

.restore-warning-premium {
  display: flex;
  gap: 20px;
  padding: 24px;
  background: rgba(239, 68, 68, 0.05);
  border-radius: 20px;
  border: 1.5px solid rgba(239, 68, 68, 0.15);
  margin-bottom: 24px;
}

.warning-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--el-bg-color-overlay);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);
}

.warning-text-box h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 800;
  color: #ef4444;
}

.warning-text-box p {
  margin: 0;
  font-size: 13px;
  color: var(--el-color-danger);
  line-height: 1.5;
}

.premium-select :deep(.el-input__wrapper) {
  background: var(--el-bg-color) !important;
  box-shadow: none !important;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 8px 12px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.switch-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.p-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.p-action-btn.danger {
  background: #ef4444;
  border: none;
  color: white;
  box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
}

/* .p-action-btn.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.4);
} */

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.premium-input-large :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px;
  border-color: var(--el-border-color-light);
  font-size: 14px;
}

.premium-input-large :deep(.el-textarea__inner:focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}
</style>
