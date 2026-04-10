export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    socket.on("subscribe:facility", (facilityId) => {
      socket.join(`facility:${facilityId}`);
    });

    socket.on("subscribe:user", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("subscribe:calendar", () => {
      socket.join("calendar");
    });
  });
};
