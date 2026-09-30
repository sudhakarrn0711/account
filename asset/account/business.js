let businessName = "";


/* =========================================================
   BUSINESS CACHE
   =========================================================

   Purpose:

   1. Show the last successful business list immediately.
   2. Refresh from server silently.
   3. Never blank the dropdown during a temporary API issue.
   ========================================================= */

const BUSINESS_CACHE_KEY =
  "account_business_list_v1";


let businessLoadPromise =
  null;


/*
 * Read cached RAW business rows.
 *
 * We cache the raw array because formatBusinesses()
 * already knows how to convert it into objects.
 */

function getCachedBusinesses() {

  try {

    const raw =
      localStorage.getItem(
        BUSINESS_CACHE_KEY
      );


    if (!raw) {
      return null;
    }


    const parsed =
      JSON.parse(raw);


    if (
      !Array.isArray(parsed) ||
      parsed.length < 2
    ) {

      return null;

    }


    return parsed;

  }

  catch (error) {

    console.warn(
      "[BUSINESS CACHE] Unable to read cache:",
      error
    );


    return null;

  }

}


/*
 * Save only successful business responses.
 */

function saveBusinessesToCache(
  data
) {

  if (
    !Array.isArray(data) ||
    data.length < 2
  ) {

    return;

  }


  try {

    localStorage.setItem(
      BUSINESS_CACHE_KEY,
      JSON.stringify(data)
    );

  }

  catch (error) {

    console.warn(
      "[BUSINESS CACHE] Unable to save cache:",
      error
    );

  }

}


/*
 * Render business data without making an API request.
 *
 * Used for BOTH:
 * - instant cached render
 * - fresh server render
 */

function getLoggedInBusinessAccess() {

  const raw =
    sessionStorage.getItem(
      "business_access"
    );

  if (!raw) {
    return ["*"];
  }

  let values = [];

  try {

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      values = parsed.map(String);
    }

  }
  catch (error) {
    // Normal Config value is comma-separated text.
  }

  if (!values.length) {

    values = String(raw)
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

  }

  return values.length
    ? values
    : ["*"];
}


function filterBusinessesForLoggedInUser(data) {

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return data;
  }

  const allowed =
    getLoggedInBusinessAccess();

  if (allowed.includes("*")) {
    return data;
  }

  const allowedIds =
    new Set(
      allowed.map(String)
    );

  return [
    data[0],
    ...data
      .slice(1)
      .filter(row =>
        allowedIds.has(
          String(row?.[0] ?? "")
        )
      )
  ];
}


