/* =========================================================
   MOBILE LAYER - STABLE PRODUCTION FIX (NO DESKTOP IMPACT)
========================================================= */

function waitForElement(selector, timeout = 3000) {
  return new Promise(resolve => {
    const start = Date.now();

    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      if (Date.now() - start > timeout) {
        return resolve(null);
      }

      requestAnimationFrame(check);
    };

    check();
  });
}


function safeRun(fn, delay = 100) {
  setTimeout(() => {
    try {
      fn();
    } catch (e) {
      console.error("Safe mobile error:", e);
    }
  }, delay);
}

window.setFAB = function (type, id = null) {

  if (!window.isMobileViewSafe?.()) {
    if (window.innerWidth > 768) return;
  }

  document.querySelectorAll(".mobile-fab").forEach(e => e.remove());

  const fab = document.createElement("div");
  fab.className = "mobile-fab";

  let html = "";

  switch (type) {

    case "list":
      if (id === "cashbook") {
        html = `<button onclick="openAddAccount()" class="fab-purple">+ Account</button>`;
      } else {
        html = `<button onclick="openAddCustomer()" class="fab-green">+ Customer</button>`;
      }
      break;

    case "customerDetail":
      html = `
        <button onclick="openTxn('gave')" class="fab-red">Gave</button>
        <button onclick="openTxn('got')" class="fab-green">Got</button>
      `;
      break;

    case "cashbookDetail":
      html = `
        <button onclick="openCashEntryModal('${id}','out')" class="fab-red">Out</button>
        <button onclick="openCashEntryModal('${id}','in')" class="fab-green">In</button>
      `;
      break;

    case "dashboard":
      html = `<button onclick="mobileGo('dashboard')" class="fab-blue">Refresh</button>`;
      break;
  }

  fab.innerHTML = html;
  document.body.appendChild(fab);
};

