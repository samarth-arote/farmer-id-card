/* ==========================================================================
   FARMER CARD GENERATOR - STANDALONE ADMIN DASHBOARD MODULE (admin.js)
   Handles Admin Console UI, PDF Storage Management, User Roles & Analytics
   ========================================================================== */

class AdminConsoleManager {
  constructor() {
    this.modal = null;
    this.btnOpen = null;
    this.btnClose = null;

    this.tabPdfs = null;
    this.tabUsers = null;
    this.contentPdfs = null;
    this.contentUsers = null;

    this.searchInput = null;
    this.btnRefresh = null;
    this.btnAddUser = null;

    this.tablePdfsBody = null;
    this.tableUsersBody = null;

    this.cachedPdfList = [];
    this.cachedUsersList = [];

    this.superAdminEmail = "sukaleshashikant@gmail.com";

    this.init();
  }

  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.bindElements();
      this.bindEvents();
    });
  }

  bindElements() {
    this.modal = document.getElementById("adminDashboardModal");
    this.btnOpen = document.getElementById("btnAdminDashboard");
    this.btnClose = document.getElementById("btnCloseAdmin");

    this.tabPdfs = document.getElementById("tabAdminPdfs");
    this.tabUsers = document.getElementById("tabAdminUsers");
    this.contentPdfs = document.getElementById("contentAdminPdfs");
    this.contentUsers = document.getElementById("contentAdminUsers");

    this.searchInput = document.getElementById("inputSearchPdf");
    this.btnRefresh = document.getElementById("btnRefreshPdfs");
    this.btnAddUser = document.getElementById("btnAddUser");

    this.tablePdfsBody = document.getElementById("tablePdfsBody");
    this.tableUsersBody = document.getElementById("tableUsersBody");
    this.tablePendingApprovalUsersBody = document.getElementById("tablePendingApprovalUsersBody");
    this.tableUnconfirmedUsersBody = document.getElementById("tableUnconfirmedUsersBody");
  }

  bindEvents() {
    if (this.btnOpen) {
      this.btnOpen.addEventListener("click", () => this.openConsole());
    }

    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.closeConsole());
    }

    if (this.tabPdfs && this.tabUsers) {
      this.tabPdfs.addEventListener("click", () => {
        this.tabPdfs.classList.add("active");
        this.tabUsers.classList.remove("active");
        this.contentPdfs.classList.remove("hidden");
        this.contentUsers.classList.add("hidden");
      });

      this.tabUsers.addEventListener("click", () => {
        this.tabUsers.classList.add("active");
        this.tabPdfs.classList.remove("active");
        this.contentUsers.classList.remove("hidden");
        this.contentPdfs.classList.add("hidden");
      });
    }

    if (this.btnRefresh) {
      this.btnRefresh.addEventListener("click", () => this.loadData());
    }

    if (this.btnAddUser) {
      this.btnAddUser.addEventListener("click", () => this.addUserPrompt());
    }

    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => this.filterPdfTable());
    }
  }

  async openConsole() {
    if (window.fluidGradientEngine) window.fluidGradientEngine.applyRandomGradient();
    document.body.style.overflow = "hidden";
    if (this.modal) this.modal.classList.remove("hidden");
    await this.loadData();
  }

  closeConsole() {
    document.body.style.overflow = "";
    if (this.modal) this.modal.classList.add("hidden");
  }

  async loadData() {
    if (!window.supabaseManager) return;

    this.renderLoading();

    const pdfs = await window.supabaseManager.fetchPdfHistory();
    const users = await window.supabaseManager.fetchUsersList();

    this.cachedPdfList = pdfs;
    this.cachedUsersList = users;

    this.updateStats(pdfs.length, users);
    this.renderPdfsTable(pdfs);
    this.renderUsersTable(users);
  }

  renderLoading() {
    if (this.tablePdfsBody) {
      this.tablePdfsBody.innerHTML = this.renderLoadingRow(6, "Loading PDF records from Supabase…");
    }
    if (this.tableUsersBody) {
      this.tableUsersBody.innerHTML = this.renderLoadingRow(6, "Loading user records from Supabase…");
    }
    if (this.tablePendingApprovalUsersBody) {
      this.tablePendingApprovalUsersBody.innerHTML = this.renderLoadingRow(5, "Loading pending approvals…");
    }
  }

  renderLoadingRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="text-center admin-loader-cell">
      <div class="admin-inline-loader" role="status" aria-live="polite">
        <img src="assets/logo.png" alt="" class="admin-loader-logo">
        <span class="admin-loader-spinner" aria-hidden="true"></span>
        <span>${message}</span>
      </div>
    </td></tr>`;
  }

  updateStats(pdfCount, users = []) {
    const statPdfs = document.getElementById("statTotalPdfs");
    const statUsers = document.getElementById("statTotalUsers");
    const statPending = document.getElementById("statPendingApprovals");
    const statStorage = document.getElementById("statStorageStatus");

    const usersList = Array.isArray(users) ? users : [];
    const pendingApprovals = usersList.filter((u) => {
      const email = (u.email || "").toLowerCase().trim();
      const isSuper = email === this.superAdminEmail.toLowerCase().trim();
      return !isSuper && (u.role === "pending_approval" || u.approved === false);
    });

    if (statPdfs) statPdfs.textContent = pdfCount;
    if (statUsers) statUsers.textContent = usersList.length;
    if (statPending) statPending.textContent = pendingApprovals.length;
    if (statStorage) statStorage.textContent = "Supabase Active 🟢";
  }

  renderPdfsTable(pdfs) {
    if (!this.tablePdfsBody) return;

    if (pdfs.length === 0) {
      this.tablePdfsBody.innerHTML = `<tr><td colspan="6" class="text-center">No PDFs generated yet. Create your first card!</td></tr>`;
      return;
    }

    const currentUserEmail = (window.supabaseManager && window.supabaseManager.currentUser && window.supabaseManager.currentUser.email) || "";
    const isSuperAdmin = (currentUserEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim());

    this.tablePdfsBody.innerHTML = pdfs.map((row) => {
      const dateStr = row.created_at ? new Date(row.created_at).toLocaleString() : "N/A";
      return `
        <tr>
          <td>${dateStr}</td>
          <td><strong>${row.english_name || "Farmer"}</strong><br><small class="text-muted">${row.marathi_name || ""}</small></td>
          <td><code>${row.aadhaar || "N/A"}</code></td>
          <td><code>${row.card_number || "N/A"}</code></td>
          <td><span class="user-pill">${row.user_email || "Admin"}</span></td>
          <td class="action-cell">
            ${(row.public_url || row.storage_path) ? `
              <a href="${row.public_url || '#'}" target="_blank" class="btn-action btn-view" title="View PDF (10+ Years Validity)" onclick="window.adminConsole.viewPdf(event, '${row.storage_path || row.filename}', '${row.public_url || ''}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                View
              </a>
            ` : ""}
            ${isSuperAdmin ? `
              <button type="button" class="btn-action btn-edit-card" onclick="window.adminConsole.editPdf('${row.id}')" title="Super Admin: Edit Form Details & Replace PDF">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Card
              </button>
            ` : ""}
            <button type="button" class="btn-action btn-delete" onclick="window.adminConsole.deletePdf('${row.id}', '${row.storage_path}')" title="Delete PDF">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  renderUsersTable(users) {
    const tablePendingBody = document.getElementById("tablePendingApprovalUsersBody");
    const tableUsersBody = document.getElementById("tableUsersBody");
    const tableUnconfirmedBody = document.getElementById("tableUnconfirmedUsersBody");

    const pendingApprovalUsers = [];
    const confirmedUsers = [];
    const unconfirmedUsers = [];

    users.forEach((u) => {
      const email = (u.email || "").toLowerCase().trim();
      const isSuper = email === this.superAdminEmail.toLowerCase().trim();

      if (!isSuper && (u.role === "pending_approval" || u.approved === false)) {
        pendingApprovalUsers.push(u);
      } else if (u.confirmed !== false) {
        confirmedUsers.push(u);
      } else {
        unconfirmedUsers.push(u);
      }
    });

    if (tablePendingBody) {
      if (pendingApprovalUsers.length === 0) {
        tablePendingBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 16px; color: var(--text-muted);">No users awaiting Super Admin approval. All clear! ✨</td></tr>`;
      } else {
        tablePendingBody.innerHTML = pendingApprovalUsers.map((u) => this.renderPendingApprovalRow(u)).join("");
      }
    }

    if (tableUsersBody) {
      if (confirmedUsers.length === 0) {
        tableUsersBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 16px; color: var(--text-muted);">No confirmed users yet.</td></tr>`;
      } else {
        tableUsersBody.innerHTML = confirmedUsers.map((u) => this.renderUserRow(u, true)).join("");
      }
    }

    if (tableUnconfirmedBody) {
      if (unconfirmedUsers.length === 0) {
        tableUnconfirmedBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 16px; color: var(--text-muted);">No pending email confirmation users.</td></tr>`;
      } else {
        tableUnconfirmedBody.innerHTML = unconfirmedUsers.map((u) => this.renderUserRow(u, false)).join("");
      }
    }
  }

  renderPendingApprovalRow(u) {
    const createdDate = u.created_at ? new Date(u.created_at) : new Date();
    const dateStr = createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isEmailVerified = u.confirmed !== false;

    return `
      <tr class="pending-approval-row">
        <td><code>${(u.id || "1").slice(0, 8)}...</code></td>
        <td><strong>${u.email}</strong></td>
        <td>
          <span class="status-badge ${isEmailVerified ? "confirmed" : "pending"}">
            ${isEmailVerified ? "Email Verified 🟢" : "Awaiting Verification 🟡"}
          </span>
        </td>
        <td>${dateStr}</td>
        <td class="action-cell">
          <button type="button" class="btn-action btn-approve" onclick="window.adminConsole.approveUser('${u.id}', '${u.email}')" title="Approve user for full login access">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Approve Access
          </button>
          <button type="button" class="btn-action btn-decline" onclick="window.adminConsole.declineUser('${u.id}', '${u.email}')" title="Decline and delete user record">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Decline & Delete
          </button>
        </td>
      </tr>
    `;
  }

  renderUserRow(u, isConfirmed) {
    const createdDate = u.created_at ? new Date(u.created_at) : new Date();
    const dateStr = createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const isSuperAdmin = (u.email && u.email.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim());
    const isAdmin = isSuperAdmin || (u.role === "admin");

    return `
      <tr>
        <td><code>${(u.id || "1").slice(0, 8)}...</code></td>
        <td><strong>${u.email}</strong></td>
        <td>
          ${isSuperAdmin ? `<span class="role-badge super-admin">SUPER ADMIN 👑</span>` : `<span class="role-badge ${isAdmin ? "admin" : "user"}">${u.role || "user"}</span>`}
        </td>
        <td>
          <span class="status-badge ${isConfirmed ? "confirmed" : "pending"}">
            ${isConfirmed ? "Confirmed 🟢" : "Pending Confirmation 🟡"}
          </span>
        </td>
        <td>${dateStr}</td>
        <td class="action-cell">
          ${isSuperAdmin ? `
            <span class="badge-protected">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Protected Account
            </span>
          ` : isConfirmed ? `
            <button type="button" class="btn-action ${isAdmin ? "btn-demote" : "btn-promote"}" onclick="window.adminConsole.toggleRole('${u.id}', '${u.email}', '${isAdmin ? "user" : "admin"}')">
              ${isAdmin ? "Demote to User" : "Promote to Admin"}
            </button>
            <button type="button" class="btn-action btn-delete" onclick="window.adminConsole.deleteUser('${u.id}', '${u.email}')" title="Delete User">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete User
            </button>
          ` : `
            <button type="button" class="btn-action btn-delete" onclick="window.adminConsole.deleteUser('${u.id}', '${u.email}')" title="Delete Pending User">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete User
            </button>
          `}
        </td>
      </tr>
    `;
  }

  filterPdfTable() {
    if (!this.searchInput) return;
    const query = this.searchInput.value.toLowerCase().trim();

    if (!query) {
      this.renderPdfsTable(this.cachedPdfList);
      return;
    }

    const filtered = this.cachedPdfList.filter((item) => {
      return (
        (item.english_name && item.english_name.toLowerCase().includes(query)) ||
        (item.marathi_name && item.marathi_name.toLowerCase().includes(query)) ||
        (item.aadhaar && item.aadhaar.includes(query)) ||
        (item.card_number && item.card_number.includes(query)) ||
        (item.filename && item.filename.toLowerCase().includes(query)) ||
        (item.user_email && item.user_email.toLowerCase().includes(query))
      );
    });

    this.renderPdfsTable(filtered);
  }

  async viewPdf(event, storagePath, currentUrl) {
    if (!storagePath && !currentUrl) return;
    if (event) event.preventDefault();

    let targetUrl = currentUrl;
    if (window.supabaseManager) {
      const freshUrl = await window.supabaseManager.getPdfViewUrl(storagePath, currentUrl);
      if (freshUrl) targetUrl = freshUrl;
    }

    if (targetUrl && targetUrl !== "#") {
      window.open(targetUrl, "_blank");
    } else {
      alert("Unable to open PDF. File not found in storage.");
    }
  }

  async deletePdf(id, storagePath) {
    if (!confirm("Are you sure you want to permanently delete this PDF record from Supabase Storage & Database?")) {
      return;
    }

    const ok = await window.supabaseManager.deletePdfRecord(id, storagePath);
    if (ok) {
      alert("PDF record deleted successfully.");
      await this.loadData();
    } else {
      alert("Failed to delete PDF record.");
    }
  }

  editPdf(id) {
    const record = this.cachedPdfList.find(x => x.id === id);
    if (!record) {
      alert("PDF card record not found.");
      return;
    }
    const currentUserEmail = (window.supabaseManager && window.supabaseManager.currentUser && window.supabaseManager.currentUser.email) || "";
    if (currentUserEmail.toLowerCase().trim() !== this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Only the Super Admin is authorized to edit cards and replace PDFs.");
      return;
    }

    this.closeConsole();
    if (window.startSuperAdminEditCard) {
      window.startSuperAdminEditCard(record);
    }
  }

  async toggleRole(userId, userEmail, newRole) {
    if (userEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Primary Super Admin account role cannot be altered!");
      return;
    }

    if (!confirm(`Are you sure you want to change role for "${userEmail}" to "${newRole}"?`)) {
      return;
    }

    const ok = await window.supabaseManager.updateUserRole(userId, userEmail, newRole);
    if (ok) {
      alert(`User role updated to ${newRole}.`);
      await this.loadData();
    } else {
      alert("Failed to update user role.");
    }
  }

  async addUserPrompt() {
    const email = prompt("Enter new user's email address:");
    if (!email || !email.trim()) return;

    const password = prompt("Enter password for new user (min 6 characters):");
    if (!password || password.trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    const res = await window.supabaseManager.createUserAccount(email, password, "user");
    if (res && res.error) {
      alert(`Error creating user: ${res.error.message}`);
    } else {
      alert(`User account "${email}" created successfully! A confirmation email has been dispatched.`);
      await this.loadData();
    }
  }

  async deleteUser(userId, userEmail) {
    if (userEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Primary Super Admin account cannot be deleted!");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user account "${userEmail}"?`)) {
      return;
    }

    const ok = await window.supabaseManager.deleteUserRecord(userId, userEmail);
    if (ok) {
      alert(`User account "${userEmail}" deleted successfully.`);
      await this.loadData();
    } else {
      alert(`Action could not be completed on Supabase.\n\nSupabase Row Level Security (RLS) is blocking the DELETE request for this user record.\n\nPlease run the provided SQL script in your Supabase SQL Editor to grant admin deletion and management permissions.`);
    }
  }

  async approveUser(userId, userEmail) {
    if (!confirm(`Approve full access for user "${userEmail}"?`)) {
      return;
    }

    const ok = await window.supabaseManager.approveUser(userId, userEmail);
    if (ok) {
      alert(`User "${userEmail}" has been approved! They can now sign in.`);
      await this.loadData();
    } else {
      alert("Failed to approve user.");
    }
  }

  async declineUser(userId, userEmail) {
    if (!confirm(`Are you sure you want to DECLINE user "${userEmail}"?\n\nThis will permanently delete their account record.`)) {
      return;
    }

    const ok = await window.supabaseManager.deleteUserRecord(userId, userEmail);
    if (ok) {
      alert(`User "${userEmail}" has been declined and their record was deleted.`);
      await this.loadData();
    } else {
      alert("Failed to decline user.");
    }
  }
}

