let currentSearch = "";

// =========================================================
// CUSTOMER MASTER BULK SELECTION
// =========================================================

let selectedCustomers = new Set();
let customerMasterLongPressTimer = null;

// =========================================================
// CUSTOMER TRANSACTION FILTER / SEARCH
// =========================================================

let customerTxnSearch = "";

let customerTxnFilter = {
  period: "all",   // all | today | week | month
  type: "all"      // all | gave | got
};

window.currentCustomerTxns = [];

/* =========================================================
   RANSAN TINY LOADER ENGINE
   =========================================================

   Purpose:
   - No skeleton screens
   - No full-screen blocking loader
   - Existing content remains visible
   - Loader appears only when request takes > 250ms
   ========================================================= */

const RanSanTinyLoader = {

  delay:
    450,

  timer:
    null,

  element:
    null,

  requestCount:
    0,


  show(
    message = "Loading..."
  ) {

    this.requestCount++;


    /*
     * Loader already visible.
     * Just update the message.
     */

    if (this.element) {

      const label =
        this.element.querySelector(
          ".rsTinyLoaderText"
        );


      if (label) {

        label.textContent =
          message;

      }


      return;

    }


    /*
     * Loader already waiting to appear.
     */

    if (this.timer) {

      return;

    }


    /*
     * Delay prevents loader flashing
     * for fast API responses.
     */

    this.timer =
      setTimeout(
        () => {

          this.timer =
            null;


          /*
           * Request may have completed
           * during the 250ms delay.
           */

          if (
            this.requestCount <= 0
          ) {

            return;

          }


          const loader =
            document.createElement(
              "div"
            );


          loader.id =
            "rsTinyLoader";


          loader.className =
            "rsTinyLoader";


          loader.innerHTML = `

    <span
        class="rsTinyLoaderDots"
        aria-hidden="true"
    >
        <span></span>
        <span></span>
        <span></span>
    </span>

    <span
        class="rsTinyLoaderText"
    >
        ${this.escape(message)}
    </span>

`;


          document.body.appendChild(
            loader
          );


          this.element =
            loader;


          requestAnimationFrame(
            () => {

              loader.classList.add(
                "rsTinyLoaderVisible"
              );

            }
          );

        },
        this.delay
      );

  },


  hide() {

    this.requestCount =
      Math.max(
        0,
        this.requestCount - 1
      );


    /*
     * Another operation is still loading.
     */

    if (
      this.requestCount > 0
    ) {

      return;

    }


    if (this.timer) {

      clearTimeout(
        this.timer
      );


      this.timer =
        null;

    }


    const loader =
      this.element;


    if (!loader) {

      return;

    }


    loader.classList.remove(
      "rsTinyLoaderVisible"
    );


    setTimeout(
      () => {

        loader.remove();


        if (
          this.element === loader
        ) {

          this.element =
            null;

        }

      },
      140
    );

  },


  escape(
    value
  ) {

    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }

};


/* =========================================================
   SIMPLE GLOBAL HELPERS
   ========================================================= */

function showTinyLoader(
  message = "Loading..."
) {

  RanSanTinyLoader.show(
    message
  );

}


function hideTinyLoader() {

  RanSanTinyLoader.hide();

}

/*
============================================
CUSTOMER DETAIL REQUEST CONTROL
============================================
*/

let customerDetailRequestId = 0;

/*
 * PERFORMANCE:
 * Warm a customer ledger before the actual click.
 * apiGet() deduplicates identical in-flight requests.
 */
function prefetchCustomerTransactions(id) {

  if (!id || !currentBusiness) return;

  apiGet(
    "getCustomerTransactions",
    {
      bid: currentBusiness,
      cid: String(id)
    }
  ).catch(() => {
    /* The normal click path handles real errors. */
  });
}


// ================= CUSTOMERS =================
let currentSort = { field: "balance", order: "desc" };

async function openCustomers(
  options = {}
) {

  const silent =
    options.silent === true;

  document.getElementById("customersSection").classList.remove("hidden");
  document.getElementById("cashbookSection").classList.add("hidden");
  document.getElementById("dashboardSection")?.classList.add("hidden");

  document.getElementById("leftPanel").classList.remove("w-1/2");
  document.getElementById("leftPanel").classList.add("w-1/3");



  /*
 * Show full skeleton only when there is no
 * existing customer data.
 *
 * During refresh, keep current content visible
 * instead of blanking/repainting the entire list.
 */



  if (!currentBusiness) {
    customerList.innerHTML = `<div class="p-3 text-gray-400">No Business Selected</div>`;
    return;
  }

  if (!silent) {

    showTinyLoader(
      "Loading customers..."
    );

  }

  try {

    let res = await apiGet("getCustomersWithBalance", {
      bid: currentBusiness
    });

    if (
      !res ||
      res.error
    ) {

      console.error(
        "[CUSTOMERS] API failure:",
        res
      );


      /*
       * If old data already exists, do not destroy it
       * because of one temporary API failure.
       */

      if (
        Array.isArray(
          customersData
        ) &&
        customersData.length > 0
      ) {

        if (
          typeof showToast ===
          "function"
        ) {

          showToast(
            res?.message ||
            "Unable to refresh customers. Showing existing data.",
            "error"
          );

        }


        return;

      }


      customerList.innerHTML = `

        <div
            class="
                p-4
                m-3
                rounded-xl
                border
                border-red-500/20
                bg-red-500/5
            "
        >

            <div
                class="
                    text-red-400
                    font-medium
                "
            >
                Unable to load customers
            </div>

            <div
                class="
                    text-xs
                    text-gray-400
                    mt-1
                "
            >
                ${res?.message ||
        "Please check your connection and try again."
        }
            </div>

            <button
                type="button"
                onclick="openCustomers()"
                class="
                    mt-3
                    px-3
                    py-2
                    rounded-lg
                    bg-blue-600
                    text-white
                    text-xs
                "
            >
                Retry
            </button>

        </div>

    `;


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

    console.error(
      "[CUSTOMERS]",
      err
    );


    /*
     * Do not erase an already usable list
     * because of one temporary refresh failure.
     */

    if (
      !Array.isArray(
        customersData
      ) ||
      customersData.length === 0
    ) {

      customerList.innerHTML = `

            <div
                class="
                    p-4
                    text-red-400
                "
            >
                Unable to load customers.
            </div>

        `;

    }


    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "Unable to refresh customers",
        "error"
      );

    }

  }

  finally {

    if (!silent) {

      hideTinyLoader();

    }

  }
}

const HIGH_RISK_LIMIT = 5000;

// =========================================================
// CUSTOMER MASTER SELECTION
// =========================================================

function toggleCustomerSelection(id, card = null) {

  id = String(id);

  if (selectedCustomers.has(id)) {
    selectedCustomers.delete(id);
  } else {
    selectedCustomers.add(id);
  }


  const row =
    card ||
    document.querySelector(
      `.customerMasterCard[data-id="${CSS.escape(id)}"]`
    );


  if (row) {

    row.classList.toggle(
      "bg-yellow-900/40",
      selectedCustomers.has(id)
    );
  }


  const checkbox =
    document.querySelector(
      `.customerMasterCheckbox[data-id="${CSS.escape(id)}"]`
    );


  if (checkbox) {
    checkbox.checked =
      selectedCustomers.has(id);
  }


  updateCustomerBulkDeleteBar();
}



