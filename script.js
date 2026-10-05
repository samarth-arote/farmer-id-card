// MODIFIED: Core Form DOM Elements Selection
const form = document.getElementById("cardForm");
const frontPreview = document.getElementById("frontPreview");
const backPreview = document.getElementById("backPreview");
const frontPreview3D = document.getElementById("frontPreview3D");
const backPreview3D = document.getElementById("backPreview3D");

const printStack = document.getElementById("printStack");
const frontTemplate = document.getElementById("frontTemplate");
const backTemplate = document.getElementById("backTemplate");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");

let photoDataUrl = "";
let currentEditingRecord = null;
let currentViewMode = "drag"; // 'drag', 'spin', or 'both'

// 3D All-Direction Trackball Rotation State (X and Y axes)
let cardRotateY = 0;
let cardRotateX = 0;
let isDragging = false;
let isAutoSpinning = false;
let autoSpinAnimId = null;
let startX = 0;
let startY = 0;
let initialRotateY = 0;
let initialRotateX = 0;
let dragDistance = 0;

// Helper function to generate YYYYMMDD_HHMMSS timestamp string
function getFormattedTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

// View Mode Switcher (3D Drag, 360 Spin, Both Cards)
function initViewModeControls() {
  const btnDrag = document.getElementById("btnModeFlip");
  const btnSpin = document.getElementById("btnModeAutoSpin");
  const btnBoth = document.getElementById("btnModeBoth");

  const singleContainer = document.getElementById("singleFlipContainer");
  const bothContainer = document.getElementById("bothCardsContainer");
  const noteText = document.getElementById("previewNoteText");

  if (!btnDrag || !btnBoth) return;

  function stopAutoSpin() {
    isAutoSpinning = false;
    if (autoSpinAnimId) cancelAnimationFrame(autoSpinAnimId);
  }

  function startAutoSpinLoop() {
    stopAutoSpin();
    isAutoSpinning = true;
    const inner = document.getElementById("flipCardInner");
    if (inner) inner.classList.add("no-transition");

    let stepCount = 0;
    function step() {
      if (!isAutoSpinning) return;
      if (!isDragging) {
        stepCount += 0.02;
        cardRotateY += 1.2;
        cardRotateX = Math.sin(stepCount) * 14;
        apply3DTransform(cardRotateY, cardRotateX);
      }
      autoSpinAnimId = requestAnimationFrame(step);
    }
    autoSpinAnimId = requestAnimationFrame(step);
  }

  btnDrag.addEventListener("click", () => {
    stopAutoSpin();
    currentViewMode = "drag";
    btnDrag.classList.add("active");
    if (btnSpin) btnSpin.classList.remove("active");
    btnBoth.classList.remove("active");
    singleContainer.classList.remove("hidden");
    bothContainer.classList.add("hidden");
    const previewPanel = document.querySelector(".preview-panel");
    if (previewPanel) previewPanel.style.overflowY = "hidden";
    if (noteText) noteText.textContent = "";
    updateCardScale();
  });

  if (btnSpin) {
    btnSpin.addEventListener("click", () => {
      currentViewMode = "spin";
      btnSpin.classList.add("active");
      btnDrag.classList.remove("active");
      btnBoth.classList.remove("active");
      singleContainer.classList.remove("hidden");
      bothContainer.classList.add("hidden");
      const previewPanel = document.querySelector(".preview-panel");
      if (previewPanel) previewPanel.style.overflowY = "hidden";
      if (noteText) noteText.textContent = "360° Multi-Axis Orbit Spin 🔄";
      updateCardScale();
      startAutoSpinLoop();
    });
  }

  btnBoth.addEventListener("click", () => {
    stopAutoSpin();
    currentViewMode = "both";
    btnBoth.classList.add("active");
    btnDrag.classList.remove("active");
    if (btnSpin) btnSpin.classList.remove("active");
    bothContainer.classList.remove("hidden");
    singleContainer.classList.add("hidden");
    const previewPanel = document.querySelector(".preview-panel");
    if (previewPanel) previewPanel.style.overflowY = "auto";
    if (noteText) noteText.textContent = "Interactive 3D preview • Move mouse over card to tilt";
    updateCardScale();
  });
}

function apply3DTransform(rotateY, rotateX = 0) {
  const inner = document.getElementById("flipCardInner");
  const sideBadge = document.getElementById("cardSideBadge");
  if (!inner) return;

  inner.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;

  if (sideBadge) {
    const normalizedDeg = Math.abs(Math.round(rotateY / 180));
    sideBadge.textContent = (normalizedDeg % 2 === 1) ? "BACK" : "FRONT";
  }
}

function updateCardScale() {
  const flipStage = document.querySelector(".flip-card-3d-stage");
  if (flipStage) {
    const parentWidth = flipStage.parentElement.clientWidth;
    const targetWidth = 1008;
    const defaultScale = 0.5;
    const defaultWidth = targetWidth * defaultScale;

    if (parentWidth < defaultWidth) {
      const scale = parentWidth / targetWidth;
      flipStage.style.height = `${650 * scale}px`;
      flipStage.querySelectorAll(".scaled-card-wrapper").forEach(w => w.style.height = `${650 * scale}px`);
      flipStage.querySelectorAll(".scaled-card").forEach(c => c.style.transform = `scale(${scale})`);
    } else {
      flipStage.style.height = `325px`;
      flipStage.querySelectorAll(".scaled-card-wrapper").forEach(w => w.style.height = `325px`);
      flipStage.querySelectorAll(".scaled-card").forEach(c => c.style.transform = `scale(${defaultScale})`);
    }
  }

  const cardShells = document.querySelectorAll("#bothCardsContainer .card-shell");
  cardShells.forEach((shell) => {
    const wrapper = shell.querySelector(".scaled-card-wrapper");
    const scaledCard = shell.querySelector(".scaled-card");
    if (!wrapper || !scaledCard) return;

    const containerWidth = shell.clientWidth;
    const originalCardWidth = 1008;
    const defaultScale = 0.5;
    const defaultWidth = originalCardWidth * defaultScale;

    if (containerWidth < defaultWidth) {
      const responsiveScale = containerWidth / originalCardWidth;
      scaledCard.style.transform = `scale(${responsiveScale})`;
      wrapper.style.height = `${650 * responsiveScale}px`;
    } else {
      scaledCard.style.transform = `scale(${defaultScale})`;
      wrapper.style.height = `325px`;
    }
  });
}

