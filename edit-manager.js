/* ==========================================================================
   FARMER CARD GENERATOR - DEDICATED EDIT STUDIO & PDF REPLACEMENT MANAGER
   (edit-manager.js)
   Standalone module for:
   - Dedicated Fullscreen Edit Studio with responsive mobile/tablet tab-free adjustment
   - Multi-tier Land Details, Photo, & DOB extraction with 100% fallback guarantees
   - Original comparison badges & real-time live preview auto-scaling
   - In-place cloud Supabase PDF replacement & Admin Console sync
   ========================================================================== */

class EditManager {
  constructor() {
    this.currentEditingRecord = null;
    this.originalData = null;
    this.currentEditData = null;
    this.activeStudioView = "both"; // 'both', 'front', 'back'
    this.activeMobileTab = "form";  // 'form' or 'preview'
    this.initEventListeners();
  }

  isEditing() {
    return !!this.currentEditingRecord;
  }

  getRecord() {
    return this.currentEditingRecord;
  }

  initEventListeners() {
    document.addEventListener("DOMContentLoaded", () => {
      this.bindButtons();
      this.bindStudioEvents();
    });
    if (document.readyState === "interactive" || document.readyState === "complete") {
      this.bindButtons();
      this.bindStudioEvents();
    }
    window.addEventListener("resize", () => {
      this.updateStudioCardScale();
    });
  }

  bindButtons() {
    const btnCancelEdit = document.getElementById("btnCancelEdit");
    if (btnCancelEdit && !btnCancelEdit._editBound) {
      btnCancelEdit.addEventListener("click", () => this.cancelEdit());
      btnCancelEdit._editBound = true;
    }

    const btnCancelReplace = document.getElementById("btnCancelReplacePdf");
    if (btnCancelReplace && !btnCancelReplace._editBound) {
      btnCancelReplace.addEventListener("click", () => this.hideReplaceModal());
      btnCancelReplace._editBound = true;
    }

    const btnConfirmReplace = document.getElementById("btnConfirmReplacePdf");
    if (btnConfirmReplace && !btnConfirmReplace._editBound) {
      btnConfirmReplace.addEventListener("click", async () => {
        this.hideReplaceModal();
        await this.proceedWithReplace();
      });
      btnConfirmReplace._editBound = true;
    }
  }

  bindStudioEvents() {
    // Studio Close / Cancel buttons
    const btnStudioClose = document.getElementById("btnStudioClose");
    if (btnStudioClose && !btnStudioClose._bound) {
      btnStudioClose.addEventListener("click", () => this.closeStudioModal());
      btnStudioClose._bound = true;
    }

    const btnStudioCancel = document.getElementById("btnStudioCancel");
    if (btnStudioCancel && !btnStudioCancel._bound) {
      btnStudioCancel.addEventListener("click", () => this.closeStudioModal());
      btnStudioCancel._bound = true;
    }

    // Revert All button
    const btnStudioRevertAll = document.getElementById("btnStudioRevertAll");
    if (btnStudioRevertAll && !btnStudioRevertAll._bound) {
      btnStudioRevertAll.addEventListener("click", () => this.revertStudioAll());
      btnStudioRevertAll._bound = true;
    }

    // Save & Replace PDF button
    const btnStudioSave = document.getElementById("btnStudioSave");
    if (btnStudioSave && !btnStudioSave._bound) {
      btnStudioSave.addEventListener("click", () => this.onStudioSaveClick());
      btnStudioSave._bound = true;
    }

    // Photo selection
    const studioPhotoInput = document.getElementById("studioPhotoInput");
    if (studioPhotoInput && !studioPhotoInput._bound) {
      studioPhotoInput.addEventListener("change", (e) => this.onStudioPhotoSelected(e));
      studioPhotoInput._bound = true;
    }

    // Photo revert
    const btnStudioRevertPhoto = document.getElementById("btnStudioRevertPhoto");
    if (btnStudioRevertPhoto && !btnStudioRevertPhoto._bound) {
      btnStudioRevertPhoto.addEventListener("click", () => this.revertStudioPhoto());
      btnStudioRevertPhoto._bound = true;
    }

    // Add Land Row button
    const btnAddStudioLand = document.getElementById("btnAddStudioLand");
    if (btnAddStudioLand && !btnAddStudioLand._bound) {
      btnAddStudioLand.addEventListener("click", () => this.addStudioLandRow());
      btnAddStudioLand._bound = true;
    }

    // View Tabs (Both, Front, Back)
    const viewTabs = document.querySelectorAll("[data-studio-view]");
    viewTabs.forEach((tab) => {
      if (!tab._bound) {
        tab.addEventListener("click", () => {
          viewTabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          this.setStudioView(tab.dataset.studioView);
        });
        tab._bound = true;
      }
    });

    // Mobile / Tablet Tab Switcher
    const btnNavForm = document.getElementById("btnNavForm");
    const btnNavPreview = document.getElementById("btnNavPreview");
    if (btnNavForm && !btnNavForm._bound) {
      btnNavForm.addEventListener("click", () => this.setMobileNav("form"));
      btnNavForm._bound = true;
    }
    if (btnNavPreview && !btnNavPreview._bound) {
      btnNavPreview.addEventListener("click", () => this.setMobileNav("preview"));
      btnNavPreview._bound = true;
    }

    // Real-time Input Listeners
    const studioForm = document.getElementById("studioEditForm");
    if (studioForm && !studioForm._bound) {
      studioForm.addEventListener("input", (e) => this.onStudioInputChange(e));
      studioForm.addEventListener("change", (e) => this.onStudioInputChange(e));
      studioForm._bound = true;
    }
  }

