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

    this.updateStats(pdfs.length, users.length);
    this.renderPdfsTable(pdfs);
    this.renderUsersTable(users);
  }

  renderLoading() {
    if (this.tablePdfsBody) {
      this.tablePdfsBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading PDF records from Supabase...</td></tr>`;
    }
    if (this.tableUsersBody) {
      this.tableUsersBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading user records from Supabase...</td></tr>`;
    }
  }

  updateStats(pdfCount, userCount) {
    const statPdfs = document.getElementById("statTotalPdfs");
    const statUsers = document.getElementById("statTotalUsers");
    const statStorage = document.getElementById("statStorageStatus");

    if (statPdfs) statPdfs.textContent = pdfCount;
    if (statUsers) statUsers.textContent = userCount;
    if (statStorage) statStorage.textContent = "Supabase Active 🟢";
  }

  renderPdfsTable(pdfs) {
    if (!this.tablePdfsBody) return;

    if (pdfs.length === 0) {
      this.tablePdfsBody.innerHTML = `<tr><td colspan="6" class="text-center">No PDFs generated yet. Create your first card!</td></tr>`;
      return;
    }

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
            ${row.public_url ? `
              <a href="${row.public_url}" target="_blank" class="btn-action btn-view" title="View PDF">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                View
              </a>
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
    const tableUsersBody = document.getElementById("tableUsersBody");
    const tableUnconfirmedBody = document.getElementById("tableUnconfirmedUsersBody");

    const confirmedUsers = users.filter((u) => u.confirmed !== false);
    const unconfirmedUsers = users.filter((u) => u.confirmed === false);

    if (tableUsersBody) {
      if (confirmedUsers.length === 0) {
        tableUsersBody.innerHTML = `<tr><td colspan="6" class="text-center">No confirmed users yet.</td></tr>`;
      } else {
        tableUsersBody.innerHTML = confirmedUsers.map((u) => this.renderUserRow(u, true)).join("");
      }
    }

    if (tableUnconfirmedBody) {
      if (unconfirmedUsers.length === 0) {
        tableUnconfirmedBody.innerHTML = `<tr><td colspan="6" class="text-center">No pending unconfirmed users. All registered users are confirmed!</td></tr>`;
      } else {
        tableUnconfirmedBody.innerHTML = unconfirmedUsers.map((u) => this.renderUserRow(u, false)).join("");
      }
    }
  }

  renderUserRow(u, isConfirmed) {
    const createdDate = u.created_at ? new Date(u.created_at) : new Date();
    const dateStr = createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const isSuperAdmin = (u.email && u.email.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim());
    const isAdmin = isSuperAdmin || (u.role === "admin");

    const createdTime = createdDate.getTime();
    const hoursElapsed = (Date.now() - createdTime) / (1000 * 60 * 60);
    const hasPassed24h = (hoursElapsed >= 24);
    const hoursRemaining = Math.max(1, Math.ceil(24 - hoursElapsed));

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
            <button type="button" class="btn-action btn-delete" onclick="window.adminConsole.deleteUser('${u.id}', '${u.email}', true)">
              Delete User
            </button>
          ` : `
            ${hasPassed24h ? `
              <button type="button" class="btn-action btn-delete" onclick="window.adminConsole.deleteUser('${u.id}', '${u.email}', false)" title="User failed to validate email in 24h. Delete allowed.">
                Delete (Passed 24h)
              </button>
            ` : `
              <span class="badge-waiting" title="Deletion unlocks 24h after registration if email is not validated">
                ⏰ Wait ${hoursRemaining}h to delete
              </span>
            `}
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

  async deleteUser(userId, userEmail, isConfirmed = true) {
    if (userEmail.toLowerCase().trim() === this.superAdminEmail.toLowerCase().trim()) {
      alert("Action Denied: Primary Super Admin account cannot be deleted!");
      return;
    }

    const targetUser = this.cachedUsersList.find(x => x.id === userId);
    if (!isConfirmed && targetUser) {
      const createdTime = new Date(targetUser.created_at || Date.now()).getTime();
      const hoursElapsed = (Date.now() - createdTime) / (1000 * 60 * 60);

      if (hoursElapsed < 24) {
        alert(`Action Denied: Pending user registration is under 24 hours old. Admin deletion unlocks 24 hours after registration (${Math.ceil(24 - hoursElapsed)}h remaining).`);
        return;
      }
    }

    if (!confirm(`Are you sure you want to permanently delete user account "${userEmail}"?`)) {
      return;
    }

    const ok = await window.supabaseManager.deleteUserRecord(userId, userEmail);
    if (ok) {
      alert(`User account "${userEmail}" deleted successfully.`);
      await this.loadData();
    } else {
      alert("Failed to delete user account.");
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
      this.tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Loading your PDF history...</td></tr>`;
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
            ${row.public_url ? `
              <a href="${row.public_url}" target="_blank" class="btn-action btn-view">
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
