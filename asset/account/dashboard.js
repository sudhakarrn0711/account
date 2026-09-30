console.log("✅ dashboard.js loaded");


/* ================= OPEN DASHBOARD ================= */
/* ================= OPEN DASHBOARD ================= */

async function openDashboard() {

  console.log("🔥 Dashboard clicked");


  /* ---------------------------------------------
     HIDE OTHER MAIN SECTIONS
  --------------------------------------------- */

  document
    .getElementById("customersSection")
    ?.classList.add("hidden");

  document
    .getElementById("cashbookSection")
    ?.classList.add("hidden");


  /* ---------------------------------------------
     SHOW DASHBOARD MIDDLE SECTION
  --------------------------------------------- */

  const dash =
    document.getElementById(
      "dashboardSection"
    );

  if (!dash) {

    console.error(
      "❌ dashboardSection not found"
    );

    return;
  }

  dash.classList.remove("hidden");


  /* ---------------------------------------------
     MOBILE
  --------------------------------------------- */

  if (
    window.innerWidth <= 768 &&
    typeof window.showMasterPanel === "function"
  ) {

    window.showMasterPanel();

  }


  /* ---------------------------------------------
     RENDER ONLY THE DASHBOARD MIDDLE PANEL

     IMPORTANT:
     We intentionally DO NOT call renderDashboard()
     here anymore.

     The full dashboard will open only when the new
     "Business Dashboard" button is clicked.
  --------------------------------------------- */

  await renderDashboardBusinessList();


  /* ---------------------------------------------
     DESKTOP / LAPTOP RIGHT PANEL PLACEHOLDER

     Do not automatically load the heavy dashboard.

     This also makes opening Dashboard faster because
     renderDashboard() performs several API requests.
  --------------------------------------------- */

  if (window.innerWidth > 768) {

    const rightPanel =
      document.getElementById(
        "rightPanel"
      );

    if (rightPanel) {

      rightPanel.innerHTML = `

        <div
          class="
            h-full
            flex
            items-center
            justify-center
            p-6
          "
        >

          <div
            class="
              max-w-sm
              text-center
            "
          >

            <div
              class="
                text-4xl
                mb-3
              "
            >
              📊
            </div>

            <div
              class="
                font-semibold
                text-gray-300
              "
            >
              Dashboard
            </div>

            <div
              class="
                text-xs
                text-gray-500
                mt-2
              "
            >
              Select Business Dashboard, Open, or Report
              from the Dashboard panel.
            </div>

          </div>

        </div>

      `;

    }

  }

}

/* =========================================================
   DASHBOARD - MIDDLE BUSINESS LIST
   ========================================================= */

