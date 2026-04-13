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
      grid: null,
      hits: 0,
      alive: true,
      ready: false
    });

    sendRoom(roomId);
  });

  socket.on("placeShips", ({ roomId, grid }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.grid = grid;
    player.ready = true;

    const allReady = room.players.every(p => p.ready);

    if (allReady && room.players.length >= 2) {
      room.started = true;
      room.targetIndex = 0;
      room.attackerIndex = 1;
    }

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

      if (target.hits >= 20) { // total ship tiles
        target.alive = false;
      }
    }

    room.shots[key] = {
      result: hit ? "hit" : "miss",
      targetId: target.id
    };

    // win check
    const alive = players.filter(p => p.alive);
    if (alive.length === 1) {
      io.to(roomId).emit("gameOver", alive[0].name);
      return;
    }

    // ===== FIXED ROTATION =====
    const alivePlayers = players
      .map((p, i) => ({ ...p, index: i }))
      .filter(p => p.alive);

    const tIndex = alivePlayers.findIndex(p => p.index === room.targetIndex);
    const aIndex = alivePlayers.findIndex(p => p.index === room.attackerIndex);

    let next = (aIndex + 1) % alivePlayers.length;

    if (alivePlayers[next].index === room.targetIndex) {
      const newTarget = (tIndex + 1) % alivePlayers.length;
      room.targetIndex = alivePlayers[newTarget].index;

      let nextAttacker = (newTarget + 1) % alivePlayers.length;

      if (alivePlayers[nextAttacker].index === room.targetIndex) {
        nextAttacker = (nextAttacker + 1) % alivePlayers.length;
      }

      room.attackerIndex = alivePlayers[nextAttacker].index;

    } else {
      room.attackerIndex = alivePlayers[next].index;
    }

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
        alive: p.alive,
        ready: p.ready
      })),
      shots: room.shots,
      targetIndex: room.targetIndex,
      attackerIndex: room.attackerIndex,
      started: room.started,
      me: player
    });
  });
}

server.listen(PORT, () => {
  console.log("Running on", PORT);
});