function init3DDragRotator() {
  const stage = document.getElementById("drag3dStage");
  const inner = document.getElementById("flipCardInner");
  const hintPill = document.getElementById("flipHintPill");

  if (!stage || !inner) return;

  function startDrag(e) {
    isDragging = true;
    dragDistance = 0;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    initialRotateY = cardRotateY;
    initialRotateX = cardRotateX;
    inner.classList.add("no-transition");
    stage.classList.add("is-dragging");
  }

  function moveDrag(e) {
    if (!isDragging) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    dragDistance = Math.hypot(deltaX, deltaY);

    cardRotateY = initialRotateY + (deltaX * 0.75);
    cardRotateX = initialRotateX - (deltaY * 0.75);

    apply3DTransform(cardRotateY, cardRotateX);
  }

  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", stopDrag);

  stage.addEventListener("touchstart", startDrag, { passive: true });
  window.addEventListener("touchmove", moveDrag, { passive: true });
  window.addEventListener("touchend", stopDrag);

  stage.addEventListener("click", () => {
    if (dragDistance < 6) {
      cardRotateY += 180;
      cardRotateX = 0;
      inner.classList.remove("no-transition");
      apply3DTransform(cardRotateY, cardRotateX);
    }
  });

  if (hintPill) {
    hintPill.addEventListener("click", () => {
      cardRotateY += 180;
      cardRotateX = 0;
      inner.classList.remove("no-transition");
      apply3DTransform(cardRotateY, cardRotateX);
    });
  }

  apply3DTransform(0, 0);
}

window.addEventListener("resize", updateCardScale);

function getLandRows() {
  const landsMap = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    const m = /^lands\[(\d+)\]\[(district|taluka|village|gatNo|khateNo|area)\]$/.exec(k);
    if (!m) continue;
    const idx = Number(m[1]);
    const field = m[2];
    landsMap[idx] = landsMap[idx] || { district: "", taluka: "", village: "", gatNo: "", khateNo: "", area: "" };
    landsMap[idx][field] = v;
  }
  const indices = Object.keys(landsMap).map(Number).sort((a,b)=>a-b);
  return indices.map((i)=>landsMap[i]);
}

function formData() {
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.photo;

  const lands = getLandRows();

  const dobDate = form.elements.dobDate ? form.elements.dobDate.value : "";
  data.dob = formatDobDDMMYYYY(dobDate) || data.dob || "";

  if (data.aadhaar != null) {
    data.aadhaar = formatAadhaar(data.aadhaar);
  }

  if (data.cardNumber != null) {
    data.cardNumber = formatCardNumber(data.cardNumber);
  }

  delete data.district;
  delete data.taluka;
  delete data.village;
  delete data.gatNo;
  delete data.khateNo;
  delete data.area;

  data.lands = lands;
  return data;
}

function qrPayload(data) {
  let landsStr = "";
  if (Array.isArray(data.lands) && data.lands.length > 0) {
    landsStr = data.lands.map(l => `${l.district || ""}|${l.taluka || ""}|${l.village || ""}|${l.gatNo || ""}|${l.khateNo || ""}|${l.area || ""}`).join(";");
  }
  const lines = [
    `Name: ${data.englishName || ""}`,
    `DOB: ${data.dob || ""}`,
    `Gender: ${data.gender || "Male"}`,
    `Mobile: ${data.mobile || ""}`,
    `Aadhaar: ${data.aadhaar || ""}`,
    `Card: ${data.cardNumber || ""}`,
    `Address: ${data.address || ""}`
  ];
  if (landsStr) {
    lines.push(`Lands: ${landsStr}`);
  }
  return lines.join("\n");
}

function formatDobDDMMYYYY(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }

  const digits = (value || "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}-${mm}`;
  return `${dd}-${mm}-${yyyy}`;
}

function formatAadhaar(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  const p1 = digits.slice(0, 4);
  const p2 = digits.slice(4, 8);
  const p3 = digits.slice(8, 12);
  return `${p1} ${p2} ${p3}`;
}

function formatCardNumber(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const p1 = digits.slice(0, 4);
  const p2 = digits.slice(4, 8);
  const p3 = digits.slice(8, 11);
  return `${p1} ${p2} ${p3}`;
}

function isValidCardNumber(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 11;
}

function isValidAadhaar(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 12;
}

function makeCard(template, data) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelectorAll("[data-field]").forEach((element) => { element.textContent = data[element.dataset.field] || ""; });
  const photoBox = node.querySelector("[data-photo-box]");
  if (photoBox && photoDataUrl) photoBox.innerHTML = `<img alt="Farmer photo" src="${photoDataUrl}">`;
  const qr = node.querySelector("[data-qr]");
  if (qr) {
    qr.innerHTML = "";
    if (window.QRCode) {
      new QRCode(qr, { text: qrPayload(data), width: 158, height: 158, correctLevel: QRCode.CorrectLevel.M });
    } else {
      qr.innerHTML = '<div style="font-size:11px;line-height:1.2;text-align:center;color:#111">QR library<br>not loaded</div>';
    }
  }

  const landRowsContainer = node.querySelector("[data-land-rows]");
  if (landRowsContainer) {
    const lands = Array.isArray(data.lands) ? data.lands : [];
    const rowCount = Math.max(1, lands.length);
    const font = rowCount <= 1 ? 21 : rowCount === 2 ? 20 : rowCount === 3 ? 19 : rowCount === 4 ? 18 : 16;
    const cellStyle = `font-size:${font}px; margin-top:0;`;

    landRowsContainer.innerHTML = "";
    lands.forEach((r) => {
      const row = document.createElement("div");
      row.className = "land-row";

      const cells = [
        r.district ?? "",
        r.taluka ?? "",
        r.village ?? "",
        r.gatNo ?? "",
        r.khateNo ?? "",
        r.area ?? ""
      ];

      cells.forEach((val) => {
        const cell = document.createElement("div");
        cell.className = "land-cell";
        cell.style.cssText = cellStyle;
        cell.textContent = (val ?? "").toString();
        row.appendChild(cell);
      });

      landRowsContainer.appendChild(row);
    });
  }

  return node;
}

