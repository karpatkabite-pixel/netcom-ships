
const socket = io();

let currentRoom = null;
let myGrid = [];
let shipsToPlace = 10;

function joinRoom() {
  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;

  currentRoom = room;

  socket.emit("joinRoom", { roomId: room, name });

  document.getElementById("join").style.display = "none";
  document.getElementById("placement").style.display = "block";

  initPlacementGrid();
}

function initPlacementGrid() {
  const grid = document.getElementById("placementGrid");
  grid.innerHTML = "";

  shipsToPlace = 10;
  myGrid = [];

  for (let y = 0; y < 10; y++) {
    myGrid[y] = [];

    for (let x = 0; x < 10; x++) {
      myGrid[y][x] = 0;

      const div = document.createElement("div");
      div.className = "cell";

      div.onclick = () => {
        if (shipsToPlace <= 0) return;

        if (myGrid[y][x] === 0) {
          myGrid[y][x] = 1;
          div.style.background = "#333";
          shipsToPlace--;
          updateShipsLeft();
        }
      };

      grid.appendChild(div);
    }
  }

  updateShipsLeft();
}

function updateShipsLeft() {
  document.getElementById("shipsLeft").innerText =
    "Ships left: " + shipsToPlace;
}

function confirmPlacement() {
  if (shipsToPlace > 0) {
    alert("Place all ships first!");
    return;
  }

  socket.emit("placeShips", {
    roomId: currentRoom,
    grid: myGrid
  });

  document.getElementById("placement").style.display = "none";
  document.getElementById("game").style.display = "block";
}

socket.on("roomUpdate", (room) => {
  render(room);
});

socket.on("gameOver", (winner) => {
  alert("Winner: " + winner);
});

function render(room) {
  if (!room.started) {
    document.getElementById("turn").innerText =
      "Waiting for all players...";
    return;
  }

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const me = room.me;
  const players = room.players;

  const target = players[room.targetIndex];
  const attacker = players[room.attackerIndex];

  document.getElementById("turn").innerText =
    `Target: ${target.name} | Turn: ${attacker.name}`;

  const isMyTurn = attacker.id === socket.id;
  const shots = room.shots || {};

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const div = document.createElement("div");
      div.className = "cell";

      const key = `${x},${y},${target.id}`;

      // your ships
      if (me.grid && me.grid[y][x] === 1) {
        div.style.background = "#333";
      }

      // shots
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
