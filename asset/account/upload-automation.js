const dropZone = document.getElementById("dropZone");

dropZone.addEventListener("click", () => {
  document.getElementById("excelFile").click();
});

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();

  const file = e.dataTransfer.files[0];
  previewExcel(file); // ✅ ONLY preview (not upload)
});

let previewData = [];

async function previewExcel(file) {

  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  let rows = XLSX.utils.sheet_to_json(sheet);

  // ✅ REMOVE EMPTY ROWS
  rows = rows.filter(r => {
    const name = (r.Name || r.name || "").trim();
    const phone = (r.Phone || r.phone || "").toString().trim();
    return name || phone;
  });

  previewData = rows;

  const tbody = document.getElementById("previewTable");
  tbody.innerHTML = "";

  rows.forEach(row => {

    const name = (row.Name || row.name || "").trim();
    const phone = (row.Phone || row.phone || "").toString().trim();
    let lang = (row.Language || row.language || "en").toLowerCase().trim();

    if (!["en", "ta", "hi"].includes(lang)) lang = "en";

    let status = "Ready";
    let color = "text-green-400";

    if (!name) {
      status = "Missing Name";
      color = "text-red-400";
    } else if (phone && isDuplicatePhone(phone)) {
      status = "Duplicate";
      color = "text-yellow-400";
    }

    tbody.innerHTML += `
      <tr class="border-b border-gray-700">
        <td class="p-2">${name}</td>
        <td class="p-2">${phone}</td>
        <td class="p-2">${lang}</td>
        <td class="p-2 ${color}">${status}</td>
      </tr>
    `;
  });

  document.getElementById("previewModal").classList.remove("hidden");
}


let isUploading = false;

async function confirmUpload(btn) {

  if (isUploading) return; // 🚫 HARD STOP
  isUploading = true;

  btn.disabled = true;

  const text = btn.querySelector(".upload-text");
  text.innerHTML = "Uploading...";

  // ✅ CLOSE PREVIEW FIRST
  document.getElementById("previewModal").classList.add("hidden");

  // ✅ SMALL DELAY (fix UI freeze issue)
  await new Promise(r => setTimeout(r, 200));

  showUploadModal();

  let success = 0, duplicate = 0, skipped = 0;
  const total = previewData.length;

  const processedPhones = new Set();

  for (let i = 0; i < previewData.length; i++) {

    const row = previewData[i];

    const name = (row.Name || row.name || "").trim();
    const phoneRaw = (row.Phone || row.phone || "").toString().trim();
    const phone = phoneRaw.replace(/\D/g, "");

    let lang = (row.Language || row.language || "en").toLowerCase().trim();
    if (!["en", "ta", "hi"].includes(lang)) lang = "en";

    // ❌ INVALID
    if (!name) {
      skipped++;
      updateProgress(i + 1, total);
      continue;
    }

    // ❌ DUPLICATE INSIDE FILE
    if (phone && processedPhones.has(phone)) {
      duplicate++;
      updateProgress(i + 1, total);
      continue;
    }

    // ❌ DUPLICATE IN DB
    if (phone && isDuplicatePhone(phone)) {
      duplicate++;
      updateProgress(i + 1, total);
      continue;
    }

    try {

      await apiPost({
        action: "addCustomer",
        business_id: currentBusiness,
        name,
        phone,
        language: lang
      });

      success++;

      processedPhones.add(phone);
      customersData.push({ name, phone });

      sendWhatsAppInviteAPI(name, phone);

    } catch (err) {
      console.error(err);
      skipped++;
    }

    updateProgress(i + 1, total);
  }

  hideUploadModal();

  // ✅ RESET STATE
  isUploading = false;
  btn.disabled = false;
  text.innerHTML = "Upload";

  // ✅ CLEAR DATA (VERY IMPORTANT)
  previewData = [];

  showToast(`✅ ${success} Added | ⚠ ${duplicate} Duplicate | ❌ ${skipped} Skipped`);

  openCustomers();
}

