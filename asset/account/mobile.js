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

window.setFAB = function (
  type,
  id = null
) {

  /*
   * Desktop protection.
   */
  if (
    window.isMobileViewSafe &&
    !window.isMobileViewSafe()
  ) {

    document
      .querySelectorAll(".mobile-fab")
      .forEach(el => el.remove());

    return;
  }


  /*
   * Build a stable state key.
   */
  const stateKey =
    `${type}:${id ?? ""}`;


  /*
   * If the correct FAB is already present,
   * do not destroy and recreate it.
   */
  const existing =
    document.querySelector(".mobile-fab");


  if (
    existing &&
    existing.dataset.fabState ===
    stateKey
  ) {

    return;

  }


  /*
   * Remove old FAB only when state actually changes.
   */
  document
    .querySelectorAll(".mobile-fab")
    .forEach(el => el.remove());


  const fab =
    document.createElement("div");


  fab.className =
    "mobile-fab";


  fab.dataset.fabState =
    stateKey;


  let html = "";


  switch (type) {

    case "list":

      if (id === "cashbook") {

        html = `
          <button
            onclick="openAddAccount()"
            class="fab-purple"
          >
            + Account
          </button>
        `;

      } else {

        html = `
          <button
            onclick="openAddCustomer()"
            class="fab-green"
          >
            + Customer
          </button>
        `;

      }

      break;


    case "customerDetail":

      html = `
        <button
          onclick="openTxn('gave')"
          class="fab-red"
        >
          Gave
        </button>

        <button
          onclick="openTxn('got')"
          class="fab-green"
        >
          Got
        </button>
      `;

      break;


    case "cashbookDetail":

      html = `
        <button
          onclick="openCashEntryModal('${id}','out')"
          class="fab-red"
        >
          Out
        </button>

        <button
          onclick="openCashEntryModal('${id}','in')"
          class="fab-green"
        >
          In
        </button>
      `;

      break;


    case "dashboard":

      html = `
        <button
          onclick="mobileGo('dashboard')"
          class="fab-blue"
        >
          Refresh
        </button>
      `;

      break;

  }


  /*
   * Unknown FAB state: don't insert an empty wrapper.
   */
  if (!html) {
    return;
  }


  fab.innerHTML =
    html;


  document.body.appendChild(
    fab
  );

};