// =========================================================
// DESKTOP CUSTOMER CHECKBOX
// =========================================================

function toggleDesktopCustomer(
  checkbox,
  id
) {

  if (window.innerWidth <= 768) {
    return;
  }


  id = String(id);


  if (checkbox.checked) {
    selectedCustomers.add(id);
  } else {
    selectedCustomers.delete(id);
  }


  const card =
    checkbox.closest(
      ".customerMasterCard"
    );


  if (card) {

    card.classList.toggle(
      "bg-yellow-900/40",
      checkbox.checked
    );
  }


  updateCustomerBulkDeleteBar();
}



// =========================================================
// MOBILE LONG PRESS
// =========================================================

function startCustomerMasterLongPress(
  e,
  el
) {

  
  /*
   * Begin the request immediately on touch. A normal tap will
   * reuse this same in-flight request inside selectCustomer().
   */
  prefetchCustomerTransactions(
    el?.dataset?.id
  );

if (window.innerWidth > 768) {
    return;
  }


  cancelCustomerMasterLongPress();


  customerMasterLongPressTimer =
    setTimeout(() => {

      el.dataset.longPressed = "1";

      toggleCustomerSelection(
        el.dataset.id,
        el
      );

    }, 600);
}


function cancelCustomerMasterLongPress() {

  if (customerMasterLongPressTimer) {

    clearTimeout(
      customerMasterLongPressTimer
    );

    customerMasterLongPressTimer = null;
  }
}



// =========================================================
// CUSTOMER CARD CLICK
// =========================================================

function handleCustomerMasterClick(
  event,
  el,
  id,
  name,
  phone
) {

  // Normalize ID
  id = String(id);

  // Ignore checkbox click
  if (
    event.target.closest(".customerMasterCheckboxWrap") ||
    event.target.closest(".customerMasterCheckbox")
  ) {
    return;
  }

  // -----------------------------------------
  // MOBILE LONG PRESS JUST HAPPENED
  // -----------------------------------------
  if (el.dataset.longPressed === "1") {

    // Prevent the click generated after long press
    el.dataset.longPressed = "";

    return;
  }

  // -----------------------------------------
  // MOBILE BULK SELECTION MODE
  // -----------------------------------------
  if (
    window.innerWidth <= 768 &&
    selectedCustomers.size > 0
  ) {

    toggleCustomerSelection(
      id,
      el
    );

    return;
  }

  // -----------------------------------------
  // NORMAL CUSTOMER CLICK
  // -----------------------------------------
  // Opens Customer Transaction section
  selectCustomer(
    id,
    name,
    phone
  );
}



// =========================================================
// CLEAR CUSTOMER SELECTION
// =========================================================

function clearCustomerSelection() {

  selectedCustomers.clear();


  document
    .querySelectorAll(
      ".customerMasterCheckbox"
    )
    .forEach(cb => {
      cb.checked = false;
    });


  document
    .querySelectorAll(
      ".customerMasterCard"
    )
    .forEach(card => {

      card.classList.remove(
        "bg-yellow-900/40"
      );

    });


  updateCustomerBulkDeleteBar();
}



// =========================================================
// SELECT ALL VISIBLE CUSTOMERS
// =========================================================

function selectAllCustomers() {

  if (window.innerWidth <= 768) {
    return;
  }


  document
    .querySelectorAll(
      ".customerMasterCheckbox"
    )
    .forEach(cb => {

      const id =
        String(
          cb.dataset.id || ""
        );


      if (!id) return;


      selectedCustomers.add(id);

      cb.checked = true;


      const card =
        cb.closest(
          ".customerMasterCard"
        );


      if (card) {

        card.classList.add(
          "bg-yellow-900/40"
        );
      }

    });


  updateCustomerBulkDeleteBar();
}



// =========================================================
// CUSTOMER BULK DELETE BAR
// =========================================================

function updateCustomerBulkDeleteBar() {

  let bar =
    document.getElementById(
      "customerBulkDeleteBar"
    );


  if (selectedCustomers.size === 0) {

    if (bar) {
      bar.remove();
    }

    return;
  }


  if (!bar) {

    bar =
      document.createElement(
        "div"
      );


    bar.id =
      "customerBulkDeleteBar";


    bar.className = `
      fixed
      bottom-0
      left-0
      right-0
      bg-red-600
      text-white
      px-4
      py-3
      flex
      items-center
      justify-between
      gap-3
      z-[110]
      shadow-2xl
    `;


    bar.innerHTML = `

      <div class="flex items-center gap-3">

        <strong id="customerBulkDeleteCount">
          ${selectedCustomers.size} selected
        </strong>

        <button
          type="button"
          onclick="clearCustomerSelection()"
          class="
            bg-red-700
            hover:bg-red-800
            px-3
            py-2
            rounded
            text-sm
          "
        >
          Clear
        </button>

        <button
          type="button"
          onclick="selectAllCustomers()"
          class="
            hidden
            md:block
            bg-red-700
            hover:bg-red-800
            px-3
            py-2
            rounded
            text-sm
          "
        >
          Select All
        </button>

      </div>


      <button
        type="button"
        onclick="deleteSelectedCustomers(this)"
        class="
          bg-black
          hover:bg-gray-900
          px-4
          py-2
          rounded
          font-semibold
          whitespace-nowrap
        "
      >
        🗑 Delete Selected
      </button>

    `;


    document.body.appendChild(bar);
  }


  const count =
    bar.querySelector(
      "#customerBulkDeleteCount"
    );


  if (count) {

    count.textContent =
      `${selectedCustomers.size} selected`;
  }
}



// =========================================================
// DELETE SELECTED CUSTOMERS
// =========================================================

