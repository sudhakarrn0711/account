/* =========================================================
   CUSTOMER TRANSACTION SWIPE
   Mobile-safe with long-press selection
   ========================================================= */

let activeCard = null;

let currentX = 0;
let startX1 = 0;
let startY1 = 0;

let txnSwipeMoved = false;


/*
 * How far the finger may move before a long-press
 * is considered cancelled.
 */
const TXN_LONG_PRESS_MOVE_LIMIT = 12;


/* =========================================================
   START SWIPE
   ========================================================= */

function startSwipe(e, el) {

    /*
     * If transaction selection mode is already active,
     * swipe actions must not run.
     */
    if (
        window.innerWidth <= 768 &&
        typeof selectedTxns !== "undefined" &&
        selectedTxns.size > 0
    ) {

        activeCard = null;

        return;

    }


    /*
     * Close any previously-open swipe card.
     */
    document
        .querySelectorAll(".txnCard")
        .forEach(card => {

            if (card !== el) {

                card.style.transform =
                    "translateX(0)";

            }

        });


    const point =
        e.touches
            ? e.touches[0]
            : e;


    if (!point) return;


    activeCard = el;

    startX1 =
        point.clientX;

    startY1 =
        point.clientY;

    currentX =
        startX1;

    txnSwipeMoved =
        false;


    el.style.transition =
        "none";

}


/* =========================================================
   MOVE SWIPE
   ========================================================= */

function moveSwipe(e) {

    if (!activeCard) {
        return;
    }


    const point =
        e.touches
            ? e.touches[0]
            : e;


    if (!point) return;


    currentX =
        point.clientX;


    const diffX =
        currentX -
        startX1;


    const diffY =
        point.clientY -
        startY1;


    /*
     * -------------------------------------------------
     * IMPORTANT
     * -------------------------------------------------
     *
     * Once the finger moves meaningfully,
     * this is a swipe/scroll gesture — NOT long press.
     */
    if (
        Math.abs(diffX) >
            TXN_LONG_PRESS_MOVE_LIMIT ||
        Math.abs(diffY) >
            TXN_LONG_PRESS_MOVE_LIMIT
    ) {

        txnSwipeMoved =
            true;


        if (
            typeof cancelLongPress ===
            "function"
        ) {

            cancelLongPress();

        }

    }


    /*
     * Vertical movement is probably normal page scrolling.
     *
     * Do not drag the transaction card horizontally when
     * vertical movement clearly dominates.
     */
    if (
        Math.abs(diffY) >
        Math.abs(diffX)
    ) {

        return;

    }


    /*
     * LEFT SWIPE
     */
    if (diffX < 0) {

        activeCard.style.transform =
            `translateX(${
                Math.max(
                    diffX,
                    -180
                )
            }px)`;

    }


    /*
     * RIGHT SWIPE
     */
    if (diffX > 0) {

        activeCard.style.transform =
            `translateX(${
                Math.min(
                    diffX,
                    120
                )
            }px)`;

    }

}


/* =========================================================
   END SWIPE
   ========================================================= */

function endSwipe() {

    if (!activeCard) {

        txnSwipeMoved = false;

        return;

    }


    /*
     * Always cancel any remaining long-press timer.
     */
    if (
        typeof cancelLongPress ===
        "function"
    ) {

        cancelLongPress();

    }


    const diff =
        currentX -
        startX1;


    activeCard.style.transition =
        "transform 0.25s ease";


    /*
     * If selection became active while touching,
     * do not perform swipe actions.
     */
    if (
        typeof selectedTxns !== "undefined" &&
        selectedTxns.size > 0
    ) {

        activeCard.style.transform =
            "translateX(0)";


        activeCard =
            null;


        txnSwipeMoved =
            false;


        return;

    }


    /*
     * LEFT SWIPE
     * Reveal existing action area.
     */
    if (
        txnSwipeMoved &&
        diff < -80
    ) {

        activeCard.style.transform =
            "translateX(-140px)";

    }


    /*
     * RIGHT SWIPE
     * Existing Mark Paid behaviour preserved.
     */
    else if (
        txnSwipeMoved &&
        diff > 80
    ) {

        markAsPaid(
            activeCard
        );


        activeCard.style.transform =
            "translateX(0)";

    }


    /*
     * Not enough movement.
     */
    else {

        activeCard.style.transform =
            "translateX(0)";

    }


    activeCard =
        null;


    txnSwipeMoved =
        false;

}

