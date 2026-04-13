const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        turnIndex: 0,
        started: false,
        shots: {}
      };
    }

    const room = rooms[roomId];

    room.players.push({
      id: socket.id,
      name,
      grid: createGrid(),
      hits: 0,
      alive: true
    });

    io.to(roomId).emit("roomUpdate", room);
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    room.started = true;
    io.to(roomId).emit("roomUpdate", room);
  });

  socket.on("attack", ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room || !room.started) return;

    const attacker = room.players[room.turnIndex];
    if (attacker.id !== socket.id) return;

    const key = `${x},${y}`;
    if (room.shots[key]) return;

    let hit = false;

    room.players.forEach((player) => {
      if (player.id !== attacker.id && player.alive) {
        if (player.grid[y][x] === 1) {
          player.grid[y][x] = 2;
          player.hits++;
          hit = true;

          if (player.hits >= 10) {
            player.alive = false;
          }
        }
      }
    });

    room.shots[key] = hit ? "hit" : "miss";

    const alivePlayers = room.players.filter(p => p.alive);
    if (alivePlayers.length === 1) {
      io.to(roomId).emit("gameOver", alivePlayers[0].name);
      return;
    }

    do {
      room.turnIndex =
        (room.turnIndex + 1) % room.players.length;
    } while (!room.players[room.turnIndex].alive);

    io.to(roomId).emit("roomUpdate", room);
  });
});

function createGrid() {
  const grid = [];
  let ships = 0;

  for (let y = 0; y < 10; y++) {
    grid[y] = [];
    for (let x = 0; x < 10; x++) {
      if (Math.random() > 0.85 && ships < 10) {
        grid[y][x] = 1;
        ships++;
      } else {
        grid[y][x] = 0;
      }
    }
  }
  return grid;
}

server.listen(PORT, () => {
  console.log("Running on", PORT);
});
