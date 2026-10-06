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

  // UPLOAD GENERATED PDF TO SUPABASE STORAGE & DATABASE
  async uploadPdfToSupabase(pdfBlob, filename, farmerData = {}) {
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

      let publicUrl = "";
      try {
        const { data: signedData } = await this.client.storage.from(this.bucketName).createSignedUrl(storagePath, 3600);
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
        .insert([rowData]);

      if (dbError) {
        console.warn("Supabase DB Insert Notice:", dbError.message);
      }

      return { storageData, publicUrl };
    } catch (err) {
      console.error("Supabase PDF Upload Error:", err);
      return null;
    }
  }

  // ADMIN API: FETCH ALL GENERATED PDFS
  async fetchPdfHistory() {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false });

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
        .order("created_at", { ascending: false });

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
