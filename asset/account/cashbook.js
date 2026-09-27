
let selectedCashTxns = new Set();
let cashLongPressTimer;

// Account master selection
let selectedCashAccounts = new Set();
let cashAccountLongPressTimer = null;

// =========================================================
// CASHBOOK TRANSACTION FILTER STATE
// =========================================================

let cashTxnSearch = "";

let cashTxnFilter = {
  period: "all",   // all | today | week | month | custom
  mode: "all"      // all | cash | online
};

console.log("✅ cashbook.js loaded");

/*
 * PERFORMANCE:
 * Warm an account ledger before the actual click.
 * apiGet() deduplicates identical in-flight requests.
 */
function prefetchCashbookAccount(accountId) {

  if (!accountId) return;

  apiGet(
    "getCashbookByAccount",
    {
      account_id: String(accountId)
    }
  ).catch(() => {
    /* The normal open path handles real errors. */
  });
}


window.onerror = function (msg) {
  console.error("🔥 GLOBAL ERROR:", msg);
};

/* ================= OPEN CASHBOOK ================= */
function openCashbook() {
  document.getElementById("customersSection").classList.add("hidden");
  document.getElementById("cashbookSection").classList.remove("hidden");
  document.getElementById("dashboardSection")?.classList.add("hidden");
  loadCashbook();
  setFAB("cashbookList");
}

/* ================= LOAD ACCOUNTS ================= */
async function loadCashbook() {

  const list = document.getElementById("cashbookList");

  if (!list) return;

  /*
   * Avoid clearing an already-rendered account list.
   */

  if (
    !Array.isArray(
      window.accountsData
    ) ||
    window.accountsData.length === 0
  ) {

    list.innerHTML = `

        <div
            class="
                p-4
                space-y-3
            "
        >

            <div
                class="
                    h-14
                    rounded-xl
                    bg-gray-800
                    animate-pulse
                "
            ></div>

            <div
                class="
                    h-14
                    rounded-xl
                    bg-gray-800
                    animate-pulse
                "
            ></div>

            <div
                class="
                    h-14
                    rounded-xl
                    bg-gray-800
                    animate-pulse
                "
            ></div>

        </div>

    `;

  }

  try {

    const res = await apiGet("getAccounts", {
      business_id: currentBusiness
    });

    if (
      !res ||
      res.error
    ) {

      console.error(
        "[CASHBOOK] API failure:",
        res
      );


      /*
       * Preserve already-loaded accounts if this was
       * only a temporary refresh failure.
       */

      if (
        Array.isArray(
          window.accountsData
        ) &&
        window.accountsData.length > 0
      ) {

        if (
          typeof showToast ===
          "function"
        ) {

          showToast(
            res?.message ||
            "Unable to refresh accounts. Showing existing data.",
            "error"
          );

        }


        return;

      }


      list.innerHTML = `

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

            <div class="text-red-400 font-medium">
                Unable to load accounts
            </div>

            <div class="text-xs text-gray-400 mt-1">
                ${res?.message ||
        "Please check your connection and try again."
        }
            </div>

            <button
                type="button"
                onclick="loadCashbook()"
                class="
                    mt-3
                    px-3
                    py-2
                    bg-blue-600
                    rounded-lg
                    text-xs
                "
            >
                Retry
            </button>

        </div>

    `;


      return;

    }

    const data = Array.isArray(res) ? res : [];

    if (!data.length) {
      list.innerHTML =
        `<div class="p-3 text-gray-400">No accounts</div>`;
      return;
    }

    // ✅ save globally
    window.accountsData = data;

    renderCashbookList(data);

  } catch (err) {

    console.error(err);

    list.innerHTML =
      `<div class="p-3 text-red-400">Error</div>`;
  }
}

// =========================================================
// CASHBOOK ACCOUNT MASTER SELECTION
// =========================================================

function toggleCashAccountSelection(
  id,
  card = null
) {

  id = String(id);


  if (selectedCashAccounts.has(id)) {

    selectedCashAccounts.delete(id);

  } else {

    selectedCashAccounts.add(id);

  }


  const row =
    card ||
    document.querySelector(
      `.cashAccountCard[data-id="${CSS.escape(id)}"]`
    );


  if (row) {

    row.classList.toggle(
      "bg-yellow-900/40",
      selectedCashAccounts.has(id)
    );
  }


  const checkbox =
    document.querySelector(
      `.cashAccountCheckbox[data-id="${CSS.escape(id)}"]`
    );


  if (checkbox) {

    checkbox.checked =
      selectedCashAccounts.has(id);
  }


  updateCashAccountBulkDeleteBar();
}



// =========================================================
// DESKTOP ACCOUNT CHECKBOX
// =========================================================

function toggleDesktopCashAccount(
  checkbox,
  id
) {

  if (window.innerWidth <= 768) {
    return;
  }


  id = String(id);


  if (checkbox.checked) {

    selectedCashAccounts.add(id);

  } else {

    selectedCashAccounts.delete(id);

  }


  const card =
    checkbox.closest(
      ".cashAccountCard"
    );


  if (card) {

    card.classList.toggle(
      "bg-yellow-900/40",
      checkbox.checked
    );
  }


  updateCashAccountBulkDeleteBar();
}



// =========================================================
// MOBILE ACCOUNT LONG PRESS
// =========================================================

function startCashAccountLongPress(
  e,
  el
) {

  if (window.innerWidth > 768) {
    return;
  }


  cancelCashAccountLongPress();


  cashAccountLongPressTimer =
    setTimeout(() => {

      el.dataset.longPressed = "1";

      toggleCashAccountSelection(
        el.dataset.id,
        el
      );

    }, 600);
}


function cancelCashAccountLongPress() {

  if (cashAccountLongPressTimer) {

    clearTimeout(
      cashAccountLongPressTimer
    );

    cashAccountLongPressTimer = null;
  }
}



// =========================================================
// ACCOUNT CARD CLICK
// =========================================================

function handleCashAccountClick(
  event,
  el,
  id
) {

  if (
    event.target.closest(
      ".cashAccountCheckboxWrap"
    )
  ) {
    return;
  }


  if (el.dataset.longPressed === "1") {

    el.dataset.longPressed = "";

    return;
  }


  if (
    window.innerWidth <= 768 &&
    selectedCashAccounts.size > 0
  ) {

    toggleCashAccountSelection(
      id,
      el
    );

    return;
  }


  // Existing behaviour
  openCashbookReport(id);
}



// =========================================================
// CLEAR ACCOUNT SELECTION
// =========================================================

function clearCashAccountSelection() {

  selectedCashAccounts.clear();


  document
    .querySelectorAll(
      ".cashAccountCheckbox"
    )
    .forEach(cb => {
      cb.checked = false;
    });


  document
    .querySelectorAll(
      ".cashAccountCard"
    )
    .forEach(card => {

      card.classList.remove(
        "bg-yellow-900/40"
      );

    });


  updateCashAccountBulkDeleteBar();
}



// =========================================================
// SELECT ALL VISIBLE ACCOUNTS
// =========================================================

function selectAllCashAccounts() {

  if (window.innerWidth <= 768) {
    return;
  }


  document
    .querySelectorAll(
      ".cashAccountCheckbox"
    )
    .forEach(cb => {

      const id =
        String(
          cb.dataset.id || ""
        );


      if (!id) return;


      selectedCashAccounts.add(id);

      cb.checked = true;


      const card =
        cb.closest(
          ".cashAccountCard"
        );


      if (card) {

        card.classList.add(
          "bg-yellow-900/40"
        );
      }

    });


  updateCashAccountBulkDeleteBar();
}



// =========================================================
// ACCOUNT BULK DELETE BAR
// =========================================================

function updateCashAccountBulkDeleteBar() {

  let bar =
    document.getElementById(
      "cashAccountBulkDeleteBar"
    );


  if (selectedCashAccounts.size === 0) {

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
      "cashAccountBulkDeleteBar";


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

        <strong id="cashAccountBulkDeleteCount">
          ${selectedCashAccounts.size} selected
        </strong>

        <button
          type="button"
          onclick="clearCashAccountSelection()"
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
          onclick="selectAllCashAccounts()"
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
        onclick="deleteSelectedCashAccounts(this)"
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
      "#cashAccountBulkDeleteCount"
    );


  if (count) {

    count.textContent =
      `${selectedCashAccounts.size} selected`;
  }
}



// =========================================================
// DELETE SELECTED ACCOUNTS
// =========================================================

async function deleteSelectedCashAccounts(
  btn
) {

  if (selectedCashAccounts.size === 0) {
    return;
  }


  const count =
    selectedCashAccounts.size;


  const confirmed =
    await customConfirm(
      `Delete ${count} account${count > 1 ? "s" : ""} and all their cashbook entries?`
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
        selectedCashAccounts
      );


    const res =
      await apiPost({

        action:
          "bulkDeleteAccounts",

        ids:
          ids

      });


    console.log(
      "BULK ACCOUNT DELETE:",
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


    // Remove from memory immediately
    window.accountsData =
      (window.accountsData || [])
        .filter(
          account =>
            !ids.includes(
              String(account.id)
            )
        );


    selectedCashAccounts.clear();

    updateCashAccountBulkDeleteBar();


    // Instant repaint
    renderCashbookList(
      window.accountsData
    );


    showSuccess(
      `${count} account${count > 1 ? "s" : ""} deleted ✅`
    );


    if (
      typeof clearApiCache ===
      "function"
    ) {
      clearApiCache();
    }


    // Server reconciliation
    await loadCashbook();


  } catch (err) {

    console.error(
      "BULK ACCOUNT DELETE ERROR:",
      err
    );


    showToast(
      "Delete failed ❌",
      "error"
    );

  }


  resetButton(btn);
}

/* ================= ACCOUNT LIST ================= */
function renderCashbookList(data = []) {

  const container =
    document.getElementById(
      "cashbookList"
    );


  if (!container) return;


  let html =
    `<div class="space-y-2 p-3">`;


  data.forEach(t => {

    const id =
      String(t.id);


    const selected =
      selectedCashAccounts.has(id);


    html += `

<div class="relative overflow-hidden rounded-lg">


  <!-- EXISTING ACTION BUTTONS -->

  <div
    class="
      absolute
      right-0
      top-0
      h-full
      flex
      z-20
      w-[140px]
    "
  >

    <button
      onclick="
        event.stopPropagation();
        editAccount('${t.id}')
      "
      class="
        w-[70px]
        bg-yellow-600
        flex
        items-center
        justify-center
        text-white
      "
    >
      ✏️
    </button>


    <button
      onclick="
        event.stopPropagation();
        confirmDeleteAccount(
          '${t.id}',
          '${escapeHtml(t.name)}'
        )
      "
      class="
        w-[70px]
        bg-red-600
        flex
        items-center
        justify-center
        text-white
      "
    >
      🗑
    </button>

  </div>


  <!-- ACCOUNT CARD -->

  <div
    data-id="${t.id}"

    onmouseenter="prefetchCashbookAccount(\'${t.id}\')"

    onclick="
      handleCashAccountClick(
        event,
        this,
        '${t.id}'
      )
    "

    ontouchstart="
      prefetchCashbookAccount('${t.id}');
      startCashAccountLongPress(
        event,
        this
      )
    "

    ontouchend="
      cancelCashAccountLongPress()
    "

    ontouchmove="
      cancelCashAccountLongPress()
    "

    ontouchcancel="
      cancelCashAccountLongPress()
    "

    class="
      cashAccountCard
      txnCard
      bg-gray-900
      p-3
      relative
      z-10
      cursor-pointer
      ${selected
        ? "bg-yellow-900/40"
        : ""}
    "
  >


    <div class="flex items-center gap-3">


      <!-- DESKTOP CHECKBOX -->

      <div
        class="
          cashAccountCheckboxWrap
          hidden
          md:flex
          items-center
          shrink-0
        "

        onclick="
          event.stopPropagation()
        "
      >

        <input
          type="checkbox"

          class="
            cashAccountCheckbox
            w-4
            h-4
            cursor-pointer
            accent-red-600
          "

          data-id="${t.id}"

          ${selected
        ? "checked"
        : ""}

          onchange="
            toggleDesktopCashAccount(
              this,
              '${t.id}'
            )
          "
        >

      </div>


      <!-- ACCOUNT DETAILS -->

      <div class="flex-1 min-w-0">

        <div class="font-semibold">

          ${highlightText(
          t.name,
          window.searchQuery
        )}

        </div>


        <div
          class="
            flex
            justify-between
            mt-2
            text-sm
          "
        >

          <span class="text-gray-400">
            Balance
          </span>


          <span
            class="${Number(t.balance) >= 0
        ? "text-green-400"
        : "text-red-400"
      }"
          >

            ₹${Number(t.balance || 0)}

          </span>

        </div>

      </div>

    </div>

  </div>

</div>

`;

  });


  html += `</div>`;


  container.innerHTML =
    html;
}

// =========================================================
// REUSABLE CASHBOOK FILTER HTML
// =========================================================

function getCashbookFilterHTML() {

  return `

    <div
      class="
        bg-[#0b1220]
        border-b
        border-gray-800
        p-3
      "
    >

      <!-- SEARCH -->

      <div
        class="
          flex
          flex-col
          xl:flex-row
          gap-2
        "
      >

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
            "
          >
            🔍
          </span>

          <input
            id="cashTxnSearch"
            type="search"
            placeholder="Search note, amount or date..."

            oninput="
              searchCashTransactions(
                this.value
              )
            "

            class="
              w-full
              bg-gray-900
              border
              border-gray-700
              rounded-xl
              py-2.5
              pl-10
              pr-3
              text-sm
              outline-none
              focus:border-blue-500
            "
          >

        </div>


        <div
          class="
            flex
            gap-1.5
            overflow-x-auto
            whitespace-nowrap
          "
        >

          ${[
      ["all", "All"],
      ["today", "Today"],
      ["week", "This Week"],
      ["month", "This Month"],
      ["custom", "📅 Custom"]
    ]
      .map(
        ([value, label]) => `

                <button
                  data-value="${value}"

                  onclick="
                    setCashTxnPeriod(
                      '${value}'
                    )
                  "

                  class="
                    cashTxnPeriodBtn
                    ${value === "all"
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-300"
          }
                    hover:bg-gray-700
                    px-3
                    py-2
                    rounded-lg
                    text-xs
                    transition
                  "
                >
                  ${label}
                </button>

              `
      )
      .join("")}

        </div>

      </div>


      <!-- MODE -->

      <div
        class="
          flex
          flex-wrap
          justify-between
          items-center
          gap-2
          mt-3
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
            "
          >
            Payment:
          </span>


          <button
            data-value="all"
            onclick="setCashTxnMode('all')"

            class="
              cashTxnModeBtn
              bg-blue-600
              text-white
              px-3
              py-1.5
              rounded-full
              text-xs
            "
          >
            All
          </button>


          <button
            data-value="cash"
            onclick="setCashTxnMode('cash')"

            class="
              cashTxnModeBtn
              bg-gray-800
              text-gray-300
              px-3
              py-1.5
              rounded-full
              text-xs
            "
          >
            💵 Cash
          </button>


          <button
            data-value="online"
            onclick="setCashTxnMode('online')"

            class="
              cashTxnModeBtn
              bg-gray-800
              text-gray-300
              px-3
              py-1.5
              rounded-full
              text-xs
            "
          >
            📱 Online
          </button>


          <button
            onclick="exportExcel()"

            class="
              bg-green-600
              hover:bg-green-500
              px-3
              py-1.5
              rounded-lg
              text-xs
            "
          >
            ↓ Export
          </button>

        </div>


        <div
          class="
            flex
            items-center
            gap-3
          "
        >

          <span
            id="cashTxnFilterCount"
            class="
              text-[11px]
              text-gray-500
            "
          >
          </span>


          <button
            id="cashTxnClearBtn"
            onclick="clearCashTxnFilters()"

            class="
              hidden
              text-[11px]
              text-blue-400
            "
          >
            Clear filters
          </button>

        </div>

      </div>


      <!-- CUSTOM -->

      <div
        id="cashCustomDateBox"

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
            items-end
            gap-3
          "
        >

          <div>

            <div
              class="
                text-[10px]
                text-gray-500
                mb-1
              "
            >
              From Date
            </div>

            <input
              type="date"
              id="fromDate"

              onchange="
                applyCashCustomDateFilter()
              "

              class="
                bg-gray-900
                border
                border-gray-700
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >

          </div>


          <div>

            <div
              class="
                text-[10px]
                text-gray-500
                mb-1
              "
            >
              To Date
            </div>

            <input
              type="date"
              id="toDate"

              onchange="
                applyCashCustomDateFilter()
              "

              class="
                bg-gray-900
                border
                border-gray-700
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >

          </div>

        </div>

      </div>

    </div>

  `;

}


function editAccount(id) {

  const row =
    (window.accountsData || []).find(
      x => String(x.id) === String(id)
    );

  if (!row) {
    alert("Account not found");
    return;
  }

  openAddAccount(row);
}



/* =========================================================
   ESCAPE HTML
   ========================================================= */
function escapeHtml(str = "") {

  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}





/* =========================================================
   EDIT CASHBOOK TRANSACTION
   ========================================================= */

function editCashTxn(id) {

  // =======================================================
  // FIND TRANSACTION FROM CURRENT LOCAL LEDGER
  // =======================================================

  const txn =
    (window.currentTxns || [])
      .find(
        t =>
          String(t.id) ===
          String(id)
      );


  if (!txn) {

    showToast(
      "Transaction not found ❌",
      "error"
    );

    return;

  }


  // =======================================================
  // MODAL
  // =======================================================

  const modal =
    document.getElementById(
      "modal"
    );


  if (!modal) {

    console.error(
      "Edit transaction modal not found"
    );

    return;

  }


  // =======================================================
  // NORMALIZE VALUES
  // =======================================================

  const currentAmount =
    Number(txn.amount) || 0;


  /*
   * Positive = Cash In
   * Negative = Cash Out
   */

  const currentType =
    currentAmount >= 0
      ? "in"
      : "out";


  const absoluteAmount =
    Math.abs(
      currentAmount
    );


  const currentMode =
    String(
      txn.mode || "cash"
    )
      .toLowerCase();


  // =======================================================
  // SAFE DATE
  // =======================================================

  let editDate = "";


  if (txn.date) {

    const rawDate =
      String(txn.date);


    /*
     * If API already gives YYYY-MM-DD,
     * use it directly.
     */

    const match =
      rawDate.match(
        /^(\d{4}-\d{2}-\d{2})/
      );


    if (match) {

      editDate =
        match[1];

    } else {

      const parsed =
        new Date(rawDate);


      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {

        const year =
          parsed.getFullYear();


        const month =
          String(
            parsed.getMonth() + 1
          )
            .padStart(
              2,
              "0"
            );


        const day =
          String(
            parsed.getDate()
          )
            .padStart(
              2,
              "0"
            );


        editDate =
          `${year}-${month}-${day}`;

      }

    }

  }


  // =======================================================
  // BUILD MODAL
  // =======================================================

  modal.innerHTML = `

    <div
      class="
        bg-gray-900
        p-5
        rounded-2xl
        w-[95%]
        max-w-sm
        border
        border-gray-700
        shadow-2xl
      "
    >

      <!-- TITLE -->

      <div
        class="
          flex
          items-center
          justify-between
          mb-4
        "
      >

        <div>

          <h3
            class="
              text-lg
              font-bold
              text-white
            "
          >
            ✏️ Edit Transaction
          </h3>

          <div
            class="
              text-xs
              text-gray-400
              mt-1
            "
          >
            Changes update the ledger immediately
          </div>

        </div>


        <button
          type="button"
          onclick="closeModal()"
          class="
            w-8
            h-8
            rounded-lg
            bg-gray-800
            hover:bg-gray-700
            text-gray-300
          "
        >
          ✕
        </button>

      </div>


      <!-- TYPE -->

      <label
        class="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Transaction Type
      </label>


      <select
        id="eType"
        class="
          w-full
          p-3
          mb-3
          bg-black
          text-white
          border
          border-gray-700
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >

        <option
          value="in"
          ${currentType === "in"
            ? "selected"
            : ""}
        >
          Cash In
        </option>

        <option
          value="out"
          ${currentType === "out"
            ? "selected"
            : ""}
        >
          Cash Out
        </option>

      </select>


      <!-- AMOUNT -->

      <label
        class="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Amount
      </label>


      <input
        id="eAmt"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        value="${absoluteAmount}"
        class="
          w-full
          p-3
          mb-3
          bg-black
          text-white
          border
          border-gray-700
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >


      <!-- DESCRIPTION -->

      <label
        class="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Description
      </label>


      <input
        id="eNote"
        type="text"
        value="${escapeHtml(
          txn.note || ""
        )}"
        placeholder="Description"
        class="
          w-full
          p-3
          mb-3
          bg-black
          text-white
          border
          border-gray-700
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >


      <!-- PAYMENT MODE -->

      <label
        class="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Payment Mode
      </label>


      <select
        id="eMode"
        class="
          w-full
          p-3
          mb-3
          bg-black
          text-white
          border
          border-gray-700
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >

        <option
          value="cash"
          ${currentMode === "cash"
            ? "selected"
            : ""}
        >
          Cash
        </option>

        <option
          value="online"
          ${currentMode === "online"
            ? "selected"
            : ""}
        >
          Online
        </option>

      </select>


      <!-- DATE -->

      <label
        class="
          block
          text-xs
          text-gray-400
          mb-1
        "
      >
        Date
      </label>


      <input
        id="eDate"
        type="date"
        value="${editDate}"
        class="
          w-full
          p-3
          mb-5
          bg-black
          text-white
          border
          border-gray-700
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >


      <!-- BUTTONS -->

      <div
        class="
          flex
          gap-2
        "
      >

        <button
          type="button"
          onclick="closeModal()"
          class="
            flex-1
            bg-gray-700
            hover:bg-gray-600
            p-3
            rounded-xl
            text-white
          "
        >
          Cancel
        </button>


        <button
          type="button"
          onclick="updateCashTxn('${id}', this)"
          class="
            flex-1
            bg-blue-600
            hover:bg-blue-700
            p-3
            rounded-xl
            text-white
            font-semibold
          "
        >
          Update
        </button>

      </div>

    </div>

  `;


  modal.classList.remove(
    "hidden"
  );


  // =======================================================
  // AUTOFOCUS AMOUNT
  // =======================================================

  requestAnimationFrame(
    () => {

      const amountInput =
        document.getElementById(
          "eAmt"
        );


      if (amountInput) {

        amountInput.focus();

        amountInput.select();

      }

    }
  );

}

