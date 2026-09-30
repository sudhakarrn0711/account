// ================= CASHBOOK =================
async function openCashbook() {

  rightPanel.innerHTML = `
  <div class="p-4">

    <div class="flex gap-2 mb-3">
      <input type="date" id="fromDate" class="p-2 bg-black">
      <input type="date" id="toDate" class="p-2 bg-black">
      <button onclick="loadCashReport()" class="bg-blue-600 p-2">Filter</button>
    </div>

    <div id="cashList"></div>

    <div class="flex gap-2 mt-3">
      <button onclick="openCash('in')" class="bg-green-500 p-2 w-1/2">IN</button>
      <button onclick="openCash('out')" class="bg-red-500 p-2 w-1/2">OUT</button>
    </div>

  </div>`;

  loadCashReport();
}

function openCash(type) {
  txnType = type;
  modal.innerHTML = `
  <div class="bg-gray-800 p-4 w-80">
    <h3>${type} Entry</h3>
    <input id="amt" class="w-full p-2 bg-black mt-2">
    <input id="note" class="w-full p-2 bg-black mt-2">
    <button onclick="saveCash()" class="bg-blue-600 w-full p-2 mt-3">Save</button>
  </div>`;
  modal.classList.remove("hidden");
}

async function saveCash() {
  await apiPost({
    action: "addCashEntry",
    business_id: currentBusiness,
    type: txnType,
    amount: Number(amt.value),
    note: note.value,
    mode: "cash"
  });

  modal.classList.add("hidden");
}

// ================= SETTINGS =================
function openSettings() {
  rightPanel.innerHTML = `
  <div class="p-4">
    <h2>Settings</h2>
    <button onclick="openAccountModal()" class="bg-blue-600 p-2">Add Account</button>
  </div>`;
}




let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
  let endX = e.changedTouches[0].clientX;

  if (endX - startX > 80) {
    document.getElementById("sidebar").classList.add("open");
  }

  if (startX - endX > 80) {
    document.getElementById("sidebar").classList.remove("open");
  }
});
//mobile side bar end


function openBulkUpload() {
  modal.innerHTML = `
  <div class="bg-gray-800 p-4 w-96">
    <h3 class="mb-2">Bulk Upload</h3>

    <textarea id="bulkData" placeholder="Name,Phone
Ravi,9999999999
Kumar,8888888888"
    class="w-full h-40 p-2 bg-black"></textarea>

    <button onclick="saveBulkCustomers()" 
      class="bg-blue-600 w-full p-2 mt-3">Upload</button>
  </div>`;

  modal.classList.remove("hidden");
}





window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("excelFile");
  if (input) {
    input.addEventListener("change", handleExcel);
  }
});

/* async function handleExcel(e) {

  const file = e.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) {
    showToast("Excel is empty ❌", "error");
    return;
  }

  showUploadModal();

  let success = 0;
  let duplicate = 0;
  let skipped = 0;

  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    const name = (row.Name || row.name || "").toString().trim();
    const phone = (row.Phone || row.phone || "").toString().trim();

    // ✅ Skip invalid
    if (!name) {
      skipped++;
      updateProgress(i + 1, total);
      continue;
    }

    // ✅ Duplicate detection (existing DB)
    if (phone && isDuplicatePhone(phone)) {
      duplicate++;
      updateProgress(i + 1, total);
      continue;
    }

    try {

      await apiPost({
        action: "addCustomer",
        business_id: currentBusiness,
        name,
        phone
      });

      success++;

      // ✅ Add to memory to avoid duplicate inside same file
      customersData.push({ name, phone });

    } catch (err) {
      console.error("Failed row:", row);
      skipped++;
    }

    updateProgress(i + 1, total);
  }

  hideUploadModal();

  showToast(
    `✅ Added: ${success} | ⚠ Duplicate: ${duplicate} | ❌ Skipped: ${skipped}`
  );

  e.target.value = "";
  openCustomers();
} */


function showUploadModal() {
  document.getElementById("uploadModal").classList.remove("hidden");
}

function hideUploadModal() {
  document.getElementById("uploadModal").classList.add("hidden");
}