function renderBusinesses(
  data
) {

  if (
    !Array.isArray(data) ||
    data.length < 2
  ) {

    return false;

  }


  data =
    filterBusinessesForLoggedInUser(
      data
    );


  if (
    !Array.isArray(data) ||
    data.length < 2
  ) {

    window.businesses = [];

    const select =
      document.getElementById(
        "businessSelect"
      );

    if (select) {
      select.innerHTML =
        '<option value="">No permitted businesses</option>';
      select.value = "";
    }

    currentBusiness = "";
    localStorage.removeItem("business");

    return false;
  }


  const formatted =
    formatBusinesses(data);


  if (
    !Array.isArray(formatted) ||
    formatted.length === 0
  ) {

    return false;

  }


  window.businesses =
    formatted;


  const select =
    document.getElementById(
      "businessSelect"
    );


  /*
   * Work out which business should be selected.
   */

  const storedBusiness =
    localStorage.getItem(
      "business"
    );


  const availableIds =
    data
      .slice(1)
      .map(
        function (row) {

          return String(
            row[0]
          );

        }
      );


  let wantedBusiness =
    String(
      currentBusiness ||
      storedBusiness ||
      ""
    );


  /*
   * Stored business may have been deleted.
   * Fall back to first available business.
   */

  if (
    !wantedBusiness ||
    !availableIds.includes(
      wantedBusiness
    )
  ) {

    wantedBusiness =
      String(
        data[1][0]
      );

  }


  currentBusiness =
    wantedBusiness;


  localStorage.setItem(
    "business",
    currentBusiness
  );


  /*
   * Render dropdown.
   */

  if (select) {

    const newHtml =
      data
        .slice(1)
        .map(
          function (business) {

            const id =
              String(
                business[0] ?? ""
              );

            const name =
              String(
                business[1] ?? ""
              );


            return (
              `<option value="${id}">` +
              `${name}` +
              `</option>`
            );

          }
        )
        .join("");


    /*
     * Don't rewrite DOM when nothing changed.
     *
     * This avoids unnecessary visual repaint.
     */

    if (
      select.innerHTML !==
      newHtml
    ) {

      select.innerHTML =
        newHtml;

    }


    select.value =
      currentBusiness;


    select.onchange =
      async function () {

        const id =
          String(
            select.value ||
            ""
          );


        if (!id) {
          return;
        }


        await selectBusiness(
          id
        );

      };

  }


  /*
   * Set global business name.
   */

  const selected =
    formatted.find(
      function (business) {

        return String(
          business.id
        ) ===
        String(
          currentBusiness
        );

      }
    );


  businessName =
    selected
      ? selected.name
      : "My Business";


  /*
   * Business manager/sidebar list.
   */

  const list =
    document.getElementById(
      "businessList"
    );


  if (list) {

    const listHtml =
      formatted
        .map(
          function (b) {

            const isActive =
              String(b.id) ===
              String(currentBusiness);


            return `

              <div
                class="
                  bg-gray-800
                  p-3
                  rounded-xl
                  flex
                  justify-between
                  items-center
                  ${isActive
                    ? "ring-2 ring-green-500"
                    : ""}
                "
              >

                <div
                  onclick="selectBusiness('${b.id}')"
                  class="cursor-pointer"
                >

                  <div
                    class="
                      text-white
                      text-sm
                      font-semibold
                    "
                  >
                    ${b.name || ""}
                  </div>


                  <div
                    class="
                      text-xs
                      text-gray-400
                    "
                  >
                    ${b.business_phone || ""}
                  </div>

                </div>


                <div
                  class="flex gap-2"
                >

                  <button
                    onclick='openBusinessModal(${JSON.stringify(b).replace(/'/g, "&apos;")})'
                    class="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      px-2
                      py-1
                      rounded
                      text-xs
                    "
                  >
                    ✏️
                  </button>


                  <button
                    onclick='openDeleteModal(${JSON.stringify(b.id)})'
                    class="
                      bg-red-600
                      hover:bg-red-700
                      text-white
                      px-2
                      py-1
                      rounded
                      text-xs
                    "
                  >
                    🗑
                  </button>

                </div>

              </div>

            `;

          }
        )
        .join("");


    /*
     * Again, don't repaint when identical.
     */

    if (
      list.innerHTML !==
      listHtml
    ) {

      list.innerHTML =
        listHtml;

    }

  }


  return true;

}



async function loadBusinesses() {

  /*
   * =========================================
   * STAGE 1
   * INSTANT CACHED UI
   * =========================================
   */

  const cachedData =
    getCachedBusinesses();


  let cacheRendered =
    false;


  if (cachedData) {

    cacheRendered =
      renderBusinesses(
        cachedData
      );


    if (cacheRendered) {

      console.log(
        "⚡ Businesses loaded from local cache"
      );

    }

  }


  /*
   * =========================================
   * STAGE 2
   * PREVENT DUPLICATE SERVER REQUESTS
   * =========================================
   */

  if (businessLoadPromise) {

    return businessLoadPromise;

  }


  businessLoadPromise =
    (async function () {

      try {

        /*
         * No Tiny Loader here.
         *
         * If cache exists, the user already sees
         * the business dropdown.
         */

        const data =
          await apiGet(
            "getBusinesses"
          );


        console.log(
          "BUSINESSES RAW:",
          data
        );


        /*
         * API failure:
         *
         * Keep cached business data if available.
         */

        if (
          !data ||
          data.error ||
          !Array.isArray(data) ||
          data.length < 2
        ) {

          console.error(
            "❌ Business refresh failed:",
            data
          );


          /*
           * Only warn the user when we have
           * absolutely no cached businesses.
           */

          if (
            !cacheRendered &&
            typeof showToast ===
              "function"
          ) {

            showToast(
              data?.message ||
              "Unable to load businesses.",
              "error"
            );

          }


          return (
            window.businesses ||
            []
          );

        }


        /*
         * =========================================
         * STAGE 3
         * SAVE FRESH SERVER DATA
         * =========================================
         */

        saveBusinessesToCache(
          data
        );


        /*
         * =========================================
         * STAGE 4
         * UPDATE UI ONLY WHEN SERVER DATA CHANGED
         * =========================================
         */

        const cachedSignature =
          cachedData
            ? JSON.stringify(
                cachedData
              )
            : "";


        const serverSignature =
          JSON.stringify(
            data
          );


        if (
          !cacheRendered ||
          cachedSignature !==
            serverSignature
        ) {

          renderBusinesses(
            data
          );


          console.log(
            "🔄 Business cache refreshed"
          );

        }

        else {

          console.log(
            "✅ Business cache already current"
          );

        }


        /*
         * =========================================
         * CUSTOMER LOAD
         * =========================================
         *
         * Do this only after currentBusiness
         * has been established.
         */

        if (
          typeof openCustomers ===
          "function"
        ) {

          await openCustomers();

        }


        /*
         * =========================================
         * WHATSAPP INITIAL STATUS
         * =========================================
         */

        if (
          typeof checkInitialWhatsAppStatus ===
          "function"
        ) {

          Promise
            .resolve(
              checkInitialWhatsAppStatus()
            )
            .catch(
              function (error) {

                console.error(
                  "[INITIAL WHATSAPP]",
                  error
                );

              }
            );

        }


        /*
         * =========================================
         * TRANSACTION RULES
         * =========================================
         */

        if (
          typeof loadTxnRules ===
          "function"
        ) {

          Promise
            .resolve(
              loadTxnRules()
            )
            .catch(
              function (error) {

                console.error(
                  "[TXN RULES]",
                  error
                );

              }
            );

        }


        return (
          window.businesses ||
          []
        );

      }

      catch (error) {

        console.error(
          "[BUSINESS LOAD]",
          error
        );


        /*
         * Cached dropdown stays visible.
         */

        if (
          !cacheRendered &&
          typeof showToast ===
            "function"
        ) {

          showToast(
            "Unable to refresh businesses.",
            "error"
          );

        }


        return (
          window.businesses ||
          []
        );

      }

      finally {

        businessLoadPromise =
          null;

      }

    })();


  return businessLoadPromise;

}

