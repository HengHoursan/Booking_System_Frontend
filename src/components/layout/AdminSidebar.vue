<template>
  <div class="sidebar-container">
    <!-- Logo -->
    <div class="logo">
      <div class="logo-content" :class="{ collapsed: sidebarCollapsed }">
        <img src="../../assets/rsb-cinema.png" alt="Logo" class="logo-image" />
        <span v-show="!sidebarCollapsed" class="logo-text">Ninja Booking</span>
        <!-- Optional text if sidebar not collapsed -->
      </div>
    </div>

    <!-- Navigation Menu -->
    <el-scrollbar class="sidebar-scroll">
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        :collapse="sidebarCollapsed"
        :unique-opened="true"
        router
      >
        <el-menu-item
          v-if="isSuperAdmin || canViewDashboard"
          :index="pathPrefix + '/dashboard'"
        >
          <el-icon>
            <LayoutDashboard />
          </el-icon>
          <template #title>{{ $t("nav.dashboard") }}</template>
        </el-menu-item>

        <!-- Booking Management -->
        <el-sub-menu
          v-if="isSuperAdmin || canViewBookings || canViewBookingTickets"
          index="bookings"
        >
          <template #title>
            <el-icon>
              <BookOpen />
            </el-icon>
            <span>{{ $t("nav.bookingsNav") }}</span>
          </template>
          <el-menu-item
            v-if="isSuperAdmin || canViewBookings"
            :index="pathPrefix + '/bookings'"
          >
            <el-icon>
              <BookOpen />
            </el-icon>
            <template #title>{{ $t("nav.bookingsNav") }}</template>
          </el-menu-item>
          <el-menu-item
            v-if="isSuperAdmin || canViewBookingTickets"
            :index="pathPrefix + '/booking-tickets'"
          >
            <el-icon>
              <Ticket />
            </el-icon>
            <template #title>{{ $t("bookingTickets.title") }}</template>
          </el-menu-item>
        </el-sub-menu>

        <!-- Payment Management -->
        <el-menu-item
          v-if="isSuperAdmin || canViewPayments"
          :index="pathPrefix + '/payments'"
        >
          <el-icon>
            <CreditCard />
          </el-icon>
          <template #title>{{ $t("payments.paymentList") }}</template>
        </el-menu-item>

        <el-sub-menu v-if="isSuperAdmin || canViewSeats" index="seats">
          <template #title>
            <el-icon>
              <Armchair />
            </el-icon>
            <span>{{ $t("seats.title") }}</span>
          </template>
          <el-menu-item :index="pathPrefix + '/seats'">
            <el-icon>
              <Armchair />
            </el-icon>
            <template #title>{{ $t("seats.allSeats") }}</template>
          </el-menu-item>
          <el-menu-item
            v-if="isSuperAdmin || canViewBookings"
            :index="pathPrefix + '/seat-booking'"
          >
            <el-icon>
              <BookOpen />
            </el-icon>
            <template #title>{{ $t("seats.seatBooking") }}</template>
          </el-menu-item>
          <el-menu-item
            v-if="true"
            :index="pathPrefix + '/seat-booking-history'"
          >
            <el-icon>
              <History />
            </el-icon>
            <template #title>{{ $t("seats.seatBookingHistory") }}</template>
          </el-menu-item>
          <!-- <el-menu-item v-if="isSuperAdmin || canCreateSeats" index="/admin/seats/create">
          <el-icon>
            <Plus/>
          </el-icon>
          <template #title>{{ $t("seats.addSeat") }}</template>
        </el-menu-item> -->
        </el-sub-menu>

        <el-sub-menu v-if="isSuperAdmin || canViewHalls" index="halls">
          <template #title>
            <el-icon>
              <Monitor />
            </el-icon>
            <span>{{ $t("halls.title") }}</span>
          </template>
          <el-menu-item :index="pathPrefix + '/halls'">
            <el-icon>
              <Monitor />
            </el-icon>
            <template #title>{{ $t("halls.allHalls") }}</template>
          </el-menu-item>
          <!-- <el-menu-item v-if="isSuperAdmin || canCreateHalls" @click="openCreateHallDialog">
          <el-icon>
            <Plus/>
          </el-icon>
          <template #title>{{ $t("halls.addHall") }}</template>
        </el-menu-item> -->
        </el-sub-menu>

        <el-sub-menu v-if="isSuperAdmin || canViewTheaters" index="theaters">
          <template #title>
            <el-icon>
              <Projector />
            </el-icon>
            <span>{{ $t("theaters.title") }}</span>
          </template>
          <el-menu-item :index="pathPrefix + '/theaters'">
            <el-icon>
              <Projector />
            </el-icon>
            <template #title>{{ $t("theaters.allTheaters") }}</template>
          </el-menu-item>
          <!-- <el-menu-item v-if="isSuperAdmin || canCreateTheaters" index="/admin/theaters/create">
          <el-icon>
            <Plus/>
          </el-icon>
          <template #title>{{ $t("theaters.addTheater") }}</template>
        </el-menu-item> -->
        </el-sub-menu>

        <el-sub-menu v-if="isSuperAdmin || canViewMovies" index="movies">
          <template #title>
            <el-icon>
              <Film />
            </el-icon>
            <span>{{ $t("movies.title") }}</span>
          </template>
          <el-menu-item :index="pathPrefix + '/movies'">
            <el-icon>
              <Clapperboard />
            </el-icon>
            <template #title>{{ $t("movies.allMovies") }}</template>
          </el-menu-item>
          <el-menu-item
            v-if="isSuperAdmin || canCreateMovies"
            :index="pathPrefix + '/movies/create'"
          >
            <el-icon>
              <Plus />
            </el-icon>
            <template #title>{{ $t("movies.addMovie") }}</template>
          </el-menu-item>
        </el-sub-menu>

        <!-- Promotions -->
        <!-- <el-sub-menu
          v-if="isSuperAdmin || canViewPromotions"
          index="promotions"
        >
          <template #title>
            <el-icon>
              <Tag />
            </el-icon>
            <span>{{ $t("promotions.title") }}</span>
          </template>
          <el-menu-item :index="pathPrefix + '/promotions'">
            <el-icon>
              <Tag />
            </el-icon>
            <template #title>{{
              $t("promotions.allPromotions") || "All Promotions"
            }}</template>
          </el-menu-item>
          <el-menu-item
            v-if="isSuperAdmin || canCreatePromotions"
            :index="pathPrefix + '/promotions/create'"
          >
            <el-icon>
              <Plus />
            </el-icon>
            <template #title>{{
              $t("promotions.addPromotion") || "Add Promotion"
            }}</template>
          </el-menu-item>
        </el-sub-menu> -->

        <el-sub-menu v-if="isSuperAdmin || canViewShowtimes" index="showtimes">
          <template #title>
            <el-icon>
              <Ticket />
            </el-icon>
            <span>{{ $t("showtimes.title") }}</span>
          </template>
          <el-menu-item :index="pathPrefix + '/showtimes'">
            <el-icon>
              <Ticket />
            </el-icon>
            <template #title>{{ $t("showtimes.allShowtimes") }}</template>
          </el-menu-item>
          <el-menu-item
            v-if="isSuperAdmin || canCreateShowtimes"
            :index="pathPrefix + '/showtimes/create'"
          >
            <el-icon>
              <Plus />
            </el-icon>
            <template #title>{{ $t("showtimes.addShowtime") }}</template>
          </el-menu-item>
        </el-sub-menu>

        <!-- <el-sub-menu v-if="isSuperAdmin || canViewHalls" index="bookings">
        <template #title>
          <el-icon>
            <BookOpen />
          </el-icon>
          <span>{{ $t("bookings.title") }}</span>
        </template>
        <el-menu-item index="/admin/bookings">
          <el-icon>
            <BookOpen />
          </el-icon>
          <template #title>{{ $t("bookings.title") }}</template>
        </el-menu-item>
      </el-sub-menu> -->

        <!-- Customer Management -->
        <el-sub-menu
          v-if="isSuperAdmin || canViewCustomers || canCreateCustomers"
          index="customers"
        >
          <template #title>
            <el-icon>
              <Users />
            </el-icon>
            <span>{{ $t("customers.title") }}</span>
          </template>
          <el-menu-item 
            v-if="isSuperAdmin || canViewCustomers"
            :index="pathPrefix + '/customers'"
          >
            <el-icon>
              <Users />
            </el-icon>
            <template #title>{{ $t("customers.allCustomers") }}</template>
          </el-menu-item>
          <!-- <el-menu-item
            v-if="isSuperAdmin || canCreateCustomers"
            :index="pathPrefix + '/customers/create'"
          >
            <el-icon>
              <Plus />
            </el-icon>
            <template #title>{{ $t("customers.createCustomer") }}</template>
          </el-menu-item> -->
        </el-sub-menu>

        <!-- Reports -->
        <el-menu-item
          v-if="isSuperAdmin || canViewReports"
          :index="pathPrefix + '/reports'"
        >
          <el-icon>
            <ClipboardCheck />
          </el-icon>
          <template #title>{{ $t("nav.reportsNav") }}</template>
        </el-menu-item>

        <!-- User Management (Dialog-based create) -->
        <el-menu-item
          v-if="isSuperAdmin || canViewUsers"
          :index="pathPrefix + '/users'"
        >
          <el-icon>
            <Users />
          </el-icon>
          <template #title>{{ $t("users.title") }}</template>
        </el-menu-item>

        <!-- Settings -->
        <el-menu-item
          v-if="isSuperAdmin || canViewSettings"
          :index="pathPrefix + '/settings'"
        >
          <el-icon>
            <Settings />
          </el-icon>
          <template #title>{{ $t("nav.settings") }}</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { usePath } from "@/composables/usePath";
