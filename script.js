let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isResizing = false;
let resizeDirection = null;
let isRotating = false;
let rotationStartAngle = 0;
let elementStartRotation = 0;
let snapEnabled = false;

// DOM REFERENCES
const snapToggleBtn = document.getElementById("snap-toggle");
const canvas = document.getElementById("canvas");
const shapeToolbar = document.getElementById("shape-toolbar");
const propWidth = document.getElementById("prop-width");
const propHeight = document.getElementById("prop-height");
const propBg = document.getElementById("prop-bg");
const propText = document.getElementById("prop-text");
const textPropWrapper = document.getElementById("text-prop");
const layersList = document.getElementById("layers-list");
const exportJsonBtn = document.getElementById("export-json");
const exportHtmlBtn = document.getElementById("export-html");
const themeToggleBtn = document.getElementById("theme-toggle");
const snapVLine = document.createElement("div");
const snapHLine = document.createElement("div");
const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsModal = document.getElementById("shortcuts-modal");
const closeShortcutsBtn = document.getElementById("close-shortcuts");
const exportBtn = document.getElementById("export-btn");
const exportModal = document.getElementById("export-modal");
const exportCloseBtn = document.getElementById("export-close");

snapVLine.className = "snap-line vertical";
snapHLine.className = "snap-line horizontal";
canvas.appendChild(snapVLine);
canvas.appendChild(snapHLine);

// CENTRAL STATE
const state = {
  elements: [],
  selectedId: null,
};

function generateId() {
  const usedIds = state.elements.map((el) => {
    return parseInt(el.id.split("-")[1]);
  });

  let newId = 1;
  while (usedIds.includes(newId)) {
    newId++;
  }

  return "el-" + newId;
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
  if (el.type === "triangle") {
    const color =
      el.background && el.background !== "transparent"
        ? el.background
        : "#e74c3c";

    div.style.borderLeftColor = "transparent";
    div.style.borderRightColor = "transparent";
    div.style.borderBottomColor = color;
  }

  if (el.type === "text") {
    const span = document.createElement("span");
    span.className = "text-content";
    span.textContent = el.text;

    //DOUBLE CLICK TO EDIT
    span.addEventListener("dblclick", (e) => {
      e.stopPropagation(); // drag/resize block
      span.contentEditable = "true";
      span.focus();
    });

    //SAVE ON BLUR
    span.addEventListener("blur", () => {
      span.contentEditable = "false";
      el.text = span.textContent;
      saveState();
      updatePropertiesPanel();
    });

    //SAVE ON ENTER
    span.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        span.blur();
      }
    });

    div.appendChild(span);

    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.color = "#fff";
  }

  // resize handle
  if (el.type === "triangle") {
    const handle = document.createElement("div");
    handle.classList.add("resize-handle", "br");

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      selectElement(el.id);
      isResizing = true;
      resizeDirection = "triangle";
    });

    div.appendChild(handle);
  } else {
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
  }

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

  div.dataset.type = el.type;

  if (el.type === "circle") {
    div.style.borderRadius = "50%";
  }

  if (el.type === "triangle") {
    div.classList.add("triangle");
  }

  canvas.appendChild(div);
}

shapeToolbar.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const shape = btn.dataset.shape;
  addShape(shape);
});

function addShape(type) {
  const base = {
    id: generateId(),
    x: Math.max(40, canvas.clientWidth / 2 - 60),
    y: Math.max(40, canvas.clientHeight / 2 - 40),

    rotation: 0,
    zIndex: state.elements.length + 1,
  };

  let element;

  if (type === "rect") {
    element = {
      ...base,
      type: "rect",
      width: 120,
      height: 80,
      background: "#2f80ed",
      text: "",
    };
  }

  if (type === "circle") {
    element = {
      ...base,
      type: "circle",
      width: 80,
      height: 80,
      background: "#27ae60",
      text: "",
    };
  }

  if (type === "triangle") {
    element = {
      ...base,
      type: "triangle",
      width: 80,
      height: 70,
      background: "#e74c3c",
      text: "",
    };
  }

  if (type === "text") {
    element = {
      ...base,
      type: "text",
      width: 200,
      height: 50,
      background: "#444",
      text: "double_click_for_input",
    };
  }

  state.elements.push(element);
  renderElement(element);
  renderLayers();
  saveState();
  selectElement(element.id);
}

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
    li.textContent = `${el.type.toUpperCase()}`;

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

  canvas.innerHTML = "";

  elements.forEach((el) => {
    renderElement(el);
  });

  canvas.appendChild(snapVLine);
  canvas.appendChild(snapHLine);

  renderLayers();
}

function snap(value, size = 10) {
  return Math.round(value / size) * size;
}

//theme dark / Light
function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    themeToggleBtn.textContent = "🌙";
  }
}
themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light");
  const theme = isLight ? "light" : "dark";
  localStorage.setItem("editor-theme", theme);
  applyTheme(theme);
});

//clone elements
function duplicateSelectedElement() {
  if (!state.selectedId) return;

  const el = state.elements.find((e) => e.id === state.selectedId);
  if (!el) return;

  const newEl = {
    ...el,
    id: generateId(), // unique ID
    x: el.x + 20,
    y: el.y + 20,
    zIndex: state.elements.length + 1,
  };

  //Canvas boundary safety
  newEl.x = Math.min(newEl.x, canvas.clientWidth - newEl.width);
  newEl.y = Math.min(newEl.y, canvas.clientHeight - newEl.height);

  //Snap to grid (if enabled)
  if (typeof snapEnabled !== "undefined" && snapEnabled) {
    newEl.x = snap(newEl.x);
    newEl.y = snap(newEl.y);
  }

  state.elements.push(newEl);
  renderElement(newEl);
  updateZIndex();
  renderLayers();
  saveState();

  selectElement(newEl.id);
}

