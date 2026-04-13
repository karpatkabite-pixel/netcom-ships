const socket = io();

let currentRoom = null;
let playerName = null;

function joinRoom() {
  playerName = document.getElementById("name").value;
  currentRoom = document.getElementById("room").value;

  socket.emit("joinRoom", {
    roomId: currentRoom,
    name: playerName
  });

  document.getElementById("join").style.display = "none";
  document.getElementById("game").style.display = "block";
}

function startGame() {
  socket.emit("startGame", currentRoom);
}

socket.on("roomUpdate", (room) => {
  render(room);
});

socket.on("attackResult", (results) => {
  document.getElementById("log").innerText =
    results.join(" | ");
});

socket.on("gameOver", (winner) => {
  alert("Winner: " + winner);
});

function render(room) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const turnPlayer = room.players[room.turnIndex];

  document.getElementById("turn").innerText =
    room.started
      ? "Turn: " + turnPlayer.name
      : "Waiting to start...";

  const isMyTurn = turnPlayer.id === socket.id;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const div = document.createElement("div");
      div.className = "cell";

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

  if (!room.started) {
    document.getElementById("startBtn").style.display = "block";
  }
}