document.getElementById("excelFile").addEventListener("change", (e) => {
  previewExcel(e.target.files[0]);
});

function closePreview() {
  document.getElementById("previewModal").classList.add("hidden");
}

document.addEventListener("keydown", function (e) {

  // Avoid triggering inside input fields
  const tag = document.activeElement.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  // ALT + U → Upload
  if (e.altKey && e.key.toLowerCase() === "u") {
    e.preventDefault();
    document.getElementById("excelFile")?.click();
  }

  // ALT + N → Add Customer
  if (e.altKey && e.key.toLowerCase() === "n") {
    e.preventDefault();
    openAddCustomer();
  }

});

// =====================================================
// FINAL FIXED VERSION
// REAL NOTE FETCH FROM LATEST TRANSACTION
// =====================================================
async function sendTxnWhatsApp(
  name,
  phone,
  amount,
  type,
  balance,
  note = "",
  txnDate = ""
) {

  try {

    if (!phone) {
      return false;
    }


    // ==================================
    // PHONE FORMAT
    // ==================================

    phone =
      phone
        .toString()
        .replace(/\D/g, "");


    if (phone.length === 10) {
      phone = "91" + phone;
    }


    if (phone.length !== 12) {
      throw new Error("Invalid phone");
    }


    // ==================================
    // LOAD ONLY REQUIRED DATA
    //
    // REMOVED:
    // getCustomerTransactions()
    //
    // It is no longer required because
    // saveTxn() now sends note + date.
    // ==================================

    const [
      config,
      customers
    ] = await Promise.all([

      getBusinessConfig(),

      apiGet(
        "getCustomersWithBalance",
        {
          bid: currentBusiness,
          env: "test"
        }
      )

    ]);


    if (!config) {
      throw new Error(
        "Business config missing"
      );
    }


    // ==================================
    // LANGUAGE
    // ==================================

    let lang = "en";


    const localPhone =
      phone.slice(2);


    if (Array.isArray(customers)) {

      const customer =
        customers.find(c =>

          String(c.phone || "")
            .replace(/\D/g, "") ===
          localPhone

        );


      if (customer?.language) {

        lang =
          customer.language
            .toString()
            .trim()
            .toLowerCase();

      }

    }


    // ==================================
    // DATE
    // ==================================

    const d =
      txnDate
        ? new Date(txnDate)
        : new Date();


    const dateText =
      d.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );


    // ==================================
    // NOTE
    //
    // saveTxn() now passes the actual
    // transaction note directly.
    // ==================================

    note =
      String(note || "")
        .trim();


    // Keep safe fallback
    if (!note) {

      note =
        type === "got"
          ? "Payment Received"
          : "Credit Entry";

    }


    // ==================================
    // BUSINESS NAME
    // ==================================

    const businessName =
      document
        .getElementById("businessSelect")
        ?.selectedOptions[0]
        ?.text ||
      "Your Business";


    // ==================================
    // LOAD ICON RULES
    //
    // Cached after first successful load.
    // ==================================

    await loadTxnRules();


    // ==================================
    // BUILD MESSAGE
    // ==================================

    const msg =
      buildTxnWhatsAppMessage({

        name,

        amount,

        type,

        balance,

        note,

        dateText,

        businessName,

        lang

      });


    // ==================================
    // SEND WHATSAPP
    // ==================================

    const res =
      await apiPost({

        action: "sendWhatsApp",

        phone,

        message: msg,

        api_url:
          config.api_url,

        instance_id:
          config.instance_id,

        access_token:
          config.access_token

      });


    console.log(
      "TXN WA RESPONSE:",
      res
    );


    // ==================================
    // SUCCESS
    // ==================================

    if (
      res &&
      (
        res.success === true ||

        res.status === "success" ||

        String(
          res.message || ""
        )
          .toLowerCase()
          .includes("success")
      )
    ) {

      showToast(
        `WhatsApp message sent to ${name} ✅`,
        "success"
      );

    }

    else {

      showToast(
        "WhatsApp message failed ❌",
        "error"
      );

    }


    return true;

  }

  catch (err) {

    console.error(
      "WA ERROR:",
      err
    );


    showToast(
      err.message ||
        "WhatsApp failed ❌",
      "error"
    );


    return false;

  }

}