function render() {
  const dobDate = form.elements.dobDate ? form.elements.dobDate.value : "";
  const hiddenDob = form.elements.dob;
  if (hiddenDob) hiddenDob.value = formatDobDDMMYYYY(dobDate);

  const aadhaarInput = form.elements.aadhaar;
  if (aadhaarInput) aadhaarInput.value = formatAadhaar(aadhaarInput.value);

  const cardInput = form.elements.cardNumber;
  if (cardInput) cardInput.value = formatCardNumber(cardInput.value);

  const currentData = formData();

  if (frontPreview) {
    frontPreview.innerHTML = "";
    frontPreview.appendChild(makeCard(frontTemplate, currentData));
  }
  if (backPreview) {
    backPreview.innerHTML = "";
    backPreview.appendChild(makeCard(backTemplate, currentData));
  }

  if (frontPreview3D) {
    frontPreview3D.innerHTML = "";
    frontPreview3D.appendChild(makeCard(frontTemplate, currentData));
  }
  if (backPreview3D) {
    backPreview3D.innerHTML = "";
    backPreview3D.appendChild(makeCard(backTemplate, currentData));
  }

  updateCardScale();
}

function loadPhoto(file) {
  const photoNameSpan = document.getElementById("photoFileName");
  if (!file) {
    photoDataUrl = "";
    if (photoNameSpan) photoNameSpan.textContent = "Choose Photo...";
    render();
    return;
  }
  if (photoNameSpan) photoNameSpan.textContent = file.name;

  const reader = new FileReader();
  reader.onload = () => { photoDataUrl = reader.result; render(); };
  reader.readAsDataURL(file);
}

async function cardCanvas(card) {
  return html2canvas(card, { 
    scale: 2, 
    backgroundColor: "#eef6ef", 
    useCORS: true, 
    logging: false 
  });
}

// Optimized PDF Generator with High-Quality JPEG Compression (~500KB)
async function downloadPdf() {
    if (!window.html2canvas || !window.jspdf) {
        alert("PDF libraries are not loaded.");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Creating PDF...";

    const data = formData();

    printStack.innerHTML = "";

    const front = makeCard(frontTemplate, data);
    const back = makeCard(backTemplate, data);

    printStack.append(front, back);

    await new Promise(resolve => setTimeout(resolve, 300));

    const frontCanvas = await cardCanvas(front);
    const backCanvas = await cardCanvas(back);

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [152.4, 101.6]
    });

    pdf.setProperties({
        title: data.englishName || "Farmer Card",
        subject: JSON.stringify({ ...data, photoDataUrl: photoDataUrl || "" }),
        author: "Farmer Card Portal"
    });

    const cardWidth = 85.60;
    const cardHeight = 53.98;

    const x = (101.6 - cardWidth) / 2;

    const topMargin = 8;
    const gap = 8;

    pdf.addImage(
        frontCanvas.toDataURL("image/jpeg", 0.90),
        "JPEG",
        x,
        topMargin,
        cardWidth,
        cardHeight,
        undefined,
        "FAST"
    );

    pdf.addImage(
        backCanvas.toDataURL("image/jpeg", 0.90),
        "JPEG",
        x,
        topMargin + cardHeight + gap,
        cardWidth,
        cardHeight,
        undefined,
        "FAST"
    );

    const rawName = (data.englishName || "Farmer")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

    const timestamp = getFormattedTimestamp();
    const filename = `${rawName || "farmer"}_${timestamp}.pdf`;

    pdf.save(filename);

    const pdfBlob = pdf.output("blob");
    if (window.supabaseManager) {
      window.supabaseManager.uploadPdfToSupabase(pdfBlob, filename, data, photoDataUrl).then((res) => {
        if (res && res.dbData && res.dbData[0]) {
          try {
            const fullMeta = { ...data, photoDataUrl: photoDataUrl || "" };
            localStorage.setItem(`farmer_card_meta_${res.dbData[0].id}`, JSON.stringify(fullMeta));
            localStorage.setItem(`farmer_card_meta_${filename}`, JSON.stringify(fullMeta));
          } catch (e) {}
        }
      });
    }

    if (window.driveManager) {
      window.driveManager.onPdfDownloaded(pdfBlob, filename);
    }

    printStack.innerHTML = "";

    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download PDF";
}

form.addEventListener("input", (event) => {
  if (event.target.name === "aadhaar") event.target.value = formatAadhaar(event.target.value);
  if (event.target.name === "cardNumber") event.target.value = formatCardNumber(event.target.value);
  if (event.target.name === "dobDate") render();
  if (event.target.name !== "photo" && event.target.name !== "dobDate") render();
});

function createLandRowHtml(index, values) {
  const v = values || {};
  return `
    <div class="land-row-card">
      <div class="grid">
        <label><span class="label-text">District / जिल्हा</span><input name="lands[${index}][district]" value="${(v.district ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Taluka / तालुका</span><input name="lands[${index}][taluka]" value="${(v.taluka ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Village / गाव</span><input name="lands[${index}][village]" value="${(v.village ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Gat No. / गट नं.</span><input name="lands[${index}][gatNo]" value="${(v.gatNo ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Khate No. / खाते नं.</span><input name="lands[${index}][khateNo]" value="${(v.khateNo ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Area H.R. / क्षेत्र हे.आर</span><input name="lands[${index}][area]" value="${(v.area ?? '').toString().replace(/"/g,'"')}"></label>
      </div>
    </div>
  `;
}

