// ✅ SINGLE declaration
const isMobile = window.innerWidth <= 768;

document.addEventListener("DOMContentLoaded", () => {

  if (!isMobile) return;

  document.getElementById("appRoot").classList.add("mobile-ui");

});

/* ================================
   PANEL CONTROL (SLIDE BASED)
================================ */

function showListPanel() {

  const left = document.getElementById("leftPanel");
  const right = document.getElementById("rightPanel");

  left.style.transform = "translateX(0)";
  right.style.transform = "translateX(100%)";
}

function showDetailPanel() {

  const left = document.getElementById("leftPanel");
  const right = document.getElementById("rightPanel");

  left.style.transform = "translateX(-100%)";
  right.style.transform = "translateX(0)";
}

/* ================================
   OVERRIDE CUSTOMER SELECT
================================ */

const oldSelectCustomer = window.selectCustomer;

window.selectCustomer = async function(id, name, phone="") {

  await oldSelectCustomer(id, name, phone);

  if (isMobile) {
    showDetailPanel();
    attachFAB();
  }
};

/* ================================
   OVERRIDE CASHBOOK
================================ */

const oldCashbook = window.renderCashbookReport;

window.renderCashbookReport = function(acc, txns) {

  oldCashbook(acc, txns);

  if (isMobile) {
    showDetailPanel();
    attachFABCash(acc.id);
  }
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
   BACK BUTTON
================================ */

function mobileBack() {
  showListPanel();
  removeFAB();
}