async function renderDashboardBusinessList() {

  const container =
    document.getElementById(
      "dashboardContent"
    );

  if (!container) {

    console.error(
      "❌ dashboardContent not found"
    );

    return;

  }


  const businesses =
    Array.isArray(window.businesses)
      ? window.businesses
      : [];


  /*
   * HEADER / LOADING STATE
   */
  container.innerHTML = `

        <div
            class="
                flex
                flex-col
                h-full
                min-h-0
            "
        >

            <div
                class="
                    px-4
                    py-3
                    border-b
                    border-gray-800
                "
            >

                <div
                    class="
                        flex
                        items-center
                        justify-between
                        gap-3
                    "
                >

                    <div>

                        <div
                            class="
                                font-semibold
                                text-sm
                            "
                        >
                            📊 Dashboard
                        </div>

                        <div
                            class="
                                text-[11px]
                                text-gray-500
                                mt-1
                            "
                        >
                            Select a business
                        </div>

                    </div>


                    <div
                        class="
                            text-xs
                            text-gray-500
                        "
                    >
                        ${businesses.length}
                    </div>

                </div>

            </div>


            <!-- =========================================
                 BUSINESS DASHBOARD BUTTON
                 ========================================= -->

            <div
                class="
                    px-3
                    pt-3
                "
            >

                <button
                    id="openMainBusinessDashboardBtn"
                    type="button"
                    class="
                        w-full
                        flex
                        items-center
                        justify-center
                        gap-2
                        bg-indigo-600
                        hover:bg-indigo-500
                        active:bg-indigo-700
                        rounded-lg
                        px-3
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                    "
                >
                    <span>
                        📊
                    </span>

                    <span>
                        Business Dashboard
                    </span>
                </button>

            </div>


            <div
                id="dashboardBusinessList"
                class="
                    flex-1
                    min-h-0
                    overflow-y-auto
                    p-3
                    space-y-2
                "
            >

                <div
                    class="
                        p-4
                        text-center
                        text-sm
                        text-gray-500
                    "
                >
                    Loading businesses...
                </div>

            </div>

        </div>

    `;


  const list =
    document.getElementById(
      "dashboardBusinessList"
    );


  /* ---------------------------------------------
     MAIN BUSINESS DASHBOARD BUTTON
  --------------------------------------------- */

  const dashboardButton =
    document.getElementById(
      "openMainBusinessDashboardBtn"
    );

  if (dashboardButton) {

    dashboardButton.addEventListener(
      "click",
      async () => {

        /*
         * Mobile must move from the middle/master
         * panel to the right/detail panel first.
         */
        if (
          window.innerWidth <= 768 &&
          typeof window.showDetailPanel === "function"
        ) {

          window.showDetailPanel();

        }


        /*
         * Existing dashboard renderer.
         *
         * No report calculation/API logic is being
         * duplicated or changed.
         */
        await renderDashboard();

      }
    );

  }


  if (!list) return;


  if (!businesses.length) {

    list.innerHTML = `

            <div
                class="
                    p-6
                    text-center
                    text-sm
                    text-gray-500
                "
            >
                No businesses found
            </div>

        `;

    return;

  }


  /*
   * Load account balances for middle-panel cards.
   *
   * Failure of one business must not stop others.
   */
  const results =
    await Promise.all(

      businesses.map(

        async business => {

          let balance = 0;

          try {

            const response =
              await apiGet(
                "getAccounts",
                {
                  business_id:
                    business.id
                }
              );


            const accounts =
              dashboardArray(
                response,
                "accounts"
              );


            accounts.forEach(
              account => {

                balance +=
                  Number(
                    account.balance
                  ) || 0;

              }
            );

          }
          catch (err) {

            console.error(
              "[DASHBOARD BUSINESS LIST]",
              business.id,
              err
            );

          }


          return {
            business,
            balance
          };

        }

      )

    );


  /*
   * Render middle-panel business cards.
   */
  list.innerHTML =
    results
      .map(
        result => {

          const business =
            result.business;

          const id =
            String(
              business.id
            );

          const name =
            dashboardEscapeHtml(
              business.name ||
              "Business"
            );


          return `

                        <div
                            class="
                                bg-gray-900
                                border
                                border-gray-800
                                rounded-xl
                                p-3
                            "
                        >

                            <!-- BUSINESS NAME / BALANCE -->

                            <div
                                class="
                                    flex
                                    items-start
                                    justify-between
                                    gap-3
                                "
                            >

                                <div
                                    class="
                                        min-w-0
                                    "
                                >

                                    <div
                                        class="
                                            font-semibold
                                            text-sm
                                            truncate
                                        "
                                    >
                                        ${name}
                                    </div>


                                    <div
                                        class="
                                            text-[10px]
                                            text-gray-500
                                            mt-1
                                        "
                                    >
                                        Cashbook balance
                                    </div>

                                </div>


                                <div
                                    class="
                                        font-bold
                                        text-sm
                                        whitespace-nowrap
                                        ${result.balance >= 0
              ? "text-green-400"
              : "text-red-400"
            }
                                    "
                                >
                                    ${dashboardSignedMoney(
              result.balance
            )}
                                </div>

                            </div>


                            <!-- ACTION BUTTONS -->

                            <div
                                class="
                                    grid
                                    grid-cols-2
                                    gap-2
                                    mt-3
                                "
                            >

                                <button
                                    type="button"
                                    onclick='selectBusinessFromDashboard(${JSON.stringify(id)})'
                                    class="
                                        bg-blue-600
                                        hover:bg-blue-500
                                        rounded-lg
                                        py-2
                                        text-xs
                                        font-medium
                                    "
                                >
                                    Open
                                </button>


                                <button
                                    type="button"
                                    onclick='openBusinessReport(${JSON.stringify(id)})'
                                    class="
                                        bg-purple-600
                                        hover:bg-purple-500
                                        rounded-lg
                                        py-2
                                        text-xs
                                        font-medium
                                    "
                                >
                                    📊 Report
                                </button>

                            </div>

                        </div>

                    `;

        }
      )
      .join("");

}

/* ================= RENDER DASHBOARD ================= */
/* =========================================================
   IMPROVED BUSINESS DASHBOARD
   ========================================================= */