const landRowsEl = document.getElementById("landRows");
const addLandRowBtn = document.getElementById("addLandRowBtn");

function initLandRows() {
  landRowsEl.innerHTML = "";
  landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(0, {
    district: "अहिल्यानगर",
    taluka: "अकोले",
    village: "ब्राम्हणवाडा",
    gatNo: "",
    khateNo: "",
    area: ""
  }));
  addLandRowBtn.disabled = false;
}

addLandRowBtn.addEventListener("click", () => {
  const currentCount = landRowsEl.querySelectorAll(".land-row-card").length;
  const nextIndex = Math.max(0, Math.round(currentCount));
  landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(nextIndex, {
    district: "",
    taluka: "",
    village: "",
    gatNo: "",
    khateNo: "",
    area: ""
  }));
  render();
});

form.photo.addEventListener("change", (event) => { loadPhoto(event.target.files[0]); });
if (form.elements.dobDate) {
  form.elements.dobDate.addEventListener("change", () => { render(); });
}

resetBtn.addEventListener("click", () => {
  form.reset();
  photoDataUrl = "";
  initLandRows();
  render();
});

form.addEventListener("submit", (e) => e.preventDefault());

// ==========================================================================
// EDIT MODE & PDF REPLACEMENT LOGIC
// ==========================================================================

function showReplacePdfModal() {
  const modal = document.getElementById("replacePdfModal");
  if (modal) {
    modal.classList.remove("hidden");
  } else {
    if (confirm("This pdf will be replaced with old that will be not undo. Do you want to proceed?")) {
      proceedWithReplacePdf();
    }
  }
}

function hideReplacePdfModal() {
  const modal = document.getElementById("replacePdfModal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================================================
// PDF PHOTO EXTRACTION, QR SCANNING & CARD EDITING LOGIC
// ==========================================================================

function applyDob(dobStr) {
  if (!dobStr) return;
  const s = dobStr.toString().trim();
  let dd = "", mm = "", yyyy = "";

  const parts = s.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      yyyy = parts[0];
      mm = parts[1].padStart(2, "0");
      dd = parts[2].padStart(2, "0");
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      dd = parts[0].padStart(2, "0");
      mm = parts[1].padStart(2, "0");
      yyyy = parts[2];
    }
  } else {
    const digits = s.replace(/\D/g, "");
    if (digits.length === 8) {
      dd = digits.slice(0, 2);
      mm = digits.slice(2, 4);
      yyyy = digits.slice(4, 8);
    }
  }

  if (yyyy && mm && dd) {
    if (form.elements.dobDate) {
      form.elements.dobDate.value = `${yyyy}-${mm}-${dd}`;
    }
    if (form.elements.dob) {
      form.elements.dob.value = `${dd}-${mm}-${yyyy}`;
    }
  }
}

function extractLocationFromAddress(address) {
  if (!address || typeof address !== "string") return null;
  let district = "";
  let taluka = "";
  let village = "";

  const distMatch = address.match(/(?:dist\.?|district|जिल्हा)\s*[:\-]?\s*([a-zA-Z\u0900-\u097F]+)/i);
  if (distMatch) district = distMatch[1].trim();

  const talMatch = address.match(/(?:tal\.?|taluka|तालुका)\s*[:\-]?\s*([a-zA-Z\u0900-\u097F]+)/i);
  if (talMatch) taluka = talMatch[1].trim();

  const villMatch = address.match(/(?:at post|a\/p|village|गाव|मु\.?\s*पो\.?)\s*[:\-]?\s*([a-zA-Z\u0900-\u097F]+)/i);
  if (villMatch) village = villMatch[1].trim();
  else {
    const beforeTal = address.split(/(?:tal\.?|taluka|तालुका)/i)[0].trim();
    if (beforeTal) {
      const parts = beforeTal.split(/[\s,]+/);
      village = parts[parts.length - 1];
    }
  }

  const marathiMap = {
    "ahilyanagar": "अहिल्यानगर",
    "ahmednagar": "अहिल्यानगर",
    "akole": "अकोले",
    "sangamner": "संगमनेर",
    "kopargaon": "कोपरगाव",
    "shirdi": "शिर्डी",
    "pune": "पुणे",
    "nashik": "नाशिक",
    "bramhanwada": "ब्राम्हणवाडा",
    "brahmanwada": "ब्राम्हणवाडा"
  };

  const finalDist = marathiMap[district.toLowerCase()] || district || "अहिल्यानगर";
  const finalTal = marathiMap[taluka.toLowerCase()] || taluka || "अकोले";
  const finalVill = marathiMap[village.toLowerCase()] || village || "ब्राम्हणवाडा";

  return { district: finalDist, taluka: finalTal, village: finalVill };
}

