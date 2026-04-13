const socket = io();

let currentRoom = null;
let playerName = null;

function joinRoom() {
  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;

  playerName = name;
  currentRoom = room;

  socket.emit("joinRoom", { roomId: room, name });

  document.getElementById("join").style.display = "none";
  document.getElementById("game").style.display = "block";
}

socket.on("roomUpdate", (room) => {
  render(room);
});

function render(room) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const currentPlayer = room.players[room.turnIndex];
  document.getElementById("turn").innerText =
    "Turn: " + currentPlayer.name;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const div = document.createElement("div");
      div.className = "cell";

      div.onclick = () => {
        socket.emit("attack", {
          roomId: currentRoom,
          x,
          y
        });
      };

      grid.appendChild(div);
    }
  }
}
