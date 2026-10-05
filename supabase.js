/* ==========================================================================
   FARMER CARD GENERATOR - SUPABASE AUTH & ADMIN DATABASE (supabase.js)
   ========================================================================== */

class SupabaseManager {
  constructor() {
    this.supabaseUrl = "https://nhtgltnuusyfqcggqvwy.supabase.co";
    this.supabaseKey = "sb_publishable_kndJ1IeoqwcvV9JQWXz3pg_xFz38qDZ";
    this.bucketName = "farmer-cards";
    this.tableName = "farmer_cards";
    this.profilesTable = "profiles";

    this.superAdminEmail = "sukaleshashikant@gmail.com";

    this.client = null;
    this.currentUser = null;
    this.isAdmin = false;

    this.initClient();
  }

  initClient() {
    if (window.supabase && window.supabase.createClient) {
      this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
      console.log("Supabase Client initialized ⚡");
      this.checkCurrentSession();
      this.initAuthGuard();
    } else {
      setTimeout(() => this.initClient(), 250);
    }
  }

  // ANTI-BYPASS DOM SECURITY GUARD & BODY SCROLL LOCK
  initAuthGuard() {
    const checkState = () => {
      const authModal = document.getElementById("authModal");
      const appMain = document.querySelector(".app");

      if (!this.currentUser) {
        document.body.style.overflow = "hidden";
        if (appMain) {
          appMain.classList.add("locked");
          appMain.style.setProperty("display", "none", "important");
          appMain.style.setProperty("pointer-events", "none", "important");
        }
        if (!authModal || authModal.classList.contains("hidden")) {
          if (authModal) authModal.classList.remove("hidden");
          else this.recreateAuthModal();
        }
      } else {
        const adminModal = document.getElementById("adminDashboardModal");
        const userModal = document.getElementById("userHistoryModal");
        const isAdminOpen = adminModal && !adminModal.classList.contains("hidden");
        const isUserOpen = userModal && !userModal.classList.contains("hidden");
        
        if (!isAdminOpen && !isUserOpen) {
          document.body.style.overflow = "";
        }
        if (appMain) {
          appMain.classList.remove("locked");
          appMain.style.removeProperty("display");
          appMain.style.removeProperty("pointer-events");
        }
        if (authModal) authModal.classList.add("hidden");
      }
    };

    setInterval(checkState, 300);

    const observer = new MutationObserver(() => {
      checkState();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  recreateAuthModal() {
    console.warn("DOM Tampering detected! Restoring Auth Modal.");
    window.location.reload();
  }

  async checkCurrentSession() {
    if (!this.client) return;
    try {
      const { data: { session } } = await this.client.auth.getSession();
      if (session && session.user) {
        const isSuperAdmin = (session.user.email || "").toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim();
        if (session.user.email_confirmed_at || isSuperAdmin) {
          await this.setUserSession(session.user);
        } else {
          this.clearUserSession();
        }
      } else {
        this.clearUserSession();
      }
    } catch (e) {
      console.error("Session check error:", e);
      this.clearUserSession();
    }
  }

  async setUserSession(user) {
    this.currentUser = user;
    if (!user) {
      this.isAdmin = false;
      this.updateUIForSession();
      return;
    }

    const email = (user.email || "").toLowerCase().trim();

    if (email === this.superAdminEmail.toLowerCase()) {
      this.isAdmin = true;
      try {
        await this.client.from(this.profilesTable).upsert([
          { id: user.id, email: user.email, role: "admin", confirmed: true, created_at: new Date().toISOString() }
        ]);
      } catch (err) {
        console.warn("Admin profile sync notice:", err);
      }
    } else {
      try {
        const { data } = await this.client
          .from(this.profilesTable)
          .select("role")
          .eq("id", user.id)
          .single();

        this.isAdmin = (data && data.role === "admin");
      } catch (e) {
        this.isAdmin = false;
      }
    }

    this.updateUIForSession();
  }

  clearUserSession() {
    this.currentUser = null;
    this.isAdmin = false;
    this.updateUIForSession();
  }

  updateUIForSession() {
    const authModal = document.getElementById("authModal");
    const appMain = document.querySelector(".app");
    const btnAdminDashboard = document.getElementById("btnAdminDashboard");
    const btnUserHistory = document.getElementById("btnUserHistory");
    const userEmailSpan = document.getElementById("headerUserEmail");

    if (this.currentUser) {
      if (authModal) authModal.classList.add("hidden");
      if (appMain) {
        appMain.classList.remove("locked");
        appMain.style.removeProperty("display");
        appMain.style.removeProperty("pointer-events");
      }
      if (userEmailSpan) {
        userEmailSpan.textContent = this.currentUser.email;
      }
      if (btnAdminDashboard && btnUserHistory) {
        if (this.isAdmin) {
          btnAdminDashboard.classList.remove("hidden");
          btnUserHistory.classList.add("hidden");
        } else {
          btnAdminDashboard.classList.add("hidden");
          btnUserHistory.classList.remove("hidden");
        }
      }
    } else {
      if (authModal) authModal.classList.remove("hidden");
      if (appMain) {
        appMain.classList.add("locked");
        appMain.style.setProperty("display", "none", "important");
      }
      if (btnAdminDashboard) btnAdminDashboard.classList.add("hidden");
      if (btnUserHistory) btnUserHistory.classList.add("hidden");
    }
  }

  // SUPABASE AUTH: SIGN IN WITH EMAIL & PASSWORD
  async signIn(email, password) {
    if (!this.client) return { error: { message: "Supabase not ready" } };

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        return { error };
      }

      const isSuperAdmin = (email.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim());

      if (data.user && !data.user.email_confirmed_at && !isSuperAdmin) {
        await this.client.auth.signOut();
        return {
          error: {
            message: "Email not confirmed yet. Please check your email inbox and click the confirmation link before signing in."
          }
        };
      }

      await this.setUserSession(data.user);
      return { data };
    } catch (err) {
      return { error: { message: err.message || "Login failed" } };
    }
  }

  // SUPABASE AUTH: SIGN UP NEW USER
  async signUp(email, password) {
    if (!this.client) return { error: { message: "Supabase not ready" } };

    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const isConfirmed = !!data.user.email_confirmed_at;
        await this.client.from(this.profilesTable).upsert([
          {
            id: data.user.id,
            email: data.user.email,
            role: "user",
            confirmed: isConfirmed,
            created_at: new Date().toISOString(),
          }
        ]);
      }

      return { data, requiresConfirmation: true };
    } catch (err) {
      return { error: { message: err.message || "Registration failed" } };
    }
  }

  // ADMIN METHOD: CREATE NEW USER ACCOUNT
  async createUserAccount(email, password, role = "user") {
    if (!this.client) return { error: { message: "Supabase not ready" } };

    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) return { error };

      if (data.user) {
        const isConfirmed = !!data.user.email_confirmed_at;
        await this.client.from(this.profilesTable).upsert([
          {
            id: data.user.id,
            email: data.user.email,
            role: role,
            confirmed: isConfirmed,
            created_at: new Date().toISOString(),
          }
        ]);
      }

      return { data };
    } catch (err) {
      return { error: { message: err.message || "Failed to create user" } };
    }
  }

  async signOut() {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.clearUserSession();
  }

  // Convert base64 dataURL to Blob for storage upload
  dataUrlToBlob(dataUrl) {
    try {
      const parts = dataUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn("dataUrlToBlob error:", e);
      return null;
    }
  }

  // UPLOAD GENERATED PDF TO SUPABASE STORAGE & DATABASE
  async uploadPdfToSupabase(pdfBlob, filename, farmerData = {}, photoDataUrl = "") {
    if (!this.client) return null;

    try {
      const storagePath = filename;
      const { data: storageData, error: storageError } = await this.client.storage
        .from(this.bucketName)
        .upload(storagePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (storageError) {
        console.warn("Supabase Storage Notice:", storageError.message);
      }

      // Also upload companion photo & metadata if available
      if (photoDataUrl && photoDataUrl.startsWith("data:image")) {
        try {
          const photoBlob = this.dataUrlToBlob(photoDataUrl);
          if (photoBlob) {
            await this.client.storage.from(this.bucketName).upload(`${storagePath}.photo.jpg`, photoBlob, {
              contentType: "image/jpeg",
              upsert: true
            });
          }
        } catch (e) {
          console.warn("Companion photo upload notice:", e);
        }
      }

      try {
        const metaPayload = { ...farmerData, photoDataUrl: photoDataUrl || "" };
        const metaBlob = new Blob([JSON.stringify(metaPayload)], { type: "application/json" });
        await this.client.storage.from(this.bucketName).upload(`${storagePath}.meta.json`, metaBlob, {
          contentType: "application/json",
          upsert: true
        });
      } catch (e) {
        console.warn("Companion metadata upload notice:", e);
      }

      let publicUrl = "";
      try {
        // Lifetime view limit: 10 years (315,360,000 seconds)
        const { data: signedData } = await this.client.storage.from(this.bucketName).createSignedUrl(storagePath, 315360000);
        publicUrl = signedData ? signedData.signedUrl : "";
      } catch (e) {
        console.warn("Signed URL error:", e);
      }

      const rowData = {
        user_id: this.currentUser ? this.currentUser.id : null,
        user_email: this.currentUser ? this.currentUser.email : "guest",
        filename: filename,
        english_name: farmerData.englishName || "Farmer",
        marathi_name: farmerData.marathiName || "",
        aadhaar: farmerData.aadhaar || "",
        card_number: farmerData.cardNumber || "",
        mobile: farmerData.mobile || "",
        created_at: new Date().toISOString(),
        storage_path: storagePath,
        public_url: publicUrl,
      };

      const { data: dbData, error: dbError } = await this.client
        .from(this.tableName)
        .insert([rowData])
        .select();

      if (dbError) {
        console.warn("Supabase DB Insert Notice:", dbError.message);
      }

      return { storageData, publicUrl, dbData };
    } catch (err) {
      console.error("Supabase PDF Upload Error:", err);
      return null;
    }
  }

  // GET FRESH LIFETIME VIEW URL FOR A PDF (10 YEARS EXPIRY)
  async getPdfUrl(storagePath, fallbackUrl) {
    if (!this.client || !storagePath) return fallbackUrl || "";
    try {
      // 10 years = 315,360,000 seconds
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(storagePath, 315360000);
      if (!error && data && data.signedUrl) {
        return data.signedUrl;
      }
    } catch (e) {
      console.warn("Supabase Signed URL error:", e);
    }

    try {
      const { data: pubData } = this.client.storage.from(this.bucketName).getPublicUrl(storagePath);
      if (pubData && pubData.publicUrl) return pubData.publicUrl;
    } catch (e) {}

    return fallbackUrl || "";
  }

  // GET CARD METADATA (JSON) FROM STORAGE
  async getCardMetadata(storagePath) {
    if (!this.client || !storagePath) return null;
    const cleanPath = storagePath.split("?")[0].replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/[^\/]+\//i, "");
    const baseName = cleanPath.split("/").pop();
    const candidatePaths = [
      `${cleanPath}.meta.json`,
      cleanPath.endsWith(".pdf") ? `${cleanPath.slice(0, -4)}.meta.json` : null,
      `${baseName}.meta.json`,
      baseName.endsWith(".pdf") ? `${baseName.slice(0, -4)}.meta.json` : null,
      cleanPath.endsWith(".meta.json") ? cleanPath : null
    ].filter(Boolean);

    for (const path of candidatePaths) {
      try {
        const { data, error } = await this.client.storage
          .from(this.bucketName)
          .download(path);
        if (!error && data) {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  // GET CARD COMPANION PHOTO BLOB FROM STORAGE
  async getCardPhotoBlob(storagePath) {
    if (!this.client || !storagePath) return null;
    const cleanPath = storagePath.split("?")[0].replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/[^\/]+\//i, "");
    const baseName = cleanPath.split("/").pop();
    const candidatePaths = [
      `${cleanPath}.photo.jpg`,
      cleanPath.endsWith(".pdf") ? `${cleanPath.slice(0, -4)}.photo.jpg` : null,
      `${baseName}.photo.jpg`,
      baseName.endsWith(".pdf") ? `${baseName.slice(0, -4)}.photo.jpg` : null
    ].filter(Boolean);

    for (const path of candidatePaths) {
      try {
        const { data, error } = await this.client.storage
          .from(this.bucketName)
          .download(path);
        if (!error && data) {
          return data;
        }
      } catch (e) {}
    }
    return null;
  }

  // UPDATE & REPLACE EXISTING PDF FILE IN STORAGE AND DATABASE
  async replacePdfInSupabase(pdfBlob, existingRecord, updatedData = {}, newFilename = "", photoDataUrl = "") {
    if (!this.client || !existingRecord) return null;

    try {
      const oldStoragePath = existingRecord.storage_path || existingRecord.filename;
      const targetFilename = newFilename || existingRecord.filename || `${(updatedData.englishName || "farmer").trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-")}_updated.pdf`;
      const targetStoragePath = targetFilename;

      // 1. Permanently delete old PDF file and companion assets from Supabase Storage (uses working DELETE policy)
      if (oldStoragePath) {
        try {
          await this.client.storage.from(this.bucketName).remove([
            oldStoragePath,
            `${oldStoragePath}.photo.jpg`,
            `${oldStoragePath}.meta.json`
          ]);
        } catch (e) {
          console.warn("Notice removing old storage file:", e);
        }
      }

      // 2. Upload the newly generated PDF file to Supabase Storage (uses working INSERT policy)
      let storageData = null;
      try {
        const uploadRes = await this.client.storage
          .from(this.bucketName)
          .upload(targetStoragePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadRes.error) {
          console.warn("Storage upload notice (retrying clean insert):", uploadRes.error.message);
          const retryRes = await this.client.storage
            .from(this.bucketName)
            .upload(targetStoragePath, pdfBlob, {
              contentType: "application/pdf",
            });
          storageData = retryRes.data;
        } else {
          storageData = uploadRes.data;
        }
      } catch (err) {
        console.error("Storage upload exception:", err);
      }

      // Also upload companion photo & metadata if provided
      if (photoDataUrl && photoDataUrl.startsWith("data:image")) {
        try {
          const photoBlob = this.dataUrlToBlob(photoDataUrl);
          if (photoBlob) {
            await this.client.storage.from(this.bucketName).upload(`${targetStoragePath}.photo.jpg`, photoBlob, {
              contentType: "image/jpeg",
              upsert: true
            });
          }
        } catch (e) {
          console.warn("Companion photo upload notice:", e);
        }
      }

      try {
        const metaPayload = { ...updatedData, photoDataUrl: photoDataUrl || "" };
        const metaBlob = new Blob([JSON.stringify(metaPayload)], { type: "application/json" });
        await this.client.storage.from(this.bucketName).upload(`${targetStoragePath}.meta.json`, metaBlob, {
          contentType: "application/json",
          upsert: true
        });
      } catch (e) {
        console.warn("Companion metadata upload notice:", e);
      }

      // 3. Generate a fresh lifetime signed URL (10 years)
      let publicUrl = existingRecord.public_url || "";
      try {
        const { data: signedData } = await this.client.storage
          .from(this.bucketName)
          .createSignedUrl(targetStoragePath, 315360000);
        if (signedData && signedData.signedUrl) {
          publicUrl = signedData.signedUrl;
        }
      } catch (e) {
        console.warn("Signed URL generation warning:", e);
      }

      // 4. Update the record in farmer_cards database table - PRESERVE ORIGINAL USER OWNERSHIP
      const englishName = (updatedData.englishName !== undefined && updatedData.englishName !== "") ? updatedData.englishName : (existingRecord.english_name || "Farmer");
      const marathiName = (updatedData.marathiName !== undefined) ? updatedData.marathiName : (existingRecord.marathi_name || "");
      const aadhaar = (updatedData.aadhaar !== undefined && updatedData.aadhaar !== "") ? updatedData.aadhaar : (existingRecord.aadhaar || "");
      const cardNumber = (updatedData.cardNumber !== undefined && updatedData.cardNumber !== "") ? updatedData.cardNumber : (existingRecord.card_number || "");
      const mobile = (updatedData.mobile !== undefined) ? updatedData.mobile : (existingRecord.mobile || "");

      // Retain original user ownership so user continues to see their card in history
      const originalUserId = existingRecord.user_id || (this.currentUser ? this.currentUser.id : null);
      const originalUserEmail = existingRecord.user_email || (this.currentUser ? this.currentUser.email : "guest");

      const updateFields = {
        english_name: englishName,
        marathi_name: marathiName,
        aadhaar: aadhaar,
        card_number: cardNumber,
        mobile: mobile,
        filename: targetFilename,
        storage_path: targetStoragePath,
        public_url: publicUrl,
        user_id: originalUserId,
        user_email: originalUserEmail,
      };

      let updatedRecord = null;

      // Strategy A: Direct in-place UPDATE on the exact row
      try {
        const { error: dbError } = await this.client
          .from(this.tableName)
          .update(updateFields)
          .eq("id", existingRecord.id);

        if (!dbError) {
          // Verify update on the existing record
          const { data: verified } = await this.client
            .from(this.tableName)
            .select("*")
            .eq("id", existingRecord.id)
            .single();

          if (verified) {
            updatedRecord = verified;
          }
        } else {
          console.warn("Direct update error notice:", dbError.message);
        }
      } catch (e) {
        console.warn("Direct update exception:", e);
      }

      // Strategy B: If in-place UPDATE was restricted, try DELETE then INSERT keeping original user
      if (!updatedRecord) {
        try {
          const { error: delErr } = await this.client.from(this.tableName).delete().eq("id", existingRecord.id);

          // Verify if row was actually deleted before attempting insert (prevents duplicate entries)
          const { data: checkOld } = await this.client.from(this.tableName).select("id").eq("id", existingRecord.id);
          const wasDeleted = (!checkOld || checkOld.length === 0);

          if (wasDeleted) {
            const rowToInsert = {
              id: existingRecord.id,
              user_id: originalUserId,
              user_email: originalUserEmail,
              filename: targetFilename,
              english_name: englishName,
              marathi_name: marathiName,
              aadhaar: aadhaar,
              card_number: cardNumber,
              mobile: mobile,
              created_at: existingRecord.created_at || new Date().toISOString(),
              storage_path: targetStoragePath,
              public_url: publicUrl,
            };

            const { data: insData, error: insError } = await this.client
              .from(this.tableName)
              .insert([rowToInsert])
              .select();

            if (!insError && insData && insData.length > 0) {
              updatedRecord = insData[0];
            } else {
              delete rowToInsert.id;
              const { data: insData2 } = await this.client
                .from(this.tableName)
                .insert([rowToInsert])
                .select();
              if (insData2 && insData2.length > 0) {
                updatedRecord = insData2[0];
              }
            }
          } else {
            console.warn("Old row could not be deleted by RLS, avoiding duplicate insert.");
          }
        } catch (fbErr) {
          console.error("Fallback replace DB error:", fbErr);
        }
      }

      if (!updatedRecord) {
        updatedRecord = {
          ...existingRecord,
          ...updateFields,
        };
      }

      return {
        success: true,
        record: updatedRecord,
        storageData,
        publicUrl,
        storagePath: targetStoragePath,
        filename: targetFilename,
      };
    } catch (err) {
      console.error("Supabase Replace PDF Error:", err);
      return null;
    }
  }

  // ADMIN API: FETCH ALL GENERATED PDFS (INCREASED LIMIT)
  async fetchPdfHistory() {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  }

  // REGULAR USER API: FETCH ONLY MY GENERATED PDFS
  async fetchMyPdfHistory() {
    if (!this.client || !this.currentUser) return [];
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .or(`user_id.eq.${this.currentUser.id},user_email.eq.${this.currentUser.email}`)
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  }

  // ADMIN API: DELETE PDF FILE & RECORD FROM SUPABASE
  async deletePdfRecord(id, storagePath) {
    if (!this.client) return false;

    try {
      if (storagePath) {
        await this.client.storage.from(this.bucketName).remove([storagePath]);
      }
      const { error } = await this.client.from(this.tableName).delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Delete PDF Error:", err);
      return false;
    }
  }

  // ADMIN API: FETCH ALL REGISTERED USERS
  async fetchUsersList() {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from(this.profilesTable)
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return [
          {
            id: this.currentUser ? this.currentUser.id : "1",
            email: this.currentUser ? this.currentUser.email : this.superAdminEmail,
            role: "admin",
            confirmed: true,
            created_at: new Date().toISOString(),
          }
        ];
      }
      return data;
    } catch (e) {
      return [];
    }
  }

  // ADMIN API: UPDATE USER ROLE
  async updateUserRole(userId, userEmail, newRole) {
    if (!this.client) return false;

    if (userEmail && userEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Primary Super Admin account role cannot be altered!");
      return false;
    }

    try {
      const { error } = await this.client
        .from(this.profilesTable)
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Update User Role Error:", err);
      return false;
    }
  }

  // ADMIN API: DELETE USER ACCOUNT
  async deleteUserRecord(userId, userEmail) {
    if (!this.client) return false;

    if (userEmail && userEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Primary Super Admin account cannot be deleted!");
      return false;
    }

    try {
      const { error } = await this.client
        .from(this.profilesTable)
        .delete()
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Delete User Error:", err);
      return false;
    }
  }
}

// Global instance
window.supabaseManager = new SupabaseManager();