async function deleteSelectedCustomers(btn) {

  if (selectedCustomers.size === 0) {
    return;
  }


  const count =
    selectedCustomers.size;


  const confirmed =
    await customConfirm(
      `Delete ${count} customer${count > 1 ? "s" : ""} and all their transactions?`
    );


  if (!confirmed) {
    return;
  }


  setButtonLoading(
    btn,
    "Deleting..."
  );


  try {

    const ids =
      Array.from(
        selectedCustomers
      );


    const res =
      await apiPost({

        action:
          "bulkDeleteCustomers",

        ids:
          ids

      });


    console.log(
      "BULK CUSTOMER DELETE:",
      res
    );


    if (
      !res ||
      res.success !== true
    ) {

      showToast(
        res?.message ||
        "Delete failed ❌",
        "error"
      );

      resetButton(btn);

      return;
    }


    // Remove immediately from local memory
    customersData =
      customersData.filter(
        customer =>
          !ids.includes(
            String(customer.id)
          )
      );


    selectedCustomers.clear();

    updateCustomerBulkDeleteBar();


    // Re-render instantly
    renderCustomerList();


    showSuccess(
      `${count} customer${count > 1 ? "s" : ""} deleted ✅`
    );


    // Silent reconciliation with server
    if (
      typeof clearApiCache ===
      "function"
    ) {
      clearApiCache();
    }


    await openCustomers({
      silent: true
    });


  } catch (err) {

    console.error(
      "BULK CUSTOMER DELETE ERROR:",
      err
    );


    showToast(
      "Delete failed ❌",
      "error"
    );

  }


  resetButton(btn);
}

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
<div
  data-id="${c.id}"

  onmouseenter='prefetchCustomerTransactions(${JSON.stringify(String(c.id))})'

  onclick='handleCustomerMasterClick(
    event,
    this,
    ${JSON.stringify(String(c.id))},
    ${JSON.stringify(c.name || "")},
    ${JSON.stringify(c.phone || "")}
  )'

    ontouchstart="startCustomerMasterLongPress(event, this)"
    ontouchend="cancelCustomerMasterLongPress()"
    ontouchmove="cancelCustomerMasterLongPress()"
    ontouchcancel="cancelCustomerMasterLongPress()"

    class="
      customerMasterCard
      p-3
      border-b
      cursor-pointer
      hover:bg-gray-800
      flex
      justify-between
      items-center
      gap-3
      ${highlight}
      ${riskHighlight}
      ${selectedCustomers.has(String(c.id))
        ? "bg-yellow-900/40"
        : ""}
      active:scale-[0.98]
      transition-all
      duration-300
      ease-in-out
    "
  >


    <!-- DESKTOP CHECKBOX -->

    <div
      class="
        customerMasterCheckboxWrap
        hidden
        md:flex
        items-center
        shrink-0
      "

      onclick="event.stopPropagation()"
    >

      <input
        type="checkbox"

        class="
          customerMasterCheckbox
          w-4
          h-4
          cursor-pointer
          accent-red-600
        "

        data-id="${c.id}"

        ${selectedCustomers.has(String(c.id))
        ? "checked"
        : ""}

        onchange="
          toggleDesktopCustomer(
            this,
            '${c.id}'
          )
        "
      >

    </div>


    <!-- CUSTOMER -->

    <div class="flex-1 min-w-0">

      <div
        class="
          font-medium
          flex
          items-center
          gap-2
          flex-wrap
        "
      >

        ${badge
        ? `<span>${badge}</span>`
        : ""}

        <span>
          ${c.name}
        </span>


        ${isHighRisk
        ? `
            <span
              class="
                text-[10px]
                bg-red-600
                text-white
                px-1.5
                py-0.5
                rounded
              "
            >
              🔥 High Risk
            </span>
          `
        : ""}

      </div>


      <div class="text-xs text-gray-400">

        ${c.phone || ""}

      </div>

    </div>


    <!-- BALANCE -->

    <div class="text-right shrink-0">

      <div
        class="
          ${getBalanceColor(c.balance)}
          font-bold
        "
      >

        ₹${Math.abs(c.balance)}

      </div>


      <div class="text-xs text-gray-400">

        ${isGive
        ? "YOU WILL GET"
        : "YOU WILL GIVE"}

      </div>

    </div>

  </div>
`;
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

      <button onclick="saveCustomer(event)"
        class="w-1/2 bg-blue-600 p-3 rounded">
        Save
      </button>
    </div>

  </div>
  `;

  modal.classList.remove("hidden");
}

async function saveCustomer(event) {

  const btn =
    event?.target ||
    document.querySelector(
      'button[onclick="saveCustomer(event)"]'
    );

  const modalEl =
    document.getElementById("modal") ||
    document.getElementById("businessModal");

  setButtonLoading(btn, "Saving...");

  const name =
    document.getElementById("cname")?.value.trim() || "";

  const phone =
    document.getElementById("cphone")?.value.trim() || "";

  const lang =
    document.getElementById("custLang")?.value || "en";

  if (!name) {
    showToast("Enter customer name ❌", "error");
    resetButton(btn);
    return;
  }

  try {

    const res = await apiPost({
      action: "addCustomer",
      business_id: currentBusiness,
      name: name,
      phone: phone,
      language: lang
    });

    console.log("SAVE RESPONSE:", res);

    /* ===============================================
       DUPLICATE PHONE
       =============================================== */
    if (res?.error === "DUPLICATE_PHONE") {
      showToast(
        "⚠️ Phone already exists in this business",
        "error"
      );
      resetButton(btn);
      return;
    }

    if (!res || res.success !== true) {
      showToast("Failed to add customer ❌", "error");
      resetButton(btn);
      return;
    }

    /* ===============================================
       OPTIONAL WHATSAPP INVITE
       =============================================== */
    if (phone) {
      try {
        sendWhatsAppInviteAPI(name, phone, lang);
      } catch (e) { }
    }

    showToast(
      "Customer added successfully ✅",
      "success"
    );

    /* ===============================================
       AUTO CLOSE MODAL + REFRESH
       =============================================== */
    /*
     * Remove the old artificial 700 ms wait.
     * Close immediately and reconcile the list silently.
     */
    if (modalEl) {
      modalEl.classList.add("hidden");
      modalEl.innerHTML = "";
    }

    openCustomers({
      silent: true
    }).catch(err => {
      console.error(
        "[CUSTOMER REFRESH AFTER ADD]",
        err
      );
    });

  } catch (err) {

    console.error(err);
    showToast("Server error ❌", "error");

  } finally {

    resetButton(btn);

  }
}

// =========================================================
// CUSTOMER TRANSACTION FILTER HELPERS
// =========================================================

function getCustomerTxnDate(value) {

  if (!value) return null;

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d;
}


function isSameCustomerTxnDay(a, b) {

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}


function getCustomerTxnWeekStart(date = new Date()) {

  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  const day = d.getDay();

  // Monday as first day
  const diff = day === 0 ? 6 : day - 1;

  d.setDate(
    d.getDate() - diff
  );

  return d;
}


// =========================================================
// SEARCH
// =========================================================

function searchCustomerTransactions(value) {

  customerTxnSearch =
    String(value || "")
      .trim()
      .toLowerCase();

  applyCustomerTxnFilters();
}


// =========================================================
// PERIOD FILTER
// =========================================================

function setCustomerTxnPeriod(period) {

  customerTxnFilter.period = period;

  updateCustomerTxnFilterUI();

  applyCustomerTxnFilters();
}


// =========================================================
// TYPE FILTER
// =========================================================

function setCustomerTxnType(type) {

  customerTxnFilter.type = type;

  updateCustomerTxnFilterUI();

  applyCustomerTxnFilters();
}


// =========================================================
// CLEAR FILTERS
// =========================================================

function clearCustomerTxnFilters() {

  customerTxnSearch = "";

  customerTxnFilter = {
    period: "all",
    type: "all"
  };

  const search =
    document.getElementById(
      "customerTxnSearch"
    );

  if (search) {
    search.value = "";
  }

  updateCustomerTxnFilterUI();

  applyCustomerTxnFilters();
}


// =========================================================
// FILTER PANEL
// =========================================================

function toggleCustomerTxnMoreFilters() {

  const panel =
    document.getElementById(
      "customerTxnMoreFilters"
    );

  if (!panel) return;

  panel.classList.toggle("hidden");
}


// =========================================================
// ACTIVE BUTTON UI
// =========================================================

