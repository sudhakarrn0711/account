console.log("✅ dashboard.js loaded");

/* ================= OPEN DASHBOARD ================= */
function openDashboard() {

  console.log("🔥 Dashboard clicked");

  // hide all sections
  document.getElementById("customersSection")?.classList.add("hidden");
  document.getElementById("cashbookSection")?.classList.add("hidden");

  // show dashboard
  const dash = document.getElementById("dashboardSection");

  if (!dash) {
    console.error("❌ dashboardSection not found");
    return;
  }

  dash.classList.remove("hidden");

  renderDashboard();
}

/* ================= LOAD DASHBOARD ================= */
async function loadDashboard() {

  const container = document.getElementById("dashboardContent");

  container.innerHTML = "Loading...";

  try {

    const select = document.getElementById("businessSelect");

    if (!select) {
      container.innerHTML = "❌ businessSelect not found";
      return;
    }

    const businesses = Array.from(select.options).map(opt => ({
      id: opt.value,
      name: opt.text
    }));

    console.log("BUSINESSES:", businesses);

    if (!businesses.length) {
      container.innerHTML = "No businesses found";
      return;
    }

    let html = "";
    let total = 0;

    for (let b of businesses) {

      const res = await apiGet("getAccounts", {
        business_id: b.id
      });

      let bal = 0;

      (res || []).forEach(a => {
        bal += Number(a.balance) || 0;
      });

      total += bal;

      html += `
        <div style="padding:10px;border:1px solid #333;margin-bottom:5px">
          ${b.name} → ₹${bal}
        </div>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom:10px">
        Total Balance: ₹${total}
      </div>
      ${html}
    `;

  } catch (err) {
    console.error(err);
    container.innerHTML = "❌ Dashboard error";
  }
}

/* ================= RENDER DASHBOARD ================= */
async function renderDashboard() {

  const container = document.getElementById("dashboardContent");

  if (!container) {
    console.error("❌ dashboardContent not found");
    return;
  }

  const businesses = window.businesses || [];

  // 🛡️ safety
  if (!Array.isArray(businesses) || businesses.length === 0) {
    container.innerHTML = `
      <div class="text-gray-400 p-4">
        No businesses found
      </div>`;
    return;
  }

  let totalBalance = 0;
  let cardsHTML = "";

  let topBusiness = "";
  let maxBalance = -Infinity;

  // ✅ SINGLE LOOP (optimized)
  for (let b of businesses) {

    try {

      const accRes = await apiGet("getAccounts", {
        business_id: b.id
      });

      let balance = 0;

      (accRes || []).forEach(a => {
        balance += Number(a.balance) || 0;
      });

      // ✅ total
      totalBalance += balance;

      // ✅ top business
      if (balance > maxBalance && balance > 0) {
        maxBalance = balance;
        topBusiness = b.name;
      }

      // ✅ UI card
      cardsHTML += `
  <div class="p-3 bg-gray-900 rounded-lg mb-2">

    <div class="flex justify-between mb-2">
      <span>${b.name}</span>
      <span class="${balance >= 0 ? "text-green-400" : "text-red-400"}">
        ₹${balance}
      </span>
    </div>

    <div class="flex gap-2">

      <!-- NORMAL (your existing function) -->
      <button onclick="selectBusinessFromDashboard('${b.id}')"
        class="flex-1 bg-blue-600 text-xs py-1 rounded">
        Open
      </button>

      <!-- NEW ADVANCED REPORT -->
      <button onclick="openBusinessReport('${b.id}')"
        class="flex-1 bg-purple-600 text-xs py-1 rounded">
        📊 Report
      </button>

    </div>

  </div>
`;

    } catch (err) {
      console.error("❌ Error loading business:", b.name, err);
    }
  }

  // ✅ FINAL RENDER
  container.innerHTML = `
    <!-- TOTAL -->
    <div class="mb-4 p-3 bg-purple-900/30 rounded-lg">
      <div class="text-xs text-gray-400">Total Balance</div>
      <div class="text-xl font-bold text-purple-400">₹${totalBalance}</div>
    </div>

    <!-- TOP BUSINESS -->
    <div class="mb-4 p-3 bg-green-900/20 rounded-lg text-sm">
🏆 Top Business: 
<span class="text-green-400">
  ${topBusiness || "No profitable business"}
</span>
    </div>

    <!-- BUSINESS LIST -->
    ${cardsHTML}
  `;
}

/* ================= SWITCH BUSINESS ================= */
async function selectBusinessFromDashboard(businessId) {

  console.log("📊 Open business report:", businessId);

  // find business
  const business = (window.businesses || [])
    .find(b => String(b.id) === String(businessId));

  if (!business) {
    console.error("❌ Business not found");
    return;
  }

  const panel = document.getElementById("rightPanel");

  panel.innerHTML = `<div class="p-4">Loading report...</div>`;

  try {

    const accRes = await apiGet("getAccounts", {
      business_id: businessId
    });

    let total = 0;
    let positive = 0;
    let negative = 0;

    let listHTML = "";

    (accRes || []).forEach(a => {

      const bal = Number(a.balance) || 0;

      total += bal;

      if (bal > 0) positive += bal;
      else negative += Math.abs(bal);

      listHTML += `
        <div class="flex justify-between border-b border-gray-800 py-2">
          <span>${a.name}</span>
          <span class="${bal >= 0 ? "text-green-400" : "text-red-400"}">
            ₹${bal}
          </span>
        </div>
      `;
    });

    panel.innerHTML = `
  <div class="flex flex-col h-full">

    <!-- ✅ THIS IS THE SCROLL AREA -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">

      <div class="text-lg font-bold">${business.name}</div>

      <!-- GRID -->
      <div class="grid md:grid-cols-2 gap-4">

        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">📊 Income vs Expense</div>
          <canvas id="incomeExpenseChart"></canvas>
        </div>

        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">🔥 Business Comparison</div>
          <canvas id="comparisonChart"></canvas>
        </div>

        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">🎯 Profit Radar</div>
          <canvas id="radarChart"></canvas>
        </div>

        <div class="bg-gray-900 p-3 rounded-lg">
          <div class="text-sm mb-2">📈 AI Prediction</div>
          <canvas id="predictionChart"></canvas>
        </div>

      </div>

      <!-- Leaderboard -->
      <div class="bg-gray-900 p-3 rounded-lg">
        <div class="text-sm mb-2">🏆 Leaderboard</div>

        <div id="leaderboard" class="max-h-40 overflow-y-auto pr-1"></div>
      </div>

      <!-- Accounts -->
      <div class="bg-gray-900 p-3 rounded-lg">
        ${listHTML || `<div class="text-gray-400 text-sm">No accounts</div>`}
      </div>

    </div>

  </div>
`;

  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="p-4 text-red-400">Error loading report</div>`;
  }
}

let incomeChartInstance = null;
let comparisonChartInstance = null;
let radarChartInstance = null;

async function openBusinessReport(businessId) {

  console.log("📊 Open business report:", businessId);

  const business = (window.businesses || [])
    .find(b => String(b.id) === String(businessId));

  if (!business) {
    console.error("❌ Business not found");
    return;
  }

  const panel = document.getElementById("rightPanelScroll");
  panel.innerHTML = `<div class="p-4">Loading report...</div>`;

  try {

    /* ================= CURRENT BUSINESS ================= */

    const accRes = await apiGet("getAccounts", {
      business_id: businessId
    });

    let total = 0;
    let positive = 0;
    let negative = 0;
    let listHTML = "";

    (accRes || []).forEach(a => {

      const bal = Number(a.balance) || 0;

      total += bal;

      if (bal > 0) positive += bal;
      else negative += Math.abs(bal);

      listHTML += `
        <div class="flex justify-between border-b border-gray-800 py-2">
          <span>${a.name}</span>
          <span class="${bal >= 0 ? "text-green-400" : "text-red-400"}">
            ₹${bal}
          </span>
        </div>
      `;
    });

    /* ================= UI ================= */

    panel.innerHTML = `
      <div class="p-4 space-y-4 h-max">

        <div class="text-lg font-bold">${business.name}</div>


        <!-- GRID -->
<div class="grid md:grid-cols-2 gap-4">

  <div class="bg-gray-900 p-3 rounded-lg h-64">
    <div class="text-sm mb-2">📊 Income vs Expense</div>
    <canvas id="incomeExpenseChart"></canvas>
  </div>

  <div class="bg-gray-900 p-3 rounded-lg h-64">
    <div class="text-sm mb-2">🔥 Business Comparison</div>
    <canvas id="comparisonChart"></canvas>
  </div>

  <div class="bg-gray-900 p-3 rounded-lg h-64">
    <div class="text-sm mb-2">🎯 Profit Radar</div>
    <canvas id="radarChart"></canvas>
  </div>

  <div class="bg-gray-900 p-3 rounded-lg h-64">
    <div class="text-sm mb-2">📈 AI Prediction</div>
    <canvas id="predictionChart"></canvas>
  </div>

</div>

        <!-- Leaderboard -->
<div class="bg-gray-900 p-3 rounded-lg">
  <div class="text-sm mb-2">🏆 Leaderboard</div>

<div id="leaderboard" 
     class="max-h-48 overflow-y-auto pr-1 border border-gray-800 rounded">
</div>
</div>

        <!-- Accounts -->
        <div class="bg-gray-900 p-3 rounded-lg">
          ${listHTML || `<div class="text-gray-400 text-sm">No accounts</div>`}
        </div>

      </div>
    `;

    /* ================= CHARTS ================= */

    // 📊 Income vs Expense
    new Chart(document.getElementById("incomeExpenseChart"), {
      type: "doughnut",
      data: {
        labels: ["Income", "Expense"],
        datasets: [{
          data: [positive, negative]
        }]
      }
    });

    // 🎯 Radar
    new Chart(document.getElementById("radarChart"), {
      type: "radar",
      data: {
        labels: ["Profit", "Loss", "Net"],
        datasets: [{
          label: "Business Health",
          data: [positive, negative, total]
        }]
      }
    });

    // 📈 Prediction (simple AI simulation)
    let prediction = [];
    let base = total || 1000;

    for (let i = 1; i <= 7; i++) {
      base += (Math.random() - 0.5) * 1000;
      prediction.push(Math.round(base));
    }

    new Chart(document.getElementById("predictionChart"), {
      type: "line",
      data: {
        labels: ["Day1", "Day2", "Day3", "Day4", "Day5", "Day6", "Day7"],
        datasets: [{
          label: "Forecast",
          data: prediction
        }]
      }
    });

    /* ================= MULTI BUSINESS ================= */

    const businesses = window.businesses || [];
    let labels = [];
    let data = [];

    for (let b of businesses) {

      const res = await apiGet("getAccounts", {
        business_id: b.id
      });

      let bal = 0;
      (res || []).forEach(a => bal += Number(a.balance) || 0);

      labels.push(b.name);
      data.push(bal);
    }

    // 🔥 Comparison
    new Chart(document.getElementById("comparisonChart"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Balance",
          data: data
        }]
      }
    });

    // 🏆 Leaderboard
    let sorted = labels.map((name, i) => ({
      name,
      balance: data[i]
    })).sort((a, b) => b.balance - a.balance);

    let leaderboardHTML = "";

    sorted.forEach((b, i) => {
      leaderboardHTML += `
  <div class="flex justify-between py-2 px-2 rounded hover:bg-gray-800 transition">
    <span>${i + 1}. ${b.name}</span>
    <span class="${b.balance >= 0 ? "text-green-400" : "text-red-400"}">
      ₹${b.balance}
    </span>
  </div>
`;
    });

    document.getElementById("leaderboard").innerHTML = leaderboardHTML;

  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="p-4 text-red-400">Error loading report</div>`;
  }
}