async function renderDashboard() {

  /*
   * Dashboard detail must render in the RIGHT panel.
   */
  const container =
    document.getElementById(
      "rightPanel"
    );

  if (!container) {

    console.error(
      "❌ rightPanel not found"
    );

    return;

  }


  /*
   * Give rightPanel a clean dashboard shell.
   *
   * renderDashboard() will replace this after
   * the data has loaded.
   */
  container.innerHTML = `

        <div
            class="
                h-full
                flex
                items-center
                justify-center
                text-sm
                text-gray-500
            "
        >
            Loading dashboard...
        </div>

    `;


  const businesses =
    Array.isArray(window.businesses)
      ? window.businesses
      : [];


  if (!businesses.length) {

    container.innerHTML = `
            <div class="p-4 text-gray-400">
                No businesses
            </div>
        `;

    return;
  }


  showTinyLoader(
    "Loading dashboard..."
  );


  try {

    /*
     * Load each business independently.
     *
     * One business failing should not destroy
     * the complete dashboard.
     */
    const businessResults =
      await Promise.all(

        businesses.map(
          business =>
            loadDashboardBusinessData(
              business
            )
        )

      );


    /*
     * -------------------------------------------------
     * GLOBAL TOTALS
     * -------------------------------------------------
     */

    let receivables = 0;

    let payables = 0;

    let todayCollections = 0;

    let todayPayments = 0;

    let cashbookBalance = 0;

    let monthCashIn = 0;

    let monthCashOut = 0;


    let outstandingCustomers = [];

    let recentTransactions = [];


    businessResults.forEach(
      result => {

        receivables +=
          result.receivables;


        payables +=
          result.payables;


        todayCollections +=
          result.todayCollections;


        todayPayments +=
          result.todayPayments;


        cashbookBalance +=
          result.cashbookBalance;


        monthCashIn +=
          result.monthCashIn;


        monthCashOut +=
          result.monthCashOut;


        outstandingCustomers.push(
          ...result.outstandingCustomers
        );


        recentTransactions.push(
          ...result.recentTransactions
        );

      }
    );


    /*
     * Highest outstanding balances first.
     */
    outstandingCustomers.sort(
      (a, b) =>
        Number(b.balance || 0) -
        Number(a.balance || 0)
    );


    /*
     * Latest activity first.
     */
    recentTransactions.sort(
      (a, b) =>
        dashboardDateValue(b.date) -
        dashboardDateValue(a.date)
    );


    const priorityCustomers =
      outstandingCustomers.slice(
        0,
        5
      );


    const recent =
      recentTransactions.slice(
        0,
        8
      );


    const todayNet =
      todayCollections -
      todayPayments;


    const monthNet =
      monthCashIn -
      monthCashOut;


    /*
     * Net position here is deliberately simple:
     *
     * Cashbook + Receivables - Payables
     *
     * This is NOT being presented as full accounting
     * profit/net worth.
     */
    const netPosition =
      cashbookBalance +
      receivables -
      payables;


    /*
     * -------------------------------------------------
     * BUSINESS CARDS
     * -------------------------------------------------
     */




    /*
     * -------------------------------------------------
     * FINAL DASHBOARD
     * -------------------------------------------------
     */

    container.innerHTML = `

    <div
        class="
            h-full
            overflow-y-auto
            p-3
            md:p-4
        "
    >

        <div
            class="
                max-w-7xl
                mx-auto
                space-y-4
            "
        >

                <!-- =====================================
                     HEADER
                ====================================== -->

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
                                text-xl
                                font-bold
                            "
                        >
                            Business Dashboard
                        </div>

                        <div
                            class="
                                text-xs
                                text-gray-500
                                mt-1
                            "
                        >
                            Key balances and actions requiring attention
                        </div>

                    </div>


                    <button
                        type="button"
                        onclick="renderDashboard()"
                        class="
                            bg-gray-800
                            hover:bg-gray-700
                            border
                            border-gray-700
                            px-3
                            py-2
                            rounded-lg
                            text-xs
                        "
                    >
                        ↻ Refresh
                    </button>

                </div>


                <!-- =====================================
                     MAIN KPI
                ====================================== -->

                <div
                    class="
                        grid
                        grid-cols-2
                        xl:grid-cols-3
                        gap-3
                    "
                >

                    ${dashboardKpiCard(
      "Receivables",
      receivables,
      "text-red-400",
      "Customers owe you"
    )}


                    ${dashboardKpiCard(
      "Payables",
      payables,
      "text-orange-400",
      "You owe customers"
    )}


                    ${dashboardKpiCard(
      "Today's Collections",
      todayCollections,
      "text-green-400",
      "Customer money received today"
    )}


                    ${dashboardKpiCard(
      "Today's Payments",
      todayPayments,
      "text-red-400",
      "Cashbook money out today"
    )}


                    ${dashboardKpiCard(
      "Cashbook Balance",
      cashbookBalance,
      cashbookBalance >= 0
        ? "text-green-400"
        : "text-red-400",
      "Across all cash accounts",
      true
    )}


                    ${dashboardKpiCard(
      "Net Position",
      netPosition,
      netPosition >= 0
        ? "text-green-400"
        : "text-red-400",
      "Cash + receivables - payables",
      true
    )}

                </div>


                <!-- =====================================
                     ACTION REQUIRED
                ====================================== -->

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
                            flex
                            items-center
                            justify-between
                            p-3
                            border-b
                            border-gray-800
                        "
                    >

                        <div>

                            <div class="font-semibold">
                                ⚠️ Collection Priority
                            </div>

                            <div
                                class="
                                    text-[11px]
                                    text-gray-500
                                    mt-1
                                "
                            >
                                Highest outstanding customer balances
                            </div>

                        </div>


                        <div
                            class="
                                text-xs
                                text-red-400
                                font-semibold
                            "
                        >
                            ${outstandingCustomers.length}
                            outstanding
                        </div>

                    </div>


                    <div>

                        ${priorityCustomers.length

        ? priorityCustomers
          .map(
            customer => `

                                            <div
                                                class="
                                                    flex
                                                    items-center
                                                    justify-between
                                                    gap-3
                                                    p-3
                                                    border-b
                                                    border-gray-800
                                                    last:border-b-0
                                                "
                                            >

                                                <div
                                                    class="
                                                        min-w-0
                                                    "
                                                >

                                                    <div
                                                        class="
                                                            text-sm
                                                            font-medium
                                                            truncate
                                                        "
                                                    >
                                                        ${dashboardEscapeHtml(
              customer.name
            )}
                                                    </div>

                                                    <div
                                                        class="
                                                            text-[11px]
                                                            text-gray-500
                                                            truncate
                                                        "
                                                    >
                                                        ${dashboardEscapeHtml(
              customer.businessName
            )}
                                                    </div>

                                                </div>


                                                <div
                                                    class="
                                                        text-red-400
                                                        font-bold
                                                        whitespace-nowrap
                                                    "
                                                >
                                                    ₹${dashboardMoney(
              customer.balance
            )}
                                                </div>

                                            </div>

                                        `
          )
          .join("")

        : `

                                    <div
                                        class="
                                            p-5
                                            text-center
                                            text-sm
                                            text-gray-500
                                        "
                                    >
                                        No outstanding customer balances
                                    </div>

                                `
      }

                    </div>

                </div>


                <!-- =====================================
                     TODAY'S MOVEMENT
                ====================================== -->

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
                            font-semibold
                            mb-3
                        "
                    >
                        Today
                    </div>


                    <div
                        class="
                            grid
                            grid-cols-3
                            gap-2
                            text-center
                        "
                    >

                        <div
                            class="
                                bg-green-500/10
                                rounded-lg
                                p-3
                            "
                        >

                            <div
                                class="
                                    text-[11px]
                                    text-gray-500
                                "
                            >
                                Collections
                            </div>

                            <div
                                class="
                                    text-green-400
                                    font-bold
                                    mt-1
                                "
                            >
                                ₹${dashboardMoney(
        todayCollections
      )}
                            </div>

                        </div>


                        <div
                            class="
                                bg-red-500/10
                                rounded-lg
                                p-3
                            "
                        >

                            <div
                                class="
                                    text-[11px]
                                    text-gray-500
                                "
                            >
                                Payments
                            </div>

                            <div
                                class="
                                    text-red-400
                                    font-bold
                                    mt-1
                                "
                            >
                                ₹${dashboardMoney(
        todayPayments
      )}
                            </div>

                        </div>


                        <div
                            class="
                                bg-blue-500/10
                                rounded-lg
                                p-3
                            "
                        >

                            <div
                                class="
                                    text-[11px]
                                    text-gray-500
                                "
                            >
                                Net
                            </div>

                            <div
                                class="
                                    font-bold
                                    mt-1
                                    ${todayNet >= 0
        ? "text-green-400"
        : "text-red-400"
      }
                                "
                            >
                                ${dashboardSignedMoney(
        todayNet
      )}
                            </div>

                        </div>

                    </div>

                </div>


                <!-- =====================================
                     TWO COLUMN AREA
                ====================================== -->

                <div
                    class="
                        grid
                        grid-cols-1
                        xl:grid-cols-2
                        gap-4
                    "
                >

                    <!-- RECENT TRANSACTIONS -->

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
                            "
                        >

                            <div class="font-semibold">
                                Recent Transactions
                            </div>

                            <div
                                class="
                                    text-[11px]
                                    text-gray-500
                                    mt-1
                                "
                            >
                                Latest customer and Cashbook activity
                            </div>

                        </div>


                        <div>

                            ${recent.length

        ? recent
          .map(
            txn =>
              dashboardRecentTxnHTML(
                txn
              )
          )
          .join("")

        : `

                                        <div
                                            class="
                                                p-5
                                                text-center
                                                text-sm
                                                text-gray-500
                                            "
                                        >
                                            No recent transactions
                                        </div>

                                    `
      }

                        </div>

                    </div>


                    <!-- MONTH MOVEMENT -->

                    <div
                        class="
                            bg-gray-900
                            border
                            border-gray-800
                            rounded-xl
                            p-3
                        "
                    >

                        <div class="font-semibold">
                            This Month
                        </div>

                        <div
                            class="
                                text-[11px]
                                text-gray-500
                                mt-1
                                mb-4
                            "
                        >
                            Cashbook movement
                        </div>


                        ${dashboardMovementRow(
        "Cash In",
        monthCashIn,
        "text-green-400"
      )}


                        ${dashboardMovementRow(
        "Cash Out",
        monthCashOut,
        "text-red-400"
      )}


                        <div
                            class="
                                border-t
                                border-gray-800
                                mt-2
                                pt-2
                            "
                        >

                            ${dashboardMovementRow(
        "Net Movement",
        monthNet,
        monthNet >= 0
          ? "text-green-400"
          : "text-red-400",
        true
      )}

                        </div>


                        <div
                            class="
                                mt-4
                                p-3
                                bg-black/20
                                rounded-lg
                                text-xs
                                text-gray-400
                            "
                        >

                            ${monthNet > 0

        ? `Cashbook inflow exceeds outflow by
                                       <span class="text-green-400 font-semibold">
                                           ₹${dashboardMoney(monthNet)}
                                       </span>
                                       this month.`

        : monthNet < 0

          ? `Cashbook outflow exceeds inflow by
                                           <span class="text-red-400 font-semibold">
                                               ₹${dashboardMoney(
            Math.abs(monthNet)
          )}
                                           </span>
                                           this month.`

          : `Cashbook inflow and outflow are equal this month.`
      }

                        </div>

                    </div>

                </div>


                


                <!-- =====================================
                     OVERDUE NOTICE
                ====================================== -->

                                <div
                    class="
                        text-[11px]
                        text-gray-500
                        p-3
                        border
                        border-gray-800
                        rounded-lg
                    "
                >
                    Overdue status is not calculated because the current
                    customer data does not provide a due date. Collection
                    Priority above is based on outstanding balance only.
                </div>

            </div>

        </div>

    </div>
`;

  }
  catch (err) {

    console.error(
      "[DASHBOARD]",
      err
    );


    if (
      !container.innerHTML.trim()
    ) {

      container.innerHTML = `

                <div
                    class="
                        p-4
                        text-red-400
                    "
                >
                    Unable to load dashboard
                </div>

            `;

    }


    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "Unable to refresh dashboard",
        "error"
      );

    }

  }
  finally {

    hideTinyLoader();

  }

}