/* =========================================================
   SMART TRANSACTION ICON ENGINE
   =========================================================

   Google Sheet:
   Icons

   Required columns:

   Keyword | Icon | Category | Priority

   Examples:

   milk             | 🥛 | Grocery      | 70
   medicine         | 💊 | Medical      | 100
   mobile recharge  | 📱 | Recharge     | 100
   train ticket     | 🚆 | Travel       | 100
   flight ticket    | ✈️ | Travel       | 100

   Priority:
   Higher number = higher priority.

   Matching:
   Longest / highest-priority matching rules are preferred.

   ========================================================= */


/* =========================================================
   SHEET RULE CACHE
   ========================================================= */

let sheetTxnRulesCache = [];

let sheetTxnRulesLoaded = false;

let sheetTxnRulesLoading = false;

let sheetTxnRulesPromise = null;


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeTxnRuleText(value = "") {

  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================================================
   NORMALIZE ONE GOOGLE SHEET RULE
   ========================================================= */

function normalizeTxnRule(row) {

  if (!row) {
    return null;
  }


  /*
   * =====================================================
   * WORDS
   * =====================================================
   *
   * Your Apps Script currently returns:
   *
   * {
   *   keyword: "train ticket",
   *   icon: "🚆",
   *   category: "Travel",
   *   priority: 100,
   *   words: ["train ticket"]
   * }
   *
   * Preserve that words array.
   */

  const words =
    Array.isArray(row.words)
      ? row.words
          .map(word =>
            normalizeTxnRuleText(word)
          )
          .filter(Boolean)
      : [];


  /*
   * =====================================================
   * KEYWORD
   * =====================================================
   *
   * Supports:
   *
   * row.keyword   ← current Apps Script
   * row.Keyword   ← raw sheet-style object
   * words[0]      ← fallback
   */

  const keyword =
    normalizeTxnRuleText(
      row.keyword ??
      row.Keyword ??
      words[0] ??
      ""
    );


  /*
   * =====================================================
   * ICON
   * =====================================================
   */

  const icon =
    String(
      row.icon ??
      row.Icon ??
      ""
    ).trim();


  /*
   * =====================================================
   * CATEGORY
   * =====================================================
   */

  const category =
    String(
      row.category ??
      row.Category ??
      "General"
    ).trim() || "General";


  /*
   * =====================================================
   * PRIORITY
   * =====================================================
   */

  const priority =
    Number(
      row.priority ??
      row.Priority ??
      0
    ) || 0;


  /*
   * =====================================================
   * INVALID RULE
   * =====================================================
   */

  if (
    !keyword ||
    !icon
  ) {

    return null;

  }


  /*
   * =====================================================
   * NORMALIZED RULE
   * =====================================================
   */

  return {

    keyword,

    /*
     * Prefer the words returned by Apps Script.
     *
     * If there is no words array, use keyword.
     */
    words:
      words.length > 0
        ? words
        : [keyword],

    icon,

    category,

    priority

  };

}


/* =========================================================
   NORMALIZE ALL GOOGLE SHEET RULES
   ========================================================= */

function normalizeTxnRules(rows) {

  if (!Array.isArray(rows)) {
    return [];
  }


  const rules =
    rows
      .map(normalizeTxnRule)
      .filter(Boolean);


  /*
   * IMPORTANT:
   *
   * Higher Priority first.
   *
   * When priority is equal, longer keywords first.
   *
   * Example:
   *
   * "mobile recharge"
   *
   * should be tested before:
   *
   * "recharge"
   *
   * This prevents a generic keyword from winning before
   * a more specific keyword.
   */

  rules.sort((a, b) => {

    const priorityDifference =
      b.priority - a.priority;


    if (priorityDifference !== 0) {
      return priorityDifference;
    }


    return (
      b.keyword.length -
      a.keyword.length
    );

  });


  return rules;

}


/* =========================================================
   LOAD ICON RULES FROM GOOGLE SHEET
   ========================================================= */

async function loadTxnRules(
  force = false
) {

  /*
   * Already loaded.
   */
  if (
    sheetTxnRulesLoaded &&
    force !== true
  ) {

    return sheetTxnRulesCache;

  }


  /*
   * Request already running.
   *
   * Reuse it instead of making another API request.
   */
  if (
    sheetTxnRulesPromise &&
    force !== true
  ) {

    return sheetTxnRulesPromise;

  }


  sheetTxnRulesLoading = true;


  sheetTxnRulesPromise =
    (async () => {

      try {

        /*
         * Use your existing API helper format.
         */
        const rows =
          await apiGet(
            "getSheetTxnRules",
            {
              bid: currentBusiness
            },
            {
              forceRefresh:
                force === true
            }
          );


        /*
         * API error safety.
         */
        if (
          !rows ||
          rows.error
        ) {

          console.warn(
            "[TXN ICONS] API returned error:",
            rows
          );


          return sheetTxnRulesCache;

        }


        /*
         * Convert sheet columns:
         *
         * Keyword
         * Icon
         * Category
         * Priority
         *
         * into the format used by the detector.
         */
        const normalized =
          normalizeTxnRules(rows);


        sheetTxnRulesCache =
          normalized;


        sheetTxnRulesLoaded =
          true;


        console.log(
          `✅ Transaction icon rules loaded: ${normalized.length}`
        );


        return sheetTxnRulesCache;

      }

      catch (err) {

        console.error(
          "❌ Transaction icon rules load failed:",
          err
        );


        /*
         * Keep any previous successful cache.
         */
        return sheetTxnRulesCache;

      }

      finally {

        sheetTxnRulesLoading =
          false;


        sheetTxnRulesPromise =
          null;

      }

    })();


  return sheetTxnRulesPromise;

}


/* =========================================================
   GET CURRENT SHEET RULES
   ========================================================= */

function getSheetTxnRules() {

  /*
   * This function stays synchronous because existing
   * code may already call it synchronously.
   */

  return sheetTxnRulesCache;

}


/* =========================================================
   FALLBACK RULES
   =========================================================
   These allow common icons to continue working even if
   the Google Sheet/API is temporarily unavailable.
   ========================================================= */

const DEFAULT_TXN_ICON_RULES = [

  {
    keyword: "medicine",
    words: ["medicine", "tablet", "doctor"],
    icon: "💊",
    category: "Medical",
    priority: 100
  },

  {
    keyword: "recharge",
    words: ["recharge", "mobile"],
    icon: "📱",
    category: "Recharge",
    priority: 90
  },

  {
    keyword: "train",
    words: ["train"],
    icon: "🚆",
    category: "Travel",
    priority: 95
  },

  {
    keyword: "bus",
    words: ["bus"],
    icon: "🚌",
    category: "Travel",
    priority: 94
  },

  {
    keyword: "milk",
    words: ["milk", "grocery", "rice"],
    icon: "🥛",
    category: "Grocery",
    priority: 70
  },

  {
    keyword: "gym",
    words: ["gym", "fitness"],
    icon: "🏋️",
    category: "Fitness",
    priority: 120
  },

  {
    keyword: "netflix",
    words: ["netflix", "prime", "hotstar"],
    icon: "📺",
    category: "Entertainment",
    priority: 121
  }

];


/* =========================================================
   CHECK WHETHER A RULE MATCHES NOTE
   ========================================================= */

function txnRuleMatches(
  note,
  rule
) {

  if (!rule) {
    return false;
  }


  const normalizedNote =
    normalizeTxnRuleText(note);


  if (!normalizedNote) {
    return false;
  }


  const words =
    Array.isArray(rule.words)
      ? rule.words
      : [rule.keyword];


  return words.some(word => {

    const normalizedWord =
      normalizeTxnRuleText(word);


    if (!normalizedWord) {
      return false;
    }


    return normalizedNote.includes(
      normalizedWord
    );

  });

}


/* =========================================================
   MAIN TRANSACTION META DETECTOR
   ========================================================= */

function detectTxnMeta(note = "") {

  const normalizedNote =
    normalizeTxnRuleText(note);


  if (!normalizedNote) {

    return {
      icon: "📝",
      category: "General",
      priority: 0
    };

  }


  /*
   * ---------------------------------------------------------
   * 1. GOOGLE SHEET RULES
   * ---------------------------------------------------------
   *
   * Your Icons sheet is now the primary source.
   */

  const sheetRules =
    getSheetTxnRules();


  for (const rule of sheetRules) {

    if (
      txnRuleMatches(
        normalizedNote,
        rule
      )
    ) {

      return rule;

    }

  }


  /*
   * ---------------------------------------------------------
   * 2. LOCAL FALLBACK RULES
   * ---------------------------------------------------------
   */

  const fallbackRules =
    [...DEFAULT_TXN_ICON_RULES]
      .sort((a, b) => {

        const priorityDifference =
          Number(b.priority || 0) -
          Number(a.priority || 0);


        if (priorityDifference !== 0) {
          return priorityDifference;
        }


        return (
          String(b.keyword || "").length -
          String(a.keyword || "").length
        );

      });


  for (const rule of fallbackRules) {

    if (
      txnRuleMatches(
        normalizedNote,
        rule
      )
    ) {

      return rule;

    }

  }


  /*
   * ---------------------------------------------------------
   * 3. FINAL FALLBACK
   * ---------------------------------------------------------
   */

  return {
    icon: "📝",
    category: "General",
    priority: 0
  };

}


/* =========================================================
   PUBLIC ICON FUNCTION
   =========================================================
   Existing code can continue using:

   getTxnIcon(note)

   No call-site changes required.
   ========================================================= */

function getTxnIcon(note = "") {

  try {

    const meta =
      detectTxnMeta(note);

    console.log(
      "🔎 TXN ICON DEBUG",
      {
        note: note,
        matchedIcon: meta?.icon,
        matchedCategory: meta?.category,
        matchedKeyword: meta?.keyword,
        matchedWords: meta?.words,
        priority: meta?.priority
      }
    );

    return (
      meta?.icon ||
      "📝"
    );

  }

  catch (err) {

    console.error(
      "❌ TXN ICON ERROR:",
      err
    );

    return "📝";

  }

}


/* =========================================================
   PUBLIC CATEGORY FUNCTION
   ========================================================= */

function getTxnCategory(note = "") {

  try {

    const meta =
      detectTxnMeta(note);


    return (
      meta?.category ||
      "General"
    );

  }

  catch (err) {

    return "General";

  }

}






// =====================================================
// MODERN TEMPLATE
// =====================================================
function buildTxnWhatsAppMessage(data) {

  let {
    name,
    amount,
    type,
    balance,
    note,
    dateText,
    businessName,
    lang
  } = data;

  amount = Math.abs(Number(amount) || 0);
  balance = Number(balance) || 0;
  lang = (lang || "en").toLowerCase();

  const icon = getTxnIcon(note);

  const typeColor =
    type === "got" ? "🟢" : "🔴";

  let balText = "";

  if (balance > 0) {
    balText = `💰 Pending: ₹${balance}`;
  } else if (balance < 0) {
    balText = `🔵 Advance: ₹${Math.abs(balance)}`;
  } else {
    balText = `✅ Account Settled`;
  }

  // ==================================
  // ENGLISH
  // ==================================
  if (lang === "en") {

    if (type === "got") {
      return `👋 Hello ${name}

━━━━━━━━━━━━━━━
🟢 *Payment Received*

✅ ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 Thank you
🏢 ${businessName}`;
    }

    return `👋 Hello ${name}

━━━━━━━━━━━━━━━
🔴 *Credit Added*

📌 ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 Thank you
🏢 ${businessName}`;
  }

  // ==================================
  // TAMIL
  // ==================================
  if (lang === "ta") {

    if (type === "got") {
      return `👋 வணக்கம் ${name}

━━━━━━━━━━━━━━━
🟢 *பணம் பெறப்பட்டது*

✅ ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 நன்றி
🏢 ${businessName}`;
    }

    return `👋 வணக்கம் ${name}

━━━━━━━━━━━━━━━
🔴 *கடன் பதிவு செய்யப்பட்டது*

📌 ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 நன்றி
🏢 ${businessName}`;
  }

  // ==================================
  // HINDI
  // ==================================
  if (type === "got") {
    return `👋 नमस्ते ${name}

━━━━━━━━━━━━━━━
🟢 *भुगतान प्राप्त हुआ*

✅ ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 धन्यवाद
🏢 ${businessName}`;
  }

  return `👋 नमस्ते ${name}

━━━━━━━━━━━━━━━
🔴 *उधार जोड़ा गया*

📌 ₹${amount}

📅 ${dateText}
${icon} ${note}

${balText}

🙏 धन्यवाद
🏢 ${businessName}`;
}

async function pickContact() {

  if (!('contacts' in navigator)) {
    alert("Not supported on this device");
    return;
  }

  try {
    const contacts = await navigator.contacts.select(
      ['name', 'tel'],
      { multiple: false }
    );

    if (contacts.length > 0) {
      document.getElementById("cname").value = contacts[0].name[0] || "";
      document.getElementById("cphone").value = contacts[0].tel[0] || "";
    }

  } catch (err) {
    console.error(err);
  }
}

function showBulkProgress(total) {

  modal.innerHTML = `
  <div class="bg-gray-900 p-5 w-80 rounded-xl">

    <div class="text-lg font-bold mb-3">📤 Sending Reminders</div>

    <!-- PROGRESS TEXT -->
    <div id="bulkProgressText" class="text-sm text-gray-400 mb-2">
      0 / ${total} sent
    </div>

    <!-- PROGRESS BAR -->
    <div class="w-full bg-gray-700 h-2 rounded mb-3">
      <div id="bulkProgressBar"
        class="h-2 bg-green-500 rounded"
        style="width:0%">
      </div>
    </div>

    <!-- STATUS LIST -->
    <div id="bulkStatusList"
      class="text-xs max-h-40 overflow-auto space-y-1">
    </div>

  </div>
  `;

  modal.classList.remove("hidden");
}

function updateBulkProgress(sent, total, name, success = true) {

  const percent = Math.floor((sent / total) * 100);

  document.getElementById("bulkProgressText").innerText =
    `${sent} / ${total} sent`;

  document.getElementById("bulkProgressBar").style.width =
    percent + "%";

  const statusList = document.getElementById("bulkStatusList");

  statusList.innerHTML += `
    <div class="${success ? 'text-green-400' : 'text-red-400'}">
      ${success ? '✔' : '✖'} ${name}
    </div>
  `;
}

function finishBulkProgress(total) {

  setTimeout(() => {

    document.getElementById("bulkProgressText").innerText =
      `✅ Completed (${total})`;

  }, 500);

  setTimeout(() => {
    modal.classList.add("hidden");
    showSuccess("All reminders sent 🚀");
  }, 1500);
}

async function sendBulkReminders() {

  const list = customersData.filter(c => c.balance > 0);

  if (!list.length) {
    showToast("No customers with dues", "error");
    return;
  }

  showBulkProgress(list.length);

  let sent = 0;

  for (let c of list) {

    try {

      await sendWhatsAppReminder(c.name, c.phone, c.balance);

      sent++;
      updateBulkProgress(sent, list.length, c.name, true);

    } catch (err) {

      sent++;
      updateBulkProgress(sent, list.length, c.name, false);
    }

    // ⏱ slight delay (important to avoid API spam)
    await new Promise(r => setTimeout(r, 300));
  }

  finishBulkProgress(list.length);
}

async function getBusinessConfig() {

  try {

    const businessId = currentBusiness;

    const rows = await apiGet("getBusinesses");

    // ❌ safety check
    if (!Array.isArray(rows) || rows.length <= 1) {
      throw new Error("Invalid business data");
    }

    // ✅ extract headers
    const headers = rows[0];

    // ✅ convert rows → objects
    const list = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    // ✅ find selected business
    const business = list.find(b => b.id == businessId);

    // ✅ return config if available
    if (business && business.api_url) {
      return {
        api_url: business.api_url,
        instance_id: business.instance_id,
        access_token: business.access_token,
        upi_id: business.upi_id,
        payee_name: business.payee_name,
        qr_image: business.qr_image
      };
    }

  } catch (e) {
    console.error("Business config error:", e);
  }

  // 🔁 fallback (your old system)
  const setup = await apiGet("getSetup");

  return {
    api_url: setup.api_url,
    instance_id: setup.instance_id,
    access_token: setup.access_token,
    upi_id: setup.upi_id,
    payee_name: setup.payee_name,
    qr_image: setup.qr_image
  };
}

/* =========================================================
   WHATSAPP CONNECTION STATUS
   SMOOTH / NON-FLICKER VERSION
   ========================================================= */


/*
 * Keep the last known WhatsApp state.
 *
 * null  = not checked yet
 * true  = connected
 * false = disconnected
 */

let waStatus = {

  isConnected: null,

  lastChecked: null,

  businessId: "",

  checking: false

};


/*
 * Store the currently-running request.
 *
 * If checkWhatsAppStatus() gets called twice at the
 * same time, both callers will share the same request
 * instead of creating duplicate API calls.
 */

let waStatusRequest = null;


/* =========================================================
   CHECK WHATSAPP CONNECTION
   ========================================================= */

async function checkWhatsAppStatus(
  force = false
) {

  const dot =
    document.getElementById(
      "waDot"
    );


  const text =
    document.getElementById(
      "waText"
    );


  if (
    !dot ||
    !text
  ) {

    return null;

  }


  const businessId =
    String(
      currentBusiness ||
      ""
    ).trim();


  /*
   * No business selected.
   */

  if (!businessId) {

    waStatus.isConnected =
      false;


    waStatus.businessId =
      "";


    updateWAIndicator();


    return false;

  }


  /*
   * ---------------------------------------------------------
   * SHORT STATUS CACHE
   * ---------------------------------------------------------
   *
   * Don't repeatedly check WhatsApp while the user is
   * navigating around the same business.
   *
   * Five minutes is sufficient because your existing
   * automatic status refresh runs every ten minutes.
   */

  const STATUS_CACHE_MS =
    5 * 60 * 1000;


  const sameBusiness =
    waStatus.businessId ===
    businessId;


  const recentlyChecked =
    waStatus.lastChecked &&
    (
      Date.now() -
      waStatus.lastChecked
    ) <
    STATUS_CACHE_MS;


  if (
    force !== true &&
    sameBusiness &&
    recentlyChecked &&
    waStatus.isConnected !== null
  ) {

    updateWAIndicator();


    return waStatus.isConnected;

  }


  /*
   * ---------------------------------------------------------
   * REQUEST DEDUPLICATION
   * ---------------------------------------------------------
   *
   * If another status request is already running,
   * do not create another Apps Script request.
   */

  if (waStatusRequest) {

    return waStatusRequest;

  }


  waStatus.checking =
    true;


  /*
   * ---------------------------------------------------------
   * IMPORTANT FLICKER FIX
   * ---------------------------------------------------------
   *
   * DO NOT change:
   *
   * Connected -> Checking... -> Connected
   *
   * when we already know the previous status.
   *
   * Only show "Checking..." on the very first status check.
   */

  if (
    waStatus.isConnected === null ||
    waStatus.businessId !== businessId
  ) {

    dot.style.background =
      "#f59e0b";


    text.innerText =
      "Checking...";

  }


  waStatusRequest =
    (async function () {

      try {

        const res =
          await apiGet(
            "checkWA",
            {
              bid:
                businessId
            },
            {
              forceRefresh:
                force === true
            }
          );


        console.log(
          "WA STATUS:",
          res
        );


        /*
         * API engine may return its own error object.
         *
         * In that case preserve the previous known status
         * instead of flashing the UI red.
         */

        if (
          !res ||
          res.error
        ) {

          console.warn(
            "[WHATSAPP STATUS] API failure:",
            res
          );


          /*
           * If we have never successfully checked before,
           * show disconnected.
           *
           * Otherwise keep the last known visual state.
           */

          if (
            waStatus.isConnected ===
            null
          ) {

            waStatus.isConnected =
              false;


            waStatus.businessId =
              businessId;


            updateWAIndicator();

          }


          return waStatus.isConnected;

        }


        const connected =
          res.connected === true;


        /*
         * Save new status first.
         */

        waStatus.isConnected =
          connected;


        waStatus.lastChecked =
          Date.now();


        waStatus.businessId =
          businessId;


        /*
         * Update UI once.
         */

        updateWAIndicator();


        return connected;

      }

      catch (err) {

        console.error(
          "WA STATUS ERROR:",
          err
        );


        /*
         * Preserve previous known state during a temporary
         * network/API problem.
         */

        if (
          waStatus.isConnected ===
          null
        ) {

          waStatus.isConnected =
            false;


          waStatus.businessId =
            businessId;


          updateWAIndicator();

        }


        return waStatus.isConnected;

      }

      finally {

        waStatus.checking =
          false;


        waStatusRequest =
          null;

      }

    })();


  return waStatusRequest;

}


/* =========================================================
   UPDATE WHATSAPP STATUS UI
   ========================================================= */

function updateWAIndicator() {

  const dot =
    document.getElementById(
      "waDot"
    );

  const text =
    document.getElementById(
      "waText"
    );


  if (!dot || !text) {
    return;
  }


  /*
   * Remove Tailwind pulse from the dot itself.
   *
   * We animate only our ::after halo.
   */

  dot.classList.remove(
    "animate-pulse"
  );


  if (
    waStatus.isConnected === true
  ) {

    dot.style.background =
      "#22c55e";

    dot.classList.add(
      "wa-connected-pulse"
    );


    text.innerText =
      "Connected";

    text.style.color =
      "#22c55e";

  }

  else {

    dot.style.background =
      "#ef4444";

    dot.classList.remove(
      "wa-connected-pulse"
    );


    text.innerText =
      "Disconnected";

    text.style.color =
      "#ef4444";

  }

}

/* =========================================================
   WHATSAPP STATUS
   CHECK ONCE PER PAGE SESSION
   ========================================================= */

/*
 * Do NOT use setInterval here.
 *
 * WhatsApp status will be checked:
 *
 * 1. Once after the initial business has loaded.
 * 2. Again only when the user changes business.
 * 3. Explicitly after reconnect/setup if required.
 */

let waInitialCheckDone =
  false;


async function checkInitialWhatsAppStatus() {

  /*
   * Already checked during this page session.
   */

  if (waInitialCheckDone) {
    return;
  }


  /*
   * Business must exist first.
   *
   * This avoids:
   *
   * DOMContentLoaded
   *      ↓
   * checkWA without business
   *      ↓
   * business loads
   *      ↓
   * checkWA again
   */

  if (!currentBusiness) {
    return;
  }


  waInitialCheckDone =
    true;


  await checkWhatsAppStatus(
    false
  );

}

