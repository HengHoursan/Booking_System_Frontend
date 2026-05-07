<template>
  <el-card class="chart-card" shadow="never">
    <template #header>
      <div class="card-header">
        <div class="header-title">
          <el-icon class="header-icon"><Tickets /></el-icon>
          <span>{{ $t("dashboard.bookingStatus") }}</span>
        </div>
        <el-button
          type="primary"
          link
          @click="$router.push('/reports/bookings')"
        >
          {{ $t("reports.viewDetails") }}
        </el-button>
      </div>
    </template>
    <div class="chart-container">
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { Tickets } from "@element-plus/icons-vue";
import { useAppStore } from "@/stores/app";
import reportService from "@/services/reportService";

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
]);

const appStore = useAppStore();
const { t } = useI18n();
const chartData = ref([]);
const isDark = computed(() => appStore.theme === "dark");

const fetchData = async () => {
  try {
    const response = await reportService.getBookingStatusReport();
    if (response.success) {
      chartData.value = response.data.map((item) => ({
        name:
          item._id.charAt(0).toUpperCase() + item._id.slice(1).toLowerCase(),
        value: item.count,
        itemStyle: {
          color: getStatusColor(item._id),
        },
      }));
    }
  } catch (error) {
    console.error("Failed to fetch booking status report:", error);
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "#10b981"; // Green
    case "Pending":
      return "#f59e0b"; // Orange/Amber
    case "Failed":
      return "#ef4444"; // Red
    default:
      return "#6b7280"; // Gray
  }
};

onMounted(fetchData);

const chartOption = computed(() => ({
  backgroundColor: "transparent",
  tooltip: {
    trigger: "item",
    backgroundColor: isDark.value ? "#1a1a1a" : "#ffffff",
    borderColor: isDark.value ? "#333333" : "#eeeeee",
    textStyle: {
      color: isDark.value ? "#ffffff" : "#333333",
    },
  },
  legend: {
    bottom: "0%",
    left: "center",
    textStyle: {
      color: isDark.value ? "#999" : "#666",
    },
  },
  series: [
    {
      name: t("dashboard.bookingStatus"),
      type: "pie",
      radius: ["40%", "70%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: isDark.value ? "#141414" : "#fff",
        borderWidth: 2,
      },
      label: {
        show: false,
        position: "center",
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      labelLine: {
        show: false,
      },
      data: chartData.value,
    },
  ],
}));
</script>

<style scoped>
.chart-card {
  height: 450px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.header-icon {
  color: var(--el-color-primary);
  font-size: 18px;
}

.chart-container {
  height: 350px;
  width: 100%;
}

.chart {
  height: 100%;
  width: 100%;
}

:deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-card__body) {
  padding: 20px;
}
</style>
