let idCounter = 0;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isResizing = false;
let resizeDirection = null;
let isRotating = false;
let rotationStartAngle = 0;
let elementStartRotation = 0;

// DOM REFERENCES
const canvas = document.getElementById("canvas");
const addRectBtn = document.getElementById("add-rect");
const addTextBtn = document.getElementById("add-text");
const propWidth = document.getElementById("prop-width");
const propHeight = document.getElementById("prop-height");
const propBg = document.getElementById("prop-bg");
const propText = document.getElementById("prop-text");
const textPropWrapper = document.getElementById("text-prop");
const layersList = document.getElementById("layers-list");
const exportJsonBtn = document.getElementById("export-json");
const exportHtmlBtn = document.getElementById("export-html");

// CENTRAL STATE
const state = {
  elements: [],
  selectedId: null,
};

function generateId() {
  idCounter++;
  return "el-" + idCounter;
}

function renderElement(el) {
  const div = document.createElement("div");
  div.classList.add("canvas-element");
  div.dataset.id = el.id;

  div.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return;

    e.stopPropagation();
    selectElement(el.id);

    isDragging = true;
    dragOffsetX = e.offsetX;
    dragOffsetY = e.offsetY;
  });

  // styles
  div.style.left = el.x + "px";
  div.style.top = el.y + "px";
  div.style.width = el.width + "px";
  div.style.height = el.height + "px";
  div.style.background = el.background;
  div.style.zIndex = el.zIndex;
  div.style.transform = `rotate(${el.rotation}deg)`;

  if (el.type === "text") {
    const span = document.createElement("span");
    span.className = "text-content";
    span.textContent = el.text;

    div.appendChild(span);

    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.color = "#fff";
  }

  // resize handle
  ["tl", "tr", "bl", "br"].forEach((dir) => {
    const handle = document.createElement("div");
    handle.classList.add("resize-handle", dir);

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      selectElement(el.id);

      isResizing = true;
      resizeDirection = dir;
    });

    div.appendChild(handle);
  });

  // rotate handals
  const rotateHandle = document.createElement("div");
  rotateHandle.classList.add("rotate-handle");

  rotateHandle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    selectElement(el.id);

    isRotating = true;

    const rect = div.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    rotationStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    elementStartRotation = el.rotation;
  });

  div.appendChild(rotateHandle);

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
  renderLayers();
  saveState();
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
  renderLayers();
  saveState();
});

//helper function
function clearSelection() {
  const prev = document.querySelector(".canvas-element.selected");
  if (prev) prev.classList.remove("selected");

  state.selectedId = null;
  renderLayers();

  propWidth.value = "";
  propHeight.value = "";
  propBg.value = "#000000";
  propText.value = "";
  textPropWrapper.style.display = "none";
}

function selectElement(id) {
  clearSelection();

  const elDiv = document.querySelector(`.canvas-element[data-id="${id}"]`);
  if (!elDiv) return;

  elDiv.classList.add("selected");
  state.selectedId = id;
  renderLayers();

  updatePropertiesPanel();
}

function renderLayers() {
  layersList.innerHTML = "";

  state.elements.forEach((el, index) => {
    const li = document.createElement("li");
    li.textContent = `${el.type.toUpperCase()} (${el.id})`;

    if (el.id === state.selectedId) {
      li.classList.add("active");
    }

    li.addEventListener("click", () => {
      selectElement(el.id);
    });

    // Move Up
    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.style.marginLeft = "8px";

    upBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveLayer(index, -1);
    });

    // Move Down
    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";

    downBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveLayer(index, 1);
    });

    li.appendChild(upBtn);
    li.appendChild(downBtn);
    layersList.appendChild(li);
  });
}

function moveLayer(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.elements.length) return;

  const temp = state.elements[index];
  state.elements[index] = state.elements[newIndex];
  state.elements[newIndex] = temp;

  updateZIndex();
  renderLayers();
}

function updateZIndex() {
  state.elements.forEach((el, i) => {
    el.zIndex = i + 1;

    const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
    if (div) div.style.zIndex = el.zIndex;
  });
}

function saveState() {
  localStorage.setItem("figma-editor-state", JSON.stringify(state.elements));
}

function loadState() {
  const data = localStorage.getItem("figma-editor-state");
  if (!data) return;

  const elements = JSON.parse(data);
  state.elements = elements;

  // 🔑 FIX: sync idCounter with highest existing ID
  let maxId = 0;
  elements.forEach(el => {
    const num = parseInt(el.id.split("-")[1]);
    if (num > maxId) maxId = num;
  });
  idCounter = maxId;

  canvas.innerHTML = "";

  elements.forEach((el) => {
    renderElement(el);
  });

  renderLayers();
}

//Click to Canvas (DESELECT)
canvas.addEventListener("mousedown", (e) => {
  if (e.target !== canvas) return;
  clearSelection();
});

