<template>
  <div class="edit-movie">
    <div class="page-header">
      <h2>{{ $t("movies.editMovie") }}</h2>
      <el-button @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        {{ $t("actions.back") }}
      </el-button>
    </div>

    <el-card v-loading="pageLoading">
      <div v-if="loadError" class="error-state">
        <el-result
          icon="error"
          :title="$t('messages.error')"
          :sub-title="loadError"
        >
          <template #extra>
            <el-button type="primary" @click="load">{{
              $t("actions.refresh")
            }}</el-button>
            <el-button @click="$router.back()">{{
              $t("actions.back")
            }}</el-button>
          </template>
        </el-result>
      </div>

      <el-form
        v-else
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="160px"
      >
        <!-- Title -->
        <el-form-item :label="$t('movies.movieTitle')" prop="title">
          <el-input v-model="form.title" maxlength="200" show-word-limit />
        </el-form-item>

        <!-- Description -->
        <el-form-item :label="$t('movies.description')" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <!-- Director -->
        <el-form-item :label="$t('movies.director')" prop="director">
          <el-input v-model="form.director" maxlength="100" />
        </el-form-item>

        <!-- Genres -->
        <el-form-item :label="$t('movies.genres')" prop="genres">
          <el-select
            v-model="form.genres"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="opt in movieService.MOVIE_GENRES"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <!-- Languages -->
        <el-form-item :label="$t('movies.languages')" prop="languages">
          <el-select
            v-model="form.languages"
            multiple
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option label="English" value="English" />
            <el-option label="Khmer" value="Khmer" />
            <el-option label="Thai" value="Thai" />
            <el-option label="Chinese" value="Chinese" />
            <el-option label="Korean" value="Korean" />
            <el-option label="Japanese" value="Japanese" />
          </el-select>
        </el-form-item>

        <!-- Duration -->
        <el-form-item
          :label="$t('movies.durationMinutes')"
          prop="duration_minutes"
        >
          <el-input-number
            v-model="form.duration_minutes"
            :min="1"
            :max="600"
          />
          <span style="margin-left: 12px; color: #909399">
            {{ formatDuration(form.duration_minutes) }}
          </span>
        </el-form-item>

        <!-- Release Date -->
        <el-form-item :label="$t('movies.releaseDate')" prop="release_date">
          <el-date-picker
            v-model="form.release_date"
            type="date"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <!-- End Date -->
        <el-form-item :label="$t('movies.endDate')" prop="end_date">
          <el-date-picker
            v-model="form.end_date"
            type="date"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <!-- Rating -->
        <el-form-item :label="$t('movies.rating')" prop="rating">
          <el-rate v-model="form.rating" :max="10" show-score />
        </el-form-item>

        <!-- Status -->
        <el-form-item :label="$t('movies.status')" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option
              v-for="opt in movieService.MOVIE_STATUSES"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <!-- Poster Upload/URL -->
        <el-form-item :label="$t('movies.poster')">
          <ImageUpload v-model="form.poster_url" />
        </el-form-item>

        <!-- Trailer URL -->
        <el-form-item :label="$t('movies.trailerUrl')">
          <el-input v-model="form.trailer_url" maxlength="500" />
        </el-form-item>

        <!-- Producers -->
        <el-form-item :label="$t('movies.producers')">
          <el-select
            v-model="form.producers"
            multiple
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            :placeholder="$t('movies.producers')"
          >
          </el-select>
          <div style="margin-top: 4px; color: #909399; font-size: 12px">
            Type producer name and press Enter to add
          </div>
        </el-form-item>

        <!-- Notes -->
        <el-form-item :label="$t('movies.notes')">
          <el-input
            v-model="form.notes"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <!-- Actions -->
        <el-form-item>
          <el-button
            v-permission="'movies.edit'"
            type="primary"
            :loading="loading"
            @click="handleSubmit"
          >
            {{ $t("actions.update") }}
          </el-button>
          <el-button @click="resetForm">
            {{ $t("actions.reset") }}
          </el-button>
          <el-button @click="$router.back()">
            {{ $t("actions.cancel") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";
import { movieService } from "@/services/movieService";
import { ElMessage } from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import ImageUpload from "@/components/common/ImageUpload.vue";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { t } = useI18n();

const formRef = ref();
const loading = ref(false);
const pageLoading = ref(false);
const loadError = ref("");
const original = ref(null);

const form = reactive({
  title: "",
  description: "",
  director: "",
  genres: [],
  languages: [],
  duration_minutes: 120,
  release_date: "",
  end_date: "",
  rating: 0,
  status: "coming_soon",
  poster_url: "",
  trailer_url: "",
  cast: [],
  producers: [],
  notes: "",
});

const rules = {
  title: [
    { required: true, message: t("validation.required"), trigger: "blur" },
  ],
  director: [
    { required: true, message: t("validation.required"), trigger: "blur" },
  ],
  genres: [
    { required: true, message: t("validation.required"), trigger: "change" },
  ],
  languages: [
    { required: true, message: t("validation.required"), trigger: "change" },
  ],
  duration_minutes: [
    { required: true, message: t("validation.required"), trigger: "blur" },
  ],
  release_date: [
    { required: true, message: t("validation.required"), trigger: "change" },
  ],
  status: [
    { required: true, message: t("validation.required"), trigger: "change" },
  ],
};

const formatDuration = (minutes) => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const load = async () => {
  pageLoading.value = true;
  loadError.value = "";
  try {
    const data = await movieService.getMovie(route.params.id);
    original.value = data;
    Object.assign(form, {
      title: data.title,
      description: data.description,
      director: data.director,
      genres: data.genres || [],
      languages: data.languages || [],
      duration_minutes: data.duration_minutes,
      release_date: data.release_date,
      end_date: data.end_date || "",
      rating: data.rating || 0,
      status: data.status,
      poster_url: data.poster_url || "",
      trailer_url: data.trailer_url || "",
      cast: data.cast || [],
      producers: data.producers || [],
      notes: data.notes || "",
    });
  } catch (e) {
    console.error(e);
    loadError.value = e?.response?.data?.message || "Failed to load movie";
  } finally {
    pageLoading.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    loading.value = true;
    await movieService.updateMovie(route.params.id, form);
    ElMessage.success(t("movies.updateSuccess"));
    router.push("/admin/movies");
  } catch (e) {
    console.error(e);
    if (e?.response?.data?.message) {
      ElMessage.error(e.response.data.message);
    } else {
      ElMessage.error("Failed to update movie");
    }
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  if (!original.value) return;
  Object.assign(form, {
    title: original.value.title,
    description: original.value.description,
    director: original.value.director,
    genres: original.value.genres || [],
    languages: original.value.languages || [],
    duration_minutes: original.value.duration_minutes,
    release_date: original.value.release_date,
    end_date: original.value.end_date || "",
    rating: original.value.rating || 0,
    status: original.value.status,
    poster_url: original.value.poster_url || "",
    trailer_url: original.value.trailer_url || "",
    cast: original.value.cast || [],
    producers: original.value.producers || [],
    notes: original.value.notes || "",
  });
  if (formRef.value) formRef.value.clearValidate();
};

onMounted(async () => {
  await load();
  appStore.setBreadcrumbs([
    { title: t("nav.dashboard"), path: "/admin/dashboard" },
    { title: t("movies.title"), path: "/admin/movies" },
    { title: t("movies.editMovie"), path: "#" },
  ]);
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.el-form {
  max-width: 800px;
}

.error-state {
  padding: 40px 0;
}
</style>