(() => {

  /* =========================
     STATE CONTROL
  ========================= */
  let isMobileView = () => window.innerWidth <= 768;

  let lockCustomer = false;
  let lockCashbook = false;

  let startX = 0;
  let moveX = 0;

  /* =========================
     SAFE INIT
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    if (!isMobileView()) return;

    const appRoot = document.getElementById("appRoot");
    if (appRoot) appRoot.classList.add("mobile-ui");

    if (typeof showListPanel === "function") {
      showListPanel();
    }

    if (typeof renderMobileBottomNav === "function") {
      renderMobileBottomNav();
    }
  });

  /* =========================
     SAFE FALLBACKS (PREVENT CRASH)
  ========================= */
  window.renderMobileBottomNav = window.renderMobileBottomNav || function () { };
  window.handleExcel = window.handleExcel || function () { };
  window.renderAccountLeaderboard = window.renderAccountLeaderboard || function () { };

  /* =========================
     PANEL CONTROLS
  ========================= */
  window.showListPanel = function () {
    const left = document.getElementById("leftPanel");
    const right = document.getElementById("rightPanel");

    if (!left || !right) return;

    left.style.transform = "translateX(0)";
    right.style.transform = "translateX(100%)";

    setFAB("list");
  };

  window.showDetailPanel = function () {
    const left = document.getElementById("leftPanel");
    const right = document.getElementById("rightPanel");

    if (!left || !right) return;

    left.style.transform = "translateX(-100%)";
    right.style.transform = "translateX(0)";
  };

  /* =========================
     CUSTOMER OVERRIDE SAFE
  ========================= */
  const _selectCustomer = window.selectCustomer;

  window.selectCustomer = async function (...args) {

    if (lockCustomer) return;
    lockCustomer = true;

    try {
      if (typeof _selectCustomer === "function") {
        await _selectCustomer(...args);
      }

      if (isMobileView()) {
        setTimeout(() => {
          showDetailPanel();
          setFAB("customerDetail");
        }, 80);
      }

    } catch (e) {
      console.error("Customer error:", e);
    }

    lockCustomer = false;
  };

  /* =========================
     CASHBOOK OVERRIDE SAFE
  ========================= */
  const _cashbook = window.renderCashbookReport;

  window.renderCashbookReport = function (acc, txns) {

    if (lockCashbook) return;
    lockCashbook = true;

    try {
      if (typeof _cashbook === "function") {
        _cashbook(acc, txns);
      }

      if (isMobileView()) {
        setTimeout(() => {
          showDetailPanel();
          if (typeof window.setFAB === "function") {
            window.setFAB("cashbookDetail", acc?.id);
          }
        }, 80);
      }

    } catch (e) {
      console.error("Cashbook error:", e);
    }

    lockCashbook = false;
  };

  /* =========================
     FAB SYSTEM
  ========================= */
  function removeFAB() {
    document.querySelectorAll(".mobile-fab").forEach(e => e.remove());
  }



  /* =========================
     NAVIGATION
  ========================= */
window.mobileGo = function (screen) {

  const left = document.getElementById("leftPanel");
  const right = document.getElementById("rightPanel");

  if (!left || !right) return;

  left.style.transform = "translateX(0)";
  right.style.transform = "translateX(100%)";

  removeFAB();

  // ✅ NEW: highlight active tab
  if (typeof window.setActiveNav === "function") {
    window.setActiveNav(screen);
  }

  if (screen === "customers" && typeof openCustomers === "function") {
    openCustomers();
    setFAB("list", "customer");
  }

  if (screen === "cashbook" && typeof openCashbook === "function") {
    openCashbook();
    setFAB("list", "cashbook");
  }

  if (screen === "dashboard" && typeof openDashboard === "function") {

    safeRun(() => {
      openDashboard();
    }, 150);

    safeRun(() => {
      if (typeof window.setFAB === "function") {
        window.setFAB("dashboard");
      }
    }, 300);
  }
};

  /* =========================
     SAFE BACK
  ========================= */
  window.mobileBack = function () {

    const left = document.getElementById("leftPanel");
    const right = document.getElementById("rightPanel");

    if (!left || !right) return;

    if (window.innerWidth <= 768) {

      left.style.transform = "translateX(0)";
      right.style.transform = "translateX(100%)";

      // remove header safely
      document.getElementById("mobileHeaderHost").innerHTML = "";
      right.style.paddingTop = "0px";
    }

    if (typeof window.setFAB === "function") {
      window.setFAB("list");
    }
  };

 /* =========================================
USE INLINE STYLE ONLY (BEST FIX)
No Tailwind translate conflict
========================================= */

window.addEventListener("load", () => {

  const sidebar =
    document.getElementById("sidebar");

  if (!sidebar) return;

  if (window.innerWidth < 768) {

    sidebar.style.position = "fixed";
    sidebar.style.top = "0";
    sidebar.style.left = "0";
    sidebar.style.height = "100vh";
    sidebar.style.zIndex = "50";

    sidebar.style.transform =
      "translateX(-100%)";

    sidebar.style.transition =
      "transform 0.3s ease";
  }
});


window.toggleSidebar = function () {

  const sidebar =
    document.getElementById("sidebar");

  const overlay =
    document.getElementById("sidebarOverlay");

  if (!sidebar) return;

  const isOpen =
    sidebar.style.transform ===
    "translateX(0px)";

  if (isOpen) {

    sidebar.style.transform =
      "translateX(-100%)";

    overlay.classList.add("hidden");

  } else {

    sidebar.style.transform =
      "translateX(0px)";

    overlay.classList.remove("hidden");
  }
};


function closeSidebarMobile() {

  if (window.innerWidth < 768) {

    const sidebar =
      document.getElementById("sidebar");

    const overlay =
      document.getElementById("sidebarOverlay");

    if (sidebar) {
      sidebar.style.transform =
        "translateX(-100%)";
    }

    if (overlay) {
      overlay.classList.add("hidden");
    }
  }
}

  /* =========================
     SWIPE BACK FIX
  ========================= */
  document.addEventListener("touchstart", e => {
    if (!isMobileView()) return;
    startX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!isMobileView()) return;
    moveX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener("touchend", () => {
    if (!isMobileView()) return;

    const diff = moveX - startX;

    if (diff > 100) {
      mobileBack();
    }

    startX = 0;
    moveX = 0;
  });

})();


window.mobileOpenCashSummarySafe = function (fn) {

  if (!fn || typeof fn !== "function") return;

  // desktop untouched
  if (window.innerWidth > 768) {
    fn();
    return;
  }

  if (typeof window.showDetailPanel === "function") {
    window.showDetailPanel();
  }

  // STEP 1: run original render
  fn();

  // STEP 2: WAIT UNTIL FINAL DOM SETTLES
  requestAnimationFrame(() => {

    // IMPORTANT: wait one more frame for innerHTML overwrite
    requestAnimationFrame(() => {

      window.injectCashHeaderSafe();
    });

  });
};

window.injectCashHeaderSafe = function () {

  if (window.innerWidth > 768) return;

  const panel = document.getElementById("rightPanel");
  if (!panel) return;

  // remove ONLY previous cash header (not others)
  panel.querySelector(".cash-summary-header-safe")?.remove();

  const header = document.createElement("div");

  header.className = "cash-summary-header-safe flex items-center gap-2 p-3 border-b border-gray-800 bg-[#0b1220]";

  header.innerHTML = `
    <button onclick="mobileBack()"
      class="bg-gray-800 px-3 py-1 rounded text-sm active:scale-95">
      ← Back
    </button>

    <div class="font-semibold text-white">
      Cash Summary
    </div>
  `;

  panel.prepend(header);
};


window.ensureMobileBackButton = function (title = "Back") {

  if (window.innerWidth > 768) return;

  const host = document.getElementById("mobileGlobalHeader");
  if (!host) return;

  host.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 56px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      background: #0b1220;
      border-bottom: 1px solid #1f2937;
      z-index: 999999;
    ">

      <button onclick="mobileBack()" 
        style="
          background: #1f2937;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 13px;
        ">
        ← Back
      </button>

      <div style="color: white; font-weight: 600;">
        ${title}
      </div>

    </div>
  `;
};

window.openCustomerSummaryMobile = function () {

  // 🔥 MOBILE ONLY
  if (window.innerWidth > 768) {
    openCustomerSummary();
    return;
  }

  const panel = document.getElementById("rightPanel");
  if (!panel) return;

  // 🔥 Ensure right panel is visible (if you use sliding UI)
  if (typeof window.showDetailPanel === "function") {
    window.showDetailPanel();
  }

  // Run original function first
  openCustomerSummary();

  // 🔥 Re-inject back button AFTER render (IMPORTANT FIX)
  setTimeout(() => {

    // prevent duplicate header
    if (panel.querySelector(".mobile-customer-header")) return;

    const header = document.createElement("div");
    header.className =
      "mobile-customer-header flex items-center gap-2 p-3 border-b border-gray-800 bg-[#0b1220] sticky top-0 z-20";

    header.innerHTML = `
      <button onclick="mobileBack()" 
        class="bg-gray-800 px-3 py-1 rounded text-sm active:scale-95">
        ← Back
      </button>

      <div class="font-semibold text-white">
        Customer Summary
      </div>
    `;

    panel.prepend(header);

  }, 120);
};

window.setActiveNav = function (screen) {

  const nav = document.getElementById("bottomNav");
  if (!nav) return;

  const buttons = nav.querySelectorAll(".navBtn");

  buttons.forEach(btn => btn.classList.remove("active"));

  if (screen === "customers") buttons[0]?.classList.add("active");
  if (screen === "cashbook") buttons[1]?.classList.add("active");
  if (screen === "dashboard") buttons[2]?.classList.add("active");
};

