console.log("URL =", import.meta.env.VITE_SOCKET_URL);

export const socket = new WebSocket(import.meta.env.VITE_SOCKET_URL);

socket.onopen = () => {
    console.log("OPEN");
};

socket.onerror = (e) => {
    console.log("ERROR", e);
};

socket.onclose = (e) => {
    console.log("CLOSE", e.code, e.reason);
};

socket.onmessage = (e) => {
    console.log("MESSAGE", e.data);
};