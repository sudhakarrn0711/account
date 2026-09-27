


function setButtonLoading(
    btn,
    text = "Saving..."
) {

    if (!btn) return;

    if (
        !btn.dataset.original
    ) {

        btn.dataset.original =
            btn.innerHTML;
    }

    btn.disabled =
        true;

    btn.setAttribute(
        "aria-busy",
        "true"
    );

    btn.innerHTML = `
        <span
            class="
                inline-flex
                items-center
                gap-2
                text-xs
            "
        >
            <span
                class="rsButtonLoadingDots"
                aria-hidden="true"
            >
                <i></i>
                <i></i>
                <i></i>
            </span>

            <span>
                ${text}
            </span>
        </span>
    `;
}


function resetButton(
    btn
) {

    if (!btn) return;

    btn.disabled =
        false;

    btn.removeAttribute(
        "aria-busy"
    );

    if (
        btn.dataset.original !==
        undefined
    ) {

        btn.innerHTML =
            btn.dataset.original;

    }

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

/* =========================================================
   CUSTOMER STATEMENT ENGINE
   ========================================================= */

/* =========================================================
   CUSTOMER STATEMENT STATE
   ========================================================= */

/*
 * currentReportData already exists in api(4).js.
 * Never redeclare currentReportData here.
 */

let currentFilteredData = [];


window.currentCustomerStatementSummary =
  null;


window.currentCustomerReport =
  null;

/* =========================================================
   SAFE HTML
   ========================================================= */

function escapeReportHtml(
  value = ""
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
      "&#39;"
    );

}


/* =========================================================
   MONEY FORMAT
   ========================================================= */

function formatStatementMoney(
  value
) {

  const amount =
    Number(value) || 0;


  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

}


/* =========================================================
   NORMALIZE DATE
   ========================================================= */