/* ================= SIMPLE VIEW ================= */
async function selectBusinessFromDashboard(businessId) {

  const business =
    (window.businesses || [])
      .find(
        b =>
          String(b.id) ===
          String(businessId)
      );


  if (!business) {

    console.error(
      "Business not found:",
      businessId
    );

    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "Business not found",
        "error"
      );

    }

    return;

  }


  const panel =
    document.getElementById(
      "rightPanel"
    );


  if (!panel) {

    console.error(
      "❌ rightPanel not found"
    );

    return;

  }


  /*
   * Mobile:
   * switch from middle/master panel
   * to right/detail panel.
   */
  if (
    window.innerWidth <= 768 &&
    typeof window.showDetailPanel === "function"
  ) {

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
        <div class="text-gray-500 text-sm">
    Loading business details...
</div>
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

    if (!businessId) {

        console.error(
            "Missing business id"
        );

        return;

    }


    const business =
        (window.businesses || [])
            .find(
                b =>
                    String(b.id) ===
                    String(businessId)
            );


    if (!business) {

        console.error(
            "Business not found:",
            businessId
        );

        if (
            typeof showToast ===
            "function"
        ) {

            showToast(
                "Business not found",
                "error"
            );

        }

        return;

    }


    const panel =
        document.getElementById(
            "rightPanel"
        );


    if (!panel) {

        console.error(
            "❌ rightPanel not found"
        );

        return;

    }


    /*
     * Mobile:
     * open right/detail panel.
     */
    if (
        window.innerWidth <= 768 &&
        typeof window.showDetailPanel === "function"
    ) {

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

<div
    class="
        bg-gray-900
        p-3
        rounded-lg
        h-64
        flex
        flex-col
        items-center
        justify-center
        text-center
    "
>

    <div class="text-2xl mb-2">
        📊
    </div>

    <div class="text-sm font-medium">
        Current Balance
    </div>

    <div
        class="
            text-2xl
            font-bold
            mt-2
            ${total >= 0
                ? "text-green-400"
                : "text-red-400"}
        "
    >
        ${dashboardSignedMoney(total)}
    </div>

    <div
        class="
            text-xs
            text-gray-500
            mt-2
        "
    >
        Across this business's Cashbook accounts
    </div>

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

/* =========================================================
   DASHBOARD HELPERS
   ========================================================= */


/* =========================================================
   MONEY
   ========================================================= */

function dashboardMoney(
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


function dashboardSignedMoney(
  value
) {

  const amount =
    Number(value) || 0;


  if (
    amount < 0
  ) {

    return (
      `-₹${dashboardMoney(
        Math.abs(amount)
      )}`
    );

  }


  return (
    `₹${dashboardMoney(
      amount
    )}`
  );

}


/* =========================================================
   SAFE HTML
   ========================================================= */

function dashboardEscapeHtml(
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


/* =========================================================
   SAFE DATE KEY
   ========================================================= */

function dashboardDateKey(
  value
) {

  if (!value) {
    return "";
  }


  const raw =
    String(value).trim();


  /*
   * Prefer YYYY-MM-DD directly.
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
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


/* =========================================================
   DATE VALUE FOR SORTING
   ========================================================= */

function dashboardDateValue(
  value
) {

  if (!value) {
    return 0;
  }


  const parsed =
    new Date(value).getTime();


  if (
    Number.isFinite(parsed)
  ) {

    return parsed;

  }


  const key =
    dashboardDateKey(
      value
    );


  if (!key) {
    return 0;
  }


  return (
    new Date(
      `${key}T00:00:00`
    ).getTime()
  );

}


/* =========================================================
   DISPLAY DATE
   ========================================================= */

function dashboardDisplayDate(
  value
) {

  const key =
    dashboardDateKey(
      value
    );


  if (!key) {
    return "-";
  }


  const today =
    dashboardDateKey(
      new Date()
    );


  if (
    key === today
  ) {

    return "Today";

  }


  const parts =
    key.split("-");


  return (
    `${parts[2]}/${parts[1]}/${parts[0]}`
  );

}


/* =========================================================
   KPI CARD
   ========================================================= */

function dashboardKpiCard(
  title,
  amount,
  colorClass,
  subtitle,
  signed = false
) {

  const displayAmount =
    signed
      ? dashboardSignedMoney(
        amount
      )
      : `₹${dashboardMoney(
        Math.abs(
          Number(amount) || 0
        )
      )}`;


  return `

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
                    text-xs
                    text-gray-400
                "
            >
                ${dashboardEscapeHtml(
    title
  )}
            </div>


            <div
                class="
                    ${colorClass}
                    text-xl
                    font-bold
                    mt-1
                "
            >
                ${displayAmount}
            </div>


            <div
                class="
                    text-[10px]
                    text-gray-600
                    mt-1
                "
            >
                ${dashboardEscapeHtml(
    subtitle
  )}
            </div>

        </div>

    `;

}


/* =========================================================
   MONTH MOVEMENT ROW
   ========================================================= */

function dashboardMovementRow(
  label,
  amount,
  colorClass,
  signed = false
) {

  return `

        <div
            class="
                flex
                items-center
                justify-between
                gap-3
                py-2
            "
        >

            <span
                class="
                    text-sm
                    text-gray-400
                "
            >
                ${dashboardEscapeHtml(
    label
  )}
            </span>


            <span
                class="
                    ${colorClass}
                    font-bold
                "
            >
                ${signed
      ? dashboardSignedMoney(
        amount
      )
      : `₹${dashboardMoney(
        Math.abs(
          Number(amount) || 0
        )
      )}`
    }
            </span>

        </div>

    `;

}


/* =========================================================
   NORMALIZE API ARRAY
   ========================================================= */

function dashboardArray(
  response,
  possibleKey
) {

  if (
    Array.isArray(response)
  ) {

    return response;

  }


  if (
    response &&
    possibleKey &&
    Array.isArray(
      response[possibleKey]
    )
  ) {

    return response[possibleKey];

  }


  if (
    response &&
    Array.isArray(
      response.data
    )
  ) {

    return response.data;

  }


  return [];

}


/* =========================================================
   LOAD ONE BUSINESS
   ========================================================= */

async function loadDashboardBusinessData(
  business
) {

  const businessId =
    business.id;


  /*
   * Accounts and customers can be fetched together.
   */
  const [
    accountResponse,
    customerResponse
  ] =
    await Promise.all([

      apiGet(
        "getAccounts",
        {
          business_id:
            businessId
        }
      ),

      apiGet(
        "getCustomersWithBalance",
        {
          bid:
            businessId
        }
      )

    ]);


  const accounts =
    dashboardArray(
      accountResponse,
      "accounts"
    );


  const customers =
    dashboardArray(
      customerResponse,
      "customers"
    );


  /*
   * -------------------------------------------------
   * CUSTOMER BALANCES
   * -------------------------------------------------
   */

  let receivables = 0;

  let payables = 0;


  const outstandingCustomers = [];


  customers.forEach(
    customer => {

      const balance =
        Number(
          customer.balance
        ) || 0;


      if (
        balance > 0
      ) {

        receivables +=
          balance;


        outstandingCustomers.push({

          id:
            customer.id,

          name:
            customer.name ||
            "Customer",

          phone:
            customer.phone ||
            "",

          balance,

          businessId,

          businessName:
            business.name ||
            "Business"

        });

      } else if (
        balance < 0
      ) {

        payables +=
          Math.abs(
            balance
          );

      }

    }
  );


  /*
   * -------------------------------------------------
   * CASHBOOK BALANCE
   * -------------------------------------------------
   */

  let cashbookBalance = 0;


  accounts.forEach(
    account => {

      cashbookBalance +=
        Number(
          account.balance
        ) || 0;

    }
  );


  /*
   * -------------------------------------------------
   * LOAD CASHBOOK TRANSACTIONS
   * -------------------------------------------------
   */

  const cashResults =
    await Promise.all(

      accounts
        .filter(
          account =>
            account &&
            account.id != null
        )
        .map(
          async account => {

            try {

              const response =
                await apiGet(
                  "getCashbookByAccount",
                  {
                    account_id:
                      account.id
                  }
                );


              const rows =
                dashboardArray(
                  response
                );


              return rows.map(
                row =>
                  normalizeDashboardCashTxn(
                    row,
                    account,
                    business
                  )
              );

            }
            catch (err) {

              console.error(
                "[DASHBOARD CASHBOOK]",
                account.id,
                err
              );


              return [];

            }

          }
        )

    );


  const cashTransactions =
    cashResults.flat();


  /*
   * -------------------------------------------------
   * LOAD CUSTOMER TRANSACTIONS
   * -------------------------------------------------
   *
   * Required for accurate "Today's Collections".
   *
   * This uses the same existing customer transaction
   * API used by the customer ledger.
   */

  const customerTxnResults =
    await Promise.all(

      customers
        .filter(
          customer =>
            customer &&
            customer.id != null
        )
        .map(
          async customer => {

            try {

              const response =
                await apiGet(
                  "getCustomerTransactions",
                  {
                    bid:
                      businessId,

                    cid:
                      customer.id
                  }
                );


              const rows =
                dashboardArray(
                  response,
                  "transactions"
                );


              return rows.map(
                row =>
                  normalizeDashboardCustomerTxn(
                    row,
                    customer,
                    business
                  )
              );

            }
            catch (err) {

              console.error(
                "[DASHBOARD CUSTOMER TXN]",
                customer.id,
                err
              );


              return [];

            }

          }
        )

    );


  const customerTransactions =
    customerTxnResults.flat();


  /*
   * -------------------------------------------------
   * TODAY
   * -------------------------------------------------
   */

  const today =
    dashboardDateKey(
      new Date()
    );


  let todayCollections = 0;

  let todayPayments = 0;


  /*
   * Customer "got" means money collected
   * from the customer.
   */
  customerTransactions.forEach(
    txn => {

      if (
        dashboardDateKey(
          txn.date
        ) !== today
      ) {

        return;

      }


      if (
        txn.type === "got"
      ) {

        todayCollections +=
          Math.abs(
            Number(
              txn.amount
            ) || 0
          );

      }

    }
  );


  /*
   * Negative Cashbook amount = money out.
   */
  cashTransactions.forEach(
    txn => {

      if (
        dashboardDateKey(
          txn.date
        ) !== today
      ) {

        return;

      }


      const amount =
        Number(
          txn.amount
        ) || 0;


      if (
        amount < 0
      ) {

        todayPayments +=
          Math.abs(
            amount
          );

      }

    }
  );


  /*
   * -------------------------------------------------
   * MONTHLY CASHBOOK MOVEMENT
   * -------------------------------------------------
   */

  const now =
    new Date();


  const currentMonth =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;


  let monthCashIn = 0;

  let monthCashOut = 0;


  cashTransactions.forEach(
    txn => {

      const date =
        dashboardDateKey(
          txn.date
        );


      if (
        !date ||
        !date.startsWith(
          currentMonth
        )
      ) {

        return;

      }


      const amount =
        Number(
          txn.amount
        ) || 0;


      if (
        amount > 0
      ) {

        monthCashIn +=
          amount;

      } else if (
        amount < 0
      ) {

        monthCashOut +=
          Math.abs(
            amount
          );

      }

    }
  );


  /*
   * -------------------------------------------------
   * RECENT ACTIVITY
   * -------------------------------------------------
   */

  const recentTransactions = [

    ...cashTransactions,

    ...customerTransactions

  ];


  return {

    business,

    receivables,

    payables,

    todayCollections,

    todayPayments,

    cashbookBalance,

    monthCashIn,

    monthCashOut,

    outstandingCustomers,

    recentTransactions

  };

}


/* =========================================================
   NORMALIZE CASHBOOK TRANSACTION
   ========================================================= */

function normalizeDashboardCashTxn(
  row,
  account,
  business
) {

  /*
   * Your Cashbook already supports array responses:
   *
   * row[0] = id
   * row[2] = account
   * row[3] = amount
   * row[4] = note
   * row[5] = mode
   * row[6] = date
   */

  if (
    Array.isArray(row)
  ) {

    const amount =
      Number(
        row[3]
      ) || 0;


    return {

      source:
        "cashbook",

      id:
        row[0],

      amount,

      note:
        row[4] ||
        "",

      mode:
        row[5] ||
        "",

      date:
        row[6],

      accountName:
        account.name ||
        "Cashbook",

      businessName:
        business.name ||
        "Business",

      title:
        account.name ||
        "Cashbook",

      type:
        amount >= 0
          ? "cash_in"
          : "cash_out"

    };

  }


  const amount =
    Number(
      row?.amount
    ) || 0;


  return {

    source:
      "cashbook",

    id:
      row?.id,

    amount,

    note:
      row?.note ||
      "",

    mode:
      row?.mode ||
      "",

    date:
      row?.date,

    accountName:
      account.name ||
      "Cashbook",

    businessName:
      business.name ||
      "Business",

    title:
      account.name ||
      "Cashbook",

    type:
      amount >= 0
        ? "cash_in"
        : "cash_out"

  };

}


/* =========================================================
   NORMALIZE CUSTOMER TRANSACTION
   ========================================================= */

function normalizeDashboardCustomerTxn(
  row,
  customer,
  business
) {

  /*
   * Customer ledger currently uses object
   * transactions containing:
   *
   * id
   * type
   * amount
   * note
   * date
   */

  return {

    source:
      "customer",

    id:
      row?.id,

    amount:
      Math.abs(
        Number(
          row?.amount
        ) || 0
      ),

    note:
      row?.note ||
      "",

    date:
      row?.date,

    type:
      row?.type ||
      "",

    customerName:
      customer.name ||
      "Customer",

    businessName:
      business.name ||
      "Business",

    title:
      customer.name ||
      "Customer"

  };

}


/* =========================================================
   RECENT TRANSACTION HTML
   ========================================================= */

function dashboardRecentTxnHTML(
  txn
) {

  const isCustomer =
    txn.source ===
    "customer";


  let positive = false;

  let label = "";

  let amount = 0;


  if (isCustomer) {

    /*
     * Customer:
     *
     * got  = collection / money received
     * gave = credit given
     */

    positive =
      txn.type ===
      "got";


    label =
      txn.type === "got"
        ? "Collection"
        : txn.type === "gave"
          ? "Credit Given"
          : "Customer Entry";


    amount =
      Math.abs(
        Number(
          txn.amount
        ) || 0
      );

  } else {

    const signedAmount =
      Number(
        txn.amount
      ) || 0;


    positive =
      signedAmount >= 0;


    label =
      positive
        ? "Cash In"
        : "Cash Out";


    amount =
      Math.abs(
        signedAmount
      );

  }


  const description =
    txn.note
      ? txn.note
      : label;


  return `

        <div
            class="
                flex
                items-center
                justify-between
                gap-3
                p-3
                border-b
                border-gray-800
                last:border-b-0
            "
        >

            <div
                class="
                    min-w-0
                    flex-1
                "
            >

                <div
                    class="
                        flex
                        items-center
                        gap-2
                    "
                >

                    <span
                        class="
                            text-[10px]
                            ${isCustomer
      ? "text-purple-400"
      : "text-blue-400"
    }
                        "
                    >
                        ${isCustomer
      ? "CUSTOMER"
      : "CASHBOOK"
    }
                    </span>


                    <span
                        class="
                            text-[10px]
                            text-gray-600
                        "
                    >
                        ${dashboardDisplayDate(
      txn.date
    )}
                    </span>

                </div>


                <div
                    class="
                        text-sm
                        font-medium
                        truncate
                        mt-1
                    "
                >
                    ${dashboardEscapeHtml(
      txn.title
    )}
                </div>


                <div
                    class="
                        text-[11px]
                        text-gray-500
                        truncate
                    "
                >
                    ${dashboardEscapeHtml(
      description
    )}
                    ·
                    ${dashboardEscapeHtml(
      txn.businessName
    )}
                </div>

            </div>


            <div
                class="
                    whitespace-nowrap
                    font-bold
                    text-sm
                    ${positive
      ? "text-green-400"
      : "text-red-400"
    }
                "
            >

                ${positive
      ? "+"
      : "-"
    }₹${dashboardMoney(
      amount
    )}

            </div>

        </div>

    `;

}