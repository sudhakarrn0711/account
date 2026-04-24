let selectedCashTxns = new Set();
let cashLongPressTimer;

console.log("✅ cashbook.js loaded");

/* ================= OPEN CASHBOOK ================= */
function openCashbook() {
  document.getElementById("customersSection").classList.add("hidden");
  document.getElementById("cashbookSection").classList.remove("hidden");
  loadCashbook();
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

/* ================= MAIN UI ================= */
function renderCashbookReport(acc, txns) {

  const panel = document.getElementById("rightPanel");

  panel.innerHTML = `

    <!-- HEADER -->
    <div class="p-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">

      <div class="flex items-center gap-2">

  <!-- ✅ MOBILE BACK -->
  <button onclick="mobileBack()"
    class="md:hidden bg-gray-700 px-2 py-1 rounded text-sm">
    ←
  </button>

  <div class="text-lg font-bold">${acc.name}</div>

</div>

      <!-- KPI SUMMARY -->
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

    <!-- TXN LIST -->
    <div id="txnList" class="pb-20"></div>

    <!-- BOTTOM BAR -->
    <div class="sticky bottom-0 bg-gray-900 p-3 flex gap-2 border-t border-gray-700">

      <button onclick="openCashEntryModal('${acc.id}','in')"
        class="flex-1 bg-green-500/20 hover:bg-green-600 text-green-300 hover:text-white p-3 rounded-xl font-bold transition">
        + Cash In
      </button>

      <button onclick="openCashEntryModal('${acc.id}','out')"
        class="flex-1 bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white p-3 rounded-xl font-bold transition">
        - Cash Out
      </button>

    </div>
  `;

  window.currentAccount = acc;
  window.currentTxns = txns;

  applyFilter();
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

  const list = document.getElementById("txnList");

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
          <div>${t.note || "-"}</div>

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