function openBusinessManager() {

  const modal = document.getElementById("businessModal");

  modal.innerHTML = `
    <div class="bg-gray-800 w-[95%] max-w-md rounded-xl p-4 max-h-[90vh] overflow-y-auto">

      <div class="flex justify-between items-center mb-3">
        <h3 class="text-white text-lg font-semibold">
          Manage Businesses
        </h3>

        <button onclick="closeBusinessModal()" class="text-gray-400">✕</button>
      </div>

      <div id="businessManagerList" class="space-y-2"></div>

    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  renderBusinessManagerList();
}

function renderBusinessManagerList() {

  const container = document.getElementById("businessManagerList");

  if (!window.businesses || window.businesses.length === 0) {
    container.innerHTML = `<div class="text-gray-400">No businesses</div>`;
    return;
  }

  let html = "";

  window.businesses.forEach(b => {

    html += `
      <div class="bg-gray-900 p-3 rounded flex justify-between items-center">

        <div>
          <div class="text-white text-sm">${b.name}</div>
          <div class="text-xs text-gray-400">${b.business_phone || ""}</div>
        </div>

        <div class="flex gap-2">

          <button
            onclick='openBusinessModal(${JSON.stringify(b).replace(/'/g, "&apos;")})'
            class="bg-blue-600 px-2 py-1 rounded text-xs text-white">
            ✏️
          </button>

          <button
            onclick='openDeleteModal(${b.id})'
            class="bg-red-600 px-2 py-1 rounded text-xs text-white">
            🗑
          </button>

        </div>

      </div>
    `;
  });

  container.innerHTML = html;
}

async function selectBusiness(
  id
) {

  const nextBusiness =
    String(
      id ||
      ""
    ).trim();


  if (!nextBusiness) {

    return;

  }


  /*
   * Do nothing when the already-active
   * business is tapped again.
   */

  if (
    String(
      currentBusiness ||
      ""
    ) ===
    nextBusiness
  ) {

    if (
      window.innerWidth <= 768 &&
      typeof window.showListPanel ===
      "function"
    ) {

      window.showListPanel();

    }


    return;

  }


  currentBusiness =
    nextBusiness;


  localStorage.setItem(
    "business",
    currentBusiness
  );


  const selected =
    (
      window.businesses ||
      []
    ).find(
      function (
        business
      ) {

        return String(
          business.id
        ) ===
          currentBusiness;

      }
    );


  businessName =
    selected
      ? selected.name
      : "My Business";


  if (
    typeof businessSelect !==
    "undefined" &&
    businessSelect
  ) {

    businessSelect.value =
      currentBusiness;

  }


  /*
   * Clear cached GET responses because the
   * selected business has changed.
   */

  if (
    typeof clearApiCache ===
    "function"
  ) {

    clearApiCache();

  }


  /*
   * IMPORTANT:
   *
   * Do NOT call:
   *
   *     loadBusinesses()
   *
   * here.
   *
   * We already have window.businesses.
   * Calling loadBusinesses() would request the
   * business list again and load Customers again.
   */


  await openCustomers();


  /*
   * WhatsApp status can load independently.
   * It does not need to block customer rendering.
   */

  if (
    typeof checkWhatsAppStatus ===
    "function"
  ) {

    Promise
      .resolve(
        checkWhatsAppStatus()
      )
      .catch(
        function (
          error
        ) {

          console.error(
            "[WHATSAPP STATUS]",
            error
          );

        }
      );

  }


  /*
   * Mobile: make sure list panel remains stable.
   */

  if (
    window.innerWidth <= 768 &&
    typeof window.showListPanel ===
    "function"
  ) {

    window.showListPanel();

  }

}

let editingBusinessId = null;

function openBusinessModal(business = null) {

  const modal = document.getElementById("businessModal");
  if (!modal) return;

  // ✅ detect edit mode
  const isEdit = !!business;
  editingBusinessId = business?.id || null;

  modal.innerHTML = `
    <div class="bg-gray-800 w-[95%] max-w-md rounded-xl shadow-xl p-4 max-h-[90vh] overflow-y-auto">

      <!-- HEADER -->
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-white font-semibold text-lg">
          ${isEdit ? "Edit Business" : "Add Business"}
        </h3>

        <button onclick="closeBusinessModal()" class="text-gray-400 hover:text-white text-lg">
          ✕
        </button>
      </div>

      <!-- BUSINESS NAME -->
      <input id="bname" value="${business?.name || ""}"
        placeholder="Business Name"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- WHATSAPP CONFIG -->
      <input id="instance_id" value="${business?.instance_id || ""}"
        placeholder="Instance ID"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input id="access_token" value="${business?.access_token || ""}"
        placeholder="Access Token"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input id="api_url"
        value="${business?.api_url || "https://wagrow.cloud/api/send"}"
        placeholder="API URL"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- BUSINESS PHONE -->
      <input id="business_phone" value="${business?.business_phone || ""}"
        placeholder="WhatsApp Number (91xxxxxxxxxx)"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- PAYMENT -->
      <input id="upi_id" value="${business?.upi_id || ""}"
        placeholder="UPI ID"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input id="payee_name" value="${business?.payee_name || ""}"
        placeholder="Payee Name"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <input id="qr_image" value="${business?.qr_image || ""}"
        placeholder="QR Image URL"
        class="w-full p-2 bg-black text-white rounded mt-2 border border-gray-700">

      <!-- STATUS MESSAGE -->
      <div id="modalMsg" class="text-xs mt-3 hidden rounded p-2"></div>

      <!-- ACTION BUTTONS -->
      <div class="flex gap-2 mt-4">

        <!-- SAVE -->
        <button id="saveBtn"
          onclick="saveBusiness()"
          class="bg-green-600 hover:bg-green-700 disabled:opacity-50 w-full p-2 rounded text-white flex justify-center items-center gap-2 transition">

          <span id="btnText">${isEdit ? "Update" : "Save"}</span>

          <span id="btnLoader"
            class="hidden w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin">
          </span>
        </button>

        <!-- DELETE (ONLY EDIT MODE) -->
        ${isEdit ? `
        <button onclick="deleteBusiness(${business.id})"
          class="bg-red-600 hover:bg-red-700 px-4 rounded text-white">
          🗑
        </button>
        ` : ""}

      </div>

    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}