function decodeQrFromCanvas(canvas) {
  const jsQR = window.jsQR;
  if (!jsQR) {
    console.warn("jsQR library not available");
    return null;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // On PDF Page 1 (101.6mm x 152.4mm portrait):
  // Front card is at: x = 8.0 mm, y = 8.0 mm, w = 85.60 mm, h = 53.98 mm
  // Inside the 1008x650 front card:
  // QR box is at left: 795px, top: 274px, width: 190px, height: 188px
  const cardX = (8.0 / 101.6) * canvas.width;
  const cardY = (8.0 / 152.4) * canvas.height;
  const cardW = (85.60 / 101.6) * canvas.width;
  const cardH = (53.98 / 152.4) * canvas.height;

  const qrLeft = cardX + (795 / 1008) * cardW;
  const qrTop = cardY + (274 / 650) * cardH;
  const qrWidth = (190 / 1008) * cardW;
  const qrHeight = (188 / 650) * cardH;

  // Add 15% quiet zone padding around the QR code
  const pad = Math.round(qrWidth * 0.15);
  const sx = Math.max(0, Math.round(qrLeft - pad));
  const sy = Math.max(0, Math.round(qrTop - pad));
  const sw = Math.min(canvas.width - sx, Math.round(qrWidth + pad * 2));
  const sh = Math.min(canvas.height - sy, Math.round(qrHeight + pad * 2));

  // Try 1: Scan focused QR region
  try {
    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "attemptBoth" });
    if (code && code.data) return code.data;
  } catch (e) {}

  // Try 2: Scan full right half of front card
  try {
    const halfX = Math.round(cardX + cardW * 0.5);
    const halfW = Math.round(cardW * 0.5);
    const imgData2 = ctx.getImageData(halfX, Math.round(cardY), halfW, Math.round(cardH));
    const code2 = jsQR(imgData2.data, imgData2.width, imgData2.height, { inversionAttempts: "attemptBoth" });
    if (code2 && code2.data) return code2.data;
  } catch (e) {}

  // Try 3: Scan entire front card
  try {
    const frontImgData = ctx.getImageData(Math.round(cardX), Math.round(cardY), Math.round(cardW), Math.round(cardH));
    const code3 = jsQR(frontImgData.data, frontImgData.width, frontImgData.height, { inversionAttempts: "attemptBoth" });
    if (code3 && code3.data) return code3.data;
  } catch (e) {}

  // Try 4: Scan entire canvas
  try {
    const fullImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code4 = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, { inversionAttempts: "attemptBoth" });
    if (code4 && code4.data) return code4.data;
  } catch (e) {}

  return null;
}

function parseQrPayload(text) {
  if (!text || typeof text !== "string") return {};
  const res = {};

  const dobMatch = text.match(/DOB:\s*([^\n\r]+)/i);
  if (dobMatch) res.dob = dobMatch[1].trim();

  const genderMatch = text.match(/Gender:\s*([^\n\r]+)/i);
  if (genderMatch) res.gender = genderMatch[1].trim();

  const addressMatch = text.match(/Address:\s*([\s\S]+?)(?=(?:\n(?:Lands|Card|DOB|Gender|Mobile|Aadhaar):)|$)/i);
  if (addressMatch) res.address = addressMatch[1].trim();

  const landsMatch = text.match(/Lands:\s*([^\n\r]+)/i);
  if (landsMatch) {
    try {
      const rawLands = landsMatch[1].trim();
      if (rawLands.startsWith("[") || rawLands.startsWith("{")) {
        res.lands = JSON.parse(rawLands);
      } else {
        const rows = rawLands.split(";").filter(Boolean);
        res.lands = rows.map((r) => {
          const c = r.split("|");
          return {
            district: c[0] || "",
            taluka: c[1] || "",
            village: c[2] || "",
            gatNo: c[3] || "",
            khateNo: c[4] || "",
            area: c[5] || ""
          };
        });
      }
    } catch (e) {}
  }

  const mobileMatch = text.match(/Mobile:\s*([^\n\r]+)/i);
  if (mobileMatch) res.mobile = mobileMatch[1].trim();

  const aadhaarMatch = text.match(/Aadhaar:\s*([^\n\r]+)/i);
  if (aadhaarMatch) res.aadhaar = aadhaarMatch[1].trim();

  const cardMatch = text.match(/Card:\s*([^\n\r]+)/i);
  if (cardMatch) res.cardNumber = cardMatch[1].trim();

  const nameMatch = text.match(/Name:\s*([^\n\r]+)/i);
  if (nameMatch) res.englishName = nameMatch[1].trim();

  return res;
}

async function extractFullCardDataFromPdf(pdfUrlOrData) {
  try {
    const pdfLib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
    if (!pdfLib) {
      console.warn("PDF.js library is not available.");
      return null;
    }

    if (pdfLib.GlobalWorkerOptions && !pdfLib.GlobalWorkerOptions.workerSrc) {
      pdfLib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf.worker.min.js";
    }

    let loadingTask;
    if (typeof pdfUrlOrData === "string") {
      const res = await fetch(pdfUrlOrData);
      if (!res.ok) throw new Error("Failed to fetch PDF: " + res.status);
      const arrayBuffer = await res.arrayBuffer();
      loadingTask = pdfLib.getDocument({ data: arrayBuffer });
    } else if (pdfUrlOrData instanceof ArrayBuffer || pdfUrlOrData instanceof Uint8Array) {
      loadingTask = pdfLib.getDocument({ data: pdfUrlOrData });
    } else {
      loadingTask = pdfLib.getDocument(pdfUrlOrData);
    }

    const pdfDoc = await loadingTask.promise;
    if (pdfDoc.numPages < 1) return null;

    // Check embedded document metadata first
    let embeddedMeta = null;
    try {
      const docMeta = await pdfDoc.getMetadata();
      if (docMeta && docMeta.info && docMeta.info.Subject) {
        const parsed = JSON.parse(docMeta.info.Subject);
        if (parsed && typeof parsed === "object") {
          embeddedMeta = parsed;
        }
      }
    } catch (e) {}

    const page = await pdfDoc.getPage(1);
    const scale = 2.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 1. Crop and extract Photo from the front card photo box
    const cardX_mm = 8.0;
    const cardY_mm = 8.0;
    const cardW_mm = 85.60;
    const cardH_mm = 53.98;

    const photoRelX = 29 / 1008;
    const photoRelY = 141 / 650;
    const photoRelW = 195 / 1008;
    const photoRelH = 192 / 650;

    const photoX_mm = cardX_mm + photoRelX * cardW_mm;
    const photoY_mm = cardY_mm + photoRelY * cardH_mm;
    const photoW_mm = photoRelW * cardW_mm;
    const photoH_mm = photoRelH * cardH_mm;

    const cropX = Math.round((photoX_mm / 101.6) * canvas.width);
    const cropY = Math.round((photoY_mm / 152.4) * canvas.height);
    const cropW = Math.round((photoW_mm / 101.6) * canvas.width);
    const cropH = Math.round((photoH_mm / 152.4) * canvas.height);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = 300;
    outCanvas.height = 300;
    const outCtx = outCanvas.getContext("2d");
    outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, 300, 300);

    const extractedPhoto = outCanvas.toDataURL("image/jpeg", 0.92);

    // 2. Decode the QR code from the front card
    let qrData = {};
    const qrText = decodeQrFromCanvas(canvas);
    if (qrText) {
      qrData = parseQrPayload(qrText);
    }

    return {
      photoDataUrl: (embeddedMeta && embeddedMeta.photoDataUrl) || extractedPhoto || "",
      dob: (embeddedMeta && (embeddedMeta.dob || embeddedMeta.dobDate)) || qrData.dob || "",
      dobDate: (embeddedMeta && embeddedMeta.dobDate) || "",
      gender: (embeddedMeta && embeddedMeta.gender) || qrData.gender || "Male",
      address: (embeddedMeta && embeddedMeta.address) || qrData.address || "",
      lands: (embeddedMeta && embeddedMeta.lands) || qrData.lands || null,
      englishName: (embeddedMeta && embeddedMeta.englishName) || qrData.englishName || "",
      marathiName: (embeddedMeta && embeddedMeta.marathiName) || "",
      mobile: (embeddedMeta && embeddedMeta.mobile) || qrData.mobile || "",
      aadhaar: (embeddedMeta && embeddedMeta.aadhaar) || qrData.aadhaar || "",
      cardNumber: (embeddedMeta && embeddedMeta.cardNumber) || qrData.cardNumber || ""
    };
  } catch (err) {
    console.error("Error extracting card details from PDF:", err);
    return null;
  }
}

