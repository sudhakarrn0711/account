/* =========================================================
   MOBILE UPDATE
   =========================================================
   Mobile-only UI enhancements.

   Desktop functions are NOT replaced.

   Enhances:
   1. Customer Statement
   2. Cashbook Account Statement
   3. Enhanced Dashboard mobile routing

   IMPORTANT:
   Load this file AFTER:
   - reports-settings.js
   - reports-export.js
   - cashbook.js
   - dashboard.js
   - mobile.js
   ========================================================= */

(function () {

    "use strict";


    const MOBILE_BREAKPOINT = 768;


    /* =====================================================
       BASIC HELPERS
       ===================================================== */

    function isMobile() {

        return (
            window.innerWidth <=
            MOBILE_BREAKPOINT
        );

    }


    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    }


    function money(value) {

        const amount =
            Math.abs(
                Number(value) || 0
            );


        return amount.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );

    }


    function formatDate(value) {

        if (!value) {
            return "-";
        }


        /*
         * Prefer existing project formatter.
         */
        if (
            typeof window.formatStatementDate ===
            "function"
        ) {

            try {

                return window.formatStatementDate(
                    value
                );

            }
            catch (error) {
                // fallback below
            }

        }


        if (
            typeof window.formatCashStatementDate ===
            "function"
        ) {

            try {

                return window.formatCashStatementDate(
                    value
                );

            }
            catch (error) {
                // fallback below
            }

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return date.toLocaleDateString(
            "en-IN"
        );

    }


    function signedCustomerAmount(txn) {

        if (
            typeof window.getStatementSignedAmount ===
            "function"
        ) {

            try {

                return Number(
                    window.getStatementSignedAmount(
                        txn
                    )
                ) || 0;

            }
            catch (error) {
                // fallback below
            }

        }


        const amount =
            Math.abs(
                Number(txn?.amount) || 0
            );


        return (
            String(
                txn?.type || ""
            )
                .toLowerCase() ===
            "gave"
        )
            ? amount
            : -amount;

    }


    function customerBalanceText(
        value
    ) {

        if (
            typeof window.getStatementBalanceInfo ===
            "function"
        ) {

            try {

                const info =
                    window.getStatementBalanceInfo(
                        value
                    );


                return (
                    info?.shortText ||
                    info?.text ||
                    `₹${money(value)}`
                );

            }
            catch (error) {
                // fallback below
            }

        }


        const balance =
            Number(value) || 0;


        if (balance === 0) {
            return "₹0 Settled";
        }


        if (balance > 0) {
            return `You Gave ₹${money(balance)}`;
        }


        return `You Got ₹${money(balance)}`;

    }


    function cashBalanceText(
        value
    ) {

        if (
            typeof window.getCashStatementBalanceInfo ===
            "function"
        ) {

            try {

                const info =
                    window.getCashStatementBalanceInfo(
                        value
                    );


                return (
                    info?.shortText ||
                    info?.text ||
                    `₹${money(value)}`
                );

            }
            catch (error) {
                // fallback below
            }

        }


        return `₹${money(value)}`;

    }



    /* =====================================================
       MOBILE STYLE
       ===================================================== */

    function installStyles() {

        if (
            document.getElementById(
                "mobileUpdateStyle"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "mobileUpdateStyle";


        style.textContent = `

        @media (max-width: 768px) {

            /* =============================================
               COMMON STATEMENT
               ============================================= */

            .mu-statement {
                width: 100%;
                min-width: 0;
                overflow: hidden;
                background: #0b1220;
            }


            .mu-statement-row {
                width: 100%;
                min-width: 0;

                padding: 12px;

                border-bottom:
                    1px solid #1f2937;
            }


            .mu-statement-row:last-child {
                border-bottom: 0;
            }


            .mu-statement-row.mu-special {
                background:
                    rgba(17, 24, 39, .72);
            }

/* =====================================================
   MOBILE STATEMENT ROW - TWO COLUMN LAYOUT
   ===================================================== */

.mu-row-main {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(90px, auto) !important;

    align-items: start !important;

    column-gap: 12px !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    overflow: hidden !important;
}


.mu-row-left {
    display: block !important;

    width: auto !important;
    max-width: 100% !important;
    min-width: 0 !important;

    overflow: hidden !important;
}


.mu-row-title {
    display: block !important;

    width: 100% !important;
    min-width: 0 !important;

    color: #f3f4f6;

    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;

    white-space: normal !important;

    overflow-wrap: anywhere !important;
    word-break: break-word !important;
}


.mu-row-meta {
    display: flex !important;

    align-items: center !important;
    flex-wrap: wrap !important;

    gap: 4px !important;

    width: 100% !important;
    min-width: 0 !important;

    margin-top: 4px;

    color: #6b7280;

    font-size: 11px;
    line-height: 1.35;

    white-space: normal !important;
}


.mu-row-right {
    display: block !important;

    width: auto !important;
    min-width: 90px !important;
    max-width: 130px !important;

    margin: 0 !important;
    padding: 0 !important;

    text-align: right !important;

    overflow: visible !important;
}


.mu-row-right .mu-amount {
    display: block !important;

    width: 100% !important;

    text-align: right !important;

    white-space: nowrap !important;
}


.mu-row-right .mu-type {
    display: block !important;

    width: 100% !important;

    text-align: right !important;

    white-space: nowrap !important;
}

            .mu-amount {
                font-size: 14px;
                font-weight: 700;
                line-height: 1.3;
            }


            .mu-amount-red {
                color: #f87171;
            }


            .mu-amount-green {
                color: #4ade80;
            }


            .mu-amount-normal {
                color: #e5e7eb;
            }


            .mu-type {
                margin-top: 3px;

                font-size: 10px;
                font-weight: 500;

                opacity: .78;
            }


.mu-balance {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(110px, auto) !important;

    align-items: center !important;

    column-gap: 12px !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    margin-top: 9px;
    padding-top: 8px;

    border-top:
        1px dashed
        rgba(75, 85, 99, .75);

    color: #9ca3af;

    font-size: 11px;

    overflow: hidden !important;
}


.mu-balance > span:first-child {
    min-width: 0 !important;

    text-align: left !important;
}


.mu-balance-value {
    display: block !important;

    width: auto !important;
    min-width: 0 !important;

    color: #e5e7eb;

    font-size: 12px;
    font-weight: 600;

    text-align: right !important;

    white-space: nowrap !important;
}

            .mu-empty {
                padding: 24px 12px;

                text-align: center;

                color: #6b7280;

                font-size: 13px;
            }


            /* =============================================
               CUSTOMER STATEMENT
               ============================================= */

            #reportTable.mu-mobile-active {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;

                overflow: hidden !important;
            }


            #reportTable.mu-mobile-active
            > :not(.mu-customer-statement) {

                display: none !important;

            }


            .mu-hide-customer-heading {
                display: none !important;
            }


            /* =============================================
               CASHBOOK STATEMENT
               ============================================= */

            .mu-cash-original {
                display: none !important;
            }


            .mu-cash-heading-hidden {
                display: none !important;
            }


            .mu-cash-statement {
                width: 100%;
                min-width: 0;
            }


            /* =============================================
               MOBILE STATEMENT DESKTOP-SHELL RESET
               =============================================
               Customer/Cashbook desktop statements live inside
               fixed min-width wrappers (for desktop columns).
               On mobile, the generated card statement must reset
               those wrappers or the right side remains off-screen.
            */

            .mu-statement-scroll-host {
                min-width: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                overflow-x: hidden !important;
            }

            .mu-statement-shell {
                min-width: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                overflow-x: hidden !important;
            }

            .mu-statement-shell.mu-customer-shell,
            .mu-statement-shell.mu-cash-shell {
                min-width: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
            }


            /* =============================================
               DASHBOARD
               ============================================= */

            #rightPanel.mu-dashboard-active {

                overflow-x: hidden !important;
                overflow-y: auto !important;

                padding-bottom:
                    calc(
                        80px +
                        env(safe-area-inset-bottom)
                    );

            }


            .mu-dashboard-header {

                position: sticky;

                top: 0;

                z-index: 100;

                display: flex;
                align-items: center;

                gap: 10px;

                padding:
                    max(
                        10px,
                        env(safe-area-inset-top)
                    )
                    12px
                    10px;

                background:
                    rgba(
                        11,
                        18,
                        32,
                        .98
                    );

                border-bottom:
                    1px solid #1f2937;

            }


            .mu-dashboard-header button {

                width: 44px;
                height: 44px;

                min-width: 44px;
                min-height: 44px;

                padding: 0;

                display: flex;
                align-items: center;
                justify-content: center;

                border: 0;

                border-radius: 9px;

                background: #1f2937;
                color: white;

                font-size: 17px;

            }


            .mu-dashboard-title {

                min-width: 0;

                color: white;

                font-size: 15px;
                font-weight: 600;

                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;

            }

            /* =====================================================
   STATEMENT WIDTH SAFETY
   ===================================================== */

.mu-statement,
.mu-customer-statement,
.mu-cash-statement {

    display: block !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    margin: 0 !important;

    box-sizing: border-box !important;

    overflow-x: hidden !important;
}


.mu-statement *,
.mu-customer-statement *,
.mu-cash-statement * {

    box-sizing: border-box !important;

}


.mu-statement-row {

    display: block !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    margin: 0 !important;

    padding: 12px !important;

    box-sizing: border-box !important;

    overflow: hidden !important;
}


/* Customer report container */

#reportTable.mu-mobile-active {

    display: block !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow-x: hidden !important;

}


/* Cashbook mobile statement */

.mu-cash-statement {

    display: block !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    overflow-x: hidden !important;

}


/* Prevent parent grid/flex rules from stretching mobile rows */

#reportTable .mu-customer-statement > .mu-statement-row,
.mu-cash-statement > .mu-statement-row {

    grid-template-columns: none !important;

}


/* Amount visibility */

.mu-amount {

    position: static !important;

    float: none !important;

    transform: none !important;

    margin: 0 !important;

    opacity: 1 !important;

    visibility: visible !important;

}


/* Very small phones */

@media (max-width: 380px) {

    .mu-row-main {

        grid-template-columns:
            minmax(0, 1fr)
            minmax(82px, auto) !important;

        column-gap: 8px !important;

    }


    .mu-row-right {

        min-width: 82px !important;
        max-width: 110px !important;

    }


    .mu-amount {

        font-size: 13px !important;

    }


    .mu-balance {

        grid-template-columns:
            minmax(0, 1fr)
            minmax(100px, auto) !important;

        column-gap: 8px !important;

    }


    .mu-balance-value {

        font-size: 11px !important;

    }

}

        }

        `;


        document.head.appendChild(
            style
        );

    }



    /* =====================================================
       FIND CUSTOMER TABLE HEADER
       ===================================================== */

    function findCustomerHeader(
        reportTable
    ) {

        if (
            !reportTable?.parentElement
        ) {

            return null;

        }


        const siblings =
            Array.from(
                reportTable.parentElement.children
            );


        return (
            siblings.find(
                element => {

                    if (
                        element === reportTable
                    ) {

                        return false;

                    }


                    const text =
                        String(
                            element.textContent || ""
                        )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim()
                            .toLowerCase();


                    return (
                        text.includes("date") &&
                        text.includes("details") &&
                        text.includes("gave") &&
                        text.includes("got") &&
                        text.includes("balance")
                    );

                }
            ) ||
            null
        );

    }



    /* =====================================================
       CUSTOMER MOBILE STATEMENT
       =====================================================

       IMPORTANT:

       We use currentCustomerStatementSummary.

       We do NOT parse the squeezed desktop columns.
       We do NOT recalculate the statement totals.
       ===================================================== */

    function renderMobileCustomerStatement() {

        if (!isMobile()) {
            return;
        }


        const table =
            document.getElementById(
                "reportTable"
            );


        const summary =
            window.currentCustomerStatementSummary;


        if (
            !table ||
            !summary
        ) {

            return;

        }


        /*
         * IMPORTANT MOBILE WIDTH FIX:
         * reportTable is inside a desktop fixed/min-width shell.
         * Reset that shell only on the mobile statement screen.
         */
        const customerShell =
            table.parentElement;

        if (customerShell) {
            customerShell.classList.add(
                "mu-statement-shell",
                "mu-customer-shell"
            );

            customerShell.parentElement
                ?.classList.add(
                    "mu-statement-scroll-host"
                );
        }


        /*
         * Remove previous mobile version.
         */
        table
            .querySelectorAll(
                ".mu-customer-statement"
            )
            .forEach(
                element =>
                    element.remove()
            );


        const transactions =
            Array.isArray(
                summary.transactions
            )
                ? [...summary.transactions]
                : [];


        /*
         * Use project's own statement sorting when possible.
         */
        let sorted =
            transactions;


        if (
            typeof window.sortStatementTransactions ===
            "function"
        ) {

            try {

                sorted =
                    window.sortStatementTransactions(
                        transactions
                    );

            }
            catch (error) {

                sorted =
                    transactions;

            }

        }


        let runningBalance =
            Number(
                summary.openingBalance
            ) || 0;


        let html = `

            <div class="mu-customer-statement mu-statement">

                <!-- OPENING BALANCE -->

                <div class="mu-statement-row mu-special">

                    <div class="mu-row-main">

                        <div class="mu-row-left">

                            <div class="mu-row-title">
                                Opening Balance
                            </div>

                            <div class="mu-row-meta">

                                <span>
                                    ${summary.from
                ? escapeHTML(
                    formatDate(
                        summary.from
                    )
                )
                : "All Time"
            }
                                </span>

                            </div>

                        </div>


                        <div class="mu-row-right">

                            <div class="mu-amount mu-amount-normal">

                                ${escapeHTML(
                customerBalanceText(
                    runningBalance
                )
            )}

                            </div>

                        </div>

                    </div>

                </div>

        `;


        if (
            sorted.length === 0
        ) {

            html += `

                <div class="mu-empty">
                    No transactions in this period
                </div>

            `;

        }


        sorted.forEach(
            txn => {

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


                runningBalance +=
                    signedCustomerAmount(
                        txn
                    );


                const isGave =
                    type === "gave";


                const note =
                    txn?.note ||
                    "Transaction";


                html += `

                    <div class="mu-statement-row">

                        <div class="mu-row-main">

                            <div class="mu-row-left">

                                <div class="mu-row-title">

                                    ${escapeHTML(note)}

                                </div>


                                <div class="mu-row-meta">

                                    <span>
                                        ${escapeHTML(
                    formatDate(
                        txn?.date
                    )
                )}
                                    </span>

                                </div>

                            </div>


                            <div class="mu-row-right">

                                <div
                                    class="
                                        mu-amount
                                        ${isGave
                        ? "mu-amount-red"
                        : "mu-amount-green"
                    }
                                    "
                                >

                                    ${isGave
                        ? "-"
                        : "+"
                    }₹${money(amount)}

                                </div>


                                <div
                                    class="
                                        mu-type
                                        ${isGave
                        ? "mu-amount-red"
                        : "mu-amount-green"
                    }
                                    "
                                >

                                    ${isGave
                        ? "Gave"
                        : "Got"
                    }

                                </div>

                            </div>

                        </div>


                        <div class="mu-balance">

                            <span>
                                Balance
                            </span>


                            <span class="mu-balance-value">

                                ${escapeHTML(
                        customerBalanceText(
                            runningBalance
                        )
                    )}

                            </span>

                        </div>

                    </div>

                `;

            }
        );


        /*
         * Use summary closingBalance as the authoritative
         * closing figure calculated by existing report code.
         */
        const closingBalance =
            Number(
                summary.closingBalance
            );


        const finalBalance =
            Number.isFinite(
                closingBalance
            )
                ? closingBalance
                : runningBalance;


        html += `

                <!-- CLOSING BALANCE -->

                <div class="mu-statement-row mu-special">

                    <div class="mu-row-main">

                        <div class="mu-row-left">

                            <div class="mu-row-title">
                                Closing Balance
                            </div>

                            <div class="mu-row-meta">

                                <span>
                                    ${summary.to
                ? escapeHTML(
                    formatDate(
                        summary.to
                    )
                )
                : "Current"
            }
                                </span>

                            </div>

                        </div>


                        <div class="mu-row-right">

                            <div class="mu-amount mu-amount-normal">

                                ${escapeHTML(
                customerBalanceText(
                    finalBalance
                )
            )}

                            </div>

                        </div>

                    </div>

                </div>


            </div>

        `;


        table.insertAdjacentHTML(
            "beforeend",
            html
        );


        table.classList.add(
            "mu-mobile-active"
        );


        const heading =
            findCustomerHeader(
                table
            );


        if (heading) {

            heading.classList.add(
                "mu-hide-customer-heading"
            );

        }

    }



    /* =====================================================
       CASHBOOK STATEMENT FINDER
       ===================================================== */

    function findCashbookDesktopHeader() {

        if (!isMobile()) {
            return null;
        }


        const right =
            document.getElementById(
                "rightPanel"
            );


        if (!right) {
            return null;
        }


        const elements =
            Array.from(
                right.querySelectorAll(
                    "div"
                )
            );


        return (
            elements.find(
                element => {

                    const directChildren =
                        Array.from(
                            element.children || []
                        );


                    if (
                        directChildren.length !== 6
                    ) {

                        return false;

                    }


                    const labels =
                        directChildren.map(
                            child =>
                                String(
                                    child.textContent || ""
                                )
                                    .replace(
                                        /\s+/g,
                                        " "
                                    )
                                    .trim()
                                    .toLowerCase()
                        );


                    return (
                        labels[0] === "date" &&
                        labels[1] === "details" &&
                        labels[2] === "mode" &&
                        labels[3] === "cash in" &&
                        labels[4] === "cash out" &&
                        labels[5] === "balance"
                    );

                }
            ) ||
            null
        );

    }



    /* =====================================================
       CASHBOOK MOBILE STATEMENT
       ===================================================== */

    function renderMobileCashbookStatement() {

        if (!isMobile()) {
            return;
        }


        const summary =
            window.currentCashbookStatementSummary;


        if (!summary) {
            return;
        }


        const desktopHeader =
            findCashbookDesktopHeader();


        if (!desktopHeader) {
            return;
        }


        const container =
            desktopHeader.parentElement;


        if (!container) {
            return;
        }


        /*
         * IMPORTANT MOBILE WIDTH FIX:
         * Cashbook desktop statement uses a min-width desktop
         * wrapper. The mobile card statement is inserted into the
         * same wrapper, so reset it only while mobile is active.
         */
        container.classList.add(
            "mu-statement-shell",
            "mu-cash-shell"
        );

        container.parentElement
            ?.classList.add(
                "mu-statement-scroll-host"
            );


        /*
         * Remove old mobile statement.
         */
        container
            .querySelectorAll(
                ":scope > .mu-cash-statement"
            )
            .forEach(
                element =>
                    element.remove()
            );


        /*
         * Hide the six-column desktop statement header.
         */
        desktopHeader.classList.add(
            "mu-cash-heading-hidden"
        );


        /*
         * Hide original six-column statement rows only.
         *
         * Summary cards / filters remain untouched.
         */
        Array.from(
            container.children
        )
            .forEach(
                element => {

                    if (
                        element ===
                        desktopHeader
                    ) {

                        return;

                    }


                    if (
                        element.classList.contains(
                            "mu-cash-statement"
                        )
                    ) {

                        return;

                    }


                    const children =
                        Array.from(
                            element.children || []
                        );


                    /*
                     * Transaction rows normally have
                     * six direct cells.
                     *
                     * Closing row can have a slightly
                     * different layout, so also inspect text.
                     */
                    const text =
                        String(
                            element.textContent || ""
                        )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim()
                            .toLowerCase();


                    if (
                        children.length === 6 ||
                        text.includes(
                            "closing balance"
                        ) ||
                        text.includes(
                            "opening balance"
                        )
                    ) {

                        element.classList.add(
                            "mu-cash-original"
                        );

                    }

                }
            );


        const transactions =
            Array.isArray(
                summary.transactions
            )
                ? [...summary.transactions]
                : [];


        let sorted =
            transactions;


        if (
            typeof window.sortCashStatementTransactions ===
            "function"
        ) {

            try {

                sorted =
                    window.sortCashStatementTransactions(
                        transactions
                    );

            }
            catch (error) {

                sorted =
                    transactions;

            }

        }


        let runningBalance =
            Number(
                summary.openingBalance
            ) || 0;


        let html = `

            <div class="mu-cash-statement mu-statement">

                <!-- OPENING BALANCE -->

                <div class="mu-statement-row mu-special">

                    <div class="mu-row-main">

                        <div class="mu-row-left">

                            <div class="mu-row-title">
                                Opening Balance
                            </div>


                            <div class="mu-row-meta">

                                <span>
                                    ${summary.from
                ? escapeHTML(
                    formatDate(
                        summary.from
                    )
                )
                : "All Time"
            }
                                </span>

                            </div>

                        </div>


                        <div class="mu-row-right">

                            <div class="mu-amount mu-amount-normal">

                                ${escapeHTML(
                cashBalanceText(
                    runningBalance
                )
            )}

                            </div>

                        </div>

                    </div>

                </div>

        `;


        if (
            sorted.length === 0
        ) {

            html += `

                <div class="mu-empty">
                    No transactions in this period
                </div>

            `;

        }


        sorted.forEach(
            txn => {

                /*
                 * Cashbook transaction amount is signed:
                 *
                 * positive = Cash In
                 * negative = Cash Out
                 */
                const signedAmount =
                    Number(
                        txn?.amount
                    ) || 0;


                runningBalance +=
                    signedAmount;


                const isCashIn =
                    signedAmount >= 0;


                const amount =
                    Math.abs(
                        signedAmount
                    );


                const note =
                    txn?.note ||
                    "Transaction";


                const mode =
                    txn?.mode ||
                    "";


                html += `

                    <div class="mu-statement-row">

                        <div class="mu-row-main">

                            <div class="mu-row-left">

                                <div class="mu-row-title">

                                    ${escapeHTML(note)}

                                </div>


                                <div class="mu-row-meta">

                                    <span>
                                        ${escapeHTML(
                    formatDate(
                        txn?.date
                    )
                )}
                                    </span>


                                    ${mode
                        ? `
                                                <span>•</span>

                                                <span>
                                                    ${escapeHTML(mode)}
                                                </span>
                                              `
                        : ""
                    }

                                </div>

                            </div>


                            <div class="mu-row-right">

                                <div
                                    class="
                                        mu-amount
                                        ${isCashIn
                        ? "mu-amount-green"
                        : "mu-amount-red"
                    }
                                    "
                                >

                                    ${isCashIn
                        ? "+"
                        : "-"
                    }₹${money(amount)}

                                </div>


                                <div
                                    class="
                                        mu-type
                                        ${isCashIn
                        ? "mu-amount-green"
                        : "mu-amount-red"
                    }
                                    "
                                >

                                    ${isCashIn
                        ? "Cash In"
                        : "Cash Out"
                    }

                                </div>

                            </div>

                        </div>


                        <div class="mu-balance">

                            <span>
                                Balance
                            </span>


                            <span class="mu-balance-value">

                                ${escapeHTML(
                        cashBalanceText(
                            runningBalance
                        )
                    )}

                            </span>

                        </div>

                    </div>

                `;

            }
        );


        const closingBalance =
            Number(
                summary.closingBalance
            );


        const finalBalance =
            Number.isFinite(
                closingBalance
            )
                ? closingBalance
                : runningBalance;


        html += `

                <!-- CLOSING BALANCE -->

                <div class="mu-statement-row mu-special">

                    <div class="mu-row-main">

                        <div class="mu-row-left">

                            <div class="mu-row-title">
                                Closing Balance
                            </div>


                            <div class="mu-row-meta">

                                <span>
                                    ${summary.to
                ? escapeHTML(
                    formatDate(
                        summary.to
                    )
                )
                : "Current"
            }
                                </span>

                            </div>

                        </div>


                        <div class="mu-row-right">

                            <div class="mu-amount mu-amount-normal">

                                ${escapeHTML(
                cashBalanceText(
                    finalBalance
                )
            )}

                            </div>

                        </div>

                    </div>

                </div>


            </div>

        `;


        desktopHeader.insertAdjacentHTML(
            "afterend",
            html
        );

    }



    /* =====================================================
       DASHBOARD STATE
       ===================================================== */

    const dashboardState = {

        active: false,

        child: false

    };


    function rightPanel() {

        return document.getElementById(
            "rightPanel"
        );

    }


    function showDetail() {

        if (
            typeof window.showDetailPanel ===
            "function"
        ) {

            window.showDetailPanel();

            return;

        }


        const left =
            document.getElementById(
                "leftPanel"
            );


        const right =
            rightPanel();


        if (left) {

            left.style.transform =
                "translateX(-100%)";

        }


        if (right) {

            right.style.transform =
                "translateX(0)";

        }

    }


    function showList() {

        if (
            typeof window.showListPanel ===
            "function"
        ) {

            window.showListPanel();

            return;

        }


        const left =
            document.getElementById(
                "leftPanel"
            );


        const right =
            rightPanel();


        if (left) {

            left.style.transform =
                "translateX(0)";

        }


        if (right) {

            right.style.transform =
                "translateX(100%)";

        }

    }


    function removeDashboardHeader() {

        document
            .querySelectorAll(
                ".mu-dashboard-header"
            )
            .forEach(
                element =>
                    element.remove()
            );

    }


    function addDashboardHeader(
        title,
        child
    ) {

        if (!isMobile()) {
            return;
        }


        const right =
            rightPanel();


        if (!right) {
            return;
        }


        removeDashboardHeader();


        const header =
            document.createElement(
                "div"
            );


        header.className =
            "mu-dashboard-header";


        header.innerHTML = `

            <button
                type="button"
                data-mu-dashboard-back
                aria-label="Back"
            >
                ←
            </button>


            <div class="mu-dashboard-title">

                ${escapeHTML(
            title || "Dashboard"
        )}

            </div>

        `;


        header
            .querySelector(
                "[data-mu-dashboard-back]"
            )
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (child) {

                        openMobileDashboard();

                        return;

                    }


                    dashboardState.active =
                        false;


                    dashboardState.child =
                        false;


                    right.classList.remove(
                        "mu-dashboard-active"
                    );


                    removeDashboardHeader();


                    showList();

                }
            );


        right.prepend(
            header
        );

    }



    async function openMobileDashboard() {

        if (!isMobile()) {
            return;
        }


        if (
            typeof window.openDashboard !==
            "function"
        ) {

            return;

        }


        dashboardState.active =
            true;


        dashboardState.child =
            false;


        try {

            await window.openDashboard();

        }
        catch (error) {

            console.error(
                "Dashboard mobile error:",
                error
            );

        }


        showDetail();


        const right =
            rightPanel();


        if (right) {

            right.classList.add(
                "mu-dashboard-active"
            );


            addDashboardHeader(
                "Dashboard",
                false
            );


            right.scrollTop =
                0;

        }


        if (
            typeof window.setActiveNav ===
            "function"
        ) {

            window.setActiveNav(
                "dashboard"
            );

        }


        if (
            typeof window.setFAB ===
            "function"
        ) {

            window.setFAB(
                "dashboard"
            );

        }

    }



    /* =====================================================
       DASHBOARD NAV WRAPPER
       ===================================================== */

    function installDashboardMobileGo() {

        const original =
            window.mobileGo;


        if (
            typeof original !==
            "function" ||
            original.__muWrapped
        ) {

            return;

        }


        function wrapped(screen) {

            if (
                !isMobile() ||
                screen !== "dashboard"
            ) {

                dashboardState.active =
                    false;


                dashboardState.child =
                    false;


                rightPanel()
                    ?.classList
                    .remove(
                        "mu-dashboard-active"
                    );


                removeDashboardHeader();


                return original.apply(
                    this,
                    arguments
                );

            }


            openMobileDashboard();

        }


        wrapped.__muWrapped =
            true;


        wrapped.__original =
            original;


        window.mobileGo =
            wrapped;

    }



    /* =====================================================
       DASHBOARD OPEN WRAPPER
       ===================================================== */

    function installBusinessOpenWrapper() {

        const original =
            window.selectBusinessFromDashboard;


        if (
            typeof original !==
            "function" ||
            original.__muWrapped
        ) {

            return;

        }


        async function wrapped() {

            if (!isMobile()) {

                return original.apply(
                    this,
                    arguments
                );

            }


            dashboardState.active =
                true;


            dashboardState.child =
                true;


            const result =
                await original.apply(
                    this,
                    arguments
                );


            requestAnimationFrame(
                () => {

                    requestAnimationFrame(
                        () => {

                            showDetail();


                            const right =
                                rightPanel();


                            if (right) {

                                right.classList.add(
                                    "mu-dashboard-active"
                                );


                                addDashboardHeader(
                                    "Business",
                                    true
                                );


                                right.scrollTop =
                                    0;

                            }

                        }
                    );

                }
            );


            return result;

        }


        wrapped.__muWrapped =
            true;


        wrapped.__original =
            original;


        window.selectBusinessFromDashboard =
            wrapped;

    }



    /* =====================================================
       DASHBOARD REPORT WRAPPER
       ===================================================== */

    function installBusinessReportWrapper() {

        const original =
            window.openBusinessReport;


        if (
            typeof original !==
            "function" ||
            original.__muWrapped
        ) {

            return;

        }


        async function wrapped() {

            if (!isMobile()) {

                return original.apply(
                    this,
                    arguments
                );

            }


            dashboardState.active =
                true;


            dashboardState.child =
                true;


            const result =
                await original.apply(
                    this,
                    arguments
                );


            requestAnimationFrame(
                () => {

                    requestAnimationFrame(
                        () => {

                            showDetail();


                            const right =
                                rightPanel();


                            if (right) {

                                right.classList.add(
                                    "mu-dashboard-active"
                                );


                                addDashboardHeader(
                                    "Business Report",
                                    true
                                );


                                right.scrollTop =
                                    0;

                            }

                        }
                    );

                }
            );


            return result;

        }


        wrapped.__muWrapped =
            true;


        wrapped.__original =
            original;


        window.openBusinessReport =
            wrapped;

    }



    /* =====================================================
       EXISTING MOBILE BACK INTEGRATION
       ===================================================== */

    function installBackWrapper() {

        const original =
            window.mobileBack;


        if (
            typeof original !==
            "function" ||
            original.__muWrapped
        ) {

            return;

        }


        function wrapped() {

            if (
                !isMobile() ||
                !dashboardState.active
            ) {

                return original.apply(
                    this,
                    arguments
                );

            }


            /*
             * Let existing mobile.js handle an open modal
             * or focused keyboard field.
             */
            const active =
                document.activeElement;


            const modal =
                document.getElementById(
                    "modal"
                );


            if (
                active &&
                active.closest?.("#modal") &&
                active.matches?.(
                    "input, textarea, select"
                )
            ) {

                return original.apply(
                    this,
                    arguments
                );

            }


            if (
                modal &&
                !modal.classList.contains(
                    "hidden"
                ) &&
                modal.innerHTML.trim()
            ) {

                return original.apply(
                    this,
                    arguments
                );

            }


            if (
                dashboardState.child
            ) {

                openMobileDashboard();

                return;

            }


            dashboardState.active =
                false;


            dashboardState.child =
                false;


            rightPanel()
                ?.classList
                .remove(
                    "mu-dashboard-active"
                );


            removeDashboardHeader();


            showList();

        }


        wrapped.__muWrapped =
            true;


        wrapped.__original =
            original;


        window.mobileBack =
            wrapped;

    }



    /* =====================================================
       MOBILE STATEMENT REFRESH
       ===================================================== */

    let refreshTimer = null;


    function refreshMobileStatements() {

        if (!isMobile()) {
            return;
        }


        clearTimeout(
            refreshTimer
        );


        refreshTimer =
            setTimeout(
                () => {

                    renderMobileCustomerStatement();

                    renderMobileCashbookStatement();

                },
                80
            );

    }



    /* =====================================================
       DOM OBSERVER
       ===================================================== */

    function installObserver() {

        if (
            !document.body
        ) {

            return;

        }


        const observer =
            new MutationObserver(
                mutations => {

                    if (!isMobile()) {
                        return;
                    }


                    /*
                     * Ignore DOM changes generated by our
                     * own mobile statement elements.
                     */
                    const externalChange =
                        mutations.some(
                            mutation => {

                                const target =
                                    mutation.target;


                                if (
                                    target?.closest?.(
                                        ".mu-customer-statement, .mu-cash-statement, .mu-dashboard-header"
                                    )
                                ) {

                                    return false;

                                }


                                return true;

                            }
                        );


                    if (
                        externalChange
                    ) {

                        refreshMobileStatements();

                    }

                }
            );


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );


        window.__mobileUpdateObserver =
            observer;

    }



    /* =====================================================
       RESTORE DESKTOP
       ===================================================== */

    function restoreDesktopStatementView() {

        if (isMobile()) {
            return;
        }


        document
            .querySelectorAll(
                ".mu-customer-statement, .mu-cash-statement"
            )
            .forEach(
                element =>
                    element.remove()
            );


        document
            .querySelectorAll(
                ".mu-hide-customer-heading"
            )
            .forEach(
                element =>
                    element.classList.remove(
                        "mu-hide-customer-heading"
                    )
            );


        document
            .querySelectorAll(
                ".mu-cash-heading-hidden"
            )
            .forEach(
                element =>
                    element.classList.remove(
                        "mu-cash-heading-hidden"
                    )
            );


        document
            .querySelectorAll(
                ".mu-cash-original"
            )
            .forEach(
                element =>
                    element.classList.remove(
                        "mu-cash-original"
                    )
            );


        document
            .getElementById(
                "reportTable"
            )
            ?.classList
            .remove(
                "mu-mobile-active"
            );


        document
            .querySelectorAll(
                ".mu-statement-shell"
            )
            .forEach(
                element =>
                    element.classList.remove(
                        "mu-statement-shell",
                        "mu-customer-shell",
                        "mu-cash-shell"
                    )
            );


        document
            .querySelectorAll(
                ".mu-statement-scroll-host"
            )
            .forEach(
                element =>
                    element.classList.remove(
                        "mu-statement-scroll-host"
                    )
            );


        rightPanel()
            ?.classList
            .remove(
                "mu-dashboard-active"
            );


        removeDashboardHeader();


        dashboardState.active =
            false;


        dashboardState.child =
            false;

    }



    /* =====================================================
       RESIZE
       ===================================================== */

    let resizeTimer = null;


    function handleResize() {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    if (isMobile()) {

                        refreshMobileStatements();

                    }
                    else {

                        restoreDesktopStatementView();

                    }

                },
                120
            );

    }



    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initialize() {

        if (
            window.__mobileUpdateV2Installed
        ) {

            return;

        }


        window.__mobileUpdateV2Installed =
            true;


        installStyles();






        installObserver();


        window.addEventListener(
            "resize",
            handleResize,
            {
                passive: true
            }
        );


        window.addEventListener(
            "orientationchange",
            handleResize,
            {
                passive: true
            }
        );


        if (isMobile()) {

            /*
             * Run several times because report data can be
             * assigned immediately before/after DOM render.
             */
            refreshMobileStatements();


            setTimeout(
                refreshMobileStatements,
                250
            );


            setTimeout(
                refreshMobileStatements,
                700
            );

        }


        console.log(
            "✅ mobile_update.js v3 width-shell fix loaded"
        );

    }



    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    }
    else {

        initialize();

    }





    /* =========================================================
       MOBILE HEADER NORMALIZER - V5
       =========================================================
       IMPORTANT:
       - Mobile only.
       - Does NOT replace Cashbook/Dashboard/Customer renderers.
       - Keeps the proven statement-width fixes above.
       - Uses the existing mobile.js showListPanel/showDetailPanel routing.
       - Root Cashbook/Dashboard screens get a visible Back button.
       - Detail screens reuse their existing mobileBack() buttons.
       ========================================================= */

    function installV5HeaderStyles() {

        if (document.getElementById("muV5HeaderStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "muV5HeaderStyles";

        style.textContent = `
            @media (max-width: 768px) {

                .mu-v5-root-back,
                #rightPanel .mu-v5-detail-back {
                    width: 40px !important;
                    height: 40px !important;
                    min-width: 40px !important;
                    min-height: 40px !important;
                    padding: 0 !important;
                    margin: 0 !important;

                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;

                    border: 1px solid #374151 !important;
                    border-radius: 10px !important;

                    background: #1f2937 !important;
                    color: #f9fafb !important;

                    font-size: 20px !important;
                    font-weight: 500 !important;
                    line-height: 1 !important;

                    flex: 0 0 40px !important;

                    -webkit-tap-highlight-color: transparent;
                }

                .mu-v5-root-back:active,
                #rightPanel .mu-v5-detail-back:active {
                    transform: scale(.94);
                    background: #374151 !important;
                }

                .mu-v5-root-title-row {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    min-width: 0 !important;
                }

                .mu-v5-root-title {
                    min-width: 0 !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }

                #rightPanel .mu-v5-detail-title {
                    min-width: 0 !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }

                /*
                 * Do not allow an older experimental unified header
                 * to sit behind/above the real screen header.
                 */
                #rightPanel > .mu-detail-header,
                #rightPanel > .mu-dashboard-header {
                    display: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function v5GoCustomers() {

        /*
         * Root-screen Back:
         * Cashbook/Dashboard -> Customers.
         *
         * Use the real mobile.js navigation function.
         */
        if (typeof window.mobileGo === "function") {
            window.mobileGo("customers");
            return;
        }

        if (typeof window.openCustomers === "function") {
            window.openCustomers();
        }

        if (typeof window.showListPanel === "function") {
            window.showListPanel();
        }
    }


    function createV5RootBack() {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "mu-v5-root-back";
        button.setAttribute("aria-label", "Back");
        button.textContent = "←";

        button.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();
                v5GoCustomers();
            }
        );

        return button;
    }


    function findExactTextElement(root, values) {

        if (!root) return null;

        const wanted = new Set(
            values.map(
                value =>
                    String(value)
                        .replace(/\s+/g, " ")
                        .trim()
            )
        );

        const all = root.querySelectorAll("*");

        for (const element of all) {

            /*
             * Prefer leaf-ish elements so we don't accidentally
             * replace a whole header container.
             */
            if (element.children.length > 1) {
                continue;
            }

            const text =
                String(element.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim();

            if (wanted.has(text)) {
                return element;
            }
        }

        return null;
    }


    function enhanceCashbookRootHeader() {

        if (!isMobile()) return;

        const section =
            document.getElementById("cashbookSection");

        if (
            !section ||
            section.classList.contains("hidden")
        ) {
            return;
        }

        if (
            section.querySelector(
                ".mu-v5-cashbook-root-back"
            )
        ) {
            return;
        }

        const title =
            findExactTextElement(
                section,
                [
                    "💰 Cashbook",
                    "Cashbook"
                ]
            );

        if (!title) {
            return;
        }

        /*
         * Avoid matching an account/detail title.
         * Cashbook master title should live outside rightPanel.
         */
        if (title.closest("#rightPanel")) {
            return;
        }

        title.textContent = "Cashbook";
        title.classList.add(
            "mu-v5-root-title"
        );

        const parent =
            title.parentElement;

        if (!parent) {
            return;
        }

        parent.classList.add(
            "mu-v5-root-title-row"
        );

        const back =
            createV5RootBack();

        back.classList.add(
            "mu-v5-cashbook-root-back"
        );

        parent.insertBefore(
            back,
            title
        );
    }


    function enhanceDashboardRootHeader() {

        if (!isMobile()) return;

        const section =
            document.getElementById(
                "dashboardSection"
            );

        if (
            !section ||
            section.classList.contains("hidden")
        ) {
            return;
        }

        const container =
            document.getElementById(
                "dashboardContent"
            );

        if (!container) {
            return;
        }

        if (
            container.querySelector(
                ".mu-v5-dashboard-root-back"
            )
        ) {
            return;
        }

        const title =
            findExactTextElement(
                container,
                [
                    "📊 Dashboard",
                    "Dashboard"
                ]
            );

        if (!title) {
            return;
        }

        title.textContent =
            "Dashboard";

        title.classList.add(
            "mu-v5-root-title"
        );

        /*
         * dashboard.js puts the title inside a small text block.
         * We want Back + that complete text block, so use the
         * title's parent as the heading block.
         */
        const headingBlock =
            title.parentElement;

        const row =
            headingBlock?.parentElement;

        if (
            !headingBlock ||
            !row
        ) {
            return;
        }

        row.classList.add(
            "mu-v5-root-title-row"
        );

        const back =
            createV5RootBack();

        back.classList.add(
            "mu-v5-dashboard-root-back"
        );

        row.insertBefore(
            back,
            headingBlock
        );
    }


    function enhanceDetailBackButtons() {

        if (!isMobile()) return;

        const panel =
            document.getElementById(
                "rightPanel"
            );

        if (!panel) {
            return;
        }

        /*
         * Cashbook, Dashboard Open, Dashboard Report and
         * Customer statement already create real mobileBack()
         * buttons. Reuse them instead of adding another header.
         */
        panel
            .querySelectorAll(
                'button[onclick*="mobileBack()"]'
            )
            .forEach(
                button => {

                    button.classList.add(
                        "mu-v5-detail-back"
                    );

                    button.textContent =
                        "←";

                    button.setAttribute(
                        "aria-label",
                        "Back"
                    );

                    /*
                     * Mark the nearest sibling title where possible.
                     */
                    const row =
                        button.parentElement;

                    const title =
                        row?.querySelector(
                            ".font-semibold, .font-bold, .text-lg"
                        );

                    title?.classList.add(
                        "mu-v5-detail-title"
                    );
                }
            );
    }


    function refreshV5Headers() {

        if (!isMobile()) {
            return;
        }

        enhanceCashbookRootHeader();
        enhanceDashboardRootHeader();
        enhanceDetailBackButtons();
    }


    function installV5HeaderObserver() {

        if (
            window.__muV5HeaderObserver
        ) {
            return;
        }

        const observer =
            new MutationObserver(
                () => {

                    if (!isMobile()) {
                        return;
                    }

                    requestAnimationFrame(
                        refreshV5Headers
                    );
                }
            );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        window.__muV5HeaderObserver =
            observer;
    }


    installV5HeaderStyles();
    installV5HeaderObserver();

    requestAnimationFrame(
        refreshV5Headers
    );

    setTimeout(
        refreshV5Headers,
        250
    );

    setTimeout(
        refreshV5Headers,
        800
    );

    console.log(
        "✅ mobile_update.js v5 stable mobile headers loaded"
    );

})();