// REGULAR USER PDF HISTORY MODAL MANAGER
class UserHistoryManager {
  constructor() {
    this.modal = null;
    this.btnOpen = null;
    this.btnClose = null;
    this.tableBody = null;

    this.init();
  }

  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.bindElements();
    });
  }

  bindElements() {
    this.modal = document.getElementById("userHistoryModal");
    this.btnOpen = document.getElementById("btnUserHistory");
    this.btnClose = document.getElementById("btnCloseUserHistory");
    this.tableBody = document.getElementById("tableMyPdfsBody");

    if (this.btnOpen) {
      this.btnOpen.addEventListener("click", () => this.openModal());
    }

    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.closeModal());
    }
  }

  async openModal() {
    if (window.fluidGradientEngine) window.fluidGradientEngine.applyRandomGradient();
    document.body.style.overflow = "hidden";
    if (this.modal) this.modal.classList.remove("hidden");
    await this.loadMyData();
  }

  closeModal() {
    document.body.style.overflow = "";
    if (this.modal) this.modal.classList.add("hidden");
  }

  async loadMyData() {
    if (!window.supabaseManager) return;
    if (this.tableBody) {
      this.tableBody.innerHTML = `<tr><td colspan="5" class="text-center admin-loader-cell">
        <div class="admin-inline-loader" role="status" aria-live="polite">
          <img src="assets/logo.png" alt="" class="admin-loader-logo">
          <span class="admin-loader-spinner" aria-hidden="true"></span>
          <span>Loading your PDF history…</span>
        </div>
      </td></tr>`;
    }

    const pdfs = await window.supabaseManager.fetchMyPdfHistory();
    this.renderMyPdfsTable(pdfs);
  }

  renderMyPdfsTable(pdfs) {
    if (!this.tableBody) return;

    if (pdfs.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No PDF cards generated yet. Create and download your first card!</td></tr>`;
      return;
    }

    this.tableBody.innerHTML = pdfs.map((row) => {
      const dateStr = row.created_at ? new Date(row.created_at).toLocaleString() : "N/A";
      return `
        <tr>
          <td>${dateStr}</td>
          <td><strong>${row.english_name || "Farmer"}</strong><br><small class="text-muted">${row.marathi_name || ""}</small></td>
          <td><code>${row.aadhaar || "N/A"}</code></td>
          <td><code>${row.card_number || "N/A"}</code></td>
          <td>
            ${(row.public_url || row.storage_path) ? `
              <a href="${row.public_url || '#'}" target="_blank" class="btn-action btn-view" title="Download / View PDF (10+ Years Validity)" onclick="window.userHistory.viewPdf(event, '${row.storage_path || row.filename}', '${row.public_url || ''}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download PDF
              </a>
            ` : `<span class="text-muted">Saved</span>`}
          </td>
        </tr>
      `;
    }).join("");
  }

  async viewPdf(event, storagePath, currentUrl) {
    if (!storagePath && !currentUrl) return;
    if (event) event.preventDefault();

    let targetUrl = currentUrl;
    if (window.supabaseManager) {
      const freshUrl = await window.supabaseManager.getPdfViewUrl(storagePath, currentUrl);
      if (freshUrl) targetUrl = freshUrl;
    }

    if (targetUrl && targetUrl !== "#") {
      window.open(targetUrl, "_blank");
    } else {
      alert("Unable to open PDF. File not found in storage.");
    }
  }
}

// DYNAMIC RANDOM FLUID GRADIENT ENGINE
class FluidRandomGradientEngine {
  constructor() {
    this.palettes = [
      ["rgba(10, 30, 20, 0.94)", "rgba(24, 78, 54, 0.90)", "rgba(5, 50, 32, 0.92)", "rgba(18, 61, 45, 0.94)"],
      ["rgba(8, 28, 35, 0.94)", "rgba(20, 85, 75, 0.90)", "rgba(10, 48, 58, 0.92)", "rgba(15, 65, 52, 0.94)"],
      ["rgba(22, 32, 12, 0.94)", "rgba(65, 85, 22, 0.90)", "rgba(38, 62, 18, 0.92)", "rgba(28, 48, 14, 0.94)"],
      ["rgba(18, 22, 38, 0.94)", "rgba(32, 75, 95, 0.90)", "rgba(22, 48, 68, 0.92)", "rgba(20, 38, 58, 0.94)"],
      ["rgba(30, 15, 25, 0.94)", "rgba(75, 30, 60, 0.90)", "rgba(50, 20, 42, 0.92)", "rgba(40, 18, 35, 0.94)"]
    ];

    document.addEventListener("DOMContentLoaded", () => {
      this.applyRandomGradient();
    });
  }

  applyRandomGradient() {
    const randomPalette = this.palettes[Math.floor(Math.random() * this.palettes.length)];
    const randomAngle = Math.floor(Math.random() * 360);
    const randomSpeed = (8 + Math.random() * 8).toFixed(1);

    document.documentElement.style.setProperty("--random-grad-angle", `${randomAngle}deg`);
    document.documentElement.style.setProperty("--random-c1", randomPalette[0]);
    document.documentElement.style.setProperty("--random-c2", randomPalette[1]);
    document.documentElement.style.setProperty("--random-c3", randomPalette[2]);
    document.documentElement.style.setProperty("--random-c4", randomPalette[3]);
    document.documentElement.style.setProperty("--random-speed", `${randomSpeed}s`);
  }
}

// Global instances
window.fluidGradientEngine = new FluidRandomGradientEngine();
window.adminConsole = new AdminConsoleManager();
window.userHistory = new UserHistoryManager();
