/* =========================================================
   CUSTOMER STATEMENT / REPORT
   ========================================================= */

async function openReportPanel(
  cid,
  name
) {

  try {

    showTinyLoader?.(
      "Loading statement..."
    );


    // =====================================================
    // LOAD COMPLETE CUSTOMER LEDGER
    // =====================================================

    const data =
      await apiGet(
        "getCustomerTransactions",
        {
          bid:
            currentBusiness,

          cid:
            cid
        }
      );


    if (
      !data ||
      !Array.isArray(
        data.transactions
      )
    ) {

      showToast(
        "No data found",
        "error"
      );

      return;

    }


    // =====================================================
    // STORE COMPLETE LEDGER
    //
    // IMPORTANT:
    // Never overwrite this when date filtering.
    // Opening balance needs transactions BEFORE fromDate.
    // =====================================================

    currentReportData =
      [...data.transactions];


    // Current visible statement data
    currentFilteredData =
      [...currentReportData];


    // =====================================================
    // STORE REPORT CONTEXT
    // =====================================================

    window.currentCustomerReport = {

      cid:
        String(cid),

      name:
        name || "Customer",

      from:
        "",

      to:
        ""

    };


    // =====================================================
    // CUSTOMER PHONE
    //
    // Reuse already-loaded customer master data.
    // No extra API request.
    // =====================================================

    const customer =
      (customersData || [])
        .find(
          item =>
            String(
              Array.isArray(item)
                ? item[0]
                : item.id
            ) ===
            String(cid)
        );


    window.currentCustomerReport.phone =
      customer
        ? String(
          Array.isArray(customer)
            ? customer[3] || ""
            : customer.phone || ""
        )
        : "";


    // =====================================================
    // REPORT PANEL
    // =====================================================

    rightPanel.innerHTML = `

      <div
        class="
          h-full
          flex
          flex-col
        "
      >

        <!-- ============================================
             HEADER
             ============================================ -->

        <div
          class="
            p-4
            border-b
            border-gray-700
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
            "
          >

            <button
              type="button"
              onclick="selectCustomer(
                window.currentCustomerReport.cid,
                window.currentCustomerReport.name
              )"
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


            <div>

              <div
                class="
                  text-xl
                  font-bold
                "
                id="statementCustomerName"
              >
${escapeReportHtml(
      name || "Customer"
    )}
              </div>


              <div
                class="
                  text-xs
                  text-gray-400
                "
              >
                Customer Statement
              </div>

            </div>

          </div>


          <!-- ACTION BUTTONS -->

          <div
            class="
              flex
              flex-wrap
              gap-2
            "
          >

            <button
              type="button"
              onclick="downloadPDF()"
              class="
                border
                border-gray-600
                px-3
                py-2
                rounded-lg
                hover:bg-gray-700
              "
            >
              🖨 PDF / Print
            </button>


            <button
              type="button"
              onclick="downloadExcel()"
              class="
                border
                border-gray-600
                px-3
                py-2
                rounded-lg
                hover:bg-gray-700
              "
            >
              📊 Excel
            </button>


            <button
              type="button"
              onclick="shareCustomerStatementWhatsApp(this)"
              class="
                bg-green-600
                hover:bg-green-700
                px-3
                py-2
                rounded-lg
                text-white
              "
            >
              💬 WhatsApp
            </button>

          </div>

        </div>


        <!-- ============================================
             DATE FILTER
             ============================================ -->

        <div
          class="
            p-4
            border-b
            border-gray-700
          "
        >

          <div
            class="
              flex
              flex-wrap
              gap-2
              items-end
            "
          >

            <!-- QUICK PERIOD -->

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
                id="period"
                onchange="handleQuickFilter(
                  window.currentCustomerReport.cid,
                  window.currentCustomerReport.name
                )"
                class="
                  p-2
                  bg-black
                  border
                  border-gray-700
                  rounded-lg
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
                type="date"
                id="fromDate"
                class="
                  p-2
                  bg-black
                  border
                  border-gray-700
                  rounded-lg
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
                type="date"
                id="toDate"
                class="
                  p-2
                  bg-black
                  border
                  border-gray-700
                  rounded-lg
                "
              >

            </div>


            <!-- APPLY -->

            <button
              type="button"
              onclick="applyReportFilter(
                window.currentCustomerReport.cid,
                window.currentCustomerReport.name
              )"
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
              onclick="resetCustomerStatementFilter()"
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


        <!-- ============================================
             STATEMENT PERIOD
             ============================================ -->

        <div
          id="statementPeriodLabel"
          class="
            px-4
            pt-3
            text-xs
            text-gray-400
          "
        >
          All transactions
        </div>


        <!-- ============================================
             SUMMARY
             ============================================ -->

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
              id="statementOpeningBalance"
              class="
                text-lg
                font-bold
                mt-1
              "
            >
              ₹0
            </div>

          </div>


          <!-- GAVE -->

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
              Total Gave
            </div>


            <div
              id="statementTotalGave"
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


          <!-- GOT -->

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
              Total Got
            </div>


            <div
              id="statementTotalGot"
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
              id="statementClosingBalance"
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


        <!-- ============================================
             TRANSACTION TABLE
             ============================================ -->

        <div
          class="
            flex-1
            overflow-auto
            px-4
            pb-4
          "
        >

          <div
            class="
              min-w-[720px]
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
                grid-cols-[110px_1fr_120px_120px_150px]
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

              <div
                class="
                  p-3
                  text-right
                "
              >
                Gave
              </div>

              <div
                class="
                  p-3
                  text-right
                "
              >
                Got
              </div>

              <div
                class="
                  p-3
                  text-right
                "
              >
                Balance
              </div>

            </div>


            <div id="reportTable"></div>

          </div>

        </div>

      </div>

    `;


    // =====================================================
    // INITIAL ALL-TIME STATEMENT
    // =====================================================

    renderCustomerStatementReport(
      "",
      ""
    );


  } catch (err) {

    console.error(
      "CUSTOMER REPORT ERROR:",
      err
    );

    showToast(
      "Report failed: " +
      (err?.message || "Unknown error"),
      "error"
    );

  } finally {

    if (
      typeof hideTinyLoader ===
      "function"
    ) {

      hideTinyLoader();

    }

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