import { usePermissions } from "@/composables/usePermissions";
import {
  Armchair,
  BookOpen,
  Clapperboard,
  Film,
  LayoutDashboard,
  Monitor,
  Plus,
  Projector,
  Settings,
  Shield,
  Tag,
  Ticket,
  UserCog,
  Users,
  History,
  CreditCard, // Added CreditCard icon
  ClipboardCheck,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { pathPrefix } = usePath();
const {
  canViewUsers,
  canViewDashboard,
  canViewSettings,
  canViewTheaters,
  canCreateTheaters,
  canViewHalls,
  canCreateHalls,
  canViewSeats,
  canViewMovies,
  canCreateMovies,
  canViewPromotions,
  canCreatePromotions,
  canViewShowtimes,
  canCreateShowtimes,
  canViewBookings,
  canViewBookingTickets,
  canViewPayments,
  canViewCustomers,
  canCreateCustomers,
  canViewReports,
  isSuperAdmin,
} = usePermissions();

// Remove debug after fixing

const activeMenu = computed(() => route.path);
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed);
const theme = computed(() => appStore.theme);
</script>

<style scoped>
.sidebar-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);
  transition: background-color 0.3s;
}

.logo-content {
  display: flex;
  align-items: center;
  color: var(--el-text-color-primary);
  font-weight: bold;
  font-size: 18px;
  transition: all 0.3s;
}

.logo-content.collapsed {
  justify-content: center;
}

.logo-icon {
  font-size: 24px;
  color: var(--el-color-primary);
  margin-right: 8px;
}

.logo-content.collapsed .logo-icon {
  margin-right: 0;
}

.logo-text {
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 240px;
}

/* Custom menu item styles */
:deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
}

:deep(.el-sub-menu .el-menu-item) {
  height: 40px;
  line-height: 40px;
  padding-left: 50px !important;
}

.logo-image {
  height: 50px; /* keeps it compact */
  width: auto;
  margin-right: 10px;
  border-radius: 8px; /* smooth rounded corners */
  object-fit: cover; /* prevents stretching */
  transition: all 0.3s ease;
}

/* Center logo when collapsed */
.logo-content.collapsed .logo-image {
  margin: 0 auto;
}

/* Add a hover effect */
.logo-image:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
.sidebar-scroll {
  flex: 1;
  height: calc(100vh - 60px); /* subtract logo height */
}
</style>
