let selectedCashTxns = new Set();
let cashLongPressTimer;


console.log("✅ cashbook.js loaded");

window.onerror = function (msg) {
  console.error("🔥 GLOBAL ERROR:", msg);
};

/* ================= OPEN CASHBOOK ================= */
function openCashbook() {
  document.getElementById("customersSection").classList.add("hidden");
  document.getElementById("cashbookSection").classList.remove("hidden");
  loadCashbook();
  setFAB("cashbookList");
}

/* ================= LOAD ACCOUNTS ================= */
async function loadCashbook() {

  const list = document.getElementById("cashbookList");

  if (!list) {
    console.error("❌ cashbookList not found in DOM");
    return;
  }

  list.innerHTML = `<div class="p-3 text-gray-400">Loading...</div>`;

  try {

    const res = await apiGet("getAccounts", {
      business_id: currentBusiness
    });

    if (!res || res.error) {
      list.innerHTML = `<div class="p-3 text-red-400">API Error</div>`;
      return;
    }

    const data = Array.isArray(res) ? res : [];

    if (!data.length) {
      list.innerHTML = `<div class="p-3 text-gray-400">No accounts</div>`;
      return;
    }

    window.accountsData = data; // ✅ ADD THIS

    renderCashbookList(data);

  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="p-3 text-red-400">Error</div>`;
  }
}

/* ================= ACCOUNT LIST ================= */
function renderCashbookList(data = []) {

  const container = document.getElementById("cashbookList");
  if (!container) {
    console.error("❌ cashbookList not found");
    return;
  }

  let html = `<div class="space-y-2 p-3">`;

  data.forEach(t => {




    html += `
    <div class="relative overflow-hidden rounded-lg">

      <div class="absolute right-0 top-0 h-full flex z-0 w-[140px]">

        <button onclick="openCashbookReport(${JSON.stringify(t)})"
          class="w-[70px] bg-blue-600 flex items-center justify-center">
          📊
        </button>

        <button onclick="deleteCashTxn('${t.id}', this)"
          class="w-[70px] bg-red-600 flex items-center justify-center">
          🗑
        </button>

      </div>

      <div class="txnCard bg-gray-900 p-3 relative z-10 cursor-pointer"
        onclick='openCashbookReport(${JSON.stringify(t)})'>

        <div class="font-semibold">${highlightText(t.name, window.searchQuery)}</div>

        <div class="flex justify-between mt-2 text-sm">
          <span class="text-gray-400">Balance</span>
          <span class="balance ${t.balance >= 0 ? "text-green-400" : "text-red-400"}">
            ₹${t.balance || 0}
          </span>
        </div>

      </div>

    </div>
    `;
  });

  html += `</div>`;



  container.innerHTML = html;
}




function editCashTxn(id, type, amount, note, date) {

  const d = new Date(date).toISOString().split("T")[0];

  modal.innerHTML = `
  <div class="bg-gray-900 p-6 w-80 rounded-xl">

    <h3 class="mb-3">Edit Entry</h3>

    <input id="eAmt" value="${amount}" type="number"
      class="w-full p-2 bg-black mb-2">

    <input id="eNote" value="${note || ""}"
      class="w-full p-2 bg-black mb-2">

    <input id="eDate" type="date" value="${d}"
      class="w-full p-2 bg-black mb-3">

    <button onclick="updateCashTxn('${id}')"
      class="bg-blue-600 w-full p-2">
      Update
    </button>

  </div>`;

  modal.classList.remove("hidden");
}

async function updateCashTxn(id) {

  const btn = event.target;
  setButtonLoading(btn, "Updating...");

  const amount = document.getElementById("eAmt").value;
  const note = document.getElementById("eNote").value;
  const date = document.getElementById("eDate").value;

  const res = await apiPost({
    action: "updateCashEntry",
    id,
    amount,
    note,
    date
  });

  if (!res.success) {
    showToast("Update failed ❌", "error");
    resetButton(btn);
    return;
  }

  // ✅ UPDATE MEMORY
  const txn = window.currentTxns.find(t => t.id == id);
  if (txn) {
    txn.amount = Number(amount);
    txn.note = note;
    txn.date = date;
  }

  // ✅ RE-RENDER ONLY LIST (FAST)
  applyFilter();
  refreshAccountBalanceInstant();

  modal.classList.add("hidden");

  showSuccess("Updated ✅");
  resetButton(btn);
}

async function deleteCashTxn(id, btn) {

  const confirm = await customConfirm("Delete this entry?");
  if (!confirm) return;

  setButtonLoading(btn, "Deleting...");

  const res = await apiPost({
    action: "deleteCashEntry",
    id
  });

  if (!res.success) {
    showToast("Delete failed ❌", "error");
    resetButton(btn);
    return;
  }

  // ✅ REMOVE FROM UI INSTANTLY
  const card = btn.closest(".relative");
  if (card) card.remove();

  // ✅ REMOVE FROM MEMORY
  window.currentTxns = window.currentTxns.filter(t => t.id != id);

  applyFilter();

  refreshAccountBalanceInstant();


  showSuccess("Deleted ✅");
}

async function deleteSelectedCash(btn) {

  if (selectedCashTxns.size === 0) return;

  const confirm = await customConfirm(
    `Delete ${selectedCashTxns.size} entries?`
  );
  if (!confirm) return;

  setButtonLoading(btn, "Deleting...");

  try {

    const ids = Array.from(selectedCashTxns);

    const res = await apiPost({
      action: "bulkDeleteCashEntry",
      ids   // ✅ send all IDs in one call
    });

    console.log("BULK DELETE RES:", res);

    if (!res || !res.success) {
      showToast("Delete failed ❌", "error");
      resetButton(btn);
      return;
    }

    // ✅ REMOVE FROM UI INSTANTLY
    window.currentTxns = window.currentTxns.filter(
      t => !ids.includes(String(t.id))
    );

    // ✅ CLEAR SELECTION
    selectedCashTxns.clear();
    updateCashMultiDeleteBar();

    // ✅ RE-RENDER
    applyFilter();
    refreshAccountBalanceInstant();

    showSuccess("Deleted successfully ✅");

  } catch (err) {
    console.error(err);
    showToast("Delete failed ❌", "error");
  }

  resetButton(btn);
}


async function refreshCashbook() {

  const data = await apiGet("getCashEntries", {
    bid: currentBusiness
  });

  currentCashData = data.data || [];

  renderCashbookList(currentCashData);
}

function startCashLongPress(e, el) {

  cashLongPressTimer = setTimeout(() => {

    const id = el.dataset.id;

    if (selectedCashTxns.has(id)) {
      selectedCashTxns.delete(id);
      el.classList.remove("bg-yellow-900");
    } else {
      selectedCashTxns.add(id);
      el.classList.add("bg-yellow-900");
    }

    updateCashMultiDeleteBar();

  }, 600);
}

function cancelCashLongPress() {
  clearTimeout(cashLongPressTimer);
}

function updateCashMultiDeleteBar() {

  let bar = document.getElementById("cashMultiDeleteBar");

  // ❌ NOTHING SELECTED
  if (selectedCashTxns.size === 0) {
    if (bar) bar.remove();
    return;
  }

  // ✅ CREATE BAR
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "cashMultiDeleteBar";

    bar.className = `
      fixed bottom-0 left-0 right-0
      bg-red-600 text-white
      p-4 flex justify-between items-center
      z-50
    `;

    bar.innerHTML = `
      <span>${selectedCashTxns.size} selected</span>

      <button onclick="deleteSelectedCash(this)"
        class="bg-black px-4 py-2 rounded">
        Delete All
      </button>
    `;

    document.body.appendChild(bar);
  }
  // 🔄 UPDATE COUNT
  else {
    bar.querySelector("span").innerText =
      selectedCashTxns.size + " selected";
  }
}


/* ================= OPEN ACCOUNT ================= */
async function openCashbookReport(acc) {

  const panel = document.getElementById("rightPanel");
  panel.innerHTML = `<div class="p-4">Loading...</div>`;

  try {

    const res = await apiGet("getCashbookByAccount", {
      account_id: acc.id
    });

    if (!res || res.error) {
      panel.innerHTML = `<div class="p-4 text-red-400">API Error</div>`;
      return;
    }

    const data = Array.isArray(res) ? res : [];

    const txns = data.map(row => {

      if (Array.isArray(row)) {
        return {
          amount: Number(row[3]),
          note: row[4],
          mode: row[5],
          date: row[6],
          type: Number(row[3]) > 0 ? "in" : "out"
        };
      }

      return {
        id: row.id || row[0],   // ✅ ADD THIS
        amount: Number(row.amount),
        note: row.note,
        mode: row.mode,
        date: row.date,
        type: Number(row.amount) > 0 ? "in" : "out"
      };
    });

    renderCashbookReport(acc, txns);

  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="p-4 text-red-400">Error</div>`;
  }
}