function updateCustomerTxnFilterUI() {

  document
    .querySelectorAll(
      ".customerTxnPeriodBtn"
    )
    .forEach(btn => {

      const active =
        btn.dataset.value ===
        customerTxnFilter.period;

      btn.classList.toggle(
        "bg-purple-600",
        active
      );

      btn.classList.toggle(
        "text-white",
        active
      );

      btn.classList.toggle(
        "bg-gray-800",
        !active
      );

      btn.classList.toggle(
        "text-gray-300",
        !active
      );

    });


  document
    .querySelectorAll(
      ".customerTxnTypeBtn"
    )
    .forEach(btn => {

      const active =
        btn.dataset.value ===
        customerTxnFilter.type;

      btn.classList.toggle(
        "bg-purple-600",
        active
      );

      btn.classList.toggle(
        "text-white",
        active
      );

      btn.classList.toggle(
        "bg-gray-800",
        !active
      );

      btn.classList.toggle(
        "text-gray-300",
        !active
      );

    });


  const clearBtn =
    document.getElementById(
      "customerTxnClearBtn"
    );

  if (clearBtn) {

    const hasFilter =
      customerTxnSearch !== "" ||
      customerTxnFilter.period !== "all" ||
      customerTxnFilter.type !== "all";

    clearBtn.classList.toggle(
      "hidden",
      !hasFilter
    );
  }
}

// =========================================================
// APPLY CUSTOMER TRANSACTION FILTERS
// =========================================================

function applyCustomerTxnFilters() {

  let txns =
    Array.isArray(window.currentCustomerTxns)
      ? [...window.currentCustomerTxns]
      : [];

  const now = new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const weekStart =
    getCustomerTxnWeekStart(now);


  txns = txns.filter(t => {

    const txnDate =
      getCustomerTxnDate(t.date);


    // =========================================
    // PERIOD
    // =========================================

    if (
      customerTxnFilter.period !== "all"
    ) {

      if (!txnDate) {
        return false;
      }


      // TODAY

      if (
        customerTxnFilter.period === "today" &&
        !isSameCustomerTxnDay(
          txnDate,
          today
        )
      ) {
        return false;
      }


      // THIS WEEK

      if (
        customerTxnFilter.period === "week"
      ) {

        const check =
          new Date(txnDate);

        check.setHours(
          0,
          0,
          0,
          0
        );

        if (
          check < weekStart ||
          check > now
        ) {
          return false;
        }
      }


      // THIS MONTH

      if (
        customerTxnFilter.period === "month" &&
        (
          txnDate.getMonth() !==
            now.getMonth() ||

          txnDate.getFullYear() !==
            now.getFullYear()
        )
      ) {
        return false;
      }
    }


    // =========================================
    // GAVE / GOT
    // =========================================

    if (
      customerTxnFilter.type !== "all" &&
      String(t.type || "")
        .toLowerCase() !==
        customerTxnFilter.type
    ) {
      return false;
    }


    // =========================================
    // SEARCH
    // =========================================

    if (customerTxnSearch) {

      const note =
        String(t.note || "")
          .toLowerCase();

      const amount =
        String(t.amount || "")
          .toLowerCase();

      const type =
        String(t.type || "")
          .toLowerCase();

      let dateText = "";

      if (txnDate) {

        dateText = [
          t.date || "",

          txnDate.toLocaleDateString(),

          txnDate.toLocaleDateString(
            "en-GB"
          ),

          txnDate.toLocaleDateString(
            "en-IN"
          )
        ]
          .join(" ")
          .toLowerCase();
      }


      const searchable =
        [
          note,
          amount,
          type,
          dateText
        ]
          .join(" ");


      if (
        !searchable.includes(
          customerTxnSearch
        )
      ) {
        return false;
      }
    }


    return true;
  });


  // =========================================
  // LATEST FIRST
  // =========================================

  txns.sort(
    (a, b) =>
      new Date(b.date) -
      new Date(a.date)
  );


  renderFilteredCustomerTransactions(
    txns
  );


  updateCustomerTxnResultCount(
    txns.length,
    window.currentCustomerTxns.length
  );


  updateCustomerTxnFilterUI();
}

function updateCustomerTxnResultCount(
  visible,
  total
) {

  const el =
    document.getElementById(
      "customerTxnResultCount"
    );

  if (!el) return;


  if (visible === total) {

    el.textContent =
      `${total} transaction${
        total === 1 ? "" : "s"
      }`;

  } else {

    el.textContent =
      `Showing ${visible} of ${total}`;

  }
}

// =========================================================
// RENDER FILTERED CUSTOMER TRANSACTIONS
// =========================================================