function closeBusinessModal() {
  const modal = document.getElementById("businessModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.innerHTML = "";
}



function closeModal() {
  const modal = document.getElementById("businessModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.innerHTML = "";
}



async function saveBusiness() {

  const modal = document.getElementById("businessModal");

  // =====================================
  // GET VALUES
  // =====================================
  const name =
    document.getElementById("bname")?.value.trim();

  const instance_id =
    document.getElementById("instance_id")?.value.trim();

  const access_token =
    document.getElementById("access_token")?.value.trim();

  const api_url =
    document.getElementById("api_url")?.value.trim();

  const business_phone =
    document.getElementById("business_phone")?.value.trim();

  const upi_id =
    document.getElementById("upi_id")?.value.trim();

  const payee_name =
    document.getElementById("payee_name")?.value.trim();

  const qr_image =
    document.getElementById("qr_image")?.value.trim();

  // =====================================
  // UI ELEMENTS
  // =====================================
  const msg = document.getElementById("modalMsg");
  const btn = document.getElementById("saveBtn");
  const loader = document.getElementById("btnLoader");
  const text = document.getElementById("btnText");

  // =====================================
  // VALIDATION
  // =====================================
  if (!name) {
    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";
    msg.innerText = "Business name required";
    msg.classList.remove("hidden");
    return;
  }

  if (!business_phone) {
    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";
    msg.innerText = "WhatsApp number required";
    msg.classList.remove("hidden");
    return;
  }

  // =====================================
  // AUTO FORMAT PHONE (91)
  // =====================================
  let phone = business_phone.replace(/\D/g, "");

  if (phone.length === 10) {
    phone = "91" + phone;
  }

  if (phone.length === 11 && phone.startsWith("0")) {
    phone = "91" + phone.slice(1);
  }

  if (phone.length !== 12 || !phone.startsWith("91")) {
    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";
    msg.innerText = "Enter valid mobile number (10 digit)";
    msg.classList.remove("hidden");
    return;
  }

  try {

    // =====================================
    // LOADING
    // =====================================
    loader.classList.remove("hidden");
    btn.disabled = true;

    // ✅ CHANGE TEXT BASED ON MODE
    text.innerText = editingBusinessId
      ? "Updating..."
      : "Saving...";

    // =====================================
    // API SAVE (ADD / UPDATE)
    // =====================================
    await apiPost({
      action: editingBusinessId
        ? "updateBusiness"
        : "addBusiness",

      // ✅ ONLY USED IN EDIT MODE
      id: editingBusinessId || "",

      name,
      instance_id,
      access_token,
      api_url,
      business_phone: phone,
      upi_id,
      payee_name,
      qr_image
    });

    // =====================================
    // SUCCESS
    // =====================================
    msg.className =
      "text-green-400 text-xs mt-2 bg-green-900/30 p-2 rounded";

    msg.innerText = editingBusinessId
      ? "Updated successfully ✅"
      : "Saved successfully ✅";

    msg.classList.remove("hidden");

    // Reload business list
    if (typeof loadBusinesses === "function") {
      await loadBusinesses();
    }

    setTimeout(() => {
      closeBusinessModal();
    }, 1200);

  } catch (e) {

    console.error(e);

    msg.className =
      "text-red-400 text-xs mt-2 bg-red-900/30 p-2 rounded";

    msg.innerText =
      editingBusinessId
        ? "Update failed ❌"
        : "Failed to save ❌";

    msg.classList.remove("hidden");

  } finally {

    loader.classList.add("hidden");

    // ✅ RESET TEXT BASED ON MODE
    text.innerText = editingBusinessId
      ? "Update"
      : "Save";

    btn.disabled = false;
  }
}

let deleteTargetId = null;

// OPEN MODAL
function openDeleteModal(id) {
  deleteTargetId = id;

  document.getElementById("deleteConfirmInput").value = "";
  document.getElementById("deleteMsg").classList.add("hidden");

  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

// CLOSE MODAL
function closeDeleteModal() {
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// CONFIRM DELETE
async function confirmDeleteAction() {

  const input = document.getElementById("deleteConfirmInput").value.trim();
  const msg = document.getElementById("deleteMsg");

  if (input !== "1980") {
    msg.className = "text-red-400 text-xs bg-red-900/30 p-2 rounded";
    msg.innerText = "Type DELETE correctly";
    msg.classList.remove("hidden");
    return;
  }

  const btn = document.getElementById("confirmDeleteBtn");
  const loader = document.getElementById("deleteLoader");
  const text = document.getElementById("deleteBtnText");

  try {

    // =========================
    // LOADING
    // =========================
    loader.classList.remove("hidden");
    text.innerText = "Deleting...";
    btn.disabled = true;

    await apiPost({
      action: "deleteBusiness",
      id: deleteTargetId
    });

    showToast("Deleted successfully 🗑", "success");

    // =========================
    // 🔥 CLOSE ALL MODALS
    // =========================
    closeDeleteModal();

    if (typeof closeBusinessModal === "function") {
      closeBusinessModal();
    }

    // =========================
    // 🔥 RESET CURRENT BUSINESS
    // =========================
    localStorage.removeItem("business");
    currentBusiness = null;

    // =========================
    // 🔥 FULL REFRESH UI
    // =========================
    await loadBusinesses();

    // Optional: reload customers cleanly
    if (typeof openCustomers === "function") {
      openCustomers();
    }

  } catch (err) {

    console.error(err);

    msg.className = "text-red-400 text-xs bg-red-900/30 p-2 rounded";
    msg.innerText = "Delete failed ❌";
    msg.classList.remove("hidden");

  } finally {

    loader.classList.add("hidden");
    text.innerText = "Delete";
    btn.disabled = false;
  }
}