let cashChartInstance = null;


/* ================= MAIN UI ================= */
function renderCashbookReport(acc, txns) {

  const panel = document.getElementById("rightPanel");

  panel.innerHTML = `

  <!-- MAIN CONTAINER -->
  <div class="flex flex-col h-full">

    <!-- HEADER -->
    <div class="p-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-20">

      <div class="flex items-center gap-2">
        <button onclick="mobileBack()"
          class="md:hidden bg-gray-700 px-2 py-1 rounded text-sm">←</button>

        <div class="text-lg font-bold">${acc.name}</div>
      </div>

      <div id="smartNotes" class="text-xs text-blue-400 mt-1"></div>
      <div id="monthlyInsight" class="text-xs text-purple-400 mt-1"></div>
      <div id="leaderboardBox" class="mt-2"></div>

      <!-- KPI -->
      <div class="grid grid-cols-3 gap-2 mt-3 text-center">

        <div class="bg-green-900/30 p-2 rounded-lg">
          <div class="text-xs text-gray-400">Cash In</div>
          <div class="text-green-400 font-bold text-lg">₹<span id="totalIn">0</span></div>
        </div>

        <div class="bg-red-900/30 p-2 rounded-lg">
          <div class="text-xs text-gray-400">Cash Out</div>
          <div class="text-red-400 font-bold text-lg">₹<span id="totalOut">0</span></div>
        </div>

        <div class="bg-yellow-900/30 p-2 rounded-lg">
          <div class="text-xs text-gray-400">Balance</div>
          <div class="text-yellow-400 font-bold text-lg">₹<span id="netBalance">0</span></div>
        </div>

      </div>

      <!-- DAILY -->
      <div id="dailySummary" class="mt-3 text-xs text-gray-400 flex justify-between">
        <span>Today In: ₹0</span>
        <span>Out: ₹0</span>
      </div>

      <!-- FILTER -->
      <div class="flex gap-2 mt-3 flex-wrap">

        <select id="filterType" class="bg-black p-1 text-sm">
          <option value="all">All</option>
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="custom">Custom</option>
        </select>

        <input type="date" id="fromDate" class="bg-black p-1 text-sm">
        <input type="date" id="toDate" class="bg-black p-1 text-sm">

        <select id="filterMode" class="bg-black p-1 text-sm">
          <option value="all">All Mode</option>
          <option value="cash">Cash</option>
          <option value="online">Online</option>
        </select>

        <button onclick="applyFilter()" 
          class="bg-blue-600 px-2 text-sm rounded">
          Apply
        </button>

        <button onclick="exportExcel()" 
          class="bg-green-600 px-2 text-sm rounded">
          Export
        </button>

      </div>

    </div>

    <!-- ✅ SCROLL AREA (IMPORTANT FIX) -->
    <div id="txnList" class="flex-1 overflow-y-auto pb-24 bg-gray-950"></div>

    <!-- ✅ FIXED BOTTOM BAR -->
    <div class="fixed bottom-0 left-0 right-0 bg-gray-900 p-3 flex gap-2 border-t border-gray-700 z-50">

      <button onclick="openCashEntryModal('${acc.id}','in')"
        class="flex-1 bg-green-500/20 hover:bg-green-600 text-green-300 hover:text-white p-3 rounded-xl font-bold">
        + Cash In
      </button>

      <button onclick="openCashEntryModal('${acc.id}','out')"
        class="flex-1 bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white p-3 rounded-xl font-bold">
        - Cash Out
      </button>

    </div>

  </div>
  `;

  window.currentAccount = acc;
  window.currentTxns = txns;

  applyFilter();

  // mobile fix
  if (window.showDetailPanel && window.innerWidth <= 768) {
    setTimeout(showDetailPanel, 50);
  }

  // render insights (NO CHART HERE)
  setTimeout(() => {
    renderHeatmap(txns);
    generateSmartNotes(txns);
    renderMonthlyInsight(txns);
    renderAccountLeaderboard(window.accountsData || []);

  }, 50);
}


