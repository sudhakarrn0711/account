
// ================= API =================
const API = "https://script.google.com/macros/s/AKfycbz-v31KuI2QXiGRlG0Xlf_O-AmiSy40DVAfVBfh6JGQW6kkuP6yuFHkmbgShQvmwqJi/exec";

const envToggle = document.getElementById("envToggle");

// Load saved env
const savedEnv = localStorage.getItem("env") || "test";
envToggle.checked = savedEnv === "live";

// Save on change
envToggle.onchange = () => {
  const env = envToggle.checked ? "live" : "test";
  localStorage.setItem("env", env);
  location.reload();
};

// ================= COMMON FETCH HELPERS =================

// ================= API HELPERS =================

// GET
// ================= ENV HELPER =================
function getEnv() {
  const toggle = document.getElementById("envToggle");
  return toggle && toggle.checked ? "live" : "test";
}

// ================= GET =================
async function apiGet(actionOrParams, params = {}) {

  const env = getEnv();
  console.log("GET ENV:", env);

  let query = {};

  // ✅ SUPPORT OLD FORMAT
  if (typeof actionOrParams === "string") {
    query = {
      action: actionOrParams,
      ...params,
      env
    };
  }
  // ✅ SUPPORT NEW FORMAT
  else if (typeof actionOrParams === "object") {
    query = {
      ...actionOrParams,
      env
    };
  }

  const url = `${API}?${new URLSearchParams(query)}`;

  console.log("GET URL:", url);

  try {

    const res = await fetch(url);
    const text = await res.text();

    console.log("RAW RESPONSE:", text);

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON parse failed");
      return { error: true };
    }

  } catch (err) {
    console.error("GET ERROR:", err);
    showToast("Network error", "error");
    return { error: true };
  }
}

// ================= POST =================
async function apiPost(body) {

  const env = getEnv();
  console.log("POST ENV:", env);

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"   // 🔥 IMPORTANT (fixes GAS CORS)
      },
      body: JSON.stringify({
        ...body,
        env: env
      })
    });

    if (!res.ok) throw new Error("Network response not ok");

    const data = await res.json();
    return data;

  } catch (err) {
    console.error("POST ERROR:", err);
    showToast("Network error", "error");
    return { success: false };
  }
}

let currentReportData = [];
let customersData = [];

// ================= STATE =================
let currentBusiness = localStorage.getItem("business") || "";
let selectedCustomer = "";

// ================= INIT =================
loadBusinesses();


let businessName = "";
// ================= BUSINESS =================
async function loadBusinesses() {
  const data = await apiGet("getBusinesses");

  console.log("BUSINESSES:", data);

  let html = "";

  data.slice(1).forEach(b => {
    html += `<option value="${b[0]}">${b[1]}</option>`;
  });

  businessSelect.innerHTML = html;

  if (!currentBusiness && data[1]) {
    currentBusiness = data[1][0];
  }

  businessSelect.value = currentBusiness;

  const selected = data.find(b => b[0] == currentBusiness);
  businessName = selected ? selected[1] : "My Business";

  businessSelect.onchange = () => {
    currentBusiness = businessSelect.value;
    localStorage.setItem("business", currentBusiness);

    const selected = data.find(b => b[0] == currentBusiness);
    businessName = selected ? selected[1] : "My Business";

    openCustomers();
  };

  openCustomers();
}

function openBusinessModal() {
  modal.innerHTML = `
    <div class="bg-gray-800 p-4 w-80">
      <h3>Add Business</h3>
      <input id="bname" class="w-full p-2 bg-black mt-2">
      <button onclick="saveBusiness()" class="bg-green-600 w-full p-2 mt-3">Save</button>
    </div>`;
  modal.classList.remove("hidden");
}

async function saveBusiness() {
  await apiPost({
    action: "addBusiness",
    name: bname.value
  });

  modal.classList.add("hidden");
  loadBusinesses();
}

// ================= CUSTOMERS =================
async function openCustomers() {


  // SHOW CUSTOMER VIEW
  document.getElementById("customersSection").classList.remove("hidden");

  // HIDE CASHBOOK
  document.getElementById("cashbookSection").classList.add("hidden");

  // RESET WIDTH
  document.getElementById("leftPanel").classList.remove("w-1/2");
  document.getElementById("leftPanel").classList.add("w-1/3");

  showListLoader(); // ✅ reusable loader

  if (!currentBusiness) {
    customerList.innerHTML = `<div class="p-3 text-gray-400">No Business Selected</div>`;
    return;
  }

  try {

    let res = await apiGet("getCustomersWithBalance", {
      bid: currentBusiness
    });

    console.log("API RAW RESPONSE:", res);

    // ✅ HANDLE ALL CASES
    if (!res || res.error) {
      console.error("API returned error:", res);
      customerList.innerHTML = `<div class="p-3 text-red-400">API Error</div>`;
      return;
    }

    let data = res?.data || res?.customers || res || [];

    customersData = data.map(c => {

      if (Array.isArray(c)) {
        return {
          id: c[0],
          name: c[1],
          phone: c[3]
        };
      }

      return c;
    });

    if (!Array.isArray(data)) {
      console.error("Invalid API response:", res);
      customerList.innerHTML = `<div class="p-3 text-red-400">Invalid Data</div>`;
      return;
    }

    if (!data.length) {
      customerList.innerHTML = `<div class="p-3 text-gray-400">No Customers</div>`;
      return;
    }

    let html = `
      <div class="p-3 border-b flex justify-between text-xs text-gray-400">
        <span>NAME</span>
        <span>AMOUNT</span>
      </div>`;

    data.forEach(c => {

      const bal = Number(c.balance || 0);
      const isGive = bal >= 0;

      html += `
        <div onclick="selectCustomer('${c.id}','${c.name}','${c.phone}')"
          class="p-3 border-b cursor-pointer hover:bg-gray-800 flex justify-between">

          <div>
            <div class="font-medium">${c.name}</div>
            <div class="text-xs text-gray-400">${c.phone || ""}</div>
          </div>

          <div class="text-right">
            <div class="${isGive ? 'text-red-400' : 'text-green-400'} font-bold">
              ₹${Math.abs(bal)}
            </div>

            <div class="text-xs text-gray-400">
              ${isGive ? "YOU WILL GET" : "YOU WILL GIVE"}
            </div>
          </div>

        </div>`;
    });

    customerList.innerHTML = html;

  } catch (err) {
    console.error(err);
    customerList.innerHTML = `<div class="p-3 text-red-400">Failed to load</div>`;
  }
}