(() => {

  /* =========================================================
     MOBILE BREAKPOINT
     =========================================================
     Keep this synchronized with:

       @media (max-width: 768px)

     in account.css.
     ========================================================= */

  const MOBILE_BREAKPOINT = 768;


  const isMobileView = () =>
    window.innerWidth <= MOBILE_BREAKPOINT;


  /*
   * Expose safe mobile detection for functions
   * outside this IIFE, including setFAB().
   */
  window.isMobileViewSafe =
    isMobileView;


  /* =========================
     STATE CONTROL
  ========================= */

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

        requestAnimationFrame(() => {

          showDetailPanel();

          setFAB(
            "customerDetail"
          );

        });

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

        requestAnimationFrame(() => {

          showDetailPanel();


          if (
            typeof window.setFAB ===
            "function"
          ) {

            window.setFAB(
              "cashbookDetail",
              acc?.id
            );

          }

        });

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

    /*
     * -------------------------------------------------
     * 1. KEYBOARD
     * -------------------------------------------------
     *
     * If a modal input currently has focus,
     * first Back dismisses the keyboard.
     */
    const active =
        document.activeElement;


    if (
        window.innerWidth <= 768 &&
        active &&
        active.closest?.("#modal") &&
        active.matches?.(
            "input, textarea, select"
        )
    ) {

        active.blur();

        return;

    }


    /*
     * -------------------------------------------------
     * 2. CUSTOMER MULTI-SELECTION
     * -------------------------------------------------
     */
    if (
        window.innerWidth <= 768 &&
        typeof selectedTxns !==
            "undefined" &&
        selectedTxns.size > 0
    ) {

        if (
            typeof clearTxnSelection ===
            "function"
        ) {

            clearTxnSelection();

        }

        return;

    }


    /*
     * -------------------------------------------------
     * 3. CASHBOOK MULTI-SELECTION
     * -------------------------------------------------
     */
    if (
        window.innerWidth <= 768 &&
        typeof selectedCashTxns !==
            "undefined" &&
        selectedCashTxns.size > 0
    ) {

        if (
            typeof clearCashTxnSelection ===
            "function"
        ) {

            clearCashTxnSelection();

        }

        return;

    }


    /*
     * -------------------------------------------------
     * 4. OPEN MODAL
     * -------------------------------------------------
     */
    const modal =
        document.getElementById(
            "modal"
        );


    if (
        window.innerWidth <= 768 &&
        modal &&
        !modal.classList.contains(
            "hidden"
        ) &&
        modal.innerHTML.trim()
    ) {

        /*
         * Use your existing closeModal function.
         */
        if (
            typeof closeModal ===
            "function"
        ) {

            closeModal();

        } else {

            modal.classList.add(
                "hidden"
            );

            modal.innerHTML =
                "";

        }

        return;

    }
    
    const left =
      document.getElementById("leftPanel");

      

    const right =
      document.getElementById("rightPanel");


    /*
     * Main panels are required for mobile back.
     */
    if (!left || !right) {
      return;
    }


    if (isMobileView()) {

      /*
       * Return to list view.
       */
      left.style.transform =
        "translateX(0)";

      right.style.transform =
        "translateX(100%)";


      /*
       * Clear optional mobile header safely.
       *
       * Some screens may not create this element,
       * therefore never assume it exists.
       */
      const mobileHeaderHost =
        document.getElementById(
          "mobileHeaderHost"
        );


      if (mobileHeaderHost) {

        mobileHeaderHost.innerHTML = "";

      }


      /*
       * Also clear optional global mobile header
       * if a summary screen created one.
       */
      const mobileGlobalHeader =
        document.getElementById(
          "mobileGlobalHeader"
        );


      if (mobileGlobalHeader) {

        mobileGlobalHeader.innerHTML = "";

      }


      /*
       * Remove dynamically injected summary headers.
       */
      right
        .querySelector(
          ".cash-summary-header-safe"
        )
        ?.remove();


      right
        .querySelector(
          ".mobile-customer-header"
        )
        ?.remove();


      /*
       * Restore normal panel spacing.
       */
      right.style.paddingTop = "0px";

    }


    /*
     * Restore list FAB.
     */
    if (
      typeof window.setFAB ===
      "function"
    ) {

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

    if (isMobileView()) {

      sidebar.style.position = "fixed";
      sidebar.style.top = "0";
      sidebar.style.left = "0";
      sidebar.style.height = "100dvh";
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

    if (isMobileView()) {

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

  /* =========================================================
     MOBILE SWIPE BACK
     =========================================================
     Page-level swipe-back must NOT interfere with:
  
     - transaction card swipe
     - buttons
     - inputs
     - selects
     - textareas
     - links
     - modals / confirmations
     - elements explicitly marked data-no-swipe-back
  
     Transaction cards keep their own swipe behaviour.
     ========================================================= */

  let mobileSwipeBackBlocked = false;
  let mobileSwipeBackTracking = false;


  /*
   * Returns true when the touch started inside an element
   * that should manage the gesture itself.
   */
  function shouldBlockMobileSwipeBack(target) {

    if (!target || typeof target.closest !== "function") {
      return false;
    }

    return Boolean(
      target.closest(
        [
          ".txnCard",
          ".txnCard-wrapper",
          ".confirmBox",
          "button",
          "input",
          "textarea",
          "select",
          "a",
          "[data-no-swipe-back]"
        ].join(",")
      )
    );
  }


  /*
   * Start tracking a possible page-level swipe.
   */
  document.addEventListener(
    "touchstart",
    e => {

      if (!isMobileView()) return;

      const touch = e.touches?.[0];
      if (!touch) return;


      /*
       * If this touch belongs to a transaction card or
       * interactive control, leave it completely alone.
       */
      mobileSwipeBackBlocked =
        shouldBlockMobileSwipeBack(e.target);


      if (mobileSwipeBackBlocked) {

        mobileSwipeBackTracking = false;
        startX = 0;
        moveX = 0;

        return;
      }


      mobileSwipeBackTracking = true;

      startX = touch.clientX;
      moveX = touch.clientX;

    },
    { passive: true }
  );


  /*
   * Track movement only when page swipe-back owns
   * the current gesture.
   */
  document.addEventListener(
    "touchmove",
    e => {

      if (!isMobileView()) return;

      if (
        mobileSwipeBackBlocked ||
        !mobileSwipeBackTracking
      ) {
        return;
      }


      const touch = e.touches?.[0];
      if (!touch) return;

      moveX = touch.clientX;

    },
    { passive: true }
  );


  /*
   * Complete page-level swipe-back.
   */
  document.addEventListener(
    "touchend",
    () => {

      if (!isMobileView()) return;


      if (
        mobileSwipeBackBlocked ||
        !mobileSwipeBackTracking
      ) {

        mobileSwipeBackBlocked = false;
        mobileSwipeBackTracking = false;

        startX = 0;
        moveX = 0;

        return;
      }


      const diff =
        moveX - startX;


      /*
       * Existing threshold preserved.
       *
       * Right swipe greater than 100px = Back.
       */
      if (diff > 100) {

        if (
          typeof window.mobileBack ===
          "function"
        ) {

          window.mobileBack();

        }

      }


      mobileSwipeBackBlocked = false;
      mobileSwipeBackTracking = false;

      startX = 0;
      moveX = 0;

    },
    { passive: true }
  );


  /*
   * Reset gesture state if browser cancels the touch.
   */
  document.addEventListener(
    "touchcancel",
    () => {

      mobileSwipeBackBlocked = false;
      mobileSwipeBackTracking = false;

      startX = 0;
      moveX = 0;

    },
    { passive: true }
  );

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


/* =========================================================
   MOBILE KEYBOARD / FORM VISIBILITY
   =========================================================
   Purpose:

   - keep focused input visible above mobile keyboard
   - avoid changing existing modal business logic
   - work with dynamically created forms/modals
   - desktop remains untouched
   ========================================================= */

(() => {

  const isMobile = () =>
    window.innerWidth <= 768;


  /*
   * Find the nearest scrollable/form container.
   *
   * We deliberately do not depend on one specific
   * modal ID because this project creates several
   * different modal/form views dynamically.
   */
  function getMobileFormContainer(el) {

    if (!el) return null;


    return el.closest(
      [
        "[role='dialog']",
        ".modal",
        ".fixed",
        "#rightPanel",
        "#rightPanelScroll"
      ].join(",")
    );

  }


  /*
   * Ensure focused field remains visible after
   * Android/iOS opens the software keyboard.
   */
  function revealFocusedField(el) {

    if (
      !isMobile() ||
      !el
    ) {
      return;
    }


    const tag =
      el.tagName?.toLowerCase();


    if (
      tag !== "input" &&
      tag !== "textarea" &&
      tag !== "select"
    ) {
      return;
    }


    requestAnimationFrame(() => {

      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });

    });

  }


  /*
   * focusin bubbles, so this also works for inputs
   * inserted into the DOM later.
   */
  document.addEventListener(
    "focusin",
    e => {

      if (!isMobile()) return;

      const target = e.target;

      const tag =
        target?.tagName?.toLowerCase();


      if (
        tag !== "input" &&
        tag !== "textarea" &&
        tag !== "select"
      ) {
        return;
      }


      /*
       * Allow the keyboard viewport to settle first.
       */
      requestAnimationFrame(() => {

        requestAnimationFrame(() => {

          revealFocusedField(target);

        });

      });

    }
  );


  /*
   * Modern mobile browsers expose the actual visible
   * area through visualViewport.
   *
   * We do not resize/rebuild the app here.
   * We only expose the current keyboard-safe height
   * as a CSS variable.
   */
  function updateVisualViewportHeight() {

    if (!isMobile()) return;


    const viewport =
      window.visualViewport;


    const height =
      viewport?.height ||
      window.innerHeight;


    document.documentElement.style.setProperty(
      "--mobile-visible-height",
      `${Math.round(height)}px`
    );

  }


  updateVisualViewportHeight();


  if (window.visualViewport) {

    window.visualViewport.addEventListener(
      "resize",
      updateVisualViewportHeight,
      { passive: true }
    );


    window.visualViewport.addEventListener(
      "scroll",
      updateVisualViewportHeight,
      { passive: true }
    );

  }


  window.addEventListener(
    "orientationchange",
    () => {

      requestAnimationFrame(
        updateVisualViewportHeight
      );

    },
    { passive: true }
  );

})();

/* =========================================================
   MOBILE MODAL + KEYBOARD UX
   ========================================================= */

(function initMobileModalKeyboardUX() {

    if (
        window.__mobileModalKeyboardUXInstalled
    ) {

        return;

    }


    window.__mobileModalKeyboardUXInstalled =
        true;


    const isMobile = () =>
        window.innerWidth <= 768;


    /*
     * Keep focused form control visible when the
     * software keyboard opens.
     */
    document.addEventListener(
        "focusin",
        event => {

            if (!isMobile()) {
                return;
            }


            const field =
                event.target;


            if (
                !field?.matches?.(
                    "input, textarea, select"
                )
            ) {

                return;

            }


            if (
                !field.closest("#modal")
            ) {

                return;

            }


            setTimeout(
                () => {

                    try {

                        field.scrollIntoView({
                            behavior: "smooth",
                            block: "center"
                        });

                    }
                    catch (_) {}

                },
                180
            );

        }
    );


    /*
     * visualViewport gives the actual visible height
     * after the mobile keyboard opens.
     */
    if (
        window.visualViewport
    ) {

        const updateModalViewport =
            () => {

                if (!isMobile()) {
                    return;
                }


                const modal =
                    document.getElementById(
                        "modal"
                    );


                if (!modal) {
                    return;
                }


                const viewport =
                    window.visualViewport;


                modal.style.setProperty(
                    "--mobile-visual-height",
                    `${viewport.height}px`
                );

            };


        window.visualViewport.addEventListener(
            "resize",
            updateModalViewport
        );


        window.visualViewport.addEventListener(
            "scroll",
            updateModalViewport
        );


        updateModalViewport();

    }

})();