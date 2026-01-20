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

  updatePropertiesPanel();
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
});

propHeight.addEventListener("input", () => {
  const el = getSelectedElementData();
  if (!el) return;

  el.height = Number(propHeight.value);

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
  div.style.height = el.height + "px";
});

propBg.addEventListener("input", () => {
  const el = getSelectedElementData();
  if (!el) return;

  el.background = propBg.value;

  const div = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
  div.style.background = el.background;
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
});