async function markAsPaid(card) {

  const id = card.dataset.id;

  // prevent duplicate popup
  if (card.querySelector(".confirmBox")) return;

  // Inline confirm UI
  const confirmBox = document.createElement("div");
  confirmBox.className = "confirmBox absolute inset-0 bg-black/80 flex items-center justify-center z-50";
  confirmBox.innerHTML = `
    <div class="bg-gray-900 p-4 rounded text-center w-[200px]">

      <div class="mb-3">Mark as paid?</div>

      <div class="flex gap-2 justify-center">
        <button class="cancelBtn bg-gray-700 px-3 py-1 rounded">Cancel</button>
        <button class="yesBtn bg-green-600 px-3 py-1 rounded">Yes</button>
      </div>

    </div>
  `;

  card.appendChild(confirmBox);

  const cancelBtn = confirmBox.querySelector(".cancelBtn");
  const yesBtn = confirmBox.querySelector(".yesBtn");

  // ✅ CANCEL FIX (remove properly)
  cancelBtn.onclick = () => {
    confirmBox.remove();
  };

  // ✅ YES CLICK
  yesBtn.onclick = async () => {

    setButtonLoading(yesBtn, "Updating...");

    try {

      const res = await apiPost({
        action: "markPaid",
        id
      });

      if (res.success) {
        showSuccess("Marked as paid ✅");
      } else {
        showToast("Failed ❌", "error");
      }

    } catch (err) {
      console.error(err);
      showToast("Failed ❌", "error");
    }

    confirmBox.remove();

    /*
     * Refresh the currently-open customer detail.
     *
     * This keeps:
     * - transaction list
     * - customer balance
     * - detail totals
     *
     * up to date.
     */
    selectCustomer(
      selectedCustomer,
      ""
    );


    /*
     * Refresh the customer list/balances silently.
     *
     * IMPORTANT:
     * This is still required because the transaction
     * may have changed the customer's balance and
     * therefore their position in the customer list.
     *
     * silent:true prevents the Tiny Loader from
     * appearing during this background refresh.
     */
    openCustomers({
      silent: true
    });;
  };
}

let longPressTimer;
let selectedTxns = new Set();


/* =========================================================
   CUSTOMER TRANSACTION SELECTION
   Mobile  : long press
   Desktop : checkbox
   ========================================================= */

function toggleTxnSelection(id, el = null) {

  id = String(id);

  if (selectedTxns.has(id)) {

    selectedTxns.delete(id);

  } else {

    selectedTxns.add(id);

  }


  // Update transaction card
  const card =
    el?.closest?.(".txnCard") ||
    document.querySelector(
      `.txnCard[data-id="${CSS.escape(id)}"]`
    );


  if (card) {

    card.classList.toggle(
      "bg-yellow-900",
      selectedTxns.has(id)
    );

  }


  // Keep desktop checkbox synchronized
  const checkbox =
    document.querySelector(
      `.txnDesktopCheckbox[data-id="${CSS.escape(id)}"]`
    );


  if (checkbox) {

    checkbox.checked =
      selectedTxns.has(id);

  }


  updateMultiDeleteBar();

}



/* =========================================================
   MOBILE LONG PRESS
   Existing behavior preserved
   ========================================================= */

/* =========================================================
   CUSTOMER MOBILE LONG PRESS
   ========================================================= */

