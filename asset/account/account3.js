
// ================= API =================
const API = "https://script.google.com/macros/s/AKfycbzm7WmOrhnBuhvkYZ4hN7YCVNxxN0vrw2QUurROApnoiDG3HRO-UDPhMZRBKKX7HSpN/exec";

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


function formatBusinesses(raw) {

  if (!Array.isArray(raw) || raw.length < 2) return [];

  const headers = raw[0];

  return raw.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

// ================= STATE =================
let currentBusiness = localStorage.getItem("business") || "";
let selectedCustomer = "";

// ================= INIT =================
loadBusinesses();


let businessName = "";
// ================= BUSINESS =================
async function loadBusinesses() {

  const data = await apiGet("getBusinesses");

  console.log("BUSINESSES RAW:", data);

  if (!data || data.length < 2) {
    console.error("❌ No business data");
    return;
  }

  // ✅ NEW: format for dashboard
  const formatted = formatBusinesses(data);

  // ✅ STORE GLOBALLY (VERY IMPORTANT)
  window.businesses = formatted;

  console.log("✅ FORMATTED BUSINESSES:", formatted);

  let html = "";

  data.slice(1).forEach(b => {
    html += `<option value="${b[0]}">${b[1]}</option>`;
  });

  businessSelect.innerHTML = html;

  // ✅ LOAD SAVED BUSINESS
  if (!currentBusiness) {
    currentBusiness = localStorage.getItem("business") || data[1][0];
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
    checkWhatsAppStatus();   // 🔥 important

  };

  openCustomers();
  checkWhatsAppStatus();
}

function openBusinessModal() {

  const modal = document.getElementById("businessModal");
  if (!modal) return;

  modal.innerHTML = `
    <div class="bg-gray-800 w-[95%] max-w-md rounded-xl shadow-xl p-4 max-h-[90vh] overflow-y-auto">

      <!-- HEADER -->
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-white font-semibold text-lg">
          Add Business
        </h3>

        <button
          onclick="closeBusinessModal()"
          class="text-gray-400 hover:text-white text-lg">
          ✕
        </button>
      </div>

      <!-- BUSINESS NAME -->
      <input
        id="bname"
        placeholder="Business Name"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- WHATSAPP CONFIG -->
      <input
        id="instance_id"
        placeholder="Instance ID"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input
        id="access_token"
        placeholder="Access Token"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input
        id="api_url"
        placeholder="API URL"
        value="https://wagrow.cloud/api/send"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- NEW BUSINESS PHONE -->
      <input
        id="business_phone"
        placeholder="WhatsApp Number (91xxxxxxxxxx)"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- PAYMENT -->
      <input
        id="upi_id"
        placeholder="UPI ID"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input
        id="payee_name"
        placeholder="Payee Name"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input
        id="qr_image"
        placeholder="QR Image URL"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- STATUS MESSAGE -->
      <div id="modalMsg"
        class="text-xs mt-3 hidden rounded p-2">
      </div>

      <!-- SAVE BUTTON -->
      <button
        id="saveBtn"
        onclick="saveBusiness()"
        class="bg-green-600 hover:bg-green-700 disabled:opacity-50 w-full p-2 mt-4 rounded text-white flex justify-center items-center gap-2 transition">

        <span id="btnText">Save</span>

        <span
          id="btnLoader"
          class="hidden w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin">
        </span>

      </button>

    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}


function closeBusinessModal() {
  const modal = document.getElementById("businessModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.innerHTML = "";
}



function closeModal() {
  const modal = document.getElementById("businessModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.innerHTML = "";
}



async function saveBusiness() {

  const modal = document.getElementById("businessModal");

  // =====================================
  // GET VALUES
  // =====================================
  const name =
    document.getElementById("bname")?.value.trim();

  const instance_id =
    document.getElementById("instance_id")?.value.trim();

  const access_token =
    document.getElementById("access_token")?.value.trim();

  const api_url =
    document.getElementById("api_url")?.value.trim();

  const business_phone =
    document.getElementById("business_phone")?.value.trim();

  const upi_id =
    document.getElementById("upi_id")?.value.trim();

  const payee_name =
    document.getElementById("payee_name")?.value.trim();

  const qr_image =
    document.getElementById("qr_image")?.value.trim();

  // =====================================
  // UI ELEMENTS
  // =====================================
  const msg = document.getElementById("modalMsg");
  const btn = document.getElementById("saveBtn");
  const loader = document.getElementById("btnLoader");
  const text = document.getElementById("btnText");

  // =====================================
  // VALIDATION
  // =====================================
  if (!name) {
    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";
    msg.innerText = "Business name required";
    msg.classList.remove("hidden");
    return;
  }

  if (!business_phone) {
    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";
    msg.innerText = "WhatsApp number required";
    msg.classList.remove("hidden");
    return;
  }

  // =====================================
  // AUTO ADD INDIA CODE (91)
  // =====================================
  let phone = business_phone.replace(/\D/g, "");

  // If user entered 10 digits
  if (phone.length === 10) {
    phone = "91" + phone;
  }

  // If user entered 0xxxxxxxxxx
  if (phone.length === 11 && phone.startsWith("0")) {
    phone = "91" + phone.slice(1);
  }

  // Must be exactly 12 digits now
  if (phone.length !== 12 || !phone.startsWith("91")) {
    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";
    msg.innerText =
      "Enter valid mobile number (10 digit)";
    msg.classList.remove("hidden");
    return;
  }

  try {

    // =====================================
    // LOADING
    // =====================================
    loader.classList.remove("hidden");
    text.innerText = "Saving...";
    btn.disabled = true;

    // =====================================
    // API SAVE
    // =====================================
    await apiPost({
      action: "addBusiness",
      name,
      instance_id,
      access_token,
      api_url,
      business_phone: phone,
      upi_id,
      payee_name,
      qr_image
    });

    // =====================================
    // SUCCESS
    // =====================================
    msg.className =
      "text-green-400 text-xs mt-2 bg-green-900/30 p-2 rounded";

    msg.innerText =
      "Saved successfully ✅";

    msg.classList.remove("hidden");

    // Reload business list
    if (typeof loadBusinesses === "function") {
      await loadBusinesses();
    }

    setTimeout(() => {
      closeBusinessModal();
    }, 1200);

  } catch (e) {

    console.error(e);

    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";

    msg.innerText =
      "Failed to save ❌";

    msg.classList.remove("hidden");

  } finally {

    loader.classList.add("hidden");
    text.innerText = "Save";
    btn.disabled = false;
  }
}

let currentSearch = "";

// ================= CUSTOMERS =================
let currentSort = { field: "balance", order: "desc" };

async function openCustomers() {

  document.getElementById("customersSection").classList.remove("hidden");
  document.getElementById("cashbookSection").classList.add("hidden");
  document.getElementById("dashboardSection")?.classList.add("hidden");

  document.getElementById("leftPanel").classList.remove("w-1/2");
  document.getElementById("leftPanel").classList.add("w-1/3");

  showListLoader();

  if (!currentBusiness) {
    customerList.innerHTML = `<div class="p-3 text-gray-400">No Business Selected</div>`;
    return;
  }

  try {

    let res = await apiGet("getCustomersWithBalance", {
      bid: currentBusiness
    });

    if (!res || res.error) {
      customerList.innerHTML = `<div class="p-3 text-red-400">API Error</div>`;
      return;
    }

    let data = res?.data || res?.customers || res || [];

    if (!Array.isArray(data)) {
      customerList.innerHTML = `<div class="p-3 text-red-400">Invalid Data</div>`;
      return;
    }

    if (!data.length) {
      customerList.innerHTML = `<div class="p-3 text-gray-400">No Customers</div>`;
      return;
    }

    // NORMALIZE
    customersData = data.map(c => ({
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      balance: Number(c.balance || 0)
    }));

    renderCustomerList();

  } catch (err) {
    console.error(err);
    customerList.innerHTML = `<div class="p-3 text-red-400">Failed to load</div>`;
  }
}

const HIGH_RISK_LIMIT = 5000;

function renderCustomerList() {

  // ✅ FILTER
  let data = customersData.filter(c =>
    (c.name || "").toLowerCase().includes(currentSearch) ||
    String(c.phone || "").includes(currentSearch)
  );

  console.log("FILTERED DATA:", data.length);

  // ✅ SORT
  data.sort((a, b) => {

    const aRisk = a.balance >= HIGH_RISK_LIMIT ? 1 : 0;
    const bRisk = b.balance >= HIGH_RISK_LIMIT ? 1 : 0;

    // 🔥 Step 1: High risk always on top
    if (aRisk !== bRisk) {
      return bRisk - aRisk;
    }

    // 🔥 Step 2: Your existing sort (unchanged)
    if (currentSort.field === "name") {
      return currentSort.order === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      return currentSort.order === "asc"
        ? a.balance - b.balance
        : b.balance - a.balance;
    }

  });

  // ✅ TOP 3 CALCULATION (only positive balance)
  const top3 = [...customersData]
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3)
    .map(c => c.id);

  // ✅ KPI
  let creditGiven = 0;
  let cashReceived = 0;

  data.forEach(c => {
    if (c.balance > 0) creditGiven += c.balance;
    else cashReceived += Math.abs(c.balance);
  });

  let totalBalance = creditGiven - cashReceived;

  const nameActive = currentSort.field === "name";
  const amountActive = currentSort.field === "balance";

  let html = `
<div class="sticky top-0 z-10 bg-black">

<div class="p-2 grid grid-cols-3 gap-2 text-center text-xs border-b bg-black">

  <div class="bg-gray-900 p-2 rounded">
    <div class="text-gray-400">Customers</div>
    <div class="font-bold">${customersData.length}</div>
  </div>

  <div class="bg-gray-900 p-2 rounded">
    <div class="text-gray-400">Defaulters</div>
    <div class="text-red-400 font-bold">
      ${customersData.filter(c => c.balance > 0).length}
    </div>
  </div>

  <div class="bg-gray-900 p-2 rounded">
    <div class="text-gray-400">Settled</div>
    <div class="text-green-400 font-bold">
      ${customersData.filter(c => c.balance <= 0).length}
    </div>
  </div>

</div>

  <!-- SEARCH + SUMMARY -->
  <div class="p-2 flex gap-2 border-b">

    <input type="text" id="searchInput"
      placeholder="Search customer..."
      value="${currentSearch}"
      class="flex-1 px-2 py-1 bg-gray-900 rounded text-sm"/>

<button onclick="openCustomerSummaryMobile()"
  class="text-xs px-3 py-1 bg-purple-600 rounded whitespace-nowrap">
  Summary
</button>

  </div>

  <!-- KPI -->
  <div class="p-2 grid grid-cols-3 gap-2 text-center text-xs border-b bg-black">

    <div>
      <div class="text-gray-400">Credit</div>
      <div class="text-red-400 font-bold">₹${creditGiven}</div>
    </div>

    <div>
      <div class="text-gray-400">Received</div>
      <div class="text-green-400 font-bold">₹${cashReceived}</div>
    </div>

    <div>
      <div class="text-gray-400">Balance</div>
      <div class="font-bold ${totalBalance >= 0 ? 'text-red-400' : 'text-green-400'}">
        ₹${Math.abs(totalBalance)}
      </div>
    </div>

  </div>

  <!-- SORT HEADER -->
  <div class="p-3 flex justify-between text-xs border-b bg-black">

    <div onclick="sortCustomers('name')" 
      class="cursor-pointer flex items-center gap-1
      ${nameActive ? 'text-white font-semibold border-b-2 border-purple-500 pb-1' : 'text-gray-400'}">

      NAME ${getSortIcon("name")}
    </div>

    <div onclick="sortCustomers('amount')" 
      class="cursor-pointer flex items-center gap-1
      ${amountActive ? 'text-white font-semibold border-b-2 border-purple-500 pb-1' : 'text-gray-400'}">

      AMOUNT ${getSortIcon("balance")}
    </div>

  </div>

</div>
`;

  // ✅ LIST WITH TOP 3
  data.forEach(c => {

    const isGive = c.balance >= 0;

    // 🔥 High Risk
    const isHighRisk = c.balance >= HIGH_RISK_LIMIT;

    // 🔥 Risk highlight
    const riskHighlight = isHighRisk ? "ring-1 ring-red-500/40" : "";

    const rankIndex = top3.indexOf(c.id);

    let badge = "";
    let highlight = "";

    if (rankIndex === 0) {
      badge = "🥇";
      highlight = "bg-yellow-900/30";
    } else if (rankIndex === 1) {
      badge = "🥈";
      highlight = "bg-gray-700/40";
    } else if (rankIndex === 2) {
      badge = "🥉";
      highlight = "bg-orange-900/30";
    }

    html += `
      <div onclick="selectCustomer('${c.id}','${c.name}','${c.phone}')"
        class="p-3 border-b cursor-pointer hover:bg-gray-800 flex justify-between
        ${highlight} ${riskHighlight} active:scale-[0.98] transition-all duration-300 ease-in-out">

        <div>
<div class="font-medium flex items-center gap-2 flex-wrap">

  ${badge ? `<span>${badge}</span>` : ""}

  <span>${c.name}</span>

  ${isHighRisk ? `
    <span class="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">
      🔥 High Risk
    </span>
  ` : ""}

</div>

          <div class="text-xs text-gray-400">
            ${c.phone || ""}
          </div>
        </div>

        <div class="text-right">
          <div class="${getBalanceColor(c.balance)} font-bold">
            ₹${Math.abs(c.balance)}
          </div>

          <div class="text-xs text-gray-400">
            ${isGive ? "YOU WILL GET" : "YOU WILL GIVE"}
          </div>
        </div>

      </div>`;
  });

  customerList.innerHTML = html;

  // ✅ SEARCH INPUT (NO BREAK)
  setTimeout(() => {
    const input = document.getElementById("searchInput");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);

      input.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        if (val === currentSearch) return;

        currentSearch = val;
        renderCustomerList();
      };
    }
  }, 0);
}

function getBalanceColor(balance) {
  const val = Math.abs(balance);

  if (val > 10000) return "text-red-600";   // very high
  if (val > 5000) return "text-red-500";
  if (val > 1000) return "text-red-400";

  return balance >= 0 ? "text-red-300" : "text-green-400";
}

function getSortIcon(field) {
  const isActive = currentSort.field === field;

  if (!isActive) {
    return `
      <svg class="w-3 h-3 inline opacity-40" viewBox="0 0 20 20">
        <path d="M5 7l5-5 5 5M5 13l5 5 5-5" stroke="currentColor" fill="none"/>
      </svg>
    `;
  }

  if (currentSort.order === "asc") {
    return `
      <svg class="w-3 h-3 inline" viewBox="0 0 20 20">
        <path d="M5 12l5-5 5 5" stroke="currentColor" fill="none"/>
      </svg>
    `;
  } else {
    return `
      <svg class="w-3 h-3 inline" viewBox="0 0 20 20">
        <path d="M5 8l5 5 5-5" stroke="currentColor" fill="none"/>
      </svg>
    `;
  }
}

function openCustomerSummary() {

  const rightPanel = document.getElementById("rightPanel");

  let creditGiven = 0;
  let cashReceived = 0;

  customersData.forEach(c => {
    if (c.balance > 0) creditGiven += c.balance;
    else cashReceived += Math.abs(c.balance);
  });

  let totalBalance = creditGiven - cashReceived;

  // ==============================
  // 🔥 HEALTH STATUS
  // ==============================
  const healthStatus =
    totalBalance > 10000 ? { text: "⚠️ High Risk", color: "text-red-500" } :
      totalBalance > 0 ? { text: "🟡 Moderate", color: "text-yellow-400" } :
        { text: "🟢 Healthy", color: "text-green-400" };

  // ==============================
  // 📊 DISTRIBUTION
  // ==============================
  const totalCustomers = customersData.length;
  const defaulters = customersData.filter(c => c.balance > 0).length;
  const settled = totalCustomers - defaulters;

  // ==============================
  // 🔥 TOP DEFAULTERS
  // ==============================
  const topDefaulters = [...customersData]
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);

  // ==============================
  // 🎯 PRIORITY LIST
  // ==============================
  function getPriorityScore(c) {
    return Math.abs(c.balance);
  }

  const priorityList = [...customersData]
    .filter(c => c.balance > 0)
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
    .slice(0, 5);

  // ==============================
  // 📊 MINI CHART (Top 5)
  // ==============================
  const top5 = [...customersData]
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  let maxAmount = Math.max(...top5.map(c => c.balance), 1);

  // ==============================
  // 🧠 SMART INSIGHT
  // ==============================
  let insight = "All good 👍";

  if (creditGiven > 10000) {
    insight = "⚠️ High outstanding — focus on collection";
  } else if (defaulters > totalCustomers / 2) {
    insight = "⚠️ Many customers have dues";
  }

  // ==============================
  // 🧾 HTML START
  // ==============================
  let html = `
    <div class="p-4">

      <!-- HEADER -->
      <div class="mb-3 flex justify-between items-center">
        <div class="text-lg font-bold">Customer Summary</div>
        <div class="text-sm ${healthStatus.color}">
          ${healthStatus.text}
        </div>
      </div>

      <!-- KPI -->
      <div class="grid grid-cols-3 gap-3 text-center mb-3">

        <div class="bg-gray-900 p-3 rounded-xl shadow">
          <div class="text-xs text-gray-400">Credit</div>
          <div class="text-red-400 font-bold">₹${creditGiven}</div>
        </div>

        <div class="bg-gray-900 p-3 rounded-xl shadow">
          <div class="text-xs text-gray-400">Received</div>
          <div class="text-green-400 font-bold">₹${cashReceived}</div>
        </div>

        <div class="bg-gray-900 p-3 rounded-xl shadow">
          <div class="text-xs text-gray-400">Balance</div>
          <div class="font-bold ${totalBalance >= 0 ? 'text-red-400' : 'text-green-400'}">
            ₹${Math.abs(totalBalance)}
          </div>
        </div>

      </div>

      <!-- 📊 MINI CHART -->
      <div class="bg-gray-900 p-3 rounded mb-4">
        <div class="text-xs text-gray-400 mb-2">Top 5 Dues</div>

        ${top5.map(c => {
    const width = (c.balance / maxAmount) * 100;
    return `
            <div class="mb-2">
              <div class="flex justify-between text-xs">
                <span>${c.name}</span>
                <span>₹${c.balance}</span>
              </div>
              <div class="w-full bg-gray-700 h-2 rounded mt-1">
                <div class="bg-red-500 h-2 rounded"
                  style="width:${width}%"></div>
              </div>
            </div>
          `;
  }).join("")}
      </div>

      <!-- DISTRIBUTION -->
      <div class="flex justify-between text-xs text-gray-400 mb-3">
        <span>👥 ${totalCustomers}</span>
        <span class="text-red-400">⚠️ ${defaulters}</span>
        <span class="text-green-400">✅ ${settled}</span>
      </div>

      <!-- INSIGHT -->
      <div class="text-xs text-yellow-400 mb-3">
        ${insight}
      </div>

      <!-- ACTIONS -->
<div class="flex gap-2 mb-4">

  <button onclick="sendBulkReminders()"
    class="flex-1 bg-red-600 text-xs p-2 rounded flex items-center justify-center gap-1">

    📤 <span>Send Bulk Reminders</span>
  </button>

  <button onclick="exportSummary?.()"
    class="flex-1 bg-gray-700 text-xs p-2 rounded">
    📄 Export
  </button>

</div>

      <!-- TOP DEFAULTERS -->
      <div class="mb-4">

        <div class="text-sm text-red-400 mb-2">🔥 Top Defaulters</div>

        ${topDefaulters.length === 0
      ? `<div class="text-xs text-gray-500">No dues 🎉</div>`
      : topDefaulters.map(c => `
            <div class="flex justify-between items-center bg-gray-900 p-2 rounded mb-1 text-sm">

              <span>${c.name}</span>

              <div class="flex items-center gap-2">
                <span class="text-red-400 font-bold">₹${c.balance}</span>

<button 
  onclick="sendWhatsAppReminder('${c.name}','${c.phone}','${c.balance}', this)"
  class="bg-green-600 p-2 rounded-full hover:bg-green-500 transition flex items-center justify-center">

  <!-- WhatsApp SVG -->
  <svg xmlns="http://www.w3.org/2000/svg" 
       width="14" height="14" 
       viewBox="0 0 24 24" fill="white">
    <path d="M20.52 3.48A11.8 11.8 0 0012.05 0C5.48 0 .13 5.35.13 11.92c0 2.1.55 4.16 1.6 5.98L0 24l6.26-1.63a11.9 11.9 0 005.8 1.48h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.47-8.45zM12.06 21.1h-.01a9.1 9.1 0 01-4.64-1.27l-.33-.2-3.72.97.99-3.63-.22-.37a9.06 9.06 0 01-1.39-4.8c0-5.03 4.1-9.13 9.14-9.13 2.44 0 4.73.95 6.46 2.68a9.07 9.07 0 012.67 6.46c0 5.04-4.1 9.13-9.14 9.13zm5.02-6.84c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.6.07-.27-.14-1.16-.43-2.2-1.37-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.55.13-.13.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34s-.96.94-.96 2.29.98 2.65 1.11 2.83c.14.18 1.92 2.94 4.66 4.12.65.28 1.16.45 1.55.58.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.83-1.27.23-.63.23-1.16.16-1.27-.07-.11-.25-.18-.52-.32z"/>
  </svg>

</button>
              </div>

            </div>
          `).join("")
    }

      </div>

      <!-- PRIORITY LIST -->
      <div class="mb-4">

        <div class="text-sm text-purple-400 mb-2">🎯 Priority Collection</div>

        ${priorityList.map((c, i) => `
          <div class="flex justify-between items-center bg-gray-900 p-2 rounded mb-1 text-sm">

            <span>${i + 1}. ${c.name}</span>

            <div class="flex items-center gap-2">
              <span class="text-red-400 font-bold">₹${c.balance}</span>

<button 
  onclick="sendWhatsAppReminder('${c.name}','${c.phone}','${c.balance}', this)"
  class="bg-green-600 p-2 rounded-full hover:bg-green-500 transition flex items-center justify-center">

  <!-- WhatsApp SVG -->
  <svg xmlns="http://www.w3.org/2000/svg" 
       width="14" height="14" 
       viewBox="0 0 24 24" fill="white">
    <path d="M20.52 3.48A11.8 11.8 0 0012.05 0C5.48 0 .13 5.35.13 11.92c0 2.1.55 4.16 1.6 5.98L0 24l6.26-1.63a11.9 11.9 0 005.8 1.48h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.47-8.45zM12.06 21.1h-.01a9.1 9.1 0 01-4.64-1.27l-.33-.2-3.72.97.99-3.63-.22-.37a9.06 9.06 0 01-1.39-4.8c0-5.03 4.1-9.13 9.14-9.13 2.44 0 4.73.95 6.46 2.68a9.07 9.07 0 012.67 6.46c0 5.04-4.1 9.13-9.14 9.13zm5.02-6.84c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.6.07-.27-.14-1.16-.43-2.2-1.37-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.55.13-.13.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34s-.96.94-.96 2.29.98 2.65 1.11 2.83c.14.18 1.92 2.94 4.66 4.12.65.28 1.16.45 1.55.58.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.83-1.27.23-.63.23-1.16.16-1.27-.07-.11-.25-.18-.52-.32z"/>
  </svg>

</button>
            </div>

          </div>
        `).join("")}

      </div>

      <!-- BREAKDOWN TITLE -->
      <div class="text-sm text-gray-400 mb-2">Customer Breakdown</div>
  `;

  [...customersData]
    .sort((a, b) => b.balance - a.balance)
    .forEach(c => {

      const isGive = c.balance >= 0;

      html += `
        <div class="flex justify-between border-b py-2 text-sm">

          <div>
            <div>${c.name}</div>

            ${c.balance > 5000 ? `
              <div class="text-[10px] text-red-500">🔥 High Risk</div>
            ` : ""}

            ${c.balance > 0 ? `
              <div class="text-[10px] text-gray-500">
                ${c.balance > 10000 ? 'Low chance' :
            c.balance > 5000 ? 'Medium chance' : 'High chance'}
              </div>
            ` : ""}

          </div>

          <div class="${isGive ? 'text-red-400' : 'text-green-400'} font-semibold">
            ₹${Math.abs(c.balance)}
          </div>

        </div>
      `;
    });

  html += `</div>`;

  rightPanel.innerHTML = `
  <div style="
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 80px;
  ">
    ${html}
  </div>
`;

}

function sortCustomers(field) {

  if (field === "amount") field = "balance";

  if (currentSort.field === field) {
    currentSort.order = currentSort.order === "asc" ? "desc" : "asc";
  } else {
    currentSort.field = field;
    currentSort.order = "asc";
  }

  renderCustomerList();
}


function openAddCustomer(prefillName = "", prefillPhone = "") {

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
    <input id="cname" 
      placeholder="Enter name"
      value="${prefillName}"
      autocomplete="name"
      class="w-full p-3 bg-black border border-gray-700 rounded mb-3 mt-1 focus:outline-none">

    <!-- PHONE -->
    <label class="text-sm text-gray-400">Phone Number</label>
    <input id="cphone" 
      type="tel"
      inputmode="numeric"
      autocomplete="tel"
      placeholder="Enter phone"
      value="${prefillPhone}"
      class="w-full p-3 bg-black border border-gray-700 rounded mt-1 focus:outline-none">

    <!-- CONTACT OPTIONS -->
    <div class="flex gap-2 mt-3 mb-3">

      <!-- Native hint -->
      <div class="flex-1 text-xs text-gray-400 bg-gray-800 p-2 rounded text-center">
        📱 iPhone: Tap field → Contacts autofill
      </div>

      <!-- Manual pick -->
      <button onclick="pickContact()" 
        class="flex-1 bg-gray-700 p-2 rounded text-sm hover:bg-gray-600">
        Pick Contact
      </button>

    </div>

    <!-- LANGUAGE -->
    <select id="custLang" class="w-full p-2 mb-3 bg-black border border-gray-700 rounded">
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

  <!-- LEFT -->
  <div class="flex items-center gap-2">

    <!-- ✅ MOBILE BACK BUTTON -->
    <button onclick="mobileBack()"
      class="md:hidden bg-gray-700 px-2 py-1 rounded text-sm">
      ←
    </button>

    <div>
      <div class="text-lg font-bold">${name}</div>
      <div class="text-sm text-gray-400">${phone || ""}</div>
    </div>

  </div>

  <!-- RIGHT -->
  <div class="flex gap-2">

    <button onclick="openReportPanel('${id}', \`${name}\`)"
      class="border px-3 py-1 rounded hover:bg-gray-700">
      Report
    </button>

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
  <div class="flex-1 overflow-auto p-4 space-y-2 pb-24">
  `;

  data.transactions.reverse().forEach(t => {

    html += `

    <div class="txnCard-wrapper relative overflow-hidden rounded-lg">

  <!-- ACTION BUTTONS -->
  <div class="absolute right-0 top-0 bottom-0 flex z-0 w-[110px]">

    <!-- EDIT -->
    <button onclick="editTxn('${t.id}','${t.type}','${t.amount}','${t.note}','${t.date}')"
      class="w-[55px] flex items-center justify-center
             bg-blue-600 hover:bg-blue-500 transition">

      ✏️
    </button>

    <!-- DELETE -->
    <button onclick="deleteTxn('${t.id}', this)"
      class="w-[55px] flex items-center justify-center
             bg-red-600 hover:bg-red-500 transition">

      🗑️
    </button>

  </div>

  <!-- MAIN CARD -->
  <div class="txnCard bg-gray-900 px-3 py-2 flex items-center justify-between
       rounded-lg relative z-10 transition-transform duration-200"
       data-id="${t.id}"

       ontouchstart="startSwipe(event,this); startLongPress(event,this)"
       ontouchmove="moveSwipe(event)"
       ontouchend="endSwipe(); cancelLongPress()"

       onmousedown="startSwipe(event,this); startLongPress(event,this)"
       onmousemove="moveSwipe(event)"
       onmouseup="endSwipe(); cancelLongPress()"
  >

    <!-- LEFT -->
    <div class="flex flex-col w-[45%]">

      <div class="text-sm font-medium truncate">
        ${t.note ? t.note : '<span class="text-gray-500 italic">No note</span>'}
      </div>

      <div class="text-xs text-gray-400">
        ${new Date(t.date).toLocaleDateString()}
      </div>

    </div>

    <!-- CENTER -->
    <div class="text-xs text-gray-400 w-[20%] text-center">
      ₹${t.runningBalance}
    </div>

    <!-- RIGHT -->
    <div class="flex items-center gap-3 w-[35%] justify-end">

      <span class="text-red-400 font-semibold">
        ${t.type === "gave" ? "₹" + t.amount : "-"}
      </span>

      <span class="text-green-400 font-semibold">
        ${t.type === "got" ? "₹" + t.amount : "-"}
      </span>

    </div>

  </div>

</div>

    `;
  });

  html += `
  </div>

  <!-- ACTION BUTTONS (FIXED) -->
<div class="hidden md:flex gap-4 p-4 border-t
            sticky bottom-0 bg-[#0b1220] z-40">

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

  // force DOM paint before anything else
  requestAnimationFrame(() => {
    // optional debug
    console.log("✅ UI Rendered");
  });

  // ✅ MOBILE FIX (ADD THIS AT VERY END)
  if (window.showDetailPanel && window.innerWidth <= 768) {
    setTimeout(() => {
      showDetailPanel();
    }, 50);
  }

}


document.addEventListener("click", function (e) {

  /* =========================
     WHATSAPP BUTTON HANDLER
  ========================= */
  const btn = e.target.closest(".wa-btn");
  if (btn) {
    const name = btn.dataset.name;
    const phone = btn.dataset.phone;
    const amount = btn.dataset.amount;

    handleWhatsAppClick(btn, name, phone, amount);
    return; // important: stop further checks
  }

  /* =========================
     MODAL OUTSIDE CLICK CLOSE
  ========================= */
  /* BUSINESS MODAL OUTSIDE CLICK */
  const bModal = document.getElementById("businessModal");

  if (bModal && !bModal.classList.contains("hidden")) {
    if (e.target === bModal) {
      closeBusinessModal();
    }
  }

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

async function sendWhatsAppReminder(
  name,
  phone,
  amount,
  btn = null
) {
  try {

    // ==================================
    // BUTTON LOADING
    // ==================================
    if (btn) {
      btn.innerHTML = "⏳";
      btn.disabled = true;
      btn.classList.add("opacity-70");
    }

    // ==================================
    // PHONE FORMAT
    // ==================================
    let rawPhone = (phone || "")
      .toString()
      .replace(/\D/g, "");

    // keep original 10 digit for searching customer
    let customerPhone = rawPhone;

    if (rawPhone.length === 12 && rawPhone.startsWith("91")) {
      customerPhone = rawPhone.slice(2);
    }

    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    }

    if (rawPhone.length !== 12) {
      throw new Error("Invalid phone");
    }

    phone = rawPhone;

    // ==================================
    // BUSINESS CONFIG
    // ==================================
    const config = await getBusinessConfig();

    if (!config) {
      throw new Error("Business config missing");
    }

    // ==================================
    // GET LANGUAGE FROM CUSTOMER SHEET
    // ==================================
    let lang = "en";

    try {

      const customers = await apiGet({
        action: "getCustomersWithBalance",
        bid: currentBusiness
      });

      console.log("CUSTOMERS RAW:", customers);

      if (Array.isArray(customers)) {

        const customer = customers.find(c =>
          String(c.phone || "").replace(/\D/g, "") === customerPhone
        );

        console.log("FOUND CUSTOMER:", customer);

        if (customer?.language) {
          lang = customer.language
            .toString()
            .trim()
            .toLowerCase();
        }
      }

    } catch (e) {
      console.log("Language fetch failed:", e);
    }

    // ==================================
    // BUSINESS NAME
    // ==================================
    const businessName =
      document.getElementById("businessSelect")
        ?.selectedOptions[0]?.text ||
      "Your Business";

    const upi = config.upi_id || "";
    const payee = config.payee_name || businessName;
    const qr = config.qr_image || "";

    const upiLink =
      `upi://pay?pa=${upi}` +
      `&pn=${encodeURIComponent(payee)}` +
      `&am=${amount}` +
      `&cu=INR`;

    const summaryLink =
      `https://account.ransangroups.in/account_dashboard.html?customer=${selectedCustomer}&bid=${currentBusiness}`;

    // ==================================
    // BUILD MESSAGE
    // ==================================
    const msg = buildAdvancedMessage({
      name,
      amount,
      businessName,
      upiLink,
      qrLink: qr,
      summaryLink,
      lang
    });

    console.log("SELECTED LANG:", lang);

    // ==================================
    // SEND WHATSAPP
    // ==================================
    const res = await apiPost({
      action: "sendWhatsApp",
      phone,
      message: msg,
      api_url: config.api_url,
      instance_id: config.instance_id,
      access_token: config.access_token
    });

    console.log("WA SENT:", res);

    // ==================================
    // SUCCESS
    // ==================================
    if (btn) {
      btn.innerHTML = "✔";
      btn.classList.remove("opacity-70");
      btn.classList.add("bg-green-600");
    }

    showToast("Reminder sent ✅", "success");

    return true;

  } catch (err) {

    console.error("WA ERROR:", err);

    if (btn) {
      btn.innerHTML = "❌";
      btn.classList.remove("opacity-70");
      btn.classList.add("bg-red-600");
    }

    showToast(err.message || "Failed", "error");

    return false;

  } finally {

    if (btn) {
      setTimeout(() => {
        btn.innerHTML = "📩";
        btn.disabled = false;
        btn.classList.remove(
          "bg-green-600",
          "bg-red-600"
        );
      }, 2000);
    }
  }
}