  setMobileNav(tabName) {
    this.activeMobileTab = tabName;
    const workspace = document.querySelector(".studio-workspace");
    if (workspace) {
      workspace.setAttribute("data-mobile-active", tabName);
    }
    const btnNavForm = document.getElementById("btnNavForm");
    const btnNavPreview = document.getElementById("btnNavPreview");
    if (btnNavForm && btnNavPreview) {
      if (tabName === "form") {
        btnNavForm.classList.add("active");
        btnNavPreview.classList.remove("active");
      } else {
        btnNavPreview.classList.add("active");
        btnNavForm.classList.remove("active");
        setTimeout(() => this.updateStudioCardScale(), 50);
      }
    }
  }

  showReplaceModal() {
    const modal = document.getElementById("replacePdfModal");
    if (modal) {
      modal.classList.remove("hidden");
    } else {
      if (confirm("This pdf will be replaced with old that will be not undo. Do you want to proceed?")) {
        this.proceedWithReplace();
      }
    }
  }

  hideReplaceModal() {
    const modal = document.getElementById("replacePdfModal");
    if (modal) modal.classList.add("hidden");
  }

  // ==========================================================================
  // DATE & LOCATION PARSERS
  // ==========================================================================

  formatDobYYYYMMDD(dobStr) {
    if (!dobStr) return "";
    const s = dobStr.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const parts = s.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    const digits = s.replace(/\D/g, "");
    if (digits.length === 8) {
      return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
    }
    return "";
  }