function renderFilteredCustomerTransactions(
  txns
) {

  const container =
    document.getElementById(
      "customerTxnList"
    );

  if (!container) return;


  if (
    !Array.isArray(txns) ||
    txns.length === 0
  ) {

    container.innerHTML = `

      <div
        class="
          flex
          flex-col
          items-center
          justify-center
          text-center
          py-16
          px-4
        "
      >

        <div
          class="
            w-12
            h-12
            rounded-full
            bg-gray-800
            flex
            items-center
            justify-center
            text-xl
            mb-3
          "
        >
          🔍
        </div>

        <div
          class="
            text-gray-300
            font-medium
          "
        >
          No transactions found
        </div>

        <div
          class="
            text-xs
            text-gray-500
            mt-1
          "
        >
          Try changing your search or filters
        </div>

        <button
          onclick="
            clearCustomerTxnFilters()
          "
          class="
            mt-4
            px-4
            py-2
            rounded-lg
            bg-purple-600
            hover:bg-purple-500
            text-xs
          "
        >
          Clear filters
        </button>

      </div>

    `;

    return;
  }


  let html = "";


  txns.forEach(t => {

    const note =
      escapeHtml(
        t.note || ""
      );

    const amount =
      Number(t.amount || 0);

    const runningBalance =
      Number(
        t.runningBalance || 0
      );


    html += `

<div
  class="
    txnCard-wrapper
    relative
    overflow-hidden
    rounded-xl
    border
    border-gray-800
  "
>

  <!-- ACTION BUTTONS -->

  <div
    class="
      absolute
      right-0
      top-0
      bottom-0
      flex
      z-0
      w-[110px]
    "
  >

    <button
      onclick='editTxn(
        ${JSON.stringify(String(t.id))},
        ${JSON.stringify(t.type || "")},
        ${JSON.stringify(String(t.amount || ""))},
        ${JSON.stringify(t.note || "")},
        ${JSON.stringify(t.date || "")}
      )'

      class="
        w-[55px]
        flex
        items-center
        justify-center
        bg-blue-600
        hover:bg-blue-500
        transition
      "
    >
      ✏️
    </button>


    <button
      onclick="
        deleteTxn(
          '${t.id}',
          this
        )
      "

      class="
        w-[55px]
        flex
        items-center
        justify-center
        bg-red-600
        hover:bg-red-500
        transition
      "
    >
      🗑️
    </button>

  </div>


  <!-- MAIN CARD -->

  <div
    class="
      txnCard
      bg-gray-900
      hover:bg-gray-800
      px-3
      py-3
      flex
      items-center
      justify-between
      relative
      z-10
      transition-all
      duration-200
    "

    data-id="${t.id}" onclick="handleTxnSelectionTap(event, this)"

    ontouchstart="
      startSwipe(event,this);
      startLongPress(event,this)
    "

    ontouchmove="
      moveSwipe(event)
    "

    ontouchend="
      endSwipe();
      cancelLongPress()
    "

    onmousedown="
      startSwipe(event,this)
    "

    onmousemove="
      moveSwipe(event)
    "

    onmouseup="
      endSwipe()
    "
  >


    <!-- DESKTOP CHECKBOX -->

    <div
      class="
        hidden
        md:flex
        items-center
        justify-center
        mr-3
        flex-shrink-0
      "

      onclick="
        event.stopPropagation()
      "

      onmousedown="
        event.stopPropagation()
      "
    >

      <input
        type="checkbox"

        class="
          txnDesktopCheckbox
          w-4
          h-4
          cursor-pointer
          accent-red-600
        "

        data-id="${t.id}"

        ${
          selectedTxns.has(
            String(t.id)
          )
            ? "checked"
            : ""
        }

        onchange="
          toggleDesktopTxn(
            this,
            '${t.id}'
          )
        "
      >

    </div>


    <!-- NOTE + DATE -->

    <div
      class="
        flex
        flex-col
        flex-1
        min-w-0
      "
    >

      <div
        class="
          text-sm
          font-semibold
          truncate
        "
      >

        ${
          note ||
          `<span
             class="
               text-gray-500
               italic
             "
           >
             No note
           </span>`
        }

      </div>


      <div
        class="
          text-xs
          text-gray-500
          mt-1
        "
      >

        ${
          getCustomerTxnDate(t.date)
            ?.toLocaleDateString(
              "en-IN"
            ) || ""
        }

      </div>

    </div>


    <!-- RUNNING BALANCE -->

    <div
      class="
        hidden
        sm:block
        text-xs
        text-gray-500
        text-right
        mx-4
        min-w-[90px]
      "
    >

      <div>
        Balance
      </div>

      <div
        class="
          text-gray-300
          font-medium
        "
      >
        ₹${Math.abs(runningBalance)}
      </div>

    </div>


    <!-- AMOUNT -->

    <div
      class="
        text-right
        shrink-0
        min-w-[90px]
      "
    >

      ${
        t.type === "gave"

          ? `

            <div
              class="
                text-red-400
                font-bold
              "
            >
              - ₹${amount}
            </div>

            <div
              class="
                text-[10px]
                text-red-400/60
                mt-1
              "
            >
              GAVE
            </div>

          `

          : `

            <div
              class="
                text-green-400
                font-bold
              "
            >
              + ₹${amount}
            </div>

            <div
              class="
                text-[10px]
                text-green-400/60
                mt-1
              "
            >
              GOT
            </div>

          `
      }

    </div>

  </div>

</div>

    `;

  });


  container.innerHTML =
    html;
}

// ================= LEDGER =================
// =========================================================
// LEDGER - SELECT CUSTOMER
// =========================================================