function startLongPress(
    e,
    el
) {

    /*
     * Desktop continues using checkbox selection.
     */
    if (
        window.innerWidth > 768
    ) {

        return;

    }


    /*
     * Don't start long press from buttons/links/inputs.
     */
    const target =
        e?.target;


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
                ".confirmBox",
                "[data-no-long-press]"
            ].join(",")
        )
    ) {

        return;

    }


    cancelLongPress();


    txnSwipeMoved =
        false;


    longPressTimer =
        setTimeout(
            () => {

                /*
                 * Finger moved before timer completed.
                 */
                if (
                    txnSwipeMoved
                ) {

                    return;

                }


                const id =
                    el?.dataset?.id;


                if (!id) {
                    return;
                }


                /*
                 * Reset any partially-swiped position.
                 */
                el.style.transition =
                    "transform 0.2s ease";

                el.style.transform =
                    "translateX(0)";


                /*
                 * Haptic feedback where supported.
                 *
                 * Completely optional on unsupported browsers.
                 */
                try {

                    navigator.vibrate?.(
                        35
                    );

                }
                catch (_) {}


                toggleTxnSelection(
                    id,
                    el
                );


                longPressTimer =
                    null;

            },
            550
        );

}



function cancelLongPress() {

  if (longPressTimer) {

    clearTimeout(
      longPressTimer
    );

    longPressTimer = null;

  }

}

/* =========================================================
   CUSTOMER TRANSACTION TAP DURING SELECTION MODE
   ========================================================= */