function switchCashTab(tab) {

  const content = document.getElementById("tabContent");
  const bottomBar = document.getElementById("bottomBar");

  // reset tab colors
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.classList.remove("bg-blue-600");
    btn.classList.add("bg-gray-700");
  });

  event.target.classList.add("bg-blue-600");

  // hide bottom bar by default
  bottomBar.classList.add("hidden");

  /* ================= SUMMARY TAB ================= */
  if (tab === "summary") {

    content.innerHTML = `
      <div class="p-4 space-y-4">

        <!-- KPI -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-green-900/30 p-3 rounded-lg">
            <div class="text-xs text-gray-400">Cash In</div>
            <div id="sumIn" class="text-green-400 font-bold text-lg">0</div>
          </div>

          <div class="bg-red-900/30 p-3 rounded-lg">
            <div class="text-xs text-gray-400">Cash Out</div>
            <div id="sumOut" class="text-red-400 font-bold text-lg">0</div>
          </div>

          <div class="bg-yellow-900/30 p-3 rounded-lg">
            <div class="text-xs text-gray-400">Balance</div>
            <div id="sumBal" class="text-yellow-400 font-bold text-lg">0</div>
          </div>
        </div>

        <div id="leaderboardBox"></div>

        <canvas id="cashChart" height="100"></canvas>



        <div id="heatmap" class="grid grid-cols-7 gap-1"></div>

      </div>
    `;

    renderSummaryData();

  }

  /* ================= TRANSACTION TAB ================= */
  if (tab === "txns") {

    content.innerHTML = `
      <div class="p-3">

        <!-- FILTER -->
        <div class="flex gap-2 flex-wrap mb-3">

          <select id="filterType" class="bg-black p-1 text-sm">
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="month">Month</option>
          </select>

          <select id="filterMode" class="bg-black p-1 text-sm">
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </select>

          <button onclick="applyFilter()" 
            class="bg-blue-600 px-2 text-sm rounded">Apply</button>

        </div>

        <div id="txnList"></div>

      </div>
    `;

    bottomBar.classList.remove("hidden"); // ✅ show sticky bar

    applyFilter();
  }

  /* ================= ANALYTICS TAB ================= */
  if (tab === "analytics") {

    content.innerHTML = `
      <div class="p-4 space-y-3">

        <div id="smartNotes" class="text-blue-400 text-sm"></div>
        <div id="monthlyInsight" class="text-purple-400 text-sm"></div>

        <canvas id="cashChart" height="120"></canvas>

      </div>
    `;

    requestAnimationFrame(() => {
      generateSmartNotes(window.currentTxns);
      renderMonthlyInsight(window.currentTxns);
      renderCashChart(window.currentTxns);
    });
  }
}


function renderSummaryData() {

  const txns = window.currentTxns || [];

  let totalIn = 0;
  let totalOut = 0;

  txns.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (amt > 0) totalIn += amt;
    else totalOut += Math.abs(amt);
  });

  document.getElementById("sumIn").innerText = totalIn;
  document.getElementById("sumOut").innerText = totalOut;
  document.getElementById("sumBal").innerText = totalIn - totalOut;

  requestAnimationFrame(() => {
    renderCashChart(txns);
    renderHeatmap(txns);
    renderAccountLeaderboard(window.accountsData || []);
  });
}


function renderMonthlyInsight(txns) {

  const el = document.getElementById("monthlyInsight");
  if (!el) return;

  let now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();

  let total = 0;

  txns.forEach(t => {

    let d = new Date(t.date);
    if (isNaN(d)) return;

    if (d.getMonth() === month && d.getFullYear() === year) {
      total += Number(t.amount || 0);
    }
  });

  if (total > 0) {
    el.innerText = `📈 Positive monthly flow: ₹${total}`;
  } else if (total < 0) {
    el.innerText = `📉 Negative monthly flow: ₹${total}`;
  } else {
    el.innerText = "⚖️ Neutral monthly flow";
  }
}

function generateSmartNotes(txns) {

  const el = document.getElementById("smartNotes");
  if (!el) return;

  let today = new Date().toDateString();

  let income = 0;
  let expense = 0;

  txns.forEach(t => {

    if (!t.date) return;

    if (new Date(t.date).toDateString() === today) {

      const amt = Number(t.amount || 0);

      if (amt > 0) income += amt;
      else expense += Math.abs(amt);
    }
  });

  let net = income - expense;

  let msg = "📊 Normal activity";

  if (net < -5000) msg = "⚠️ High spending today";
  else if (net > 5000) msg = "💰 Strong income day";
  else if (income === 0 && expense === 0) msg = "📭 No activity today";

  el.innerText = msg;
}

function renderHeatmap(txns) {

  const el = document.getElementById("heatmap");
  if (!el || !Array.isArray(txns)) return;

  const map = {};

  txns.forEach(t => {
    if (!t.date) return;

    const d = new Date(t.date);
    if (isNaN(d)) return;

    const key = d.toISOString().split("T")[0];
    map[key] = (map[key] || 0) + Math.abs(Number(t.amount || 0));
  });

  const entries = Object.entries(map)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-28);

  if (entries.length === 0) {
    el.innerHTML = `<div class="text-xs text-gray-500">No activity</div>`;
    return;
  }

  el.innerHTML = entries.map(([date, val]) => {

    const intensity = Math.min(val / 5000, 1);

    return `
      <div title="${date} ₹${val}"
        class="h-3 w-3 rounded"
        style="background: rgba(34,197,94,${intensity})">
      </div>
    `;
  }).join("");
}

