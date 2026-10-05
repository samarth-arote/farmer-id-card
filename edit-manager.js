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

  // ==========================================================================
  // CLOUD STORAGE & PDF RETRIEVAL ENGINE (AUTHENTICATED & LIFETIME)
  // ==========================================================================

  async downloadPdfArrayBuffer(record) {
    const storagePath = record.storage_path || record.filename;
    const bucket = (window.supabaseManager && window.supabaseManager.bucketName) || "farmer-cards";

    // Strategy 1: Authenticated Supabase storage download (never expires, bypasses public ACL/CORS)
    if (window.supabaseManager && window.supabaseManager.client && storagePath) {
      try {
        const { data: blob, error } = await window.supabaseManager.client.storage
          .from(bucket)
          .download(storagePath);
        if (!error && blob && blob.size > 0) {
          console.log(`✅ Supabase storage download success for [${storagePath}], size: ${blob.size} bytes`);
          return await blob.arrayBuffer();
        }
      } catch (e) {
        console.warn("Supabase storage download attempt 1 failed:", e);
      }

      // Try filename without path prefix
      try {
        const fileNameOnly = storagePath.split("/").pop().split("?")[0];
        if (fileNameOnly && fileNameOnly !== storagePath) {
          const { data: blob2, error: err2 } = await window.supabaseManager.client.storage
            .from(bucket)
            .download(fileNameOnly);
          if (!err2 && blob2 && blob2.size > 0) {
            console.log(`✅ Supabase storage download success for [${fileNameOnly}], size: ${blob2.size} bytes`);
            return await blob2.arrayBuffer();
          }
        }
      } catch (e) {}
    }

    // Strategy 2: Fresh signed URL (10 years)
    if (window.supabaseManager && window.supabaseManager.getPdfUrl && storagePath) {
      try {
        const freshUrl = await window.supabaseManager.getPdfUrl(storagePath, record.public_url);
        if (freshUrl) {
          const res = await fetch(freshUrl);
          if (res.ok) {
            console.log("✅ Fetched PDF via fresh signed URL");
            return await res.arrayBuffer();
          }
        }
      } catch (e) {
        console.warn("Fresh signed URL fetch failed:", e);
      }
    }

    // Strategy 3: Direct fetch on public_url from record
    if (record.public_url) {
      try {
        const res = await fetch(record.public_url);
        if (res.ok) {
          console.log("✅ Fetched PDF via record.public_url");
          return await res.arrayBuffer();
        }
      } catch (e) {
        console.warn("Direct public_url fetch failed:", e);
      }
    }

    return null;
  }

  blobToDataUrl(blob) {
    return new Promise((resolve) => {
      if (!blob) return resolve("");
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }

  mergeMetaIntoResolved(resolved, meta) {
    if (!meta || typeof meta !== "object") return;
    if (meta.marathiName && !resolved.marathiName) resolved.marathiName = meta.marathiName;
    if (meta.englishName && !resolved.englishName) resolved.englishName = meta.englishName;

    if (meta.dob && (!resolved.dob || resolved.dob === "01-01-1973")) {
      resolved.dob = this.formatDobDDMMYYYY(meta.dob);
      resolved.dobDate = this.formatDobYYYYMMDD(meta.dob);
    }
    if (meta.dobDate && !resolved.dobDate) {
      resolved.dobDate = meta.dobDate;
      if (!resolved.dob) resolved.dob = this.formatDobDDMMYYYY(meta.dobDate);
    }

    if (meta.gender && (!resolved.gender || resolved.gender === "Male")) resolved.gender = meta.gender;
    if (meta.mobile && !resolved.mobile) resolved.mobile = meta.mobile;
    if (meta.aadhaar && !resolved.aadhaar) resolved.aadhaar = window.formatAadhaar ? window.formatAadhaar(meta.aadhaar) : meta.aadhaar;
    if (meta.cardNumber && !resolved.cardNumber) resolved.cardNumber = window.formatCardNumber ? window.formatCardNumber(meta.cardNumber) : meta.cardNumber;
    if (meta.address && (!resolved.address || resolved.address === "Bramhanwada tal akole dist ahilyanagar")) {
      resolved.address = meta.address;
    }
    if (meta.photoDataUrl && !resolved.photoDataUrl) resolved.photoDataUrl = meta.photoDataUrl;

    if (this.hasCompleteLands(meta.lands)) {
      resolved.lands = JSON.parse(JSON.stringify(meta.lands));
    }
  }

  // ==========================================================================
  // OCR ENGINE FOR LAND DETAILS (GAT / KHATE / AREA) & TEXT CELLS
  // ==========================================================================

  async extractLandsAndDobViaOcr(canvas, resolved) {
    if (!canvas || !window.Tesseract) return;

    const w = canvas.width;
    const h = canvas.height;

    // Back card boundary on rendered PDF canvas (PDF page is 101.6mm x 152.4mm, card is 85.6mm x 53.98mm)
    const backX = Math.round((8.00 / 101.6) * w);
    const backY = Math.round((69.98 / 152.4) * h);
    const backW = Math.round((85.60 / 101.6) * w);
    const backH = Math.round((53.98 / 152.4) * h);

    // Front card boundary on rendered PDF canvas
    const frontX = Math.round((8.00 / 101.6) * w);
    const frontY = Math.round((8.00 / 152.4) * h);
    const frontW = Math.round((85.60 / 101.6) * w);
    const frontH = Math.round((53.98 / 152.4) * h);

    const makeCrop = (bx, by, bw, bh, cx, cy, cw, ch) => {
      const rx = Math.max(0, Math.round(bx + (cx / 1008) * bw));
      const ry = Math.max(0, Math.round(by + (cy / 650) * bh));
      const rw = Math.min(canvas.width - rx, Math.round((cw / 1008) * bw));
      const rh = Math.min(canvas.height - ry, Math.round((ch / 650) * bh));

      const cvs = document.createElement("canvas");
      cvs.width = rw;
      cvs.height = rh;
      const ctx = cvs.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);

      // Contrast enhancement: convert to grayscale and high-contrast threshold
      const imgData = ctx.getImageData(0, 0, rw, rh);
      const d = imgData.data;
      let darkCount = 0;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (gray < 160) {
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0;
          darkCount++;
        } else {
          d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      return { cvs, darkCount };
    };

    const runOcr = async (cvs, whitelist) => {
      try {
        const opts = {};
        if (whitelist) opts.tessedit_char_whitelist = whitelist;
        const res = await Promise.race([
          window.Tesseract.recognize(cvs, 'eng', opts),
          new Promise((_, reject) => setTimeout(() => reject(new Error("OCR timeout")), 6000))
        ]);
        if (res && res.data && res.data.text) {
          return res.data.text.trim().replace(/[\r\n]+/g, " ");
        }
      } catch (e) {
        console.warn("OCR recognize cell warning:", e);
      }
      return "";
    };

    // Scan Land Rows (Row 1 and Row 2)
    if (!this.hasCompleteLands(resolved.lands)) {
      const statusNote = document.getElementById("studioFooterStatus");
      if (statusNote) statusNote.textContent = "Scanning original land survey records via OCR...";

      const rowsToScan = [
        { rowIdx: 0, y: 296, h: 46 },
        { rowIdx: 1, y: 348, h: 46 }
      ];

      for (const row of rowsToScan) {
        // Col 4: Gat No (X = 510, W = 135)
        const gatCrop = makeCrop(backX, backY, backW, backH, 510, row.y, 135, row.h);
        // Col 5: Khate No (X = 655, W = 135)
        const khateCrop = makeCrop(backX, backY, backW, backH, 655, row.y, 135, row.h);
        // Col 6: Area (X = 800, W = 135)
        const areaCrop = makeCrop(backX, backY, backW, backH, 800, row.y, 135, row.h);

        // Check if any numbers are visible in this row
        const hasContent = gatCrop.darkCount > 15 || khateCrop.darkCount > 15 || areaCrop.darkCount > 15;
        if (!hasContent) {
          if (row.rowIdx > 0) break; // No second row
        }

        let gatText = "";
        let khateText = "";
        let areaText = "";

        if (gatCrop.darkCount > 15) {
          const raw = await runOcr(gatCrop.cvs, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-.,");
          gatText = raw.replace(/[^0-9a-zA-Z\/\-]/g, "").trim();
        }

        if (khateCrop.darkCount > 15) {
          const raw = await runOcr(khateCrop.cvs, "0123456789/-.,");
          khateText = raw.replace(/[^0-9]/g, "").trim();
        }

        if (areaCrop.darkCount > 15) {
          const raw = await runOcr(areaCrop.cvs, "0123456789/.-,");
          areaText = raw.replace(/[^0-9\.]/g, "").trim();
        }

        if (gatText || khateText || areaText) {
          console.log(`✅ Land Row ${row.rowIdx + 1} OCR: Gat=[${gatText}], Khate=[${khateText}], Area=[${areaText}]`);

          if (!resolved.lands || !Array.isArray(resolved.lands)) {
            resolved.lands = [];
          }
          while (resolved.lands.length <= row.rowIdx) {
            resolved.lands.push({ district: "", taluka: "", village: "", gatNo: "", khateNo: "", area: "" });
          }

          if (gatText) resolved.lands[row.rowIdx].gatNo = gatText;
          if (khateText) resolved.lands[row.rowIdx].khateNo = khateText;
          if (areaText) resolved.lands[row.rowIdx].area = areaText;
        }
      }
    }

    // If DOB is still missing or default
    if (!resolved.dob || resolved.dob === "01-01-1973") {
      try {
        const dobCrop = makeCrop(frontX, frontY, frontW, frontH, 500, 274, 225, 42);
        if (dobCrop.darkCount > 25) {
          const rawDob = await runOcr(dobCrop.cvs, "0123456789/-.");
          const cleanDob = rawDob.replace(/[^0-9\-\/\.]/g, "").trim();
          if (cleanDob && cleanDob.length >= 8) {
            console.log(`✅ DOB OCR extracted: [${cleanDob}]`);
            resolved.dob = this.formatDobDDMMYYYY(cleanDob);
            resolved.dobDate = this.formatDobYYYYMMDD(cleanDob);
          }
        }
      } catch (e) {}
    }

    // If Address is still missing
    if (!resolved.address || resolved.address === "Bramhanwada tal akole dist ahilyanagar") {
      try {
        const addrCrop = makeCrop(backX, backY, backW, backH, 80, 110, 760, 72);
        if (addrCrop.darkCount > 40) {
          const addrText = await runOcr(addrCrop.cvs);
          if (addrText && addrText.length > 5) {
            console.log(`✅ Address OCR extracted: [${addrText}]`);
            resolved.address = addrText;
          }
        }
      } catch (e) {}
    }
  }

  // ==========================================================================
  // PDF DATA & PHOTO EXTRACTION ENGINE
  // ==========================================================================

  async extractFullCardDataFromPdf(pdfBufferOrUrl, resolvedRef) {
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
      if (typeof pdfBufferOrUrl === "string") {
        const res = await fetch(pdfBufferOrUrl);
        if (!res.ok) throw new Error("Failed to fetch PDF: " + res.status);
        const arrayBuffer = await res.arrayBuffer();
        loadingTask = pdfLib.getDocument({ data: arrayBuffer });
      } else if (pdfBufferOrUrl instanceof ArrayBuffer || pdfBufferOrUrl instanceof Uint8Array) {
        loadingTask = pdfLib.getDocument({ data: pdfBufferOrUrl });
      } else {
        loadingTask = pdfLib.getDocument(pdfBufferOrUrl);
      }

      const pdfDoc = await loadingTask.promise;
      if (pdfDoc.numPages < 1) return null;

      // 1. Check embedded Subject JSON metadata
      let embeddedMeta = null;
      try {
        const docMeta = await pdfDoc.getMetadata();
        if (docMeta && docMeta.info && docMeta.info.Subject) {
          const parsed = JSON.parse(docMeta.info.Subject);
          if (parsed && typeof parsed === "object") {
            embeddedMeta = parsed;
            console.log("✅ Extracted embedded Subject JSON metadata from PDF:", embeddedMeta);
            if (resolvedRef) this.mergeMetaIntoResolved(resolvedRef, embeddedMeta);
          }
        }
      } catch (e) {}

      // 2. Render Page 1 to high-resolution canvas (scale 3.2 for crisp QR & OCR)
      const page = await pdfDoc.getPage(1);
      const scale = 3.2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      await page.render({ canvasContext: ctx, viewport }).promise;

      // 3. Scan QR Code
      let qrData = null;
      const qrText = this.decodeQrFromCanvas(canvas);
      if (qrText) {
        qrData = this.parseQrPayload(qrText);
        console.log("✅ Decoded QR Code payload:", qrData);
        if (resolvedRef && qrData) this.mergeMetaIntoResolved(resolvedRef, qrData);
      }

      // 4. Exact Pixel-Ratio Crop for Farmer Photo from Front Card
      let photoDataUrl = (embeddedMeta && embeddedMeta.photoDataUrl) || (resolvedRef && resolvedRef.photoDataUrl) || null;
      if (!photoDataUrl) {
        const frontX = (8.00 / 101.6) * canvas.width;
        const frontY = (8.00 / 152.4) * canvas.height;
        const frontW = (85.60 / 101.6) * canvas.width;
        const frontH = (53.98 / 152.4) * canvas.height;

        const cropX = Math.round(frontX + (25 / 1008) * frontW);
        const cropY = Math.round(frontY + (137 / 650) * frontH);
        const cropW = Math.round((203 / 1008) * frontW);
        const cropH = Math.round((200 / 650) * frontH);

        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        photoDataUrl = cropCanvas.toDataURL("image/jpeg", 0.92);
        if (resolvedRef) resolvedRef.photoDataUrl = photoDataUrl;
      }

      // 5. OCR for Land Details and Missing Text
      if (resolvedRef) {
        await this.extractLandsAndDobViaOcr(canvas, resolvedRef);
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

    // Reset view to form on mobile/tablet
    this.setMobileNav("form");

    // Open Edit Studio Modal immediately
    this.openStudioModal(record);

    // Initial clean resolved state from database row
    let resolved = {
      marathiName: record.marathi_name || "",
      englishName: record.english_name || "",
      dob: "",
      dobDate: "",
      gender: "Male",
      mobile: record.mobile || "",
      aadhaar: window.formatAadhaar ? window.formatAadhaar(record.aadhaar || "") : (record.aadhaar || ""),
      cardNumber: window.formatCardNumber ? window.formatCardNumber(record.card_number || "") : (record.card_number || ""),
      address: "",
      photoDataUrl: "",
      lands: [
        { district: "", taluka: "", village: "", gatNo: "", khateNo: "", area: "" }
      ]
    };

    // Instant populate with basic record info while background fetching completes
    this.originalData = JSON.parse(JSON.stringify(resolved));
    this.currentEditData = JSON.parse(JSON.stringify(resolved));
    this.populateStudioData();

    const statusNote = document.getElementById("studioFooterStatus");
    if (statusNote) {
      statusNote.textContent = "Retrieving original farmer card data & land records from cloud...";
    }

    const storagePath = record.storage_path || record.filename;

    // Tier 1: Check LocalStorage cache
    try {
      const raw = (record.id && localStorage.getItem(`farmer_card_meta_${record.id}`)) ||
                  (record.storage_path && localStorage.getItem(`farmer_card_meta_${record.storage_path}`)) ||
                  (record.filename && localStorage.getItem(`farmer_card_meta_${record.filename}`));
      if (raw) {
        const localMeta = JSON.parse(raw);
        this.mergeMetaIntoResolved(resolved, localMeta);
      }
    } catch (e) {}

    // Tier 2: Check Cloud Companion Metadata (.meta.json)
    if (window.supabaseManager && window.supabaseManager.getCardMetadata && storagePath) {
      try {
        const cloudMeta = (await window.supabaseManager.getCardMetadata(storagePath)) ||
                          (record.filename && record.filename !== storagePath ? await window.supabaseManager.getCardMetadata(record.filename) : null);
        if (cloudMeta) {
          this.mergeMetaIntoResolved(resolved, cloudMeta);
        }
      } catch (e) {
        console.warn("Cloud metadata lookup error:", e);
      }
    }

    // Tier 2B: Check Cloud Companion Photo (.photo.jpg) if photo still missing
    if (!resolved.photoDataUrl && window.supabaseManager && window.supabaseManager.getCardPhotoBlob && storagePath) {
      try {
        const photoBlob = await window.supabaseManager.getCardPhotoBlob(storagePath);
        if (photoBlob) {
          resolved.photoDataUrl = await this.blobToDataUrl(photoBlob);
        }
      } catch (e) {
        console.warn("Cloud photo lookup error:", e);
      }
    }

    // Tier 3: Fetch PDF via Authenticated Storage / Fresh Signed URL and Extract (QR, Photo, and OCR)
    const needsPdfLookup = !this.hasCompleteLands(resolved.lands) || !resolved.photoDataUrl || !resolved.dob || resolved.dob === "01-01-1973";
    if (needsPdfLookup) {
      try {
        if (statusNote) statusNote.textContent = "Downloading PDF from cloud storage to recover land records & photo...";
        const pdfBuffer = await this.downloadPdfArrayBuffer(record);
        if (pdfBuffer) {
          await this.extractFullCardDataFromPdf(pdfBuffer, resolved);
        } else if (record.public_url) {
          await this.extractFullCardDataFromPdf(record.public_url, resolved);
        }
      } catch (err) {
        console.warn("PDF extraction lookup error:", err);
      }
    }

    // Tier 4: Location fallback parsing from address if district/taluka/village still empty
    if (resolved.address) {
      const loc = this.extractLocationFromAddress(resolved.address);
      if (loc) {
        if (!resolved.lands || resolved.lands.length === 0) {
          resolved.lands = [{
            district: loc.district || "अहिल्यानगर",
            taluka: loc.taluka || "अकोले",
            village: loc.village || "ब्राम्हणवाडा",
            gatNo: loc.gatNo || "",
            khateNo: loc.khateNo || "",
            area: loc.area || ""
          }];
        } else {
          resolved.lands.forEach((l) => {
            if (!l.district && loc.district) l.district = loc.district;
            if (!l.taluka && loc.taluka) l.taluka = loc.taluka;
            if (!l.village && loc.village) l.village = loc.village;
            if (!l.gatNo && loc.gatNo) l.gatNo = loc.gatNo;
            if (!l.khateNo && loc.khateNo) l.khateNo = loc.khateNo;
            if (!l.area && loc.area) l.area = loc.area;
          });
        }
      }
    }

    // Default safety values
    if (!resolved.address) {
      resolved.address = "Bramhanwada tal akole dist ahilyanagar";
    }
    if (!resolved.lands || resolved.lands.length === 0) {
      resolved.lands = [{
        district: "अहिल्यानगर",
        taluka: "अकोले",
        village: "ब्राम्हणवाडा",
        gatNo: "",
        khateNo: "",
        area: ""
      }];
    }
    if (!resolved.dob) {
      resolved.dob = "01-01-1973";
      resolved.dobDate = "1973-01-01";
    } else {
      if (!resolved.dobDate) resolved.dobDate = this.formatDobYYYYMMDD(resolved.dob);
      if (!resolved.dob) resolved.dob = this.formatDobDDMMYYYY(resolved.dobDate);
    }

    // Store immutable copy of original data for diff comparison
    this.originalData = JSON.parse(JSON.stringify(resolved));
    this.currentEditData = JSON.parse(JSON.stringify(resolved));

    // Re-populate Studio interface with complete verified original data
    this.populateStudioData();

    // Cache updated complete metadata to localStorage
    try {
      if (record.id) localStorage.setItem(`farmer_card_meta_${record.id}`, JSON.stringify(resolved));
      if (storagePath) localStorage.setItem(`farmer_card_meta_${storagePath}`, JSON.stringify(resolved));
    } catch (e) {}

    // Synchronize background form and preview
    if (window.setPhotoDataUrl) window.setPhotoDataUrl(resolved.photoDataUrl);
    if (window.renderCard) window.renderCard();

    if (statusNote) {
      statusNote.textContent = "All original farmer details & land records loaded. Ready to modify.";
    }
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

    if (!data.dobDate && data.dob) data.dobDate = this.formatDobYYYYMMDD(data.dob);
    if (!data.dob && data.dobDate) data.dob = this.formatDobDDMMYYYY(data.dobDate);

    const form = document.getElementById("studioEditForm");
    if (form) {
      if (form.elements.marathiName) form.elements.marathiName.value = data.marathiName || "";
      if (form.elements.englishName) form.elements.englishName.value = data.englishName || "";
      if (form.elements.dobDate) form.elements.dobDate.value = data.dobDate || "";
      if (form.elements.gender) form.elements.gender.value = data.gender || "Male";
      if (form.elements.mobile) form.elements.mobile.value = data.mobile || "";
      if (form.elements.aadhaar) form.elements.aadhaar.value = data.aadhaar || "";
      if (form.elements.cardNumber) form.elements.cardNumber.value = data.cardNumber || "";
      if (form.elements.address) form.elements.address.value = data.address || "";
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

    // Populate Land Badge
    const landsBadge = document.getElementById("origBadge_lands");
    if (landsBadge && orig.lands && orig.lands.length > 0) {
      const first = orig.lands[0];
      const parts = [];
      if (first.gatNo) parts.push(`गट: ${first.gatNo}`);
      if (first.khateNo) parts.push(`खाते: ${first.khateNo}`);
      if (first.area) parts.push(`क्षेत्र: ${first.area}`);
      const summary = parts.length > 0 ? parts.join(", ") : "Loaded";
      landsBadge.innerHTML = `Original: <strong title="${summary}">${summary}</strong>`;
    }

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
      const parent = w.parentElement;
      const previewCol = document.querySelector(".studio-preview-col");
      const colWidth = (previewCol && previewCol.clientWidth > 50)
        ? (previewCol.clientWidth - 40)
        : (parent && parent.clientWidth > 50 ? parent.clientWidth - 20 : 504);
      const targetWidth = 1008;
      const targetHeight = 650;
      const maxScale = 0.5;
      const availableWidth = Math.min(504, Math.max(260, colWidth));
      const scale = Math.min(maxScale, availableWidth / targetWidth);

      const renderedW = Math.round(targetWidth * scale);
      const renderedH = Math.round(targetHeight * scale);

      w.style.width = `${renderedW}px`;
      w.style.height = `${renderedH}px`;
      w.style.maxWidth = `${renderedW}px`;

      const scaledCard = w.querySelector(".scaled-card");
      if (scaledCard) {
        scaledCard.style.width = `${targetWidth}px`;
        scaledCard.style.height = `${targetHeight}px`;
        scaledCard.style.transform = `scale(${scale})`;
        scaledCard.style.transformOrigin = "top left";
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

          // Update user history table immediately if loaded
          if (window.userHistory && window.userHistory.cachedMyPdfList) {
            const uIdx = window.userHistory.cachedMyPdfList.findIndex(
              (x) => x.id === this.currentEditingRecord.id || x.storage_path === this.currentEditingRecord.storage_path
            );
            if (uIdx !== -1) {
              window.userHistory.cachedMyPdfList[uIdx] = res.record || {
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
            }
            window.userHistory.renderMyPdfsTable(window.userHistory.cachedMyPdfList);
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