function openAddCustomer() {

  modal.innerHTML = `
  <div class="bg-gray-900 p-6 w-80 rounded-2xl shadow-2xl relative">

    <!-- CLOSE -->
    <button onclick="closeModal()"
      class="absolute top-2 right-3 text-gray-400 text-lg hover:text-white">
      ✖
    </button>

    <!-- TITLE -->
    <h3 class="text-lg font-bold mb-4 text-center">
      ➕ Add Customer
    </h3>

    <!-- NAME -->
    <label class="text-sm text-gray-400">Customer Name</label>
    <input id="cname" placeholder="Enter name"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-3 mt-1 focus:outline-none">

    <!-- PHONE -->
    <label class="text-sm text-gray-400">Phone Number</label>
    <input id="cphone" placeholder="Enter phone"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-4 mt-1 focus:outline-none">


<select id="custLang" class="w-full p-2 mb-2 bg-black border border-gray-700 rounded">
  <option value="en">English</option>
  <option value="hi">Hindi</option>
  <option value="ta">Tamil</option>
</select>

    <!-- BUTTONS -->
    <div class="flex gap-2">
      <button onclick="closeModal()"
        class="w-1/2 bg-gray-700 p-3 rounded">
        Cancel
      </button>

      <button onclick="saveCustomer()"
        class="w-1/2 bg-blue-600 p-3 rounded">
        Save
      </button>
    </div>

  </div>
  `;

  modal.classList.remove("hidden");
}

async function saveCustomer() {

  const btn = event.target;
  setButtonLoading(btn, "Saving...");

  const name = document.getElementById("cname").value.trim();
  const phone = document.getElementById("cphone").value.trim();
  const lang = document.getElementById("custLang").value; // 🔥 NEW

  // ✅ VALIDATION
  if (!name) {
    showToast("Enter customer name", "error");
    resetButton(btn);
    return;
  }

  // ✅ DUPLICATE CHECK
  if (phone && isDuplicatePhone(phone)) {
    showToast("⚠️ Phone number already exists", "error");
    resetButton(btn);
    return;
  }

  try {

    // ✅ SAVE CUSTOMER
    const res = await apiPost({
      action: "addCustomer",
      business_id: currentBusiness,
      name,
      phone,
      language: lang // 🔥 NEW
    });

    if (!res.success) {
      showToast("Failed to add customer ❌", "error");
      resetButton(btn);
      return;
    }

    // ✅ SEND WHATSAPP INVITE (BACKGROUND - NO WAIT)
    if (phone) {
      sendWhatsAppInviteAPI(name, phone);
    }

    showSuccess("Customer added successfully ✅");

  } catch (err) {
    console.error(err);
    showToast("Error occurred ❌", "error");
  }

  resetButton(btn);
  modal.classList.add("hidden");
  openCustomers();
}

// ================= LEDGER =================
async function selectCustomer(id, name, phone = "") {


  selectedTxns.clear();
  updateMultiDeleteBar();

  selectedCustomer = id;

  // ✅ INSTANT LOADER UI
  rightPanel.innerHTML = `
    <div class="p-6 animate-pulse space-y-4">

      <div class="h-6 bg-gray-700 rounded w-1/3"></div>
      <div class="h-4 bg-gray-700 rounded w-1/4"></div>

      <div class="space-y-3 mt-6">
        <div class="h-16 bg-gray-800 rounded"></div>
        <div class="h-16 bg-gray-800 rounded"></div>
        <div class="h-16 bg-gray-800 rounded"></div>
      </div>

    </div>
  `;

  const data = await apiGet("getCustomerTransactions", {
    bid: currentBusiness,
    cid: id
  });

  let give = 0, get = 0;

  const txns = data.transactions || [];


  txns.forEach(t => {



    if (t.type === "gave") give += Number(t.amount);
    else get += Number(t.amount);
  });

  // ✅ NET CALCULATION
  let net = give - get;

  let netText = net >= 0
    ? `<span class="text-red-500">You Gave ₹${net}</span>`
    : `<span class="text-green-500">You Got ₹${Math.abs(net)}</span>`;

  let html = `

  <!-- HEADER -->
  <div class="p-4 border-b flex justify-between items-center">

    <div>
      <div class="text-lg font-bold">${name}</div>
      <div class="text-sm text-gray-400">${phone || ""}</div>
    </div>

    <div class="flex gap-2">
      <button onclick="openReportPanel('${id}', \`${name}\`)"" 
        class="border px-3 py-1 rounded hover:bg-gray-700">Report</button>

      <button onclick="openCustomerSettings('${id}','${name}')"
        class="border px-3 py-1 rounded hover:bg-gray-700">
        ⚙️
      </button>
    </div>

  </div>

  <!-- SUMMARY -->
  <div class="p-4 border-b">

    <div class="text-sm text-gray-400">NET BALANCE</div>
    <div class="text-lg font-bold mt-1">${netText}</div>

    <div class="mt-3">

<button 
  class="w-full border p-2 rounded hover:bg-green-700 flex items-center justify-center gap-2 wa-btn"
  data-name="${name}"
  data-phone="${phone}"
  data-amount="${Math.abs(net)}">

  <span class="wa-text">WhatsApp Reminder</span>
</button>

      <select id="lang" class="w-full p-2 bg-black mt-2">
        <option value="en">English</option>
        <option value="ta">Tamil</option>
        <option value="hi">Hindi</option>
      </select>

    </div>

  </div>

  <!-- TRANSACTIONS -->
  <div class="flex-1 overflow-auto p-4 space-y-2">
  `;

  data.transactions.reverse().forEach(t => {

    html += `
    <div class="relative overflow-hidden rounded-lg">

      <!-- ACTION BUTTONS -->
<div class="absolute right-0 top-0 h-full flex z-0 w-[140px] rounded-xl overflow-hidden">

  <!-- EDIT -->
  <button onclick="editTxn('${t.id}','${t.type}','${t.amount}','${t.note}','${t.date}')"
    class="w-[70px] flex items-center justify-center
           bg-gradient-to-br from-blue-500 to-blue-700
           hover:from-blue-400 hover:to-blue-600
           shadow-md active:scale-90 transition duration-150">

    <!-- MODERN EDIT ICON -->
    <svg xmlns="http://www.w3.org/2000/svg"
      class="w-5 h-5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2">
      
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213 3 21l1.787-4.5L16.862 3.487z"/>
    </svg>

  </button>

  <!-- DELETE -->
  <button onclick="deleteTxn('${t.id}', this)"
    class="w-[70px] flex items-center justify-center
           bg-gradient-to-br from-red-500 to-red-700
           hover:from-red-400 hover:to-red-600
           shadow-md active:scale-90 transition duration-150">

    <!-- MODERN DELETE ICON -->
    <svg xmlns="http://www.w3.org/2000/svg"
      class="w-5 h-5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2">

      <path stroke-linecap="round" stroke-linejoin="round"
        d="M6 7h12M9 7v10m6-10v10M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z"/>
    </svg>

  </button>

</div>

      <!-- MAIN CARD -->
<div class="txnCard bg-gray-900 p-3 relative z-10 transition-transform duration-200"
     data-id="${t.id}"
     oncontextmenu="return false;"
     ontouchstart="startSwipe(event,this); startLongPress(event,this)"
     ontouchmove="moveSwipe(event)"
     ontouchend="endSwipe(); cancelLongPress()"

     onmousedown="startSwipe(event,this); startLongPress(event,this)"
     onmousemove="moveSwipe(event)"
     onmouseup="endSwipe(); cancelLongPress()"
>

        <div class="text-sm font-medium">
          ${new Date(t.date).toLocaleDateString()}
        </div>

        <div class="text-xs text-gray-400">
          Balance: ₹${t.runningBalance}
        </div>

        <div class="flex justify-between mt-1">

          <div class="text-xs">${t.note || ""}</div>

          <div class="flex gap-10">
            <span class="text-red-400 font-semibold">
              ${t.type === "gave" ? "₹" + t.amount : "-"}
            </span>
            <span class="text-green-400 font-semibold">
              ${t.type === "got" ? "₹" + t.amount : "-"}
            </span>
          </div>

        </div>

      </div>

    </div>
    `;
  });

  html += `
  </div>

  <!-- ACTION BUTTONS (FIXED) -->
  <div class="flex gap-4 p-4 border-t">

    <button onclick="openTxn('gave')" 
      class="flex-1 bg-red-200 text-red-700 p-3 rounded-lg
             hover:bg-red-500 hover:text-white transition">
      You Gave ₹
    </button>

    <button onclick="openTxn('got')" 
      class="flex-1 bg-green-200 text-green-700 p-3 rounded-lg
             hover:bg-green-500 hover:text-white transition">
      You Got ₹
    </button>

  </div>
  `;

  rightPanel.innerHTML = html;
}