function getStatementDateKey(
  value
) {

  if (!value) {
    return "";
  }


  const raw =
    String(value).trim();


  /*
   * Prefer the YYYY-MM-DD part directly.
   *
   * This avoids timezone shifts such as:
   * 2026-09-01 becoming 31/08 locally.
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
   DISPLAY DATE
   ========================================================= */

function formatStatementDate(
  value
) {

  const key =
    getStatementDateKey(
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
   BALANCE LABEL
   ========================================================= */

function getStatementBalanceInfo(
  balance
) {

  const value =
    Number(balance) || 0;


  if (value > 0) {

    return {

      value,

      text:
        `You Gave ₹${formatStatementMoney(
          value
        )}`,

      shortText:
        `₹${formatStatementMoney(
          value
        )} Gave`,

      className:
        "text-red-400"

    };

  }


  if (value < 0) {

    return {

      value,

      text:
        `You Got ₹${formatStatementMoney(
          Math.abs(value)
        )}`,

      shortText:
        `₹${formatStatementMoney(
          Math.abs(value)
        )} Got`,

      className:
        "text-green-400"

    };

  }


  return {

    value: 0,

    text:
      "₹0 Settled",

    shortText:
      "₹0 Settled",

    className:
      "text-gray-300"

  };

}


/* =========================================================
   SIGNED CUSTOMER TRANSACTION
   ========================================================= */

function getStatementSignedAmount(
  txn
) {

  const amount =
    Math.abs(
      Number(
        txn?.amount
      ) || 0
    );


  const type =
    String(
      txn?.type || ""
    )
      .toLowerCase();


  if (type === "gave") {

    return amount;

  }


  if (type === "got") {

    return -amount;

  }


  return 0;

}


/* =========================================================
   SORT TRANSACTIONS
   ========================================================= */

function sortStatementTransactions(
  transactions
) {

  return [
    ...(Array.isArray(transactions)
      ? transactions
      : [])
  ].sort(
    (a, b) => {

      const dateA =
        getStatementDateKey(
          a.date
        );


      const dateB =
        getStatementDateKey(
          b.date
        );


      if (
        dateA === dateB
      ) {

        /*
         * Preserve API order for transactions
         * on the same day.
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
   CALCULATE COMPLETE STATEMENT
   ========================================================= */

function calculateCustomerStatement(
  from = "",
  to = ""
) {

  const allTransactions =
    sortStatementTransactions(
      currentReportData
    );


  let openingBalance = 0;

  let totalGave = 0;

  let totalGot = 0;


  const filtered = [];


  allTransactions.forEach(
    txn => {

      const date =
        getStatementDateKey(
          txn.date
        );


      if (!date) {
        return;
      }


      const signedAmount =
        getStatementSignedAmount(
          txn
        );


      // ===================================================
      // BEFORE FROM DATE = OPENING BALANCE
      // ===================================================

      if (
        from &&
        date < from
      ) {

        openingBalance +=
          signedAmount;

        return;

      }


      // ===================================================
      // AFTER TO DATE = IGNORE
      // ===================================================

      if (
        to &&
        date > to
      ) {

        return;

      }


      // ===================================================
      // CURRENT PERIOD
      // ===================================================

      filtered.push(
        txn
      );


      const amount =
        Math.abs(
          Number(
            txn.amount
          ) || 0
        );


      if (
        String(
          txn.type
        ).toLowerCase() ===
        "gave"
      ) {

        totalGave +=
          amount;

      }


      if (
        String(
          txn.type
        ).toLowerCase() ===
        "got"
      ) {

        totalGot +=
          amount;

      }

    }
  );


  const closingBalance =
    openingBalance +
    totalGave -
    totalGot;


  return {

    from,

    to,

    openingBalance,

    totalGave,

    totalGot,

    closingBalance,

    transactions:
      filtered

  };

}


/* =========================================================
   PERIOD TEXT
   ========================================================= */

function getStatementPeriodText(
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
      `${formatStatementDate(from)} to ` +
      `${formatStatementDate(to)}`
    );

  }


  if (from) {

    return (
      `From ${formatStatementDate(
        from
      )}`
    );

  }


  return (
    `Up to ${formatStatementDate(
      to
    )}`
  );

}


/* =========================================================
   RENDER COMPLETE STATEMENT
   ========================================================= */

function renderCustomerStatementReport(
  from = "",
  to = ""
) {

  const summary =
    calculateCustomerStatement(
      from,
      to
    );


  currentFilteredData =
    [...summary.transactions];


  window.currentCustomerStatementSummary =
    summary;


  if (
    window.currentCustomerReport
  ) {

    window.currentCustomerReport.from =
      from;


    window.currentCustomerReport.to =
      to;

  }


  // =======================================================
  // SUMMARY UI
  // =======================================================

  const openingInfo =
    getStatementBalanceInfo(
      summary.openingBalance
    );


  const closingInfo =
    getStatementBalanceInfo(
      summary.closingBalance
    );


  const openingEl =
    document.getElementById(
      "statementOpeningBalance"
    );


  const gaveEl =
    document.getElementById(
      "statementTotalGave"
    );


  const gotEl =
    document.getElementById(
      "statementTotalGot"
    );


  const closingEl =
    document.getElementById(
      "statementClosingBalance"
    );


  const periodEl =
    document.getElementById(
      "statementPeriodLabel"
    );


  if (openingEl) {

    openingEl.textContent =
      openingInfo.text;


    openingEl.className =
      `text-lg font-bold mt-1 ${openingInfo.className}`;

  }


  if (gaveEl) {

    gaveEl.textContent =
      `₹${formatStatementMoney(
        summary.totalGave
      )}`;

  }


  if (gotEl) {

    gotEl.textContent =
      `₹${formatStatementMoney(
        summary.totalGot
      )}`;

  }


  if (closingEl) {

    closingEl.textContent =
      closingInfo.text;


    closingEl.className =
      `text-lg font-bold mt-1 ${closingInfo.className}`;

  }


  if (periodEl) {

    periodEl.textContent =
      getStatementPeriodText(
        from,
        to
      );

  }


  // =======================================================
  // TABLE
  // =======================================================

  renderReportTable(
    summary.transactions,
    window.currentCustomerReport?.name ||
    "",
    summary.openingBalance
  );

}


/* =========================================================
   APPLY CUSTOM DATE RANGE
   ========================================================= */

async function applyReportFilter(
  cid,
  name
) {

  const from =
    document.getElementById(
      "fromDate"
    )?.value || "";


  const to =
    document.getElementById(
      "toDate"
    )?.value || "";


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


  /*
   * IMPORTANT:
   *
   * Do NOT call getCustomerTransactions again.
   *
   * openReportPanel already loaded the complete
   * ledger into currentReportData.
   */

  renderCustomerStatementReport(
    from,
    to
  );

}


/* =========================================================
   QUICK PERIOD FILTER
   ========================================================= */

function handleQuickFilter(
  cid,
  name
) {

  const period =
    document.getElementById(
      "period"
    )?.value || "";


  const fromInput =
    document.getElementById(
      "fromDate"
    );


  const toInput =
    document.getElementById(
      "toDate"
    );


  if (
    !fromInput ||
    !toInput
  ) {

    return;

  }


  // =======================================================
  // CUSTOM
  // =======================================================

  if (
    period === "custom"
  ) {

    fromInput.focus();

    return;

  }


  // =======================================================
  // ALL TIME
  // =======================================================

  if (!period) {

    fromInput.value =
      "";


    toInput.value =
      "";


    renderCustomerStatementReport(
      "",
      ""
    );


    return;

  }


  const today =
    new Date();


  let from;
  let to;


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


  fromInput.value =
    getStatementDateKey(
      from
    );


  toInput.value =
    getStatementDateKey(
      to
    );


  renderCustomerStatementReport(
    fromInput.value,
    toInput.value
  );

}


/* =========================================================
   RESET STATEMENT
   ========================================================= */

function resetCustomerStatementFilter() {

  const period =
    document.getElementById(
      "period"
    );


  const from =
    document.getElementById(
      "fromDate"
    );


  const to =
    document.getElementById(
      "toDate"
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


  renderCustomerStatementReport(
    "",
    ""
  );

}


/* =========================================================
   LEGACY PERIOD HANDLER
   =========================================================
   Keep this because another part of the project may still
   call handlePeriodChange().
   ========================================================= */

function handlePeriodChange() {

  const report =
    window.currentCustomerReport;


  if (!report) {
    return;
  }


  handleQuickFilter(
    report.cid,
    report.name
  );

}


/* =========================================================
   RENDER STATEMENT TRANSACTIONS
   ========================================================= */

function renderReportTable(
  transactions,
  name,
  openingBalance = 0
) {

  const table =
    document.getElementById(
      "reportTable"
    );


  if (!table) {
    return;
  }


  const sorted =
    sortStatementTransactions(
      transactions
    );


  let runningBalance =
    Number(
      openingBalance
    ) || 0;


  let html = "";


  // =======================================================
  // OPENING BALANCE ROW
  // =======================================================

  const openingInfo =
    getStatementBalanceInfo(
      runningBalance
    );


  html += `

    <div
      class="
        grid
        grid-cols-[110px_1fr_120px_120px_150px]
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
          window
            .currentCustomerStatementSummary
            ?.from
            ? formatStatementDate(
                window
                  .currentCustomerStatementSummary
                  .from
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


      <div
        class="
          p-3
          text-right
        "
      >
        -
      </div>


      <div
        class="
          p-3
          text-right
        "
      >
        -
      </div>


      <div
        class="
          p-3
          text-right
          font-semibold
          ${openingInfo.className}
        "
      >
        ${openingInfo.shortText}
      </div>

    </div>

  `;


  // =======================================================
  // TRANSACTIONS
  // =======================================================

  sorted.forEach(
    txn => {

      const amount =
        Math.abs(
          Number(
            txn.amount
          ) || 0
        );


      const type =
        String(
          txn.type || ""
        )
          .toLowerCase();


      runningBalance +=
        getStatementSignedAmount(
          txn
        );


      const balanceInfo =
        getStatementBalanceInfo(
          runningBalance
        );


      html += `

        <div
          class="
            grid
            grid-cols-[110px_1fr_120px_120px_150px]
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
            ${formatStatementDate(
              txn.date
            )}
          </div>


          <div
            class="
              p-3
              min-w-0
              break-words
            "
          >
            ${escapeReportHtml(
              txn.note || "-"
            )}
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
              type === "gave"
                ? `₹${formatStatementMoney(
                    amount
                  )}`
                : "-"
            }
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
              type === "got"
                ? `₹${formatStatementMoney(
                    amount
                  )}`
                : "-"
            }
          </div>


          <div
            class="
              p-3
              text-right
              font-medium
              ${balanceInfo.className}
            "
          >
            ${balanceInfo.shortText}
          </div>

        </div>

      `;

    }
  );


  // =======================================================
  // EMPTY PERIOD
  // =======================================================

  if (
    sorted.length === 0
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
  // CLOSING BALANCE
  // =======================================================

  const closingInfo =
    getStatementBalanceInfo(
      runningBalance
    );


  html += `

    <div
      class="
        grid
        grid-cols-[110px_1fr_120px_120px_150px]
        bg-gray-900
        text-sm
        font-bold
      "
    >

      <div class="p-3">
      </div>


      <div
        class="
          p-3
        "
      >
        Closing Balance
      </div>


      <div class="p-3">
      </div>


      <div class="p-3">
      </div>


      <div
        class="
          p-3
          text-right
          ${closingInfo.className}
        "
      >
        ${closingInfo.shortText}
      </div>

    </div>

  `;


  table.innerHTML =
    html;

}


/* =========================================================
   EXCEL EXPORT
   ========================================================= */

function downloadExcel() {

  const summary =
    window.currentCustomerStatementSummary;


  if (!summary) {

    showToast(
      "Statement not available ❌",
      "error"
    );

    return;

  }


  const customerName =
    window.currentCustomerReport?.name ||
    "Customer";


  const openingInfo =
    getStatementBalanceInfo(
      summary.openingBalance
    );


  const closingInfo =
    getStatementBalanceInfo(
      summary.closingBalance
    );


  const rows = [];


  // =======================================================
  // STATEMENT HEADER
  // =======================================================

  rows.push({
    Date: "",
    Details:
      `Customer: ${customerName}`,
    Gave: "",
    Got: "",
    Balance: ""
  });


  rows.push({
    Date: "",
    Details:
      `Period: ${getStatementPeriodText(
        summary.from,
        summary.to
      )}`,
    Gave: "",
    Got: "",
    Balance: ""
  });


  rows.push({
    Date:
      summary.from
        ? formatStatementDate(
            summary.from
          )
        : "",

    Details:
      "Opening Balance",

    Gave: "",

    Got: "",

    Balance:
      openingInfo.text
  });


  let runningBalance =
    summary.openingBalance;


  sortStatementTransactions(
    summary.transactions
  )
    .forEach(
      txn => {

        const amount =
          Math.abs(
            Number(
              txn.amount
            ) || 0
          );


        const type =
          String(
            txn.type || ""
          )
            .toLowerCase();


        runningBalance +=
          getStatementSignedAmount(
            txn
          );


        rows.push({

          Date:
            formatStatementDate(
              txn.date
            ),

          Details:
            txn.note || "",

          Gave:
            type === "gave"
              ? amount
              : "",

          Got:
            type === "got"
              ? amount
              : "",

          Balance:
            getStatementBalanceInfo(
              runningBalance
            ).text

        });

      }
    );


  rows.push({

    Date: "",

    Details:
      "TOTAL",

    Gave:
      summary.totalGave,

    Got:
      summary.totalGot,

    Balance:
      closingInfo.text

  });


  // =======================================================
  // XLSX
  // =======================================================

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
    customerName
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
    `${safeName || "customer"}_statement.xlsx`
  );

}


/* =========================================================
   BUILD PRINT / PDF STATEMENT
   ========================================================= */

function buildCustomerStatementPrintHtml() {

  const summary =
    window.currentCustomerStatementSummary;


  const report =
    window.currentCustomerReport;


  if (
    !summary ||
    !report
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


  const openingInfo =
    getStatementBalanceInfo(
      summary.openingBalance
    );


  const closingInfo =
    getStatementBalanceInfo(
      summary.closingBalance
    );


  let runningBalance =
    summary.openingBalance;


  let transactionRows =
    "";


  sortStatementTransactions(
    summary.transactions
  )
    .forEach(
      txn => {

        const amount =
          Math.abs(
            Number(
              txn.amount
            ) || 0
          );


        const type =
          String(
            txn.type || ""
          )
            .toLowerCase();


        runningBalance +=
          getStatementSignedAmount(
            txn
          );


        const balanceInfo =
          getStatementBalanceInfo(
            runningBalance
          );


        transactionRows += `

          <tr>

            <td>
              ${formatStatementDate(
                txn.date
              )}
            </td>

            <td>
              ${escapeReportHtml(
                txn.note || "-"
              )}
            </td>

            <td class="number gave">
              ${
                type === "gave"
                  ? `₹${formatStatementMoney(
                      amount
                    )}`
                  : "-"
              }
            </td>

            <td class="number got">
              ${
                type === "got"
                  ? `₹${formatStatementMoney(
                      amount
                    )}`
                  : "-"
              }
            </td>

            <td class="number">
              ${escapeReportHtml(
                balanceInfo.shortText
              )}
            </td>

          </tr>

        `;

      }
    );


  if (!transactionRows) {

    transactionRows = `

      <tr>

        <td
          colspan="5"
          class="empty"
        >
          No transactions in this period
        </td>

      </tr>

    `;

  }


  return `

<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8">

  <title>
    Customer Statement
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


    .title {

      font-size:
        14px;

      color:
        #6b7280;

      margin-top:
        4px;

    }


    .right {

      text-align:
        right;

      font-size:
        12px;

      color:
        #4b5563;

    }


    .customer {

      margin:
        15px 0;

      padding:
        12px;

      border:
        1px solid #e5e7eb;

      border-radius:
        8px;

    }


    .customer-name {

      font-size:
        18px;

      font-weight:
        bold;

    }


    .period {

      margin-top:
        4px;

      font-size:
        12px;

      color:
        #6b7280;

    }


    .summary {

      display:
        grid;

      grid-template-columns:
        repeat(4, 1fr);

      gap:
        10px;

      margin:
        18px 0;

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

      font-size:
        11px;

      color:
        #6b7280;

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

      margin-top:
        12px;

      font-size:
        12px;

    }


    th {

      background:
        #111827;

      color:
        white;

      text-align:
        left;

      padding:
        9px;

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


    .gave {

      color:
        #b91c1c;

    }


    .got {

      color:
        #15803d;

    }


    .opening,
    .closing {

      font-weight:
        bold;

      background:
        #f9fafb;

    }


    .closing {

      border-top:
        2px solid #111827;

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

      margin-top:
        30px;

      border-top:
        1px solid #e5e7eb;

      padding-top:
        10px;

      text-align:
        center;

      color:
        #6b7280;

      font-size:
        10px;

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


  <!-- HEADER -->

  <div class="header">

    <div>

      <div class="business">
        ${escapeReportHtml(
          businessName
        )}
      </div>

      <div class="title">
        Customer Statement
      </div>

    </div>


    <div class="right">

      Generated:
      ${escapeReportHtml(
        new Date()
          .toLocaleString(
            "en-IN"
          )
      )}

    </div>

  </div>


  <!-- CUSTOMER -->

  <div class="customer">

    <div class="customer-name">
      ${escapeReportHtml(
        report.name
      )}
    </div>


    ${
      report.phone
        ? `
          <div class="period">
            ${escapeReportHtml(
              report.phone
            )}
          </div>
        `
        : ""
    }


    <div class="period">

      Statement Period:
      ${escapeReportHtml(
        getStatementPeriodText(
          summary.from,
          summary.to
        )
      )}

    </div>

  </div>


  <!-- SUMMARY -->

  <div class="summary">

    <div class="summary-card">

      <div class="summary-label">
        Opening Balance
      </div>

      <div class="summary-value">
        ${escapeReportHtml(
          openingInfo.text
        )}
      </div>

    </div>


    <div class="summary-card">

      <div class="summary-label">
        Total Gave
      </div>

      <div class="summary-value">
        ₹${formatStatementMoney(
          summary.totalGave
        )}
      </div>

    </div>


    <div class="summary-card">

      <div class="summary-label">
        Total Got
      </div>

      <div class="summary-value">
        ₹${formatStatementMoney(
          summary.totalGot
        )}
      </div>

    </div>


    <div class="summary-card">

      <div class="summary-label">
        Closing Balance
      </div>

      <div class="summary-value">
        ${escapeReportHtml(
          closingInfo.text
        )}
      </div>

    </div>

  </div>


  <!-- TRANSACTIONS -->

  <table>

    <thead>

      <tr>

        <th>
          Date
        </th>

        <th>
          Details
        </th>

        <th class="number">
          Gave
        </th>

        <th class="number">
          Got
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
              ? formatStatementDate(
                  summary.from
                )
              : "-"
          }
        </td>

        <td>
          Opening Balance
        </td>

        <td class="number">
          -
        </td>

        <td class="number">
          -
        </td>

        <td class="number">
          ${escapeReportHtml(
            openingInfo.shortText
          )}
        </td>

      </tr>


      ${transactionRows}


      <tr class="closing">

        <td colspan="2">
          Closing Balance
        </td>

        <td class="number">
          ₹${formatStatementMoney(
            summary.totalGave
          )}
        </td>

        <td class="number">
          ₹${formatStatementMoney(
            summary.totalGot
          )}
        </td>

        <td class="number">
          ${escapeReportHtml(
            closingInfo.shortText
          )}
        </td>

      </tr>

    </tbody>

  </table>


  <div class="footer">

    This statement was generated from the
    account ledger of
    ${escapeReportHtml(
      businessName
    )}.

  </div>


</div>


</body>

</html>

  `;

}


/* =========================================================
   PDF / PRINT
   ========================================================= */

function downloadPDF() {

  const html =
    buildCustomerStatementPrintHtml();


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

function buildCustomerStatementWhatsAppText() {

  const summary =
    window.currentCustomerStatementSummary;


  const report =
    window.currentCustomerReport;


  if (
    !summary ||
    !report
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


  const openingInfo =
    getStatementBalanceInfo(
      summary.openingBalance
    );


  const closingInfo =
    getStatementBalanceInfo(
      summary.closingBalance
    );


  return [

    `*${businessName}*`,

    `*Customer Statement*`,

    ``,

    `Customer: ${report.name}`,

    `Period: ${getStatementPeriodText(
      summary.from,
      summary.to
    )}`,

    ``,

    `Opening Balance: ${openingInfo.text}`,

    `Total Gave: ₹${formatStatementMoney(
      summary.totalGave
    )}`,

    `Total Got: ₹${formatStatementMoney(
      summary.totalGot
    )}`,

    `Closing Balance: ${closingInfo.text}`,

    ``,

    `Transactions: ${summary.transactions.length}`

  ].join(
    "\n"
  );

}


/* =========================================================
   NORMALIZE WHATSAPP PHONE
   ========================================================= */

function normalizeStatementWhatsAppPhone(
  phone
) {

  let digits =
    String(
      phone || ""
    )
      .replace(
        /\D/g,
        ""
      );


  if (
    digits.length === 10
  ) {

    digits =
      "91" + digits;

  }


  return digits;

}


/* =========================================================
   SHARE STATEMENT TO WHATSAPP
   ========================================================= */

function shareCustomerStatementWhatsApp(
  btn = null
) {

  const report =
    window.currentCustomerReport;


  if (!report) {

    showToast(
      "Statement not available ❌",
      "error"
    );

    return;

  }


  const message =
    buildCustomerStatementWhatsAppText();


  if (!message) {

    showToast(
      "Statement not available ❌",
      "error"
    );

    return;

  }


  const phone =
    normalizeStatementWhatsAppPhone(
      report.phone
    );


  const encodedMessage =
    encodeURIComponent(
      message
    );


  /*
   * This intentionally opens WhatsApp instead of
   * calling your automatic sendWhatsApp API.
   *
   * A statement is something the user should be
   * able to review before pressing Send.
   */

  let url =
    `https://wa.me/?text=${encodedMessage}`;


  if (
    phone.length >= 11
  ) {

    url =
      `https://wa.me/${phone}?text=${encodedMessage}`;

  }


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

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

