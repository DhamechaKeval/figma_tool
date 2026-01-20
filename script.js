// CENTRAL STATE
const state = {
  elements: [],
  selectedId: null,
};

// DOM REFERENCES
const canvas = document.getElementById("canvas");
const addRectBtn = document.getElementById("add-rect");
const addTextBtn = document.getElementById("add-text");

let idCounter = 0;

function generateId() {
  idCounter++;
  return "el-" + idCounter;
}

function renderElement(el) {
  const div = document.createElement("div");
  div.classList.add("canvas-element");
  div.dataset.id = el.id;

  div.addEventListener("click", (e) => {
    e.stopPropagation(); // VERY IMPORTANT
    selectElement(el.id);
  });

  div.style.left = el.x + "px";
  div.style.top = el.y + "px";
  div.style.width = el.width + "px";
  div.style.height = el.height + "px";
  div.style.background = el.background;
  div.style.zIndex = el.zIndex;
  div.style.transform = `rotate(${el.rotation}deg)`;

  if (el.type === "text") {
    div.textContent = el.text;
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.color = "#fff";
    div.style.fontSize = "14px";
  }

  canvas.appendChild(div);
}

addRectBtn.addEventListener("click", () => {
  const element = {
    id: generateId(),
    type: "rect",
    x: 80,
    y: 80,
    width: 120,
    height: 80,
    rotation: 0,
    background: "#2f80ed",
    text: "",
    zIndex: state.elements.length + 1,
  };

  state.elements.push(element);
  renderElement(element);
});

addTextBtn.addEventListener("click", () => {
  const element = {
    id: generateId(),
    type: "text",
    x: 100,
    y: 100,
    width: 140,
    height: 50,
    rotation: 0,
    background: "#444",
    text: "Text",
    zIndex: state.elements.length + 1,
  };

  state.elements.push(element);
  renderElement(element);
});

//helper function

function clearSelection() {
  const prev = document.querySelector(".canvas-element.selected");
  if (prev) prev.classList.remove("selected");
  state.selectedId = null;
}

function selectElement(id) {
  clearSelection();

  const el = document.querySelector(`.canvas-element[data-id="${id}"]`);
  if (!el) return;

  el.classList.add("selected");
  state.selectedId = id;
}

//Click to Canvas (DESELECT)

canvas.addEventListener("click", () => {
  clearSelection();
});
