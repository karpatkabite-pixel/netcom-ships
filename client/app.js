const socket = io();

let currentRoom = null;

function joinRoom() {
  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;

  currentRoom = room;

  socket.emit("joinRoom", { roomId: room, name });

  document.getElementById("join").style.display = "none";
  document.getElementById("game").style.display = "block";
}

function startGame() {
  socket.emit("startGame", currentRoom);
}

socket.on("roomUpdate", (room) => {
  render(room);
});

socket.on("gameOver", (winner) => {
  alert("Winner: " + winner);
});

function render(room) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const me = room.me;
  const players = room.players;

  const target = players[room.targetIndex];
  const attacker = players[room.attackerIndex];

  document.getElementById("turn").innerText =
    room.started
      ? `Target: ${target.name} | Turn: ${attacker.name}`
      : "Waiting to start...";

  const isMyTurn = attacker.id === socket.id;
  const shots = room.shots || {};

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const div = document.createElement("div");
      div.className = "cell";

      const key = `${x},${y},${target.id}`;

      // SHOW YOUR SHIPS ONLY
      if (me.grid[y][x] === 1) {
        div.style.background = "#333";
      }

      // SHOW SHOTS ON CURRENT TARGET
      if (shots[key]) {
        if (shots[key].result === "hit") {
          div.textContent = "X";
          div.style.color = "red";
        } else {
          div.textContent = "•";
        }
      }

      if (room.started && isMyTurn) {
        div.onclick = () => {
          socket.emit("attack", {
            roomId: currentRoom,
            x,
            y
          });
        };
      }

      grid.appendChild(div);
    }
  }
}
