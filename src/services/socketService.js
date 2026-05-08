import { io } from "socket.io-client";
import { ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";
import { ElNotification } from "element-plus";

const socket = ref(null);
const isConnected = ref(false);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://janette-semiexposed-carline.ngrok-free.dev/api";
const SOCKET_URL = API_BASE_URL.replace("/api", "");

export const useSocket = () => {
  const initSocket = () => {
    if (socket.value) return;

    socket.value = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });

    const authStore = useAuthStore();

    socket.value.on("connect", () => {
      isConnected.value = true;
      console.log("Connected to socket server");
      
      // Join room if already logged in
      if (authStore.user) {
        const customerId = authStore.user.id || authStore.user._id;
        if (customerId) {
          socket.value.emit("join-room", `customer:${customerId}`);
        }
      }
    });

    // Listen for real-time deactivation
    socket.value.on("customer:disabled", (data) => {
      console.warn("Account disabled event received", data);
      authStore.logout();
      router.push("/login");
      ElNotification({
        title: "Account Disabled",
        message: data.message || "Your account has been disabled by an administrator.",
        type: "error",
        duration: 0,
      });
    });

    // Watch for login to join room
    watch(() => authStore.user, (newUser) => {
      if (newUser && socket.value) {
        const customerId = newUser.id || newUser._id;
        if (customerId) {
          socket.value.emit("join-room", `customer:${customerId}`);
        }
      }
    });

    socket.value.on("disconnect", () => {
      isConnected.value = false;
      console.log("Disconnected from socket server");
    });

    socket.value.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  };

  const onEvent = (event, callback) => {
    if (!socket.value) initSocket();
    socket.value.on(event, callback);
  };

  const offEvent = (event) => {
    if (socket.value) {
      socket.value.off(event);
    }
  };

  const emitEvent = (event, data) => {
    if (!socket.value) initSocket();
    socket.value.emit(event, data);
  };

  return {
    socket,
    isConnected,
    initSocket,
    onEvent,
    offEvent,
    emitEvent,
  };
};
