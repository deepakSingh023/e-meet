
export const socket =
    new WebSocket(
        `${import.meta.env.VITE_SOCKET_URL}/signal`
    );