/* =========================================================
   UPDATE CASHBOOK TRANSACTION
   ========================================================= */

async function updateCashTxn(
  id,
  btn
) {

  // =======================================================
  // PREVENT DOUBLE UPDATE
  // =======================================================

  if (
    btn?.disabled
  ) {
    return;
  }


  // =======================================================
  // READ FORM
  // =======================================================

  const type =
    document
      .getElementById("eType")
      ?.value || "in";


  const amountValue =
    Number(
      document
        .getElementById("eAmt")
        ?.value
    );


  const note =
    document
      .getElementById("eNote")
      ?.value
      ?.trim() || "";


  const mode =
    document
      .getElementById("eMode")
      ?.value || "cash";


  const date =
    document
      .getElementById("eDate")
      ?.value || "";


  // =======================================================
  // VALIDATION
  // =======================================================

  if (
    !Number.isFinite(
      amountValue
    ) ||
    amountValue <= 0
  ) {

    showToast(
      "Enter a valid amount ❌",
      "error"
    );

    document
      .getElementById("eAmt")
      ?.focus();

    return;

  }


  if (!date) {

    showToast(
      "Select transaction date ❌",
      "error"
    );

    return;

  }


  if (
    mode !== "cash" &&
    mode !== "online"
  ) {

    showToast(
      "Invalid payment mode ❌",
      "error"
    );

    return;

  }


  // =======================================================
  // SIGNED AMOUNT
  //
  // Cash In  = positive
  // Cash Out = negative
  // =======================================================

  const signedAmount =
    type === "out"

      ? -Math.abs(
          amountValue
        )

      : Math.abs(
          amountValue
        );


  // =======================================================
  // FIND LOCAL TRANSACTION
  // =======================================================

  const txn =
    (window.currentTxns || [])
      .find(
        t =>
          String(t.id) ===
          String(id)
      );


  if (!txn) {

    showToast(
      "Transaction not found ❌",
      "error"
    );

    return;

  }


  // =======================================================
  // BUTTON LOADING
  // =======================================================

  if (btn) {

    setButtonLoading(
      btn,
      "Updating..."
    );

    btn.disabled =
      true;

  }


  try {

    // =====================================================
    // SERVER UPDATE
    // =====================================================

    const res =
      await apiPost({

        action:
          "updateCashEntry",

        id:
          id,

        amount:
          signedAmount,

        note:
          note,

        date:
          date,

        mode:
          mode,

        type:
          type

      });


    if (
      !res ||
      res.success !== true
    ) {

      showToast(
        res?.message ||
        "Update failed ❌",
        "error"
      );

      return;

    }


    // =====================================================
    // UPDATE LOCAL MEMORY IMMEDIATELY
    // =====================================================

    txn.amount =
      signedAmount;

    txn.note =
      note;

    txn.date =
      date;

    txn.mode =
      mode;

    txn.type =
      type;


    // =====================================================
    // CLOSE MODAL
    // =====================================================

    const modal =
      document.getElementById(
        "modal"
      );


    if (modal) {

      modal.classList.add(
        "hidden"
      );

    }


    // =====================================================
    // IMMEDIATE TRANSACTION RE-RENDER
    //
    // This preserves:
    // search
    // period filter
    // payment filter
    // =====================================================

    applyFilter();


    // =====================================================
    // IMMEDIATE ACCOUNT BALANCE UPDATE
    // =====================================================

    refreshAccountBalanceInstant();


    // =====================================================
    // SUCCESS
    // =====================================================

    showSuccess(
      "Transaction updated ✅"
    );


  } catch (err) {

    console.error(
      "UPDATE CASH TRANSACTION ERROR:",
      err
    );


    showToast(
      "Unable to update transaction ❌",
      "error"
    );


  } finally {

    if (btn) {

      resetButton(btn);

      btn.disabled =
        false;

    }

  }

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

function toggleCashTxnSelection(id, el = null) {

  id = String(id);

  if (selectedCashTxns.has(id)) {

    selectedCashTxns.delete(id);

  } else {

    selectedCashTxns.add(id);

  }


  // ==========================================
  // UPDATE CARD
  // ==========================================

  const card =
    el?.closest?.(".txnCard") ||
    document.querySelector(
      `.txnCard[data-id="${CSS.escape(id)}"]`
    );


  if (card) {

    card.classList.toggle(
      "bg-yellow-900",
      selectedCashTxns.has(id)
    );

  }


  // ==========================================
  // SYNC DESKTOP CHECKBOX
  // ==========================================

  const checkbox =
    document.querySelector(
      `.cashDesktopCheckbox[data-id="${CSS.escape(id)}"]`
    );


  if (checkbox) {

    checkbox.checked =
      selectedCashTxns.has(id);

  }


  updateCashMultiDeleteBar();

}



/* =========================================================
   MOBILE LONG PRESS
   ========================================================= */

/* =========================================================
   CASHBOOK MOBILE LONG PRESS
   ========================================================= */

function startCashLongPress(
    e,
    el
) {

    /*
     * Desktop uses checkbox.
     */
    if (
        window.innerWidth > 768
    ) {

        return;

    }


    const target =
        e?.target;


    /*
     * Don't start selection while pressing an action control.
     */
    if (
        target &&
        typeof target.closest ===
            "function" &&
        target.closest(
            [
                "button",
                "a",
                "input",
                "select",
                "textarea",
                "[data-no-long-press]"
            ].join(",")
        )
    ) {

        return;

    }


    cancelCashLongPress();


    const touch =
        e?.touches?.[0];


    const startX =
        touch?.clientX ?? 0;


    const startY =
        touch?.clientY ?? 0;


    /*
     * Save touch origin on the card.
     */
    el.dataset.longPressX =
        String(startX);

    el.dataset.longPressY =
        String(startY);

    el.dataset.longPressMoved =
        "0";


    cashLongPressTimer =
        setTimeout(
            () => {

                if (
                    el.dataset.longPressMoved ===
                    "1"
                ) {

                    return;

                }


                const id =
                    el?.dataset?.id;


                if (!id) {

                    return;

                }


                try {

                    navigator.vibrate?.(
                        35
                    );

                }
                catch (_) {}


                toggleCashTxnSelection(
                    id,
                    el
                );


                cashLongPressTimer =
                    null;

            },
            550
        );

}



function cancelCashLongPress() {

  if (cashLongPressTimer) {

    clearTimeout(
      cashLongPressTimer
    );

    cashLongPressTimer = null;

  }

}

/* =========================================================
   CANCEL CASHBOOK LONG PRESS WHEN FINGER MOVES
   ========================================================= */

function moveCashLongPress(
    e,
    el
) {

    if (
        window.innerWidth > 768
    ) {

        return;

    }


    const touch =
        e?.touches?.[0];


    if (!touch) {

        return;

    }


    const startX =
        Number(
            el.dataset.longPressX ||
            0
        );


    const startY =
        Number(
            el.dataset.longPressY ||
            0
        );


    const diffX =
        Math.abs(
            touch.clientX -
            startX
        );


    const diffY =
        Math.abs(
            touch.clientY -
            startY
        );


    /*
     * User is scrolling/swiping.
     */
    if (
        diffX > 12 ||
        diffY > 12
    ) {

        el.dataset.longPressMoved =
            "1";


        cancelCashLongPress();

    }

}

/* =========================================================
   CASHBOOK TAP DURING SELECTION MODE
   ========================================================= */

function handleCashTxnSelectionTap(
    e,
    el
) {

    if (
        window.innerWidth > 768
    ) {

        return false;

    }


    if (
        typeof selectedCashTxns ===
            "undefined" ||
        selectedCashTxns.size === 0
    ) {

        return false;

    }


    if (
        e?.target?.closest?.(
            [
                "button",
                "a",
                "input",
                "select",
                "textarea"
            ].join(",")
        )
    ) {

        return false;

    }


    const id =
        el?.dataset?.id;


    if (!id) {

        return false;

    }


    e?.preventDefault?.();

    e?.stopPropagation?.();


    toggleCashTxnSelection(
        id,
        el
    );


    return true;

}


/* =========================================================
   DESKTOP CHECKBOX
   ========================================================= */

function toggleDesktopCashTxn(
  checkbox,
  id
) {

  if (window.innerWidth <= 768) {
    return;
  }


  id = String(id);


  if (checkbox.checked) {

    selectedCashTxns.add(id);

  } else {

    selectedCashTxns.delete(id);

  }


  const card =
    checkbox.closest(
      ".txnCard"
    );


  if (card) {

    card.classList.toggle(
      "bg-yellow-900",
      checkbox.checked
    );

  }


  updateCashMultiDeleteBar();

}



/* =========================================================
   CLEAR SELECTION
   ========================================================= */

function clearCashTxnSelection() {

  selectedCashTxns.clear();


  document
    .querySelectorAll(
      ".cashDesktopCheckbox"
    )
    .forEach(cb => {

      cb.checked = false;

    });


  document
    .querySelectorAll(
      "#txnList .txnCard"
    )
    .forEach(card => {

      card.classList.remove(
        "bg-yellow-900"
      );

    });


  updateCashMultiDeleteBar();

}



/* =========================================================
   SELECT ALL VISIBLE CASHBOOK TRANSACTIONS
   ========================================================= */

function selectAllCashTxns() {

  if (window.innerWidth <= 768) {
    return;
  }


  const checkboxes =
    document.querySelectorAll(
      "#txnList .cashDesktopCheckbox"
    );


  checkboxes.forEach(cb => {

    const id =
      String(
        cb.dataset.id || ""
      );


    if (!id) {
      return;
    }


    selectedCashTxns.add(id);

    cb.checked = true;


    const card =
      cb.closest(
        ".txnCard"
      );


    if (card) {

      card.classList.add(
        "bg-yellow-900"
      );

    }

  });


  updateCashMultiDeleteBar();

}



/* =========================================================
   CASHBOOK MULTI DELETE BAR
   ========================================================= */

function updateCashMultiDeleteBar() {

    // ==========================================
  // MOBILE FAB VISIBILITY
  // ==========================================

  function syncCashSelectionFAB() {

    if (window.innerWidth > 768) {
      return;
    }

    document
      .querySelectorAll(".mobile-fab")
      .forEach(fab => {

        if (selectedCashTxns.size > 0) {

          fab.classList.add(
            "fab-hidden-by-selection"
          );

        } else {

          fab.classList.remove(
            "fab-hidden-by-selection"
          );

        }

      });

  }

  let bar =
    document.getElementById(
      "cashMultiDeleteBar"
    );


  // ==========================================
  // NOTHING SELECTED
  // ==========================================

  if (
    selectedCashTxns.size === 0
  ) {

    if (bar) {
      bar.remove();
    }

    // Restore In / Out FAB
    syncCashSelectionFAB();

    return;

  }

  syncCashSelectionFAB();


  // ==========================================
  // CREATE BAR
  // ==========================================

  if (!bar) {

    bar =
      document.createElement(
        "div"
      );


    bar.id =
      "cashMultiDeleteBar";


    bar.className = `
      fixed
      left-2
      right-2
      bottom-[calc(env(safe-area-inset-bottom)+72px)]
      md:bottom-0
      md:left-0
      md:right-0
      bg-red-600
      text-white
      px-3
      py-3
      rounded-xl
      md:rounded-none
      flex
      items-center
      justify-between
      gap-3
      z-[100]
      shadow-2xl
    `;


    bar.innerHTML = `

      <div
        class="
          flex
          items-center
          gap-3
        "
      >

        <strong
          id="cashMultiDeleteCount"
        >
          ${selectedCashTxns.size} selected
        </strong>


        <button
          type="button"
          onclick="clearCashTxnSelection()"
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
          onclick="selectAllCashTxns()"
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
        onclick="deleteSelectedCash(this)"
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


    document.body.appendChild(
      bar
    );

  }


  // ==========================================
  // UPDATE COUNT
  // ==========================================

  const count =
    bar.querySelector(
      "#cashMultiDeleteCount"
    );


  if (count) {

    count.textContent =
      `${selectedCashTxns.size} selected`;

  }

}


/* ================= OPEN ACCOUNT ================= */
async function openCashbookReport(acc) {

  selectedCashTxns.clear();
  updateCashMultiDeleteBar();

  const panel =
    document.getElementById("rightPanel");


  if (!panel) {
    console.error(
      "❌ rightPanel not found"
    );
    return;
  }


  panel.innerHTML =
    `<div class="p-4">Loading...</div>`;


  try {

    // ==========================================
    // NORMALIZE ACCOUNT
    //
    // Supports BOTH:
    //
    // openCashbookReport("ACC001")
    //
    // and
    //
    // openCashbookReport({
    //   id: "ACC001",
    //   name: "Bank"
    // })
    // ==========================================

    let account = null;


    if (
      acc &&
      typeof acc === "object"
    ) {

      account = acc;

    } else {

      account =
        (window.accountsData || [])
          .find(item =>
            String(item.id) ===
            String(acc)
          );

    }


    // ==========================================
    // VALIDATE ACCOUNT
    // ==========================================

    if (
      !account ||
      !account.id
    ) {

      console.error(
        "❌ Account not found:",
        acc
      );


      panel.innerHTML = `
        <div class="p-4 text-red-400">
          Account not found
        </div>
      `;


      return;

    }


    // ==========================================
    // GUARANTEED ACCOUNT ID
    // ==========================================

    const accountId =
      String(account.id);


    console.log(
      "📘 OPEN CASHBOOK ACCOUNT:",
      {
        id: accountId,
        name: account.name
      }
    );


    // ==========================================
    // LOAD ACCOUNT TRANSACTIONS
    // ==========================================

    const res =
      await apiGet(
        "getCashbookByAccount",
        {
          account_id: accountId
        }
      );


    if (
      !res ||
      res.error
    ) {

      console.error(
        "❌ Cashbook API Error:",
        res
      );


      panel.innerHTML = `
        <div class="p-4 text-red-400">
          API Error
        </div>
      `;


      return;

    }


    // ==========================================
    // NORMALIZE TRANSACTIONS
    // ==========================================

    const data =
      Array.isArray(res)
        ? res
        : [];


    const txns =
      data.map(row => {


        // ======================================
        // ARRAY RESPONSE
        // ======================================

        if (Array.isArray(row)) {

          return {

            id:
              row[0],

            account_id:
              row[2] || accountId,

            amount:
              Number(row[3]),

            note:
              row[4],

            mode:
              row[5],

            date:
              row[6],

            type:
              Number(row[3]) > 0
                ? "in"
                : "out"

          };

        }


        // ======================================
        // OBJECT RESPONSE
        // ======================================

        return {

          id:
            row.id ||
            row[0],

          account_id:
            row.account_id ||
            row.accountId ||
            accountId,

          amount:
            Number(
              row.amount
            ),

          note:
            row.note,

          mode:
            row.mode,

          date:
            row.date,

          type:
            Number(row.amount) > 0
              ? "in"
              : "out"

        };

      });


    // ==========================================
    // IMPORTANT
    //
    // Pass the REAL ACCOUNT OBJECT.
    // Never pass the ID string here.
    // ==========================================

    renderCashbookReport(
      account,
      txns
    );


  }

  catch (err) {

    console.error(
      "❌ openCashbookReport Error:",
      err
    );


    panel.innerHTML = `
      <div class="p-4 text-red-400">
        Error
      </div>
    `;

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
<!-- HEADER -->
<div class="p-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-20">

  <div
    class="
      flex
      items-center
      justify-between
      gap-3
    "
  >

    <div
      class="
        flex
        items-center
        gap-2
        min-w-0
      "
    >

      <button
        onclick="mobileBack()"
        class="
          md:hidden
          bg-gray-700
          px-2
          py-1
          rounded
          text-sm
        "
      >
        ←
      </button>


      <div
        class="
          text-lg
          font-bold
          truncate
        "
      >
        ${escapeHtml(acc.name)}
      </div>

    </div>


    <button
      type="button"
      onclick="openCashbookStatement()"
      class="
        border
        border-gray-600
        hover:bg-gray-700
        px-3
        py-2
        rounded-lg
        text-sm
        whitespace-nowrap
      "
    >
      📄 Statement
    </button>

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
      <!-- =====================================================
     CASHBOOK TRANSACTION FILTER
===================================================== -->

<div
  class="
    bg-[#0b1220]
    border-b
    border-gray-800
    p-3
  "
>

  <!-- ===================================================
       SEARCH + QUICK DATE FILTERS
  ==================================================== -->

  <div
    class="
      flex
      flex-col
      xl:flex-row
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
        id="cashTxnSearch"

        type="search"

        autocomplete="off"

        placeholder="Search note, amount or date..."

        oninput="
          searchCashTransactions(
            this.value
          )
        "

        class="
          w-full
          bg-gray-900
          border
          border-gray-700
          focus:border-blue-500
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
        xl:pb-0
      "
    >

      <button
        data-value="all"

        onclick="
          setCashTxnPeriod(
            'all'
          )
        "

        class="
          cashTxnPeriodBtn
          bg-blue-600
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
          setCashTxnPeriod(
            'today'
          )
        "

        class="
          cashTxnPeriodBtn
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
          setCashTxnPeriod(
            'week'
          )
        "

        class="
          cashTxnPeriodBtn
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
          setCashTxnPeriod(
            'month'
          )
        "

        class="
          cashTxnPeriodBtn
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
        data-value="custom"

        onclick="
          setCashTxnPeriod(
            'custom'
          )
        "

        class="
          cashTxnPeriodBtn
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
        📅 Custom
      </button>

    </div>

  </div>


  <!-- ===================================================
       PAYMENT MODE + EXPORT
  ==================================================== -->

  <div
    class="
      flex
      flex-wrap
      items-center
      justify-between
      gap-2
      mt-3
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
        "
      >
        Payment:
      </span>


      <button
        data-value="all"

        onclick="
          setCashTxnMode(
            'all'
          )
        "

        class="
          cashTxnModeBtn
          bg-blue-600
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
        data-value="cash"

        onclick="
          setCashTxnMode(
            'cash'
          )
        "

        class="
          cashTxnModeBtn
          bg-gray-800
          text-gray-300
          hover:bg-gray-700
          px-3
          py-1.5
          rounded-full
          text-xs
          transition
        "
      >
        💵 Cash
      </button>


      <button
        data-value="online"

        onclick="
          setCashTxnMode(
            'online'
          )
        "

        class="
          cashTxnModeBtn
          bg-gray-800
          text-gray-300
          hover:bg-gray-700
          px-3
          py-1.5
          rounded-full
          text-xs
          transition
        "
      >
        📱 Online
      </button>


      <!-- EXPORT -->

      <button
        onclick="
          exportExcel()
        "

        class="
          bg-green-600
          hover:bg-green-500
          text-white
          px-3
          py-1.5
          rounded-lg
          text-xs
          font-medium
          transition
        "
      >
        ↓ Export
      </button>

    </div>


    <!-- RESULT COUNT -->

    <div
      class="
        flex
        items-center
        gap-3
      "
    >

      <span
        id="cashTxnFilterCount"

        class="
          text-[11px]
          text-gray-500
        "
      >
      </span>


      <button
        id="cashTxnClearBtn"

        onclick="
          clearCashTxnFilters()
        "

        class="
          hidden
          text-[11px]
          text-blue-400
          hover:text-blue-300
        "
      >
        Clear filters
      </button>

    </div>

  </div>


  <!-- ===================================================
       CUSTOM DATE RANGE
  ==================================================== -->

  <div
    id="cashCustomDateBox"

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
        items-end
        gap-3
      "
    >

      <!-- FROM -->

      <div>

        <label
          class="
            block
            text-[10px]
            text-gray-500
            mb-1
          "
        >
          From Date
        </label>


        <input
          type="date"

          id="fromDate"

          onchange="
            applyCashCustomDateFilter()
          "

          class="
            bg-gray-900
            border
            border-gray-700
            focus:border-blue-500
            rounded-lg
            px-3
            py-2
            text-xs
            outline-none
          "
        >

      </div>


      <!-- TO -->

      <div>

        <label
          class="
            block
            text-[10px]
            text-gray-500
            mb-1
          "
        >
          To Date
        </label>


        <input
          type="date"

          id="toDate"

          onchange="
            applyCashCustomDateFilter()
          "

          class="
            bg-gray-900
            border
            border-gray-700
            focus:border-blue-500
            rounded-lg
            px-3
            py-2
            text-xs
            outline-none
          "
        >

      </div>


      <button
        onclick="
          clearCashTxnFilters()
        "

        class="
          bg-gray-800
          hover:bg-gray-700
          px-3
          py-2
          rounded-lg
          text-xs
          transition
        "
      >
        Clear
      </button>

    </div>

  </div>

</div>

    </div>

    <!-- ✅ SCROLL AREA (EXTRA SPACE ADDED) -->
    <div id="txnList" class="flex-1 overflow-y-auto pb-28 bg-gray-950"></div>

    <!-- ✅ STICKY BOTTOM BAR (FIXED PROPERLY) -->
<div class="sticky bottom-0 bg-gray-900 p-3 flex gap-2 border-t border-gray-700 z-20 hidden md:flex">

  <button onclick="openCashEntryModal('${acc.id}','in')"
    class="flex-1 bg-green-500/20 hover:bg-green-600 text-green-300 hover:text-white p-3 rounded-xl font-bold transition">
    + Cash In
  </button>

  <button onclick="openCashEntryModal('${acc.id}','out')"
    class="flex-1 bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white p-3 rounded-xl font-bold transition">
    - Cash Out
  </button>

</div>

  </div>
  `;

  // =========================================================
  // RESET FILTER WHEN ANOTHER ACCOUNT OPENS
  // =========================================================

  cashTxnSearch = "";

  cashTxnFilter = {
    period: "all",
    mode: "all"
  };


  // =========================================================
  // SAVE CURRENT ACCOUNT / TRANSACTIONS
  // =========================================================

  window.currentAccount =
    acc;

  window.currentTxns =
    Array.isArray(txns)
      ? [...txns]
      : [];


  // =========================================================
  // INITIAL RENDER
  // =========================================================

  applyFilter();

  if (window.showDetailPanel && window.innerWidth <= 768) {
    setTimeout(showDetailPanel, 50);
  }

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
  // =========================================================
  // TRANSACTION TAB
  // =========================================================

  if (
    tab === "txns"
  ) {

    content.innerHTML = `

    <div
      class="
        flex
        flex-col
        h-full
      "
    >

      ${getCashbookFilterHTML()}


      <div
        id="txnList"

        class="
          flex-1
          overflow-y-auto
          pb-28
          bg-gray-950
        "
      >
      </div>

    </div>

  `;


    // Show existing Cash In / Cash Out bottom bar

    bottomBar.classList.remove(
      "hidden"
    );


    // Restore current filter UI / transactions

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

  // =========================================================
  // ACCOUNT KPI MUST USE FULL LEDGER
  // =========================================================

  const allTxns =
    Array.isArray(window.currentTxns)
      ? window.currentTxns
      : [];


  let fullIn = 0;
  let fullOut = 0;
  let fullBalance = 0;


  allTxns.forEach(t => {

    const amt =
      Number(t.amount) || 0;


    fullBalance += amt;


    if (
      amt > 0
    ) {

      fullIn += amt;

    } else {

      fullOut +=
        Math.abs(amt);

    }

  });


  const totalInEl =
    document.getElementById(
      "totalIn"
    );

  const totalOutEl =
    document.getElementById(
      "totalOut"
    );

  const netBalanceEl =
    document.getElementById(
      "netBalance"
    );


  if (totalInEl) {

    totalInEl.innerText =
      fullIn;

  }


  if (totalOutEl) {

    totalOutEl.innerText =
      fullOut;

  }


  if (netBalanceEl) {

    netBalanceEl.innerText =
      fullBalance;

  }


  if (
    window.currentAccount
  ) {

    window.currentAccount.balance =
      fullBalance;

  }


  updateAccountBalanceUI(
    fullBalance
  );

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
let note = "";

if (Array.isArray(row)) {

  amount =
    Number(
      row[3] || 0
    );

  note =
    row[4] || "";

  mode =
    row[5] || "cash";

  date =
    row[6];

} else {

  amount =
    Number(
      row.amount || 0
    );

  note =
    row.note || "";

  mode =
    row.mode || "cash";

  date =
    row.date;

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

  note,

  account:
    accountName

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

      <!-- 🔥 MOBILE BACK BUTTON (ONLY CASH SUMMARY) -->
      <div class="flex items-center gap-2 mb-2 md:hidden">
        <button onclick="mobileBack()"
          class="bg-gray-800 px-3 py-1 rounded text-sm active:scale-95">
          ← Back
        </button>

        <div class="text-lg font-bold">📊 Cash Dashboard</div>
      </div>

      <!-- DESKTOP TITLE (UNCHANGED) -->
      <div class="text-lg font-bold hidden md:block">
        📊 Cash Dashboard
      </div>

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

<button
  id="tabReports"
  onclick="switchSummaryTab('reports')"
  class="bg-gray-700 px-3 py-1 rounded text-xs"
>
  Reports
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
  const txns = window.summaryTxns || [];

  // ================= TAB RESET =================
  const tabs = [
  "tabSummary",
  "tabAnalytics",
  "tabAdvanced",
  "tabReports"
];

  tabs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("bg-blue-600", "text-white", "shadow-md");
    el.classList.add("bg-gray-700", "text-gray-300");
  });

  // ================= ACTIVE TAB =================
const activeTab =
  document.getElementById(

    tab === "summary"
      ? "tabSummary"

      : tab === "analytics"
        ? "tabAnalytics"

        : tab === "advanced"
          ? "tabAdvanced"

          : "tabReports"

  );

  if (activeTab) {
    activeTab.classList.remove("bg-gray-700", "text-gray-300");
    activeTab.classList.add("bg-blue-600", "text-white", "shadow-md");
  }


  /* =========================================================
     ===================== SUMMARY TAB ========================
     ========================================================= */
  if (tab === "summary") {

    tabSummary.classList.remove("bg-gray-700");
    tabSummary.classList.add("bg-blue-600");

    content.innerHTML = `

  <div class="h-[calc(100vh-160px)] overflow-y-auto pr-2">

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

      <div id="aiInsightsAdvanced" class="bg-gray-900 p-3 rounded-lg text-xs space-y-2"></div>

      <!-- SMART ALERT -->
      <div id="smartAlertBox"></div>

      <!-- CASHFLOW -->
      <div class="bg-gray-900 p-3 rounded-lg">
        <div class="text-sm mb-2">📈 Cashflow Trend</div>
        <div class="h-40">
          <canvas id="cashflowTrendChart"></canvas>
        </div>
      </div>

      <!-- HEATMAP -->
      <div>
        <div class="text-xs text-gray-400 mb-2">Activity Heatmap</div>
        <div id="summaryHeatmap" class="min-h-[100px]"></div>
      </div>

      <!-- TOP ACCOUNTS -->
      <div id="summaryTopAccounts"></div>

      <!-- INSIGHTS -->
      <div id="summaryInsights" class="text-xs text-purple-400"></div>

    </div>

  </div>
`;

    setTimeout(() => {
      renderSummaryStats(txns);
      renderSummaryTopAccounts();
      renderSummaryHeatmap(txns);
      generateSummaryInsights(txns);
      renderAdvancedInsights(txns);

      renderCashflowTrend(txns);   // ✅ NEW
      renderSmartAlerts(txns);     // ✅ NEW

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

    setTimeout(() => {

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
    }, 100);
  }

  /* =========================================================
   ===================== REPORTS TAB ========================
   ========================================================= */

if (tab === "reports") {

  content.innerHTML = `

    <div
      class="
        h-[calc(100vh-160px)]
        overflow-y-auto
        pr-2
        space-y-4
      "
    >

      <!-- ===============================================
           HEADER
           =============================================== -->

      <div
        class="
          flex
          flex-wrap
          items-center
          justify-between
          gap-3
        "
      >

        <div>

          <div
            class="
              text-lg
              font-bold
            "
          >
            📊 Cashbook Reports
          </div>

          <div
            class="
              text-xs
              text-gray-400
              mt-1
            "
          >
            Account, payment mode, trend and category analysis
          </div>

        </div>


        <button
          type="button"
          onclick="exportCashbookReportsExcel()"
          class="
            bg-green-600
            hover:bg-green-500
            text-white
            px-3
            py-2
            rounded-lg
            text-xs
            font-medium
          "
        >
          ↓ Export Report
        </button>

      </div>


      <!-- ===============================================
           DATE FILTER
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          p-3
        "
      >

        <div
          class="
            flex
            flex-wrap
            items-end
            gap-2
          "
        >

          <div>

            <label
              class="
                block
                text-[11px]
                text-gray-400
                mb-1
              "
            >
              Period
            </label>

            <select
              id="cashReportPeriod"
              onchange="setCashReportPeriod(this.value)"
              class="
                bg-black
                border
                border-gray-700
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >
              <option value="all">
                All Time
              </option>

              <option value="today">
                Today
              </option>

              <option value="month">
                This Month
              </option>

              <option value="lastMonth">
                Last Month
              </option>

              <option value="custom">
                Custom
              </option>
            </select>

          </div>


          <div>

            <label
              class="
                block
                text-[11px]
                text-gray-400
                mb-1
              "
            >
              From
            </label>

            <input
              type="date"
              id="cashReportFrom"
              class="
                bg-black
                border
                border-gray-700
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >

          </div>


          <div>

            <label
              class="
                block
                text-[11px]
                text-gray-400
                mb-1
              "
            >
              To
            </label>

            <input
              type="date"
              id="cashReportTo"
              class="
                bg-black
                border
                border-gray-700
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >

          </div>


          <button
            type="button"
            onclick="applyCashbookReportFilter()"
            class="
              bg-blue-600
              hover:bg-blue-500
              px-4
              py-2
              rounded-lg
              text-xs
            "
          >
            Apply
          </button>


          <button
            type="button"
            onclick="resetCashbookReportFilter()"
            class="
              bg-gray-700
              hover:bg-gray-600
              px-4
              py-2
              rounded-lg
              text-xs
            "
          >
            Reset
          </button>

        </div>


        <div
          id="cashReportPeriodText"
          class="
            text-[11px]
            text-gray-500
            mt-2
          "
        >
          All transactions
        </div>

      </div>


      <!-- ===============================================
           OVERALL KPI
           =============================================== -->

      <div
        class="
          grid
          grid-cols-2
          xl:grid-cols-4
          gap-3
        "
      >

        <div
          class="
            bg-green-500/10
            border
            border-green-500/20
            p-3
            rounded-xl
          "
        >
          <div class="text-xs text-gray-400">
            Income
          </div>

          <div
            id="cashReportIncome"
            class="
              text-green-400
              font-bold
              text-xl
              mt-1
            "
          >
            ₹0
          </div>
        </div>


        <div
          class="
            bg-red-500/10
            border
            border-red-500/20
            p-3
            rounded-xl
          "
        >
          <div class="text-xs text-gray-400">
            Expense
          </div>

          <div
            id="cashReportExpense"
            class="
              text-red-400
              font-bold
              text-xl
              mt-1
            "
          >
            ₹0
          </div>
        </div>


        <div
          class="
            bg-yellow-500/10
            border
            border-yellow-500/20
            p-3
            rounded-xl
          "
        >
          <div class="text-xs text-gray-400">
            Net
          </div>

          <div
            id="cashReportNet"
            class="
              font-bold
              text-xl
              mt-1
            "
          >
            ₹0
          </div>
        </div>


        <div
          class="
            bg-blue-500/10
            border
            border-blue-500/20
            p-3
            rounded-xl
          "
        >
          <div class="text-xs text-gray-400">
            Transactions
          </div>

          <div
            id="cashReportCount"
            class="
              text-blue-400
              font-bold
              text-xl
              mt-1
            "
          >
            0
          </div>
        </div>

      </div>


      <!-- ===============================================
           ACCOUNT-WISE TOTALS
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          overflow-hidden
        "
      >

        <div
          class="
            p-3
            border-b
            border-gray-800
            font-semibold
          "
        >
          🏦 Account-wise Totals
        </div>

        <div
          class="
            overflow-x-auto
          "
        >

          <table
            class="
              w-full
              min-w-[650px]
              text-xs
            "
          >

            <thead
              class="
                bg-black/30
                text-gray-400
              "
            >
              <tr>
                <th class="p-3 text-left">
                  Account
                </th>

                <th class="p-3 text-right">
                  Income
                </th>

                <th class="p-3 text-right">
                  Expense
                </th>

                <th class="p-3 text-right">
                  Net
                </th>

                <th class="p-3 text-right">
                  Txns
                </th>
              </tr>
            </thead>

            <tbody id="cashReportAccountBody">
            </tbody>

          </table>

        </div>

      </div>


      <!-- ===============================================
           PAYMENT MODE TOTALS
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          overflow-hidden
        "
      >

        <div
          class="
            p-3
            border-b
            border-gray-800
            font-semibold
          "
        >
          💳 Payment-mode Totals
        </div>

        <div class="overflow-x-auto">

          <table
            class="
              w-full
              min-w-[600px]
              text-xs
            "
          >

            <thead
              class="
                bg-black/30
                text-gray-400
              "
            >
              <tr>
                <th class="p-3 text-left">
                  Mode
                </th>

                <th class="p-3 text-right">
                  Income
                </th>

                <th class="p-3 text-right">
                  Expense
                </th>

                <th class="p-3 text-right">
                  Total Movement
                </th>

                <th class="p-3 text-right">
                  Net
                </th>
              </tr>
            </thead>

            <tbody id="cashReportModeBody">
            </tbody>

          </table>

        </div>

      </div>


      <!-- ===============================================
           DAILY TREND
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          p-3
        "
      >

        <div class="font-semibold mb-3">
          📅 Daily Income vs Expense
        </div>

        <div class="h-64">
          <canvas id="cashReportDailyChart"></canvas>
        </div>

      </div>


      <!-- ===============================================
           MONTHLY TREND
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          p-3
        "
      >

        <div class="font-semibold mb-3">
          📆 Monthly Income vs Expense
        </div>

        <div class="h-64">
          <canvas id="cashReportMonthlyChart"></canvas>
        </div>

      </div>


      <!-- ===============================================
           CATEGORY TOTALS
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          overflow-hidden
        "
      >

        <div
          class="
            p-3
            border-b
            border-gray-800
            font-semibold
          "
        >
          🗂 Category Totals
        </div>

        <div class="overflow-x-auto">

          <table
            class="
              w-full
              min-w-[650px]
              text-xs
            "
          >

            <thead
              class="
                bg-black/30
                text-gray-400
              "
            >
              <tr>
                <th class="p-3 text-left">
                  Category
                </th>

                <th class="p-3 text-right">
                  Income
                </th>

                <th class="p-3 text-right">
                  Expense
                </th>

                <th class="p-3 text-right">
                  Net
                </th>

                <th class="p-3 text-right">
                  Txns
                </th>
              </tr>
            </thead>

            <tbody id="cashReportCategoryBody">
            </tbody>

          </table>

        </div>

      </div>


      <!-- ===============================================
           DAILY TABLE
           =============================================== -->

      <div
        class="
          bg-gray-900
          border
          border-gray-800
          rounded-xl
          overflow-hidden
        "
      >

        <div
          class="
            p-3
            border-b
            border-gray-800
            font-semibold
          "
        >
          📋 Daily Totals
        </div>

        <div class="overflow-x-auto">

          <table
            class="
              w-full
              min-w-[600px]
              text-xs
            "
          >

            <thead
              class="
                bg-black/30
                text-gray-400
              "
            >
              <tr>
                <th class="p-3 text-left">
                  Date
                </th>

                <th class="p-3 text-right">
                  Income
                </th>

                <th class="p-3 text-right">
                  Expense
                </th>

                <th class="p-3 text-right">
                  Net
                </th>

                <th class="p-3 text-right">
                  Txns
                </th>
              </tr>
            </thead>

            <tbody id="cashReportDailyBody">
            </tbody>

          </table>

        </div>

      </div>


    </div>
  `;


  requestAnimationFrame(
    () => {

      renderCashbookReports(
        txns
      );

    }
  );

}

}



function generateSummaryInsights(txns) {

  const el = document.getElementById("summaryInsights");
  if (!el) return;

  const accMap = {};

  txns.forEach(t => {

    // ✅ FIX: handle multiple possible fields
    const name =
      t.account_name ||
      t.account ||
      t.accountName ||
      "Other";

    accMap[name] = (accMap[name] || 0) + Number(t.amount || 0);
  });

  const sorted = Object.entries(accMap)
    .sort((a, b) => a[1] - b[1]);

  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  let html = "";

  /* ================= ⚠️ WORST ACCOUNT ================= */
  if (worst && worst[1] < 0) {
    html += `
      <div class="p-2 rounded bg-red-500/10 text-red-400">
        ⚠️ <b>${worst[0]}</b> is draining cash (₹${worst[1]})
      </div>
    `;
  }

  /* ================= 💰 BEST ACCOUNT ================= */
  if (best && best[1] > 0) {
    html += `
      <div class="p-2 rounded bg-green-500/10 text-green-400">
        💰 <b>${best[0]}</b> is generating cash (₹${best[1]})
      </div>
    `;
  }

  /* ================= 📊 OVERALL HEALTH ================= */
  const total = Object.values(accMap).reduce((a, b) => a + b, 0);

  if (total >= 0) {
    html += `
      <div class="p-2 rounded bg-green-500/10 text-green-400">
        ✅ Cash flow looks healthy
      </div>
    `;
  } else {
    html += `
      <div class="p-2 rounded bg-red-500/10 text-red-400">
        ⚠️ Overall negative cash flow
      </div>
    `;
  }

  el.innerHTML = `<div class="space-y-2 text-xs">${html}</div>`;
}

function renderMonthlyChart(txns) {

  const canvas = document.getElementById("monthlyChart");
  if (!canvas) return;

  const map = {};

  txns.forEach(t => {
    const d = new Date(t.date);
    if (isNaN(d)) return;

    const key = d.getFullYear() + "-" + (d.getMonth() + 1);

    if (!map[key]) map[key] = { in: 0, out: 0 };

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
    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
    .slice(0, 5);

  el.innerHTML = `
    <div class="text-sm font-bold mb-2">🏆 Top Accounts</div>

    ${top.map((a, i) => {

    const positive = (a.balance || 0) >= 0;

    return `
        <div class="flex justify-between items-center text-sm p-2 rounded mb-1
          ${positive ? "bg-green-500/10" : "bg-red-500/10"}">

          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">#${i + 1}</span>
            <span>${a.name}</span>
          </div>

          <span class="font-semibold ${positive ? "text-green-400" : "text-red-400"}">
            ₹${a.balance || 0}
          </span>

        </div>
      `;
  }).join("")}
  `;
}

function renderSummaryHeatmap(txns) {

  const el = document.getElementById("summaryHeatmap");
  if (!el) return;

  if (!txns || !txns.length) {
    el.innerHTML = `<div class="text-gray-500 text-xs">No data</div>`;
    return;
  }

  // ================= SAFE DATE PARSER =================
  function parseDate(dateStr) {
    if (!dateStr) return null;

    // handle "DD-MM-YYYY"
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 2) {
      const [dd, mm, yyyy] = dateStr.split("-");
      return new Date(`${yyyy}-${mm}-${dd}`);
    }

    // fallback
    const d = new Date(dateStr);
    return isNaN(d) ? null : d;
  }

  // ================= BUILD MAP =================
  const map = {};

  txns.forEach(t => {

    const d = parseDate(t.date);
    if (!d) return;

    const key =
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");

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

  // ================= BUILD UI =================
  let html = `<div class="grid grid-cols-7 gap-1">`;

  days.forEach(d => {

    const key =
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");

    const data = map[key] || { in: 0, out: 0 };

    const total = data.in + data.out;
    const net = data.in - data.out;

    const intensity = Math.min(total / 5000, 1);

    let bg = "#374151"; // gray-700

    if (total > 0) {
      if (net >= 0) {
        bg = `rgba(34,197,94,${0.3 + intensity})`; // green
      } else {
        bg = `rgba(239,68,68,${0.3 + intensity})`; // red
      }
    }

    html += `
      <div
        class="h-4 w-4 rounded cursor-pointer transition hover:scale-125"
        style="background:${bg}"
        title="${key}
In: ₹${data.in}
Out: ₹${data.out}
Net: ₹${net}">
      </div>
    `;
  });

  html += `</div>`;

  el.innerHTML = html;
}



function openCashEntryModal(accountId, type) {

  cashEntryRequestId =
  createClientRequestId(
    "cash"
  );

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
/* =========================================================
   CASHBOOK ENHANCED FILTER
   ========================================================= */

/* =========================================================
   CASHBOOK TRANSACTION FILTER
   ========================================================= */

function applyFilter() {

  // =======================================================
  // SOURCE DATA
  // =======================================================

  const allTxns =
    Array.isArray(window.currentTxns)
      ? window.currentTxns
      : [];

  let txns = [...allTxns];


  // =======================================================
  // DATE REFERENCES
  // =======================================================

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );


  // =======================================================
  // WEEK START - MONDAY
  // =======================================================

  const weekStart = new Date(today);

  const day = weekStart.getDay();

  const diff =
    day === 0
      ? 6
      : day - 1;

  weekStart.setDate(
    weekStart.getDate() - diff
  );

  weekStart.setHours(
    0,
    0,
    0,
    0
  );


  // =======================================================
  // CUSTOM DATE INPUTS
  // =======================================================

  const fromEl =
    document.getElementById(
      "fromDate"
    );

  const toEl =
    document.getElementById(
      "toDate"
    );

  const from =
    fromEl?.value || "";

  const to =
    toEl?.value || "";


  // =======================================================
  // FILTER TRANSACTIONS
  // =======================================================

  txns = txns.filter(t => {

    // -----------------------------------------------------
    // TRANSACTION DATE
    // -----------------------------------------------------

    const d =
      new Date(t.date);

    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return false;
    }


    // -----------------------------------------------------
    // TODAY
    // -----------------------------------------------------

    if (
      cashTxnFilter.period ===
      "today"
    ) {

      if (
        d.getFullYear() !==
          today.getFullYear() ||

        d.getMonth() !==
          today.getMonth() ||

        d.getDate() !==
          today.getDate()
      ) {

        return false;

      }

    }


    // -----------------------------------------------------
    // THIS WEEK
    // -----------------------------------------------------

    if (
      cashTxnFilter.period ===
      "week"
    ) {

      const txnDay =
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate()
        );

      if (
        txnDay < weekStart ||
        txnDay > now
      ) {

        return false;

      }

    }


    // -----------------------------------------------------
    // THIS MONTH
    // -----------------------------------------------------

    if (
      cashTxnFilter.period ===
      "month"
    ) {

      if (
        d.getMonth() !==
          now.getMonth() ||

        d.getFullYear() !==
          now.getFullYear()
      ) {

        return false;

      }

    }


    // -----------------------------------------------------
    // CUSTOM DATE RANGE
    // -----------------------------------------------------

    if (
      cashTxnFilter.period ===
      "custom"
    ) {

      if (from) {

        const fromDate =
          new Date(
            `${from}T00:00:00`
          );

        if (
          d < fromDate
        ) {

          return false;

        }

      }


      if (to) {

        const toDate =
          new Date(
            `${to}T23:59:59`
          );

        if (
          d > toDate
        ) {

          return false;

        }

      }

    }


    // -----------------------------------------------------
    // PAYMENT MODE
    // -----------------------------------------------------

    if (
      cashTxnFilter.mode !==
      "all"
    ) {

      const txnMode =
        String(
          t.mode || ""
        )
          .trim()
          .toLowerCase();

      if (
        txnMode !==
        cashTxnFilter.mode
      ) {

        return false;

      }

    }


    // -----------------------------------------------------
    // SEARCH
    //
    // Search:
    // note
    // amount
    // date
    // payment mode
    // type
    // -----------------------------------------------------

    if (cashTxnSearch) {

      const note =
        String(
          t.note || ""
        )
          .toLowerCase();


      const amount =
        String(
          Math.abs(
            Number(
              t.amount || 0
            )
          )
        );


      const mode =
        String(
          t.mode || ""
        )
          .toLowerCase();


      const type =
        Number(t.amount) >= 0
          ? "cash in in received"
          : "cash out out paid";


      const dateText =
        [
          t.date || "",

          d.toLocaleDateString(),

          d.toLocaleDateString(
            "en-IN"
          ),

          d.toLocaleDateString(
            "en-GB"
          )
        ]
          .join(" ")
          .toLowerCase();


      const searchable =
        [
          note,
          amount,
          mode,
          type,
          dateText
        ]
          .join(" ");


      if (
        !searchable.includes(
          cashTxnSearch
        )
      ) {

        return false;

      }

    }


    return true;

  });


  // =======================================================
  // RENDER TRANSACTIONS
  // =======================================================

  renderTxnList(txns);


  // =======================================================
  // FILTER RESULT COUNT
  // =======================================================

  updateCashTxnFilterCount(
    txns.length,
    allTxns.length
  );


  // =======================================================
  // FILTER BUTTON STATE
  // =======================================================

  updateCashTxnFilterUI();

}



// =========================================================
// CASHBOOK SEARCH
// =========================================================

function searchCashTransactions(value) {

  cashTxnSearch =
    String(value || "")
      .trim()
      .toLowerCase();

  applyFilter();

}


// =========================================================
// CASHBOOK PERIOD FILTER
// =========================================================

function setCashTxnPeriod(period) {

  cashTxnFilter.period =
    period;

  const customBox =
    document.getElementById(
      "cashCustomDateBox"
    );

  if (customBox) {

    customBox.classList.toggle(
      "hidden",
      period !== "custom"
    );

  }

  applyFilter();

}


// =========================================================
// CASHBOOK PAYMENT MODE FILTER
// =========================================================

function setCashTxnMode(mode) {

  cashTxnFilter.mode =
    mode;

  applyFilter();

}


// =========================================================
// CUSTOM DATE FILTER
// =========================================================

function applyCashCustomDateFilter() {

  cashTxnFilter.period =
    "custom";

  applyFilter();

}


// =========================================================
// CLEAR CASHBOOK FILTERS
// =========================================================

function clearCashTxnFilters() {

  cashTxnSearch = "";

  cashTxnFilter = {
    period: "all",
    mode: "all"
  };


  const search =
    document.getElementById(
      "cashTxnSearch"
    );

  const from =
    document.getElementById(
      "fromDate"
    );

  const to =
    document.getElementById(
      "toDate"
    );

  const customBox =
    document.getElementById(
      "cashCustomDateBox"
    );


  if (search) {
    search.value = "";
  }

  if (from) {
    from.value = "";
  }

  if (to) {
    to.value = "";
  }

  if (customBox) {
    customBox.classList.add(
      "hidden"
    );
  }


  applyFilter();

}


// =========================================================
// FILTER RESULT COUNT
// =========================================================

function updateCashTxnFilterCount(
  visible,
  total
) {

  const el =
    document.getElementById(
      "cashTxnFilterCount"
    );

  if (!el) {
    return;
  }


  if (
    visible === total
  ) {

    el.textContent =
      `${total} transaction${
        total === 1
          ? ""
          : "s"
      }`;

  } else {

    el.textContent =
      `Showing ${visible} of ${total}`;

  }

}


// =========================================================
// UPDATE FILTER BUTTON UI
// =========================================================

function updateCashTxnFilterUI() {

  // -------------------------------------------------------
  // PERIOD BUTTONS
  // -------------------------------------------------------

  document
    .querySelectorAll(
      ".cashTxnPeriodBtn"
    )
    .forEach(btn => {

      const active =
        btn.dataset.value ===
        cashTxnFilter.period;


      btn.classList.toggle(
        "bg-blue-600",
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


  // -------------------------------------------------------
  // PAYMENT MODE BUTTONS
  // -------------------------------------------------------

  document
    .querySelectorAll(
      ".cashTxnModeBtn"
    )
    .forEach(btn => {

      const active =
        btn.dataset.value ===
        cashTxnFilter.mode;


      btn.classList.toggle(
        "bg-blue-600",
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


  // -------------------------------------------------------
  // CLEAR BUTTON
  // -------------------------------------------------------

  const clearBtn =
    document.getElementById(
      "cashTxnClearBtn"
    );


  if (clearBtn) {

    const hasFilter =
      cashTxnSearch !== "" ||
      cashTxnFilter.period !== "all" ||
      cashTxnFilter.mode !== "all";


    clearBtn.classList.toggle(
      "hidden",
      !hasFilter
    );

  }

}







/* ================= TRANSACTION LIST ================= */
/* =========================================================
   CASHBOOK TRANSACTION LIST
   ========================================================= */

function renderTxnList(txns) {

  if (
    !Array.isArray(txns)
  ) {
    txns = [];
  }


  const list =
    document.getElementById(
      "txnList"
    );


  if (!list) {

    console.warn(
      "⚠️ txnList not found"
    );

    return;

  }


  // =======================================================
  // VISIBLE TRANSACTION HTML
  // =======================================================

  let html = "";

  let runningBalance = 0;


  txns.forEach(t => {

    const amt =
      Number(t.amount) || 0;


    runningBalance += amt;


    html += `

      <div
        class="
          relative
          overflow-hidden
        "
      >

        <!-- ACTION BUTTONS -->

        <div
          class="
            absolute
            right-0
            top-0
            h-full
            flex
            z-0
            w-[140px]
          "
        >

<button
  onclick="editCashTxn('${t.id}')"
  class="
    w-[70px]
    bg-blue-600
    flex
    items-center
    justify-center
  "
>
  ✏️
</button>


          <button
            onclick="
              deleteCashTxn(
                '${t.id}',
                this
              )
            "

            class="
              w-[70px]
              bg-red-600
              flex
              items-center
              justify-center
            "
          >
            🗑
          </button>

        </div>


        <!-- MAIN CARD -->

        <div
          class="
            txnCard
            p-3
            border-b
            border-gray-800
            flex
            items-center
            justify-between
            bg-gray-900
            relative
            z-10
            transition-transform
            duration-200
            ${
              selectedCashTxns.has(
                String(t.id)
              )
                ? "bg-yellow-900"
                : ""
            }
          "

          data-id="${t.id}" onclick="handleCashTxnSelectionTap(event,this)"

          oncontextmenu="
            return false;
          "

          ontouchstart="
            startSwipe(
              event,
              this
            );

            startCashLongPress(
              event,
              this
            );
          "

          ontouchmove="
            moveSwipe(event)
          "

          ontouchend="
            endSwipe();
            cancelCashLongPress();
          "

          ontouchcancel="
            endSwipe();
            cancelCashLongPress();
          "

          onmousedown="
            startSwipe(
              event,
              this
            )
          "

          onmousemove="
            moveSwipe(event)
          "

          onmouseup="
            endSwipe()
          "

          onmouseleave="
            endSwipe()
          "
        >


          <!-- DESKTOP MULTI SELECT -->

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
                cashDesktopCheckbox
                w-4
                h-4
                cursor-pointer
                accent-red-600
              "

              data-id="${t.id}"

              ${
                selectedCashTxns.has(
                  String(t.id)
                )
                  ? "checked"
                  : ""
              }

              onchange="
                toggleDesktopCashTxn(
                  this,
                  '${t.id}'
                )
              "
            >

          </div>


          <!-- DETAILS -->

          <div
            class="
              flex-1
              min-w-0
            "
          >

            <div
              class="
                truncate
              "
            >

              ${getCategoryEmoji(
                t.note
              )}

              ${escapeHtml(
                t.note || "-"
              )}

            </div>


            <div
              class="
                text-xs
                text-gray-400
                mt-1
              "
            >

              ${formatDate(
                t.date
              )}

              |

              ${escapeHtml(
                t.mode || "-"
              )}

            </div>


            <div
              class="
                text-xs
                text-yellow-400
                mt-1
              "
            >

              Bal:
              ₹${runningBalance}

            </div>

          </div>


          <!-- AMOUNT -->

          <div
            class="
              ${
                amt > 0
                  ? "text-green-400"
                  : "text-red-400"
              }
              font-bold
              whitespace-nowrap
              ml-3
            "
          >

            ${amt > 0
              ? "+"
              : "-"
            }

            ₹${Math.abs(amt)}

          </div>

        </div>

      </div>

    `;

  });


  // =======================================================
  // EMPTY STATE / RENDER
  // =======================================================

  list.innerHTML =
    html ||
    `
      <div
        class="
          p-6
          text-center
          text-gray-400
        "
      >
        No transactions found
      </div>
    `;


  // =======================================================
  // FULL LEDGER KPI
  //
  // IMPORTANT:
  // Filters must NOT change account totals.
  // =======================================================

  const allTxns =
    Array.isArray(
      window.currentTxns
    )
      ? window.currentTxns
      : [];


  let totalIn = 0;
  let totalOut = 0;
  let fullBalance = 0;

  let todayIn = 0;
  let todayOut = 0;


  const todayStr =
    new Date()
      .toDateString();


  allTxns.forEach(t => {

    const amt =
      Number(t.amount) || 0;


    fullBalance += amt;


    if (
      amt > 0
    ) {

      totalIn += amt;

    } else {

      totalOut +=
        Math.abs(amt);

    }


    const d =
      new Date(t.date);


    if (
      !Number.isNaN(
        d.getTime()
      ) &&
      d.toDateString() ===
        todayStr
    ) {

      if (
        amt > 0
      ) {

        todayIn += amt;

      } else {

        todayOut +=
          Math.abs(amt);

      }

    }

  });


  // =======================================================
  // UPDATE KPI
  // =======================================================

  const totalInEl =
    document.getElementById(
      "totalIn"
    );

  const totalOutEl =
    document.getElementById(
      "totalOut"
    );

  const netBalanceEl =
    document.getElementById(
      "netBalance"
    );


  if (totalInEl) {

    totalInEl.innerText =
      totalIn;

  }


  if (totalOutEl) {

    totalOutEl.innerText =
      totalOut;

  }


  if (netBalanceEl) {

    netBalanceEl.innerText =
      fullBalance;

  }


  // =======================================================
  // UPDATE ACCOUNT BALANCE
  // =======================================================

  if (
    window.currentAccount
  ) {

    window.currentAccount.balance =
      fullBalance;

  }


  updateAccountBalanceUI(
    fullBalance
  );


  // =======================================================
  // TODAY SUMMARY
  // =======================================================

  const dailyEl =
    document.getElementById(
      "dailySummary"
    );


  if (dailyEl) {

    dailyEl.innerHTML = `

      <span>
        Today In:
        <span class="text-green-400">
          ₹${todayIn}
        </span>
      </span>

      <span>
        Out:
        <span class="text-red-400">
          ₹${todayOut}
        </span>
      </span>

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
/* =========================================================
   SAVE CASHBOOK ENTRY
   DUPLICATE-SAFE FRONTEND
   ========================================================= */

async function saveCashEntry(
  accountId,
  type,
  btn
) {

  // =======================================================
  // FRONTEND DUPLICATE GUARD
  // =======================================================

  if (
    window.__cashEntrySaving ===
    true
  ) {

    console.warn(
      "Cashbook entry already saving"
    );

    return;

  }


  // =======================================================
  // READ FORM
  // =======================================================

  const amount =
    document
      .getElementById("amount")
      ?.value || "";


  const note =
    document
      .getElementById("note")
      ?.value || "";


  const mode =
    document
      .getElementById("mode")
      ?.value || "cash";


  const date =
    document
      .getElementById("date")
      ?.value || "";


  // =======================================================
  // VALIDATION
  // =======================================================

  if (
    !amount ||
    Number(amount) <= 0
  ) {

    showToast(
      "Enter amount ❌",
      "error"
    );

    return;

  }


  if (!accountId) {

    showToast(
      "Select Cashbook account first ❌",
      "error"
    );

    return;

  }


  // =======================================================
  // ENSURE REQUEST ID
  // =======================================================

  if (!cashEntryRequestId) {

    cashEntryRequestId =
      createClientRequestId(
        "cash"
      );

  }


  // =======================================================
  // SAVE ORIGINAL BUTTON CONTENT
  // =======================================================

  const original =
    btn?.innerHTML || "Save";


  // =======================================================
  // LOCK SUBMISSION
  // =======================================================

  window.__cashEntrySaving =
    true;


  if (btn) {

    btn.innerHTML =
      "Saving...";

    btn.disabled =
      true;

  }


  try {

    // =====================================================
    // ADD CASH ENTRY
    // =====================================================

    const res =
      await apiPost({

        action:
          "addCashEntry",

        business_id:
          currentBusiness,

        account_id:
          accountId,

        amount:
          type === "out"
            ? -Math.abs(
                Number(amount)
              )
            : Math.abs(
                Number(amount)
              ),

        note:
          note,

        mode:
          mode,

        date:
          date,


        // ===============================================
        // IDEMPOTENCY KEY
        // ===============================================

        client_request_id:
          cashEntryRequestId

      });


    // =====================================================
    // FAILURE
    // =====================================================

    if (
      !res ||
      res.success !== true
    ) {

      /*
       * Keep the same request ID.
       *
       * If the user retries this entry,
       * the backend can identify it as
       * the same transaction attempt.
       */

      showToast(
        res?.message ||
        "Failed ❌",
        "error"
      );

      return;

    }


    // =====================================================
    // SUCCESS
    // =====================================================

    showToast(
      "Saved ✅"
    );


    /*
     * The transaction has now been
     * successfully confirmed.
     *
     * A future entry should receive
     * a new ID.
     */

    cashEntryRequestId =
      null;


    // =====================================================
    // EXISTING UI FLOW
    // =====================================================

    closeModal();


    openCashbookReport(
      window.currentAccount
    );


    loadCashbook();


  } catch (err) {

    console.error(
      "SAVE CASH ENTRY ERROR:",
      err
    );


    /*
     * IMPORTANT:
     *
     * Do not reset cashEntryRequestId.
     *
     * The server might have received the
     * request even though the client did
     * not receive the response.
     */

    showToast(
      "Unable to confirm save. Please retry. ❌",
      "error"
    );


  } finally {

    // =====================================================
    // RELEASE CLIENT LOCK
    // =====================================================

    window.__cashEntrySaving =
      false;


    if (btn) {

      btn.innerHTML =
        original;

      btn.disabled =
        false;

    }

  }

}

/* ================= ADD ACCOUNT ================= */
let editingAccountId = null;

function openAddAccount(account = null) {

  // ======================
  // Edit / Add detect
  // ======================
  editingAccountId = account?.id || null;

  const isEdit = !!account;

  const modal =
    document.getElementById("modal");

  if (!modal) {
    console.error("❌ modal not found");
    return;
  }

  modal.innerHTML = `
  <div class="bg-gray-900 p-5 rounded-2xl w-[95%] max-w-sm border border-gray-700 shadow-2xl">

    <!-- TITLE -->
    <h3 class="text-lg font-bold mb-4 text-white">
      ${isEdit ? "✏️ Edit Account" : "➕ Add Account"}
    </h3>

    <!-- INPUT -->
    <input
      id="accName"
      placeholder="Account Name"
      value="${escapeHtml(account?.name || "")}"
      class="w-full p-3 mb-2 bg-black text-white border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
    />

    <!-- MESSAGE -->
    <div
      id="accMsg"
      class="text-sm mb-2 hidden">
    </div>

    <!-- BUTTONS -->
    <div class="flex justify-end gap-2 mt-4">

      <button
        onclick="closeModal()"
        class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-white">
        Cancel
      </button>

      <button
        id="saveAccBtn"
        onclick="saveAccount(this)"
        class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-white flex items-center gap-2">

        <span>
          ${isEdit ? "Update" : "Save"}
        </span>

      </button>

    </div>

  </div>
  `;

  modal.classList.remove("hidden");

  // autofocus
  setTimeout(() => {
    document.getElementById("accName")?.focus();
  }, 100);
}



async function saveAccount(btn) {

  const input =
    document.getElementById("accName");

  const msg =
    document.getElementById("accMsg");

  const name =
    input?.value?.trim() || "";

  if (!name) {
    showMsg(msg, "Enter account name ❌", "error");
    return;
  }

  const isEdit =
    !!editingAccountId;

  if (btn) {
    setButtonLoading(
      btn,
      isEdit ? "Updating..." : "Saving..."
    );
  }

  try {

    /* =====================================================
       DUPLICATE CHECK (CURRENT BUSINESS ONLY)
       ===================================================== */
    const list =
      window.accountsData || [];

    const cleanName =
      name.toLowerCase().trim();

    const duplicate = list.some(acc => {

      const sameBusiness =
        String(acc.business_id || "") ===
        String(currentBusiness);

      const sameName =
        String(acc.name || "")
          .toLowerCase()
          .trim() === cleanName;

      const differentRow =
        String(acc.id) !==
        String(editingAccountId || "");

      return (
        sameBusiness &&
        sameName &&
        differentRow
      );
    });

    if (duplicate) {

      showMsg(
        msg,
        "Account already exists ❌",
        "error"
      );

      if (btn) resetButton(btn);
      return;
    }

    /* =====================================================
       SAVE
       ===================================================== */
    const payload = {
      action:
        isEdit
          ? "updateAccount"
          : "addAccount",

      id: editingAccountId || "",
      business_id: currentBusiness,
      name: name
    };

    console.log("📤 SAVE ACCOUNT:", payload);

    const res =
      await apiPost(payload);

    console.log("📥 RESPONSE:", res);

    if (!res || res.success !== true) {

      showMsg(
        msg,
        isEdit
          ? "Update failed ❌"
          : "Save failed ❌",
        "error"
      );

      if (btn) resetButton(btn);
      return;
    }

    /* =====================================================
       SUCCESS
       ===================================================== */
    showMsg(
      msg,
      isEdit
        ? "Updated successfully ✅"
        : "Account added ✅",
      "success"
    );

    await loadCashbook();

    /* =====================================================
       AUTO CLOSE
       ===================================================== */
    setTimeout(() => {

      closeModal();

      editingAccountId = null;

      if (input) input.value = "";

      if (btn) {
        btn.innerHTML =
          "<span>Save</span>";
      }

    }, 700);

  } catch (err) {

    console.error(err);

    showMsg(
      msg,
      "Server error ❌",
      "error"
    );

    if (btn) resetButton(btn);
  }
}


function confirmDeleteAccount(id, name) {

  const modal =
    document.getElementById("businessModal");

  if (!modal) return;

  modal.innerHTML = `
  <div class="bg-gray-900 w-[95%] max-w-sm rounded-2xl p-5 shadow-2xl border border-gray-700">

    <div class="text-center">

      <div class="text-4xl mb-2">⚠️</div>

      <h2 class="text-white text-lg font-semibold">
        Delete Account?
      </h2>

      <p class="text-gray-400 text-sm mt-3 leading-6">
        <b class="text-white">${escapeHtml(name)}</b>
        <br><br>
        This will delete:
        <br>• All account transactions
        <br>• Cashbook entries
        <br><br>
        <span class="text-red-400 font-semibold">
          This cannot be undone.
        </span>
      </p>

      <!-- TYPE DELETE -->
      <div class="mt-4 text-left">

        <label class="text-xs text-gray-400 block mb-2">
          Type <span class="text-red-400 font-bold">DELETE</span> to confirm
        </label>

        <input
          id="deleteAccInput"
          type="text"
          autocomplete="off"
          placeholder="Type DELETE"
          class="w-full p-3 rounded-xl bg-black border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        />

      </div>

      <!-- INLINE MESSAGE -->
      <div
        id="deleteAccMsg"
        class="hidden text-sm mt-3">
      </div>

    </div>

    <div class="flex gap-3 mt-5">

      <button
        onclick="closeBusinessModal()"
        class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl">
        Cancel
      </button>

      <button
        id="deleteAccBtn"
        onclick="validateDeleteAccount('${id}', this)"
        class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-semibold">

        Delete

      </button>

    </div>

  </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  setTimeout(() => {
    document.getElementById("deleteAccInput")?.focus();
  }, 100);
}



/* =====================================================
   VALIDATE DELETE TEXT
===================================================== */
function validateDeleteAccount(id, btn) {

  const input =
    document.getElementById("deleteAccInput");

  const msg =
    document.getElementById("deleteAccMsg");

  const val =
    (input?.value || "").trim().toUpperCase();

  if (val !== "1980") {

    showMsg(
      msg,
      "Type DELETE to continue ❌",
      "error"
    );

    input?.focus();
    return;
  }

  deleteAccount(id, btn);
}

async function deleteAccount(id, btn) {

  const msg =
    document.getElementById("deleteAccMsg");

  try {

    // ====================================
    // Button Loader
    // ====================================
    if (btn) {

      btn.disabled = true;

      btn.innerHTML = `
        <span class="inline-flex items-center gap-2">
          <span class="animate-spin">⏳</span>
          Deleting...
        </span>
      `;
    }

    // ====================================
    // API CALL
    // ====================================
    const res = await apiPost({
      action: "deleteAccount",
      id: id,
      business_id: currentBusiness
    });

    console.log(
      "DELETE ACCOUNT RESPONSE:",
      res
    );

    // ====================================
    // Failed
    // ====================================
    if (!res || res.success !== true) {

      if (msg) {
        msg.className =
          "text-red-400 text-sm mt-3";
        msg.innerHTML =
          "Delete failed ❌";
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "Delete";
      }

      return;
    }

    // ====================================
    // Success
    // ====================================
    if (msg) {
      msg.className =
        "text-green-400 text-sm mt-3";
      msg.innerHTML =
        "Account deleted successfully ✅";
    }

    // Refresh
    await loadCashbook();

    // Auto close
    setTimeout(() => {
      closeBusinessModal();
    }, 900);

  } catch (err) {

    console.error(err);

    if (msg) {
      msg.className =
        "text-red-400 text-sm mt-3";
      msg.innerHTML =
        "Server error ❌";
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Delete";
    }
  }
}



/* =========================================================
   SAFE HTML
   ========================================================= */
function escapeHtml(str = "") {

  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showMsg(el, text, type) {
  el.innerText = text;
  el.className = `text-sm mb-2 ${type === "error" ? "text-red-400" : "text-green-400"}`;
  el.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

/* =========================================================
   REFRESH CASHBOOK BALANCE FROM LOCAL MEMORY
   NO API RELOAD
   ========================================================= */

function refreshAccountBalanceInstant() {

  const txns =
    Array.isArray(
      window.currentTxns
    )
      ? window.currentTxns
      : [];


  // =======================================================
  // CALCULATE BALANCE
  // =======================================================

  const balance =
    txns.reduce(
      (sum, txn) =>
        sum +
        (
          Number(
            txn.amount
          ) || 0
        ),
      0
    );


  // =======================================================
  // UPDATE KPI
  // =======================================================

  const netBalanceEl =
    document.getElementById(
      "netBalance"
    );


  if (netBalanceEl) {

    netBalanceEl.innerText =
      balance;

  }


  // =======================================================
  // UPDATE CURRENT ACCOUNT
  // =======================================================

  if (
    window.currentAccount
  ) {

    window.currentAccount.balance =
      balance;

  }


  // =======================================================
  // UPDATE ACCOUNT INSIDE ACCOUNT LIST MEMORY
  // =======================================================

  const accounts =
    Array.isArray(
      window.accountsData
    )
      ? window.accountsData
      : [];


  const account =
    accounts.find(
      a =>
        String(a.id) ===
        String(
          window.currentAccount?.id
        )
    );


  if (account) {

    account.balance =
      balance;

  }


  // =======================================================
  // UPDATE LEFT PANEL
  // =======================================================

  if (
    typeof renderCashbookList ===
    "function"
  ) {

    renderCashbookList(
      accounts
    );

  }


  // =======================================================
  // UPDATE DIRECT ACCOUNT BALANCE UI
  // =======================================================

  if (
    typeof updateAccountBalanceUI ===
    "function"
  ) {

    updateAccountBalanceUI(
      balance
    );

  }


  return balance;

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

  txns.forEach(t => {
    const d = t.date;
    daily[d] = (daily[d] || 0) + Number(t.amount || 0);
    balance += Number(t.amount || 0);
  });

  const avg = Object.values(daily).reduce((a, b) => a + b, 0) / Object.keys(daily).length || 0;

  const daysLeft = avg < 0 ? Math.floor(balance / Math.abs(avg)) : "∞";

  el.innerHTML = `
    <div class="text-sm font-bold mb-2">📉 Forecast</div>
    <div>Balance: ₹${balance}</div>
    <div>Daily Avg: ₹${avg.toFixed(0)}</div>
    <div class="text-red-400">Days Left: ${daysLeft}</div>
  `;
}

function renderAccountContribution(txns) {

  const el = document.getElementById("accountContribution");
  if (!el) return;

  const map = {};

  txns.forEach(t => {
    const name = t.account_name || t.account || "Unknown";
    map[name] = (map[name] || 0) + Number(t.amount || 0);
  });

  el.innerHTML = `
    <div class="font-bold mb-2">🏦 Account Contribution</div>
    ${Object.entries(map).map(([k, v]) => `
      <div class="flex justify-between text-sm p-2 rounded hover:bg-gray-800">
        <span>${k}</span>
        <span class="${v >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">
          ₹${v}
        </span>
      </div>
    `).join("")}
  `;
}

function renderWeeklyPattern(txns) {

  const el = document.getElementById("weeklyPattern");
  if (!el) return;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map = Array(7).fill(0);

  txns.forEach(t => {
    const d = new Date(t.date);
    if (!isNaN(d)) map[d.getDay()] += Math.abs(t.amount);
  });

  const max = Math.max(...map, 1);

  el.innerHTML = `
    <div class="font-bold mb-2">📅 Weekly Pattern</div>
    ${days.map((d, i) => `
      <div class="mb-2">
        <div class="flex justify-between text-xs">
          <span>${d}</span>
          <span>₹${map[i]}</span>
        </div>
        <div class="bg-gray-800 h-2 rounded">
          <div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded"
            style="width:${(map[i] / max) * 100}%"></div>
        </div>
      </div>
    `).join("")}
  `;
}

function renderRecurring(txns) {

  const el = document.getElementById("recurringBox");
  if (!el) return;

  const map = {};

  txns.forEach(t => {
    const key = Math.abs(t.amount);
    map[key] = (map[key] || 0) + 1;
  });

  const recurring = Object.entries(map).filter(([k, v]) => v >= 3);

  el.innerHTML = `
    <div class="font-bold mb-2">🔁 Recurring</div>
    <div class="flex flex-wrap gap-2">
      ${recurring.map(([amt]) => `
        <span class="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">
          ₹${amt}
        </span>
      `).join("") || `<span class="text-gray-400 text-sm">No recurring</span>`}
    </div>
  `;
}

function renderAIInsights(txns) {

  const el = document.getElementById("aiInsights");

  let total = txns.reduce((a, b) => a + b.amount, 0);

  let msg = "Normal activity";

  if (total < 0) msg = "⚠️ Spending exceeds income";
  if (total > 0) msg = "💰 Positive cashflow";

  el.innerHTML = `
    <div class="font-bold mb-2">🧠 Insights</div>
    <div class="text-purple-400 text-sm">${msg}</div>
  `;
}



function renderIncomeExpenseRatio(txns) {

  const el = document.getElementById("ratioBox");
  if (!el) return;

  let income = 0, expense = 0;

  txns.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expense += Math.abs(t.amount);
  });

  const ratio = income ? ((income - expense) / income * 100) : 0;

  el.innerHTML = `
    <div class="font-bold mb-2">📊 Savings Ratio</div>

    <div class="text-sm mb-1">${ratio.toFixed(1)}%</div>

    <div class="bg-gray-800 h-2 rounded">
      <div class="h-2 rounded bg-gradient-to-r from-green-400 to-emerald-500"
        style="width:${Math.max(0, ratio)}%"></div>
    </div>
  `;
}

function renderLargestTransactions(txns) {

  const el = document.getElementById("largestTxns");
  if (!el) return;

  const sorted = [...txns]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  el.innerHTML = `
    <div class="font-bold mb-2">💸 Largest Transactions</div>

    ${sorted.map(t => {

    const name = t.account_name || t.account || "Unknown";
    const amt = Number(t.amount || 0);

    return `
        <div class="flex justify-between text-sm p-2 rounded hover:bg-gray-800">
          <span>${name}</span>
          <span class="${amt >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">
            ₹${amt}
          </span>
        </div>
      `;
  }).join("")}
  `;
}

function renderFrequency(txns) {

  const el = document.getElementById("frequencyBox");
  if (!el) return;

  let inCount = 0, outCount = 0;

  txns.forEach(t => {
    if (t.amount > 0) inCount++;
    else outCount++;
  });

  const total = inCount + outCount || 1;

  el.innerHTML = `
    <div class="font-bold mb-2">🔄 Frequency</div>

    <div class="flex justify-between text-xs mb-1">
      <span>Income</span>
      <span>${inCount}</span>
    </div>

    <div class="flex justify-between text-xs mb-2">
      <span>Expense</span>
      <span>${outCount}</span>
    </div>

    <div class="bg-gray-800 h-2 rounded flex overflow-hidden">
      <div class="bg-green-400" style="width:${(inCount / total) * 100}%"></div>
      <div class="bg-red-400" style="width:${(outCount / total) * 100}%"></div>
    </div>
  `;
}

function renderTopSpendingAccounts(txns) {

  const el = document.getElementById("topSpendingAccounts");
  if (!el) return;

  let map = {};

  txns.forEach(t => {
    if (t.amount < 0) {
      const name = t.account_name || t.account || "Unknown";
      map[name] = (map[name] || 0) + Math.abs(t.amount);
    }
  });

  const top = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const max = top[0]?.[1] || 1;

  el.innerHTML = top.map(([name, val]) => `
    <div class="mb-2">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-gray-300">${name}</span>
        <span class="text-red-400 font-semibold">₹${val}</span>
      </div>
      <div class="w-full bg-gray-800 h-2 rounded">
        <div class="h-2 rounded bg-gradient-to-r from-red-500 to-pink-500"
          style="width:${(val / max) * 100}%"></div>
      </div>
    </div>
  `).join("");
}

function renderDailyAverage(txns) {

  const el = document.getElementById("dailyAvgBox");
  if (!el) return;

  if (!txns.length) {
    el.innerHTML = `<div class="text-gray-400">No data</div>`;
    return;
  }

  let total = 0;
  txns.forEach(t => total += Number(t.amount || 0));

  const days = new Set(txns.map(t => t.date)).size || 1;
  const avg = Math.round(total / days);

  el.innerHTML = `
    <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-lg text-center">
      <div class="text-xs text-gray-200">Daily Average</div>
      <div class="text-xl font-bold text-white">₹${avg}</div>
    </div>
  `;
}

function renderTxnDistribution(txns) {

  const ctx = document.getElementById("txnDistributionChart");
  if (!ctx) return;

  // ✅ FIX SIZE
  ctx.parentElement.style.height = "220px";

  let small = 0, medium = 0, large = 0;

  txns.forEach(t => {
    const amt = Math.abs(t.amount);
    if (amt < 1000) small++;
    else if (amt < 5000) medium++;
    else large++;
  });

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Small", "Medium", "Large"],
      datasets: [{ data: [small, medium, large] }]
    },
    options: {
      maintainAspectRatio: false
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

let cashflowChartInstance = null;

function renderCashflowTrend(txns) {

  const ctx = document.getElementById("cashflowTrendChart");
  if (!ctx) return;

  if (cashflowChartInstance) {
    cashflowChartInstance.destroy();
  }

  const map = {};

  txns.forEach(t => {

    if (!t.date) return;

    const d = new Date(t.date);
    if (isNaN(d)) return;

    // ✅ ONLY DATE (no time)
    const key = d.toISOString().split("T")[0];

    map[key] = (map[key] || 0) + Number(t.amount || 0);
  });

  const labels = Object.keys(map).sort();

  let running = 0;

  const data = labels.map(d => {
    running += map[d];
    return running;
  });

  cashflowChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cashflow",
        data,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#9CA3AF"
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#9CA3AF",
            maxRotation: 0
          }
        },
        y: {
          ticks: {
            color: "#9CA3AF"
          }
        }
      }
    }
  });
}

function renderSmartAlerts(txns) {

  const el = document.getElementById("smartAlertBox");
  if (!el) return;

  let income = 0;
  let expense = 0;

  txns.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expense += Math.abs(t.amount);
  });

  let alertHTML = "";

  // 🚨 Overspending
  if (expense > income) {
    alertHTML += `
      <div class="bg-red-900/30 text-red-400 p-2 rounded-lg">
        ⚠️ You are overspending more than your income
      </div>
    `;
  }

  // ⚠️ High expense ratio
  else if (expense > income * 0.8) {
    alertHTML += `
      <div class="bg-yellow-900/30 text-yellow-400 p-2 rounded-lg">
        ⚠️ Expenses are close to income (Risk zone)
      </div>
    `;
  }

  // ✅ Healthy
  else {
    alertHTML += `
      <div class="bg-green-900/30 text-green-400 p-2 rounded-lg">
        ✅ Financial health looks good
      </div>
    `;
  }

  el.innerHTML = alertHTML;
}

function renderAdvancedInsights(txns) {

  const el = document.getElementById("aiInsightsAdvanced");
  if (!el) return;

  const categories = detectCategories(txns);
  const monthly = compareMonthly(txns);

  let html = "";

  /* ================= TOTALS ================= */
  let income = 0, expense = 0;

  txns.forEach(t => {
    const amt = Number(t.amount || 0);
    if (amt > 0) income += amt;
    else expense += Math.abs(amt);
  });

  /* ================= 🚨 DANGER ALERT ================= */
  if (expense > income && income > 0) {
    const diff = expense - income;

    html += `
      <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <div class="text-xs text-gray-400 mb-1">⚠️ Alert</div>
        <div class="text-red-400 font-semibold">
          You are overspending by ₹${diff}
        </div>
      </div>
    `;
  }

  /* ================= 🔥 TOP CATEGORY ================= */
  const sortedCats = Object.entries(categories)
    .sort((a, b) => b[1] - a[1]);

  const topCat = sortedCats[0];

  if (topCat) {
    html += `
      <div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div class="text-xs text-gray-400 mb-1">Top Spending</div>
        <div class="text-yellow-400 font-semibold">
          🔥 ${topCat[0]}
        </div>
        <div class="text-xs text-gray-300">
          ₹${topCat[1]}
        </div>
      </div>
    `;
  }

  /* ================= 🤖 MONTH COMPARISON ================= */
  if (monthly) {

    const isOverspending = monthly.change >= 0;

    html += `
      <div class="p-3 rounded-lg 
        ${isOverspending
        ? "bg-red-500/10 border border-red-500/20"
        : "bg-green-500/10 border border-green-500/20"}">

        <div class="text-xs text-gray-400 mb-1">
          Monthly Insight
        </div>

        <div class="${isOverspending ? "text-red-400" : "text-green-400"} font-semibold">
          🤖 ${Math.abs(monthly.change)}% 
          ${isOverspending ? "more spent" : "saved"} vs last month
        </div>

      </div>
    `;
  }

  /* ================= 📊 CATEGORY WITH PROGRESS ================= */

  const maxVal = sortedCats[0]?.[1] || 1;

  html += `
    <div class="p-3 rounded-lg bg-gray-900">

      <div class="text-xs text-gray-400 mb-2">
        📊 Category Breakdown
      </div>

      <div class="space-y-2">

        ${sortedCats.slice(0, 5).map(([name, val]) => {

    const percent = Math.round((val / maxVal) * 100);

    return `
            <div>

              <div class="flex justify-between text-xs mb-1">
                <span>${name}</span>
                <span>₹${val}</span>
              </div>

              <div class="w-full bg-gray-800 h-2 rounded">
                <div 
                  class="h-2 rounded bg-gradient-to-r from-purple-500 to-blue-500"
                  style="width:${percent}%">
                </div>
              </div>

            </div>
          `;

  }).join("")}

      </div>

    </div>
  `;

  /* ================= 🤖 AI SUGGESTIONS ================= */

  let suggestions = [];

  if (expense > income) {
    suggestions.push("Reduce unnecessary expenses to balance cashflow");
  }

  if (topCat) {
    suggestions.push(`Try optimizing your ${topCat[0]} spending`);
  }

  if (monthly && monthly.change > 10) {
    suggestions.push("Spending increased significantly — review recent transactions");
  }

  if (suggestions.length === 0) {
    suggestions.push("Your finances look stable 👍");
  }

  html += `
    <div class="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">

      <div class="text-xs text-gray-400 mb-2">
        🤖 Smart Suggestions
      </div>

      <div class="space-y-1 text-xs text-purple-300">

        ${suggestions.slice(0, 3).map(s => `
          <div>• ${s}</div>
        `).join("")}

      </div>

    </div>
  `;

  /* ================= FINAL ================= */
  el.innerHTML = `<div class="space-y-3">${html}</div>`;
}

function detectCategories(txns) {

  const map = {};

  txns.forEach(t => {

    const name = (t.account_name || t.account || "").toLowerCase();

    let category = "Other";

    if (name.includes("swiggy") || name.includes("zomato") || name.includes("hotel"))
      category = "Food 🍔";

    else if (name.includes("petrol") || name.includes("uber") || name.includes("ola"))
      category = "Travel ⛽";

    else if (name.includes("amazon") || name.includes("flipkart"))
      category = "Shopping 🛒";

    else if (name.includes("rent"))
      category = "Rent 🏠";

    else if (name.includes("salary"))
      category = "Income 💰";

    const amt = Math.abs(Number(t.amount || 0));

    map[category] = (map[category] || 0) + amt;
  });

  return map;
}

function compareMonthly(txns) {

  const now = new Date();
  const currentMonth = now.getMonth();
  const lastMonth = currentMonth - 1;

  let current = 0;
  let previous = 0;

  txns.forEach(t => {

    const d = new Date(t.date);
    if (isNaN(d)) return;

    const amt = Math.abs(Number(t.amount || 0));

    if (d.getMonth() === currentMonth) current += amt;
    else if (d.getMonth() === lastMonth) previous += amt;
  });

  if (!previous) return null;

  const change = ((current - previous) / previous * 100).toFixed(1);

  return {
    current,
    previous,
    change: Number(change)
  };
}

/* =========================================================
   CASHBOOK ACCOUNT STATEMENT
   ========================================================= */


/*
 * IMPORTANT:
 *
 * This feature deliberately uses:
 *
 * window.currentAccount
 * window.currentTxns
 *
 * Both are already maintained by the existing
 * Cashbook account screen.
 *
 * No existing Cashbook state is redeclared.
 */


window.currentCashbookStatementSummary =
  null;


/* =========================================================
   CASHBOOK STATEMENT DATE KEY
   ========================================================= */

function getCashStatementDateKey(
  value
) {

  if (!value) {
    return "";
  }


  const raw =
    String(value).trim();


  /*
   * Prefer an existing YYYY-MM-DD date.
   *
   * This avoids unnecessary timezone conversion.
   */

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (match) {

    return (
      `${match[1]}-${match[2]}-${match[3]}`
    );

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    )
      .padStart(
        2,
        "0"
      );


  const day =
    String(
      date.getDate()
    )
      .padStart(
        2,
        "0"
      );


  return (
    `${year}-${month}-${day}`
  );

}


/* =========================================================
   CASHBOOK STATEMENT DISPLAY DATE
   ========================================================= */

function formatCashStatementDate(
  value
) {

  const key =
    getCashStatementDateKey(
      value
    );


  if (!key) {
    return "-";
  }


  const parts =
    key.split("-");


  return (
    `${parts[2]}/${parts[1]}/${parts[0]}`
  );

}


/* =========================================================
   CASHBOOK STATEMENT MONEY
   ========================================================= */

function formatCashStatementMoney(
  value
) {

  return (
    Number(value) || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

}


/* =========================================================
   CASHBOOK STATEMENT BALANCE
   ========================================================= */

function getCashStatementBalanceInfo(
  balance
) {

  const value =
    Number(balance) || 0;


  if (value > 0) {

    return {

      value,

      text:
        `₹${formatCashStatementMoney(
          value
        )}`,

      className:
        "text-green-400"

    };

  }


  if (value < 0) {

    return {

      value,

      text:
        `-₹${formatCashStatementMoney(
          Math.abs(value)
        )}`,

      className:
        "text-red-400"

    };

  }


  return {

    value: 0,

    text: "₹0",

    className:
      "text-gray-300"

  };

}


/* =========================================================
   SORT CASHBOOK TRANSACTIONS
   ========================================================= */

function sortCashStatementTransactions(
  txns
) {

  return [
    ...(Array.isArray(txns)
      ? txns
      : [])
  ].sort(
    (a, b) => {

      const dateA =
        getCashStatementDateKey(
          a.date
        );


      const dateB =
        getCashStatementDateKey(
          b.date
        );


      if (
        dateA === dateB
      ) {

        /*
         * Preserve existing API order when
         * transactions have the same date.
         */

        return 0;

      }


      return (
        dateA < dateB
          ? -1
          : 1
      );

    }
  );

}


/* =========================================================
   CALCULATE CASHBOOK STATEMENT
   ========================================================= */

function calculateCashbookStatement(
  from = "",
  to = ""
) {

  const allTxns =
    sortCashStatementTransactions(
      window.currentTxns || []
    );


  let openingBalance = 0;

  let totalIn = 0;

  let totalOut = 0;


  const transactions = [];


  allTxns.forEach(
    txn => {

      const date =
        getCashStatementDateKey(
          txn.date
        );


      if (!date) {
        return;
      }


      const amount =
        Number(
          txn.amount
        ) || 0;


      // ===================================================
      // BEFORE FROM DATE
      //
      // Everything before the statement period contributes
      // to Opening Balance.
      // ===================================================

      if (
        from &&
        date < from
      ) {

        openingBalance +=
          amount;

        return;

      }


      // ===================================================
      // AFTER TO DATE
      // ===================================================

      if (
        to &&
        date > to
      ) {

        return;

      }


      // ===================================================
      // STATEMENT PERIOD
      // ===================================================

      transactions.push(
        txn
      );


      if (
        amount > 0
      ) {

        totalIn +=
          amount;

      } else {

        totalOut +=
          Math.abs(
            amount
          );

      }

    }
  );


  const closingBalance =
    openingBalance +
    totalIn -
    totalOut;


  return {

    from,

    to,

    openingBalance,

    totalIn,

    totalOut,

    closingBalance,

    transactions

  };

}


/* =========================================================
   STATEMENT PERIOD TEXT
   ========================================================= */

function getCashStatementPeriodText(
  from,
  to
) {

  if (
    !from &&
    !to
  ) {

    return "All transactions";

  }


  if (
    from &&
    to
  ) {

    return (
      `${formatCashStatementDate(from)} to ` +
      `${formatCashStatementDate(to)}`
    );

  }


  if (from) {

    return (
      `From ${formatCashStatementDate(
        from
      )}`
    );

  }


  return (
    `Up to ${formatCashStatementDate(
      to
    )}`
  );

}


/* =========================================================
   OPEN CASHBOOK STATEMENT
   ========================================================= */

function openCashbookStatement() {

  const account =
    window.currentAccount;


  const txns =
    window.currentTxns;


  // =======================================================
  // VALIDATE EXISTING CASHBOOK STATE
  // =======================================================

  if (
    !account ||
    !account.id
  ) {

    showToast(
      "Open a Cashbook account first ❌",
      "error"
    );

    return;

  }


  if (
    !Array.isArray(txns)
  ) {

    showToast(
      "Cashbook transactions are not available ❌",
      "error"
    );

    return;

  }


  const panel =
    document.getElementById(
      "rightPanel"
    );


  if (!panel) {

    console.error(
      "Cashbook statement: rightPanel not found"
    );

    return;

  }


  // =======================================================
  // INITIAL STATE
  // =======================================================

  window.currentCashbookStatementSummary =
    calculateCashbookStatement(
      "",
      ""
    );


  // =======================================================
  // PANEL
  // =======================================================

  panel.innerHTML = `

    <div
      class="
        h-full
        flex
        flex-col
        bg-gray-950
      "
    >

      <!-- =================================================
           HEADER
           ================================================= -->

      <div
        class="
          p-4
          border-b
          border-gray-700
          bg-gray-900
          flex
          flex-wrap
          justify-between
          items-center
          gap-3
        "
      >

        <div
          class="
            flex
            items-center
            gap-3
            min-w-0
          "
        >

          <button
            type="button"
            onclick="closeCashbookStatement()"
            class="
              bg-gray-700
              hover:bg-gray-600
              px-3
              py-2
              rounded-lg
            "
          >
            ←
          </button>


          <div
            class="
              min-w-0
            "
          >

            <div
              class="
                text-xl
                font-bold
                truncate
              "
            >
              ${escapeHtml(
                account.name || "Cashbook"
              )}
            </div>


            <div
              class="
                text-xs
                text-gray-400
              "
            >
              Account Statement
            </div>

          </div>

        </div>


        <!-- ACTIONS -->

        <div
          class="
            flex
            flex-wrap
            gap-2
          "
        >

          <button
            type="button"
            onclick="printCashbookStatement()"
            class="
              border
              border-gray-600
              hover:bg-gray-700
              px-3
              py-2
              rounded-lg
              text-sm
            "
          >
            🖨 PDF / Print
          </button>


          <button
            type="button"
            onclick="exportCashbookStatementExcel()"
            class="
              border
              border-gray-600
              hover:bg-gray-700
              px-3
              py-2
              rounded-lg
              text-sm
            "
          >
            📊 Excel
          </button>


          <button
            type="button"
            onclick="shareCashbookStatementWhatsApp()"
            class="
              bg-green-600
              hover:bg-green-700
              px-3
              py-2
              rounded-lg
              text-sm
              text-white
            "
          >
            💬 WhatsApp
          </button>

        </div>

      </div>


      <!-- =================================================
           FILTER
           ================================================= -->

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
            flex
            flex-wrap
            items-end
            gap-2
          "
        >

          <!-- PERIOD -->

          <div>

            <label
              class="
                block
                text-xs
                text-gray-400
                mb-1
              "
            >
              Period
            </label>


            <select
              id="cashStatementPeriod"

              onchange="
                handleCashStatementPeriod()
              "

              class="
                bg-black
                border
                border-gray-700
                rounded-lg
                p-2
              "
            >

              <option value="">
                All Time
              </option>

              <option value="this">
                This Month
              </option>

              <option value="last">
                Last Month
              </option>

              <option value="custom">
                Custom
              </option>

            </select>

          </div>


          <!-- FROM -->

          <div>

            <label
              class="
                block
                text-xs
                text-gray-400
                mb-1
              "
            >
              From Date
            </label>


            <input
              id="cashStatementFromDate"
              type="date"

              class="
                bg-black
                border
                border-gray-700
                rounded-lg
                p-2
              "
            >

          </div>


          <!-- TO -->

          <div>

            <label
              class="
                block
                text-xs
                text-gray-400
                mb-1
              "
            >
              To Date
            </label>


            <input
              id="cashStatementToDate"
              type="date"

              class="
                bg-black
                border
                border-gray-700
                rounded-lg
                p-2
              "
            >

          </div>


          <!-- APPLY -->

          <button
            type="button"
            onclick="applyCashbookStatementFilter()"
            class="
              bg-blue-600
              hover:bg-blue-700
              px-4
              py-2
              rounded-lg
            "
          >
            Apply
          </button>


          <!-- RESET -->

          <button
            type="button"
            onclick="resetCashbookStatementFilter()"
            class="
              bg-gray-700
              hover:bg-gray-600
              px-4
              py-2
              rounded-lg
            "
          >
            All Time
          </button>

        </div>

      </div>


      <!-- =================================================
           PERIOD LABEL
           ================================================= -->

      <div
        id="cashStatementPeriodLabel"
        class="
          px-4
          pt-3
          text-xs
          text-gray-400
        "
      >
        All transactions
      </div>


      <!-- =================================================
           SUMMARY
           ================================================= -->

      <div
        class="
          p-4
          grid
          grid-cols-2
          xl:grid-cols-4
          gap-3
        "
      >

        <!-- OPENING -->

        <div
          class="
            bg-gray-900
            border
            border-gray-700
            p-4
            rounded-xl
          "
        >

          <div
            class="
              text-xs
              text-gray-400
            "
          >
            Opening Balance
          </div>


          <div
            id="cashStatementOpening"
            class="
              text-lg
              font-bold
              mt-1
            "
          >
            ₹0
          </div>

        </div>


        <!-- CASH IN -->

        <div
          class="
            bg-green-500/10
            border
            border-green-500/20
            p-4
            rounded-xl
          "
        >

          <div
            class="
              text-xs
              text-green-300
            "
          >
            Total Cash In
          </div>


          <div
            id="cashStatementTotalIn"
            class="
              text-xl
              font-bold
              text-green-400
              mt-1
            "
          >
            ₹0
          </div>

        </div>


        <!-- CASH OUT -->

        <div
          class="
            bg-red-500/10
            border
            border-red-500/20
            p-4
            rounded-xl
          "
        >

          <div
            class="
              text-xs
              text-red-300
            "
          >
            Total Cash Out
          </div>


          <div
            id="cashStatementTotalOut"
            class="
              text-xl
              font-bold
              text-red-400
              mt-1
            "
          >
            ₹0
          </div>

        </div>


        <!-- CLOSING -->

        <div
          class="
            bg-gray-900
            border
            border-gray-700
            p-4
            rounded-xl
          "
        >

          <div
            class="
              text-xs
              text-gray-400
            "
          >
            Closing Balance
          </div>


          <div
            id="cashStatementClosing"
            class="
              text-lg
              font-bold
              mt-1
            "
          >
            ₹0
          </div>

        </div>

      </div>


      <!-- =================================================
           TABLE
           ================================================= -->

      <div
        class="
          flex-1
          overflow-auto
          px-4
          pb-5
        "
      >

        <div
          class="
            min-w-[850px]
            border
            border-gray-800
            rounded-xl
            overflow-hidden
          "
        >

          <!-- TABLE HEADER -->

          <div
            class="
              grid
              grid-cols-[110px_1fr_100px_120px_120px_150px]
              bg-gray-900
              border-b
              border-gray-700
              text-xs
              text-gray-400
              font-medium
            "
          >

            <div class="p-3">
              Date
            </div>

            <div class="p-3">
              Details
            </div>

            <div class="p-3">
              Mode
            </div>

            <div class="p-3 text-right">
              Cash In
            </div>

            <div class="p-3 text-right">
              Cash Out
            </div>

            <div class="p-3 text-right">
              Balance
            </div>

          </div>


          <div
            id="cashStatementTable"
          >
          </div>

        </div>

      </div>

    </div>

  `;


  // =======================================================
  // INITIAL ALL-TIME STATEMENT
  // =======================================================

  renderCashbookStatement(
    "",
    ""
  );

}


/* =========================================================
   BACK TO CASHBOOK ACCOUNT
   ========================================================= */

function closeCashbookStatement() {

  if (
    !window.currentAccount
  ) {

    return;

  }


  /*
   * No API reload.
   *
   * Reuse the account and transaction objects
   * already in memory.
   */

  renderCashbookReport(
    window.currentAccount,
    window.currentTxns || []
  );

}


/* =========================================================
   RENDER CASHBOOK STATEMENT
   ========================================================= */

function renderCashbookStatement(
  from = "",
  to = ""
) {

  const summary =
    calculateCashbookStatement(
      from,
      to
    );


  window.currentCashbookStatementSummary =
    summary;


  // =======================================================
  // SUMMARY
  // =======================================================

  const opening =
    getCashStatementBalanceInfo(
      summary.openingBalance
    );


  const closing =
    getCashStatementBalanceInfo(
      summary.closingBalance
    );


  const openingEl =
    document.getElementById(
      "cashStatementOpening"
    );


  const totalInEl =
    document.getElementById(
      "cashStatementTotalIn"
    );


  const totalOutEl =
    document.getElementById(
      "cashStatementTotalOut"
    );


  const closingEl =
    document.getElementById(
      "cashStatementClosing"
    );


  const periodEl =
    document.getElementById(
      "cashStatementPeriodLabel"
    );


  if (openingEl) {

    openingEl.textContent =
      opening.text;


    openingEl.className =
      `text-lg font-bold mt-1 ${opening.className}`;

  }


  if (totalInEl) {

    totalInEl.textContent =
      `₹${formatCashStatementMoney(
        summary.totalIn
      )}`;

  }


  if (totalOutEl) {

    totalOutEl.textContent =
      `₹${formatCashStatementMoney(
        summary.totalOut
      )}`;

  }


  if (closingEl) {

    closingEl.textContent =
      closing.text;


    closingEl.className =
      `text-lg font-bold mt-1 ${closing.className}`;

  }


  if (periodEl) {

    periodEl.textContent =
      getCashStatementPeriodText(
        from,
        to
      );

  }


  renderCashbookStatementTable(
    summary
  );

}


/* =========================================================
   RENDER CASHBOOK STATEMENT TABLE
   ========================================================= */

function renderCashbookStatementTable(
  summary
) {

  const table =
    document.getElementById(
      "cashStatementTable"
    );


  if (!table) {
    return;
  }


  let runningBalance =
    Number(
      summary.openingBalance
    ) || 0;


  let html = "";


  const opening =
    getCashStatementBalanceInfo(
      runningBalance
    );


  // =======================================================
  // OPENING ROW
  // =======================================================

  html += `

    <div
      class="
        grid
        grid-cols-[110px_1fr_100px_120px_120px_150px]
        border-b
        border-gray-800
        bg-gray-900/50
        text-sm
      "
    >

      <div
        class="
          p-3
          text-gray-400
        "
      >
        ${
          summary.from
            ? formatCashStatementDate(
                summary.from
              )
            : "-"
        }
      </div>


      <div
        class="
          p-3
          font-semibold
        "
      >
        Opening Balance
      </div>


      <div class="p-3">
        -
      </div>


      <div class="p-3 text-right">
        -
      </div>


      <div class="p-3 text-right">
        -
      </div>


      <div
        class="
          p-3
          text-right
          font-semibold
          ${opening.className}
        "
      >
        ${opening.text}
      </div>

    </div>

  `;


  // =======================================================
  // TRANSACTIONS
  // =======================================================

  sortCashStatementTransactions(
    summary.transactions
  )
    .forEach(
      txn => {

        const amount =
          Number(
            txn.amount
          ) || 0;


        runningBalance +=
          amount;


        const balance =
          getCashStatementBalanceInfo(
            runningBalance
          );


        html += `

          <div
            class="
              grid
              grid-cols-[110px_1fr_100px_120px_120px_150px]
              border-b
              border-gray-800
              text-sm
              hover:bg-gray-900/40
            "
          >

            <div
              class="
                p-3
                text-gray-300
              "
            >
              ${formatCashStatementDate(
                txn.date
              )}
            </div>


            <div
              class="
                p-3
                break-words
              "
            >
              ${escapeHtml(
                txn.note || "-"
              )}
            </div>


            <div
              class="
                p-3
                text-gray-400
                capitalize
              "
            >
              ${escapeHtml(
                txn.mode || "-"
              )}
            </div>


            <div
              class="
                p-3
                text-right
                text-green-400
                font-medium
              "
            >
              ${
                amount > 0
                  ? `₹${formatCashStatementMoney(
                      amount
                    )}`
                  : "-"
              }
            </div>


            <div
              class="
                p-3
                text-right
                text-red-400
                font-medium
              "
            >
              ${
                amount < 0
                  ? `₹${formatCashStatementMoney(
                      Math.abs(amount)
                    )}`
                  : "-"
              }
            </div>


            <div
              class="
                p-3
                text-right
                font-medium
                ${balance.className}
              "
            >
              ${balance.text}
            </div>

          </div>

        `;

      }
    );


  // =======================================================
  // NO TRANSACTIONS
  // =======================================================

  if (
    summary.transactions.length === 0
  ) {

    html += `

      <div
        class="
          p-8
          text-center
          text-gray-400
          border-b
          border-gray-800
        "
      >
        No transactions in this period
      </div>

    `;

  }


  // =======================================================
  // CLOSING ROW
  // =======================================================

  const closing =
    getCashStatementBalanceInfo(
      summary.closingBalance
    );


  html += `

    <div
      class="
        grid
        grid-cols-[110px_1fr_100px_120px_120px_150px]
        bg-gray-900
        text-sm
        font-bold
      "
    >

      <div class="p-3">
      </div>


      <div class="p-3">
        Closing Balance
      </div>


      <div class="p-3">
      </div>


      <div
        class="
          p-3
          text-right
          text-green-400
        "
      >
        ₹${formatCashStatementMoney(
          summary.totalIn
        )}
      </div>


      <div
        class="
          p-3
          text-right
          text-red-400
        "
      >
        ₹${formatCashStatementMoney(
          summary.totalOut
        )}
      </div>


      <div
        class="
          p-3
          text-right
          ${closing.className}
        "
      >
        ${closing.text}
      </div>

    </div>

  `;


  table.innerHTML =
    html;

}


/* =========================================================
   APPLY CUSTOM STATEMENT FILTER
   ========================================================= */

function applyCashbookStatementFilter() {

  const from =
    document
      .getElementById(
        "cashStatementFromDate"
      )
      ?.value || "";


  const to =
    document
      .getElementById(
        "cashStatementToDate"
      )
      ?.value || "";


  if (
    from &&
    to &&
    from > to
  ) {

    showToast(
      "From date cannot be after To date ❌",
      "error"
    );

    return;

  }


  renderCashbookStatement(
    from,
    to
  );

}


/* =========================================================
   QUICK STATEMENT PERIOD
   ========================================================= */

function handleCashStatementPeriod() {

  const period =
    document
      .getElementById(
        "cashStatementPeriod"
      )
      ?.value || "";


  const fromEl =
    document.getElementById(
      "cashStatementFromDate"
    );


  const toEl =
    document.getElementById(
      "cashStatementToDate"
    );


  if (
    !fromEl ||
    !toEl
  ) {

    return;

  }


  // =======================================================
  // ALL TIME
  // =======================================================

  if (!period) {

    fromEl.value =
      "";


    toEl.value =
      "";


    renderCashbookStatement(
      "",
      ""
    );


    return;

  }


  // =======================================================
  // CUSTOM
  // =======================================================

  if (
    period === "custom"
  ) {

    fromEl.focus();

    return;

  }


  const today =
    new Date();


  let from = null;

  let to = null;


  // =======================================================
  // THIS MONTH
  // =======================================================

  if (
    period === "this"
  ) {

    from =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );


    to =
      today;

  }


  // =======================================================
  // LAST MONTH
  // =======================================================

  if (
    period === "last"
  ) {

    from =
      new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );


    to =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        0
      );

  }


  if (
    !from ||
    !to
  ) {

    return;

  }


  fromEl.value =
    getCashStatementDateKey(
      from
    );


  toEl.value =
    getCashStatementDateKey(
      to
    );


  renderCashbookStatement(
    fromEl.value,
    toEl.value
  );

}


/* =========================================================
   RESET CASHBOOK STATEMENT FILTER
   ========================================================= */

function resetCashbookStatementFilter() {

  const period =
    document.getElementById(
      "cashStatementPeriod"
    );


  const from =
    document.getElementById(
      "cashStatementFromDate"
    );


  const to =
    document.getElementById(
      "cashStatementToDate"
    );


  if (period) {
    period.value = "";
  }


  if (from) {
    from.value = "";
  }


  if (to) {
    to.value = "";
  }


  renderCashbookStatement(
    "",
    ""
  );

}


/* =========================================================
   CASHBOOK STATEMENT EXCEL
   ========================================================= */

function exportCashbookStatementExcel() {

  const summary =
    window.currentCashbookStatementSummary;


  const account =
    window.currentAccount;


  if (
    !summary ||
    !account
  ) {

    showToast(
      "Statement not available ❌",
      "error"
    );

    return;

  }


  if (
    typeof XLSX ===
    "undefined"
  ) {

    showToast(
      "Excel export library not available ❌",
      "error"
    );

    return;

  }


  const rows = [];


  let runningBalance =
    summary.openingBalance;


  rows.push({

    Date: "",

    Details:
      `Account: ${account.name || "Cashbook"}`,

    Mode: "",

    "Cash In": "",

    "Cash Out": "",

    Balance: ""

  });


  rows.push({

    Date: "",

    Details:
      `Period: ${getCashStatementPeriodText(
        summary.from,
        summary.to
      )}`,

    Mode: "",

    "Cash In": "",

    "Cash Out": "",

    Balance: ""

  });


  rows.push({

    Date:
      summary.from
        ? formatCashStatementDate(
            summary.from
          )
        : "",

    Details:
      "Opening Balance",

    Mode: "",

    "Cash In": "",

    "Cash Out": "",

    Balance:
      runningBalance

  });


  sortCashStatementTransactions(
    summary.transactions
  )
    .forEach(
      txn => {

        const amount =
          Number(
            txn.amount
          ) || 0;


        runningBalance +=
          amount;


        rows.push({

          Date:
            formatCashStatementDate(
              txn.date
            ),

          Details:
            txn.note || "",

          Mode:
            txn.mode || "",

          "Cash In":
            amount > 0
              ? amount
              : "",

          "Cash Out":
            amount < 0
              ? Math.abs(
                  amount
                )
              : "",

          Balance:
            runningBalance

        });

      }
    );


  rows.push({

    Date: "",

    Details:
      "TOTAL / CLOSING",

    Mode: "",

    "Cash In":
      summary.totalIn,

    "Cash Out":
      summary.totalOut,

    Balance:
      summary.closingBalance

  });


  const ws =
    XLSX.utils.json_to_sheet(
      rows
    );


  const wb =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Statement"
  );


  const safeName =
    String(
      account.name ||
      "cashbook"
    )
      .replace(
        /[^a-z0-9]/gi,
        "_"
      )
      .replace(
        /_+/g,
        "_"
      );


  XLSX.writeFile(
    wb,
    `${safeName}_statement.xlsx`
  );

}


/* =========================================================
   CASHBOOK STATEMENT PRINT HTML
   ========================================================= */

function buildCashbookStatementPrintHtml() {

  const summary =
    window.currentCashbookStatementSummary;


  const account =
    window.currentAccount;


  if (
    !summary ||
    !account
  ) {

    return "";

  }


  const businessName =
    document
      .getElementById(
        "businessSelect"
      )
      ?.selectedOptions?.[0]
      ?.text ||
    "Your Business";


  let runningBalance =
    summary.openingBalance;


  let rows = "";


  sortCashStatementTransactions(
    summary.transactions
  )
    .forEach(
      txn => {

        const amount =
          Number(
            txn.amount
          ) || 0;


        runningBalance +=
          amount;


        rows += `

          <tr>

            <td>
              ${formatCashStatementDate(
                txn.date
              )}
            </td>


            <td>
              ${escapeHtml(
                txn.note || "-"
              )}
            </td>


            <td>
              ${escapeHtml(
                txn.mode || "-"
              )}
            </td>


            <td class="number cash-in">

              ${
                amount > 0
                  ? `₹${formatCashStatementMoney(
                      amount
                    )}`
                  : "-"
              }

            </td>


            <td class="number cash-out">

              ${
                amount < 0
                  ? `₹${formatCashStatementMoney(
                      Math.abs(amount)
                    )}`
                  : "-"
              }

            </td>


            <td class="number">

              ${
                getCashStatementBalanceInfo(
                  runningBalance
                ).text
              }

            </td>

          </tr>

        `;

      }
    );


  if (!rows) {

    rows = `

      <tr>

        <td
          colspan="6"
          class="empty"
        >
          No transactions in this period
        </td>

      </tr>

    `;

  }


  const opening =
    getCashStatementBalanceInfo(
      summary.openingBalance
    );


  const closing =
    getCashStatementBalanceInfo(
      summary.closingBalance
    );


  return `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
  Cashbook Statement
</title>


<style>

  * {
    box-sizing:
      border-box;
  }


  body {

    margin:
      0;

    font-family:
      Arial,
      sans-serif;

    color:
      #111827;

    background:
      white;

  }


  .statement {

    max-width:
      1000px;

    margin:
      auto;

    padding:
      24px;

  }


  .header {

    display:
      flex;

    justify-content:
      space-between;

    gap:
      20px;

    border-bottom:
      2px solid #111827;

    padding-bottom:
      15px;

    margin-bottom:
      18px;

  }


  .business {

    font-size:
      22px;

    font-weight:
      700;

  }


  .subtitle {

    color:
      #6b7280;

    font-size:
      13px;

    margin-top:
      4px;

  }


  .generated {

    font-size:
      11px;

    color:
      #6b7280;

    text-align:
      right;

  }


  .account {

    border:
      1px solid #e5e7eb;

    border-radius:
      8px;

    padding:
      12px;

    margin-bottom:
      18px;

  }


  .account-name {

    font-size:
      18px;

    font-weight:
      bold;

  }


  .period {

    color:
      #6b7280;

    font-size:
      12px;

    margin-top:
      4px;

  }


  .summary {

    display:
      grid;

    grid-template-columns:
      repeat(4, 1fr);

    gap:
      10px;

    margin-bottom:
      18px;

  }


  .summary-card {

    border:
      1px solid #e5e7eb;

    border-radius:
      8px;

    padding:
      12px;

  }


  .summary-label {

    color:
      #6b7280;

    font-size:
      11px;

    margin-bottom:
      5px;

  }


  .summary-value {

    font-size:
      15px;

    font-weight:
      bold;

  }


  table {

    width:
      100%;

    border-collapse:
      collapse;

    font-size:
      11px;

  }


  th {

    background:
      #111827;

    color:
      white;

    padding:
      9px;

    text-align:
      left;

  }


  td {

    padding:
      9px;

    border-bottom:
      1px solid #e5e7eb;

  }


  .number {

    text-align:
      right;

  }


  .cash-in {

    color:
      #15803d;

  }


  .cash-out {

    color:
      #b91c1c;

  }


  .opening {

    background:
      #f9fafb;

    font-weight:
      bold;

  }


  .closing {

    background:
      #f9fafb;

    border-top:
      2px solid #111827;

    font-weight:
      bold;

  }


  .empty {

    text-align:
      center;

    color:
      #6b7280;

    padding:
      25px;

  }


  .footer {

    border-top:
      1px solid #e5e7eb;

    margin-top:
      25px;

    padding-top:
      10px;

    text-align:
      center;

    font-size:
      10px;

    color:
      #6b7280;

  }


  @page {

    size:
      A4;

    margin:
      12mm;

  }


  @media print {

    .statement {

      max-width:
        none;

      padding:
        0;

    }

  }

</style>

</head>


<body>


<div class="statement">


  <div class="header">

    <div>

      <div class="business">

        ${escapeHtml(
          businessName
        )}

      </div>


      <div class="subtitle">
        Cashbook Account Statement
      </div>

    </div>


    <div class="generated">

      Generated:
      ${escapeHtml(
        new Date()
          .toLocaleString(
            "en-IN"
          )
      )}

    </div>

  </div>


  <div class="account">

    <div class="account-name">

      ${escapeHtml(
        account.name ||
        "Cashbook"
      )}

    </div>


    <div class="period">

      Statement Period:
      ${escapeHtml(
        getCashStatementPeriodText(
          summary.from,
          summary.to
        )
      )}

    </div>

  </div>


  <div class="summary">


    <div class="summary-card">

      <div class="summary-label">
        Opening Balance
      </div>

      <div class="summary-value">

        ${opening.text}

      </div>

    </div>


    <div class="summary-card">

      <div class="summary-label">
        Total Cash In
      </div>

      <div class="summary-value">

        ₹${formatCashStatementMoney(
          summary.totalIn
        )}

      </div>

    </div>


    <div class="summary-card">

      <div class="summary-label">
        Total Cash Out
      </div>

      <div class="summary-value">

        ₹${formatCashStatementMoney(
          summary.totalOut
        )}

      </div>

    </div>


    <div class="summary-card">

      <div class="summary-label">
        Closing Balance
      </div>

      <div class="summary-value">

        ${closing.text}

      </div>

    </div>


  </div>


  <table>

    <thead>

      <tr>

        <th>
          Date
        </th>

        <th>
          Details
        </th>

        <th>
          Mode
        </th>

        <th class="number">
          Cash In
        </th>

        <th class="number">
          Cash Out
        </th>

        <th class="number">
          Balance
        </th>

      </tr>

    </thead>


    <tbody>


      <tr class="opening">

        <td>

          ${
            summary.from
              ? formatCashStatementDate(
                  summary.from
                )
              : "-"
          }

        </td>


        <td>
          Opening Balance
        </td>


        <td>
          -
        </td>


        <td class="number">
          -
        </td>


        <td class="number">
          -
        </td>


        <td class="number">

          ${opening.text}

        </td>

      </tr>


      ${rows}


      <tr class="closing">

        <td colspan="3">
          Closing Balance
        </td>


        <td class="number cash-in">

          ₹${formatCashStatementMoney(
            summary.totalIn
          )}

        </td>


        <td class="number cash-out">

          ₹${formatCashStatementMoney(
            summary.totalOut
          )}

        </td>


        <td class="number">

          ${closing.text}

        </td>

      </tr>


    </tbody>

  </table>


  <div class="footer">

    Cashbook statement generated from
    ${escapeHtml(
      businessName
    )}.

  </div>


</div>


</body>

</html>

  `;

}


/* =========================================================
   PRINT / SAVE AS PDF
   ========================================================= */

function printCashbookStatement() {

  const html =
    buildCashbookStatementPrintHtml();


  if (!html) {

    showToast(
      "Statement not available ❌",
      "error"
    );

    return;

  }


  const win =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );


  if (!win) {

    showToast(
      "Please allow pop-ups to print the statement ❌",
      "error"
    );

    return;

  }


  win.document.open();

  win.document.write(
    html
  );

  win.document.close();


  win.focus();


  setTimeout(
    () => {

      win.print();

    },
    300
  );

}


/* =========================================================
   WHATSAPP STATEMENT TEXT
   ========================================================= */

function buildCashbookStatementWhatsAppText() {

  const summary =
    window.currentCashbookStatementSummary;


  const account =
    window.currentAccount;


  if (
    !summary ||
    !account
  ) {

    return "";

  }


  const businessName =
    document
      .getElementById(
        "businessSelect"
      )
      ?.selectedOptions?.[0]
      ?.text ||
    "Your Business";


  const opening =
    getCashStatementBalanceInfo(
      summary.openingBalance
    );


  const closing =
    getCashStatementBalanceInfo(
      summary.closingBalance
    );


  return [

    `*${businessName}*`,

    `*Cashbook Account Statement*`,

    ``,

    `Account: ${account.name || "Cashbook"}`,

    `Period: ${getCashStatementPeriodText(
      summary.from,
      summary.to
    )}`,

    ``,

    `Opening Balance: ${opening.text}`,

    `Total Cash In: ₹${formatCashStatementMoney(
      summary.totalIn
    )}`,

    `Total Cash Out: ₹${formatCashStatementMoney(
      summary.totalOut
    )}`,

    `Closing Balance: ${closing.text}`,

    ``,

    `Transactions: ${summary.transactions.length}`

  ].join(
    "\n"
  );

}


/* =========================================================
   SHARE CASHBOOK STATEMENT TO WHATSAPP
   ========================================================= */

function shareCashbookStatementWhatsApp() {

  const message =
    buildCashbookStatementWhatsAppText();


  if (!message) {

    showToast(
      "Statement not available ❌",
      "error"
    );

    return;

  }


  /*
   * Cashbook account currently has no verified
   * WhatsApp recipient field in the account object.
   *
   * Therefore open WhatsApp's share chooser rather
   * than guessing a phone number.
   */

  const url =
    "https://wa.me/?text=" +
    encodeURIComponent(
      message
    );


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}

/* =========================================================
   CASHBOOK REPORTING ENGINE
   ========================================================= */


/*
 * This reporting module reads:
 *
 * window.summaryTxns
 *
 * It does NOT modify transactions.
 * It does NOT modify accounts.
 * It does NOT call the backend.
 */


window.cashReportData =
  null;


window.cashReportDailyChartInstance =
  null;


window.cashReportMonthlyChartInstance =
  null;


/* =========================================================
   REPORT MONEY FORMAT
   ========================================================= */

function cashReportMoney(value) {

  return (
    Number(value) || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

}


/* =========================================================
   SAFE REPORT DATE KEY
   ========================================================= */

function cashReportDateKey(value) {

  if (!value) {
    return "";
  }


  const raw =
    String(value).trim();


  const direct =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (direct) {

    return (
      `${direct[1]}-${direct[2]}-${direct[3]}`
    );

  }


  const d =
    new Date(value);


  if (
    Number.isNaN(
      d.getTime()
    )
  ) {

    return "";

  }


  const year =
    d.getFullYear();


  const month =
    String(
      d.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      d.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


/* =========================================================
   REPORT DISPLAY DATE
   ========================================================= */

function cashReportDisplayDate(value) {

  const key =
    cashReportDateKey(
      value
    );


  if (!key) {
    return "-";
  }


  const [
    year,
    month,
    day
  ] =
    key.split("-");


  return (
    `${day}/${month}/${year}`
  );

}


/* =========================================================
   CATEGORY FROM NOTE
   ========================================================= */

/*
 * No category field currently exists in the verified
 * transaction-entry data.
 *
 * Therefore categories are derived from the existing
 * transaction note.
 *
 * This does not change saved transactions.
 */

function getCashReportCategory(note = "") {

  const text =
    String(
      note || ""
    )
      .trim()
      .toLowerCase();


  if (!text) {
    return "Uncategorized";
  }


  if (
    text.includes("salary") ||
    text.includes("wages") ||
    text.includes("payroll")
  ) {
    return "Salary";
  }


  if (
    text.includes("rent")
  ) {
    return "Rent";
  }


  if (
    text.includes("food") ||
    text.includes("hotel") ||
    text.includes("restaurant") ||
    text.includes("tea") ||
    text.includes("lunch") ||
    text.includes("dinner")
  ) {
    return "Food";
  }


  if (
    text.includes("fuel") ||
    text.includes("petrol") ||
    text.includes("diesel")
  ) {
    return "Fuel";
  }


  if (
    text.includes("shop") ||
    text.includes("amazon") ||
    text.includes("purchase")
  ) {
    return "Shopping";
  }


  if (
    text.includes("sale") ||
    text.includes("sales") ||
    text.includes("customer")
  ) {
    return "Sales";
  }


  if (
    text.includes("electric") ||
    text.includes("eb bill") ||
    text.includes("water") ||
    text.includes("internet") ||
    text.includes("phone") ||
    text.includes("mobile bill")
  ) {
    return "Utilities";
  }


  if (
    text.includes("travel") ||
    text.includes("bus") ||
    text.includes("train") ||
    text.includes("taxi") ||
    text.includes("auto")
  ) {
    return "Travel";
  }


  if (
    text.includes("maintenance") ||
    text.includes("repair") ||
    text.includes("service")
  ) {
    return "Maintenance";
  }


  if (
    text.includes("loan") ||
    text.includes("emi")
  ) {
    return "Loan / EMI";
  }


  if (
    text.includes("tax") ||
    text.includes("gst")
  ) {
    return "Tax";
  }


  return "Other";

}


/* =========================================================
   EMPTY GROUP
   ========================================================= */

function createCashReportGroup() {

  return {

    income: 0,

    expense: 0,

    net: 0,

    count: 0

  };

}


/* =========================================================
   ADD TRANSACTION TO GROUP
   ========================================================= */

function addCashReportAmount(
  group,
  amount
) {

  const value =
    Number(amount) || 0;


  if (
    value > 0
  ) {

    group.income +=
      value;

  } else if (
    value < 0
  ) {

    group.expense +=
      Math.abs(
        value
      );

  }


  group.net +=
    value;


  group.count +=
    1;

}


/* =========================================================
   BUILD CASHBOOK REPORT
   ========================================================= */

function buildCashbookReport(
  txns
) {

  const rows =
    Array.isArray(txns)
      ? txns
      : [];


  let totalIncome = 0;

  let totalExpense = 0;


  const accountMap = {};

  const modeMap = {};

  const dailyMap = {};

  const monthlyMap = {};

  const categoryMap = {};


  rows.forEach(
    txn => {

      const amount =
        Number(
          txn.amount
        ) || 0;


      if (
        amount > 0
      ) {

        totalIncome +=
          amount;

      } else if (
        amount < 0
      ) {

        totalExpense +=
          Math.abs(
            amount
          );

      }


      // ===================================================
      // ACCOUNT
      // ===================================================

      const account =
        String(
          txn.account ||
          txn.account_name ||
          txn.accountName ||
          "Unknown"
        ).trim() ||
        "Unknown";


      if (
        !accountMap[account]
      ) {

        accountMap[account] =
          createCashReportGroup();

      }


      addCashReportAmount(
        accountMap[account],
        amount
      );


      // ===================================================
      // PAYMENT MODE
      // ===================================================

      const mode =
        String(
          txn.mode ||
          "Unknown"
        )
          .trim()
          .toLowerCase() ||
        "unknown";


      if (
        !modeMap[mode]
      ) {

        modeMap[mode] =
          createCashReportGroup();

      }


      addCashReportAmount(
        modeMap[mode],
        amount
      );


      // ===================================================
      // DATE
      // ===================================================

      const date =
        cashReportDateKey(
          txn.date
        );


      if (date) {

        if (
          !dailyMap[date]
        ) {

          dailyMap[date] =
            createCashReportGroup();

        }


        addCashReportAmount(
          dailyMap[date],
          amount
        );


        const month =
          date.substring(
            0,
            7
          );


        if (
          !monthlyMap[month]
        ) {

          monthlyMap[month] =
            createCashReportGroup();

        }


        addCashReportAmount(
          monthlyMap[month],
          amount
        );

      }


      // ===================================================
      // CATEGORY
      // ===================================================

      const category =
        getCashReportCategory(
          txn.note
        );


      if (
        !categoryMap[category]
      ) {

        categoryMap[category] =
          createCashReportGroup();

      }


      addCashReportAmount(
        categoryMap[category],
        amount
      );

    }
  );


  const accounts =
    Object.entries(
      accountMap
    )
      .map(
        ([name, values]) => ({

          name,

          ...values

        })
      )
      .sort(
        (a, b) =>
          Math.abs(b.net) -
          Math.abs(a.net)
      );


  const modes =
    Object.entries(
      modeMap
    )
      .map(
        ([name, values]) => ({

          name,

          movement:
            values.income +
            values.expense,

          ...values

        })
      )
      .sort(
        (a, b) =>
          b.movement -
          a.movement
      );


  const daily =
    Object.entries(
      dailyMap
    )
      .map(
        ([date, values]) => ({

          date,

          ...values

        })
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );


  const monthly =
    Object.entries(
      monthlyMap
    )
      .map(
        ([month, values]) => ({

          month,

          ...values

        })
      )
      .sort(
        (a, b) =>
          a.month.localeCompare(
            b.month
          )
      );


  const categories =
    Object.entries(
      categoryMap
    )
      .map(
        ([name, values]) => ({

          name,

          ...values

        })
      )
      .sort(
        (a, b) =>
          b.expense -
          a.expense
      );


  return {

    totalIncome,

    totalExpense,

    net:
      totalIncome -
      totalExpense,

    count:
      rows.length,

    accounts,

    modes,

    daily,

    monthly,

    categories,

    transactions:
      rows

  };

}


/* =========================================================
   FILTER REPORT TRANSACTIONS
   ========================================================= */

function getFilteredCashReportTxns() {

  const source =
    Array.isArray(
      window.summaryTxns
    )
      ? window.summaryTxns
      : [];


  const from =
    document
      .getElementById(
        "cashReportFrom"
      )
      ?.value || "";


  const to =
    document
      .getElementById(
        "cashReportTo"
      )
      ?.value || "";


  return source.filter(
    txn => {

      const date =
        cashReportDateKey(
          txn.date
        );


      if (!date) {
        return false;
      }


      if (
        from &&
        date < from
      ) {

        return false;

      }


      if (
        to &&
        date > to
      ) {

        return false;

      }


      return true;

    }
  );

}


/* =========================================================
   REPORT PERIOD FILTER
   ========================================================= */

function setCashReportPeriod(
  period
) {

  const fromEl =
    document.getElementById(
      "cashReportFrom"
    );


  const toEl =
    document.getElementById(
      "cashReportTo"
    );


  if (
    !fromEl ||
    !toEl
  ) {

    return;

  }


  if (
    period === "custom"
  ) {

    fromEl.focus();

    return;

  }


  const now =
    new Date();


  let from = "";

  let to = "";


  if (
    period === "today"
  ) {

    from =
      cashReportDateKey(
        now
      );


    to =
      from;

  }


  if (
    period === "month"
  ) {

    from =
      cashReportDateKey(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        )
      );


    to =
      cashReportDateKey(
        now
      );

  }


  if (
    period === "lastMonth"
  ) {

    from =
      cashReportDateKey(
        new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        )
      );


    to =
      cashReportDateKey(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          0
        )
      );

  }


  fromEl.value =
    from;


  toEl.value =
    to;


  renderCashbookReports(
    getFilteredCashReportTxns()
  );

}


/* =========================================================
   APPLY REPORT FILTER
   ========================================================= */

function applyCashbookReportFilter() {

  const from =
    document
      .getElementById(
        "cashReportFrom"
      )
      ?.value || "";


  const to =
    document
      .getElementById(
        "cashReportTo"
      )
      ?.value || "";


  if (
    from &&
    to &&
    from > to
  ) {

    showToast(
      "From date cannot be after To date ❌",
      "error"
    );

    return;

  }


  renderCashbookReports(
    getFilteredCashReportTxns()
  );

}


/* =========================================================
   RESET REPORT FILTER
   ========================================================= */

function resetCashbookReportFilter() {

  const period =
    document.getElementById(
      "cashReportPeriod"
    );


  const from =
    document.getElementById(
      "cashReportFrom"
    );


  const to =
    document.getElementById(
      "cashReportTo"
    );


  if (period) {
    period.value = "all";
  }


  if (from) {
    from.value = "";
  }


  if (to) {
    to.value = "";
  }


  renderCashbookReports(
    window.summaryTxns || []
  );

}


/* =========================================================
   MAIN REPORT RENDER
   ========================================================= */

function renderCashbookReports(
  txns
) {

  const report =
    buildCashbookReport(
      txns
    );


  window.cashReportData =
    report;


  // =======================================================
  // KPI
  // =======================================================

  const incomeEl =
    document.getElementById(
      "cashReportIncome"
    );


  const expenseEl =
    document.getElementById(
      "cashReportExpense"
    );


  const netEl =
    document.getElementById(
      "cashReportNet"
    );


  const countEl =
    document.getElementById(
      "cashReportCount"
    );


  if (incomeEl) {

    incomeEl.textContent =
      `₹${cashReportMoney(
        report.totalIncome
      )}`;

  }


  if (expenseEl) {

    expenseEl.textContent =
      `₹${cashReportMoney(
        report.totalExpense
      )}`;

  }


  if (netEl) {

    netEl.textContent =
      `${
        report.net < 0
          ? "-"
          : ""
      }₹${cashReportMoney(
        Math.abs(report.net)
      )}`;


    netEl.className =
      report.net >= 0
        ? "text-green-400 font-bold text-xl mt-1"
        : "text-red-400 font-bold text-xl mt-1";

  }


  if (countEl) {

    countEl.textContent =
      report.count;

  }


  // =======================================================
  // PERIOD LABEL
  // =======================================================

  const periodText =
    document.getElementById(
      "cashReportPeriodText"
    );


  const from =
    document
      .getElementById(
        "cashReportFrom"
      )
      ?.value || "";


  const to =
    document
      .getElementById(
        "cashReportTo"
      )
      ?.value || "";


  if (periodText) {

    if (
      from &&
      to
    ) {

      periodText.textContent =
        `Showing ${cashReportDisplayDate(from)} to ${cashReportDisplayDate(to)}`;

    } else if (from) {

      periodText.textContent =
        `From ${cashReportDisplayDate(from)}`;

    } else if (to) {

      periodText.textContent =
        `Up to ${cashReportDisplayDate(to)}`;

    } else {

      periodText.textContent =
        "All transactions";

    }

  }


  renderCashReportAccounts(
    report.accounts
  );


  renderCashReportModes(
    report.modes
  );


  renderCashReportCategories(
    report.categories
  );


  renderCashReportDailyTable(
    report.daily
  );


  renderCashReportDailyChart(
    report.daily
  );


  renderCashReportMonthlyChart(
    report.monthly
  );

}


/* =========================================================
   ACCOUNT TABLE
   ========================================================= */

function renderCashReportAccounts(
  rows
) {

  const body =
    document.getElementById(
      "cashReportAccountBody"
    );


  if (!body) {
    return;
  }


  if (!rows.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="5"
          class="
            p-5
            text-center
            text-gray-500
          "
        >
          No account data
        </td>

      </tr>
    `;

    return;

  }


  body.innerHTML =
    rows.map(
      row => `

        <tr
          class="
            border-t
            border-gray-800
          "
        >

          <td
            class="
              p-3
              font-medium
            "
          >
            ${escapeHtml(
              row.name
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-green-400
            "
          >
            ₹${cashReportMoney(
              row.income
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-red-400
            "
          >
            ₹${cashReportMoney(
              row.expense
            )}
          </td>


          <td
            class="
              p-3
              text-right
              font-semibold
              ${
                row.net >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            "
          >
            ${
              row.net < 0
                ? "-"
                : ""
            }₹${cashReportMoney(
              Math.abs(row.net)
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-gray-400
            "
          >
            ${row.count}
          </td>

        </tr>

      `
    ).join("");

}


/* =========================================================
   MODE TABLE
   ========================================================= */

function renderCashReportModes(
  rows
) {

  const body =
    document.getElementById(
      "cashReportModeBody"
    );


  if (!body) {
    return;
  }


  if (!rows.length) {

    body.innerHTML = `

      <tr>
        <td
          colspan="5"
          class="
            p-5
            text-center
            text-gray-500
          "
        >
          No payment-mode data
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    rows.map(
      row => `

        <tr
          class="
            border-t
            border-gray-800
          "
        >

          <td
            class="
              p-3
              font-medium
              capitalize
            "
          >
            ${escapeHtml(
              row.name
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-green-400
            "
          >
            ₹${cashReportMoney(
              row.income
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-red-400
            "
          >
            ₹${cashReportMoney(
              row.expense
            )}
          </td>


          <td
            class="
              p-3
              text-right
            "
          >
            ₹${cashReportMoney(
              row.movement
            )}
          </td>


          <td
            class="
              p-3
              text-right
              font-semibold
              ${
                row.net >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            "
          >
            ${
              row.net < 0
                ? "-"
                : ""
            }₹${cashReportMoney(
              Math.abs(row.net)
            )}
          </td>

        </tr>

      `
    ).join("");

}


/* =========================================================
   CATEGORY TABLE
   ========================================================= */

function renderCashReportCategories(
  rows
) {

  const body =
    document.getElementById(
      "cashReportCategoryBody"
    );


  if (!body) {
    return;
  }


  if (!rows.length) {

    body.innerHTML = `

      <tr>
        <td
          colspan="5"
          class="
            p-5
            text-center
            text-gray-500
          "
        >
          No category data
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    rows.map(
      row => `

        <tr
          class="
            border-t
            border-gray-800
          "
        >

          <td
            class="
              p-3
              font-medium
            "
          >
            ${escapeHtml(
              row.name
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-green-400
            "
          >
            ₹${cashReportMoney(
              row.income
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-red-400
            "
          >
            ₹${cashReportMoney(
              row.expense
            )}
          </td>


          <td
            class="
              p-3
              text-right
              ${
                row.net >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            "
          >
            ${
              row.net < 0
                ? "-"
                : ""
            }₹${cashReportMoney(
              Math.abs(row.net)
            )}
          </td>


          <td
            class="
              p-3
              text-right
              text-gray-400
            "
          >
            ${row.count}
          </td>

        </tr>

      `
    ).join("");

}


/* =========================================================
   DAILY TABLE
   ========================================================= */

function renderCashReportDailyTable(
  rows
) {

  const body =
    document.getElementById(
      "cashReportDailyBody"
    );


  if (!body) {
    return;
  }


  if (!rows.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="5"
          class="
            p-5
            text-center
            text-gray-500
          "
        >
          No daily data
        </td>

      </tr>
    `;

    return;

  }


  body.innerHTML =
    [...rows]
      .reverse()
      .map(
        row => `

          <tr
            class="
              border-t
              border-gray-800
            "
          >

            <td class="p-3">

              ${cashReportDisplayDate(
                row.date
              )}

            </td>


            <td
              class="
                p-3
                text-right
                text-green-400
              "
            >
              ₹${cashReportMoney(
                row.income
              )}
            </td>


            <td
              class="
                p-3
                text-right
                text-red-400
              "
            >
              ₹${cashReportMoney(
                row.expense
              )}
            </td>


            <td
              class="
                p-3
                text-right
                ${
                  row.net >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }
              "
            >
              ${
                row.net < 0
                  ? "-"
                  : ""
              }₹${cashReportMoney(
                Math.abs(row.net)
              )}
            </td>


            <td
              class="
                p-3
                text-right
                text-gray-400
              "
            >
              ${row.count}
            </td>

          </tr>

        `
      ).join("");

}


/* =========================================================
   DAILY CHART
   ========================================================= */

function renderCashReportDailyChart(
  rows
) {

  const canvas =
    document.getElementById(
      "cashReportDailyChart"
    );


  if (
    !canvas ||
    typeof Chart ===
      "undefined"
  ) {

    return;

  }


  if (
    window.cashReportDailyChartInstance
  ) {

    window.cashReportDailyChartInstance
      .destroy();

  }


  window.cashReportDailyChartInstance =
    new Chart(
      canvas,
      {

        type:
          "line",

        data: {

          labels:
            rows.map(
              row =>
                cashReportDisplayDate(
                  row.date
                )
            ),

          datasets: [

            {

              label:
                "Income",

              data:
                rows.map(
                  row =>
                    row.income
                ),

              borderWidth:
                2,

              tension:
                0.25

            },

            {

              label:
                "Expense",

              data:
                rows.map(
                  row =>
                    row.expense
                ),

              borderWidth:
                2,

              tension:
                0.25

            }

          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false

        }

      }
    );

}


/* =========================================================
   MONTHLY CHART
   ========================================================= */

function renderCashReportMonthlyChart(
  rows
) {

  const canvas =
    document.getElementById(
      "cashReportMonthlyChart"
    );


  if (
    !canvas ||
    typeof Chart ===
      "undefined"
  ) {

    return;

  }


  if (
    window.cashReportMonthlyChartInstance
  ) {

    window.cashReportMonthlyChartInstance
      .destroy();

  }


  window.cashReportMonthlyChartInstance =
    new Chart(
      canvas,
      {

        type:
          "bar",

        data: {

          labels:
            rows.map(
              row =>
                row.month
            ),

          datasets: [

            {

              label:
                "Income",

              data:
                rows.map(
                  row =>
                    row.income
                )

            },

            {

              label:
                "Expense",

              data:
                rows.map(
                  row =>
                    row.expense
                )

            }

          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false

        }

      }
    );

}


/* =========================================================
   CASHBOOK REPORT EXCEL EXPORT
   ========================================================= */

function exportCashbookReportsExcel() {

  const report =
    window.cashReportData;


  if (!report) {

    showToast(
      "Report not available ❌",
      "error"
    );

    return;

  }


  if (
    typeof XLSX ===
    "undefined"
  ) {

    showToast(
      "Excel export library not available ❌",
      "error"
    );

    return;

  }


  const workbook =
    XLSX.utils.book_new();


  // =======================================================
  // OVERVIEW
  // =======================================================

  const overview = [

    {
      Metric:
        "Total Income",

      Value:
        report.totalIncome
    },

    {
      Metric:
        "Total Expense",

      Value:
        report.totalExpense
    },

    {
      Metric:
        "Net",

      Value:
        report.net
    },

    {
      Metric:
        "Transactions",

      Value:
        report.count
    }

  ];


  const overviewSheet =
    XLSX.utils.json_to_sheet(
      overview
    );


  XLSX.utils.book_append_sheet(
    workbook,
    overviewSheet,
    "Overview"
  );


  // =======================================================
  // ACCOUNTS
  // =======================================================

  const accountSheet =
    XLSX.utils.json_to_sheet(

      report.accounts.map(
        row => ({

          Account:
            row.name,

          Income:
            row.income,

          Expense:
            row.expense,

          Net:
            row.net,

          Transactions:
            row.count

        })
      )

    );


  XLSX.utils.book_append_sheet(
    workbook,
    accountSheet,
    "Accounts"
  );


  // =======================================================
  // PAYMENT MODES
  // =======================================================

  const modeSheet =
    XLSX.utils.json_to_sheet(

      report.modes.map(
        row => ({

          Mode:
            row.name,

          Income:
            row.income,

          Expense:
            row.expense,

          "Total Movement":
            row.movement,

          Net:
            row.net,

          Transactions:
            row.count

        })
      )

    );


  XLSX.utils.book_append_sheet(
    workbook,
    modeSheet,
    "Payment Modes"
  );


  // =======================================================
  // DAILY
  // =======================================================

  const dailySheet =
    XLSX.utils.json_to_sheet(

      report.daily.map(
        row => ({

          Date:
            cashReportDisplayDate(
              row.date
            ),

          Income:
            row.income,

          Expense:
            row.expense,

          Net:
            row.net,

          Transactions:
            row.count

        })
      )

    );


  XLSX.utils.book_append_sheet(
    workbook,
    dailySheet,
    "Daily"
  );


  // =======================================================
  // MONTHLY
  // =======================================================

  const monthlySheet =
    XLSX.utils.json_to_sheet(

      report.monthly.map(
        row => ({

          Month:
            row.month,

          Income:
            row.income,

          Expense:
            row.expense,

          Net:
            row.net,

          Transactions:
            row.count

        })
      )

    );


  XLSX.utils.book_append_sheet(
    workbook,
    monthlySheet,
    "Monthly"
  );


  // =======================================================
  // CATEGORIES
  // =======================================================

  const categorySheet =
    XLSX.utils.json_to_sheet(

      report.categories.map(
        row => ({

          Category:
            row.name,

          Income:
            row.income,

          Expense:
            row.expense,

          Net:
            row.net,

          Transactions:
            row.count

        })
      )

    );


  XLSX.utils.book_append_sheet(
    workbook,
    categorySheet,
    "Categories"
  );


  // =======================================================
  // RAW TRANSACTIONS
  // =======================================================

  const transactionSheet =
    XLSX.utils.json_to_sheet(

      report.transactions.map(
        txn => ({

          Date:
            cashReportDisplayDate(
              txn.date
            ),

          Account:
            txn.account || "",

          Type:
            Number(
              txn.amount
            ) >= 0
              ? "Income"
              : "Expense",

          Amount:
            Math.abs(
              Number(
                txn.amount
              ) || 0
            ),

          Mode:
            txn.mode || "",

          Category:
            getCashReportCategory(
              txn.note
            ),

          Note:
            txn.note || ""

        })
      )

    );


  XLSX.utils.book_append_sheet(
    workbook,
    transactionSheet,
    "Transactions"
  );


  // =======================================================
  // DOWNLOAD
  // =======================================================

  const from =
    document
      .getElementById(
        "cashReportFrom"
      )
      ?.value || "";


  const to =
    document
      .getElementById(
        "cashReportTo"
      )
      ?.value || "";


  let fileName =
    "cashbook_report";


  if (
    from ||
    to
  ) {

    fileName +=
      `_${from || "start"}_${to || "end"}`;

  }


  XLSX.writeFile(
    workbook,
    `${fileName}.xlsx`
  );

}