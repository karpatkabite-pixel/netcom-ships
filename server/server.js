const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../client")));

const rooms = {};

io.on("connection", (socket) => {

  socket.on("joinRoom", ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        started: false,
        shots: {},
        targetIndex: 0,
        attackerIndex: 1
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

    sendRoom(roomId);
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    room.started = true;
    room.targetIndex = 0;
    room.attackerIndex = 1;

    sendRoom(roomId);
  });

  socket.on("attack", ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room || !room.started) return;

    const players = room.players;
    const attacker = players[room.attackerIndex];
    const target = players[room.targetIndex];

    if (!attacker || !target) return;
    if (attacker.id !== socket.id) return;
    if (!attacker.alive || !target.alive) return;

    const key = `${x},${y},${target.id}`;
    if (room.shots[key]) return;

    let hit = false;

    if (target.grid[y][x] === 1) {
      target.grid[y][x] = 2;
      target.hits++;
      hit = true;

      if (target.hits >= 10) {
        target.alive = false;
      }
    }

    room.shots[key] = {
      result: hit ? "hit" : "miss",
      targetId: target.id
    };

    // WIN CHECK
    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length === 1) {
      io.to(roomId).emit("gameOver", alivePlayers[0].name);
      return;
    }

    // NEXT ATTACKER
    let next = room.attackerIndex;

    do {
      next = (next + 1) % players.length;
    } while (!players[next].alive || next === room.targetIndex);

    // IF WE LOOPED → CHANGE TARGET
    if (next === (room.targetIndex + 1) % players.length) {
      do {
        room.targetIndex =
          (room.targetIndex + 1) % players.length;
      } while (!players[room.targetIndex].alive);
    }

    room.attackerIndex = next;

    sendRoom(roomId);
  });

});

function sendRoom(roomId) {
  const room = rooms[roomId];

  room.players.forEach(player => {
    io.to(player.id).emit("roomUpdate", {
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        alive: p.alive
      })),
      shots: room.shots,
      targetIndex: room.targetIndex,
      attackerIndex: room.attackerIndex,
      started: room.started,
      me: player
    });
  });
}

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