function buildAdvancedMessage(data) {

  let {
    name,
    amount,
    businessName,
    upiLink,
    qrLink,
    summaryLink,
    lang
  } = data;

  lang = (lang || "en")
    .toString()
    .trim()
    .toLowerCase();

  // ==========================
  // TAMIL
  // ==========================
  if (lang === "ta" || lang === "tamil") {
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
📄 முழு விவரம்:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 நன்றி

🏢 ${businessName}`;
  }

  // ==========================
  // HINDI
  // ==========================
  if (lang === "hi" || lang === "hindi") {
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
📄 पूरा विवरण:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 धन्यवाद

🏢 ${businessName}`;
  }

  // ==========================
  // DEFAULT ENGLISH
  // ==========================
  return `👋 Hello ${name},

━━━━━━━━━━━━━━━
🧾 *ACCOUNT SUMMARY*

💰 Pending Amount:
👉 ₹${amount}

━━━━━━━━━━━━━━━
⚡ Pay Instantly

👉 Tap to Pay:
${upiLink}

📲 Scan QR:
${qrLink}

━━━━━━━━━━━━━━━
📄 View Full Statement:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 Thank you

🏢 ${businessName}`;
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

    const config = await getBusinessConfig(); // ✅ NEW

    let message = "";

    if (lang === "ta") {
      message = `👋 வணக்கம் ${name},

*${businessName}* இற்கு வரவேற்கிறோம் 🙏

உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது.

நன்றி! 😊`;
    }

    else if (lang === "hi") {
      message = `👋 नमस्ते ${name},

*${businessName}* में आपका स्वागत है 🙏

आपका अकाउंट सफलतापूर्वक बना दिया गया है।

धन्यवाद! 😊`;
    }

    else {
      message = `👋 Hello ${name},

Welcome to *${businessName}* 🙏

Your account has been created successfully.

Thank you! 😊`;
    }

    await apiPost({
      action: "sendWhatsApp",
      phone,
      message,
      api_url: config.api_url,
      instance_id: config.instance_id,
      access_token: config.access_token
    });

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


async function handleWhatsAppClick(el) {

  try {

    if (!el) return;

    const name =
      el.dataset.name || "";

    const phone =
      el.dataset.phone || "";

    const amount =
      el.dataset.amount || 0;

    console.log(
      "WA CLICKED:",
      name,
      phone,
      amount
    );

    if (!phone || !name) {
      console.warn("Invalid button data");
      return;
    }

    await sendWhatsAppReminder(
      name,
      phone,
      amount,
      el
    );

  } catch (err) {
    console.error(err);
  }
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

// =====================================================
// FINAL FIXED VERSION
// REAL NOTE FETCH FROM LATEST TRANSACTION
// =====================================================
async function sendTxnWhatsApp(
  name,
  phone,
  amount,
  type,
  balance,
  note = "",
  txnDate = ""
) {
  try {

    if (!phone) return false;

    // ==================================
    // PHONE FORMAT
    // ==================================
    phone = phone.toString().replace(/\D/g, "");

    if (phone.length === 10) phone = "91" + phone;

    if (phone.length !== 12) {
      throw new Error("Invalid phone");
    }

    // ==================================
    // LOAD DATA PARALLEL
    // ==================================
    const [config, customers, txns] = await Promise.all([
      getBusinessConfig(),

      apiGet({
        action: "getCustomersWithBalance",
        bid: currentBusiness
      }),

      apiGet({
        action: "getCustomerTransactions",
        bid: currentBusiness,
        cid: selectedCustomer
      })
    ]);

    if (!config) {
      throw new Error("Business config missing");
    }

    // ==================================
    // LANGUAGE
    // ==================================
    let lang = "en";

    const localPhone = phone.slice(2);

    if (Array.isArray(customers)) {
      const customer = customers.find(c =>
        String(c.phone || "").replace(/\D/g, "") === localPhone
      );

      if (customer?.language) {
        lang = customer.language
          .toString()
          .trim()
          .toLowerCase();
      }
    }

    // ==================================
    // DATE
    // ==================================
    const d = txnDate ? new Date(txnDate) : new Date();

    const dateText = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // ==================================
    // 🔥 REAL NOTE FIX
    // If note empty -> fetch latest txn note
    // ==================================
    note = (note || "").toString().trim();

    if (!note && txns?.transactions?.length) {

      const latest = txns.transactions[
        txns.transactions.length - 1
      ];

      if (
        Number(latest.amount) === Number(amount) &&
        latest.type === type &&
        latest.note
      ) {
        note = latest.note;
      }
    }

    // fallback only if still empty
    if (!note) {
      note =
        type === "got"
          ? "Payment Received"
          : "Credit Entry";
    }

    // ==================================
    // BUSINESS NAME
    // ==================================
    const businessName =
      document.getElementById("businessSelect")
        ?.selectedOptions[0]?.text ||
      "Your Business";

    // ==================================
    // BUILD MESSAGE
    // ==================================
    const msg = buildTxnWhatsAppMessage({
      name,
      amount,
      type,
      balance,
      note,
      dateText,
      businessName,
      lang
    });

    // ==================================
    // SEND WA
    // ==================================
    await apiPost({
      action: "sendWhatsApp",
      phone,
      message: msg,
      api_url: config.api_url,
      instance_id: config.instance_id,
      access_token: config.access_token
    });

    console.log("TXN WA SENT");

    return true;

  } catch (err) {
    console.error("WA ERROR:", err);
    return false;
  }
}


/* =========================================================
   HYBRID SMART ICON ENGINE
   SAFE UPGRADE VERSION
   ✔ No change needed in existing function calls
   ✔ Existing code still uses: getTxnIcon(note)
   ✔ Custom Rules
   ✔ Default Rules
   ✔ Google Sheet Future Support Ready
   ========================================================= */


/* =========================================================
   STEP 1:
   KEEP THIS FUNCTION NAME SAME
   Existing code uses:
   const icon = getTxnIcon(note);
   ========================================================= */
function getTxnIcon(note = "") {
  try {
    const meta = detectTxnMeta(note);
    return meta.icon || "📝";
  } catch (e) {
    return "📝";
  }
}


/* =========================================================
   OPTIONAL (future use)
   ========================================================= */
function getTxnCategory(note = "") {
  try {
    return detectTxnMeta(note).category || "General";
  } catch (e) {
    return "General";
  }
}


/* =========================================================
   MAIN DETECTOR
   PRIORITY ORDER:
   1. Custom Rules
   2. Sheet Rules (future)
   3. Default Rules
   ========================================================= */
function detectTxnMeta(note = "") {

  note = String(note || "")
    .toLowerCase()
    .trim();

  if (!note) {
    return {
      icon: "📝",
      category: "General",
      priority: 0
    };
  }

  /* =====================================================
     STEP 2:
     CUSTOM RULES
     Only edit here in future
     ===================================================== */
  const customRules = [

    {
      icon: "📺",
      category: "Entertainment",
      priority: 120,
      words: [
        "netflix",
        "hotstar",
        "prime",
        "movie",
        "ott"
      ]
    },

    {
      icon: "🏋️",
      category: "Fitness",
      priority: 119,
      words: [
        "gym",
        "fitness",
        "workout"
      ]
    }

  ];


  /* =====================================================
     STEP 3:
     SHEET RULES PLACEHOLDER (future)
     If not using sheet now, leave empty
     ===================================================== */
  const sheetRules = getSheetTxnRules();


  /* =====================================================
     STEP 4:
     DEFAULT SYSTEM RULES
     ===================================================== */
  const defaultRules = [

    {
      icon: "💊",
      category: "Medical",
      priority: 100,
      words: [
        "medicine","medical","tablet",
        "doctor","hospital","clinic",
        "pharmacy"
      ]
    },

    {
      icon: "📱",
      category: "Recharge",
      priority: 90,
      words: [
        "mobile","recharge","jio",
        "airtel","vi","bsnl"
      ]
    },

    {
      icon: "🚆",
      category: "Travel",
      priority: 95,
      words: [
        "train","rail","railway"
      ]
    },

    {
      icon: "🚌",
      category: "Travel",
      priority: 94,
      words: [
        "bus","redbus"
      ]
    },

    {
      icon: "✈️",
      category: "Travel",
      priority: 96,
      words: [
        "flight","airport","airlines"
      ]
    },

    {
      icon: "🎫",
      category: "Booking",
      priority: 80,
      words: [
        "ticket","booking"
      ]
    },

    {
      icon: "🍔",
      category: "Food",
      priority: 85,
      words: [
        "food","hotel","restaurant",
        "tea","coffee","meals"
      ]
    },

    {
      icon: "⛽",
      category: "Fuel",
      priority: 88,
      words: [
        "petrol","diesel","fuel"
      ]
    },

    {
      icon: "🏠",
      category: "Home",
      priority: 87,
      words: [
        "rent","house",
        "eb bill","current bill"
      ]
    },

    {
      icon: "🛍️",
      category: "Shopping",
      priority: 75,
      words: [
        "shopping","dress",
        "cloth","shirt","amazon"
      ]
    },

    {
      icon: "🎓",
      category: "Education",
      priority: 89,
      words: [
        "fees","school",
        "college","book"
      ]
    },

    {
      icon: "💼",
      category: "Income",
      priority: 92,
      words: [
        "salary","income","wages"
      ]
    },


  ];


  /* =====================================================
     STEP 5:
     MERGE RULES
     Custom > Sheet > Default
     ===================================================== */
  const rules = [
    ...customRules,
    ...sheetRules,
    ...defaultRules
  ];


  /* =====================================================
     STEP 6:
     FIND BEST MATCH
     ===================================================== */
  let best = {
    icon: "📝",
    category: "General",
    priority: 0
  };

  for (let rule of rules) {

    const matched = rule.words.some(word =>
      note.includes(word)
    );

    if (matched && rule.priority > best.priority) {
      best = {
        icon: rule.icon,
        category: rule.category,
        priority: rule.priority
      };
    }
  }

  return best;
}


/* =========================================================
   STEP 7:
   SHEET RULES FUNCTION
   CURRENTLY EMPTY
   Later connect API / Google Sheet
   ========================================================= */
let sheetTxnRulesCache = [];
let sheetTxnRulesTime = 0;


/* =========================================================
   MAIN FUNCTION
   Replace old empty function with this
   ========================================================= */
async function getSheetTxnRules() {

  try {

    // =====================================================
    // USE CACHE FOR 10 MINUTES
    // =====================================================
    const now = Date.now();

    if (
      sheetTxnRulesCache.length > 0 &&
      now - sheetTxnRulesTime < 600000
    ) {
      return sheetTxnRulesCache;
    }

    // =====================================================
    // API CALL
    // =====================================================
    const rows = await apiGet({
      action: "getSheetTxnRules",
      bid: currentBusiness
    });

    // =====================================================
    // VALIDATE
    // =====================================================
    if (!Array.isArray(rows)) {
      return [];
    }

    // =====================================================
    // SAVE CACHE
    // =====================================================
    sheetTxnRulesCache = rows;
    sheetTxnRulesTime = now;

    console.log(
      "✅ Icon Sheet Loaded:",
      rows.length
    );

    return rows;

  } catch (err) {

    console.error(
      "❌ getSheetTxnRules Error:",
      err
    );

    return [];
  }
}



// =====================================================
// MODERN TEMPLATE
// =====================================================
function buildTxnWhatsAppMessage(data) {

  let {
    name,
    amount,
    type,
    balance,
    note,
    dateText,
    businessName,
    lang
  } = data;

  amount = Math.abs(Number(amount) || 0);
  balance = Number(balance) || 0;
  lang = (lang || "en").toLowerCase();

  const icon = getTxnIcon(note);

  const typeColor =
    type === "got" ? "🟢" : "🔴";

  let balText = "";

  if (balance > 0) {
    balText = `💰 Pending: ₹${balance}`;
  } else if (balance < 0) {
    balText = `🔵 Advance: ₹${Math.abs(balance)}`;
  } else {
    balText = `✅ Account Settled`;
  }

  // ==================================
  // ENGLISH
  // ==================================
  if (lang === "en") {

    if (type === "got") {
      return `👋 Hello ${name}

━━━━━━━━━━━━━━━
🟢 *Payment Received*

✅ ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 Thank you
🏢 ${businessName}`;
    }

    return `👋 Hello ${name}

━━━━━━━━━━━━━━━
🔴 *Credit Added*

📌 ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 Thank you
🏢 ${businessName}`;
  }

  // ==================================
  // TAMIL
  // ==================================
  if (lang === "ta") {

    if (type === "got") {
      return `👋 வணக்கம் ${name}

━━━━━━━━━━━━━━━
🟢 *பணம் பெறப்பட்டது*

✅ ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 நன்றி
🏢 ${businessName}`;
    }

    return `👋 வணக்கம் ${name}

━━━━━━━━━━━━━━━
🔴 *கடன் பதிவு செய்யப்பட்டது*

📌 ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 நன்றி
🏢 ${businessName}`;
  }

  // ==================================
  // HINDI
  // ==================================
  if (type === "got") {
    return `👋 नमस्ते ${name}

━━━━━━━━━━━━━━━
🟢 *भुगतान प्राप्त हुआ*

✅ ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 धन्यवाद
🏢 ${businessName}`;
  }

  return `👋 नमस्ते ${name}

━━━━━━━━━━━━━━━
🔴 *उधार जोड़ा गया*

📌 ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 धन्यवाद
🏢 ${businessName}`;
}

async function pickContact() {

  if (!('contacts' in navigator)) {
    alert("Not supported on this device");
    return;
  }

  try {
    const contacts = await navigator.contacts.select(
      ['name', 'tel'],
      { multiple: false }
    );

    if (contacts.length > 0) {
      document.getElementById("cname").value = contacts[0].name[0] || "";
      document.getElementById("cphone").value = contacts[0].tel[0] || "";
    }

  } catch (err) {
    console.error(err);
  }
}

function showBulkProgress(total) {

  modal.innerHTML = `
  <div class="bg-gray-900 p-5 w-80 rounded-xl">

    <div class="text-lg font-bold mb-3">📤 Sending Reminders</div>

    <!-- PROGRESS TEXT -->
    <div id="bulkProgressText" class="text-sm text-gray-400 mb-2">
      0 / ${total} sent
    </div>

    <!-- PROGRESS BAR -->
    <div class="w-full bg-gray-700 h-2 rounded mb-3">
      <div id="bulkProgressBar"
        class="h-2 bg-green-500 rounded"
        style="width:0%">
      </div>
    </div>

    <!-- STATUS LIST -->
    <div id="bulkStatusList"
      class="text-xs max-h-40 overflow-auto space-y-1">
    </div>

  </div>
  `;

  modal.classList.remove("hidden");
}

function updateBulkProgress(sent, total, name, success = true) {

  const percent = Math.floor((sent / total) * 100);

  document.getElementById("bulkProgressText").innerText =
    `${sent} / ${total} sent`;

  document.getElementById("bulkProgressBar").style.width =
    percent + "%";

  const statusList = document.getElementById("bulkStatusList");

  statusList.innerHTML += `
    <div class="${success ? 'text-green-400' : 'text-red-400'}">
      ${success ? '✔' : '✖'} ${name}
    </div>
  `;
}

function finishBulkProgress(total) {

  setTimeout(() => {

    document.getElementById("bulkProgressText").innerText =
      `✅ Completed (${total})`;

  }, 500);

  setTimeout(() => {
    modal.classList.add("hidden");
    showSuccess("All reminders sent 🚀");
  }, 1500);
}

async function sendBulkReminders() {

  const list = customersData.filter(c => c.balance > 0);

  if (!list.length) {
    showToast("No customers with dues", "error");
    return;
  }

  showBulkProgress(list.length);

  let sent = 0;

  for (let c of list) {

    try {

      await sendWhatsAppReminder(c.name, c.phone, c.balance);

      sent++;
      updateBulkProgress(sent, list.length, c.name, true);

    } catch (err) {

      sent++;
      updateBulkProgress(sent, list.length, c.name, false);
    }

    // ⏱ slight delay (important to avoid API spam)
    await new Promise(r => setTimeout(r, 300));
  }

  finishBulkProgress(list.length);
}

async function getBusinessConfig() {

  try {

    const businessId = currentBusiness;

    const rows = await apiGet("getBusinesses");

    // ❌ safety check
    if (!Array.isArray(rows) || rows.length <= 1) {
      throw new Error("Invalid business data");
    }

    // ✅ extract headers
    const headers = rows[0];

    // ✅ convert rows → objects
    const list = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    // ✅ find selected business
    const business = list.find(b => b.id == businessId);

    // ✅ return config if available
    if (business && business.api_url) {
      return {
        api_url: business.api_url,
        instance_id: business.instance_id,
        access_token: business.access_token,
        upi_id: business.upi_id,
        payee_name: business.payee_name,
        qr_image: business.qr_image
      };
    }

  } catch (e) {
    console.error("Business config error:", e);
  }

  // 🔁 fallback (your old system)
  const setup = await apiGet("getSetup");

  return {
    api_url: setup.api_url,
    instance_id: setup.instance_id,
    access_token: setup.access_token,
    upi_id: setup.upi_id,
    payee_name: setup.payee_name,
    qr_image: setup.qr_image
  };
}

let waStatus = {
  isConnected: false,
  lastChecked: null
};

// =============================
// CHECK WHATSAPP CONNECTION
// =============================
async function checkWhatsAppStatus() {

  const dot = document.getElementById("waDot");
  const text = document.getElementById("waText");

  if (!dot || !text) return;

  try {

    // Loading State
    dot.style.background = "orange";
    text.innerText = "Checking...";

    // Must have selected business
    if (!currentBusiness) {
      throw new Error("No Business Selected");
    }

    // Call Apps Script backend
    const res = await apiGet("checkWA", {
      bid: currentBusiness
    });

    console.log("WA STATUS:", res);

    if (res.connected === true) {

      dot.style.background = "#22c55e";
      text.innerText = "Connected";

    } else {

      dot.style.background = "#ef4444";
      text.innerText = "Disconnected";
    }

  } catch (err) {

    console.error("WA STATUS ERROR:", err);

    dot.style.background = "#ef4444";
    text.innerText = "Disconnected";
  }
}

// =============================
// UPDATE TOPBAR UI
// =============================
function updateWAIndicator() {

  const dot = document.getElementById("waDot");
  const text = document.getElementById("waText");

  if (!dot || !text) return;

  if (waStatus.isConnected) {
    dot.style.background = "#22c55e";
    text.innerText = "Connected";
    text.style.color = "#22c55e";
  } else {
    dot.style.background = "#ef4444";
    text.innerText = "Disconnected";
    text.style.color = "#ef4444";
  }
}

// ======================================
// WHATSAPP STATUS AUTO CHECK
// Run on load + every 10 minutes
// ======================================
document.addEventListener("DOMContentLoaded", () => {

  // First check immediately
  checkWhatsAppStatus();

  // Then every 10 minutes
  setInterval(() => {
    checkWhatsAppStatus();
  }, 600000); // 10 min = 600000 ms

});