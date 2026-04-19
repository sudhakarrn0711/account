
    // ================= API =================
    const API = "https://script.google.com/macros/s/AKfycbxpbJPkBFWUyVO_pMK51oU21kYYvc9s7l7L4ZqHKlc2sDIdTiAlFhc_2kowHqVsp1lU/exec";

    let currentEnv = localStorage.getItem("env") || "test";

    // Toggle UI
    envToggle.checked = currentEnv === "live";

    envToggle.onchange = () => {
      currentEnv = envToggle.checked ? "live" : "test";
      localStorage.setItem("env", currentEnv);
      location.reload();
    };

    // ================= COMMON FETCH HELPERS =================

    // ================= API HELPERS =================

    // GET
    function apiGet(action, params = {}) {
      let url = `${API}?action=${action}&env=${currentEnv}`;

      Object.keys(params).forEach(key => {
        url += `&${key}=${params[key]}`;
      });

      return fetch(url).then(res => res.json());
    }

    // POST
    function apiPost(body) {
      return fetch(API, {
        method: "POST",
        body: JSON.stringify({
          ...body,
          env: currentEnv
        })
      }).then(res => res.json());
    }

    // ================= STATE =================
    let currentBusiness = localStorage.getItem("business") || "";
    let selectedCustomer = "";

    // ================= INIT =================
    loadBusinesses();


    let businessName = "";
    // ================= BUSINESS =================
    async function loadBusinesses() {
      const res = await fetch(API + "?action=getBusinesses");
      const data = await res.json();

      let html = "";

      data.slice(1).forEach(b => {
        html += `<option value="${b[0]}">${b[1]}</option>`;
      });

      businessSelect.innerHTML = html;

      if (!currentBusiness) currentBusiness = data[1][0];

      businessSelect.value = currentBusiness;

      // ✅ SET BUSINESS NAME HERE
      const selected = data.find(b => b[0] == currentBusiness);
      businessName = selected ? selected[1] : "My Business";

      businessSelect.onchange = () => {
        currentBusiness = businessSelect.value;
        localStorage.setItem("business", currentBusiness);

        // ✅ UPDATE NAME ON CHANGE
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
      await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "addBusiness",
          name: bname.value,
          env: currentEnv   // ✅ VERY IMPORTANT
        })
      });

      modal.classList.add("hidden");
      loadBusinesses();
    }

    // ================= CUSTOMERS =================
    async function openCustomers() {

      if (!currentBusiness) {
        customerList.innerHTML = `<div class="p-3 text-gray-400">No Business Selected</div>`;
        return;
      }

      const data = await apiGet("getCustomers", { bid: currentBusiness });

      customerList.innerHTML = "";

      if (!data || data.length === 0) {
        customerList.innerHTML = `<div class="p-3 text-gray-400">No Customers</div>`;
        return;
      }

      let html = `
  <div class="p-3 border-b flex justify-between text-xs text-gray-400">
    <span>NAME</span>
    <span>AMOUNT</span>
  </div>`;

      for (let c of data) {

        // 🔥 get balance
        const txn = await apiGet("getCustomerTransactions", {
          bid: currentBusiness,
          cid: c[0]
        });

        const bal = txn.balance || 0;

        const isGive = bal >= 0;

        html += `
    <div onclick="selectCustomer('${c[0]}','${c[2]}','${c[3]}')"
      class="p-3 border-b cursor-pointer hover:bg-gray-800 flex justify-between">

      <div>
        <div class="font-medium">${c[2]}</div>
        <div class="text-xs text-gray-400">${c[3] || ""}</div>
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
      }

      customerList.innerHTML = html;
    }

    async function saveCustomer() {
      await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "addCustomer",
          business_id: currentBusiness,
          name: cname.value,
          phone: cphone.value,
          env: currentEnv   // 🔥 VERY IMPORTANT
        })
      });

      modal.classList.add("hidden");
      openCustomers();
    }

    // ================= LEDGER =================
    async function selectCustomer(id, name, phone = "") {


      selectedTxns.clear();
      updateMultiDeleteBar();

      selectedCustomer = id;

      const data = await apiGet("getCustomerTransactions", {
        bid: currentBusiness,
        cid: id
      });

      let give = 0, get = 0;

      data.transactions.forEach(t => {
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
      <button onclick="openReportPanel('${id}','${name}')" 
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
        onclick='sendWhatsAppReminder(${JSON.stringify(name)}, ${JSON.stringify(phone)}, ${Math.abs(net)})'
        class="w-full border p-2 rounded hover:bg-green-700">
        WhatsApp Reminder
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
  <button onclick="deleteTxn('${t.id}')"
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
          ${new Date(t.date).toLocaleString()}
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

    async function saveTxn() {

      const amount = Number(document.getElementById("amt").value);
      const note = document.getElementById("note").value;
      const date = document.getElementById("txnDate").value;

      if (!amount) {
        alert("Enter amount");
        return;
      }

      await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "addTransaction",
          business_id: currentBusiness,
          customer_id: selectedCustomer,
          type: txnType,
          amount: amount,
          note: note,
          date: date // ✅ NEW
        })
      });

      modal.classList.add("hidden");

      // 🔥 instant refresh
      selectCustomer(selectedCustomer, "");
      openCustomers(); // optional refresh left list
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
      await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "addCashEntry",
          business_id: currentBusiness,
          type: txnType,
          amount: Number(amt.value),
          note: note.value,
          mode: "cash"
        })
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

    function openAccountModal() {
      modal.innerHTML = `
  <div class="bg-gray-800 p-4 w-80">
    <h3>Add Account</h3>
    <input id="acc" class="w-full p-2 bg-black mt-2">
    <button onclick="saveAccount()" class="bg-blue-600 w-full p-2 mt-3">Save</button>
  </div>`;
      modal.classList.remove("hidden");
    }

    async function saveAccount() {
      await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "addAccount",
          business_id: currentBusiness,
          name: acc.value
        })
      });
      modal.classList.add("hidden");
    }

    async function loadCashReport() {

      const res = await fetch(API + "?action=getCashbook&bid=" + currentBusiness);
      const data = await res.json();

      let from = fromDate.value ? new Date(fromDate.value) : null;
      let to = toDate.value ? new Date(toDate.value) : null;

      let grouped = {};

      data.forEach(r => {
        let d = new Date(r[7]);

        if (from && d < from) return;
        if (to && d > to) return;

        let key = d.toDateString();

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });

      let html = "";

      Object.keys(grouped).forEach(date => {

        html += `<div class="mb-4">
      <div class="text-sm text-gray-400 mb-1">${date}</div>`;

        grouped[date].forEach(r => {
          html += `
      <div class="card flex justify-between mb-1">
        <span>${r[5] || "-"}</span>
        <span class="${r[2] == 'in' ? 'text-green-400' : 'text-red-400'}">
          ${r[2] == 'in' ? '+' : '-'}₹${r[3]}
        </span>
      </div>`;
        });

        html += "</div>";
      });

      cashList.innerHTML = html;
    }

    //mobile side bar start
    function toggleSidebar() {
      document.getElementById("sidebar").classList.toggle("open");
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

    document.getElementById("excelFile").addEventListener("change", handleExcel);

    async function handleExcel(e) {
      const file = e.target.files[0];
      if (!file) return;

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Expected columns: Name, Phone

      for (let row of rows) {
        await apiPost({
          action: "addCustomer",
          business_id: currentBusiness,
          name: row.Name || row.name,
          phone: row.Phone || row.phone
        });
      }

      alert("Bulk upload completed ✅");
      openCustomers();
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

    <button onclick="updateCustomer('${id}')" 
      class="bg-blue-600 w-full p-2 mb-2">Save</button>

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

      const data = await apiGet("getCustomerTransactions", {
        bid: currentBusiness,
        cid: cid
      });

      let give = 0, get = 0;

      data.transactions.forEach(t => {
        if (t.type === "gave") give += Number(t.amount);
        else get += Number(t.amount);
      });

      let net = give - get;

      let netColor = net >= 0 ? "text-green-500" : "text-red-500";

      let html = `
  <div class="p-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold">Transaction Reports</h2>

      <div class="flex gap-2">
        <button class="border px-3 py-1 rounded">Download PDF</button>
        <button class="border px-3 py-1 rounded">Download Excel</button>
      </div>
    </div>

    <!-- FILTERS -->
    <div class="grid grid-cols-4 gap-3 mb-4">

      <input value="${name}" 
        class="p-2 bg-black rounded" disabled>

      <select id="period" class="p-2 bg-black rounded">
        <option>This Month</option>
        <option>Last Month</option>
        <option>Custom</option>
      </select>

      <input type="date" id="fromDate" class="p-2 bg-black rounded">
      <input type="date" id="toDate" class="p-2 bg-black rounded">

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

      <div class="flex-1 bg-gray-200 p-4 rounded">
        <div class="text-xl font-bold ${netColor}">
          ${net >= 0 ? "₹" + net : "-₹" + Math.abs(net)}
        </div>
        <div>Net Balance</div>
      </div>

    </div>

    <!-- TABLE HEADER -->
    <div class="grid grid-cols-5 text-sm font-semibold border-b pb-2">
      <div>DATE</div>
      <div>Customer</div>
      <div>DETAILS</div>
      <div>YOU GAVE</div>
      <div>YOU GOT</div>
    </div>

    <!-- DATA -->
    <div id="reportTable" class="mt-2 max-h-[400px] overflow-auto">
  `;

      data.transactions.forEach(t => {
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

      html += `
    </div>

    <!-- BACK BUTTON -->
    <div class="mt-4">
      <button onclick="selectCustomer('${cid}','${name}')" 
        class="bg-gray-700 px-4 py-2 rounded">
        ← Back
      </button>
    </div>

  </div>
  `;

      rightPanel.innerHTML = html;
    }

    async function openCustomerSettings(id, name) {

      // Get customer list to find phone
      const customers = await apiGet("getCustomers", { bid: currentBusiness });
      const cust = customers.find(c => c[0] == id);

      const phone = cust ? cust[3] : "";

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
      <button onclick="editCustomer('${id}','${name}','${phone}')"
        class="w-full border p-3 rounded hover:bg-gray-700">
        ✏️ Edit Profile
      </button>

      <!-- PHONE -->
      <div class="border-b pb-3">
        <div class="text-gray-400 text-sm">Phone Number</div>
        <div>${phone}</div>
      </div>

      <!-- GST -->
      <div>
        <div class="text-gray-400 text-sm">GST Number</div>
        <input id="gst" placeholder="Enter GST"
          class="w-full p-2 bg-black rounded mt-1">
      </div>

      <!-- SHIPPING -->
      <div>
        <div class="text-gray-400 text-sm">Shipping Address</div>
        <input id="shipping" placeholder="Enter Address"
          class="w-full p-2 bg-black rounded mt-1">
      </div>

      <!-- BILLING -->
      <div>
        <div class="text-gray-400 text-sm">Billing Address</div>
        <input id="billing" placeholder="Enter Address"
          class="w-full p-2 bg-black rounded mt-1">
      </div>

      <!-- SAVE -->
      <button onclick="saveCustomerExtra('${id}')"
        class="bg-green-600 w-full p-2 rounded">
        Save Details
      </button>

      <!-- DELETE -->
      <button onclick="deleteCustomer('${id}')"
        class="border border-red-500 text-red-500 w-full p-2 rounded hover:bg-red-500/10">
        🗑 Delete Customer
      </button>

    </div>
  </div>
  `;
    }

    function editCustomer(id, name, phone) {
      modal.innerHTML = `
  <div class="bg-gray-800 p-4 w-80">
    <h3>Edit Customer</h3>

    <input id="ename" value="${name}" class="w-full p-2 bg-black mt-2">
    <input id="ephone" value="${phone}" class="w-full p-2 bg-black mt-2">

    <button onclick="updateCustomer('${id}')"
      class="bg-blue-600 w-full p-2 mt-3">Update</button>
  </div>`;
      modal.classList.remove("hidden");
    }

    async function updateCustomer(id) {
      await apiPost({
        action: "updateCustomer",
        id,
        name: ename.value,
        phone: ephone.value
      });

      modal.classList.add("hidden");
      openCustomers();
    }

    async function deleteCustomer(id) {

      if (!confirm("Delete this customer permanently?")) return;

      await apiPost({
        action: "deleteCustomer",
        id
      });

      rightPanel.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400">Customer Deleted</div>`;
      openCustomers();
    }


    async function saveCustomerExtra(id) {
      await apiPost({
        action: "saveCustomerExtra",
        id,
        gst: document.getElementById("gst").value,
        shipping: document.getElementById("shipping").value,
        billing: document.getElementById("billing").value
      });

      alert("Saved");
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

      await apiPost({
        action: "updateTransaction",
        id: id,
        amount: document.getElementById("eAmt").value,
        note: document.getElementById("eNote").value,
        date: document.getElementById("eDate").value
      });

      modal.classList.add("hidden");

      selectCustomer(selectedCustomer, "");
      openCustomers();
    }

    async function deleteTxn(id) {

      if (!confirm("Delete this entry?")) return;

      await apiPost({
        action: "deleteTransaction",
        id: id
      });

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

      if (!confirm("Mark this as paid?")) return;

      await apiPost({
        action: "markPaid",
        id: id
      });

      // refresh UI
      selectCustomer(selectedCustomer, "");
      openCustomers();
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

      if (!confirm("Delete selected entries?")) return;

      for (const id of selectedTxns) {
        await apiPost({
          action: "deleteTransaction",
          id: id
        });
      }

      // ✅ CLEAR SELECTION
      selectedTxns.clear();

      // ✅ REMOVE BAR IMMEDIATELY
      updateMultiDeleteBar();

      // ✅ REFRESH UI
      selectCustomer(selectedCustomer, "");
      openCustomers();
    }

    async function sendWhatsAppReminder(name, phone, amount) {

      try {

        // ✅ CLEAN PHONE
        phone = (phone || "").replace(/\D/g, "");
        if (!phone.startsWith("91")) phone = "91" + phone;

        // ✅ BUSINESS NAME
        let businessName = document.getElementById("businessSelect")
          ?.selectedOptions[0]?.text || "Your Business";

        // ✅ LANGUAGE
        let lang = document.getElementById("lang")?.value || "en";

        // ✅ GET SETUP
        const setup = await apiGet("getSetup");

        // ✅ SAFE FALLBACKS
        const upi = setup.upi_id || "sudhakarrn0711@okicici";
        const payee = setup.payee_name || businessName;
        const qr = setup.qr_image || "https://finance.ransangroups.in/RanSanGroup_QR.png";

        // ✅ FIXED UPI LINK (IMPORTANT)
        let upiLink = `upi://pay?pa=${upi}&pn=${encodeURIComponent(payee)}&am=${Number(amount)}&cu=INR`;

        // ✅ PUBLIC SUMMARY LINK (VERY IMPORTANT)
        let summaryLink = `https://finance.ransangroups.in/account_dashboard.html?customer=${selectedCustomer}&bid=${currentBusiness}`;

        // ✅ BUILD MESSAGE
        let msg = buildAdvancedMessage({
          name,
          amount,
          businessName,
          upiLink,
          qrLink: qr,
          summaryLink,
          lang
        });

        // ✅ ONLY ONE MESSAGE (BEST PRACTICE)
        const res = await apiPost({
          action: "sendWhatsApp",
          phone,
          message: msg
        });

        console.log("WA RESPONSE:", res);

        alert(res.success ? "✅ WhatsApp Sent" : "❌ Error");

      } catch (err) {
        console.error(err);
        alert("❌ Failed");
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

    function buildInvoiceMessage(name, amount, businessName, paymentLink, lang) {

      if (lang === "ta") {
        return `👋 வணக்கம் ${name},

━━━━━━━━━━━━━━━
📊 *கணக்கு விவரம்*

💰 நிலுவை தொகை:
👉 *₹${amount}*

━━━━━━━━━━━━━━━
⚡ *விரைவான கட்டணம்*

🔗 இப்போது செலுத்த:
${paymentLink}

━━━━━━━━━━━━━━━
🙏 உங்கள் ஆதரவுக்கு நன்றி

🏢 ${businessName}`;
      }

      if (lang === "hi") {
        return `👋 नमस्ते ${name},

━━━━━━━━━━━━━━━
📊 *खाता विवरण*

💰 बकाया राशि:
👉 *₹${amount}*

━━━━━━━━━━━━━━━
⚡ *त्वरित भुगतान*

🔗 अभी भुगतान करें:
${paymentLink}

━━━━━━━━━━━━━━━
🙏 धन्यवाद

🏢 ${businessName}`;
      }

      // ENGLISH (DEFAULT)
      return `👋 Hello ${name},

━━━━━━━━━━━━━━━
🧾 *INVOICE SUMMARY*

💰 *Pending Amount:* ₹${amount}

━━━━━━━━━━━━━━━
⚡ *Quick Pay*

👉 Pay Now:
${paymentLink}

━━━━━━━━━━━━━━━
📌 Scan QR for easy payment (sent below)

🙏 Thank you for your business!

🏢 *${businessName}*
📲 Powered by RanSan`;
    }



