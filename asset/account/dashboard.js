console.log("✅ dashboard.js loaded");


/* ================= OPEN DASHBOARD ================= */
function openDashboard() {

  console.log("🔥 Dashboard clicked");

  document.getElementById("customersSection")?.classList.add("hidden");
  document.getElementById("cashbookSection")?.classList.add("hidden");

  const dash = document.getElementById("dashboardSection");

  if (!dash) {
    console.error("❌ dashboardSection not found");
    return;
  }

  dash.classList.remove("hidden");

  renderDashboard();
}


/* ================= RENDER DASHBOARD ================= */
async function renderDashboard() {

  const container = document.getElementById("dashboardContent");

  if (!container) return;

  // ✅ LOADER
  container.innerHTML = `
    <div class="p-4 text-center text-gray-400 animate-pulse">
      ⏳ Loading dashboard...
    </div>
  `;

  const businesses = window.businesses || [];

  if (!Array.isArray(businesses) || businesses.length === 0) {
    container.innerHTML = `<div class="p-4 text-gray-400">No businesses</div>`;
    return;
  }

  try {

    // ✅ FAST PARALLEL API
    const results = await Promise.all(
      businesses.map(b =>
        apiGet("getAccounts", { business_id: b.id })
      )
    );

    let totalBalance = 0;
    let cardsHTML = "";

    let topBusiness = "";
    let maxBalance = -Infinity;

    results.forEach((res, index) => {

      const b = businesses[index];

      let balance = 0;
      (res || []).forEach(a => balance += Number(a.balance) || 0);

      totalBalance += balance;

      if (balance > maxBalance) {
        maxBalance = balance;
        topBusiness = b.name;
      }

      cardsHTML += `
        <div class="p-3 bg-gray-900 rounded-lg mb-2">

          <div class="flex justify-between mb-2">
            <span>${b.name}</span>
            <span class="${balance >= 0 ? "text-green-400" : "text-red-400"}">
              ₹${balance}
            </span>
          </div>

          <div class="flex gap-2">

            <button onclick="selectBusinessFromDashboard('${b.id}')"
              class="flex-1 bg-blue-600 text-xs py-1 rounded">
              Open
            </button>

<button onclick="openBusinessReport('${b.id}')"
  class="flex-1 bg-purple-600 text-xs py-1 rounded">
  📊 Report
</button>

          </div>

        </div>
      `;
    });

    container.innerHTML = `
      <div class="mb-4 p-3 bg-purple-900/30 rounded-lg">
        <div class="text-xs text-gray-400">Total Balance</div>
        <div class="text-xl font-bold text-purple-400">₹${totalBalance}</div>
      </div>

      <div class="mb-4 p-3 bg-green-900/20 rounded-lg text-sm">
        🏆 Top Business:
        <span class="text-green-400">${topBusiness}</span>
      </div>

      ${cardsHTML}
    `;

  } catch (err) {
    console.error(err);
    container.innerHTML = "❌ Error loading dashboard";
  }
}