document.addEventListener("click", function (e) {

  const btn = e.target.closest(".wa-btn");
  if (!btn) return;

  const name = btn.dataset.name;
  const phone = btn.dataset.phone;
  const amount = btn.dataset.amount;

  handleWhatsAppClick(btn, name, phone, amount);

});

async function saveTxn() {

  const btn = event.target;
  setButtonLoading(btn);

  const amount = Number(document.getElementById("amt").value);
  const note = document.getElementById("note").value;
  const date = document.getElementById("txnDate").value;

  if (!amount) {
    alert("Enter amount");
    resetButton(btn);
    return;
  }

  await apiPost({
    action: "addTransaction",
    business_id: currentBusiness,
    customer_id: selectedCustomer,
    type: txnType,
    amount,
    note,
    date
  });

  resetButton(btn);
  showSuccess("Transaction saved ✅");

  // ===============================
  // ✅ WhatsApp (SAFE - BACKGROUND)
  // ===============================
  setTimeout(async () => {
    try {

      const list = await apiGet("getCustomersWithBalance", {
        bid: currentBusiness,
        env: "test"
      });

      const customer = list.find(
        c => String(c.id) === String(selectedCustomer)
      );

      if (customer) {
        sendTxnWhatsApp(
          customer.name,
          customer.phone,
          amount,
          txnType,
          customer.balance || 0 // ✅ SAFE
        );
      }

    } catch (err) {
      console.error("WA FETCH ERROR:", err);
    }
  }, 0);

  // ===============================
  // UI FLOW (unchanged)
  // ===============================
  modal.classList.add("hidden");
  selectCustomer(selectedCustomer, "");
  openCustomers();
}

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