function applyCardMeta(meta) {
  if (!meta) return;

  if (meta.englishName && form.elements.englishName && !form.elements.englishName.value) {
    form.elements.englishName.value = meta.englishName;
  }
  if (meta.marathiName && form.elements.marathiName && !form.elements.marathiName.value) {
    form.elements.marathiName.value = meta.marathiName;
  }
  if (meta.aadhaar && form.elements.aadhaar && !form.elements.aadhaar.value) {
    form.elements.aadhaar.value = formatAadhaar(meta.aadhaar);
  }
  if (meta.cardNumber && form.elements.cardNumber && !form.elements.cardNumber.value) {
    form.elements.cardNumber.value = formatCardNumber(meta.cardNumber);
  }
  if (meta.mobile && form.elements.mobile && !form.elements.mobile.value) {
    form.elements.mobile.value = meta.mobile;
  }

  if (meta.gender && form.elements.gender) {
    form.elements.gender.value = meta.gender;
  }

  if (meta.dob) {
    applyDob(meta.dob);
  } else if (meta.dobDate) {
    applyDob(meta.dobDate);
  }

  if (meta.address && form.elements.address) {
    form.elements.address.value = meta.address;
  }

  if (meta.photoDataUrl) {
    photoDataUrl = meta.photoDataUrl;
    const photoNameSpan = document.getElementById("photoFileName");
    if (photoNameSpan) photoNameSpan.textContent = "Saved Photo Loaded (Click to replace)";
  }

  if (Array.isArray(meta.lands) && meta.lands.length > 0) {
    landRowsEl.innerHTML = "";
    meta.lands.forEach((l, idx) => {
      landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(idx, l));
    });
  } else if (meta.address) {
    const loc = extractLocationFromAddress(meta.address);
    if (loc && landRowsEl) {
      landRowsEl.innerHTML = "";
      landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(0, {
        district: loc.district || "अहिल्यानगर",
        taluka: loc.taluka || "अकोले",
        village: loc.village || "ब्राम्हणवाडा",
        gatNo: "",
        khateNo: "",
        area: ""
      }));
    }
  }
}

