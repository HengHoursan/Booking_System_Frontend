<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { debounce } from "lodash-es";
import { isDark, toggleDark } from "@/composables/useTheme";
import {
  Sun,
  Moon,
  MapPin,
  Clock,
  Armchair,
  TicketX,
  Ticket,
  ChevronRight,
  Search,
  X,
} from "lucide-vue-next";
import { useNotificationStore } from "@/stores/notification";

import { useBookingStore } from "@/stores/booking";
import { showtimeService } from "@/services/showtimeService";
import { movieService } from "@/services/movieService";
import { seatBookingService } from "@/services/seatBookingService";
import { format, addDays, startOfDay } from "date-fns";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const bookingStore = useBookingStore();
const notificationStore = useNotificationStore();

const userProfile = computed(() => authStore.user);
const unreadCount = computed(() => notificationStore.unreadCount);
const hasShowtimes = computed(() => movies.value.length > 0 && !loading.value);
const noShowtimes = computed(() => !loading.value && movies.value.length === 0);

const searchActive = ref(false);
const searchQuery = ref("");
const loading = ref(false);

// Generate next 7 days
const dates = ref([]);
const generateDates = () => {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    dates.value.push({
      dayName: format(d, "EEE"),
      dayNum: format(d, "dd"),
      day: format(d, "dd"),
      month: format(d, "MMM"),
      fullDate: format(d, "yyyy-MM-dd"),
      active: i === 0,
    });
  }
};

const selectedDate = computed(() => dates.value.find((d) => d.active));
const movies = ref([]);

const loadShowtimes = async () => {
  // Wait for auth initialization if needed (though RouterView should handle it)
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (!selectedDate.value) return;

  loading.value = true;
  try {
    const params = {
      show_date: selectedDate.value.fullDate,
      search: searchQuery.value || undefined,
      status: "scheduled",
      forBooking: true,
    };
    // Fetch showtimes
    const response = await showtimeService.getShowtimes(params);
    if (!response?.data) return;

    // Fetch unique movie details for genres
    const movieIds = [...new Set(response?.data?.map((s) => s.movie_id))];
    const moviesData = await Promise.all(
      movieIds.map((id) => movieService.getMovie(id)),
    );
    const movieMap = Object.fromEntries(moviesData.map((m) => [m.id, m]));

    // Map showtimes with seat status and genre
    movies.value = await Promise.all(
      response.data.map(async (s) => {
        try {
          const seats = await seatBookingService.getShowtimeSeatStatus(s.id);
          const available = seats.filter(
            (seat) => seat.status === "available",
          ).length;

          const movie = movieMap[s.movie_id];
          const genreText =
            movie?.genres
              ?.map((g) => movieService.getGenreLabel(g))
              .join(" / ") || "Action";

          return {
            ...s,
            title: s.movie_title,
            poster: s.movie_poster,
            hall: s.hall_name,
            theater_name: s.theater_name,
            duration: movieService.formatDuration(s.duration_minutes),
            genre: genreText,
            availableSeats: available,
            totalSeats: seats.length,
            time: s.start_time,
            selected: bookingStore.selectedShowtime?.id === s.id,
            disabled: available === 0,
          };
        } catch (err) {
          console.error(`Error loading showtime ${s.id}:`, err);
          return { ...s, disabled: true };
        }
      }),
    );
  } catch (error) {
    console.error("Failed to load showtimes:", error);
  } finally {
    loading.value = false;
  }
};

// Auto-refresh showtimes when date or search changes, or when the tab is focused
useAutoRefresh(() => loadShowtimes(), {
  deps: [selectedDate, searchQuery],
});

onMounted(async () => {
  generateDates();
});

const selectDate = (date) => {
  dates.value.forEach((d) => (d.active = d.fullDate === date.fullDate));
  // No need to manually call loadShowtimes(), useAutoRefresh watch will handle it
};

const selectMovie = (movie) => {
  if (movie.disabled) return;
  movies.value.forEach((m) => {
    m.selected = m.id === movie.id;
  });
  bookingStore.selectShowtime(movie);
};

