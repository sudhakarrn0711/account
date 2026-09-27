/* =========================================================
   RANSAN ACCOUNT LEDGER
   STABLE API ENGINE
   ========================================================= */


/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API =
    "https://script.google.com/macros/s/AKfycbzww1YOwhD18RuvKKQsSm-bcTKCZcBFbzE1r7hFc0JjM-rDCamBG5_0_zRcgqG3f5Sv/exec";


const API_TIMEOUT_MS =
    20000;


/*
 * GET requests can safely retry because they do not
 * change ledger data.
 */

const API_GET_MAX_RETRIES =
    2;


/*
 * IMPORTANT:
 *
 * Do NOT automatically retry POST requests.
 *
 * A POST may already have reached Apps Script even if
 * the browser loses the response.
 *
 * Retrying could create duplicate transactions.
 */

const API_POST_MAX_RETRIES =
    0;


/*
 * Short-lived GET cache.
 *
 * Prevents the same data from being requested repeatedly
 * while the user quickly moves between screens.
 */

const API_CACHE_TTL_MS =
    60000;


/* =========================================================
   INTERNAL API STATE
   ========================================================= */

const pendingGetRequests =
    new Map();


const apiResponseCache =
    new Map();


let activeApiRequests =
    0;


/* =========================================================
   ENVIRONMENT
   ========================================================= */

const envToggle =
    document.getElementById(
        "envToggle"
    );


const savedEnv =
    String(
        localStorage.getItem(
            "env"
        ) ||
        "test"
    )
        .trim()
        .toLowerCase();


if (envToggle) {

    envToggle.checked =
        savedEnv === "live";


    envToggle.onchange =
        function () {

            const env =
                envToggle.checked
                    ? "live"
                    : "test";


            localStorage.setItem(
                "env",
                env
            );


            /*
             * Environment really changes the entire
             * backend data source, so a reload is
             * appropriate here.
             */

            location.reload();

        };

}


/* =========================================================
   GET CURRENT ENVIRONMENT
   ========================================================= */