window.startEditPdfRecord = async function(record) {
  currentEditingRecord = record;

  const banner = document.getElementById("editModeBanner");
  const bannerTitle = document.getElementById("editBannerTitle");
  if (banner) banner.classList.remove("hidden");
  if (bannerTitle) {
    bannerTitle.textContent = `Modifying: ${record.english_name || "Farmer"} (Card: ${record.card_number || "N/A"})`;
  }

  if (downloadBtn) {
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Update & Replace PDF
    `;
    downloadBtn.classList.add("btn-edit-mode");
  }

  // 1. Populate basic DB fields
  if (form.elements.marathiName) form.elements.marathiName.value = record.marathi_name || "";
  if (form.elements.englishName) form.elements.englishName.value = record.english_name || "";
  if (form.elements.aadhaar) form.elements.aadhaar.value = formatAadhaar(record.aadhaar || "");
  if (form.elements.cardNumber) form.elements.cardNumber.value = formatCardNumber(record.card_number || "");
  if (form.elements.mobile) form.elements.mobile.value = record.mobile || "";

  // Reset photo and loading status
  photoDataUrl = "";
  const photoNameSpan = document.getElementById("photoFileName");
  if (photoNameSpan) photoNameSpan.textContent = "Loading saved card data & photo...";

  // 2. Check local storage metadata first
  let meta = null;
  try {
    const raw = (record.id && localStorage.getItem(`farmer_card_meta_${record.id}`)) ||
                (record.storage_path && localStorage.getItem(`farmer_card_meta_${record.storage_path}`)) ||
                (record.filename && localStorage.getItem(`farmer_card_meta_${record.filename}`));
    if (raw) meta = JSON.parse(raw);
  } catch (e) {}

  if (meta) {
    applyCardMeta(meta);
  }

  render();

  const formPanel = document.querySelector(".form-panel");
  if (formPanel) formPanel.scrollTop = 0;

  const storagePath = record.storage_path || record.filename;

  // 3. Try cloud companion metadata if needed
  if ((!photoDataUrl || !form.elements.dobDate.value) && window.supabaseManager && window.supabaseManager.getCardMetadata) {
    try {
      const cloudMeta = await window.supabaseManager.getCardMetadata(storagePath);
      if (cloudMeta) {
        applyCardMeta(cloudMeta);
        render();
      }
    } catch (e) {}
  }

  // 4. Try cloud companion photo if still missing photo
  if (!photoDataUrl && window.supabaseManager && window.supabaseManager.getCardPhotoBlob) {
    try {
      const photoBlob = await window.supabaseManager.getCardPhotoBlob(storagePath);
      if (photoBlob) {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            photoDataUrl = reader.result;
            if (photoNameSpan) photoNameSpan.textContent = "Saved Photo Loaded (Click to replace)";
            render();
            resolve();
          };
          reader.onerror = resolve;
          reader.readAsDataURL(photoBlob);
        });
      }
    } catch (e) {}
  }

  // 5. If DOB, Photo, or Back Info (Address/Lands) is missing, extract directly from the PDF!
  const needsPdfExtraction = !photoDataUrl || !form.elements.dobDate.value || !form.elements.address.value || form.elements.address.value === "Bramhanwada tal akole dist ahilyanagar";

  if (needsPdfExtraction) {
    try {
      let pdfUrl = record.public_url || "";
      if (window.supabaseManager && window.supabaseManager.getPdfUrl) {
        pdfUrl = await window.supabaseManager.getPdfUrl(storagePath, record.public_url);
      }

      if (pdfUrl) {
        const extracted = await extractFullCardDataFromPdf(pdfUrl);
        if (extracted) {
          if (extracted.photoDataUrl && !photoDataUrl) {
            photoDataUrl = extracted.photoDataUrl;
            if (photoNameSpan) photoNameSpan.textContent = "Saved Photo Loaded (Click to replace)";
          }
          if (extracted.dob && !form.elements.dobDate.value) {
            applyDob(extracted.dob);
          }
          if (extracted.gender) {
            form.elements.gender.value = extracted.gender;
          }
          if (extracted.address && (!form.elements.address.value || form.elements.address.value === "Bramhanwada tal akole dist ahilyanagar")) {
            form.elements.address.value = extracted.address;
          }
          if (Array.isArray(extracted.lands) && extracted.lands.length > 0) {
            landRowsEl.innerHTML = "";
            extracted.lands.forEach((l, idx) => {
              landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(idx, l));
            });
          } else if (extracted.address) {
            const loc = extractLocationFromAddress(extracted.address);
            if (loc && landRowsEl) {
              landRowsEl.innerHTML = "";
              landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(0, {
                district: loc.district || "अहिल्यानगर",
                taluka: loc.taluka || "अकोले",
                village: loc.village || "ब्राम्हणवाडा",
                gatNo: "",
                khateNo: "",
                area: ""
              }));
            }
          }

          // Cache merged metadata to localStorage
          try {
            const fullCurrentMeta = { ...formData(), photoDataUrl };
            if (record.id) localStorage.setItem(`farmer_card_meta_${record.id}`, JSON.stringify(fullCurrentMeta));
            if (storagePath) localStorage.setItem(`farmer_card_meta_${storagePath}`, JSON.stringify(fullCurrentMeta));
          } catch (e) {}

          render();
        }
      }
    } catch (err) {
      console.warn("Could not extract full card details from PDF:", err);
    }
  }

  if (!photoDataUrl && photoNameSpan) {
    photoNameSpan.textContent = "No saved photo (Upload)";
  }
};

window.cancelEditPdfRecord = function() {
  currentEditingRecord = null;
  const banner = document.getElementById("editModeBanner");
  if (banner) banner.classList.add("hidden");

  if (downloadBtn) {
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Download PDF
    `;
    downloadBtn.classList.remove("btn-edit-mode");
  }
};

async function proceedWithReplacePdf() {
  if (!currentEditingRecord) return;

  if (!window.html2canvas || !window.jspdf) {
    alert("PDF libraries are not loaded.");
    return;
  }

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Replacing PDF...";

  const data = formData();

  printStack.innerHTML = "";
  const front = makeCard(frontTemplate, data);
  const back = makeCard(backTemplate, data);
  printStack.append(front, back);

  await new Promise(resolve => setTimeout(resolve, 300));

  const frontCanvas = await cardCanvas(front);
  const backCanvas = await cardCanvas(back);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [152.4, 101.6]
  });

  pdf.setProperties({
    title: data.englishName || "Farmer Card",
    subject: JSON.stringify({ ...data, photoDataUrl: photoDataUrl || "" }),
    author: "Farmer Card Portal"
  });

  const cardWidth = 85.60;
  const cardHeight = 53.98;
  const x = (101.6 - cardWidth) / 2;
  const topMargin = 8;
  const gap = 8;

  pdf.addImage(
    frontCanvas.toDataURL("image/jpeg", 0.90),
    "JPEG",
    x,
    topMargin,
    cardWidth,
    cardHeight,
    undefined,
    "FAST"
  );

  pdf.addImage(
    backCanvas.toDataURL("image/jpeg", 0.90),
    "JPEG",
    x,
    topMargin + cardHeight + gap,
    cardWidth,
    cardHeight,
    undefined,
    "FAST"
  );

  const rawName = (data.englishName || "Farmer")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  const timestamp = getFormattedTimestamp();
  const newFilename = `${rawName || "farmer"}_${timestamp}.pdf`;

  pdf.save(newFilename);

  const pdfBlob = pdf.output("blob");

  if (window.supabaseManager) {
    const res = await window.supabaseManager.replacePdfInSupabase(pdfBlob, currentEditingRecord, data, newFilename, photoDataUrl);
    if (res && res.success) {
      alert("✅ PDF successfully updated & replaced! The old PDF in storage has been permanently overwritten.");

      // Cache full updated form state in localStorage
      try {
        const fullMeta = { ...data, photoDataUrl: photoDataUrl || "" };
        if (res.record && res.record.id) {
          localStorage.setItem(`farmer_card_meta_${res.record.id}`, JSON.stringify(fullMeta));
        }
        localStorage.setItem(`farmer_card_meta_${currentEditingRecord.id}`, JSON.stringify(fullMeta));
        localStorage.setItem(`farmer_card_meta_${newFilename}`, JSON.stringify(fullMeta));
      } catch (e) {}

      // Update admin console table immediately if loaded
      if (window.adminConsole) {
        const updatedRecord = res.record || {
          ...currentEditingRecord,
          english_name: data.englishName || currentEditingRecord.english_name,
          marathi_name: data.marathiName || currentEditingRecord.marathi_name,
          aadhaar: data.aadhaar || currentEditingRecord.aadhaar,
          card_number: data.cardNumber || currentEditingRecord.card_number,
          mobile: data.mobile || currentEditingRecord.mobile,
          public_url: res.publicUrl || currentEditingRecord.public_url,
          storage_path: res.storagePath || newFilename,
          filename: newFilename,
        };

        if (window.adminConsole.cachedPdfList) {
          const idx = window.adminConsole.cachedPdfList.findIndex(
            (x) => x.id === currentEditingRecord.id || x.storage_path === currentEditingRecord.storage_path
          );
          if (idx !== -1) {
            window.adminConsole.cachedPdfList[idx] = updatedRecord;
          }
          window.adminConsole.renderPdfsTable(window.adminConsole.cachedPdfList);
        }
      }
    } else {
      alert("PDF downloaded locally. Note: Cloud storage update had an issue.");
    }
  }

  printStack.innerHTML = "";
  downloadBtn.disabled = false;

  window.cancelEditPdfRecord();
}