async function openCashSummary() {

  const panel = document.getElementById("rightPanel");
  panel.innerHTML = `<div class="p-4">Loading summary...</div>`;

  try {

    const accounts = window.accountsData || [];

    // ⚡ CACHE (instant load)
    if (window.summaryTxns && window.summaryTxns.length) {
      renderCashSummary(window.summaryTxns);
      return;
    }

    // ✅ PARALLEL API CALLS
    const promises = accounts.map(acc =>
      apiGet("getCashbookByAccount", { account_id: acc.id })
        .then(res => ({ acc, res }))
    );

    const results = await Promise.all(promises);

    let allTxns = [];

    results.forEach(({ acc, res }) => {

      const rows = Array.isArray(res) ? res : [];

      rows.forEach(row => {

        let amount = 0;
        let date = "";
        let mode = "cash";

        if (Array.isArray(row)) {
          amount = Number(row[3] || 0);
          date = row[6];
          mode = row[5] || "cash";
        } else {
          amount = Number(row.amount || 0);
          date = row.date;
          mode = row.mode || "cash";
        }

        // ✅ UNIFIED FIELD (CRITICAL FIX)
        const accountName =
          acc?.name ||
          acc?.account_name ||
          acc?.title ||
          "Unknown";

        allTxns.push({
          amount,
          date,
          mode,
          account: accountName   // ✅ USE THIS ONLY
        });

      });

    });

    // ✅ STORE (single source of truth)
    window.summaryTxns = allTxns;
    window.allCashTxns = allTxns;

    // ✅ DEBUG (REMOVE AFTER VERIFY)
    console.log("Accounts detected:",
      [...new Set(allTxns.map(t => t.account))]
    );

    renderCashSummary(allTxns);

  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="p-4 text-red-400">Error loading summary</div>`;
  }
}

function renderCashSummary(txns) {

  const panel = document.getElementById("rightPanel");

  panel.innerHTML = `

    <!-- HEADER -->
    <div class="p-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">
      <div class="text-lg font-bold">📊 Cash Dashboard</div>

      <!-- TABS -->
      <div class="flex gap-2 mt-3 text-sm">
        <button onclick="switchSummaryTab('summary')" id="tabSummary"
          class="px-3 py-1 rounded bg-blue-600">
          Summary
        </button>

        <button onclick="switchSummaryTab('analytics')" id="tabAnalytics"
          class="px-3 py-1 rounded bg-gray-700">
          Analytics
        </button>

<button id="tabAdvanced"
  onclick="switchSummaryTab('advanced')"
  class="bg-gray-700 px-3 py-1 rounded text-xs">
  Advanced
</button>

      </div>
    </div>

    <!-- TAB CONTENT -->
    <div id="summaryTabContent" class="p-3"></div>
  `;

  window.summaryTxns = txns;

  // default tab
  switchSummaryTab("summary");
}

function switchSummaryTab(tab) {

  const content = document.getElementById("summaryTabContent");

  // ✅ SAFE DATA
  const txns = window.summaryTxns || [];

  // ================= TAB UI RESET =================
  const tabSummary = document.getElementById("tabSummary");
  const tabAnalytics = document.getElementById("tabAnalytics");
  const tabAdvanced = document.getElementById("tabAdvanced"); // ✅ NEW

  tabSummary.classList.remove("bg-blue-600");
  tabAnalytics.classList.remove("bg-blue-600");
  tabAdvanced?.classList.remove("bg-blue-600");

  tabSummary.classList.add("bg-gray-700");
  tabAnalytics.classList.add("bg-gray-700");
  tabAdvanced?.classList.add("bg-gray-700");


  /* =========================================================
     ===================== SUMMARY TAB ========================
     ========================================================= */
  if (tab === "summary") {

    tabSummary.classList.remove("bg-gray-700");
    tabSummary.classList.add("bg-blue-600");

    content.innerHTML = `

      <div class="space-y-4">

        <!-- KPI -->
        <div class="grid grid-cols-3 gap-2 text-center">

          <div class="bg-green-900/30 p-2 rounded-lg">
            <div class="text-xs text-gray-400">Total In</div>
            <div class="text-green-400 font-bold text-lg">₹<span id="sumIn">0</span></div>
          </div>

          <div class="bg-red-900/30 p-2 rounded-lg">
            <div class="text-xs text-gray-400">Total Out</div>
            <div class="text-red-400 font-bold text-lg">₹<span id="sumOut">0</span></div>
          </div>

          <div class="bg-yellow-900/30 p-2 rounded-lg">
            <div class="text-xs text-gray-400">Net</div>
            <div class="text-yellow-400 font-bold text-lg">₹<span id="sumNet">0</span></div>
          </div>

        </div>

        <!-- AI INSIGHTS -->
        <div id="summaryInsights" class="text-xs text-purple-400"></div>

        <!-- TOP ACCOUNTS -->
        <div id="summaryTopAccounts"></div>

        <!-- LEGEND -->
        <div class="flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div class="h-3 w-3 bg-gray-600 rounded"></div>
          <div class="h-3 w-3 bg-green-500 rounded"></div>
          <div class="h-3 w-3 bg-red-500 rounded"></div>
          <span>More</span>
        </div>

        <!-- HEATMAP -->
        <div>
          <div class="text-xs text-gray-400 mb-2">Activity Heatmap</div>
          <div id="summaryHeatmap" class="grid grid-cols-7 gap-1"></div>
        </div>

      </div>
    `;

    setTimeout(() => {
      renderSummaryStats(txns);
      renderSummaryTopAccounts();
      renderSummaryHeatmap(txns);
      generateSummaryInsights(txns);
    }, 50);
  }


  /* =========================================================
     ===================== ANALYTICS TAB ======================
     ========================================================= */
  if (tab === "analytics") {

    tabAnalytics.classList.remove("bg-gray-700");
    tabAnalytics.classList.add("bg-blue-600");

    content.innerHTML = `

      <div class="h-[calc(100vh-160px)] overflow-y-auto pr-2 space-y-4">

        <!-- CASHFLOW -->
        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">Cash Flow Trend</div>
          <div class="h-40">
            <canvas id="summaryChart"></canvas>
          </div>
        </div>

        <div class="text-sm mb-2">AI Cash Forecasting</div>
        <div id="forecastBox" class="text-xs text-green-400 mt-2"></div>


        <div class="text-sm mb-2">Profit vs Expense Radar Chart</div>

        <canvas id="radarChart" height="120" class="mt-4"></canvas>

        <!-- MONTHLY -->
        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">Monthly Income vs Expense</div>
          <div class="h-40">
            <canvas id="monthlyChart"></canvas>
          </div>
        </div>

        <!-- PIE -->
        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">Mode Split (Cash vs Online)</div>
          <div class="h-48">
            <canvas id="modeChart"></canvas>
          </div>
        </div>

      </div>
    `;

    // ✅ Destroy old charts (important)
    if (window.summaryChartInstance) window.summaryChartInstance.destroy();
    if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();
    if (window.modeChartInstance) window.modeChartInstance.destroy();

    setTimeout(() => {
      renderSummaryChart(txns);
      renderMonthlyChart(txns);
      renderModePieChart(txns);
      generateForecast(txns);
      renderRadarChart(txns);
    }, 100);
  }


  /* =========================================================
     ===================== ADVANCED TAB =======================
     ========================================================= */
  if (tab === "advanced") {

    document.getElementById("tabAdvanced").classList.add("bg-blue-600");

    content.innerHTML = `
      <div class="h-[calc(100vh-160px)] overflow-y-auto space-y-4">

        <!-- TOP SPENDING ACCOUNTS -->
        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">💸 Top Spending Accounts</div>
          <div id="topSpendingAccounts"></div>
        </div>

        <!-- DAILY AVG -->
        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">📅 Daily Average</div>
          <div id="dailyAvgBox" class="text-sm text-gray-300"></div>
        </div>

        <!-- TRANSACTION DISTRIBUTION -->
        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">📊 Transaction Distribution</div>
          <canvas id="txnDistributionChart" height="120"></canvas>
        </div>

        <!-- ACCOUNT PERFORMANCE -->
<div class="bg-gray-900 p-3 rounded-lg">
  <div id="accountPerformance"></div>
</div>

        <div id="forecastBox" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="accountContribution" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="weeklyPattern" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="recurringBox" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="aiInsights" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="ratioBox" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="largestTxns" class="bg-gray-900 p-3 rounded-lg"></div>
        <div id="frequencyBox" class="bg-gray-900 p-3 rounded-lg"></div>

      </div>
    `;

    setTimeout(()=>{

      renderTopSpendingAccounts(txns);
      renderDailyAverage(txns);
      renderTxnDistribution(txns);
  renderAccountPerformance(txns); // ✅ ADD THIS



      renderForecast(txns);
      renderAccountContribution(txns);
      renderWeeklyPattern(txns);
      renderRecurring(txns);
      renderAIInsights(txns);
      renderIncomeExpenseRatio(txns);
      renderLargestTransactions(txns);
      renderFrequency(txns);
    },100);
  }

}

function generateSummaryInsights(txns) {

  const el = document.getElementById("summaryInsights");
  if (!el) return;

  const accMap = {};

  txns.forEach(t => {
    const name = t.account_name || "Unknown";
    accMap[name] = (accMap[name] || 0) + Number(t.amount || 0);
  });

  const worst = Object.entries(accMap)
    .sort((a,b) => a[1] - b[1])[0];

  if (worst && worst[1] < 0) {
    el.innerText = `⚠️ ${worst[0]} is draining cash (₹${worst[1]})`;
  } else {
    el.innerText = "✅ Cash flow looks healthy";
  }
}

function renderMonthlyChart(txns) {

  const canvas = document.getElementById("monthlyChart");
  if (!canvas) return;

  const map = {};

  txns.forEach(t => {
    const d = new Date(t.date);
    if (isNaN(d)) return;

    const key = d.getFullYear() + "-" + (d.getMonth()+1);

    if (!map[key]) map[key] = {in:0,out:0};

    if (t.amount > 0) map[key].in += t.amount;
    else map[key].out += Math.abs(t.amount);
  });

  const labels = Object.keys(map);
  const income = labels.map(k => map[k].in);
  const expense = labels.map(k => map[k].out);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Income", data: income },
        { label: "Expense", data: expense }
      ]
    },
options: {
  responsive: true,
  maintainAspectRatio: false
}
  });
}

function renderModePieChart(txns) {

  const canvas = document.getElementById("modeChart");
  if (!canvas) return;

  let cash = 0;
  let online = 0;

  txns.forEach(t => {
    if (t.mode === "cash") cash += Math.abs(t.amount || 0);
    else online += Math.abs(t.amount || 0);
  });

  new Chart(canvas, {
    type: "pie",
    data: {
      labels: ["Cash", "Online"],
      datasets: [{
        data: [cash, online]
      }]
    },
options: {
  responsive: true,
  maintainAspectRatio: false
}
  });
}



let summaryChartInstance = null;

function renderSummaryChart(txns) {

  const canvas = document.getElementById("summaryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const accountMap = {};

  // ✅ GROUP BY ACCOUNT
  txns.forEach(t => {

    if (!accountMap[t.account]) {
      accountMap[t.account] = [];
    }

    accountMap[t.account].push(Number(t.amount || 0));
  });

  const datasets = [];

  Object.keys(accountMap).forEach(acc => {

    let balance = 0;

    const data = accountMap[acc].map(val => {
      balance += val;
      return balance;
    });

    datasets.push({
      label: acc,
      data,
      borderWidth: 2,
      fill: false
    });
  });

  if (summaryChartInstance) {
    summaryChartInstance.destroy();
  }

  summaryChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array(50).fill(""), // generic labels
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}



function renderSummaryStats(txns) {

  let totalIn = 0;
  let totalOut = 0;

  txns.forEach(t => {
    const amt = Number(t.amount || 0);

    if (amt > 0) totalIn += amt;
    else totalOut += Math.abs(amt);
  });

console.log("SUMMARY TXNS:", txns);

  document.getElementById("sumIn").innerText = totalIn;
  document.getElementById("sumOut").innerText = totalOut;
  document.getElementById("sumNet").innerText = totalIn - totalOut;
}

function renderSummaryTopAccounts() {

  const el = document.getElementById("summaryTopAccounts");
  if (!el) return;

  const top = [...(window.accountsData || [])]
    .sort((a,b) => (b.balance||0)-(a.balance||0))
    .slice(0,5);

  el.innerHTML = `
    <div class="text-sm font-bold mb-2">🏆 Top Accounts</div>

    ${top.map((a,i)=>`
      <div class="flex justify-between text-sm">
        <span>${i+1}. ${a.name}</span>
        <span>₹${a.balance||0}</span>
      </div>
    `).join("")}
  `;
}

function renderSummaryHeatmap(txns) {

  const el = document.getElementById("summaryHeatmap");
  if (!el) return;

  // ================= BUILD DAILY MAP =================
  const map = {};

  txns.forEach(t => {
    if (!t.date) return;

    const d = new Date(t.date);
    if (isNaN(d)) return;

    const key = d.toISOString().split("T")[0];

    if (!map[key]) {
      map[key] = { in: 0, out: 0 };
    }

    const amt = Number(t.amount || 0);

    if (amt > 0) map[key].in += amt;
    else map[key].out += Math.abs(amt);
  });

  // ================= LAST 35 DAYS =================
  const days = [];
  const today = new Date();

  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    days.push(new Date(d));
  }

  // ================= BUILD GRID =================
  el.innerHTML = `
    <div class="grid grid-cols-7 gap-1 text-xs">
      ${days.map(d => {

        const key = d.toISOString().split("T")[0];
        const data = map[key] || { in: 0, out: 0 };

        const total = data.in + data.out;
        const net = data.in - data.out;

        // 🎯 intensity (0 → 1)
        const intensity = Math.min(total / 5000, 1);

        let bg = "rgba(75,85,99,0.3)"; // default gray

        if (total > 0) {
          if (net >= 0) {
            // 🟢 income dominant
            bg = `rgba(34,197,94,${0.2 + intensity})`;
          } else {
            // 🔴 expense dominant
            bg = `rgba(239,68,68,${0.2 + intensity})`;
          }
        }

        return `
          <div
            class="h-4 w-4 rounded-sm cursor-pointer hover:scale-125 transition"
            style="background:${bg}"
            title="
${d.toDateString()}
In: ₹${data.in}
Out: ₹${data.out}
Net: ₹${net}
            ">
          </div>
        `;

      }).join("")}
    </div>
  `;
}



function openCashEntryModal(accountId, type) {

  const modal = document.getElementById("modal");

  if (!modal) {
    console.error("❌ Modal element not found");
    return;
  }

  // ✅ TODAY DATE
  const today = new Date().toISOString().split("T")[0];

  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div class="bg-gray-900 p-5 rounded-xl w-80">

        <h3 class="text-lg font-bold mb-3">
          ${type === "in" ? "Cash In" : "Cash Out"}
        </h3>

        <div class="flex gap-2 mb-2">
  <button onclick="quickAmt(1000)" class="bg-gray-700 px-2 py-1 text-xs">1000</button>
  <button onclick="quickAmt(2000)" class="bg-gray-700 px-2 py-1 text-xs">2000</button>
  <button onclick="quickAmt(5000)" class="bg-gray-700 px-2 py-1 text-xs">5000</button>
    <button onclick="quickAmt(10000)" class="bg-gray-700 px-2 py-1 text-xs">10000</button>
</div>

        <input id="amount" placeholder="Amount"
          class="w-full p-2 mb-2 bg-black border border-gray-700 rounded"/>

        <input id="note" placeholder="Description"
          class="w-full p-2 mb-2 bg-black border border-gray-700 rounded"/>

        <select id="mode"
          class="w-full p-2 mb-2 bg-black border border-gray-700 rounded">
          <option value="cash">Cash</option>
          <option value="online">Online</option>
        </select>

        <!-- ✅ FIXED DATE INPUT -->
        <input type="date" id="date" value="${today}"
          class="w-full p-2 mb-3 bg-black border border-gray-700 rounded"/>

        <div class="flex justify-end gap-2">
          <button onclick="closeModal()" class="bg-gray-600 px-3 py-1 rounded">
            Cancel
          </button>

          <button onclick="saveCashEntry('${accountId}','${type}', this)"
            class="bg-green-600 px-3 py-1 rounded">
            Save
          </button>
        </div>

      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function quickAmt(val) {
  document.getElementById("amount").value = val;
}

/* ================= FILTER ================= */
function applyFilter() {

  let txns = window.currentTxns || [];

  const type = document.getElementById("filterType").value;
  const mode = document.getElementById("filterMode").value;
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  const today = new Date();

  txns = txns.filter(t => {

    const d = new Date(t.date);

    if (type === "today" && d.toDateString() !== today.toDateString())
      return false;

    if (type === "month" &&
      (d.getMonth() !== today.getMonth() ||
        d.getFullYear() !== today.getFullYear()))
      return false;

    if (type === "custom") {
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to)) return false;
    }

    if (mode !== "all" && t.mode !== mode)
      return false;

    return true;
  });

  renderTxnList(txns);
}

/* ================= TRANSACTION LIST ================= */
function renderTxnList(txns) {

  if (!Array.isArray(txns)) txns = [];

  const list = document.getElementById("txnList");

  if (!list) return;

  let html = "";

  let balance = 0;
  let totalIn = 0;
  let totalOut = 0;

  txns.forEach(t => {

    const amt = Number(t.amount) || 0;

    balance += amt;

    if (amt > 0) totalIn += amt;
    else totalOut += Math.abs(amt);

    html += `
    <div class="relative overflow-hidden">

      <!-- ACTION BUTTONS -->
      <div class="absolute right-0 top-0 h-full flex z-0 w-[140px]">

        <button onclick="editCashTxn('${t.id}','${t.type}','${t.amount}','${t.note}','${t.date}')"
          class="w-[70px] bg-blue-600 flex items-center justify-center">
          ✏️
        </button>

        <button onclick="deleteCashTxn('${t.id}', this)"
          class="w-[70px] bg-red-600 flex items-center justify-center">
          🗑
        </button>

      </div>

      <!-- MAIN CARD -->
      <div class="txnCard p-3 border-b border-gray-800 flex justify-between bg-gray-900 relative z-10 transition-transform duration-200"

        data-id="${t.id}"

        oncontextmenu="return false;"

        ontouchstart="startSwipe(event,this); startCashLongPress(event,this)"
        ontouchmove="moveSwipe(event)"
        ontouchend="endSwipe(); cancelCashLongPress()"

        onmousedown="startSwipe(event,this); startCashLongPress(event,this)"
        onmousemove="moveSwipe(event)"
        onmouseup="endSwipe(); cancelCashLongPress()"
      >

        <div>
          <div>
  ${getCategoryEmoji(t.note)} ${t.note || "-"}
</div>

          <div class="text-xs text-gray-400">
            ${formatDate(t.date)} | ${t.mode || "-"}
          </div>

          <div class="text-xs text-yellow-400">
            Bal: ₹${balance}
          </div>
        </div>

        <div class="${amt > 0 ? "text-green-400" : "text-red-400"} font-bold">
          ${amt > 0 ? "+" : "-"} ₹${Math.abs(amt)}
        </div>

      </div>

    </div>
    `;
  });

  list.innerHTML = html || `<div class="p-4 text-gray-400">No transactions</div>`;

  // KPI update
  document.getElementById("totalIn").innerText = totalIn;
  document.getElementById("totalOut").innerText = totalOut;
  document.getElementById("netBalance").innerText = balance;

  // sync account balance
  window.currentAccount.balance = balance;
  updateAccountBalanceUI(balance);

  let todayIn = 0;
  let todayOut = 0;
  const todayStr = new Date().toDateString();

  txns.forEach(t => {
    const d = new Date(t.date).toDateString();

    if (d === todayStr) {
      if (t.amount > 0) todayIn += t.amount;
      else todayOut += Math.abs(t.amount);
    }
  });

  const dailyEl = document.getElementById("dailySummary");
  if (dailyEl) {
    dailyEl.innerHTML = `
    <span>Today In: <span class="text-green-400">₹${todayIn}</span></span>
    <span>Out: <span class="text-red-400">₹${todayOut}</span></span>
  `;
  }


}

/* ================= UPDATE BALANCE LEFT ================= */
function updateAccountBalanceUI(balance) {

  const items = document.querySelectorAll("#cashbookList > div");

  items.forEach(item => {

    const nameEl = item.querySelector(".font-semibold");

    if (nameEl && nameEl.innerText === window.currentAccount.name) {

      const balEl = item.querySelector(".balance");

      if (balEl) {

        balEl.innerText = `₹${balance}`;

        balEl.className = balance >= 0
          ? "text-sm font-bold balance text-green-400"
          : "text-sm font-bold balance text-red-400";
      }
    }
  });
}

/* ================= DATE FORMAT ================= */
function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date) ? "-" : date.toLocaleDateString("en-IN");
}

/* ================= EXPORT ================= */
function exportExcel() {

  const data = window.currentTxns.map(t => ({
    Date: formatDate(t.date),
    Type: t.type,
    Amount: t.amount,
    Mode: t.mode,
    Note: t.note
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Cashbook");
  XLSX.writeFile(wb, "cashbook.xlsx");
}

/* ================= ENTRY MODAL ================= */
function openCashEntry(accountId, type) {

  const modal = document.getElementById("modal");

  modal.innerHTML = `
    <div class="bg-gray-900 p-5 rounded-xl w-80">

      <h3 class="text-lg font-bold mb-3">
        ${type === "in" ? "Cash In" : "Cash Out"}
      </h3>




      <input id="amount" placeholder="Amount"
        class="w-full p-2 mb-2 bg-black border border-gray-700 rounded"/>

      <input id="note" placeholder="Description"
        class="w-full p-2 mb-2 bg-black border border-gray-700 rounded"/>

      <select id="mode"
        class="w-full p-2 mb-2 bg-black border border-gray-700 rounded">
        <option value="cash">Cash</option>
        <option value="online">Online</option>
      </select>

      <input type="date" id="date"
        class="w-full p-2 mb-3 bg-black border border-gray-700 rounded"/>

      <div class="flex justify-end gap-2">
        <button onclick="closeModal()" class="bg-gray-600 px-3 py-1 rounded">Cancel</button>
        <button onclick="saveCashEntry('${accountId}','${type}', this)"
          class="bg-green-600 px-3 py-1 rounded">Save</button>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
}

/* ================= SAVE ENTRY ================= */
async function saveCashEntry(accountId, type, btn) {

  const original = btn.innerHTML;

  const amount = document.getElementById("amount").value;
  const note = document.getElementById("note").value;
  const mode = document.getElementById("mode").value;
  const date = document.getElementById("date").value;

  if (!amount) {
    showToast("Enter amount ❌", "error");
    return;
  }

  btn.innerHTML = "Saving...";
  btn.disabled = true;

  try {

    const res = await apiPost({
      action: "addCashEntry",
      business_id: currentBusiness,
      account_id: accountId,
      amount: type === "out" ? -amount : amount,
      note,
      mode,
      date
    });

    if (!res.success) {
      showToast("Failed ❌", "error");
      return;
    }

    showToast("Saved ✅");
    closeModal();

    openCashbookReport(window.currentAccount);
    loadCashbook();

  } catch (err) {
    console.error(err);
    showToast("Error ❌", "error");
  }

  btn.innerHTML = original;
  btn.disabled = false;
}

/* ================= ADD ACCOUNT ================= */
function openAddAccount() {

  const modal = document.getElementById("modal");

  modal.innerHTML = `
    <div class="bg-gray-900 p-5 rounded-xl w-80">

      <h3 class="text-lg font-bold mb-3">Add Account</h3>

      <input id="accName" placeholder="Account Name"
        class="w-full p-2 mb-2 bg-black border border-gray-700 rounded" />

      <!-- ✅ INLINE MESSAGE -->
      <div id="accMsg" class="text-sm mb-2 hidden"></div>

      <div class="flex justify-end gap-2">
        <button onclick="closeModal()" class="bg-gray-600 px-3 py-1 rounded">
          Cancel
        </button>

        <button id="saveAccBtn" onclick="saveAccount(this)"
          class="bg-green-600 px-3 py-1 rounded flex items-center gap-2">
          <span>Save</span>
        </button>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");

  // ✅ autofocus
  setTimeout(() => {
    document.getElementById("accName")?.focus();
  }, 100);
}

async function saveAccount(btn) {

  const name = document.getElementById("accName").value.trim();
  const msg = document.getElementById("accMsg");

  if (!name) {
    showMsg(msg, "Enter account name ❌", "error");
    return;
  }

  // ✅ loading state
  setButtonLoading(btn, "Saving...");

  try {

    const res = await apiPost({
      action: "addAccount",
      business_id: currentBusiness,
      name
    });

    console.log("ADD ACCOUNT RESPONSE:", res); // ✅ IMPORTANT

    // ❌ HANDLE FAILURE PROPERLY
    if (!res || res.success !== true) {

      if (res?.error === "DUPLICATE_ACCOUNT") {
        showMsg(msg, "Account already exists ❌", "error");
      } else {
        showMsg(msg, "Failed to save ❌", "error");
      }

      resetButton(btn);
      return;
    }

    // ✅ SUCCESS
    showMsg(msg, "Account added ✅", "success");

    // update UI
    const newAcc = {
      id: Date.now(),
      business_id: currentBusiness,
      name,
      balance: 0
    };

    window.accountsData.push(newAcc);
    renderCashbookList(window.accountsData);

    setTimeout(closeModal, 800);

  } catch (err) {
    console.error("SAVE ACCOUNT ERROR:", err);

    showMsg(msg, "Server error ❌", "error");
    resetButton(btn);
  }
}

function showMsg(el, text, type) {
  el.innerText = text;
  el.className = `text-sm mb-2 ${type === "error" ? "text-red-400" : "text-green-400"}`;
  el.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

function refreshAccountBalanceInstant() {

  let balance = 0;

  (window.currentTxns || []).forEach(t => {
    balance += Number(t.amount) || 0;
  });

  // update KPI
  document.getElementById("netBalance").innerText = balance;

  // ✅ UPDATE ACCOUNT IN MEMORY
  const acc = window.accountsData.find(
    a => String(a.id) === String(window.currentAccount.id)
  );

  if (acc) {
    acc.balance = balance;
  }

  // ✅ RE-RENDER LEFT PANEL
  renderCashbookList(window.accountsData);

  // store
  window.currentAccount.balance = balance;
}

function searchAccounts(query) {

  window.searchQuery = query.toLowerCase();

  applyAccountFilters();
}

function applyAccountFilters() {

  let data = [...(window.accountsData || [])];

  // ✅ FILTER (SEARCH)
  if (window.searchQuery) {
    data = data.filter(acc =>
      acc.name.toLowerCase().includes(window.searchQuery)
    );
  }

  // ✅ SORT
  if (window.sortType === "az") {
    data.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (window.sortType === "balance") {
    data.sort((a, b) => b.balance - a.balance);
  }

  renderCashbookList(data);
}

function sortAccounts(type) {
  window.sortType = type;
  applyAccountFilters();
}

function highlightText(text, query) {

  if (!query) return text;

  const regex = new RegExp(`(${query})`, "gi");

  return text.replace(regex, `<mark class="bg-yellow-500/30">$1</mark>`);
}

function renderForecast(txns) {

  const el = document.getElementById("forecastBox");

  let balance = 0;
  let daily = {};

  txns.forEach(t=>{
    const d = t.date;
    daily[d] = (daily[d] || 0) + Number(t.amount||0);
    balance += Number(t.amount||0);
  });

  const avg = Object.values(daily).reduce((a,b)=>a+b,0) / Object.keys(daily).length || 0;

  const daysLeft = avg < 0 ? Math.floor(balance / Math.abs(avg)) : "∞";

  el.innerHTML = `
    <div class="text-sm font-bold mb-2">📉 Forecast</div>
    <div>Balance: ₹${balance}</div>
    <div>Daily Avg: ₹${avg.toFixed(0)}</div>
    <div class="text-red-400">Days Left: ${daysLeft}</div>
  `;
}

function renderAccountContribution(txns){

  const el = document.getElementById("accountContribution");

  const map = {};

  txns.forEach(t=>{
    map[t.account_name] = (map[t.account_name]||0) + t.amount;
  });

  el.innerHTML = `
    <div class="font-bold mb-2">🏦 Account Contribution</div>
    ${Object.entries(map).map(([k,v])=>`
      <div class="flex justify-between text-sm">
        <span>${k}</span>
        <span class="${v>=0?'text-green-400':'text-red-400'}">₹${v}</span>
      </div>
    `).join("")}
  `;
}

function renderWeeklyPattern(txns){

  const el = document.getElementById("weeklyPattern");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const map = Array(7).fill(0);

  txns.forEach(t=>{
    const d = new Date(t.date);
    map[d.getDay()] += Math.abs(t.amount);
  });

  el.innerHTML = `
    <div class="font-bold mb-2">📅 Weekly Pattern</div>
    ${days.map((d,i)=>`
      <div class="flex justify-between text-sm">
        <span>${d}</span>
        <span>₹${map[i]}</span>
      </div>
    `).join("")}
  `;
}

function renderRecurring(txns){

  const el = document.getElementById("recurringBox");

  const map = {};

  txns.forEach(t=>{
    const key = t.amount;
    map[key] = (map[key]||0)+1;
  });

  const recurring = Object.entries(map).filter(([k,v])=>v>=3);

  el.innerHTML = `
    <div class="font-bold mb-2">🔁 Recurring</div>
    ${recurring.map(([amt])=>`
      <div class="text-sm">₹${amt} repeating</div>
    `).join("") || "No recurring"}
  `;
}

function renderAIInsights(txns){

  const el = document.getElementById("aiInsights");

  let total = txns.reduce((a,b)=>a+b.amount,0);

  let msg = "Normal activity";

  if (total < 0) msg = "⚠️ Spending exceeds income";
  if (total > 0) msg = "💰 Positive cashflow";

  el.innerHTML = `
    <div class="font-bold mb-2">🧠 Insights</div>
    <div class="text-purple-400 text-sm">${msg}</div>
  `;
}



function renderIncomeExpenseRatio(txns){

  const el = document.getElementById("ratioBox");

  let income=0, expense=0;

  txns.forEach(t=>{
    if(t.amount>0) income+=t.amount;
    else expense+=Math.abs(t.amount);
  });

  const ratio = income ? ((income-expense)/income*100).toFixed(1) : 0;

  el.innerHTML = `
    <div class="font-bold mb-2">📊 Savings Ratio</div>
    <div>${ratio}% saved</div>
  `;
}

function renderLargestTransactions(txns){

  const el = document.getElementById("largestTxns");

  const sorted = [...txns].sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount)).slice(0,5);

  el.innerHTML = `
    <div class="font-bold mb-2">💸 Largest Transactions</div>
    ${sorted.map(t=>`
      <div class="flex justify-between text-sm">
        <span>${t.account_name}</span>
        <span>₹${t.amount}</span>
      </div>
    `).join("")}
  `;
}

function renderFrequency(txns){

  const el = document.getElementById("frequencyBox");

  let inCount=0,outCount=0;

  txns.forEach(t=>{
    if(t.amount>0) inCount++;
    else outCount++;
  });

  el.innerHTML = `
    <div class="font-bold mb-2">🔄 Frequency</div>
    <div>Income: ${inCount}</div>
    <div>Expense: ${outCount}</div>
  `;
}

function renderTopSpendingAccounts(txns) {

  const el = document.getElementById("topSpendingAccounts");
  if (!el) return;

  let map = {};

  txns.forEach(t => {
    if (t.amount < 0) {
      map[t.account] = (map[t.account] || 0) + Math.abs(t.amount);
    }
  });

  const top = Object.entries(map)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

  el.innerHTML = top.map(([name,val]) => `
    <div class="flex justify-between text-sm">
      <span>${name}</span>
      <span>₹${val}</span>
    </div>
  `).join("");
}

function renderDailyAverage(txns) {

  const el = document.getElementById("dailyAvgBox");
  if (!el) return;

  if (!txns.length) {
    el.innerText = "No data";
    return;
  }

  let total = 0;

  txns.forEach(t => total += Number(t.amount || 0));

  const days = new Set(txns.map(t => t.date)).size;

  const avg = Math.round(total / (days || 1));

  el.innerText = `Avg per day: ₹${avg}`;
}

function renderTxnDistribution(txns) {

  const ctx = document.getElementById("txnDistributionChart");
  if (!ctx) return;

  let small=0, medium=0, large=0;

  txns.forEach(t=>{
    const amt = Math.abs(t.amount);

    if (amt < 1000) small++;
    else if (amt < 5000) medium++;
    else large++;
  });

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels:["Small","Medium","Large"],
      datasets:[{ data:[small,medium,large] }]
    }
  });
}

function renderAccountPerformance(txns) {

  const el = document.getElementById("accountPerformance");
  if (!el) return;

  // ================= GROUP DATA =================
  const map = {};

  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const thisYear = now.getFullYear();
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  txns.forEach(t => {

    const acc = t.account && t.account !== "undefined"
  ? t.account
  : "Unknown";
    const amt = Number(t.amount || 0);
    const d = new Date(t.date);

    if (!map[acc]) {
      map[acc] = {
        in: 0,
        out: 0,
        thisMonth: 0,
        lastMonth: 0
      };
    }

    // overall
    if (amt > 0) map[acc].in += amt;
    else map[acc].out += Math.abs(amt);

    // monthly trend
    if (!isNaN(d)) {

      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        map[acc].thisMonth += amt;
      }

      if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        map[acc].lastMonth += amt;
      }
    }
  });

  // ================= CALCULATE =================
  let totalAbs = 0;

  const data = Object.entries(map).map(([name, val]) => {

    const net = val.in - val.out;
    totalAbs += Math.abs(net);

    return {
      name,
      net,
      thisMonth: val.thisMonth,
      lastMonth: val.lastMonth
    };
  });

  // avoid divide by zero
  totalAbs = totalAbs || 1;

  // ================= SORT =================
  data.sort((a, b) => b.net - a.net);

  const maxVal = Math.max(...data.map(d => Math.abs(d.net)), 1);

  // ================= UI =================
  el.innerHTML = `

    <div class="text-sm font-bold mb-3">📊 Account Performance</div>

    ${data.map(d => {

      const width = (Math.abs(d.net) / maxVal) * 100;
      const isPositive = d.net >= 0;

      const percent = ((Math.abs(d.net) / totalAbs) * 100).toFixed(1);

      // ===== TREND =====
      let trend = "→";
      let trendColor = "text-gray-400";

      if (d.thisMonth > d.lastMonth) {
        trend = "↑";
        trendColor = "text-green-400";
      } else if (d.thisMonth < d.lastMonth) {
        trend = "↓";
        trendColor = "text-red-400";
      }

      return `
        <div class="mb-4 cursor-pointer hover:bg-gray-800 p-2 rounded"
          onclick="openAccountFromSummary('${d.name}')">

          <div class="flex justify-between text-xs mb-1">

            <span>${d.name}</span>

            <span class="flex items-center gap-2">

              <span class="${trendColor}">${trend}</span>

              <span class="${isPositive ? 'text-green-400' : 'text-red-400'}">
                ₹${d.net}
              </span>

              <span class="text-gray-400">
                ${percent}%
              </span>

            </span>

          </div>

          <div class="w-full bg-gray-700 h-2 rounded">

            <div 
              class="h-2 rounded ${isPositive ? 'bg-green-500' : 'bg-red-500'}"
              style="width:${width}%">
            </div>

          </div>

        </div>
      `;

    }).join("")}
  `;
}

function generateForecast(txns) {

  const el = document.getElementById("forecastBox");
  if (!el) return;

  if (txns.length < 3) {
    el.innerText = "📊 Not enough data for forecast";
    return;
  }

  // last 7 days avg
  let last7 = txns.slice(-7);
  let total = 0;

  last7.forEach(t => {
    total += Number(t.amount) || 0;
  });

  const avg = total / last7.length;

  // current balance
  let balance = 0;
  txns.forEach(t => balance += Number(t.amount) || 0);

  let future = balance;

  let forecastText = "🔮 Next 7 days: ";

  for (let i = 1; i <= 7; i++) {
    future += avg;
  }

  forecastText += future > balance
    ? `📈 Growing to ₹${Math.round(future)}`
    : `📉 Dropping to ₹${Math.round(future)}`;

  el.innerText = forecastText;
}

function getCategoryEmoji(note = "") {

  note = note.toLowerCase();

  if (note.includes("salary")) return "💰";
  if (note.includes("rent")) return "🏠";
  if (note.includes("food") || note.includes("hotel")) return "🍔";
  if (note.includes("fuel") || note.includes("petrol")) return "⛽";
  if (note.includes("shop") || note.includes("amazon")) return "🛍";

  return "📄";
}

let radarInstance = null;

function renderRadarChart(txns) {

  const canvas = document.getElementById("radarChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let income = 0;
  let expense = 0;

  txns.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expense += Math.abs(t.amount);
  });

  const savings = income - expense;

  if (radarInstance) radarInstance.destroy();

  radarInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Income", "Expense", "Savings"],
      datasets: [{
        data: [income, expense, savings]
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        r: {
          ticks: { display: false }
        }
      }
    }
  });
}