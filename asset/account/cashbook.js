console.log("✅ cashbook.js loaded");

// ================= OPEN CASHBOOK =================
function openCashbook() {

  document.getElementById("customersSection")?.classList.add("hidden");
  document.getElementById("cashbookSection")?.classList.remove("hidden");

  loadCashbook();
}

// ================= LOAD ACCOUNTS =================
async function loadCashbook() {

  const list = document.getElementById("cashbookList");
  list.innerHTML = `<div class="p-3 text-gray-400">Loading...</div>`;

  try {

    const res = await apiGet({
      action: "getAccounts",
      business_id: currentBusiness
    });

    console.log("Accounts:", res);

    const data = Array.isArray(res) ? res : [];

    if (!data.length) {
      list.innerHTML = `<div class="p-3 text-gray-400">No accounts</div>`;
      return;
    }

    renderCashbookList(data);

  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="p-3 text-red-400">Error</div>`;
  }
}

// ================= RENDER ACCOUNT LIST =================
function renderCashbookList(data) {

  const list = document.getElementById("cashbookList");
  list.innerHTML = "";

  data.forEach(row => {

    const acc = {
      id: row[0],
      business_id: row[1],
      name: row[2]
    };

    const div = document.createElement("div");

    div.className = "p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800";

    div.innerHTML = `
      <div class="font-semibold">${acc.name}</div>
    `;

    div.onclick = () => openCashbookReport(acc);

    list.appendChild(div);
  });
}

// ================= OPEN TRANSACTIONS =================
async function openCashbookReport(acc) {

  const panel = document.getElementById("rightPanel");
  panel.innerHTML = `<div class="p-4">Loading...</div>`;

  try {

    const res = await apiGet({
      action: "getCashbookByAccount",
      account_id: acc.id
    });

    console.log("Transactions:", res);

    const data = Array.isArray(res) ? res : [];

    renderCashbookReport(acc, data);

  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="p-4 text-red-400">Error</div>`;
  }
}

// ================= RENDER REPORT =================
function renderCashbookReport(acc, data) {

  const panel = document.getElementById("rightPanel");

  let total = 0;

  let html = `
    <div class="p-4 border-b border-gray-700">
      <div class="text-lg font-bold">${acc.name}</div>
    </div>
  `;

  if (!data.length) {
    html += `<div class="p-4 text-gray-400">No transactions</div>`;
    panel.innerHTML = html;
    return;
  }

  data.forEach(row => {

    const amount = Number(row[3]);
    total += amount;

    const isCredit = amount >= 0;

    html += `
      <div class="p-3 border-b border-gray-800 flex justify-between">

        <div>
          <div>${row[4] || "-"}</div>
          <div class="text-xs text-gray-400">
            ${new Date(row[6]).toLocaleDateString()}
          </div>
        </div>

        <div class="${isCredit ? "text-green-400" : "text-red-400"} font-bold">
          ${isCredit ? "+" : "-"} ₹${Math.abs(amount)}
        </div>

      </div>
    `;
  });

  html = `
    <div class="p-3 bg-gray-900 text-yellow-400 font-bold">
      Balance: ₹${total}
    </div>
  ` + html;

  panel.innerHTML = html;
}

// ================= ADD ACCOUNT =================
function openAddAccount() {

  const modal = document.getElementById("modal");

  modal.innerHTML = `
    <div class="bg-gray-900 p-5 rounded-xl w-80">

      <h3 class="text-lg font-bold mb-3">Add Account</h3>

      <input id="accName" placeholder="Account Name"
        class="w-full p-2 mb-3 bg-black border border-gray-700 rounded" />

      <div class="flex justify-end gap-2">
        <button onclick="closeModal()" class="bg-gray-600 px-3 py-1 rounded">Cancel</button>
        <button onclick="saveAccount()" class="bg-green-600 px-3 py-1 rounded">Save</button>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// ================= SAVE ACCOUNT =================
async function saveAccount() {

  const name = document.getElementById("accName").value.trim();

  if (!name) {
    showToast("Enter name ❌", "error");
    return;
  }

  try {

    const res = await apiPost({
      action: "addAccount",
      business_id: currentBusiness,
      name
    });

    if (!res.success) {
      showToast("Failed ❌", "error");
      return;
    }

    showToast("Account added ✅");
    closeModal();
    loadCashbook();

  } catch (err) {
    console.error(err);
    showToast("Error ❌", "error");
  }
}