async function selectCustomer(
  id,
  name,
  phone = ""
) {

  // =======================================================
  // CLEAR EXISTING TRANSACTION SELECTION
  // =======================================================

  selectedTxns.clear();
  updateMultiDeleteBar();

  selectedCustomer = id;


  // =======================================================
  // PROTECT AGAINST OLD / SLOW API RESPONSES
  // =======================================================

  const thisRequestId =
    ++customerDetailRequestId;


  // =======================================================
  // GET RIGHT PANEL
  // =======================================================

  const rightPanel =
    document.getElementById(
      "rightPanel"
    );

  if (!rightPanel) {
    console.error(
      "rightPanel not found"
    );
    return;
  }


  // =======================================================
  // MOBILE - OPEN DETAIL PANEL
  // =======================================================

  if (
    window.innerWidth <= 768 &&
    typeof window.showDetailPanel ===
      "function"
  ) {

    window.showDetailPanel();

  }


  // =======================================================
  // SMALL LOADER
  // =======================================================

  showTinyLoader(
    "Loading customer..."
  );


  let data;


  // =======================================================
  // LOAD CUSTOMER TRANSACTIONS
  // =======================================================

  try {

    data = await apiGet(
      "getCustomerTransactions",
      {
        bid: currentBusiness,
        cid: id
      }
    );

  } catch (err) {

    console.error(
      "[CUSTOMER DETAIL]",
      err
    );


    if (
      thisRequestId ===
      customerDetailRequestId
    ) {

      if (
        typeof showToast ===
        "function"
      ) {

        showToast(
          "Unable to load customer",
          "error"
        );

      }

    }


    return;

  } finally {

    hideTinyLoader();

  }


  // =======================================================
  // IGNORE OLD RESPONSE
  // =======================================================

  if (
    thisRequestId !==
    customerDetailRequestId
  ) {

    return;

  }


  // =======================================================
  // SAFE TRANSACTION ARRAY
  // =======================================================

  const txns =
    Array.isArray(data?.transactions)
      ? data.transactions
      : [];


  // =======================================================
  // IMPORTANT:
  // STORE A COPY FOR SEARCH / FILTERING
  //
  // DO NOT USE:
  // data.transactions.reverse()
  //
  // reverse() modifies the original array.
  // =======================================================

  window.currentCustomerTxns =
    [...txns];


  // =======================================================
  // RESET FILTERS WHEN CUSTOMER CHANGES
  // =======================================================

  customerTxnSearch = "";

  customerTxnFilter = {
    period: "all",
    type: "all"
  };


  // =======================================================
  // CALCULATE ORIGINAL FULL LEDGER BALANCE
  //
  // IMPORTANT:
  // Balance is calculated from ALL transactions,
  // not filtered transactions.
  // =======================================================

  let give = 0;
  let get = 0;


  txns.forEach(t => {

    const amount =
      Number(t.amount) || 0;


    if (t.type === "gave") {

      give += amount;

    } else if (
      t.type === "got"
    ) {

      get += amount;

    }

  });


  // =======================================================
  // NET BALANCE
  // =======================================================

  const net =
    give - get;


  const netText =
    net >= 0

      ? `
        <span class="text-red-500">
          You Gave ₹${net}
        </span>
      `

      : `
        <span class="text-green-500">
          You Got ₹${Math.abs(net)}
        </span>
      `;


  // =======================================================
  // SAFE VALUES FOR HTML ATTRIBUTES
  // =======================================================

  const safeName =
    typeof escapeHtml === "function"
      ? escapeHtml(name || "")
      : String(name || "");

  const safePhone =
    typeof escapeHtml === "function"
      ? escapeHtml(phone || "")
      : String(phone || "");


  // =======================================================
  // BUILD CUSTOMER DETAIL UI
  // =======================================================

  let html = `

<!-- =====================================================
     CUSTOMER HEADER
===================================================== -->

<div
  class="
    p-4
    border-b
    border-gray-700
    flex
    justify-between
    items-center
    gap-3
    bg-[#0b1220]
  "
>

  <!-- LEFT -->

  <div
    class="
      flex
      items-center
      gap-2
      min-w-0
    "
  >

    <!-- MOBILE BACK -->

    <button
      onclick="mobileBack()"

      class="
        md:hidden
        bg-gray-700
        hover:bg-gray-600
        px-2
        py-1
        rounded
        text-sm
        shrink-0
      "
    >
      ←
    </button>


    <div class="min-w-0">

      <div
        class="
          text-lg
          font-bold
          truncate
        "
      >
        ${safeName}
      </div>

      <div
        class="
          text-sm
          text-gray-400
          truncate
        "
      >
        ${safePhone}
      </div>

    </div>

  </div>


  <!-- RIGHT -->

  <div
    class="
      flex
      gap-2
      shrink-0
    "
  >

    <button
      id="customerReportBtn"

      class="
        border
        border-gray-500
        px-3
        py-1.5
        rounded-lg
        hover:bg-gray-700
        transition
        text-sm
      "
    >
      Report
    </button>


    <button
      id="customerSettingsBtn"

      class="
        border
        border-gray-500
        px-3
        py-1.5
        rounded-lg
        hover:bg-gray-700
        transition
      "
    >
      ⚙️
    </button>

  </div>

</div>


<!-- =====================================================
     SUMMARY
===================================================== -->

<div
  class="
    p-4
    border-b
    border-gray-800
    bg-[#0b1220]
  "
>

  <div
    class="
      text-xs
      text-gray-400
      uppercase
      tracking-wide
    "
  >
    Net Balance
  </div>


  <div
    class="
      text-lg
      font-bold
      mt-1
    "
  >
    ${netText}
  </div>


  <!-- WHATSAPP REMINDER -->

  <div class="mt-3">

    <button
      class="
        w-full
        border
        border-gray-600
        p-2
        rounded-lg
        hover:bg-green-700
        flex
        items-center
        justify-center
        gap-2
        wa-btn
        transition
      "

      data-name="${safeName}"
      data-phone="${safePhone}"
      data-amount="${Math.abs(net)}"
    >

      <span class="wa-text">
        WhatsApp Reminder
      </span>

    </button>

  </div>

</div>


<!-- =====================================================
     TRANSACTION FILTER AREA
===================================================== -->

<div
  class="
    bg-[#0b1220]
    border-b
    border-gray-800
    p-3
  "
>

  <!-- SEARCH + DATE FILTER -->

  <div
    class="
      flex
      flex-col
      lg:flex-row
      gap-2
    "
  >


    <!-- SEARCH -->

    <div
      class="
        relative
        flex-1
      "
    >

      <span
        class="
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-gray-500
          pointer-events-none
        "
      >
        🔍
      </span>


      <input
        id="customerTxnSearch"

        type="search"

        autocomplete="off"

        placeholder="Search note, amount or date..."

        oninput="
          searchCustomerTransactions(
            this.value
          )
        "

        class="
          w-full
          bg-gray-900
          border
          border-gray-700
          focus:border-purple-500
          rounded-xl
          py-2.5
          pl-10
          pr-3
          text-sm
          outline-none
          transition
        "
      >

    </div>


    <!-- QUICK DATE FILTERS -->

    <div
      class="
        flex
        gap-1.5
        overflow-x-auto
        whitespace-nowrap
        pb-1
        lg:pb-0
      "
    >

      <button
        data-value="all"

        onclick="
          setCustomerTxnPeriod(
            'all'
          )
        "

        class="
          customerTxnPeriodBtn
          bg-purple-600
          text-white
          px-3
          py-2
          rounded-lg
          text-xs
          font-medium
          transition
        "
      >
        All
      </button>


      <button
        data-value="today"

        onclick="
          setCustomerTxnPeriod(
            'today'
          )
        "

        class="
          customerTxnPeriodBtn
          bg-gray-800
          text-gray-300
          hover:bg-gray-700
          px-3
          py-2
          rounded-lg
          text-xs
          transition
        "
      >
        Today
      </button>


      <button
        data-value="week"

        onclick="
          setCustomerTxnPeriod(
            'week'
          )
        "

        class="
          customerTxnPeriodBtn
          bg-gray-800
          text-gray-300
          hover:bg-gray-700
          px-3
          py-2
          rounded-lg
          text-xs
          transition
        "
      >
        This Week
      </button>


      <button
        data-value="month"

        onclick="
          setCustomerTxnPeriod(
            'month'
          )
        "

        class="
          customerTxnPeriodBtn
          bg-gray-800
          text-gray-300
          hover:bg-gray-700
          px-3
          py-2
          rounded-lg
          text-xs
          transition
        "
      >
        This Month
      </button>


      <button
        onclick="
          toggleCustomerTxnMoreFilters()
        "

        class="
          bg-gray-800
          hover:bg-gray-700
          text-gray-300
          px-3
          py-2
          rounded-lg
          text-xs
          transition
        "
      >
        ⚙ Filters
      </button>

    </div>

  </div>


  <!-- ===================================================
       MORE FILTERS
  ==================================================== -->

  <div
    id="customerTxnMoreFilters"

    class="
      hidden
      mt-3
      pt-3
      border-t
      border-gray-800
    "
  >

    <div
      class="
        flex
        flex-wrap
        items-center
        gap-2
      "
    >

      <span
        class="
          text-xs
          text-gray-500
          mr-1
        "
      >
        Transaction:
      </span>


      <button
        data-value="all"

        onclick="
          setCustomerTxnType(
            'all'
          )
        "

        class="
          customerTxnTypeBtn
          bg-purple-600
          text-white
          px-3
          py-1.5
          rounded-full
          text-xs
          transition
        "
      >
        All
      </button>


      <button
        data-value="gave"

        onclick="
          setCustomerTxnType(
            'gave'
          )
        "

        class="
          customerTxnTypeBtn
          bg-gray-800
          text-gray-300
          hover:bg-red-900/40
          px-3
          py-1.5
          rounded-full
          text-xs
          transition
        "
      >
        ↓ Gave
      </button>


      <button
        data-value="got"

        onclick="
          setCustomerTxnType(
            'got'
          )
        "

        class="
          customerTxnTypeBtn
          bg-gray-800
          text-gray-300
          hover:bg-green-900/40
          px-3
          py-1.5
          rounded-full
          text-xs
          transition
        "
      >
        ↑ Got
      </button>

    </div>

  </div>


  <!-- RESULT COUNT + CLEAR -->

  <div
    class="
      flex
      items-center
      justify-between
      mt-2
      min-h-[20px]
    "
  >

    <div
      id="customerTxnResultCount"

      class="
        text-[11px]
        text-gray-500
      "
    >
    </div>


    <button
      id="customerTxnClearBtn"

      onclick="
        clearCustomerTxnFilters()
      "

      class="
        hidden
        text-[11px]
        text-purple-400
        hover:text-purple-300
      "
    >
      Clear filters
    </button>

  </div>

</div>


<!-- =====================================================
     TRANSACTION LIST

     IMPORTANT:
     selectCustomer() NO LONGER CREATES EACH CARD HERE.

     renderFilteredCustomerTransactions() will insert
     the cards into this container.
===================================================== -->

<div
  id="customerTxnList"

  class="
    flex-1
    overflow-auto
    p-3
    space-y-2
    pb-28
    bg-gray-950
  "
>
</div>


<!-- =====================================================
     ACTION BUTTONS
===================================================== -->

<div
  class="
    hidden
    md:flex
    gap-4
    p-4
    border-t
    border-gray-700
    sticky
    bottom-0
    bg-[#0b1220]
    z-40
  "
>

  <button
    onclick="
      openTxn('gave')
    "

    class="
      flex-1
      bg-red-200
      text-red-700
      p-3
      rounded-lg
      hover:bg-red-500
      hover:text-white
      transition
    "
  >
    You Gave ₹
  </button>


  <button
    onclick="
      openTxn('got')
    "

    class="
      flex-1
      bg-green-200
      text-green-700
      p-3
      rounded-lg
      hover:bg-green-500
      hover:text-white
      transition
    "
  >
    You Got ₹
  </button>

</div>

`;


  // =======================================================
  // FINAL STALE RESPONSE CHECK
  // =======================================================

  if (
    thisRequestId !==
    customerDetailRequestId
  ) {

    return;

  }


  // =======================================================
  // ONE MAIN DOM UPDATE
  // =======================================================

  rightPanel.innerHTML =
    html;


  // =======================================================
  // REPORT / SETTINGS
  //
  // Event listeners are safer here than putting name
  // directly inside onclick HTML.
  // =======================================================

  const reportBtn =
    document.getElementById(
      "customerReportBtn"
    );

  if (reportBtn) {

    reportBtn.onclick = () => {

      openReportPanel(
        id,
        name
      );

    };

  }


  const settingsBtn =
    document.getElementById(
      "customerSettingsBtn"
    );

  if (settingsBtn) {

    settingsBtn.onclick = () => {

      openCustomerSettings(
        id,
        name
      );

    };

  }


  // =======================================================
  // INITIAL FILTER UI
  // =======================================================

  updateCustomerTxnFilterUI();


  // =======================================================
  // RENDER ALL TRANSACTIONS
  //
  // Initially:
  // period = all
  // type   = all
  // search = empty
  //
  // Therefore all transactions are displayed.
  // =======================================================

  applyCustomerTxnFilters();

}