// Debounced search
const debouncedSearch = debounce(() => {
  // loadShowtimes() will be triggered by the watch in useAutoRefresh
  // assuming searchQuery is updated by v-model
}, 500);

const selectedMovie = computed(() => movies.value.find((m) => m.selected));

const currentMovieCount = computed(
  () => movies.value.filter((m) => !m.disabled).length,
);

const getSeatPercentage = (movie) => {
  return Math.round((movie.availableSeats / movie.totalSeats) * 100);
};

const getSeatColor = (movie) => {
  const pct = getSeatPercentage(movie);
  if (pct > 50) return "#22c55e";
  if (pct > 20) return "#eab308";
  return "#ef4444";
};

const toggleSettings = () => {
  router.push("/layout/settings");
};

const handleReserveSeats = () => {
  if (selectedMovie.value) {
    router.push("/layout/seats");
  }
};
</script>

<template>
  <div class="showtime-page min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
    <!-- Background -->
    <div class="showtime-bg"></div>

    <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <!-- Header -->
      <header
        class="showtime-header sticky top-0 z-30 py-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <img
            src="@/assets/rsb-cinema.png"
            alt="RSB Cinema Logo"
            class="w-14 h-16 object-contain"
          />
          <div>
            <h1 class="text-[12px] font-bold leading-snug">
              {{ t("client.nav.cinemaNameKH") }}
            </h1>
            <p
              class="text-[10px] font-semibold text-slate-500 dark:text-neutral-500 mt-0.5 tracking-wide uppercase"
            >
              {{ t("client.nav.cinemaNameEN") }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div
            class="flex items-center gap-3 cursor-pointer group"
            @click="toggleSettings"
          >
            <!-- User Name -->
            <div class="hidden sm:block text-right cursor-pointer">
              <p class="text-[12px] font-bold text-slate-900 dark:text-white transition-colors">
                {{ userProfile?.name?.split(" ")[0] || "Customer" }}
              </p>
              <p class="text-[10px] text-slate-500 dark:text-neutral-400">
                {{ t("client.showtime.myAccount") }}
              </p>
            </div>

            <!-- Avatar with Badge -->
            <div class="relative">
              <button
                class="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden transition-colors flex items-center justify-center p-0 cursor-pointer"
                :class="
                  userProfile?.photoUrl
                    ? 'bg-transparent'
                    : 'bg-gradient-to-tr from-sky-500 to-indigo-500'
                "
              >
                <img
                  v-if="userProfile?.photoUrl"
                  :src="userProfile.photoUrl"
                  alt="Profile"
                  class="w-full h-full object-cover"
                />
                <span
                  v-else-if="userProfile?.name"
                  class="text-sm font-bold text-white uppercase"
                >
                  {{ userProfile.name.charAt(0) }}
                </span>
                <img
                  v-else
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="Profile"
                  class="w-full h-full object-cover"
                />
              </button>
              <!-- Badge -->
              <span
                v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0a0a0c] z-10"
              >
                {{ unreadCount > 9 ? "9+" : unreadCount }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- Welcome Section -->
      <div class="mt-6 mb-8">
        <p
          class="text-[11px] text-sky-400 font-semibold uppercase tracking-[0.2em] mb-2"
        >
          {{
            t("client.showtime.welcomeBack", {
              name: userProfile?.name?.split(" ")[0] || "Customer",
            })
          }}
        </p>
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {{ t("client.showtime.todaysShowtime1") }}
          <span class="showtime-gradient-text">{{
            t("client.showtime.todaysShowtime2")
          }}</span>
        </h2>
        <p class="text-sm text-slate-600 dark:text-neutral-400 mt-1">
          {{
            t("client.showtime.sessionsAvailable", { count: currentMovieCount })
          }}
        </p>
      </div>

      <!-- Date Picker -->
      <div class="mb-8">
        <div
          class="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:items-center sm:justify-center"
        >
          <button
            v-for="date in dates"
            :key="date.day"
            @click="selectDate(date)"
            class="flex flex-col items-center min-w-[60px] py-3 px-2 rounded-2xl border cursor-pointer transition-colors"
            :class="
              date.active
                ? 'showtime-date-active'
                : 'border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-500 dark:text-neutral-400'
            "
          >
            <span
              class="text-[10px] uppercase font-semibold tracking-wider opacity-70"
              >{{ date.dayName }}</span
            >
            <span class="text-xl font-bold mt-1">{{ date.day }}</span>
            <span class="text-[9px] uppercase mt-0.5 opacity-50">{{
              date.month
            }}</span>
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <div class="showtime-search-bar !bg-white dark:!bg-white/[0.04] !border-slate-200 dark:!border-white/[0.06]" :class="{ 'active !bg-slate-50 dark:!bg-white/[0.07] !border-sky-500 dark:!border-sky-500/25': searchActive }">
          <Search :size="16" class="text-slate-400 dark:text-neutral-500 flex-shrink-0" />
          <input
            v-model="searchQuery"
            @focus="searchActive = true"
            @blur="!searchQuery ? (searchActive = false) : null"
            type="text"
            :placeholder="t('client.showtime.searchMovies')"
            class="showtime-search-input"
          />

          <button
            v-if="searchQuery"
            @click="
              searchQuery = '';
              searchActive = false;
            "
            class="showtime-search-clear"
          >
            <X :size="14" class="text-slate-500 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      <!-- Movie Grid -->
      <div v-if="hasShowtimes" class="space-y-4">
        <div
          v-for="movie in movies"
          :key="movie.id"
          @click="selectMovie(movie)"
          class="group rounded-2xl border overflow-hidden cursor-pointer"
          :class="[
            movie.disabled
              ? 'opacity-40 cursor-not-allowed grayscale border-slate-200 dark:border-white/[0.04] bg-white dark:bg-white/[0.02]'
              : movie.selected
                ? 'showtime-movie-selected border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/[0.04]'
                : 'border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.12]',
          ]"
        >
          <div class="flex gap-4 p-4">
            <!-- Poster -->
            <div
              class="relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden flex-shrink-0"
            >
              <img
                :src="movie.poster"
                :alt="movie.title"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
              ></div>
              <!-- Time badge on poster -->
              <div
                class="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md"
                :class="
                  movie.disabled
                    ? 'bg-neutral-700/80 text-neutral-400'
                    : 'bg-sky-500/80 text-white'
                "
              >
                {{ movie.time }}
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 flex flex-col justify-between py-1">
              <div>
                <h3 class="text-base sm:text-lg font-bold leading-tight mb-1">
                  {{ movie.title }}
                </h3>
                <p class="text-[11px] text-neutral-500 font-medium mb-3">
                  {{ movie.genre }}
                </p>

                <div
                  class="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-neutral-400"
                >
                  <span class="flex items-center gap-1.5">
                    <MapPin
                      :size="12"
                      stroke-width="2"
                      class="text-neutral-500"
                    />
                    {{ movie.theater_name }} • {{ movie.hall }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Clock
                      :size="12"
                      stroke-width="2"
                      class="text-neutral-500"
                    />
                    {{ movie.duration }}
                  </span>
                </div>
              </div>

              <!-- Seat availability bar -->
              <div v-if="!movie.disabled" class="mt-3">
                <div class="flex items-center justify-between mb-1.5">
                  <span
                    class="flex items-center gap-1 text-[11px] text-neutral-400"
                  >
                    <Armchair :size="12" stroke-width="2" />
                    {{ movie.availableSeats }} / {{ movie.totalSeats }}
                    {{ t("client.seats.seats") }}
                  </span>
                  <span
                    class="text-[10px] font-bold"
                    :style="{ color: getSeatColor(movie) }"
                  >
                    {{ getSeatPercentage(movie) }}%
                  </span>
                </div>
                <div class="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: getSeatPercentage(movie) + '%',
                      background: `linear-gradient(90deg, ${getSeatColor(movie)}, ${getSeatColor(movie)}88)`,
                    }"
                  ></div>
                </div>
              </div>
              <div v-else class="mt-3">
                <span
                  class="flex items-center gap-1.5 text-[11px] text-red-400 font-semibold"
                >
                  <TicketX :size="13" stroke-width="2" />
                  {{ t("client.showtime.soldOut") }}
                </span>
              </div>
            </div>

            <!-- Arrow indicator -->
            <div
              v-if="!movie.disabled"
              class="flex items-center self-center opacity-0 group-hover:opacity-100"
            >
              <ChevronRight :size="18" class="text-neutral-500" />
            </div>
          </div>

          <!-- Selected indicator line -->
          <div
            v-if="movie.selected && !movie.disabled"
            class="h-[2px] bg-gradient-to-r from-transparent via-sky-500 to-transparent"
          ></div>
        </div>
      </div>

      <!-- No Showtimes Found -->
      <div
        v-if="noShowtimes"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-white dark:bg-white/[0.03] flex items-center justify-center mb-4 border border-slate-200 dark:border-white/[0.06]"
        >
          <TicketX :size="32" class="text-slate-400 dark:text-neutral-600" />
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">
          {{ t("bookings.noShowtimesFound") }}
        </h3>
        <!-- <p class="text-sm text-neutral-500 max-w-xs mx-auto">
          {{ t("bookings.tryAdjustingFilters") }}
        </p> -->
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4"
        ></div>
        <p class="text-neutral-500 text-sm font-medium">
          {{ t("messages.loading") }}
        </p>
      </div>
    </div>

    <!-- Floating Reserve Button -->
    <div
      v-if="selectedMovie"
      class="fixed bottom-0 left-0 right-0 z-40 p-4 showtime-footer-blur"
    >
      <div class="max-w-5xl mx-auto">
        <button
          @click="handleReserveSeats"
          class="showtime-reserve-btn w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-sm cursor-pointer active:scale-[0.98]"
        >
          <Ticket :size="20" stroke-width="2" />
          <span>{{
            t("client.showtime.reserveSeats", { title: selectedMovie.title })
          }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.showtime-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(
      ellipse 80% 50% at 20% 0%,
      rgba(14, 165, 233, 0.05) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse 60% 40% at 90% 100%,
      rgba(139, 92, 246, 0.03) 0%,
      transparent 50%
    );
  pointer-events: none;
}