function handleTxnSelectionTap(
    e,
    el
) {

    if (
        window.innerWidth > 768
    ) {

        return false;

    }


    if (
        typeof selectedTxns ===
            "undefined" ||
        selectedTxns.size === 0
    ) {

        return false;

    }


    /*
     * Interactive controls retain their normal behaviour.
     */
    if (
        e?.target?.closest?.(
            [
                "button",
                "a",
                "input",
                "select",
                "textarea",
                ".confirmBox"
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


    /*
     * Close any swipe offset.
     */
    el.style.transform =
        "translateX(0)";


    toggleTxnSelection(
        id,
        el
    );


    return true;

}


/* =========================================================
   DESKTOP CHECKBOX
   ========================================================= */

function toggleDesktopTxn(
  checkbox,
  id
) {

  if (window.innerWidth <= 768) {
    return;
  }


  id = String(id);


  if (checkbox.checked) {

    selectedTxns.add(id);

  } else {

    selectedTxns.delete(id);

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


  updateMultiDeleteBar();

}



/* =========================================================
   CLEAR ALL SELECTED TRANSACTIONS
   ========================================================= */

function clearTxnSelection() {

  selectedTxns.clear();


  document
    .querySelectorAll(
      ".txnDesktopCheckbox"
    )
    .forEach(cb => {

      cb.checked = false;

    });


  document
    .querySelectorAll(
      ".txnCard"
    )
    .forEach(card => {

      card.classList.remove(
        "bg-yellow-900"
      );

    });


  updateMultiDeleteBar();

}



/* =========================================================
   SELECT ALL CURRENTLY DISPLAYED TRANSACTIONS
   Desktop only
   ========================================================= */

function selectAllCustomerTxns() {

  if (window.innerWidth <= 768) {
    return;
  }


  const checkboxes =
    document.querySelectorAll(
      ".txnDesktopCheckbox"
    );


  checkboxes.forEach(cb => {

    const id =
      String(cb.dataset.id || "");


    if (!id) {
      return;
    }


    selectedTxns.add(id);

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


  updateMultiDeleteBar();

}



/* =========================================================
   MULTI DELETE BAR
   Mobile + Desktop
   ========================================================= */

/* =========================================================
   MULTI DELETE BAR
   Mobile + Desktop

   Customer transaction selection
   ========================================================= */

function updateMultiDeleteBar() {

  let bar =
    document.getElementById(
      "multiDeleteBar"
    );


  /* =======================================================
     MOBILE GAVE / GOT FAB VISIBILITY
     ======================================================= */

  function syncCustomerSelectionFAB() {

    // Desktop FAB handling is not required.
    if (window.innerWidth > 768) {
      return;
    }


    document
      .querySelectorAll(".mobile-fab")
      .forEach(fab => {

        /*
         * When at least one CUSTOMER transaction
         * is selected, hide Gave / Got FAB.
         */
        if (selectedTxns.size > 0) {

          fab.classList.add(
            "fab-hidden-by-selection"
          );

        }

        /*
         * When customer selection is empty,
         * restore Gave / Got FAB.
         */
        else {

          fab.classList.remove(
            "fab-hidden-by-selection"
          );

        }

      });

  }


  /* =======================================================
     NOTHING SELECTED
     ======================================================= */

  if (
    selectedTxns.size === 0
  ) {

    if (bar) {

      bar.remove();

    }


    /*
     * Restore Gave / Got.
     */
    syncCustomerSelectionFAB();


    return;

  }


  /* =======================================================
     SELECTION MODE ACTIVE
     ======================================================= */

  /*
   * Hide Gave / Got immediately when the
   * first transaction becomes selected.
   */
  syncCustomerSelectionFAB();


  /* =======================================================
     CREATE MULTI DELETE BAR
     ======================================================= */

  if (!bar) {

    bar =
      document.createElement(
        "div"
      );


    bar.id =
      "multiDeleteBar";


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
          id="multiDeleteCount"
        >
          ${selectedTxns.size} selected
        </strong>


        <button
          type="button"
          onclick="clearTxnSelection()"
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
          onclick="selectAllCustomerTxns()"
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
        onclick="deleteSelected(this)"
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


  /* =======================================================
     UPDATE SELECTED COUNT
     ======================================================= */

  const count =
    bar.querySelector(
      "#multiDeleteCount"
    );


  if (count) {

    count.textContent =
      `${selectedTxns.size} selected`;

  }

}



/* =========================================================
   DELETE SELECTED CUSTOMER TRANSACTIONS
   ========================================================= */

async function deleteSelected(btn = null) {

  if (
    selectedTxns.size === 0
  ) {

    return;

  }


  const total =
    selectedTxns.size;


  // ==========================================
  // CONFIRM ONCE
  // ==========================================

  const confirmed =
    await customConfirm(
      `Delete ${total} selected transaction${total > 1 ? "s" : ""}?`
    );


  if (!confirmed) {
    return;
  }


  const bar =
    document.getElementById(
      "multiDeleteBar"
    );


  const deleteBtn =
    btn ||
    bar?.querySelector(
      'button[onclick*="deleteSelected"]'
    );


  if (deleteBtn) {

    setButtonLoading(
      deleteBtn,
      "Deleting..."
    );

  }


  try {

    // Snapshot before clearing
    const ids =
      Array.from(
        selectedTxns
      );


    // ==========================================
    // EXISTING BACKEND BEHAVIOR
    //
    // We deliberately continue using your
    // existing deleteTransaction action.
    // No backend change required.
    // ==========================================

    for (const id of ids) {

      const res =
        await apiPost({

          action:
            "deleteTransaction",

          id

        });


      if (
        res &&
        res.error
      ) {

        throw new Error(
          res.message ||
          `Failed to delete transaction ${id}`
        );

      }

    }


    // ==========================================
    // CLEAR SELECTION
    // ==========================================

    selectedTxns.clear();

    updateMultiDeleteBar();


    showSuccess(
      `${ids.length} transaction${ids.length > 1 ? "s" : ""} deleted successfully ✅`
    );


    // ==========================================
    // REFRESH CUSTOMER DETAIL
    // ==========================================

    await selectCustomer(
      selectedCustomer,
      ""
    );


    // ==========================================
    // REFRESH CUSTOMER BALANCES SILENTLY
    // ==========================================

    openCustomers({
      silent: true
    });


  } catch (err) {

    console.error(
      "MULTI DELETE ERROR:",
      err
    );


    showToast(
      err.message ||
      "Delete failed ❌",
      "error"
    );


    if (deleteBtn) {

      resetButton(
        deleteBtn
      );

    }

  }

}

function customConfirm(msg) {
  return new Promise(resolve => {

    modal.innerHTML = `
      <div class="bg-gray-900 p-6 w-80 rounded-xl">

        <div class="mb-4">${msg}</div>

        <div class="flex gap-2">
          <button onclick="confirmNo()"
            class="w-1/2 bg-gray-700 p-2 rounded">Cancel</button>

          <button onclick="confirmYes()"
            class="w-1/2 bg-red-600 p-2 rounded">Yes</button>
        </div>

      </div>
    `;

    modal.classList.remove("hidden");

    window.confirmYes = () => {
      modal.classList.add("hidden");
      resolve(true);
    };

    window.confirmNo = () => {
      modal.classList.add("hidden");
      resolve(false);
    };

  });
}

async function sendWhatsAppReminder(
  name,
  phone,
  amount,
  btn = null
) {
  try {

    // ==================================
    // BUTTON LOADING
    // ==================================
    if (btn) {
      btn.innerHTML = "⏳";
      btn.disabled = true;
      btn.classList.add("opacity-70");
    }

    // ==================================
    // PHONE FORMAT
    // ==================================
    let rawPhone = (phone || "")
      .toString()
      .replace(/\D/g, "");

    let customerPhone = rawPhone;

    if (rawPhone.length === 12 && rawPhone.startsWith("91")) {
      customerPhone = rawPhone.slice(2);
    }

    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    }

    if (rawPhone.length !== 12) {
      throw new Error("Invalid phone number");
    }

    phone = rawPhone;

    // ==================================
    // BUSINESS CONFIG
    // ==================================
    const config = await getBusinessConfig();

    if (!config) {
      throw new Error("Business config missing");
    }

    // ==================================
    // LANGUAGE
    // ==================================
    let lang = "en";

    try {

      const customers = await apiGet({
        action: "getCustomersWithBalance",
        bid: currentBusiness
      });

      if (Array.isArray(customers)) {

        const customer = customers.find(c =>
          String(c.phone || "")
            .replace(/\D/g, "") === customerPhone
        );

        if (customer?.language) {
          lang = customer.language
            .toString()
            .trim()
            .toLowerCase();
        }
      }

    } catch (e) { }

    // ==================================
    // BUSINESS NAME
    // ==================================
    const businessName =
      document.getElementById("businessSelect")
        ?.selectedOptions[0]?.text ||
      "Your Business";

    const upi = config.upi_id || "";
    const payee = config.payee_name || businessName;
    const qr = config.qr_image || "";

    const upiLink =
      `upi://pay?pa=${upi}` +
      `&pn=${encodeURIComponent(payee)}` +
      `&am=${amount}` +
      `&cu=INR`;

    const env = localStorage.getItem("env") || "test";

    const summaryLink =
      `https://account.ransangroups.in/account_dashboard.html?customer=${selectedCustomer}&bid=${currentBusiness}&env=${env}`;

    // ==================================
    // MESSAGE
    // ==================================
    const msg = buildAdvancedMessage({
      name,
      amount,
      businessName,
      upiLink,
      qrLink: qr,
      summaryLink,
      lang
    });

    // ==================================
    // SEND WA
    // ==================================
    const res = await apiPost({
      action: "sendWhatsApp",
      phone,
      message: msg,
      api_url: config.api_url,
      instance_id: config.instance_id,
      access_token: config.access_token
    });

    console.log("WA RESPONSE:", res);

    // ==================================
    // SUCCESS CHECK
    // ==================================
    if (
      res &&
      (
        res.success === true ||
        res.status === "success" ||
        String(res.message || "")
          .toLowerCase()
          .includes("success")
      )
    ) {

      if (btn) {
        btn.innerHTML = "✔";
        btn.classList.remove("opacity-70");
        btn.classList.add("bg-green-600");
      }

      showToast(
        `WhatsApp reminder sent to ${name} ✅`,
        "success"
      );

      return true;
    }

    throw new Error("WhatsApp send failed");

  } catch (err) {

    console.error("WA ERROR:", err);

    if (btn) {
      btn.innerHTML = "❌";
      btn.classList.add("bg-red-600");
    }

    showToast(
      err.message || "Failed to send reminder ❌",
      "error"
    );

    return false;

  } finally {

    if (btn) {
      setTimeout(() => {
        btn.innerHTML = "📩";
        btn.disabled = false;
        btn.classList.remove(
          "opacity-70",
          "bg-green-600",
          "bg-red-600"
        );
      }, 2200);
    }
  }
}



function buildAdvancedMessage(data) {

  let {
    name,
    amount,
    businessName,
    upiLink,
    qrLink,
    summaryLink,
    lang
  } = data;

  lang = (lang || "en")
    .toString()
    .trim()
    .toLowerCase();

  // ==========================
  // TAMIL
  // ==========================
  if (lang === "ta" || lang === "tamil") {
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
📄 முழு விவரம்:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 நன்றி

🏢 ${businessName}`;
  }

  // ==========================
  // HINDI
  // ==========================
  if (lang === "hi" || lang === "hindi") {
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
📄 पूरा विवरण:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 धन्यवाद

🏢 ${businessName}`;
  }

  // ==========================
  // DEFAULT ENGLISH
  // ==========================
  return `👋 Hello ${name},

━━━━━━━━━━━━━━━
🧾 *ACCOUNT SUMMARY*

💰 Pending Amount:
👉 ₹${amount}

━━━━━━━━━━━━━━━
⚡ Pay Instantly

👉 Tap to Pay:
${upiLink}

📲 Scan QR:
${qrLink}

━━━━━━━━━━━━━━━
📄 View Full Statement:
${summaryLink}

━━━━━━━━━━━━━━━
🙏 Thank you

🏢 ${businessName}`;
}

function getInviteMessage(name, businessName, lang = "en") {

  const messages = {

    en: `👋 Hello ${name},

Welcome to *${businessName}* 🙏

We will use this number to share your account updates, payment reminders & statements.

📲 You can also track your account here:
https://finance.ransangroups.in/account_dashboard.html

Thank you for your support! 😊`,

    ta: `👋 வணக்கம் ${name},

*${businessName}* இற்கு வரவேற்கிறோம் 🙏

இந்த எண்ணிற்கு உங்கள் கணக்கு தகவல்கள், கட்டணம் நினைவூட்டல்கள் அனுப்பப்படும்.

📲 உங்கள் கணக்கை இங்கே பார்க்கலாம்:
https://finance.ransangroups.in/account_dashboard.html

நன்றி! 😊`,

    hi: `👋 नमस्ते ${name},

*${businessName}* में आपका स्वागत है 🙏

इस नंबर पर आपके अकाउंट अपडेट्स और पेमेंट रिमाइंडर भेजे जाएंगे।

📲 अपना अकाउंट यहां देखें:
https://finance.ransangroups.in/account_dashboard.html

धन्यवाद! 😊`
  };

  return messages[lang] || messages.en;
}

function sendWhatsAppInvite(name, phone, lang) {

  phone = (phone || "").replace(/\D/g, "");
  if (!phone.startsWith("91")) phone = "91" + phone;

  const businessName =
    document.getElementById("businessSelect")
      ?.selectedOptions[0]?.text || "Our Business";

  // ✅ fallback if lang missing
  if (!lang) {
    const el = document.getElementById("customerLang");
    lang = el ? el.value : "en";
  }

  console.log("📩 WhatsApp OPEN Lang:", lang);

  const message = getInviteMessage(name, businessName, lang);
  const encoded = encodeURIComponent(message);

  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
}

async function sendWhatsAppInviteAPI(name, phone, lang) {

  try {

    phone = (phone || "").replace(/\D/g, "");
    if (!phone.startsWith("91")) phone = "91" + phone;

    const businessName =
      document.getElementById("businessSelect")
        ?.selectedOptions[0]?.text || "Your Business";

    // ✅ fallback
    if (!lang) {
      const el = document.getElementById("customerLang");
      lang = el ? el.value : "en";
    }

    console.log("📩 WhatsApp API Lang:", lang);

    const config = await getBusinessConfig();

    const message = getInviteMessage(name, businessName, lang);

    await apiPost({
      action: "sendWhatsApp",
      phone,
      message,
      api_url: config.api_url,
      instance_id: config.instance_id,
      access_token: config.access_token
    });

  } catch (err) {
    console.error("❌ Invite Failed:", err);
  }
}