document.addEventListener("mousemove", (e) => {
  if (!state.selectedId) return;

  const elData = state.elements.find((el) => el.id === state.selectedId);
  if (!elData) return;

  const elDiv = document.querySelector(
    `.canvas-element[data-id="${elData.id}"]`
  );

  const canvasRect = canvas.getBoundingClientRect();

  if (isDragging) {
    let newX = e.clientX - canvasRect.left - dragOffsetX;
    let newY = e.clientY - canvasRect.top - dragOffsetY;

    newX = Math.max(0, Math.min(newX, canvas.clientWidth - elData.width));
    newY = Math.max(0, Math.min(newY, canvas.clientHeight - elData.height));

    elData.x = newX;
    elData.y = newY;

    elDiv.style.left = newX + "px";
    elDiv.style.top = newY + "px";
  }

  if (isResizing) {
    const minSize = 30;
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    let { x, y, width, height } = elData;

    if (resizeDirection.includes("r")) {
      width = mouseX - x;
    }
    if (resizeDirection.includes("l")) {
      width = width + (x - mouseX);
      x = mouseX;
    }
    if (resizeDirection.includes("b")) {
      height = mouseY - y;
    }
    if (resizeDirection.includes("t")) {
      height = height + (y - mouseY);
      y = mouseY;
    }

    width = Math.max(minSize, width);
    height = Math.max(minSize, height);

    elData.x = x;
    elData.y = y;
    elData.width = width;
    elData.height = height;

    elDiv.style.left = x + "px";
    elDiv.style.top = y + "px";
    elDiv.style.width = width + "px";
    elDiv.style.height = height + "px";
  }
  if (isRotating) {
    const rect = elDiv.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    const delta = currentAngle - rotationStartAngle;
    const deg = elementStartRotation + (delta * 180) / Math.PI;

    elData.rotation = deg;
    elDiv.style.transform = `rotate(${deg}deg)`;
  }
  saveState();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  isRotating = false;
  resizeDirection = null;
});

function getSelectedElementData() {
  return state.elements.find((el) => el.id === state.selectedId);
}

function updatePropertiesPanel() {
  const el = getSelectedElementData();
  if (!el) return;

  propWidth.value = el.width;
  propHeight.value = el.height;
  propBg.value = el.background;

  if (el.type === "text") {
    textPropWrapper.style.display = "block";
    propText.value = el.text;
  } else {
    textPropWrapper.style.display = "none";
  }
}

//bind with inputs
propWidth.addEventListener("input", () => {
  const el = getSelectedElementData();
  if (!el) return;

  el.width = Number(propWidth.value);

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
  div.style.width = el.width + "px";
  saveState();
});

propHeight.addEventListener("input", () => {
  const el = getSelectedElementData();
  if (!el) return;

  el.height = Number(propHeight.value);

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
  div.style.height = el.height + "px";
  saveState();
});

propBg.addEventListener("input", () => {
  const el = getSelectedElementData();
  if (!el) return;

  el.background = propBg.value;

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
  div.style.background = el.background;
  saveState();
});

propText.addEventListener("input", () => {
  const el = getSelectedElementData();
  if (!el || el.type !== "text") return;

  el.text = propText.value;

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
  const span = div.querySelector(".text-content");

  if (span) {
    span.textContent = el.text;
  }
  saveState();
});

//keyboard movement and delete element
document.addEventListener("keydown", (e) => {
  if (!state.selectedId) return;

  const el = state.elements.find((el) => el.id === state.selectedId);
  if (!el) return;

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);

  const step = 5;

  // DELETE
  if (e.key === "Delete") {
    div.remove();
    state.elements = state.elements.filter((item) => item.id !== el.id);
    saveState();
    clearSelection();
    return;
  }

  // MOVE WITH ARROWS
  switch (e.key) {
    case "ArrowUp":
      el.y = Math.max(0, el.y - step);
      break;
    case "ArrowDown":
      el.y = Math.min(canvas.clientHeight - el.height, el.y + step);
      break;
    case "ArrowLeft":
      el.x = Math.max(0, el.x - step);
      break;
    case "ArrowRight":
      el.x = Math.min(canvas.clientWidth - el.width, el.x + step);
      break;
    default:
      return;
  }

  div.style.left = el.x + "px";
  div.style.top = el.y + "px";

  e.preventDefault(); // stops page scroll
});

//export json and html
function exportJSON() {
  const dataStr = JSON.stringify(state.elements, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "design.json";
  a.click();

  URL.revokeObjectURL(url);
}
exportJsonBtn.addEventListener("click", exportJSON);

function exportHTML() {
  let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Exported Design</title>
</head>
<body style="margin:0;">
<div style="
  position: relative;
  width: ${canvas.clientWidth}px;
  height: ${canvas.clientHeight}px;
">
`;

  state.elements.forEach((el) => {
    html += `
  <div style="
    position: absolute;
    left: ${el.x}px;
    top: ${el.y}px;
    width: ${el.width}px;
    height: ${el.height}px;
    background: ${el.background};
    transform: rotate(${el.rotation}deg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  ">
    ${el.type === "text" ? el.text : ""}
  </div>
`;
  });

  html += `
</div>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "design.html";
  a.click();

  URL.revokeObjectURL(url);
}
exportHtmlBtn.addEventListener("click", exportHTML);

loadState();