//mobile side bar start
function toggleSidebar() {

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebar.classList.toggle("open");

  if (sidebar.classList.contains("open")) {
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

// close on overlay click
document.getElementById("sidebarOverlay").onclick = toggleSidebar;

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




document.getElementById("searchBox").addEventListener("input", filterCustomers);

function filterCustomers() {
  const val = searchBox.value.toLowerCase();
  const items = customerList.children;

  for (let i = 1; i < items.length; i++) {
    const txt = items[i].innerText.toLowerCase();
    items[i].style.display = txt.includes(val) ? "flex" : "none";
  }
}

function sortCustomers(type) {
  if (type === "high") {
    customers.sort((a, b) => b.balance - a.balance);
  } else {
    customers.sort((a, b) => a.balance - b.balance);
  }
  renderCustomers();
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



async function openReportPanel(cid, name) {

  try {

    const data = await apiGet("getCustomerTransactions", {
      bid: currentBusiness,
      cid: cid
    });

    if (!data || !data.transactions) {
      showToast("No data found", "error");
      return;
    }

    currentReportData = data.transactions; // ✅ store globally

    let give = 0, get = 0;

    data.transactions.forEach(t => {
      if (t.type === "gave") give += Number(t.amount);
      else get += Number(t.amount);
    });

    let net = give - get;

    // ✅ FIXED COLOR
    let netColor = net >= 0 ? "text-red-500" : "text-green-500";

    rightPanel.innerHTML = `
    <div class="p-4">

      <!-- HEADER -->
<div class="flex justify-between items-center mb-4">

  <div>
    <div class="text-xl font-bold">${name}</div>
    <div class="text-xs text-gray-400">Transaction Report</div>
  </div>

  <div class="flex gap-2">
    <button onclick="downloadPDF()" 
      class="border px-3 py-1 rounded hover:bg-gray-700">
      PDF
    </button>

    <button onclick="downloadExcel()" 
      class="border px-3 py-1 rounded hover:bg-gray-700">
      Excel
    </button>
  </div>

</div>

      <!-- FILTER -->
<div class="flex gap-2 mb-4 flex-wrap">

  <select id="period" onchange="handleQuickFilter('${cid}','${name}')"
    class="p-2 bg-black rounded">

    <option value="">Select</option>
    <option value="this">This Month</option>
    <option value="last">Last Month</option>
    <option value="custom">Custom</option>

  </select>

  <input type="date" id="fromDate" class="p-2 bg-black rounded">
  <input type="date" id="toDate" class="p-2 bg-black rounded">

  <button onclick="applyReportFilter('${cid}','${name}')"
    class="bg-blue-600 px-3 rounded">
    Apply
  </button>

</div>

      <!-- SUMMARY -->
      <div class="flex gap-4 mb-4">

        <div class="flex-1 bg-red-100 text-red-600 p-4 rounded">
          <div class="text-xl font-bold">₹${give}</div>
          <div>You Gave</div>
        </div>

        <div class="flex-1 bg-green-100 text-green-600 p-4 rounded">
          <div class="text-xl font-bold">₹${get}</div>
          <div>You Got</div>
        </div>

<div class="flex-1 bg-gray-900 border border-gray-700 p-4 rounded">

  <div class="text-sm text-gray-400">Net Balance</div>

  <div class="text-xl font-bold mt-1 ${net >= 0 ? "text-red-400" : "text-green-400"
      }">

    ${net >= 0
        ? `You will get ₹${net}`
        : `You need to pay ₹${Math.abs(net)}`
      }

  </div>

</div>

      </div>

      <!-- TABLE -->
      <div id="reportTable" class="mt-2 max-h-[400px] overflow-auto"></div>

      <!-- BACK -->
      <div class="mt-4">
        <button onclick="selectCustomer('${cid}','${name}')" 
          class="bg-gray-700 px-4 py-2 rounded">
          ← Back
        </button>
      </div>

    </div>
    `;

    // ✅ IMPORTANT: render AFTER DOM exists
    renderReportTable(data.transactions, name);

  } catch (err) {
    console.error(err);
    showToast("Report failed", "error");
  }
}


async function openCustomerSettings(id, name) {

  const customers = await apiGet("getCustomers", { bid: currentBusiness });

  const cust = customers.find(c => c[0] == id);

  const phone = cust ? cust[3] : "";
  const gst = cust ? cust[4] : "";
  const shipping = cust ? cust[5] : "";
  const billing = cust ? cust[6] : "";
  const lang = cust ? (cust[7] || "en") : "en"; // ✅ NEW

  rightPanel.innerHTML = `
  <div class="h-full flex flex-col">

    <!-- HEADER -->
    <div class="p-4 border-b flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
          ${name[0]}
        </div>
        <div>
          <div class="font-bold text-lg">${name}</div>
          <div class="text-sm text-gray-400">${phone}</div>
        </div>
      </div>

      <button onclick="selectCustomer('${id}','${name}')" 
        class="text-gray-400">✖</button>
    </div>

    <!-- CONTENT -->
    <div class="flex-1 overflow-auto p-4 space-y-4">

      <!-- EDIT PROFILE -->
      <button onclick="editCustomer('${id}','${name}','${phone}','${lang}')"
        class="w-full border p-3 rounded hover:bg-gray-700">
        ✏️ Edit Profile
      </button>

      <!-- PHONE -->
      <div class="border-b pb-3">
        <div class="text-gray-400 text-sm">Phone Number</div>
        <div>${phone}</div>
      </div>

      <!-- LANGUAGE -->
      <div>
        <div class="text-gray-400 text-sm">Language</div>
        <select id="lang" class="w-full p-2 bg-black rounded mt-1">
          <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
          <option value="ta" ${lang === "ta" ? "selected" : ""}>Tamil</option>
          <option value="hi" ${lang === "hi" ? "selected" : ""}>Hindi</option>
        </select>
      </div>

      <!-- GST -->
      <div>
        <div class="text-gray-400 text-sm">GST Number</div>
        <input id="gst" value="${gst}" 
          class="w-full p-2 bg-black rounded mt-1">
      </div>

      <!-- SHIPPING -->
      <div>
        <div class="text-gray-400 text-sm">Shipping Address</div>
        <input id="shipping" value="${shipping}"
          class="w-full p-2 bg-black rounded mt-1">
      </div>

      <!-- BILLING -->
      <div>
        <div class="text-gray-400 text-sm">Billing Address</div>
        <input id="billing" value="${billing}"
          class="w-full p-2 bg-black rounded mt-1">
      </div>

      <!-- SAVE -->
      <button onclick="saveCustomerExtra('${id}', this)"
        class="bg-green-600 w-full p-2 rounded">
        Save Details
      </button>

      <!-- DELETE -->
      <button onclick="confirmDeleteCustomer('${id}')"
        class="border border-red-500 text-red-500 w-full p-2 rounded hover:bg-red-500/10">
        🗑 Delete Customer
      </button>

    </div>
  </div>
  `;
}

function editCustomer(id, name, phone, language = "en") {

  modal.innerHTML = `
  <div class="bg-gray-900 p-6 w-80 rounded-2xl shadow-2xl relative">

    <!-- CLOSE -->
    <button onclick="closeModal()"
      class="absolute top-2 right-3 text-gray-400 text-lg hover:text-white">
      ✖
    </button>

    <h3 class="text-lg font-bold mb-4 text-center">
      ✏️ Edit Customer
    </h3>

    <!-- NAME -->
    <label class="text-sm text-gray-400">Customer Name</label>
    <input id="ename" value="${name}"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-3 mt-1">

    <!-- PHONE -->
    <label class="text-sm text-gray-400">Phone Number</label>
    <input id="ephone" value="${phone}"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-3 mt-1">

    <!-- 🌐 LANGUAGE -->
    <label class="text-sm text-gray-400">Language</label>
    <select id="elang"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-4 mt-1">

      <option value="en" ${language === "en" ? "selected" : ""}>English</option>
      <option value="hi" ${language === "hi" ? "selected" : ""}>Hindi</option>
      <option value="ta" ${language === "ta" ? "selected" : ""}>Tamil</option>

    </select>

    <!-- BUTTONS -->
    <div class="flex gap-2">
      <button onclick="closeModal()"
        class="w-1/2 bg-gray-700 p-3 rounded">
        Cancel
      </button>

      <button onclick="updateCustomer('${id}', this)"
        class="w-1/2 bg-blue-600 p-3 rounded">
        Update
      </button>
    </div>

  </div>
  `;

  modal.classList.remove("hidden");
}

async function updateCustomer(id, btn) {

  setButtonLoading(btn, "Updating...");

  try {

    const res = await apiPost({
      action: "updateCustomer",
      id,
      name: document.getElementById("ename").value,
      phone: document.getElementById("ephone").value,
      language: document.getElementById("elang").value // ✅ NEW
    });

    if (res.success) {
      showSuccess("Customer updated ✅");
    } else {
      showToast("Update failed ❌", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Update failed ❌", "error");
  }

  resetButton(btn);
  closeModal();
  openCustomers();
}

async function deleteCustomer(id, btn) {

  setButtonLoading(btn, "Deleting...");

  try {

    const res = await apiPost({
      action: "deleteCustomer",
      id
    });

    if (res.success) {
      showSuccess("Customer deleted ✅");
    } else {
      showToast("Delete failed ❌", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Delete failed ❌", "error");
  }

  closeModal();

  rightPanel.innerHTML = `
    <div class="flex items-center justify-center h-full text-gray-400">
      Customer Deleted
    </div>`;

  openCustomers();
}

function confirmDeleteCustomer(id) {

  modal.innerHTML = `
    <div class="bg-gray-900 p-6 w-80 rounded-xl text-center">

      <div class="mb-4 text-lg">Delete this customer?</div>
      <div class="text-sm text-gray-400 mb-4">This action cannot be undone</div>

      <div class="flex gap-2">
        <button onclick="closeModal()"
          class="w-1/2 bg-gray-700 p-2 rounded">
          Cancel
        </button>

        <button id="delBtn"
          onclick="deleteCustomer('${id}', this)"
          class="w-1/2 bg-red-600 p-2 rounded">
          Delete
        </button>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
}


async function saveCustomerExtra(id, btn) {

  setButtonLoading(btn, "Saving...");

  try {
    const res = await apiPost({
      action: "saveCustomerExtra",
      id,
      gst: document.getElementById("gst").value,
      shipping: document.getElementById("shipping").value,
      billing: document.getElementById("billing").value
    });

    if (res.success) {
      showSuccess("Saved successfully ✅");
    } else {
      showToast("Save failed ❌", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Save failed ❌", "error");
  }

  resetButton(btn);
}

function editTxn(id, type, amount, note, date) {

  const d = new Date(date).toISOString().split("T")[0];

  modal.innerHTML = `
  <div class="bg-gray-900 p-6 w-80 rounded-2xl shadow-2xl relative">

    <!-- CLOSE BUTTON -->
    <button onclick="closeModal()"
      class="absolute top-2 right-3 text-gray-400 text-lg">
      ✖
    </button>

    <h3 class="text-lg font-bold mb-4">Edit Entry</h3>

    <input id="eAmt" value="${amount}" type="number"
      class="w-full p-3 bg-black mb-3 rounded border border-gray-700">

    <input id="eNote" value="${note || ""}"
      class="w-full p-3 bg-black mb-3 rounded border border-gray-700">

    <input id="eDate" type="date" value="${d}"
      class="w-full p-3 bg-black mb-4 rounded border border-gray-700">

    <button onclick="updateTxn('${id}')"
      class="bg-blue-600 w-full p-3 rounded-xl">
      Update
    </button>

  </div>
  `;

  modal.classList.remove("hidden");
}

async function updateTxn(id) {

  const btn = event.target;
  setButtonLoading(btn, "Updating...");

  await apiPost({
    action: "updateTransaction",
    id,
    amount: document.getElementById("eAmt").value,
    note: document.getElementById("eNote").value,
    date: document.getElementById("eDate").value
  });

  resetButton(btn);
  showSuccess("Updated ✅");

  modal.classList.add("hidden");
  selectCustomer(selectedCustomer, "");
  openCustomers();
}

async function deleteTxn(id, btn) {

  const confirm = await customConfirm("Delete this entry?");
  if (!confirm) return;

  // ✅ show inline loader
  setButtonLoading(btn, "Deleting...");

  try {

    const res = await apiPost({
      action: "deleteTransaction",
      id: id
    });

    if (res.success) {
      showSuccess("Deleted successfully ✅");
    } else {
      showToast("Delete failed ❌", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Delete failed ❌", "error");
  }

  // refresh UI
  selectCustomer(selectedCustomer, "");
  openCustomers();
}

function updateTransaction(data, env) {

  const sheet = getSheet("transactions", env);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {

      sheet.getRange(i + 1, 5).setValue(Number(data.amount));
      sheet.getRange(i + 1, 6).setValue(data.note);
      sheet.getRange(i + 1, 7).setValue(new Date(data.date));

      break;
    }
  }

  return json({ success: true });
}

let activeCard = null;
;
let currentX = 0;
let startX1 = 0
function startSwipe(e, el) {

  // close others
  document.querySelectorAll('.txnCard').forEach(card => {
    if (card !== el) {
      card.style.transform = "translateX(0)";
    }
  });

  activeCard = el;
  startX1 = e.touches ? e.touches[0].clientX : e.clientX;
  el.style.transition = "none";
}

function moveSwipe(e) {
  if (!activeCard) return;

  currentX = e.touches ? e.touches[0].clientX : e.clientX;
  let diff = currentX - startX1;

  // LEFT
  if (diff < 0) {
    activeCard.style.transform = `translateX(${Math.max(diff, -180)}px)`;
  }

  // RIGHT
  if (diff > 0) {
    activeCard.style.transform = `translateX(${Math.min(diff, 120)}px)`;
  }
}

function endSwipe() {
  if (!activeCard) return;

  let diff = currentX - startX1;

  activeCard.style.transition = "0.3s";

  // LEFT SWIPE → SHOW FULL BUTTON
  if (diff < -80) {
    activeCard.style.transform = "translateX(-140px)";
  }

  // RIGHT SWIPE → MARK PAID
  else if (diff > 80) {
    markAsPaid(activeCard);
    activeCard.style.transform = "translateX(0)";
  }

  else {
    activeCard.style.transform = "translateX(0)";
  }

  activeCard = null;
}

async function markAsPaid(card) {

  const id = card.dataset.id;

  // prevent duplicate popup
  if (card.querySelector(".confirmBox")) return;

  // Inline confirm UI
  const confirmBox = document.createElement("div");
  confirmBox.className = "confirmBox absolute inset-0 bg-black/80 flex items-center justify-center z-50";
  confirmBox.innerHTML = `
    <div class="bg-gray-900 p-4 rounded text-center w-[200px]">

      <div class="mb-3">Mark as paid?</div>

      <div class="flex gap-2 justify-center">
        <button class="cancelBtn bg-gray-700 px-3 py-1 rounded">Cancel</button>
        <button class="yesBtn bg-green-600 px-3 py-1 rounded">Yes</button>
      </div>

    </div>
  `;

  card.appendChild(confirmBox);

  const cancelBtn = confirmBox.querySelector(".cancelBtn");
  const yesBtn = confirmBox.querySelector(".yesBtn");

  // ✅ CANCEL FIX (remove properly)
  cancelBtn.onclick = () => {
    confirmBox.remove();
  };

  // ✅ YES CLICK
  yesBtn.onclick = async () => {

    setButtonLoading(yesBtn, "Updating...");

    try {

      const res = await apiPost({
        action: "markPaid",
        id
      });

      if (res.success) {
        showSuccess("Marked as paid ✅");
      } else {
        showToast("Failed ❌", "error");
      }

    } catch (err) {
      console.error(err);
      showToast("Failed ❌", "error");
    }

    confirmBox.remove();

    selectCustomer(selectedCustomer, "");
    openCustomers();
  };
}

let longPressTimer;
let selectedTxns = new Set();

function startLongPress(e, el) {

  longPressTimer = setTimeout(() => {

    const id = el.dataset.id;

    if (selectedTxns.has(id)) {
      selectedTxns.delete(id);
      el.classList.remove("bg-yellow-900");
    } else {
      selectedTxns.add(id);
      el.classList.add("bg-yellow-900");
    }

    updateMultiDeleteBar();

  }, 600); // HOLD 600ms
}

function cancelLongPress() {
  clearTimeout(longPressTimer);
}

function updateMultiDeleteBar() {

  let bar = document.getElementById("multiDeleteBar");

  if (selectedTxns.size === 0) {
    if (bar) {
      bar.remove(); // ✅ FORCE REMOVE
    }
    return;
  }

  if (!bar) {
    bar = document.createElement("div");
    bar.id = "multiDeleteBar";
    bar.className = "fixed bottom-0 left-0 right-0 bg-red-600 p-4 flex justify-between z-50";

    bar.innerHTML = `
      <span>${selectedTxns.size} selected</span>
      <button onclick="deleteSelected()" class="bg-black px-4 py-2 rounded">
        Delete All
      </button>
    `;

    document.body.appendChild(bar);
  } else {
    bar.querySelector("span").innerText = selectedTxns.size + " selected";
  }
}

async function deleteSelected() {

  const bar = document.getElementById("multiDeleteBar");
  const btn = bar.querySelector("button");

  setButtonLoading(btn, "Deleting...");

  for (const id of selectedTxns) {
    await apiPost({
      action: "deleteTransaction",
      id
    });
  }

  selectedTxns.clear();
  updateMultiDeleteBar();

  showSuccess("Deleted successfully ✅");

  selectCustomer(selectedCustomer, "");
  openCustomers();
}

function customConfirm(msg) {
  return new Promise(resolve => {

    modal.innerHTML = `
      <div class="bg-gray-900 p-6 w-80 rounded-xl">

        <div class="mb-4">${msg}</div>

        <div class="flex gap-2">
          <button onclick="confirmNo()"
            class="w-1/2 bg-gray-700 p-2 rounded">Cancel</button>

          <button onclick="confirmYes()"
            class="w-1/2 bg-red-600 p-2 rounded">Yes</button>
        </div>

      </div>
    `;

    modal.classList.remove("hidden");

    window.confirmYes = () => {
      modal.classList.add("hidden");
      resolve(true);
    };

    window.confirmNo = () => {
      modal.classList.add("hidden");
      resolve(false);
    };

  });
}

async function sendWhatsAppReminder(name, phone, amount) {

  try {

    phone = (phone || "").replace(/\D/g, "");
    if (!phone.startsWith("91")) phone = "91" + phone;

    let businessName = document.getElementById("businessSelect")
      ?.selectedOptions[0]?.text || "Your Business";

    let lang = document.getElementById("lang")?.value || "en";

    const setup = await apiGet("getSetup");

    const upi = setup.upi_id || "sudhakarrn0711@okicici";
    const payee = setup.payee_name || businessName;
    const qr = setup.qr_image || "";

    let upiLink = `upi://pay?pa=${upi}&pn=${encodeURIComponent(payee)}&am=${Number(amount)}&cu=INR`;

    let summaryLink = `https://account.ransangroups.in/account_dashboard.html?customer=${selectedCustomer}&bid=${currentBusiness}`;

    let msg = buildAdvancedMessage({
      name,
      amount,
      businessName,
      upiLink,
      qrLink: qr,
      summaryLink,
      lang
    });

    // 🚀 FIRE & FORGET (NO WAIT)
    apiPost({
      action: "sendWhatsApp",
      phone,
      message: msg
    })
      .then(res => console.log("WA RESPONSE:", res))
      .catch(err => console.error("WA ERROR:", err));

  } catch (err) {
    console.error(err);
  }
}

function buildAdvancedMessage(data) {

  const { name, amount, businessName, upiLink, qrLink, summaryLink, lang } = data;

  // 🔥 ENGLISH
  if (lang === "en") {
    return `👋 Hello ${name},

━━━━━━━━━━━━━━━
🧾 *ACCOUNT SUMMARY*

💰 *Pending Amount:* ₹${amount}

━━━━━━━━━━━━━━━
⚡ *Pay Instantly*

👉 Tap to Pay:
${upiLink}

📲 Scan QR:
${qrLink}

━━━━━━━━━━━━━━━
📊 *View Full Statement:*
${summaryLink}

━━━━━━━━━━━━━━━
🙏 Thank you for your business!

🏢 *${businessName}*`;
  }

  // 🔥 TAMIL
  if (lang === "ta") {
    return `👋 வணக்கம் ${name},

━━━━━━━━━━━━━━━
📊 *கணக்கு சுருக்கம்*

💰 நிலுவை தொகை:
👉 ₹${amount}

━━━━━━━━━━━━━━━
⚡ உடனே செலுத்த

👉 கிளிக் செய்ய:
${upiLink}

📲 QR Scan:
${qrLink}

━━━━━━━━━━━━━━━
📊 முழு விவரம்:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 நன்றி

🏢 ${businessName}`;
  }

  // 🔥 HINDI
  if (lang === "hi") {
    return `👋 नमस्ते ${name},

━━━━━━━━━━━━━━━
📊 *खाता सारांश*

💰 बकाया राशि:
👉 ₹${amount}

━━━━━━━━━━━━━━━
⚡ तुरंत भुगतान करें

👉 क्लिक करें:
${upiLink}

📲 QR स्कैन:
${qrLink}

━━━━━━━━━━━━━━━
📊 पूरा विवरण:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 धन्यवाद

🏢 ${businessName}`;
  }
}

function sendWhatsAppInvite(name, phone) {

  phone = (phone || "").replace(/\D/g, "");
  if (!phone.startsWith("91")) phone = "91" + phone;

  const businessName =
    document.getElementById("businessSelect")
      ?.selectedOptions[0]?.text || "Our Business";

  const inviteMsg = encodeURIComponent(
    `👋 Hello ${name},

Welcome to *${businessName}* 🙏

We will use this number to share your account updates, payment reminders & statements.

📲 You can also track your account here:
https://finance.ransangroups.in/account_dashboard.html

Thank you for your support! 😊`
  );

  // Open WhatsApp
  window.open(`https://wa.me/${phone}?text=${inviteMsg}`, "_blank");
}

async function sendWhatsAppInviteAPI(name, phone, lang = "en") {

  try {

    phone = (phone || "").replace(/\D/g, "");
    if (!phone.startsWith("91")) phone = "91" + phone;

    const businessName =
      document.getElementById("businessSelect")
        ?.selectedOptions[0]?.text || "Your Business";

    let message = "";

    // 🌐 MULTI LANGUAGE
    if (lang === "ta") {
      message = `👋 வணக்கம் ${name},

*${businessName}* இற்கு வரவேற்கிறோம் 🙏

உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது.

📊 நீங்கள் பெறுவீர்கள்:
• கட்டண நினைவூட்டல்கள்
• கணக்கு புதுப்பிப்புகள்
• பரிவர்த்தனை சுருக்கம்

நன்றி! 😊`;
    }

    else if (lang === "hi") {
      message = `👋 नमस्ते ${name},

*${businessName}* में आपका स्वागत है 🙏

आपका अकाउंट सफलतापूर्वक बना दिया गया है।

📊 आपको मिलेगा:
• पेमेंट रिमाइंडर
• अकाउंट अपडेट
• ट्रांजैक्शन सारांश

धन्यवाद! 😊`;
    }

    else {
      message = `👋 Hello ${name},

Welcome to *${businessName}* 🙏

Your account has been created successfully.

📊 You will receive:
• Payment reminders
• Account updates
• Transaction summary

Thank you for your support! 😊`;
    }

    // 🚀 FIRE & FORGET
    apiPost({
      action: "sendWhatsApp",
      phone,
      message
    })
      .then(res => console.log("Invite WA:", res))
      .catch(err => console.error("WA Error:", err));

  } catch (err) {
    console.error("Invite Failed:", err);
  }
}



function showListLoader() {
  customerList.innerHTML = `
    <div class="p-4 space-y-3">
      <div class="h-10 bg-gray-800 animate-pulse rounded"></div>
      <div class="h-10 bg-gray-800 animate-pulse rounded"></div>
      <div class="h-10 bg-gray-800 animate-pulse rounded"></div>
    </div>
  `;
}

function showInlineLoader(el) {
  el.innerHTML = `<span class="animate-pulse">Loading...</span>`;
}


function setButtonLoading(btn, text = "Saving...") {
  btn.dataset.original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-pulse text-xs">${text}</span>`;
}

function resetButton(btn) {
  btn.disabled = false;
  btn.innerHTML = btn.dataset.original;
}

function showSuccess(msg = "Saved ✅") {
  showToast(msg, "success"); // using your existing toast
}


async function handleWhatsAppClick(btn, name, phone, amount) {

  console.log("WA CLICKED", name, phone, amount); // ✅ now will print

  const text = btn.querySelector(".wa-text");

  text.innerHTML = `
    <span class="flex items-center gap-2">
      <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      Sending...
    </span>
  `;

  btn.disabled = true;

  try {
    await sendWhatsAppReminder(name, phone, amount);
    showToast("WhatsApp sent ✅");
  } catch (err) {
    console.error(err);
    showToast("Failed ❌", "error");
  }

  text.innerHTML = "WhatsApp Reminder";
  btn.disabled = false;
}

function handlePeriodChange() {
  const period = document.getElementById("period").value;

  const today = new Date();

  let from = "", to = "";

  if (period === "this") {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = today;
  }

  if (period === "last") {
    from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  document.getElementById("fromDate").value = from.toISOString().split("T")[0];
  document.getElementById("toDate").value = to.toISOString().split("T")[0];
}

async function applyReportFilter(cid, name) {

  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  const data = await apiGet("getCustomerTransactions", {
    bid: currentBusiness,
    cid
  });

  let filtered = data.transactions.filter(t => {
    const d = new Date(t.date).toISOString().split("T")[0];
    return (!from || d >= from) && (!to || d <= to);
  });

  currentFilteredData = filtered; // ✅ IMPORTANT

  renderReportTable(filtered, name);
}

function renderReportTable(transactions, name) {

  let html = "";

  transactions.forEach(t => {
    html += `
    <div class="grid grid-cols-5 py-2 border-b text-sm">

      <div>${new Date(t.date).toLocaleDateString()}</div>
      <div>${name}</div>
      <div>${t.note || ""}</div>

      <div class="text-red-500">
        ${t.type === "gave" ? "₹" + t.amount : ""}
      </div>

      <div class="text-green-500">
        ${t.type === "got" ? "₹" + t.amount : ""}
      </div>

    </div>`;
  });

  document.getElementById("reportTable").innerHTML =
    html || `<div class="p-3 text-gray-400">No Data</div>`;
}

function downloadExcel() {

  const data = currentFilteredData || currentReportData;

  let rows = data.map(t => ({
    Date: new Date(t.date).toLocaleDateString(),
    Details: t.note || "",
    "You Need to Pay": t.type === "gave" ? t.amount : "",
    "You Will Get": t.type === "got" ? t.amount : ""
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Report");

  XLSX.writeFile(wb, "report.xlsx");
}

function downloadPDF() {

  const data = currentFilteredData || currentReportData;

  let cashPaid = 0;      // (gave)
  let creditReceived = 0; // (got)

  data.forEach(t => {
    if (t.type === "gave") cashPaid += Number(t.amount);
    else creditReceived += Number(t.amount);
  });

  // ✅ NET LOGIC
  let net = cashPaid - creditReceived;

  let netText = "";
  if (net > 0) {
    netText = `₹${net} You Need to Pay`;
  } else if (net < 0) {
    netText = `₹${Math.abs(net)} You Will Get`;
  } else {
    netText = `₹0 Settled`;
  }

  const businessName =
    document.getElementById("businessSelect")
      ?.selectedOptions[0]?.text || "Your Business";

  const customerName =
    document.querySelector(".text-xl.font-bold")?.innerText || "";

  let html = `
  <html>
  <head>
    <style>
      body {
        font-family: 'Segoe UI', sans-serif;
        margin: 0;
        background: #f3f4f6;
      }

      .container {
        max-width: 900px;
        margin: auto;
        background: white;
        padding: 20px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }

      .brand {
        font-size: 22px;
        font-weight: bold;
      }

      .date {
        font-size: 12px;
        color: #666;
      }

      .customer {
        margin-top: 10px;
        font-size: 14px;
      }

      .summary {
        display: flex;
        gap: 12px;
        margin: 20px 0;
      }

      .card {
        flex: 1;
        padding: 14px;
        border-radius: 12px;
        color: white;
      }

      .red { background: linear-gradient(135deg,#ef4444,#b91c1c); }
      .green { background: linear-gradient(135deg,#22c55e,#15803d); }
      .dark { background: linear-gradient(135deg,#111827,#374151); }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      th {
        background: #111827;
        color: white;
        padding: 10px;
      }

      td {
        padding: 8px;
        border-bottom: 1px solid #eee;
        text-align: center;
      }

      /* FOOTER FIXED POSITION */
      .footer {
        margin-top: 30px;
        padding: 15px;
        border-radius: 12px;
        background: linear-gradient(135deg,#111827,#1f2937);
        color: white;
      }

      .footer .row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .footer .col {
        flex: 1;
        min-width: 200px;
      }

    </style>
  </head>

  <body>

  <div class="container">

    <!-- HEADER -->
    <div class="header">
      <div class="brand">🏢 ${businessName}</div>
      <div class="date">📅 ${new Date().toLocaleDateString()}</div>
    </div>

    <!-- CUSTOMER -->
    <div class="customer">
      👤 <strong>${customerName}</strong>
    </div>

    <!-- SUMMARY -->
    <div class="summary">

      <div class="card green">
        <div>💰 Credit Received</div>
        <div><strong>₹${creditReceived}</strong></div>
      </div>

      <div class="card red">
        <div>💸 Cash Paid</div>
        <div><strong>₹${cashPaid}</strong></div>
      </div>

      <div class="card dark">
        <div>📊 Net Balance</div>
        <div><strong>${netText}</strong></div>
      </div>

    </div>

    <!-- TABLE -->
    <table>
      <tr>
        <th>📅 Date</th>
        <th>📝 Details</th>
        <th>💸 Cash Paid</th>
        <th>💰 Credit Received</th>
      </tr>
  `;

  data.forEach(t => {
    html += `
      <tr>
        <td>${new Date(t.date).toLocaleDateString()}</td>
        <td>${t.note || "-"}</td>
        <td>${t.type === "gave" ? "₹" + t.amount : ""}</td>
        <td>${t.type === "got" ? "₹" + t.amount : ""}</td>
      </tr>
    `;
  });

  html += `</table>

    <!-- FOOTER -->
    <div class="footer">

      <h3>⚡ Powered by RanSan Technology</h3>

      <div class="row">

        <div class="col">
          <p>🏢 <strong>Corporate Office</strong></p>
          <p>Shop No 1, Rahul Welfare Society,<br>
          Sivagami Nagar, Orlem,<br>
          Mumbai - 400064</p>
        </div>

        <div class="col">
          <p>🏢 <strong>Branch Office</strong></p>
          <p>16/6, 2nd Floor,<br>
          Ramakrishna 1st Cross Street,<br>
          Porur, Chennai - 600116</p>
        </div>

        <div class="col">
          <p>📞 +91 8148610567</p>
          <p>💬 +91 8148610567</p>
          <p>📧 ransangroups2025@gmail.com</p>
          <p>🌐 www.ransangroups.com</p>
        </div>

      </div>

    </div>

  </div>

  </body>
  </html>
  `;

  const win = window.open("", "", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.print();
}


function handleQuickFilter(cid, name) {

  const period = document.getElementById("period").value;
  const today = new Date();

  let from, to;

  if (period === "this") {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = today;
  }

  if (period === "last") {
    from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  if (period !== "custom") {
    document.getElementById("fromDate").value = from.toISOString().split("T")[0];
    document.getElementById("toDate").value = to.toISOString().split("T")[0];

    applyReportFilter(cid, name); // ✅ auto apply
  }
}

function isDuplicatePhone(phone) {

  const clean = (phone || "").toString().replace(/\D/g, "");

  return customersData.some(c => {

    // 🔥 HANDLE BOTH OBJECT & ARRAY FORMAT
    let existingPhone = "";

    if (typeof c === "object" && !Array.isArray(c)) {
      existingPhone = c.phone || "";
    } else if (Array.isArray(c)) {
      existingPhone = c[3] || ""; // 👈 phone column index
    }

    existingPhone = existingPhone.toString().replace(/\D/g, "");

    return existingPhone && existingPhone === clean;
  });
}

const dropZone = document.getElementById("dropZone");

dropZone.addEventListener("click", () => {
  document.getElementById("excelFile").click();
});

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();

  const file = e.dataTransfer.files[0];
  previewExcel(file); // ✅ ONLY preview (not upload)
});

let previewData = [];

async function previewExcel(file) {

  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  let rows = XLSX.utils.sheet_to_json(sheet);

  // ✅ REMOVE EMPTY ROWS
  rows = rows.filter(r => {
    const name = (r.Name || r.name || "").trim();
    const phone = (r.Phone || r.phone || "").toString().trim();
    return name || phone;
  });

  previewData = rows;

  const tbody = document.getElementById("previewTable");
  tbody.innerHTML = "";

  rows.forEach(row => {

    const name = (row.Name || row.name || "").trim();
    const phone = (row.Phone || row.phone || "").toString().trim();
    let lang = (row.Language || row.language || "en").toLowerCase().trim();

    if (!["en", "ta", "hi"].includes(lang)) lang = "en";

    let status = "Ready";
    let color = "text-green-400";

    if (!name) {
      status = "Missing Name";
      color = "text-red-400";
    } else if (phone && isDuplicatePhone(phone)) {
      status = "Duplicate";
      color = "text-yellow-400";
    }

    tbody.innerHTML += `
      <tr class="border-b border-gray-700">
        <td class="p-2">${name}</td>
        <td class="p-2">${phone}</td>
        <td class="p-2">${lang}</td>
        <td class="p-2 ${color}">${status}</td>
      </tr>
    `;
  });

  document.getElementById("previewModal").classList.remove("hidden");
}


let isUploading = false;

async function confirmUpload(btn) {

  if (isUploading) return; // 🚫 HARD STOP
  isUploading = true;

  btn.disabled = true;

  const text = btn.querySelector(".upload-text");
  text.innerHTML = "Uploading...";

  // ✅ CLOSE PREVIEW FIRST
  document.getElementById("previewModal").classList.add("hidden");

  // ✅ SMALL DELAY (fix UI freeze issue)
  await new Promise(r => setTimeout(r, 200));

  showUploadModal();

  let success = 0, duplicate = 0, skipped = 0;
  const total = previewData.length;

  const processedPhones = new Set();

  for (let i = 0; i < previewData.length; i++) {

    const row = previewData[i];

    const name = (row.Name || row.name || "").trim();
    const phoneRaw = (row.Phone || row.phone || "").toString().trim();
    const phone = phoneRaw.replace(/\D/g, "");

    let lang = (row.Language || row.language || "en").toLowerCase().trim();
    if (!["en", "ta", "hi"].includes(lang)) lang = "en";

    // ❌ INVALID
    if (!name) {
      skipped++;
      updateProgress(i + 1, total);
      continue;
    }

    // ❌ DUPLICATE INSIDE FILE
    if (phone && processedPhones.has(phone)) {
      duplicate++;
      updateProgress(i + 1, total);
      continue;
    }

    // ❌ DUPLICATE IN DB
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
        phone,
        language: lang
      });

      success++;

      processedPhones.add(phone);
      customersData.push({ name, phone });

      sendWhatsAppInviteAPI(name, phone);

    } catch (err) {
      console.error(err);
      skipped++;
    }

    updateProgress(i + 1, total);
  }

  hideUploadModal();

  // ✅ RESET STATE
  isUploading = false;
  btn.disabled = false;
  text.innerHTML = "Upload";

  // ✅ CLEAR DATA (VERY IMPORTANT)
  previewData = [];

  showToast(`✅ ${success} Added | ⚠ ${duplicate} Duplicate | ❌ ${skipped} Skipped`);

  openCustomers();
}

document.getElementById("excelFile").addEventListener("change", (e) => {
  previewExcel(e.target.files[0]);
});

function closePreview() {
  document.getElementById("previewModal").classList.add("hidden");
}

document.addEventListener("keydown", function (e) {

  // Avoid triggering inside input fields
  const tag = document.activeElement.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  // ALT + U → Upload
  if (e.altKey && e.key.toLowerCase() === "u") {
    e.preventDefault();
    document.getElementById("excelFile")?.click();
  }

  // ALT + N → Add Customer
  if (e.altKey && e.key.toLowerCase() === "n") {
    e.preventDefault();
    openAddCustomer();
  }

});

function sendTxnWhatsApp(name, phone, amount, type, balance) {

  try {

    if (!phone) return;

    phone = phone.toString().replace(/\D/g, "");
    if (!phone.startsWith("91")) phone = "91" + phone;

    const amt = Math.abs(Number(amount) || 0);
    const bal = Number(balance) || 0;

    let businessName = document.getElementById("businessSelect")
      ?.selectedOptions[0]?.text || "Your Business";

    let balanceText = "";

    // ✅ Balance message
    if (bal > 0) {
      balanceText = `\nTotal Due: ₹${bal}`;
    } else if (bal < 0) {
      balanceText = `\nAdvance Balance: ₹${Math.abs(bal)}`;
    } else {
      balanceText = `\nYour account is settled ✅`;
    }

    let msg = "";

    // ✅ Transaction message
    if (type === "got") {

      msg = `Hi ${name},

We received ₹${amt} from you. ✅
Thank you!

${balanceText}

- ${businessName}`;

    } else {

      msg = `Hi ${name},

You have taken credit of ₹${amt}.

${balanceText}

- ${businessName}`;
    }

    // 🚀 Fire & forget
    apiPost({
      action: "sendWhatsApp",
      phone,
      message: msg,
      env: "test"
    })
      .then(res => console.log("WA SENT:", res))
      .catch(err => console.error("WA ERROR:", err));

  } catch (err) {
    console.error("WA ERROR:", err);
  }
}