function getEnv() {

    const toggle =
        document.getElementById(
            "envToggle"
        );


    if (toggle) {

        return toggle.checked
            ? "live"
            : "test";

    }


    return String(
        localStorage.getItem(
            "env"
        ) ||
        "test"
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   WAIT
   ========================================================= */

function wait(
    ms
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* =========================================================
   REQUEST ACTIVITY
   ========================================================= */

function beginApiRequest() {

    activeApiRequests++;


    document.body
        ?.classList
        .add(
            "api-busy"
        );

}


function endApiRequest() {

    activeApiRequests =
        Math.max(
            0,
            activeApiRequests - 1
        );


    if (
        activeApiRequests === 0
    ) {

        document.body
            ?.classList
            .remove(
                "api-busy"
            );

    }

}


/* =========================================================
   FETCH WITH TIMEOUT
   ========================================================= */

async function fetchWithTimeout(
    url,
    options = {},
    timeout =
        API_TIMEOUT_MS
) {

    const controller =
        new AbortController();


    const timer =
        setTimeout(
            function () {

                controller.abort();

            },
            timeout
        );


    try {

        return await fetch(
            url,
            {
                ...options,

                signal:
                    controller.signal,

                cache:
                    "no-store"
            }
        );

    }

    finally {

        clearTimeout(
            timer
        );

    }

}


/* =========================================================
   STANDARD API ERROR
   ========================================================= */

function apiError(
    message,
    code = "API_ERROR",
    extra = {}
) {

    return {

        error:
            true,

        success:
            false,

        code:
            code,

        message:
            message,

        ...extra

    };

}


/* =========================================================
   FRIENDLY ERROR MESSAGE
   ========================================================= */

function getFriendlyApiMessage(
    error
) {

    if (
        !navigator.onLine
    ) {

        return "Internet connection is unavailable.";

    }


    if (
        error?.name ===
        "AbortError"
    ) {

        return "The server is taking longer than expected. Please try again.";

    }


    return "Unable to connect to the server. Please try again.";

}


/* =========================================================
   RETRY DELAY
   ========================================================= */

function getApiRetryDelay(
    attempt
) {

    return (
        500 *
        Math.pow(
            2,
            attempt
        )
    ) +
    Math.floor(
        Math.random() *
        200
    );

}


/* =========================================================
   BUILD GET URL
   ========================================================= */

function buildApiGetUrl(
    actionOrParams,
    params = {}
) {

    const env =
        getEnv();


    let query =
        {};


    /*
     * OLD FORMAT:
     *
     * apiGet(
     *     "getCustomers",
     *     { bid: "..." }
     * )
     */

    if (
        typeof actionOrParams ===
        "string"
    ) {

        query = {

            action:
                actionOrParams,

            ...params,

            env:
                env

        };

    }


    /*
     * NEW FORMAT:
     *
     * apiGet({
     *     action: "...",
     *     bid: "..."
     * })
     */

    else if (
        actionOrParams &&
        typeof actionOrParams ===
        "object"
    ) {

        query = {

            ...actionOrParams,

            env:
                env

        };

    }


    return (
        API +
        "?" +
        new URLSearchParams(
            query
        ).toString()
    );

}


/* =========================================================
   CACHE HELPERS
   ========================================================= */

function getCachedApiResponse(
    url
) {

    const cached =
        apiResponseCache.get(
            url
        );


    if (!cached) {

        return null;

    }


    const age =
        Date.now() -
        cached.time;


    if (
        age >
        API_CACHE_TTL_MS
    ) {

        apiResponseCache.delete(
            url
        );


        return null;

    }


    return cached.data;

}


function setCachedApiResponse(
    url,
    data
) {

    if (
        !data ||
        data.error
    ) {

        return;

    }


    apiResponseCache.set(
        url,
        {

            time:
                Date.now(),

            data:
                data

        }
    );

}


/* =========================================================
   CLEAR API CACHE
   ========================================================= */

function clearApiCache() {

    apiResponseCache.clear();

}


/*
 * Clear only cached URLs containing a specific action,
 * business ID, customer ID, etc.
 */

function clearApiCacheMatching(
    text
) {

    const search =
        String(
            text ||
            ""
        ).trim();


    if (!search) {

        clearApiCache();

        return;

    }


    for (
        const key
        of apiResponseCache.keys()
    ) {

        if (
            key.includes(
                search
            )
        ) {

            apiResponseCache.delete(
                key
            );

        }

    }

}


/* =========================================================
   API GET
   ========================================================= */

async function apiGet(
    actionOrParams,
    params = {},
    options = {}
) {

    const url =
        buildApiGetUrl(
            actionOrParams,
            params
        );


    const forceRefresh =
        options &&
        options.forceRefresh ===
        true;


    /*
     * 1. CACHE
     */

    if (!forceRefresh) {

        const cached =
            getCachedApiResponse(
                url
            );


        if (cached !== null) {

            return cached;

        }

    }


    /*
     * 2. REQUEST DEDUPLICATION
     *
     * If two functions request exactly the same URL
     * simultaneously, they share one network request.
     */

    if (
        pendingGetRequests.has(
            url
        )
    ) {

        return pendingGetRequests.get(
            url
        );

    }


    const request =
        (async function () {

            beginApiRequest();


            try {

                for (
                    let attempt = 0;
                    attempt <=
                    API_GET_MAX_RETRIES;
                    attempt++
                ) {

                    try {

                        const response =
                            await fetchWithTimeout(
                                url,
                                {
                                    method:
                                        "GET",

                                    headers: {
                                        Accept:
                                            "application/json"
                                    }
                                }
                            );


                        /*
                         * Retry temporary server problems.
                         */

                        if (!response.ok) {

                            const retryable =
                                response.status ===
                                    429 ||
                                response.status >=
                                    500;


                            if (
                                retryable &&
                                attempt <
                                API_GET_MAX_RETRIES
                            ) {

                                await wait(
                                    getApiRetryDelay(
                                        attempt
                                    )
                                );


                                continue;

                            }


                            return apiError(
                                "Server error (" +
                                response.status +
                                ")",
                                "HTTP_" +
                                response.status,
                                {
                                    status:
                                        response.status
                                }
                            );

                        }


                        const text =
                            await response.text();


                        let data;


                        try {

                            data =
                                JSON.parse(
                                    text
                                );

                        }

                        catch (
                            parseError
                        ) {

                            console.error(
                                "[API] Invalid JSON:",
                                text.slice(
                                    0,
                                    300
                                )
                            );


                            /*
                             * Google occasionally returns an
                             * HTML error page rather than JSON.
                             */

                            if (
                                attempt <
                                API_GET_MAX_RETRIES
                            ) {

                                await wait(
                                    getApiRetryDelay(
                                        attempt
                                    )
                                );


                                continue;

                            }


                            return apiError(
                                "The server returned an invalid response.",
                                "INVALID_JSON"
                            );

                        }


                        setCachedApiResponse(
                            url,
                            data
                        );


                        return data;

                    }

                    catch (
                        error
                    ) {

                        console.error(
                            "[API GET]",
                            error
                        );


                        const retryable =
                            error?.name ===
                                "AbortError" ||
                            navigator.onLine;


                        if (
                            retryable &&
                            attempt <
                            API_GET_MAX_RETRIES
                        ) {

                            await wait(
                                getApiRetryDelay(
                                    attempt
                                )
                            );


                            continue;

                        }


                        const message =
                            getFriendlyApiMessage(
                                error
                            );


                        return apiError(
                            message,
                            error?.name ===
                                "AbortError"
                                ? "TIMEOUT"
                                : "NETWORK_ERROR"
                        );

                    }

                }


                return apiError(
                    "Request failed. Please try again.",
                    "REQUEST_FAILED"
                );

            }

            finally {

                pendingGetRequests.delete(
                    url
                );


                endApiRequest();

            }

        })();


    pendingGetRequests.set(
        url,
        request
    );


    return request;

}


/* =========================================================
   API POST
   ========================================================= */

async function apiPost(
    body
) {

    const env =
        getEnv();


    beginApiRequest();


    try {

        /*
         * IMPORTANT:
         *
         * POST is intentionally executed once.
         *
         * Automatic retry can duplicate:
         * - ledger transactions
         * - cash entries
         * - customers
         * - accounts
         */

        const response =
            await fetchWithTimeout(
                API,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8",

                        Accept:
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            {

                                ...body,

                                env:
                                    env

                            }
                        )

                }
            );


        if (!response.ok) {

            return apiError(
                "Server error (" +
                response.status +
                ")",
                "HTTP_" +
                response.status,
                {
                    status:
                        response.status
                }
            );

        }


        const text =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    text
                );

        }

        catch (
            parseError
        ) {

            console.error(
                "[API POST] Invalid JSON:",
                text.slice(
                    0,
                    300
                )
            );


            return apiError(
                "The server returned an invalid response.",
                "INVALID_JSON"
            );

        }


        /*
         * A successful mutation means existing GET cache
         * could now be stale.
         */

        if (
            data &&
            data.error !== true &&
            data.success !== false
        ) {

            /*
             * PERFORMANCE:
             * Invalidate only data affected by this mutation.
             * Unrelated customer/account detail caches remain warm.
             */
            const action =
                String(body?.action || "");

            const clearCustomerData = () => {
                clearApiCacheMatching("getCustomersWithBalance");
                clearApiCacheMatching("getCustomerTransactions");
            };

            const clearCashbookData = () => {
                clearApiCacheMatching("getAccounts");
                clearApiCacheMatching("getCashbookByAccount");
                clearApiCacheMatching("getCashEntries");
            };

            if (
                action === "addCustomer" ||
                action === "bulkDeleteCustomers" ||
                action === "addTransaction" ||
                action === "deleteTransaction" ||
                action === "markPaid"
            ) {

                clearCustomerData();

            } else if (
                action === "addCashEntry" ||
                action === "updateCashEntry" ||
                action === "deleteCashEntry" ||
                action === "bulkDeleteCashEntry" ||
                action === "addAccount" ||
                action === "updateAccount" ||
                action === "deleteAccount" ||
                action === "bulkDeleteAccounts"
            ) {

                clearCashbookData();

            } else if (
                action === "sendWhatsApp"
            ) {

                /* No ledger data changed. Keep GET caches. */

            } else {

                /* Unknown future mutation: retain old safe behavior. */
                clearApiCache();

            }

        }


        return data;

    }

    catch (
        error
    ) {

        console.error(
            "[API POST]",
            error
        );


        if (
            location.protocol ===
            "file:"
        ) {

            console.warn(
                "Run the Account Ledger through HTTP/HTTPS, not file://"
            );

        }


        const message =
            getFriendlyApiMessage(
                error
            );


        return apiError(
            message,
            error?.name ===
                "AbortError"
                ? "TIMEOUT"
                : "NETWORK_ERROR"
        );

    }

    finally {

        endApiRequest();

    }

}


/* =========================================================
   EXISTING GLOBAL DATA
   ========================================================= */

let currentReportData =
    [];


let customersData =
    [];


/* =========================================================
   BUSINESS FORMATTER
   ========================================================= */

function formatBusinesses(
    raw
) {

    if (
        !Array.isArray(
            raw
        ) ||
        raw.length < 2
    ) {

        return [];

    }


    const headers =
        raw[0];


    return raw
        .slice(
            1
        )
        .map(
            function (
                row
            ) {

                const obj =
                    {};


                headers.forEach(
                    function (
                        header,
                        index
                    ) {

                        obj[
                            header
                        ] =
                            row[
                                index
                            ];

                    }
                );


                return obj;

            }
        );

}


/* =========================================================
   EXISTING APPLICATION STATE
   ========================================================= */

let currentBusiness =
    localStorage.getItem(
        "business"
    ) ||
    "";


let selectedCustomer =
    "";