.showtime-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  margin: 0 -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}
.dark .showtime-header {
  background: rgba(10, 10, 12, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.showtime-gradient-text {
  background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.showtime-date-active {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border-color: rgba(14, 165, 233, 0.4);
  color: #fff;
  box-shadow:
    0 0 0 1px rgba(14, 165, 233, 0.2),
    0 4px 16px -4px rgba(14, 165, 233, 0.3);
}

.showtime-movie-selected {
  box-shadow:
    0 0 0 1px rgba(14, 165, 233, 0.15),
    0 4px 24px -8px rgba(14, 165, 233, 0.15);
}

.showtime-footer-blur {
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.8) 60%,
    transparent
  );
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.dark .showtime-footer-blur {
  background: linear-gradient(
    to top,
    rgba(10, 10, 12, 0.95),
    rgba(10, 10, 12, 0.8) 60%,
    transparent
  );
}

.showtime-reserve-btn {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  box-shadow:
    0 0 0 1px rgba(14, 165, 233, 0.3),
    0 8px 32px -8px rgba(14, 165, 233, 0.4);
}

.showtime-reserve-btn:hover {
  box-shadow:
    0 0 0 1px rgba(14, 165, 233, 0.5),
    0 12px 40px -8px rgba(14, 165, 233, 0.5);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.showtime-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  padding: 10px 14px;
  transition: all 0.25s ease;
}

.showtime-search-bar.active {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(14, 165, 233, 0.25);
  box-shadow:
    0 0 0 1px rgba(14, 165, 233, 0.08),
    0 2px 8px -2px rgba(14, 165, 233, 0.1);
}

.showtime-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  min-width: 0;
}

.showtime-search-input::placeholder {
  color: #94a3b8;
}

.dark .showtime-search-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.showtime-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.showtime-search-clear:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>