downloadBtn.addEventListener("click", async () => {
  const aadhaarOk = isValidAadhaar(form.elements.aadhaar.value);
  if (!aadhaarOk) {
    alert("Aadhaar No must contain exactly 12 digits (format: 4 digits + space + 4 digits + space + 4 digits).");
    return;
  }

  const cardOk = isValidCardNumber(form.elements.cardNumber.value);
  if (!cardOk) {
    alert("Card Number must contain exactly 11 digits (format: 4 digits + space + 4 digits + space + 3 digits).");
    return;
  }

  if (currentEditingRecord) {
    showReplacePdfModal();
    return;
  }

  await downloadPdf();
});

// ==========================================================================
// MODIFIED: AUTH MODAL & ADMIN DASHBOARD UI EVENT LISTENERS
// ==========================================================================

function initAuthAndAdminUI() {
  let isSignUpMode = false;

  const tabSignIn = document.getElementById("tabSignIn");
  const tabSignUp = document.getElementById("tabSignUp");
  const authForm = document.getElementById("authForm");
  const authEmailInput = document.getElementById("authEmail");
  const authPasswordInput = document.getElementById("authPassword");
  const btnAuthSubmit = document.getElementById("btnAuthSubmit");
  const authErrorMsg = document.getElementById("authErrorMsg");
  const btnLogout = document.getElementById("btnLogout");

  if (tabSignIn && tabSignUp) {
    tabSignIn.addEventListener("click", () => {
      isSignUpMode = false;
      tabSignIn.classList.add("active");
      tabSignUp.classList.remove("active");
      btnAuthSubmit.textContent = "Sign In";
      if (authErrorMsg) authErrorMsg.classList.add("hidden");
    });

    tabSignUp.addEventListener("click", () => {
      isSignUpMode = true;
      tabSignUp.classList.add("active");
      tabSignIn.classList.remove("active");
      btnAuthSubmit.textContent = "Register Account";
      if (authErrorMsg) authErrorMsg.classList.add("hidden");
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value.trim();

      if (!email || !password) {
        showAuthError("Please enter both email and password.");
        return;
      }

      btnAuthSubmit.disabled = true;
      btnAuthSubmit.textContent = "Processing...";
      if (authErrorMsg) authErrorMsg.classList.add("hidden");

      let result;
      if (isSignUpMode) {
        result = await window.supabaseManager.signUp(email, password);
      } else {
        result = await window.supabaseManager.signIn(email, password);
      }

      btnAuthSubmit.disabled = false;
      btnAuthSubmit.textContent = isSignUpMode ? "Register Account" : "Sign In";

      if (result && result.error) {
        showAuthError(result.error.message);
      } else {
        if (isSignUpMode) {
          alert("Registration successful! ✉️ Please check your email inbox and click the confirmation link before signing in.");
          if (tabSignIn) tabSignIn.click();
        }
        authEmailInput.value = "";
        authPasswordInput.value = "";
      }
    });
  }

  function showAuthError(msg) {
    if (authErrorMsg) {
      authErrorMsg.textContent = msg;
      authErrorMsg.classList.remove("hidden");
    } else {
      alert(msg);
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      window.supabaseManager.signOut();
    });
  }

  const btnCancelEdit = document.getElementById("btnCancelEdit");
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener("click", () => {
      window.cancelEditPdfRecord();
    });
  }

  const btnCancelReplace = document.getElementById("btnCancelReplacePdf");
  const btnConfirmReplace = document.getElementById("btnConfirmReplacePdf");

  if (btnCancelReplace) {
    btnCancelReplace.addEventListener("click", () => {
      hideReplacePdfModal();
    });
  }

  if (btnConfirmReplace) {
    btnConfirmReplace.addEventListener("click", async () => {
      hideReplacePdfModal();
      await proceedWithReplacePdf();
    });
  }
}

// Initial setup
initLandRows();
render();
initViewModeControls();
init3DDragRotator();
setTimeout(updateCardScale, 100);
initAuthAndAdminUI();