  formatDobDDMMYYYY(dobStr) {
    if (!dobStr) return "";
    const s = dobStr.toString().trim();
    const parts = s.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        return `${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[2]}`;
      }
    }
    const digits = s.replace(/\D/g, "");
    if (digits.length === 8) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
    }
    return s;
  }

  applyDob(dobStr) {
    if (!dobStr) return;
    const yyyy_mm_dd = this.formatDobYYYYMMDD(dobStr);
    const dd_mm_yyyy = this.formatDobDDMMYYYY(dobStr);

    const form = document.getElementById("cardForm") || document.getElementById("farmerForm");
    if (form && yyyy_mm_dd && dd_mm_yyyy) {
      if (form.elements.dobDate) form.elements.dobDate.value = yyyy_mm_dd;
      if (form.elements.dob) form.elements.dob.value = dd_mm_yyyy;
    }
  }

  extractLocationFromAddress(address) {
    if (!address || typeof address !== "string") return null;
    let district = "";
    let taluka = "";
    let village = "";
    let gatNo = "";
    let khateNo = "";
    let area = "";

    const distMatch = address.match(/(?:dist\.?|district|जिल्हा)\s*[:\-]?\s*([a-zA-Z\u0900-\u097F]+)/i);
    if (distMatch) district = distMatch[1].trim();

    const talMatch = address.match(/(?:tal\.?|taluka|तालुका)\s*[:\-]?\s*([a-zA-Z\u0900-\u097F]+)/i);
    if (talMatch) taluka = talMatch[1].trim();

    const atPostMatch = address.match(/(?:at\s*post|a\/p|at|post|मु\.?\s*पो\.?|गाव)\s*[:\-]?\s*([a-zA-Z\u0900-\u097F]+)/i);
    if (atPostMatch) {
      village = atPostMatch[1].trim();
    } else {
      const firstWord = address.trim().split(/[\s,]+/)[0];
      if (firstWord && !firstWord.toLowerCase().startsWith("tal") && !firstWord.toLowerCase().startsWith("dist")) {
        village = firstWord;
      }
    }

    const gatMatch = address.match(/(?:gat\s*(?:no\.?|नं\.?)?|गट\s*(?:नं\.?)?)\s*[:\-]?\s*([0-9\u0966-\u096F\/\-]+)/i);
    if (gatMatch) gatNo = gatMatch[1].trim();

    const khateMatch = address.match(/(?:khate\s*(?:no\.?|नं\.?)?|खाते\s*(?:नं\.?)?)\s*[:\-]?\s*([0-9\u0966-\u096F\/\-]+)/i);
    if (khateMatch) khateNo = khateMatch[1].trim();

    const areaMatch = address.match(/(?:area|क्षेत्र)\s*[:\-]?\s*([0-9\u0966-\u096F\.\,]+)/i);
    if (areaMatch) area = areaMatch[1].trim();

    return { district, taluka, village, gatNo, khateNo, area };
  }

  // ==========================================================================
  // CLIENT-SIDE QR DECODING (jsQR)
  // ==========================================================================

  decodeQrFromCanvas(canvas) {
    if (!window.jsQR || !canvas) return null;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const w = canvas.width;
    const h = canvas.height;

    const stages = [
      {
        name: "Focused QR Box",
        sx: Math.floor(w * 0.35),
        sy: Math.floor(h * 0.08),
        sw: Math.floor(w * 0.22),
        sh: Math.floor(h * 0.42)
      },
      {
        name: "Front Card Half",
        sx: 0,
        sy: 0,
        sw: w,
        sh: Math.floor(h * 0.52)
      },
      {
        name: "Entire Canvas",
        sx: 0,
        sy: 0,
        sw: w,
        sh: h
      }
    ];

    for (const st of stages) {
      try {
        const padX = Math.floor(st.sw * 0.15);
        const padY = Math.floor(st.sh * 0.15);
        const actualX = Math.max(0, st.sx - padX);
        const actualY = Math.max(0, st.sy - padY);
        const actualW = Math.min(w - actualX, st.sw + padX * 2);
        const actualH = Math.min(h - actualY, st.sh + padY * 2);

        const imgData = ctx.getImageData(actualX, actualY, actualW, actualH);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth"
        });
        if (code && code.data && code.data.trim().length > 0) {
          console.log(`✅ jsQR decoded QR in [${st.name}] stage:`, code.data);
          return code.data.trim();
        }
      } catch (e) {
        console.warn(`jsQR check failed on stage [${st.name}]:`, e);
      }
    }

    return null;
  }

  parseQrPayload(text) {
    if (!text) return null;
    const res = {};

    const dobMatch = text.match(/DOB:\s*([^\n\r]+)/i);
    if (dobMatch) res.dob = dobMatch[1].trim();

    const genderMatch = text.match(/Gender:\s*([^\n\r]+)/i);
    if (genderMatch) res.gender = genderMatch[1].trim();

    const addressMatch = text.match(/Address:\s*([^\n\r]+)/i);
    if (addressMatch) res.address = addressMatch[1].trim();

    const mobileMatch = text.match(/Mobile:\s*([^\n\r]+)/i);
    if (mobileMatch) res.mobile = mobileMatch[1].trim();

    const aadhaarMatch = text.match(/Aadhaar:\s*([^\n\r]+)/i);
    if (aadhaarMatch) res.aadhaar = aadhaarMatch[1].trim();

    const cardMatch = text.match(/Card:\s*([^\n\r]+)/i);
    if (cardMatch) res.cardNumber = cardMatch[1].trim();

    const nameMatch = text.match(/Name:\s*([^\n\r]+)/i);
    if (nameMatch) res.englishName = nameMatch[1].trim();

    const landsMatch = text.match(/Lands:\s*([^\n\r]+)/i);
    if (landsMatch) {
      const landsRaw = landsMatch[1].trim();
      res.lands = landsRaw.split(";").map((entry) => {
        const parts = entry.split("|");
        return {
          district: parts[0] || "",
          taluka: parts[1] || "",
          village: parts[2] || "",
          gatNo: parts[3] || "",
          khateNo: parts[4] || "",
          area: parts[5] || ""
        };
      });
    }

    return res;
  }

  // ==========================================================================
  // PDF DATA & PHOTO EXTRACTION ENGINE
  // ==========================================================================

  async extractFullCardDataFromPdf(pdfUrlOrData) {
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

      let qrData = null;
      const qrText = this.decodeQrFromCanvas(canvas);
      if (qrText) {
        qrData = this.parseQrPayload(qrText);
      }

      let photoDataUrl = embeddedMeta && embeddedMeta.photoDataUrl ? embeddedMeta.photoDataUrl : null;
      if (!photoDataUrl) {
        const cropX = Math.round(canvas.width * 0.055);
        const cropY = Math.round(canvas.height * 0.125);
        const cropW = Math.round(canvas.width * 0.29);
        const cropH = Math.round(canvas.height * 0.33);

        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        photoDataUrl = cropCanvas.toDataURL("image/jpeg", 0.92);
      }

      return {
        photoDataUrl: photoDataUrl || null,
        dob: (embeddedMeta && embeddedMeta.dob) || (qrData && qrData.dob) || null,
        gender: (embeddedMeta && embeddedMeta.gender) || (qrData && qrData.gender) || null,
        address: (embeddedMeta && embeddedMeta.address) || (qrData && qrData.address) || null,
        lands: (embeddedMeta && embeddedMeta.lands) || (qrData && qrData.lands) || null,
        englishName: (embeddedMeta && embeddedMeta.englishName) || (qrData && qrData.englishName) || null,
        marathiName: (embeddedMeta && embeddedMeta.marathiName) || null,
        mobile: (embeddedMeta && embeddedMeta.mobile) || (qrData && qrData.mobile) || null,
        aadhaar: (embeddedMeta && embeddedMeta.aadhaar) || (qrData && qrData.aadhaar) || null,
        cardNumber: (embeddedMeta && embeddedMeta.cardNumber) || (qrData && qrData.cardNumber) || null
      };
    } catch (err) {
      console.error("extractFullCardDataFromPdf failed:", err);
      return null;
    }
  }

  // Helper to determine if lands array has real user-entered content (not just blank placeholder)
  hasCompleteLands(lands) {
    if (!Array.isArray(lands) || lands.length === 0) return false;
    return lands.some((l) => (l.gatNo && l.gatNo.toString().trim()) || (l.khateNo && l.khateNo.toString().trim()) || (l.area && l.area.toString().trim()));
  }

  // ==========================================================================
  // DEDICATED FULLSCREEN EDIT STUDIO CONTROLLER
  // ==========================================================================

  async startEdit(record) {
    this.currentEditingRecord = record;

    // Reset view to form on mobile
    this.setMobileNav("form");

    // Open Edit Studio Modal immediately
    this.openStudioModal(record);

    // Initial basic populate from database record row
    let resolved = {
      marathiName: record.marathi_name || "",
      englishName: record.english_name || "",
      dob: "01-01-1973",
      dobDate: "1973-01-01",
      gender: "Male",
      mobile: record.mobile || "",
      aadhaar: window.formatAadhaar ? window.formatAadhaar(record.aadhaar || "") : (record.aadhaar || ""),
      cardNumber: window.formatCardNumber ? window.formatCardNumber(record.card_number || "") : (record.card_number || ""),
      address: "Bramhanwada tal akole dist ahilyanagar",
      photoDataUrl: "",
      lands: [
        { district: "अहिल्यानगर", taluka: "अकोले", village: "ब्राम्हणवाडा", gatNo: "", khateNo: "", area: "" }
      ]
    };

    // Step 1: Check local storage metadata
    let localMeta = null;
    try {
      const raw = (record.id && localStorage.getItem(`farmer_card_meta_${record.id}`)) ||
                  (record.storage_path && localStorage.getItem(`farmer_card_meta_${record.storage_path}`)) ||
                  (record.filename && localStorage.getItem(`farmer_card_meta_${record.filename}`));
      if (raw) localMeta = JSON.parse(raw);
    } catch (e) {}

    if (localMeta) {
      if (localMeta.marathiName) resolved.marathiName = localMeta.marathiName;
      if (localMeta.englishName) resolved.englishName = localMeta.englishName;
      if (localMeta.dob) {
        resolved.dob = this.formatDobDDMMYYYY(localMeta.dob);
        resolved.dobDate = this.formatDobYYYYMMDD(localMeta.dob);
      }
      if (localMeta.gender) resolved.gender = localMeta.gender;
      if (localMeta.mobile) resolved.mobile = localMeta.mobile;
      if (localMeta.aadhaar) resolved.aadhaar = window.formatAadhaar ? window.formatAadhaar(localMeta.aadhaar) : localMeta.aadhaar;
      if (localMeta.cardNumber) resolved.cardNumber = window.formatCardNumber ? window.formatCardNumber(localMeta.cardNumber) : localMeta.cardNumber;
      if (localMeta.address) resolved.address = localMeta.address;
      if (localMeta.photoDataUrl) resolved.photoDataUrl = localMeta.photoDataUrl;
      if (this.hasCompleteLands(localMeta.lands)) {
        resolved.lands = JSON.parse(JSON.stringify(localMeta.lands));
      }
    }

    const storagePath = record.storage_path || record.filename;

    // Step 2: Query Cloud companion metadata (Storage meta.json)
    // ALWAYS attempt cloud metadata if lands is missing/incomplete or photo is missing
    const needsCloudLookup = !this.hasCompleteLands(resolved.lands) || !resolved.photoDataUrl || !localMeta || !localMeta.dob;
    if (needsCloudLookup && window.supabaseManager && window.supabaseManager.getCardMetadata) {
      try {
        const cloudMeta = (await window.supabaseManager.getCardMetadata(storagePath)) ||
                          (record.filename && record.filename !== storagePath ? await window.supabaseManager.getCardMetadata(record.filename) : null);
        if (cloudMeta) {
          if (cloudMeta.marathiName) resolved.marathiName = cloudMeta.marathiName;
          if (cloudMeta.englishName) resolved.englishName = cloudMeta.englishName;
          if (cloudMeta.dob) {
            resolved.dob = this.formatDobDDMMYYYY(cloudMeta.dob);
            resolved.dobDate = this.formatDobYYYYMMDD(cloudMeta.dob);
          }
          if (cloudMeta.gender) resolved.gender = cloudMeta.gender;
          if (cloudMeta.mobile) resolved.mobile = cloudMeta.mobile;
          if (cloudMeta.aadhaar) resolved.aadhaar = window.formatAadhaar ? window.formatAadhaar(cloudMeta.aadhaar) : cloudMeta.aadhaar;
          if (cloudMeta.cardNumber) resolved.cardNumber = window.formatCardNumber ? window.formatCardNumber(cloudMeta.cardNumber) : cloudMeta.cardNumber;
          if (cloudMeta.address) resolved.address = cloudMeta.address;
          if (cloudMeta.photoDataUrl) resolved.photoDataUrl = cloudMeta.photoDataUrl;
          if (this.hasCompleteLands(cloudMeta.lands)) {
            resolved.lands = JSON.parse(JSON.stringify(cloudMeta.lands));
          }
        }
      } catch (e) {
        console.warn("Cloud metadata lookup error:", e);
      }
    }

    // Step 3: Extract from PDF file directly (Embedded metadata, QR code, and photo crop)
    const needsPdfLookup = !this.hasCompleteLands(resolved.lands) || !resolved.photoDataUrl || !resolved.dob || resolved.dob === "01-01-1973";
    if (needsPdfLookup) {
      try {
        let pdfUrl = record.public_url;
        if (!pdfUrl && window.supabaseManager && storagePath) {
          const { data } = window.supabaseManager.client.storage.from("farmer-pdfs").getPublicUrl(storagePath);
          if (data) pdfUrl = data.publicUrl;
        }

        if (pdfUrl) {
          const extracted = await this.extractFullCardDataFromPdf(pdfUrl);
          if (extracted) {
            if (extracted.photoDataUrl && !resolved.photoDataUrl) {
              resolved.photoDataUrl = extracted.photoDataUrl;
            }
            if (extracted.dob) {
              resolved.dob = this.formatDobDDMMYYYY(extracted.dob);
              resolved.dobDate = this.formatDobYYYYMMDD(extracted.dob);
            }
            if (extracted.gender) resolved.gender = extracted.gender;
            if (extracted.address && (!resolved.address || resolved.address === "Bramhanwada tal akole dist ahilyanagar")) {
              resolved.address = extracted.address;
            }
            if (this.hasCompleteLands(extracted.lands)) {
              resolved.lands = JSON.parse(JSON.stringify(extracted.lands));
            }
          }
        }
      } catch (err) {
        console.warn("PDF extraction lookup error:", err);
      }
    }

    // Step 4: If lands are STILL missing or empty, parse address for district/taluka/village/gat/khate/area
    if (!this.hasCompleteLands(resolved.lands) && resolved.address) {
      const loc = this.extractLocationFromAddress(resolved.address);
      if (loc) {
        resolved.lands = [{
          district: loc.district || "अहिल्यानगर",
          taluka: loc.taluka || "अकोले",
          village: loc.village || "ब्राम्हणवाडा",
          gatNo: loc.gatNo || "",
          khateNo: loc.khateNo || "",
          area: loc.area || ""
        }];
      }
    }

    // Store immutable copy of original data for diff comparison
    this.originalData = JSON.parse(JSON.stringify(resolved));
    this.currentEditData = JSON.parse(JSON.stringify(resolved));

    // Populate the Studio interface
    this.populateStudioData();

    // Cache updated complete metadata to localStorage
    try {
      if (record.id) localStorage.setItem(`farmer_card_meta_${record.id}`, JSON.stringify(resolved));
      if (storagePath) localStorage.setItem(`farmer_card_meta_${storagePath}`, JSON.stringify(resolved));
    } catch (e) {}

    // Synchronize background form and preview
    if (window.setPhotoDataUrl) window.setPhotoDataUrl(resolved.photoDataUrl);
    if (window.renderCard) window.renderCard();
  }

  openStudioModal(record) {
    const modal = document.getElementById("editStudioModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    const subTitle = document.getElementById("studioRecordSubtitle");
    if (subTitle) {
      subTitle.textContent = `Modifying: ${record.english_name || "Farmer"} (Card: ${record.card_number || "N/A"})`;
    }

    const statusNote = document.getElementById("studioFooterStatus");
    if (statusNote) {
      statusNote.textContent = "Loading original card details & land records...";
    }
  }

  closeStudioModal() {
    const modal = document.getElementById("editStudioModal");
    if (modal) modal.classList.add("hidden");
    this.cancelEdit();
  }

  populateStudioData() {
    const data = this.currentEditData;
    const orig = this.originalData;
    if (!data || !orig) return;

    const form = document.getElementById("studioEditForm");
    if (form) {
      if (form.elements.marathiName) form.elements.marathiName.value = data.marathiName;
      if (form.elements.englishName) form.elements.englishName.value = data.englishName;
      if (form.elements.dobDate) form.elements.dobDate.value = data.dobDate;
      if (form.elements.gender) form.elements.gender.value = data.gender;
      if (form.elements.mobile) form.elements.mobile.value = data.mobile;
      if (form.elements.aadhaar) form.elements.aadhaar.value = data.aadhaar;
      if (form.elements.cardNumber) form.elements.cardNumber.value = data.cardNumber;
      if (form.elements.address) form.elements.address.value = data.address;
    }

    // Populate Original Reference Badges
    this.setOrigBadge("origBadge_marathiName", orig.marathiName || "(empty)");
    this.setOrigBadge("origBadge_englishName", orig.englishName || "(empty)");
    this.setOrigBadge("origBadge_dob", orig.dob || "(empty)");
    this.setOrigBadge("origBadge_gender", orig.gender || "Male");
    this.setOrigBadge("origBadge_mobile", orig.mobile || "(empty)");
    this.setOrigBadge("origBadge_aadhaar", orig.aadhaar || "(empty)");
    this.setOrigBadge("origBadge_cardNumber", orig.cardNumber || "(empty)");
    this.setOrigBadge("origBadge_address", orig.address || "(empty)");

    // Populate Photo
    this.updateStudioPhotoDisplay();

    // Populate Land Rows
    this.renderStudioLandRows();

    // Render Live Preview
    this.renderStudioLivePreview();

    // Update diffs
    this.updateStudioDiffs();

    const statusNote = document.getElementById("studioFooterStatus");
    if (statusNote) {
      statusNote.textContent = "All original farmer details & land records loaded. Ready to modify.";
    }
  }

  setOrigBadge(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const truncated = value.length > 28 ? value.slice(0, 26) + "…" : value;
    el.innerHTML = `Original: <strong title="${value.replace(/"/g, '&quot;')}">${truncated}</strong>`;
  }

  updateStudioPhotoDisplay() {
    const thumb = document.getElementById("studioPhotoThumb");
    const status = document.getElementById("studioPhotoStatus");
    const revertBtn = document.getElementById("btnStudioRevertPhoto");

    const current = this.currentEditData ? this.currentEditData.photoDataUrl : "";
    const original = this.originalData ? this.originalData.photoDataUrl : "";

    if (thumb) {
      if (current) {
        thumb.innerHTML = `<img src="${current}" alt="Farmer Photo">`;
      } else {
        thumb.innerHTML = `
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6"></path>
          </svg>
        `;
      }
    }

    if (status) {
      if (current && current !== original) {
        status.textContent = "New photo selected (unsaved)";
        status.style.color = "#d97706";
      } else if (current) {
        status.textContent = "Original card photo loaded";
        status.style.color = "#166534";
      } else {
        status.textContent = "No photo saved on card";
        status.style.color = "#6b7280";
      }
    }

    if (revertBtn) {
      if (current !== original && original) {
        revertBtn.classList.remove("hidden");
      } else {
        revertBtn.classList.add("hidden");
      }
    }
  }

  onStudioPhotoSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (this.currentEditData) {
        this.currentEditData.photoDataUrl = dataUrl;
      }
      this.updateStudioPhotoDisplay();
      this.updateStudioDiffs();
      this.renderStudioLivePreview();
    };
    reader.readAsDataURL(file);
  }

  revertStudioPhoto() {
    if (!this.originalData || !this.currentEditData) return;
    this.currentEditData.photoDataUrl = this.originalData.photoDataUrl || "";
    const fileInput = document.getElementById("studioPhotoInput");
    if (fileInput) fileInput.value = "";
    this.updateStudioPhotoDisplay();
    this.updateStudioDiffs();
    this.renderStudioLivePreview();
  }

  renderStudioLandRows() {
    const container = document.getElementById("studioLandRows");
    if (!container || !this.currentEditData) return;

    const lands = Array.isArray(this.currentEditData.lands) ? this.currentEditData.lands : [];
    container.innerHTML = "";

    lands.forEach((r, idx) => {
      const rowHtml = `
        <div class="studio-land-card" data-land-idx="${idx}">
          <div class="studio-land-header">
            <span>Land Survey Record #${idx + 1}</span>
            ${lands.length > 1 ? `<button type="button" class="btn-del-land-row" data-del-idx="${idx}">Remove ✕</button>` : ""}
          </div>
          <div class="studio-grid-3">
            <div class="studio-field-group">
              <span class="studio-label-row">District / जिल्हा</span>
              <input type="text" class="studio-input land-input" data-land-field="district" data-land-idx="${idx}" value="${(r.district || '').replace(/"/g, '&quot;')}">
            </div>
            <div class="studio-field-group">
              <span class="studio-label-row">Taluka / तालुका</span>
              <input type="text" class="studio-input land-input" data-land-field="taluka" data-land-idx="${idx}" value="${(r.taluka || '').replace(/"/g, '&quot;')}">
            </div>
            <div class="studio-field-group">
              <span class="studio-label-row">Village / गाव</span>
              <input type="text" class="studio-input land-input" data-land-field="village" data-land-idx="${idx}" value="${(r.village || '').replace(/"/g, '&quot;')}">
            </div>
          </div>
          <div class="studio-grid-3" style="margin-top: 8px;">
            <div class="studio-field-group">
              <span class="studio-label-row">Gat No / गट नं</span>
              <input type="text" class="studio-input land-input" data-land-field="gatNo" data-land-idx="${idx}" value="${(r.gatNo || '').replace(/"/g, '&quot;')}">
            </div>
            <div class="studio-field-group">
              <span class="studio-label-row">Khate No / खाते नं</span>
              <input type="text" class="studio-input land-input" data-land-field="khateNo" data-land-idx="${idx}" value="${(r.khateNo || '').replace(/"/g, '&quot;')}">
            </div>
            <div class="studio-field-group">
              <span class="studio-label-row">Area H.R / क्षेत्र</span>
              <input type="text" class="studio-input land-input" data-land-field="area" data-land-idx="${idx}" value="${(r.area || '').replace(/"/g, '&quot;')}">
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", rowHtml);
    });

    // Wire delete buttons
    container.querySelectorAll(".btn-del-land-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delIdx = parseInt(btn.dataset.delIdx, 10);
        this.deleteStudioLandRow(delIdx);
      });
    });

    // Wire land row inputs
    container.querySelectorAll(".land-input").forEach((inp) => {
      inp.addEventListener("input", () => {
        const idx = parseInt(inp.dataset.landIdx, 10);
        const field = inp.dataset.landField;
        if (this.currentEditData && this.currentEditData.lands && this.currentEditData.lands[idx]) {
          this.currentEditData.lands[idx][field] = inp.value;
        }
        this.updateStudioDiffs();
        this.renderStudioLivePreview();
      });
    });
  }

  addStudioLandRow() {
    if (!this.currentEditData) return;
    if (!Array.isArray(this.currentEditData.lands)) this.currentEditData.lands = [];
    this.currentEditData.lands.push({
      district: "",
      taluka: "",
      village: "",
      gatNo: "",
      khateNo: "",
      area: ""
    });
    this.renderStudioLandRows();
    this.updateStudioDiffs();
    this.renderStudioLivePreview();
  }

  deleteStudioLandRow(idx) {
    if (!this.currentEditData || !Array.isArray(this.currentEditData.lands)) return;
    if (this.currentEditData.lands.length <= 1) return;
    this.currentEditData.lands.splice(idx, 1);
    this.renderStudioLandRows();
    this.updateStudioDiffs();
    this.renderStudioLivePreview();
  }

  onStudioInputChange(e) {
    const form = document.getElementById("studioEditForm");
    if (!form || !this.currentEditData || !this.originalData) return;

    if (e.target.name === "aadhaar" && window.formatAadhaar) {
      e.target.value = window.formatAadhaar(e.target.value);
    }
    if (e.target.name === "cardNumber" && window.formatCardNumber) {
      e.target.value = window.formatCardNumber(e.target.value);
    }

    this.currentEditData.marathiName = form.elements.marathiName ? form.elements.marathiName.value : "";
    this.currentEditData.englishName = form.elements.englishName ? form.elements.englishName.value : "";
    this.currentEditData.dobDate = form.elements.dobDate ? form.elements.dobDate.value : "";
    this.currentEditData.dob = this.formatDobDDMMYYYY(this.currentEditData.dobDate);
    this.currentEditData.gender = form.elements.gender ? form.elements.gender.value : "Male";
    this.currentEditData.mobile = form.elements.mobile ? form.elements.mobile.value : "";
    this.currentEditData.aadhaar = form.elements.aadhaar ? form.elements.aadhaar.value : "";
    this.currentEditData.cardNumber = form.elements.cardNumber ? form.elements.cardNumber.value : "";
    this.currentEditData.address = form.elements.address ? form.elements.address.value : "";

    this.updateStudioDiffs();
    this.renderStudioLivePreview();
  }

  updateStudioDiffs() {
    const cur = this.currentEditData;
    const orig = this.originalData;
    if (!cur || !orig) return;

    let diffCount = 0;
    const fields = [
      { name: "marathiName", cur: cur.marathiName, orig: orig.marathiName },
      { name: "englishName", cur: cur.englishName, orig: orig.englishName },
      { name: "dobDate", cur: cur.dobDate, orig: orig.dobDate },
      { name: "gender", cur: cur.gender, orig: orig.gender },
      { name: "mobile", cur: cur.mobile, orig: orig.mobile },
      { name: "aadhaar", cur: cur.aadhaar, orig: orig.aadhaar },
      { name: "cardNumber", cur: cur.cardNumber, orig: orig.cardNumber },
      { name: "address", cur: cur.address, orig: orig.address }
    ];

    fields.forEach((f) => {
      const group = document.querySelector(`.studio-field-group[data-field="${f.name}"]`);
      const input = group ? group.querySelector(".studio-input") : null;
      const isChanged = (f.cur || "").toString().trim() !== (f.orig || "").toString().trim();

      if (group && input) {
        if (isChanged) {
          group.classList.add("is-modified");
          input.classList.add("field-modified");
          diffCount++;
        } else {
          group.classList.remove("is-modified");
          input.classList.remove("field-modified");
        }
      }
    });

    // Check photo diff
    if (cur.photoDataUrl !== orig.photoDataUrl) {
      diffCount++;
    }

    // Check lands diff
    const curLandsStr = JSON.stringify(cur.lands || []);
    const origLandsStr = JSON.stringify(orig.lands || []);
    const landsModified = curLandsStr !== origLandsStr;
    const landsBadge = document.getElementById("origBadge_lands");
    if (landsBadge) {
      if (landsModified) {
        landsBadge.innerHTML = `Original: <strong style="color:#d97706;">Modified (${(cur.lands || []).length} rows)</strong>`;
        diffCount++;
      } else {
        landsBadge.innerHTML = `Original: <strong>${(orig.lands || []).length} rows</strong>`;
      }
    }

    // Update Counter Pill
    const pill = document.getElementById("studioDiffCounter");
    if (pill) {
      if (diffCount > 0) {
        pill.textContent = `${diffCount} ${diffCount === 1 ? 'field modified' : 'fields modified'}`;
        pill.classList.add("has-changes");
      } else {
        pill.textContent = "No changes yet";
        pill.classList.remove("has-changes");
      }
    }
  }

  revertStudioAll() {
    if (!this.originalData) return;
    this.currentEditData = JSON.parse(JSON.stringify(this.originalData));
    this.populateStudioData();
  }

  setStudioView(mode) {
    this.activeStudioView = mode;
    const frontWrap = document.getElementById("studioFrontWrapper");
    const backWrap = document.getElementById("studioBackWrapper");

    if (frontWrap && backWrap) {
      if (mode === "front") {
        frontWrap.classList.remove("hidden");
        backWrap.classList.add("hidden");
      } else if (mode === "back") {
        frontWrap.classList.add("hidden");
        backWrap.classList.remove("hidden");
      } else {
        frontWrap.classList.remove("hidden");
        backWrap.classList.remove("hidden");
      }
    }
    this.updateStudioCardScale();
  }

  updateStudioCardScale() {
    const wrappers = document.querySelectorAll(".studio-card-wrapper");
    wrappers.forEach((w) => {
      const containerWidth = w.parentElement ? w.parentElement.clientWidth - 20 : 500;
      const targetWidth = 1008;
      const maxScale = 0.5;
      const availableWidth = Math.min(504, Math.max(260, containerWidth));
      const scale = Math.min(maxScale, availableWidth / targetWidth);

      w.style.width = `${targetWidth * scale}px`;
      w.style.height = `${650 * scale}px`;

      const scaledCard = w.querySelector(".scaled-card");
      if (scaledCard) {
        scaledCard.style.transform = `scale(${scale})`;
      }
    });
  }

  renderStudioLivePreview() {
    const cur = this.currentEditData;
    if (!cur || !window.makeCard) return;

    const frontTemplate = document.getElementById("frontTemplate");
    const backTemplate = document.getElementById("backTemplate");
    const frontStage = document.getElementById("studioFrontStage");
    const backStage = document.getElementById("studioBackStage");

    if (!frontTemplate || !backTemplate || !frontStage || !backStage) return;

    // Temporarily set photo in global bridge for makeCard
    const oldBridgePhoto = window.getPhotoDataUrl ? window.getPhotoDataUrl() : "";
    if (window.setPhotoDataUrl) window.setPhotoDataUrl(cur.photoDataUrl || "");

    const cardPayload = {
      ...cur,
      photoDataUrl: cur.photoDataUrl || ""
    };

    frontStage.innerHTML = "";
    const frontNode = window.makeCard(frontTemplate, cardPayload);
    const frontWrapper = document.createElement("div");
    frontWrapper.className = "scaled-card";
    frontWrapper.appendChild(frontNode);
    frontStage.appendChild(frontWrapper);

    backStage.innerHTML = "";
    const backNode = window.makeCard(backTemplate, cardPayload);
    const backWrapper = document.createElement("div");
    backWrapper.className = "scaled-card";
    backWrapper.appendChild(backNode);
    backStage.appendChild(backWrapper);

    // Restore background bridge photo
    if (window.setPhotoDataUrl) window.setPhotoDataUrl(oldBridgePhoto);

    // Auto-scale to fit current screen size
    this.updateStudioCardScale();
  }

  onStudioSaveClick() {
    const cur = this.currentEditData;
    if (!cur) return;

    const aadhaarDigits = (cur.aadhaar || "").replace(/\D/g, "");
    if (aadhaarDigits.length !== 12) {
      alert("Aadhaar No must contain exactly 12 digits (format: 4 digits + space + 4 digits + space + 4 digits).");
      return;
    }

    const cardDigits = (cur.cardNumber || "").replace(/\D/g, "");
    if (cardDigits.length !== 11) {
      alert("Card Number must contain exactly 11 digits (format: 4 digits + space + 4 digits + space + 3 digits).");
      return;
    }

    this.showReplaceModal();
  }

  cancelEdit() {
    this.currentEditingRecord = null;
    this.originalData = null;
    this.currentEditData = null;

    const studioModal = document.getElementById("editStudioModal");
    if (studioModal) studioModal.classList.add("hidden");

    const banner = document.getElementById("editModeBanner");
    if (banner) banner.classList.add("hidden");

    const downloadBtn = document.getElementById("downloadBtn");
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

    const form = document.getElementById("cardForm") || document.getElementById("farmerForm");
    if (form) form.reset();

    if (window.setPhotoDataUrl) window.setPhotoDataUrl("");
    const photoNameSpan = document.getElementById("photoFileName");
    if (photoNameSpan) photoNameSpan.textContent = "Click to browse photo";

    if (window.initLandRows) window.initLandRows();
    if (window.renderCard) window.renderCard();
  }

  // ==========================================================================
  // PDF REPLACEMENT & STORAGE UPDATE
  // ==========================================================================

  async proceedWithReplace() {
    if (!this.currentEditingRecord) return;
    if (!window.html2canvas || !window.jspdf) {
      alert("PDF libraries are not loaded.");
      return;
    }

    const saveBtn = document.getElementById("btnStudioSave");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M4 12a8 8 0 0 1 8-8"></path>
        </svg>
        Replacing PDF...
      `;
    }

    const data = this.currentEditData || (window.getFormData ? window.getFormData() : {});
    const photoDataUrl = (this.currentEditData && this.currentEditData.photoDataUrl) || (window.getPhotoDataUrl ? window.getPhotoDataUrl() : "");

    // Temporarily set photo bridge
    if (window.setPhotoDataUrl) window.setPhotoDataUrl(photoDataUrl);

    const printStack = document.getElementById("printStack");
    const frontTemplate = document.getElementById("frontTemplate");
    const backTemplate = document.getElementById("backTemplate");

    if (printStack && frontTemplate && backTemplate && window.makeCard) {
      printStack.innerHTML = "";
      const front = window.makeCard(frontTemplate, { ...data, photoDataUrl });
      const back = window.makeCard(backTemplate, { ...data, photoDataUrl });
      printStack.append(front, back);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const frontCanvas = await window.cardCanvas(front);
      const backCanvas = await window.cardCanvas(back);

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

      const timestamp = window.getFormattedTimestamp ? window.getFormattedTimestamp() : Date.now();
      const newFilename = `${rawName || "farmer"}_${timestamp}.pdf`;

      pdf.save(newFilename);

      const pdfBlob = pdf.output("blob");

      if (window.supabaseManager) {
        const res = await window.supabaseManager.replacePdfInSupabase(
          pdfBlob,
          this.currentEditingRecord,
          data,
          newFilename,
          photoDataUrl
        );

        if (res && res.success) {
          alert("✅ PDF successfully updated & replaced! The old PDF in storage has been permanently overwritten.");

          // Cache full updated form state in localStorage
          try {
            const fullMeta = { ...data, photoDataUrl: photoDataUrl || "" };
            if (res.record && res.record.id) {
              localStorage.setItem(`farmer_card_meta_${res.record.id}`, JSON.stringify(fullMeta));
            }
            localStorage.setItem(`farmer_card_meta_${this.currentEditingRecord.id}`, JSON.stringify(fullMeta));
            localStorage.setItem(`farmer_card_meta_${newFilename}`, JSON.stringify(fullMeta));
          } catch (e) {}

          // Update admin console table immediately if loaded
          if (window.adminConsole) {
            const updatedRecord = res.record || {
              ...this.currentEditingRecord,
              english_name: data.englishName || this.currentEditingRecord.english_name,
              marathi_name: data.marathiName || this.currentEditingRecord.marathi_name,
              aadhaar: data.aadhaar || this.currentEditingRecord.aadhaar,
              card_number: data.cardNumber || this.currentEditingRecord.card_number,
              mobile: data.mobile || this.currentEditingRecord.mobile,
              public_url: res.publicUrl || this.currentEditingRecord.public_url,
              storage_path: res.storagePath || newFilename,
              filename: newFilename,
            };

            if (window.adminConsole.cachedPdfList) {
              const idx = window.adminConsole.cachedPdfList.findIndex(
                (x) => x.id === this.currentEditingRecord.id || x.storage_path === this.currentEditingRecord.storage_path
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
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Update & Replace PDF
      `;
    }

    this.closeStudioModal();
  }
}

// Global instance & window bridge
window.editManager = new EditManager();
window.startEditPdfRecord = function(record) {
  return window.editManager.startEdit(record);
};
window.cancelEditPdfRecord = function() {
  return window.editManager.cancelEdit();
};
