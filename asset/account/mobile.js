/* ================================
   GLOBAL FLAGS
================================ */
let isOpeningCustomer = false;
let isOpeningCashbook = false;

const isMobile = window.innerWidth <= 768;

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {

  if (!isMobile) return;

  document.getElementById("appRoot").classList.add("mobile-ui");

  // default screen
  showListPanel();
});

/* ================================
   PANEL CONTROL (GLOBAL SAFE)
================================ */

window.showListPanel = function () {

  const left = document.getElementById("leftPanel");
  const right = document.getElementById("rightPanel");

  left.style.transform = "translateX(0)";
  right.style.transform = "translateX(100%)";

  setFAB("customerList"); // ✅ smart FAB
};

window.showDetailPanel = function () {

  const left = document.getElementById("leftPanel");
  const right = document.getElementById("rightPanel");

  if (!left || !right) return;

  left.style.transform = "translateX(-100%)";
  right.style.transform = "translateX(0)";

  // ❌ HIDE main FAB
  const mainFab = document.querySelector(".fab");
  if (mainFab) mainFab.style.display = "none";
};

/* ================================
   CUSTOMER OVERRIDE
================================ */

const oldSelectCustomer = window.selectCustomer;

window.selectCustomer = async function (id, name, phone = "") {

  if (isOpeningCustomer) return;
  isOpeningCustomer = true;

  try {
    await oldSelectCustomer(id, name, phone);



    if (isMobile) {
      setTimeout(() => {
        showDetailPanel();
        setFAB("customerDetail");   // ✅ ADD THIS LINE
      }, 80);
    }

  } catch (e) {
    console.error("Customer load error:", e);
  }

  isOpeningCustomer = false;
};

/* ================================
   CASHBOOK OVERRIDE
================================ */

const oldCashbook = window.renderCashbookReport;

window.renderCashbookReport = function (acc, txns) {

  if (isOpeningCashbook) return;
  isOpeningCashbook = true;

  try {
    oldCashbook(acc, txns);

    if (isMobile) {
      setTimeout(() => {
        showDetailPanel();
        setFAB("cashbookDetail", acc.id);   // ✅ ADD THIS
      }, 80);
    }

  } catch (e) {
    console.error("Cashbook error:", e);
  }

  isOpeningCashbook = false;
};

/* ================================
   FAB
================================ */

function attachFAB() {
  removeFAB();

  const fab = document.createElement("div");
  fab.className = "mobile-fab";

  fab.innerHTML = `
    <button onclick="openTxn('gave')" class="fab-red">Gave</button>
    <button onclick="openTxn('got')" class="fab-green">Got</button>
  `;

  document.body.appendChild(fab);
}

function attachFABCash(accId) {
  removeFAB();

  const fab = document.createElement("div");
  fab.className = "mobile-fab";

  fab.innerHTML = `
    <button onclick="openCashEntryModal('${accId}','out')" class="fab-red">Out</button>
    <button onclick="openCashEntryModal('${accId}','in')" class="fab-green">In</button>
  `;

  document.body.appendChild(fab);
}

function removeFAB() {
  document.querySelectorAll(".mobile-fab").forEach(e => e.remove());
}

/* ================================
   BACK
================================ */

window.mobileBack = function () {
  showListPanel();
  removeFAB();
};

/* ================================
   SWIPE BACK (SAFE)
================================ */

// ✅ FIX: use unique names to avoid conflict
let mobileStartX = 0;
let mobileCurrentX = 0;

document.addEventListener("touchstart", (e) => {

  if (!isMobile) return;

  mobileStartX = e.touches[0].clientX;

}, { passive: true });


document.addEventListener("touchmove", (e) => {

  if (!isMobile) return;

  mobileCurrentX = e.touches[0].clientX;

}, { passive: true });


document.addEventListener("touchend", () => {

  if (!isMobile) return;

  const diff = mobileCurrentX - mobileStartX;

  const rightPanel = document.getElementById("rightPanel");

  const isOpen =
    rightPanel.style.transform === "translateX(0px)" ||
    rightPanel.style.transform === "translateX(0%)";

  if (diff > 100 && isOpen) {
    mobileBack();
  }

  mobileStartX = 0;
  mobileCurrentX = 0;

});

window.toggleSidebar = function () {

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  const isOpen = sidebar.classList.contains("open");

  if (isOpen) {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  } else {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  }
};

document.addEventListener("DOMContentLoaded", () => {

  const overlay = document.getElementById("sidebarOverlay");

  if (overlay) {
    overlay.onclick = () => {
      document.getElementById("sidebar").classList.remove("open");
      overlay.classList.add("hidden");
    };
  }

});

function setFAB(type, accId = null) {

  // ❌ STOP on desktop
  if (!isMobile) return;

  removeFAB();

  const fab = document.createElement("div");
  fab.className = "mobile-fab";

  if (type === "customerList") {
    fab.innerHTML = `
      <button onclick="openAddCustomer()" class="fab-green">+ Customer</button>
    `;
  }

  if (type === "customerDetail") {
    fab.innerHTML = `
      <button onclick="openTxn('gave')" class="fab-red">Gave</button>
      <button onclick="openTxn('got')" class="fab-green">Got</button>
    `;
  }

  if (type === "cashbookList") {
    fab.innerHTML = `
      <button onclick="openAddAccount()" class="fab-green">+ Account</button>
    `;
  }

  if (type === "cashbookDetail") {
    fab.innerHTML = `
      <button onclick="openCashEntryModal('${accId}','out')" class="fab-red">Out</button>
      <button onclick="openCashEntryModal('${accId}','in')" class="fab-green">In</button>
    `;
  }

  document.body.appendChild(fab);
}