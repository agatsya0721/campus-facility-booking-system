import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { setIo } from "./config/socket.js";
import { registerSocketHandlers } from "./sockets/registerSocketHandlers.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientOrigin === "*" ? true : env.clientOrigin,
    credentials: true
  }
});

setIo(io);
registerSocketHandlers(io);

server.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
});