//snap
function applySnapUI() {
  snapToggleBtn.textContent = snapEnabled ? "Snap: ON" : "Snap: OFF";
}

snapToggleBtn.addEventListener("click", () => {
  snapEnabled = !snapEnabled;
  localStorage.setItem("editor-snap", snapEnabled ? "1" : "0");
  applySnapUI();
});

function showSnapLines(x, y) {
  snapVLine.style.left = x + "px";
  snapHLine.style.top = y + "px";

  snapVLine.style.display = "block";
  snapHLine.style.display = "block";
}

function hideSnapLines() {
  snapVLine.style.display = "none";
  snapHLine.style.display = "none";
}

// load saved snap
snapEnabled = localStorage.getItem("editor-snap") === "1";
applySnapUI();

// load saved theme
const savedTheme = localStorage.getItem("editor-theme") || "dark";
applyTheme(savedTheme);

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
    `.canvas-element[data-id="${elData.id}"]`,
  );

  const canvasRect = canvas.getBoundingClientRect();

  if (isResizing && elData.type === "triangle") {
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const newWidth = Math.max(30, mouseX - elData.x);
    const newHeight = Math.max(30, mouseY - elData.y);

    elData.width = newWidth;
    elData.height = newHeight;

    elDiv.style.borderLeftWidth = newWidth / 2 + "px";
    elDiv.style.borderRightWidth = newWidth / 2 + "px";
    elDiv.style.borderBottomWidth = newHeight + "px";

    return; // 👈 VERY IMPORTANT
  }

  if (isDragging) {
    let newX = e.clientX - canvasRect.left - dragOffsetX;
    let newY = e.clientY - canvasRect.top - dragOffsetY;

    // boundary
    newX = Math.max(0, Math.min(newX, canvas.clientWidth - elData.width));
    newY = Math.max(0, Math.min(newY, canvas.clientHeight - elData.height));

    if (snapEnabled) {
      newX = snap(newX);
      newY = snap(newY);
      showSnapLines(newX, newY);
    } else {
      hideSnapLines();
    }

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
  hideSnapLines();
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

  if (el.type === "triangle") {
    div.style.borderBottomColor = el.background;
  } else {
    div.style.background = el.background;
  }

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

  // 🔥 CTRL / CMD + D → DUPLICATE
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
    e.preventDefault();

    const newEl = {
      ...el,
      id: generateId(),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: state.elements.length + 1,
    };

    state.elements.push(newEl);
    renderElement(newEl);
    renderLayers();
    selectElement(newEl.id);
    saveState();
    return;
  }

  // 🗑 DELETE
  if (e.key === "Delete") {
    div.remove();
    state.elements = state.elements.filter((item) => item.id !== el.id);
    clearSelection();
    saveState();
    return;
  }

  // ⬆⬇⬅➡ MOVE WITH ARROWS
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

  saveState();
  e.preventDefault(); // stop page scroll
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
<style>
  body { margin: 0; background: #111; }
  .canvas {
    position: relative;
    width: ${canvas.clientWidth}px;
    height: ${canvas.clientHeight}px;
  }
  .rect {
    position: absolute;
  }
  .circle {
    position: absolute;
    border-radius: 50%;
  }
  .triangle {
    position: absolute;
    width: 0;
    height: 0;
  }
</style>
</head>
<body>
<div class="canvas">
`;

  state.elements.forEach((el) => {
    if (el.type === "rect") {
      html += `
<div class="rect" style="
  left:${el.x}px;
  top:${el.y}px;
  width:${el.width}px;
  height:${el.height}px;
  background:${el.background};
  transform: rotate(${el.rotation}deg);
"></div>`;
    }

    if (el.type === "circle") {
      html += `
<div class="circle" style="
  left:${el.x}px;
  top:${el.y}px;
  width:${el.width}px;
  height:${el.height}px;
  background:${el.background};
  transform: rotate(${el.rotation}deg);
"></div>`;
    }

    if (el.type === "triangle") {
      html += `
<div class="triangle" style="
  left:${el.x}px;
  top:${el.y}px;
  border-left:${el.width / 2}px solid transparent;
  border-right:${el.width / 2}px solid transparent;
  border-bottom:${el.height}px solid ${el.background};
  transform: rotate(${el.rotation}deg);
"></div>`;
    }

    if (el.type === "text") {
      html += `
<div style="
  position:absolute;
  left:${el.x}px;
  top:${el.y}px;
  width:${el.width}px;
  height:${el.height}px;
  background:${el.background};
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  transform: rotate(${el.rotation}deg);
">
${el.text}
</div>`;
    }
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

shortcutsBtn.addEventListener("click", () => {
  shortcutsModal.style.display = "flex";
});

closeShortcutsBtn.addEventListener("click", () => {
  shortcutsModal.style.display = "none";
});

shortcutsModal.addEventListener("click", (e) => {
  if (e.target === shortcutsModal) {
    shortcutsModal.style.display = "none";
  }
});

exportBtn.addEventListener("click", () => {
  exportModal.style.display = "flex";
});

exportCloseBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
});

// bahar click pe close
exportModal.addEventListener("click", (e) => {
  if (e.target === exportModal) {
    exportModal.style.display = "none";
  }
});

exportJsonBtn.addEventListener("click", exportJSON);
exportHtmlBtn.addEventListener("click", exportHTML);