function escapeCustomerHtml(str = "") {

  return String(str)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#39;"
    );
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

// =========================================================
// SAVE CUSTOMER TRANSACTION
// DUPLICATE-SAFE FRONTEND
// =========================================================

async function saveTxn() {

  const btn =
    event?.target;


  // =======================================================
  // FRONTEND DUPLICATE GUARD
  // =======================================================

  if (
    window.__customerTxnSaving ===
    true
  ) {

    console.warn(
      "Customer transaction already saving"
    );

    return;

  }


  // =======================================================
  // READ FORM
  // =======================================================

  const amount =
    Number(
      document.getElementById(
        "amt"
      )?.value
    );


  const note =
    document
      .getElementById("note")
      ?.value
      ?.trim() || "";


  const date =
    document
      .getElementById(
        "txnDate"
      )
      ?.value || "";


  // =======================================================
  // VALIDATION
  //
  // IMPORTANT:
  // Do validation BEFORE locking the transaction.
  // =======================================================

  if (!amount) {

    alert(
      "Enter amount"
    );

    return;

  }


  if (!selectedCustomer) {

    showToast(
      "Select a customer first ❌",
      "error"
    );

    return;

  }


  // =======================================================
  // ENSURE REQUEST ID EXISTS
  // =======================================================

  if (!customerTxnRequestId) {

    customerTxnRequestId =
      createClientRequestId(
        "customer"
      );

  }


  // =======================================================
  // LOCK SUBMISSION
  // =======================================================

  window.__customerTxnSaving =
    true;


  if (btn) {

    setButtonLoading(
      btn,
      "Saving..."
    );

    btn.disabled = true;

  }


  try {

    // =====================================================
    // SAVE TRANSACTION
    // =====================================================

    const res =
      await apiPost({

        action:
          "addTransaction",

        business_id:
          currentBusiness,

        customer_id:
          selectedCustomer,

        type:
          txnType,

        amount:
          amount,

        note:
          note,

        date:
          date,


        // ===============================================
        // IDEMPOTENCY KEY
        // ===============================================

        client_request_id:
          customerTxnRequestId

      });


    // =====================================================
    // CHECK RESPONSE
    // =====================================================

    if (
      !res ||
      res.success !== true
    ) {

      /*
       * IMPORTANT:
       *
       * Do NOT generate another request ID here.
       *
       * If user retries, the same ID should be used.
       */

      showToast(
        res?.message ||
        "Unable to save transaction ❌",
        "error"
      );

      return;

    }


    // =====================================================
    // SUCCESS
    // =====================================================

    showSuccess(
      "Transaction saved ✅"
    );


    /*
     * Save values needed by the background
     * WhatsApp operation before closing modal.
     */

    const savedCustomerId =
      selectedCustomer;

    const savedTxnType =
      txnType;

    const savedAmount =
      amount;

    const savedNote =
      note;

    const savedDate =
      date;


    // =====================================================
    // TRANSACTION COMPLETED
    //
    // Only NOW discard the request ID.
    // =====================================================

    customerTxnRequestId =
      null;


    // =====================================================
    // WHATSAPP
    // EXISTING BEHAVIOR PRESERVED
    // =====================================================

    setTimeout(
      async () => {

        try {

          const list =
            await apiGet(
              "getCustomersWithBalance",
              {
                bid:
                  currentBusiness,

                env:
                  "test"
              }
            );


          const customer =
            Array.isArray(list)

              ? list.find(
                  c =>
                    String(c.id) ===
                    String(
                      savedCustomerId
                    )
                )

              : null;


          if (customer) {

            await sendTxnWhatsApp(

              customer.name,

              customer.phone,

              savedAmount,

              savedTxnType,

              customer.balance || 0,

              savedNote,

              savedDate

            );

          }

        } catch (err) {

          console.error(
            "WA FETCH ERROR:",
            err
          );

        }

      },
      0
    );


    // =====================================================
    // UI FLOW
    // =====================================================

    modal.classList.add(
      "hidden"
    );


    selectCustomer(
      savedCustomerId,
      ""
    );


    openCustomers({
      silent: true
    });


  } catch (err) {

    console.error(
      "SAVE CUSTOMER TRANSACTION ERROR:",
      err
    );


    /*
     * IMPORTANT:
     *
     * Keep customerTxnRequestId unchanged.
     *
     * We don't know whether the server received
     * the first request.
     *
     * A retry must therefore send THE SAME ID.
     */

    showToast(
      "Unable to confirm save. Please retry. ❌",
      "error"
    );


  } finally {

    // =====================================================
    // RELEASE FRONTEND LOCK
    // =====================================================

    window.__customerTxnSaving =
      false;


    if (btn) {

      resetButton(btn);

      btn.disabled = false;

    }

  }

}

/* =========================================================
   DESKTOP KEYBOARD WORKFLOW
   =========================================================
   Ctrl/Cmd + K  = Customer search
   G             = You Gave
   R             = You Got
   Escape        = Close modal
   Enter         = Save supported modal
   ========================================================= */