/* ================= SIMPLE VIEW ================= */
async function selectBusinessFromDashboard(businessId) {

  const business = (window.businesses || [])
    .find(b => String(b.id) === String(businessId));

  const panel = document.getElementById("rightPanel");

  if (!panel) return;

  // 🔥 MOBILE SAFE PANEL OPEN
  if (window.innerWidth <= 768 && typeof window.showDetailPanel === "function") {
    window.showDetailPanel();
  }

  panel.innerHTML = `
    <div class="flex flex-col h-full">

      <!-- HEADER -->
      <div class="p-3 border-b border-gray-800 flex items-center gap-2">

        <!-- MOBILE BACK -->
        <button onclick="mobileBack()" 
          class="md:hidden bg-gray-800 px-3 py-1 rounded text-sm">
          ← Back
        </button>

        <div class="font-semibold">
          ${business?.name || "Business"}
        </div>

      </div>

      <!-- BODY -->
      <div id="businessBody" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div class="text-gray-400 animate-pulse">Loading...</div>
      </div>

    </div>
  `;

  const body = document.getElementById("businessBody");

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
        <div onclick="openAccountLedger('${a.id}', '${businessId}')"
          class="flex justify-between border-b border-gray-800 py-2 cursor-pointer hover:bg-gray-800 px-2 rounded">

          <span>${a.name}</span>

          <span class="${bal >= 0 ? "text-green-400" : "text-red-400"}">
            ₹${bal}
          </span>

        </div>
      `;
    });

    body.innerHTML = `
      
      <!-- KPI -->
      <div class="grid grid-cols-3 gap-2 text-center">

        <div class="bg-green-900/30 p-2 rounded">
          <div class="text-xs text-gray-400">Income</div>
          <div class="text-green-400 font-bold">₹${positive}</div>
        </div>

        <div class="bg-red-900/30 p-2 rounded">
          <div class="text-xs text-gray-400">Expense</div>
          <div class="text-red-400 font-bold">₹${negative}</div>
        </div>

        <div class="bg-yellow-900/30 p-2 rounded">
          <div class="text-xs text-gray-400">Net</div>
          <div class="text-yellow-400 font-bold">₹${total}</div>
        </div>

      </div>

      <!-- MINI CHART -->
      <div class="bg-gray-900 p-3 rounded-lg h-56">
        <div class="text-sm mb-2">📊 Overview</div>
        <canvas id="miniChart"></canvas>
      </div>

      <!-- ACCOUNT LIST -->
      <div class="bg-gray-900 p-3 rounded-lg">
        ${listHTML || `<div class="text-gray-400 text-sm">No accounts</div>`}
      </div>

    `;

    // ================= SAFE CHART =================
    const canvas = document.getElementById("miniChart");

    if (canvas) {
      new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: ["Income", "Expense"],
          datasets: [{ data: [positive, negative] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

  } catch (err) {
    console.error(err);
    body.innerHTML = `<div class="text-red-400">Error loading</div>`;
  }
}


/* ================= FULL REPORT ================= */
async function openBusinessReport(businessId) {

  if (!businessId) return;

  const business = (window.businesses || [])
    .find(b => String(b.id) === String(businessId));

  const panel = document.getElementById("rightPanel");

  if (!panel) return;

  // 🔥 FORCE PANEL OPEN (CRITICAL FIX FOR MOBILE)
  if (window.innerWidth <= 768 && typeof window.showDetailPanel === "function") {
    window.showDetailPanel();
  }

  // 🔥 CLEAN PREVIOUS CHART INSTANCES (IMPORTANT FIX)
  if (window.__reportCharts) {
    window.__reportCharts.forEach(c => c.destroy());
  }
  window.__reportCharts = [];

  panel.innerHTML = `
  <div class="flex flex-col h-full">

    <!-- HEADER (STABLE - NOT OVERWRITTEN) -->
<div class="p-3 border-b border-gray-800 flex items-center justify-between">
  
  <div class="flex items-center gap-2">
    <button onclick="mobileBack()" class="md:hidden bg-gray-800 px-3 py-1 rounded text-sm">
      ← Back
    </button>

    <div class="font-semibold">
      ${business?.name || "Business"}
    </div>
  </div>

</div>

    <!-- CONTENT AREA -->
    <div id="reportBody" class="flex-1 overflow-y-auto"></div>

  </div>
`;

  const scrollDiv = document.getElementById("reportBody");

  try {

    const accRes = await apiGet("getAccounts", {
      business_id: businessId
    });

    let total = 0, positive = 0, negative = 0;
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

    scrollDiv.innerHTML = `

      <!-- KPI -->
      <div class="grid grid-cols-3 gap-2 text-center">

        <div class="bg-green-900/30 p-2 rounded">
          <div class="text-xs">Income</div>
          <div class="text-green-400 font-bold">₹${positive}</div>
        </div>

        <div class="bg-red-900/30 p-2 rounded">
          <div class="text-xs">Expense</div>
          <div class="text-red-400 font-bold">₹${negative}</div>
        </div>

        <div class="bg-yellow-900/30 p-2 rounded">
          <div class="text-xs">Net</div>
          <div class="text-yellow-400 font-bold">₹${total}</div>
        </div>

      </div>

      <!-- CHART GRID -->
      <div class="grid md:grid-cols-2 gap-4">

        <div class="bg-gray-900 p-3 rounded-lg h-64">
          <canvas id="incomeExpenseChart"></canvas>
        </div>

        <div class="bg-gray-900 p-3 rounded-lg h-64">
          <canvas id="comparisonChart"></canvas>
        </div>

        <div class="bg-gray-900 p-3 rounded-lg h-64">
          <canvas id="radarChart"></canvas>
        </div>

        <div class="bg-gray-900 p-3 rounded-lg h-64">
          <canvas id="predictionChart"></canvas>
        </div>

      </div>

      <div class="bg-gray-900 p-3 rounded-lg">
        <div class="text-sm mb-2">🏆 Leaderboard</div>
        <div id="leaderboard" class="max-h-48 overflow-y-auto"></div>
      </div>

      <div class="bg-gray-900 p-3 rounded-lg">
        ${listHTML}
      </div>
    `;

    // 🔥 WAIT FOR REAL DOM PAINT (BETTER THAN setTimeout 150)
    requestAnimationFrame(async () => {

      try {

        const labels = [];
        const data = [];

        // ================= CHART 1 =================
        const c1 = document.getElementById("incomeExpenseChart");
        if (c1) {
          const chart = new Chart(c1, {
            type: "doughnut",
            data: {
              labels: ["Income", "Expense"],
              datasets: [{ data: [positive, negative] }]
            }
          });
          window.__reportCharts.push(chart);
        }

        // ================= COMPARISON =================
        const businesses = window.businesses || [];

        const results = await Promise.all(
          businesses.map(b =>
            apiGet("getAccounts", { business_id: b.id })
          )
        );

        results.forEach((res, i) => {
          let bal = 0;
          (res || []).forEach(a => bal += Number(a.balance) || 0);
          labels.push(businesses[i].name);
          data.push(bal);
        });

        const c2 = document.getElementById("comparisonChart");
        if (c2) {
          const chart = new Chart(c2, {
            type: "bar",
            data: { labels, datasets: [{ data }] }
          });
          window.__reportCharts.push(chart);
        }

        const c3 = document.getElementById("radarChart");
        if (c3) {
          const chart = new Chart(c3, {
            type: "radar",
            data: {
              labels: ["Income", "Expense", "Net"],
              datasets: [{ data: [positive, negative, total] }]
            }
          });
          window.__reportCharts.push(chart);
        }

        const c4 = document.getElementById("predictionChart");
        if (c4) {

          let pred = [];
          let base = total || 1000;

          for (let i = 0; i < 7; i++) {
            base += (Math.random() - 0.5) * 500;
            pred.push(Math.round(base));
          }

          const chart = new Chart(c4, {
            type: "line",
            data: {
              labels: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
              datasets: [{ data: pred }]
            }
          });

          window.__reportCharts.push(chart);
        }

        // ================= LEADERBOARD =================
        const lb = document.getElementById("leaderboard");

        if (lb) {
          const sorted = labels.map((n, i) => ({
            name: n,
            balance: data[i]
          }))
            .sort((a, b) => b.balance - a.balance);

          lb.innerHTML = sorted.map((b, i) => `
            <div class="flex justify-between py-2">
              <span>${i + 1}. ${b.name}</span>
              <span>₹${b.balance}</span>
            </div>
          `).join("");
        }

      } catch (e) {
        console.error("Chart error:", e);
      }

    });

  } catch (err) {
    console.error(err);
    panel.innerHTML = `
      <div class="p-4 text-red-400">
        Error loading report
      </div>
    `;
  }
}