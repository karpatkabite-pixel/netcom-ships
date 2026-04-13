const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        turnIndex: 0
      };
    }

    rooms[roomId].players.push({
      id: socket.id,
      name,
      grid: createGrid(),
      alive: true
    });

    io.to(roomId).emit("roomUpdate", rooms[roomId]);
  });

  socket.on("attack", ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room) return;

    const attacker = room.players[room.turnIndex];

    // attack all other players
    room.players.forEach((player) => {
      if (player.id !== attacker.id && player.alive) {
        if (player.grid[y][x] === 1) {
          player.grid[y][x] = 2; // hit
        }
      }
    });

    // next turn
    room.turnIndex = (room.turnIndex + 1) % room.players.length;

    io.to(roomId).emit("roomUpdate", room);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

function createGrid() {
  const grid = [];
  for (let y = 0; y < 10; y++) {
    grid[y] = [];
    for (let x = 0; x < 10; x++) {
      grid[y][x] = Math.random() > 0.8 ? 1 : 0; // random ships
    }
  }
  return grid;
}

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