(function initDesktopKeyboardWorkflow() {

  // Prevent duplicate listener if script is initialized twice.
  if (window.__desktopKeyboardWorkflowReady) {
    return;
  }

  window.__desktopKeyboardWorkflowReady = true;


  /* =======================================================
     HELPERS
     ======================================================= */

  function isTypingElement(el) {

    if (!el) {
      return false;
    }

    const tag =
      String(el.tagName || "")
        .toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      el.isContentEditable === true
    );
  }


  function isVisible(el) {

    if (!el) {
      return false;
    }

    if (el.classList.contains("hidden")) {
      return false;
    }

    return (
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el.getClientRects().length > 0
    );
  }


  function isCustomerSectionOpen() {

    const section =
      document.getElementById(
        "customersSection"
      );

    return (
      section &&
      !section.classList.contains("hidden")
    );
  }


  function isMainModalOpen() {

    const modal =
      document.getElementById("modal");

    return (
      modal &&
      !modal.classList.contains("hidden")
    );
  }


  function isBusinessModalOpen() {

    const modal =
      document.getElementById(
        "businessModal"
      );

    return (
      modal &&
      !modal.classList.contains("hidden")
    );
  }


  /* =======================================================
     CUSTOMER SEARCH
     Ctrl/Cmd + K
     ======================================================= */

  function focusCustomerSearch() {

    if (!isCustomerSectionOpen()) {
      return;
    }

    const input =
      document.getElementById(
        "searchInput"
      );

    if (!input) {
      return;
    }

    input.focus();

    // Put cursor at end of current search.
    const length =
      input.value.length;

    try {

      input.setSelectionRange(
        length,
        length
      );

    } catch (err) {
      // Some input types do not support selection range.
    }

  }


  /* =======================================================
     CUSTOMER TRANSACTION SHORTCUT
     ======================================================= */

  function openCustomerTxnByKeyboard(type) {

    // Customer screen must be active.
    if (!isCustomerSectionOpen()) {
      return;
    }

    // A customer must already be selected.
    if (!selectedCustomer) {

      if (
        typeof showToast === "function"
      ) {

        showToast(
          "Select a customer first",
          "error"
        );

      }

      return;
    }


    // Do not replace another open modal.
    if (isMainModalOpen()) {
      return;
    }


    if (
      typeof openTxn === "function"
    ) {

      openTxn(type);

      // Give modal time to render,
      // then focus amount field.
      requestAnimationFrame(() => {

        const amount =
          document.getElementById(
            "amt"
          );

        if (amount) {

          amount.focus();

          if (
            typeof amount.select ===
            "function"
          ) {

            amount.select();

          }

        }

      });

    }

  }


  /* =======================================================
     ESCAPE
     ======================================================= */

  function closeActiveModal() {

    // -----------------------------------------------
    // Business modal gets first priority.
    // -----------------------------------------------

    if (isBusinessModalOpen()) {

      if (
        typeof closeBusinessModal ===
        "function"
      ) {

        closeBusinessModal();

      } else {

        const businessModal =
          document.getElementById(
            "businessModal"
          );

        businessModal.classList.add(
          "hidden"
        );

      }

      return true;
    }


    // -----------------------------------------------
    // Main modal
    // -----------------------------------------------

    if (isMainModalOpen()) {

      if (
        typeof closeModal === "function"
      ) {

        closeModal();

      } else {

        const modal =
          document.getElementById(
            "modal"
          );

        modal.classList.add(
          "hidden"
        );

        modal.innerHTML = "";

      }

      return true;
    }


    return false;
  }


  /* =======================================================
     SAFE ENTER SAVE
     ======================================================= */

  function saveActiveModalWithEnter(event) {

    if (!isMainModalOpen()) {
      return false;
    }


    /*
     * Never hijack Enter inside textarea.
     *
     * This preserves normal multi-line notes.
     */
    if (
      event.target?.tagName ===
      "TEXTAREA"
    ) {

      return false;
    }


    /*
     * If a real button currently has focus,
     * allow the browser's normal Enter behavior.
     *
     * This prevents double execution.
     */
    if (
      event.target?.tagName ===
      "BUTTON"
    ) {

      return false;
    }


    const modal =
      document.getElementById(
        "modal"
      );


    /* =====================================================
       CUSTOMER TRANSACTION MODAL
       Detect using #amt + #txnDate
       ===================================================== */

    const txnAmount =
      modal.querySelector("#amt");

    const txnDate =
      modal.querySelector("#txnDate");


    if (
      txnAmount &&
      txnDate
    ) {

      const saveButton =
        [...modal.querySelectorAll("button")]
          .find(btn =>
            (btn.getAttribute("onclick") || "")
              .includes("saveTxn")
          );


      if (
        saveButton &&
        !saveButton.disabled
      ) {

        event.preventDefault();

        saveButton.click();

        return true;
      }

    }


    /* =====================================================
       ADD CUSTOMER MODAL
       Detect using #cname
       ===================================================== */

    const customerName =
      modal.querySelector("#cname");


    if (customerName) {

      const saveButton =
        [...modal.querySelectorAll("button")]
          .find(btn =>
            (btn.getAttribute("onclick") || "")
              .includes("saveCustomer")
          );


      if (
        saveButton &&
        !saveButton.disabled
      ) {

        event.preventDefault();

        saveButton.click();

        return true;
      }

    }


    /*
     * Unknown modal:
     * DO NOTHING.
     *
     * This is intentional.
     * Enter should never accidentally confirm delete,
     * edit, settings, destructive operations, etc.
     */

    return false;
  }


  /* =======================================================
     GLOBAL KEYDOWN
     ======================================================= */

  document.addEventListener(
    "keydown",
    function handleDesktopKeyboard(event) {

      // Ignore already-handled keyboard events.
      if (event.defaultPrevented) {
        return;
      }


      const key =
        String(event.key || "")
          .toLowerCase();


      /* ===================================================
         ESCAPE

         Escape works even when an input is focused.
         =================================================== */

      if (key === "escape") {

        if (closeActiveModal()) {

          event.preventDefault();

        }

        return;
      }


      /* ===================================================
         CTRL/CMD + K
         =================================================== */

      if (
        key === "k" &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey
      ) {

        if (isCustomerSectionOpen()) {

          event.preventDefault();

          focusCustomerSearch();

        }

        return;
      }


      /* ===================================================
         ENTER
         =================================================== */

      if (
        key === "enter" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {

        if (
          saveActiveModalWithEnter(
            event
          )
        ) {

          return;

        }

      }


      /* ===================================================
         DO NOT RUN G/R WHILE TYPING
         =================================================== */

      if (
        isTypingElement(
          event.target
        )
      ) {

        return;
      }


      // Ignore Ctrl / Cmd / Alt combinations.
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {

        return;
      }


      /* ===================================================
         G = YOU GAVE
         =================================================== */

      if (key === "g") {

        if (
          isCustomerSectionOpen() &&
          !isMainModalOpen() &&
          !isBusinessModalOpen()
        ) {

          event.preventDefault();

          openCustomerTxnByKeyboard(
            "gave"
          );

        }

        return;
      }


      /* ===================================================
         R = YOU GOT
         =================================================== */

      if (key === "r") {

        if (
          isCustomerSectionOpen() &&
          !isMainModalOpen() &&
          !isBusinessModalOpen()
        ) {

          event.preventDefault();

          openCustomerTxnByKeyboard(
            "got"
          );

        }

      }

    }
  );

})();

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