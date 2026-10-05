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
  return [`Name: ${data.englishName}`, `DOB: ${data.dob}`, `Gender: ${data.gender}`, `Mobile: ${data.mobile}`, `Aadhaar: ${data.aadhaar}`, `Card: ${data.cardNumber}`, `Address: ${data.address}`].join("\n");
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
      window.supabaseManager.uploadPdfToSupabase(pdfBlob, filename, data).then((res) => {
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

window.startEditPdfRecord = function(record) {
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

  // Look for stored metadata in localStorage
  let meta = null;
  try {
    const raw = (record.id && localStorage.getItem(`farmer_card_meta_${record.id}`)) ||
                (record.storage_path && localStorage.getItem(`farmer_card_meta_${record.storage_path}`)) ||
                (record.filename && localStorage.getItem(`farmer_card_meta_${record.filename}`));
    if (raw) meta = JSON.parse(raw);
  } catch (e) {}

  if (form.elements.marathiName) form.elements.marathiName.value = record.marathi_name || (meta && meta.marathiName) || "";
  if (form.elements.englishName) form.elements.englishName.value = record.english_name || (meta && meta.englishName) || "";
  if (form.elements.aadhaar) form.elements.aadhaar.value = formatAadhaar(record.aadhaar || (meta && meta.aadhaar) || "");
  if (form.elements.cardNumber) form.elements.cardNumber.value = formatCardNumber(record.card_number || (meta && meta.cardNumber) || "");
  if (form.elements.mobile) form.elements.mobile.value = record.mobile || (meta && meta.mobile) || "";

  if (meta) {
    if (meta.gender && form.elements.gender) form.elements.gender.value = meta.gender;
    if (meta.dob && form.elements.dob) form.elements.dob.value = meta.dob;
    if (meta.dob && form.elements.dobDate) {
      const parts = meta.dob.split("-");
      if (parts.length === 3) {
        form.elements.dobDate.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    if (meta.address && form.elements.address) form.elements.address.value = meta.address;
    if (meta.photoDataUrl) {
      photoDataUrl = meta.photoDataUrl;
      const photoNameSpan = document.getElementById("photoFileName");
      if (photoNameSpan) photoNameSpan.textContent = "Saved Photo Loaded";
    }
    if (Array.isArray(meta.lands) && meta.lands.length > 0) {
      landRowsEl.innerHTML = "";
      meta.lands.forEach((l, idx) => {
        landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(idx, l));
      });
    }
  }

  render();

  const formPanel = document.querySelector(".form-panel");
  if (formPanel) formPanel.scrollTop = 0;
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

  const filename = currentEditingRecord.filename || `${(data.englishName || "farmer").trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-")}_updated.pdf`;

  pdf.save(filename);

  const pdfBlob = pdf.output("blob");

  // Cache full updated form state in localStorage
  try {
    const fullMeta = { ...data, photoDataUrl: photoDataUrl || "" };
    if (currentEditingRecord.id) {
      localStorage.setItem(`farmer_card_meta_${currentEditingRecord.id}`, JSON.stringify(fullMeta));
    }
    if (currentEditingRecord.storage_path) {
      localStorage.setItem(`farmer_card_meta_${currentEditingRecord.storage_path}`, JSON.stringify(fullMeta));
    }
    localStorage.setItem(`farmer_card_meta_${filename}`, JSON.stringify(fullMeta));
  } catch (e) {}

  if (window.supabaseManager) {
    const res = await window.supabaseManager.replacePdfInSupabase(pdfBlob, currentEditingRecord, data);
    if (res && res.success) {
      alert("✅ PDF successfully updated & replaced! The old PDF has been permanently overwritten.");
      if (window.adminConsole && window.adminConsole.cachedPdfList) {
        const idx = window.adminConsole.cachedPdfList.findIndex(x => x.id === currentEditingRecord.id);
        if (idx !== -1) {
          window.adminConsole.cachedPdfList[idx] = {
            ...window.adminConsole.cachedPdfList[idx],
            english_name: data.englishName || window.adminConsole.cachedPdfList[idx].english_name,
            marathi_name: data.marathiName || window.adminConsole.cachedPdfList[idx].marathi_name,
            aadhaar: data.aadhaar || window.adminConsole.cachedPdfList[idx].aadhaar,
            card_number: data.cardNumber || window.adminConsole.cachedPdfList[idx].card_number,
            mobile: data.mobile || window.adminConsole.cachedPdfList[idx].mobile,
            public_url: res.publicUrl || window.adminConsole.cachedPdfList[idx].public_url,
          };
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
