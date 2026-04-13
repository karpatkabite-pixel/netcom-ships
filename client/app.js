const socket = io();

let currentRoom = null;
let myGrid = [];
let selectedShip = null;
let direction = "horizontal";

let shipTypes = [
  { size: 4, count: 2 },
  { size: 3, count: 3 },
  { size: 2, count: 4 },
  { size: 1, count: 5 }
];

function joinRoom() {
  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;

  currentRoom = room;

  socket.emit("joinRoom", { roomId: room, name });

  document.getElementById("join").style.display = "none";
  document.getElementById("placement").style.display = "block";

  initGrid();
  renderShips();
}

function initGrid() {
  const grid = document.getElementById("placementGrid");
  grid.innerHTML = "";

  myGrid = [];

  for (let y = 0; y < 10; y++) {
    myGrid[y] = [];

    for (let x = 0; x < 10; x++) {
      myGrid[y][x] = 0;

      const div = document.createElement("div");
      div.className = "cell";

      div.onclick = () => tryPlace(x, y);

      grid.appendChild(div);
    }
  }
}

function renderShips() {
  const panel = document.getElementById("shipsPanel");
  panel.innerHTML = "";

  shipTypes.forEach(s => {
    if (s.count <= 0) return;

    const btn = document.createElement("button");
    btn.textContent = `${s.size} (${s.count})`;

    btn.onclick = () => selectedShip = s.size;

    panel.appendChild(btn);
  });
}

function tryPlace(x, y) {
  if (!selectedShip) return;

  if (!canPlace(x, y, selectedShip)) return;

  for (let i = 0; i < selectedShip; i++) {
    let nx = x + (direction === "horizontal" ? i : 0);
    let ny = y + (direction === "vertical" ? i : 0);

    myGrid[ny][nx] = 1;

    const index = ny * 10 + nx;
    document.getElementById("placementGrid").children[index].style.background = "#333";
  }

  const ship = shipTypes.find(s => s.size === selectedShip);
  ship.count--;

  if (ship.count === 0) selectedShip = null;

  renderShips();
}

function canPlace(x, y, size) {
  for (let i = 0; i < size; i++) {
    let nx = x + (direction === "horizontal" ? i : 0);
    let ny = y + (direction === "vertical" ? i : 0);

    if (nx >= 10 || ny >= 10) return false;

    if (myGrid[ny][nx] === 1) return false;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        let cx = nx + dx;
        let cy = ny + dy;

        if (
          cx >= 0 && cx < 10 &&
          cy >= 0 && cy < 10 &&
          myGrid[cy][cx] === 1
        ) return false;
      }
    }
  }

  return true;
}

function confirmPlacement() {
  const remaining = shipTypes.some(s => s.count > 0);
  if (remaining) return alert("Place all ships");

  socket.emit("placeShips", {
    roomId: currentRoom,
    grid: myGrid
  });

  document.getElementById("placement").style.display = "none";
  document.getElementById("game").style.display = "block";
}

socket.on("roomUpdate", render);

socket.on("gameOver", w => alert("Winner: " + w));

function render(room) {
  if (!room.started) {
    document.getElementById("turn").innerText = "Waiting...";
    return;
  }

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const me = room.me;
  const target = room.players[room.targetIndex];
  const attacker = room.players[room.attackerIndex];

  let txt = `Target: ${target.name} | Turn: ${attacker.name}`;
  if (me.id === target.id) txt += " (YOU ARE TARGET)";
  document.getElementById("turn").innerText = txt;

  const isMyTurn = attacker.id === socket.id;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {

      const div = document.createElement("div");
      div.className = "cell";

      const key = `${x},${y},${target.id}`;

      if (me.grid && me.grid[y][x] === 1) {
        div.style.background = "#333";
      }

      if (room.shots[key]) {
        div.textContent =
          room.shots[key].result === "hit" ? "X" : "•";
      }

      if (isMyTurn) {
        div.onclick = () => {
          socket.emit("attack", { roomId: currentRoom, x, y });
        };
      }

      grid.appendChild(div);
    }
  }
}

// rotate ships
document.addEventListener("keydown", (e) => {
  if (e.key === "r") {
    direction = direction === "horizontal" ? "vertical" : "horizontal";
  }
});
