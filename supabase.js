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
      this.checkUrlAuthParams();
      this.checkCurrentSession();
      this.initAuthGuard();

      this.client.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          await this.checkCurrentSession();
        } else if (event === "SIGNED_OUT") {
          this.clearUserSession();
        }
      });
    } else {
      setTimeout(() => this.initClient(), 250);
    }
  }

  // DETECT AND HANDLE AUTH CALLBACK HASH ERRORS (e.g. OTP EXPIRED)
  checkUrlAuthParams() {
    try {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const error = params.get("error");
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description");

      if (error || errorCode) {
        console.warn("Auth URL error detected:", errorCode, errorDesc);
        if (errorCode === "otp_expired") {
          setTimeout(() => {
            alert("Email Confirmation Notice:\n\nThis confirmation link is invalid, expired, or has already been used.\n\nIf your email was already confirmed, you can sign in directly. Otherwise, register again or request a new link.");
          }, 300);
        } else if (errorDesc) {
          setTimeout(() => {
            alert(`Email Confirmation Notice:\n\n${errorDesc.replace(/\+/g, " ")}`);
          }, 300);
        }
        // Clean up hash from URL bar
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    } catch (e) {
      console.warn("Error parsing auth URL params:", e);
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
          if (!isSuperAdmin) {
            // Check approval status in profile
            let { data: profile } = await this.client
              .from(this.profilesTable)
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            if (!profile && session.user.email) {
              const { data: pEmail } = await this.client
                .from(this.profilesTable)
                .select("*")
                .eq("email", session.user.email)
                .maybeSingle();
              profile = pEmail;
            }

            if (!profile || profile.role === "pending_approval" || profile.approved === false) {
              console.warn("Session revoked: User pending Super Admin approval or not found in database");
              await this.client.auth.signOut();
              this.clearUserSession();
              return;
            }
          }
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
    if (!user) {
      this.currentUser = null;
      this.isAdmin = false;
      this.updateUIForSession();
      return;
    }

    const email = (user.email || "").toLowerCase().trim();
    const isSuperAdmin = (email === this.superAdminEmail.toLowerCase().trim());

    // HARD SECURITY GATE: Double check approval before granting UI access
    if (!isSuperAdmin) {
      let { data: profile } = await this.client
        .from(this.profilesTable)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile && user.email) {
        const { data: pEmail } = await this.client
          .from(this.profilesTable)
          .select("*")
          .eq("email", user.email)
          .maybeSingle();
        profile = pEmail;
      }

      if (!profile || profile.role === "pending_approval" || profile.approved === false) {
        console.warn("setUserSession blocked unapproved or deleted user:", user.email);
        await this.client.auth.signOut();
        this.clearUserSession();
        return;
      }
    }

    this.currentUser = user;

    if (isSuperAdmin) {
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

      // 1. Email verification check
      if (data.user && !data.user.email_confirmed_at && !isSuperAdmin) {
        await this.client.auth.signOut();
        return {
          error: {
            message: "Email not confirmed yet. Please check your email inbox and click the confirmation link before signing in."
          }
        };
      }

      // 2. Super Admin bypasses approval check
      if (isSuperAdmin) {
        await this.setUserSession(data.user);
        return { data };
      }

      // 3. Super Admin Approval Verification
      try {
        let { data: profile } = await this.client
          .from(this.profilesTable)
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile && data.user.email) {
          const { data: profileByEmail } = await this.client
            .from(this.profilesTable)
            .select("*")
            .eq("email", data.user.email)
            .maybeSingle();
          profile = profileByEmail;
        }

        if (!profile) {
          await this.client.auth.signOut();
          return {
            error: {
              message: "Access Denied: Your account record was declined or deleted by the Super Admin."
            }
          };
        }

        const userRole = (profile.role || "").toLowerCase().trim();
        const isPending = (userRole === "pending_approval" || profile.approved === false);

        if (isPending) {
          await this.client.auth.signOut();
          return {
            error: {
              message: "Account pending approval. Your email is verified, but your account must be approved by the Super Admin before you can log in."
            }
          };
        }
      } catch (checkErr) {
        console.warn("Approval status check notice:", checkErr);
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
      const currentUrl = (window.location.origin && window.location.origin !== "null")
        ? (window.location.origin + window.location.pathname)
        : window.location.href.split("#")[0].split("?")[0];

      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: currentUrl,
        },
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const isConfirmed = !!data.user.email_confirmed_at;
        // Attempt upsert with approved: false and role: "pending_approval"
        const { error: upsertErr } = await this.client.from(this.profilesTable).upsert([
          {
            id: data.user.id,
            email: data.user.email,
            role: "pending_approval",
            approved: false,
            confirmed: isConfirmed,
            created_at: new Date().toISOString(),
          }
        ]);

        if (upsertErr) {
          // Fallback if 'approved' column is not in schema
          console.warn("Retrying profile upsert without approved column:", upsertErr.message);
          await this.client.from(this.profilesTable).upsert([
            {
              id: data.user.id,
              email: data.user.email,
              role: "pending_approval",
              confirmed: isConfirmed,
              created_at: new Date().toISOString(),
            }
          ]);
        }
      }

      return { data, requiresConfirmation: true };
    } catch (err) {
      return { error: { message: err.message || "Registration failed" } };
    }
  }

  // SUPABASE AUTH: RESEND CONFIRMATION EMAIL
  async resendConfirmationEmail(email) {
    if (!this.client || !email) return { error: { message: "Valid email is required" } };

    try {
      const currentUrl = (window.location.origin && window.location.origin !== "null")
        ? (window.location.origin + window.location.pathname)
        : window.location.href.split("#")[0].split("?")[0];

      const { data, error } = await this.client.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: currentUrl,
        },
      });

      if (error) return { error };
      return { data, success: true };
    } catch (err) {
      return { error: { message: err.message || "Failed to resend confirmation email" } };
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

      const TEN_PLUS_YEARS_SECONDS = 315576000; // 10+ Years (315,576,000 seconds)
      let publicUrl = "";
      try {
        const { data: signedData } = await this.client.storage
          .from(this.bucketName)
          .createSignedUrl(storagePath, TEN_PLUS_YEARS_SECONDS);
        publicUrl = signedData ? signedData.signedUrl : "";
      } catch (e) {
        console.warn("Signed URL error:", e);
      }

      if (!publicUrl) {
        try {
          const { data: pubData } = this.client.storage.from(this.bucketName).getPublicUrl(storagePath);
          if (pubData && pubData.publicUrl) publicUrl = pubData.publicUrl;
        } catch (e) {}
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

  // GET OR REFRESH 10+ YEARS SIGNED VIEW URL FOR A SPECIFIC PDF
  async getPdfViewUrl(storagePath, fallbackUrl = "") {
    if (!this.client || !storagePath) return fallbackUrl;
    const TEN_PLUS_YEARS_SECONDS = 315576000; // 10+ Years

    try {
      const { data: signedData, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(storagePath, TEN_PLUS_YEARS_SECONDS);

      if (signedData && signedData.signedUrl) {
        return signedData.signedUrl;
      }
    } catch (err) {
      console.warn("getPdfViewUrl error:", err);
    }

    try {
      const { data: pubData } = this.client.storage.from(this.bucketName).getPublicUrl(storagePath);
      if (pubData && pubData.publicUrl) return pubData.publicUrl;
    } catch (e) {}

    return fallbackUrl;
  }

  // ADMIN API: FETCH ALL GENERATED PDFS (AUTO-RESOLVES 10+ YEARS VALID VIEW URLS)
  async fetchPdfHistory() {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      // Auto-ensure 10+ years active signed URLs for all PDFs in Superadmin console
      const TEN_PLUS_YEARS_SECONDS = 315576000; // 10+ Years
      const paths = data.map((r) => r.storage_path || r.filename).filter(Boolean);

      if (paths.length > 0) {
        try {
          const { data: signedList } = await this.client.storage
            .from(this.bucketName)
            .createSignedUrls(paths, TEN_PLUS_YEARS_SECONDS);

          if (signedList && Array.isArray(signedList)) {
            const urlMap = {};
            signedList.forEach((item) => {
              if (item && item.signedUrl) {
                urlMap[item.path] = item.signedUrl;
              }
            });

            data.forEach((r) => {
              const path = r.storage_path || r.filename;
              if (urlMap[path]) {
                r.public_url = urlMap[path];
              }
            });
          }
        } catch (signErr) {
          console.warn("Batch signed URLs notice:", signErr);
        }
      }

      return data;
    } catch (e) {
      return [];
    }
  }

  // REGULAR USER API: FETCH ONLY MY GENERATED PDFS (AUTO-RESOLVES 10+ YEARS VALID VIEW URLS)
  async fetchMyPdfHistory() {
    if (!this.client || !this.currentUser) return [];
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .or(`user_id.eq.${this.currentUser.id},user_email.eq.${this.currentUser.email}`)
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      const TEN_PLUS_YEARS_SECONDS = 315576000; // 10+ Years
      const paths = data.map((r) => r.storage_path || r.filename).filter(Boolean);

      if (paths.length > 0) {
        try {
          const { data: signedList } = await this.client.storage
            .from(this.bucketName)
            .createSignedUrls(paths, TEN_PLUS_YEARS_SECONDS);

          if (signedList && Array.isArray(signedList)) {
            const urlMap = {};
            signedList.forEach((item) => {
              if (item && item.signedUrl) {
                urlMap[item.path] = item.signedUrl;
              }
            });

            data.forEach((r) => {
              const path = r.storage_path || r.filename;
              if (urlMap[path]) {
                r.public_url = urlMap[path];
              }
            });
          }
        } catch (signErr) {
          console.warn("Batch signed URLs notice:", signErr);
        }
      }

      return data;
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

  // ADMIN API: APPROVE USER ACCOUNT (SUPER ADMIN APPROVAL)
  async approveUser(userId, userEmail) {
    if (!this.client) return false;

    try {
      // 1. Try calling the PostgreSQL RPC function (bypasses RLS issues)
      try {
        const { data: rpcSuccess, error: rpcErr } = await this.client.rpc("approve_user_by_admin", {
          target_user_id: userId || null,
          target_user_email: userEmail || null,
        });

        if (!rpcErr && rpcSuccess) {
          console.log("User approved via RPC approve_user_by_admin ⚡");
          return true;
        }
      } catch (rpcEx) {
        console.warn("RPC approve notice, falling back to direct table update:", rpcEx);
      }

      // 2. Direct table update fallback
      let updateSuccess = false;
      const { data: d1, error: err1 } = await this.client
        .from(this.profilesTable)
        .update({ role: "user", approved: true, confirmed: true })
        .eq("id", userId)
        .select();

      if (!err1 && d1 && d1.length > 0) {
        updateSuccess = true;
      } else {
        // Fallback without approved column
        const { data: d2, error: err2 } = await this.client
          .from(this.profilesTable)
          .update({ role: "user", confirmed: true })
          .eq("id", userId)
          .select();
        if (!err2 && d2 && d2.length > 0) updateSuccess = true;
      }

      if (!updateSuccess && userEmail) {
        const { data: d3, error: errEmail } = await this.client
          .from(this.profilesTable)
          .update({ role: "user", confirmed: true })
          .eq("email", userEmail)
          .select();
        if (!errEmail && d3 && d3.length > 0) updateSuccess = true;
      }

      return updateSuccess;
    } catch (err) {
      console.error("Approve User Error:", err);
      return false;
    }
  }

  // ADMIN API: DELETE USER ACCOUNT (INSTANT CASCADE CLEANUP)
  async deleteUserRecord(userId, userEmail) {
    if (!this.client) return false;

    if (userEmail && userEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Primary Super Admin account cannot be deleted!");
      return false;
    }

    try {
      // 1. Try calling PostgreSQL RPC function (deletes from profiles, farmer_cards, and auth.users)
      try {
        const { data: rpcSuccess, error: rpcErr } = await this.client.rpc("delete_user_by_admin", {
          target_user_id: userId || null,
          target_user_email: userEmail || null,
        });

        if (!rpcErr && rpcSuccess) {
          console.log("User deleted via RPC delete_user_by_admin ⚡");
          return true;
        }
        if (rpcErr) {
          console.warn("RPC delete notice, falling back to direct table delete:", rpcErr.message);
        }
      } catch (rpcEx) {
        console.warn("RPC delete call notice:", rpcEx);
      }

      // 2. Cascade delete associated farmer_cards to avoid foreign key / constraint locks
      try {
        if (userId) {
          await this.client.from(this.tableName).delete().eq("user_id", userId);
        }
        if (userEmail) {
          await this.client.from(this.tableName).delete().eq("user_email", userEmail);
        }
      } catch (cardErr) {
        console.warn("Cascade delete farmer_cards notice:", cardErr);
      }

      // 3. Delete from profiles table with verification
      let deleteSuccess = false;
      if (userId) {
        const { data, error, count } = await this.client
          .from(this.profilesTable)
          .delete({ count: "exact" })
          .eq("id", userId)
          .select();

        if (!error && ((data && data.length > 0) || count > 0)) {
          deleteSuccess = true;
        }
      }

      // 4. Fallback / supplementary delete from profiles table by email
      if (!deleteSuccess && userEmail) {
        const { data, error, count } = await this.client
          .from(this.profilesTable)
          .delete({ count: "exact" })
          .eq("email", userEmail)
          .select();

        if (!error && ((data && data.length > 0) || count > 0)) {
          deleteSuccess = true;
        }
      }

      if (!deleteSuccess) {
        console.warn("Delete completed with 0 rows removed. Supabase RLS policy is likely blocking delete.");
      }

      return deleteSuccess;
    } catch (err) {
      console.error("Delete User Error:", err);
      return false;
    }
  }
}

// Global instance
window.supabaseManager = new SupabaseManager();