function updateProgress(current, total) {

  const percent = Math.round((current / total) * 100);

  document.getElementById("uploadBar").style.width = percent + "%";
  document.getElementById("uploadText").innerText = `Uploading... ${percent}%`;
  document.getElementById("uploadCount").innerText = `${current} / ${total}`;
}

function downloadSampleExcel() {

  const rows = [
    { Name: "Ranjan", Phone: "9876543210", Language: "en" },
    { Name: "Kavitha", Phone: "9876543211", Language: "ta" }
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Customers");

  XLSX.writeFile(wb, "customer_sample.xlsx");
}

function openReport(cid, name) {
  modal.innerHTML = `
  <div class="bg-gray-800 p-4 w-96">

    <h3 class="text-lg mb-3">Report - ${name}</h3>

    <input type="date" id="fromDate" class="w-full p-2 bg-black mb-2">
    <input type="date" id="toDate" class="w-full p-2 bg-black mb-3">

    <button onclick="loadReport('${cid}')" 
      class="bg-blue-600 w-full p-2">View Report</button>

    <div id="reportData" class="mt-3 max-h-60 overflow-auto"></div>

  </div>`;
  modal.classList.remove("hidden");
}

async function loadReport(cid) {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  const data = await apiGet("getCustomerTransactions", {
    bid: currentBusiness,
    cid
  });

  let html = "";

  data.transactions.forEach(t => {
    let d = new Date(t.date).toISOString().split("T")[0];

    if ((!from || d >= from) && (!to || d <= to)) {
      html += `<div class="border-b p-2">
        ${t.type} ₹${t.amount}
      </div>`;
    }
  });

  document.getElementById("reportData").innerHTML = html || "No Data";
}

function openPartySettings(id, name, phone) {
  modal.innerHTML = `
  <div class="bg-gray-800 p-4 w-96">

    <h3 class="text-lg mb-3">Party Profile</h3>

    <input id="editName" value="${name}" class="w-full p-2 bg-black mb-2">
    <input id="editPhone" value="${phone}" class="w-full p-2 bg-black mb-2">

<button onclick="updateCustomer('${id}', this)"
  class="bg-blue-600 w-full p-2 mt-3">
  Update
</button>

    <button onclick="deleteCustomer('${id}')" 
      class="bg-red-600 w-full p-2">Delete</button>

  </div>`;
  modal.classList.remove("hidden");
}

function sendReminder(phone, amount) {
  let msg = encodeURIComponent(`Reminder: Please pay ₹${amount}`);
  window.open(`https://wa.me/${phone}?text=${msg}`);
}

function sendSMS(phone, amount) {
  window.location.href = `sms:${phone}?body=Reminder: Please pay ₹${amount}`;
}


function openTxn(type) {

  txnType = type;

  customerTxnRequestId =
  createClientRequestId(
    "customer"
  );

  const today = new Date().toISOString().split("T")[0];

  modal.innerHTML = `
  <div class="bg-gray-900 p-5 w-80 rounded-xl shadow-xl">

    <h3 class="text-lg font-bold mb-4 text-center">
      ${type === "gave" ? "🔴 You Gave" : "🟢 You Got"}
    </h3>

    <!-- Amount -->
    <input id="amt" type="number" placeholder="Enter Amount"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-3 focus:outline-none">

    <!-- Description -->
    <input id="note" placeholder="Description"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-3 focus:outline-none">
      

    <!-- Date -->
    <input id="txnDate" type="date" value="${today}"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-4 focus:outline-none">

    <!-- Buttons -->
    <div class="flex gap-2">
      <button onclick="closeModal()"
        class="w-1/2 bg-gray-700 p-3 rounded">
        Cancel
      </button>

      <button onclick="saveTxn()"
        class="w-1/2 bg-blue-600 p-3 rounded">
        Save
      </button>
    </div>

  </div>
  `;

  modal.classList.remove("hidden");
}

function openModal() {
  openModal();
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
}

modal.addEventListener("click", (e) => {
  if (e.target.id === "modal") {
    closeModal();
  }
});



/* =========================================================
   CLIENT REQUEST ID
   Used for duplicate transaction protection
   ========================================================= */

function createClientRequestId(prefix = "txn") {

  // Modern browsers
  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {

    return (
      prefix +
      "_" +
      crypto.randomUUID()
    );

  }


  // Fallback for older browsers
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 12)
  );

}