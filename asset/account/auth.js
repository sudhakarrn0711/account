/* =========================================================
   LEDGER APP
   AUTH + ACCESS MANAGEMENT
   ========================================================= */

console.log(
  "✅ auth.js access management loaded"
);


/* =========================================================
   PERMISSIONS
   ========================================================= */

const LEDGER_PERMISSIONS = [

  {
    group: "CUSTOMERS",
    items: [
      ["customers.view", "View Customers"],
      ["customers.add", "Add Customer"],
      ["customers.edit", "Edit Customer"],
      ["customers.delete", "Delete Customer"]
    ]
  },

  {
    group: "TRANSACTIONS",
    items: [
      ["transactions.view", "View Transactions"],
      ["transactions.add", "Add Transactions"],
      ["transactions.edit", "Edit Transactions"],
      ["transactions.delete", "Delete Transactions"]
    ]
  },

  {
    group: "CASHBOOK",
    items: [
      ["cashbook.view", "View Cashbook"],
      ["cashbook.add", "Add Entry"],
      ["cashbook.edit", "Edit Entry"],
      ["cashbook.delete", "Delete Entry"]
    ]
  },

  {
    group: "REPORTING",
    items: [
      ["dashboard.view", "Dashboard"],
      ["reports.view", "Reports"],
      ["reports.export", "Export"]
    ]
  },

  {
    group: "ADMINISTRATION",
    items: [
      ["business.add", "Add Business"],
      ["business.manage", "Manage Business"],
      ["users.manage", "Manage Users"]
    ]
  }

];


/* =========================================================
   ROLE DEFAULTS
   ========================================================= */

const LEDGER_ROLE_DEFAULTS = {

  owner: [
    "*"
  ],

  admin: [
    "customers.view",
    "customers.add",
    "customers.edit",
    "customers.delete",

    "transactions.view",
    "transactions.add",
    "transactions.edit",
    "transactions.delete",

    "cashbook.view",
    "cashbook.add",
    "cashbook.edit",
    "cashbook.delete",

    "dashboard.view",
    "reports.view",
    "reports.export",

    "business.add",
    "business.manage",
    "users.manage"
  ],

  manager: [
    "customers.view",
    "customers.add",
    "customers.edit",

    "transactions.view",
    "transactions.add",
    "transactions.edit",

    "cashbook.view",
    "cashbook.add",
    "cashbook.edit",

    "dashboard.view",
    "reports.view",
    "reports.export"
  ],

  staff: [
    "customers.view",
    "customers.add",

    "transactions.view",
    "transactions.add",

    "cashbook.view",
    "cashbook.add"
  ],

  viewer: [
    "customers.view",
    "transactions.view",
    "cashbook.view",
    "dashboard.view",
    "reports.view"
  ]

};


/* =========================================================
   CURRENT SESSION
   ========================================================= */

function getLoggedInUsername() {

  return (
    sessionStorage.getItem("username") ||
    "User"
  );

}


function getLoggedInRole() {

  return (
    sessionStorage.getItem("role") ||
    "user"
  );

}


function normalizeRole(role) {

  return String(role || "")
    .trim()
    .toLowerCase();

}


function getRoleDisplayName(role) {

  switch (normalizeRole(role)) {

    case "owner":
      return "Owner";

    case "admin":
      return "Administrator";

    case "manager":
      return "Manager";

    case "staff":
      return "Staff";

    case "viewer":
      return "Viewer";

    default:
      return role || "User";

  }

}


/* =========================================================
   ACCESS PARSER
   ========================================================= */

function getLoggedInAccess() {

  const raw =
    sessionStorage.getItem("access");

  const role =
    normalizeRole(
      getLoggedInRole()
    );


  /*
   * No explicit access stored.
   * Fall back to role template.
   */
  if (!raw) {

    return [
      ...(LEDGER_ROLE_DEFAULTS[role] || [])
    ];

  }


  let parsedAccess = [];


  /*
   * Support JSON array/object.
   */
  try {

    const parsed =
      JSON.parse(raw);


    if (Array.isArray(parsed)) {

      parsedAccess =
        parsed.map(String);

    }
    else if (
      parsed &&
      typeof parsed === "object"
    ) {

      parsedAccess =
        Object
          .entries(parsed)
          .filter(([, allowed]) => !!allowed)
          .map(([permission]) => permission);

    }

  }
  catch (error) {

    /*
     * Not JSON.
     * Continue as comma-separated text.
     */

  }


  /*
   * Normal CSV value.
   */
  if (!parsedAccess.length) {

    parsedAccess =
      String(raw)
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);

  }


  /*
   * Full access.
   */
  if (parsedAccess.includes("*")) {

    return ["*"];

  }


  /*
   * Allow simple Config values:
   *
   * manager
   * staff
   * viewer
   * admin
   * owner
   */
  if (
    parsedAccess.length === 1
  ) {

    const templateName =
      normalizeRole(
        parsedAccess[0]
      );


    if (
      LEDGER_ROLE_DEFAULTS[
      templateName
      ]
    ) {

      return [
        ...LEDGER_ROLE_DEFAULTS[
        templateName
        ]
      ];

    }

  }


  /*
   * Otherwise this is a custom permission list.
   */
  return parsedAccess;

}


/* =========================================================
   CURRENT USER PERMISSION CHECK
   ========================================================= */

function hasAccess(permission) {

  const role =
    normalizeRole(
      getLoggedInRole()
    );


  if (role === "owner") {
    return true;
  }


  const access =
    getLoggedInAccess();


  if (
    access.includes("*") ||
    access.includes(permission)
  ) {
    return true;
  }


  /*
   * Compatibility fallback:
   *
   * Your backend already returns role + access.
   * If older Admin sessions have no access value,
   * don't suddenly break the working application.
   */
  if (
    access.length === 0 &&
    role === "admin"
  ) {
    return true;
  }


  return false;

}


/* =========================================================
   SESSION UI
   ========================================================= */

function renderLoggedInUser() {

  const username =
    document.getElementById(
      "sidebarUsername"
    );

  const role =
    document.getElementById(
      "sidebarUserRole"
    );


  if (username) {

    username.textContent =
      getLoggedInUsername();

  }


  if (role) {

    role.textContent =
      getRoleDisplayName(
        getLoggedInRole()
      );

  }


  const usersButton =
    document.getElementById(
      "usersAccessMenuBtn"
    );


  if (usersButton) {

    if (
      hasAccess("users.manage")
    ) {

      usersButton.classList.remove(
        "hidden"
      );

      usersButton.classList.add(
        "flex"
      );

    }
    else {

      usersButton.classList.add(
        "hidden"
      );

      usersButton.classList.remove(
        "flex"
      );

    }

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutUser() {

  sessionStorage.removeItem(
    "isLoggedIn"
  );

  sessionStorage.removeItem(
    "username"
  );

  sessionStorage.removeItem(
    "role"
  );

  sessionStorage.removeItem(
    "access"
  );

  sessionStorage.removeItem(
    "env"
  );


  sessionStorage.removeItem(
    "business_access"
  );

  window.location.replace(
    "login.html"
  );

}


/* =========================================================
   TEMPORARY ACCESS USER STORAGE
   =========================================================
   IMPORTANT:
   This makes the management UI fully functional locally.

   It does NOT replace backend authorization.

   Once backend user-management actions are available,
   only loadAccessUsers() and saveAccessUser() need to
   be changed to API calls.
   ========================================================= */

const ACCESS_USERS_KEY =
  "ledgerAccessUsersV1";


let accessUsersCache = [];


async function loadAccessUsers() {

  try {

    const response =
      await apiGet(
        "getAccessUsers"
      );


    if (
      !response ||
      response.success !== true ||
      !Array.isArray(
        response.users
      )
    ) {

      throw new Error(
        response?.message ||
        "Unable to load users"
      );

    }


    accessUsersCache =
      response.users.map(
        user => {

          const businessRaw =
            String(
              user.business_access ||
              ""
            ).trim();


          const businesses =
            businessRaw === "*"
              ? ["*"]
              : businessRaw
                .split(",")
                .map(
                  value =>
                    value.trim()
                )
                .filter(Boolean);


          const accessRaw =
            String(
              user.access ||
              user.role ||
              ""
            ).trim();


          let permissions;


          if (accessRaw === "*") {

            permissions = ["*"];

          }
          else if (
            LEDGER_ROLE_DEFAULTS[
            normalizeRole(
              accessRaw
            )
            ]
          ) {

            permissions = [
              ...LEDGER_ROLE_DEFAULTS[
              normalizeRole(
                accessRaw
              )
              ]
            ];

          }
          else {

            permissions =
              accessRaw
                .split(",")
                .map(
                  value =>
                    value.trim()
                )
                .filter(Boolean);

          }


          return {

            id:
              String(
                user.row ||
                user.username
              ),

            row:
              user.row,

            username:
              user.username,

            role:
              normalizeRole(
                user.role
              ),

            businesses,

            permissions,

            active:
              user.active !== false

          };

        }
      );


    return accessUsersCache;


  }
  catch (error) {

    console.error(
      "[ACCESS USERS LOAD]",
      error
    );


    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "Unable to load users.",
        "error"
      );

    }


    return [];

  }

}








/* =========================================================
   BUSINESS HELPERS
   ========================================================= */

function getAccessBusinesses() {

  return (
    window.businesses ||
    []
  ).map(
    business => ({

      id:
        String(
          business.id ?? ""
        ),

      name:
        business.name ||
        "Business"

    })
  );

}


/* =========================================================
   MODAL
   ========================================================= */

async function openUsersAccess() {

  if (
    !hasAccess(
      "users.manage"
    )
  ) {

    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "You do not have permission to manage users.",
        "error"
      );

    }

    return;

  }


  const modal =
    document.getElementById(
      "usersAccessModal"
    );


  if (!modal) {

    console.error(
      "usersAccessModal not found"
    );

    return;

  }


  modal.classList.remove(
    "hidden"
  );

  modal.classList.add(
    "flex"
  );


  const container =
    document.getElementById(
      "accessUserList"
    );


  if (container) {

    container.innerHTML = `

      <div
        class="
          py-8
          text-center
          text-sm
          text-gray-500
        "
      >
        Loading users...
      </div>

    `;

  }


  showAccessEmptyState();


  await loadAccessUsers();


  renderAccessUserList();

}


function closeUsersAccess() {

  const modal =
    document.getElementById(
      "usersAccessModal"
    );


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );

  modal.classList.remove(
    "flex"
  );

}


/* =========================================================
   USER LIST
   ========================================================= */

function renderAccessUserList() {

  const container =
    document.getElementById(
      "accessUserList"
    );


  if (!container) {
    return;
  }


  const users =
    accessUsersCache;


  if (!users.length) {

    container.innerHTML = `

      <div
        class="
          text-center
          text-sm
          text-gray-500
          py-8
        "
      >
        No users yet.
      </div>

    `;

    return;

  }


  container.innerHTML =
    users
      .map(user => {

        const businesses =
          formatUserBusinessAccess(
            user
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

            <div
              class="
                flex
                items-start
                gap-3
              "
            >

              <div
                class="
                  w-10
                  h-10
                  shrink-0
                  rounded-full
                  bg-blue-500/10
                  flex
                  items-center
                  justify-center
                "
              >
                👤
              </div>


              <div
                class="
                  flex-1
                  min-w-0
                "
              >

                <div
                  class="
                    text-sm
                    font-semibold
                    text-white
                    truncate
                  "
                >
                  ${escapeAccessHtml(
          user.username
        )}
                </div>

                <div
                  class="
                    text-xs
                    text-blue-400
                    mt-0.5
                  "
                >
                  ${escapeAccessHtml(
          getRoleDisplayName(
            user.role
          )
        )}
                </div>

                <div
                  class="
                    text-[11px]
                    text-gray-500
                    mt-1
                    truncate
                  "
                >
                  ${escapeAccessHtml(
          businesses
        )}
                </div>

              </div>


              <button
                type="button"
                data-access-manage="${escapeAccessHtml(
          user.id
        )}"
                class="
                  bg-gray-800
                  hover:bg-gray-700
                  text-gray-200
                  px-3
                  py-2
                  rounded-lg
                  text-xs
                "
              >
                Manage
              </button>

            </div>

          </div>

        `;

      })
      .join("");


  container
    .querySelectorAll(
      "[data-access-manage]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          editAccessUser(
            button.dataset
              .accessManage
          );

        }
      );

    });

}


/* =========================================================
   BUSINESS DISPLAY
   ========================================================= */

function formatUserBusinessAccess(user) {

  const selected =
    Array.isArray(
      user.businesses
    )
      ? user.businesses
      : [];


  if (
    selected.includes("*")
  ) {
    return "All businesses";
  }


  const businesses =
    getAccessBusinesses();


  const names =
    businesses
      .filter(
        business =>
          selected.includes(
            business.id
          )
      )
      .map(
        business =>
          business.name
      );


  return (
    names.join(", ") ||
    "No business access"
  );

}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function showAccessEmptyState() {

  const editor =
    document.getElementById(
      "accessEditor"
    );

  const emptyState =
    document.getElementById(
      "accessEmptyState"
    );

  const footer =
    document.getElementById(
      "accessEditorFooter"
    );


  if (editor) {

    editor.classList.add(
      "hidden"
    );

    editor.classList.remove(
      "flex"
    );

  }


  if (footer) {

    footer.classList.add(
      "hidden"
    );

  }


  if (emptyState) {

    emptyState.classList.remove(
      "hidden"
    );

    emptyState.classList.add(
      "flex"
    );

  }

}


/* =========================================================
   NEW USER
   ========================================================= */

function newAccessUser() {

  renderAccessEditor({

    id: "",

    username: "",

    role: "staff",

    businesses: [],

    permissions: [
      ...LEDGER_ROLE_DEFAULTS.staff
    ],

    active: true

  });

}


/* =========================================================
   EDIT USER
   ========================================================= */

function editAccessUser(id) {

  const user =
    accessUsersCache.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!user) {

    console.error(
      "Access user not found:",
      id
    );

    return;

  }


  renderAccessEditor(
    user
  );

}


/* =========================================================
   EDITOR
   ========================================================= */

function renderAccessEditor(user) {

  const editor =
    document.getElementById(
      "accessEditor"
    );

  const scroll =
    document.getElementById(
      "accessEditorScroll"
    );

  const emptyState =
    document.getElementById(
      "accessEmptyState"
    );

  const rightPanel =
    document.getElementById(
      "accessRightPanel"
    );

  const footer =
    document.getElementById(
      "accessEditorFooter"
    );

  const saveButton =
    document.getElementById(
      "saveAccessBtn"
    );

const deleteButton =
  document.getElementById(
    "deleteAccessUserBtn"
  );


  if (!editor || !scroll) {

    console.error(
      "Access editor elements not found"
    );

    return;

  }


  /* ================================
     SHOW RIGHT EDITOR
  ================================= */

  if (rightPanel) {

    rightPanel.classList.remove(
      "hidden"
    );

  }


  if (emptyState) {

    emptyState.classList.add(
      "hidden"
    );

    emptyState.classList.remove(
      "flex"
    );

  }


  editor.classList.remove(
    "hidden"
  );

  editor.classList.add(
    "flex"
  );


  if (footer) {

    footer.classList.remove(
      "hidden"
    );

  }


  /* ================================
     USER DATA
  ================================= */

  const businesses =
    getAccessBusinesses();


  const selectedBusinesses =
    Array.isArray(
      user.businesses
    )
      ? user.businesses.map(
          String
        )
      : [];


  const permissions =
    Array.isArray(
      user.permissions
    )
      ? user.permissions
      : [];


  const allPermissions =
    permissions.includes("*");


  /* ================================
     EDITOR CONTENT
  ================================= */

  scroll.innerHTML = `

    <div
      class="
        max-w-2xl
        mx-auto
        space-y-5
      "
    >

      <!-- TITLE -->

      <div>

        <div
          class="
            text-lg
            font-semibold
            text-white
          "
        >
          ${
            user.id
              ? "Edit User"
              : "Add User"
          }
        </div>


        <div
          class="
            text-xs
            text-gray-500
            mt-1
          "
        >
          Configure role, business access and permissions.
        </div>

      </div>


      <!-- =========================
           USERNAME
      ========================== -->

      <div>

        <label
          class="
            text-xs
            text-gray-400
            block
            mb-2
          "
        >
          Username
        </label>


        <input
          id="accessUsername"
          type="text"

          value="${escapeAccessHtml(
            user.username || ""
          )}"

          class="
            w-full
            bg-gray-900
            border
            border-gray-700
            rounded-xl
            px-3
            py-2.5
            text-white
            outline-none
            focus:border-blue-500
          "
        />

      </div>


      <!-- =========================
           PASSWORD
      ========================== -->

      <div>

        <label
          class="
            text-xs
            text-gray-400
            block
            mb-2
          "
        >
          Password
        </label>


        <input
          id="accessPassword"
          type="password"

          autocomplete="new-password"

          placeholder="${
            user.username
              ? "Leave blank to keep existing password"
              : "Enter password"
          }"

          class="
            w-full
            bg-gray-900
            border
            border-gray-700
            rounded-xl
            px-3
            py-2.5
            text-white
            outline-none
            focus:border-blue-500
          "
        />


        ${
          user.username
            ? `

              <div
                class="
                  text-[11px]
                  text-gray-500
                  mt-1
                "
              >
                Leave blank unless you want to change the password.
              </div>

            `
            : ""
        }

      </div>


      <!-- =========================
           ROLE
      ========================== -->

      <div>

        <label
          class="
            text-xs
            text-gray-400
            block
            mb-2
          "
        >
          Role
        </label>


        <select
          id="accessRole"

          class="
            w-full
            bg-gray-900
            border
            border-gray-700
            rounded-xl
            px-3
            py-2.5
            text-white
          "
        >

          ${[
            "owner",
            "admin",
            "manager",
            "staff",
            "viewer"
          ]
            .map(role => `

              <option
                value="${role}"

                ${
                  normalizeRole(
                    user.role
                  ) === role
                    ? "selected"
                    : ""
                }
              >

                ${getRoleDisplayName(
                  role
                )}

              </option>

            `)
            .join("")}

        </select>

      </div>


      <!-- =========================
           ACTIVE USER
      ========================== -->

      <div
        class="
          bg-gray-900/70
          border
          border-gray-800
          rounded-xl
          p-4
        "
      >

        <label
          class="
            flex
            items-center
            justify-between
            gap-4
            cursor-pointer
          "
        >

          <div>

            <div
              class="
                text-sm
                font-medium
                text-gray-200
              "
            >
              Active user
            </div>


            <div
              class="
                text-xs
                text-gray-500
                mt-1
              "
            >
              Disabled users cannot sign in.
            </div>

          </div>


          <input
            id="accessActive"
            type="checkbox"

            ${
              user.active !== false
                ? "checked"
                : ""
            }

            class="
              w-5
              h-5
            "
          />

        </label>

      </div>


      <!-- =========================
           BUSINESS ACCESS
      ========================== -->

      <div
        class="
          bg-gray-900/70
          border
          border-gray-800
          rounded-xl
          p-4
        "
      >

        <div
          class="
            text-xs
            font-semibold
            text-gray-300
            mb-3
          "
        >
          BUSINESS ACCESS
        </div>


        <!-- ALL BUSINESSES -->

        <label
          class="
            flex
            items-center
            gap-3
            py-2
            cursor-pointer
          "
        >

          <input
            id="accessAllBusinesses"
            type="checkbox"

            ${
              selectedBusinesses
                .includes("*")
                ? "checked"
                : ""
            }
          />


          <span
            class="
              text-sm
              text-gray-200
            "
          >
            All businesses
          </span>

        </label>


        <!-- BUSINESS LIST -->

        <div
          id="accessBusinessOptions"

          class="
            pl-5
            border-l
            border-gray-800
            mt-1
          "
        >

          ${businesses
            .map(
              business => {

                const businessId =
                  String(
                    business.id
                  );


                return `

                  <label
                    class="
                      flex
                      items-center
                      gap-3
                      py-2
                      cursor-pointer
                    "
                  >

                    <input
                      type="checkbox"

                      data-access-business="${escapeAccessHtml(
                        businessId
                      )}"

                      ${
                        selectedBusinesses
                          .includes(
                            businessId
                          )
                            ? "checked"
                            : ""
                      }
                    />


                    <span
                      class="
                        text-sm
                        text-gray-300
                      "
                    >

                      ${escapeAccessHtml(
                        business.name
                      )}

                    </span>

                  </label>

                `;

              }
            )
            .join("")}

        </div>

      </div>


      <!-- =========================
           PERMISSIONS
      ========================== -->

      ${LEDGER_PERMISSIONS
        .map(
          group => `

            <div
              class="
                bg-gray-900/70
                border
                border-gray-800
                rounded-xl
                p-4
              "
            >

              <div
                class="
                  text-xs
                  font-semibold
                  text-gray-400
                  mb-2
                "
              >

                ${escapeAccessHtml(
                  group.group
                )}

              </div>


              ${group.items
                .map(
                  ([key, label]) => `

                    <label
                      class="
                        flex
                        items-center
                        gap-3
                        py-2
                        cursor-pointer
                      "
                    >

                      <input
                        type="checkbox"

                        data-access-permission="${escapeAccessHtml(
                          key
                        )}"

                        ${
                          allPermissions ||
                          permissions.includes(
                            key
                          )
                            ? "checked"
                            : ""
                        }
                      />


                      <span
                        class="
                          text-sm
                          text-gray-200
                        "
                      >

                        ${escapeAccessHtml(
                          label
                        )}

                      </span>

                    </label>

                  `
                )
                .join("")}

            </div>

          `
        )
        .join("")}


      <!-- BOTTOM SPACE -->

      <div class="h-2"></div>

    </div>

  `;


  /* ================================
     FIXED SAVE BUTTON
  ================================= */

  if (saveButton) {

    saveButton.onclick =
      () => {

        saveAccessEditor(
          user.id || ""
        );

      };

  }

  /* ================================
   DELETE USER BUTTON
================================= */

if (deleteButton) {

  const isExistingUser =
    !!user.id &&
    !!user.username;

  const isOwner =
    normalizeRole(
      user.role
    ) === "owner";

  const isCurrentUser =
    String(
      user.username || ""
    )
      .trim()
      .toLowerCase() ===
    String(
      getLoggedInUsername() || ""
    )
      .trim()
      .toLowerCase();


  /*
   * Delete is available only for:
   *
   * - existing users
   * - non-owner users
   * - not the currently logged-in user
   */
  if (
    isExistingUser &&
    !isOwner &&
    !isCurrentUser
  ) {

    deleteButton.classList.remove(
      "hidden"
    );

    deleteButton.disabled =
      false;

    deleteButton.onclick =
      () => {

        deleteAccessUser(
          user.id,
          user.username,
          user.role
        );

      };

  }
  else {

    deleteButton.classList.add(
      "hidden"
    );

    deleteButton.disabled =
      true;

    deleteButton.onclick =
      null;

  }

}


  /* ================================
     ROLE CHANGE
  ================================= */

  const roleSelect =
    document.getElementById(
      "accessRole"
    );


  roleSelect?.addEventListener(
    "change",
    () => {

      applyRoleTemplate(
        roleSelect.value
      );

    }
  );


  /* ================================
     BUSINESS CHECKBOX STATE
  ================================= */

  updateBusinessAccessState();


  document
    .getElementById(
      "accessAllBusinesses"
    )
    ?.addEventListener(
      "change",
      updateBusinessAccessState
    );


  /* START EDITOR FROM TOP */

  scroll.scrollTop = 0;

}


/* =========================================================
   BUSINESS CHECKBOX STATE
   ========================================================= */

function updateBusinessAccessState() {

  const all =
    document.getElementById(
      "accessAllBusinesses"
    );


  const disabled =
    !!all?.checked;


  document
    .querySelectorAll(
      "[data-access-business]"
    )
    .forEach(
      checkbox => {

        checkbox.disabled =
          disabled;

      }
    );

}


/* =========================================================
   ROLE TEMPLATE
   ========================================================= */

function applyRoleTemplate(role) {

  const defaults =
    LEDGER_ROLE_DEFAULTS[
    normalizeRole(role)
    ] || [];


  const all =
    defaults.includes("*");


  document
    .querySelectorAll(
      "[data-access-permission]"
    )
    .forEach(
      checkbox => {

        checkbox.checked =
          all ||
          defaults.includes(
            checkbox.dataset
              .accessPermission
          );

      }
    );

}


/* =========================================================
   DELETE ACCESS USER
   ========================================================= */

async function deleteAccessUser(
  existingId,
  username,
  role
) {

  /*
   * Permission check.
   */
  if (
    !hasAccess(
      "users.manage"
    )
  ) {

    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "You do not have permission to delete users.",
        "error"
      );

    }

    return;
  }


  const cleanUsername =
    String(
      username || ""
    ).trim();


  if (!cleanUsername) {

    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "Invalid user.",
        "error"
      );

    }

    return;
  }


  /*
   * OWNER PROTECTION
   */
  if (
    normalizeRole(role) ===
    "owner"
  ) {

    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "The Owner account cannot be deleted.",
        "error"
      );

    }

    return;
  }


  /*
   * CURRENT LOGIN PROTECTION
   */
  if (
    cleanUsername
      .toLowerCase() ===
    String(
      getLoggedInUsername() || ""
    )
      .trim()
      .toLowerCase()
  ) {

    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        "You cannot delete the account you are currently signed in with.",
        "error"
      );

    }

    return;
  }


  /*
   * CONFIRM DELETE
   */
  let confirmed = false;


  if (
    typeof customConfirm ===
    "function"
  ) {

    confirmed =
      await customConfirm(
        `Delete user "${cleanUsername}"?\n\nThis will permanently remove this user's login access.`
      );

  }
  else {

    confirmed =
      window.confirm(
        `Delete user "${cleanUsername}"?\n\nThis will permanently remove this user's login access.`
      );

  }


  if (!confirmed) {
    return;
  }


  const deleteButton =
    document.getElementById(
      "deleteAccessUserBtn"
    );


  const saveButton =
    document.getElementById(
      "saveAccessBtn"
    );


  /*
   * LOCK BUTTONS DURING REQUEST
   */
  if (deleteButton) {

    deleteButton.disabled =
      true;

    deleteButton.textContent =
      "Deleting...";

  }


  if (saveButton) {

    saveButton.disabled =
      true;

  }


  try {

    const response =
      await apiPost({

        action:
          "deleteAccessUser",

        username:
          cleanUsername

      });


    if (
      !response ||
      response.success !== true
    ) {

      throw new Error(
        response?.message ||
        "Unable to delete user"
      );

    }


    /*
     * RELOAD USERS FROM CONFIG
     */
    await loadAccessUsers();


    /*
     * REFRESH LEFT USER LIST
     */
    renderAccessUserList();


    /*
     * CLEAR RIGHT EDITOR
     */
    showAccessEmptyState();


    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        `User "${cleanUsername}" deleted.`,
        "success"
      );

    }

  }
  catch (error) {

    console.error(
      "[DELETE ACCESS USER]",
      error
    );


    if (
      typeof showToast ===
      "function"
    ) {

      showToast(
        error.message ||
        "Unable to delete user.",
        "error"
      );

    }

  }
  finally {

    /*
     * The editor normally disappears after
     * successful deletion. These resets matter
     * if the API request failed.
     */
    if (deleteButton) {

      deleteButton.disabled =
        false;

      deleteButton.textContent =
        "🗑 Delete User";

    }


    if (saveButton) {

      saveButton.disabled =
        false;

    }

  }

}

/* =========================================================
   SAVE EDITOR
   ========================================================= */

async function saveAccessEditor(
  existingId
) {

  const username =
    document
      .getElementById(
        "accessUsername"
      )
      ?.value
      .trim();


  const password =
    document
      .getElementById(
        "accessPassword"
      )
      ?.value || "";


  const role =
    normalizeRole(
      document
        .getElementById(
          "accessRole"
        )
        ?.value
    );


  const active =
    document
      .getElementById(
        "accessActive"
      )
      ?.checked !== false;


  if (!username) {

    showToast?.(
      "Enter a username.",
      "error"
    );

    return;

  }


  /*
   * New user requires password.
   */
  if (
    !existingId &&
    !password
  ) {

    showToast?.(
      "Enter a password for the new user.",
      "error"
    );

    return;

  }


  const allBusinesses =
    document
      .getElementById(
        "accessAllBusinesses"
      )
      ?.checked;


  const businesses =
    allBusinesses
      ? ["*"]
      : Array.from(
        document.querySelectorAll(
          "[data-access-business]:checked"
        )
      )
        .map(
          checkbox =>
            checkbox.dataset
              .accessBusiness
        );


  /*
   * Collect selected permissions.
   */
  const permissions =
    Array.from(
      document.querySelectorAll(
        "[data-access-permission]:checked"
      )
    )
      .map(
        checkbox =>
          checkbox.dataset
            .accessPermission
      );


  /*
   * If selected permissions exactly match
   * the selected role template, store only
   * the role name in Config.
   *
   * Otherwise store custom CSV permissions.
   */
  const roleDefaults =
    LEDGER_ROLE_DEFAULTS[
    role
    ] || [];


  let accessValue = "";


  if (
    roleDefaults.includes("*")
  ) {

    accessValue = "*";

  }
  else {

    const selectedSorted =
      [...permissions].sort();


    const defaultsSorted =
      [...roleDefaults].sort();


    const matchesRole =
      JSON.stringify(
        selectedSorted
      ) ===
      JSON.stringify(
        defaultsSorted
      );


    accessValue =
      matchesRole
        ? role
        : permissions.join(",");

  }


  const businessAccessValue =
    businesses.includes("*")
      ? "*"
      : businesses.join(",");


  const saveButton =
    document.getElementById(
      "saveAccessBtn"
    );


  if (saveButton) {

    saveButton.disabled = true;

    saveButton.textContent =
      "Saving...";

  }


  try {

    const response =
      await apiPost({

        action:
          "saveAccessUser",

        username,

        password,

        role,

        access:
          accessValue,

        business_access:
          businessAccessValue,

        active

      });


    if (
      !response ||
      response.success !== true
    ) {

      throw new Error(
        response?.message ||
        "Unable to save user"
      );

    }


    showToast?.(
      existingId
        ? "User access updated."
        : "User created.",
      "success"
    );


    await loadAccessUsers();


    renderAccessUserList();


    const saved =
      accessUsersCache.find(
        user =>
          String(
            user.username
          ).toLowerCase() ===
          username.toLowerCase()
      );


    if (saved) {

      editAccessUser(
        saved.id
      );

    }


  }
  catch (error) {

    console.error(
      "[SAVE ACCESS USER]",
      error
    );


    showToast?.(
      error.message ||
      "Unable to save user.",
      "error"
    );

  }
  finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        "Save Access";

    }

  }

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeAccessHtml(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (
      sessionStorage.getItem(
        "isLoggedIn"
      ) !== "true"
    ) {

      window.location.replace(
        "login.html"
      );

      return;

    }


    renderLoggedInUser();

  }
);


/* =========================================================
   CENTRAL ACCESS ENFORCEMENT
   =========================================================
   Keeps the existing feature files unchanged while enforcing
   the permissions already defined above.

   IMPORTANT:
   This is frontend enforcement. The Apps Script backend must
   still validate authorization for production security.
   ========================================================= */




function guardBusinessModal() {

  const original = window.openBusinessModal;

  if (
    typeof original !== "function" ||
    original.__ledgerAccessGuarded
  ) {
    return;
  }

  const guarded = function (business = null, ...rest) {

    const permission = business
      ? "business.manage"
      : "business.add";

    if (!hasAccess(permission)) {
      showAccessDenied(
        business
          ? "You do not have permission to edit businesses."
          : "You do not have permission to add businesses."
      );
      return;
    }

    return original.call(this, business, ...rest);
  };

  guarded.__ledgerAccessGuarded = true;
  guarded.__ledgerOriginal = original;

  window.openBusinessModal = guarded;
}


function setPermissionVisibility(selector, permission) {

  document
    .querySelectorAll(selector)
    .forEach(element => {

      if (hasAccess(permission)) {
        element.classList.remove("access-permission-hidden");
      }
      else {
        element.classList.add("access-permission-hidden");
      }

    });
}


function applyPermissionVisibility() {

  setPermissionVisibility(
    '#addBusinessBtn, [onclick^="openBusinessModal()"]',
    "business.add"
  );

  setPermissionVisibility(
    '#manageBusinessesBtn, [onclick^="openBusinessManager()"]',
    "business.manage"
  );

  setPermissionVisibility(
    '#customersMenuBtn, [onclick^="openCustomers()"]',
    "customers.view"
  );

  setPermissionVisibility(
    '#cashbookMenuBtn, [onclick^="openCashbook()"]',
    "cashbook.view"
  );

  setPermissionVisibility(
    '#dashboardMenuBtn, [onclick^="openDashboard()"]',
    "dashboard.view"
  );

  setPermissionVisibility(
    '#usersAccessMenuBtn',
    "users.manage"
  );

  setPermissionVisibility(
    '[onclick^="openAddCustomer("]',
    "customers.add"
  );

  setPermissionVisibility(
    '[onclick^="openTxn(\'gave\')"], [onclick^="openTxn(\'got\')"]',
    "transactions.add"
  );

  setPermissionVisibility(
    '[onclick^="editTxn("]',
    "transactions.edit"
  );

  setPermissionVisibility(
    '[onclick*="deleteTxn("]',
    "transactions.delete"
  );

  setPermissionVisibility(
    '[onclick^="openCashEntryModal("]',
    "cashbook.add"
  );

  setPermissionVisibility(
    '[onclick^="editCashTxn("]',
    "cashbook.edit"
  );

  setPermissionVisibility(
    '[onclick*="deleteCashTxn("]',
    "cashbook.delete"
  );

  setPermissionVisibility(
    '[onclick^="downloadPDF("], [onclick^="exportExcel("], [onclick^="exportCashbookStatementExcel("], [onclick^="exportCashbookReportsExcel("]',
    "reports.export"
  );
}


function installAccessGuards() {

  const guards = [
    ["openCustomers", "customers.view", "You do not have permission to view customers."],
    ["openAddCustomer", "customers.add", "You do not have permission to add customers."],
    ["saveCustomer", "customers.add", "You do not have permission to add customers."],
    ["deleteSelectedCustomers", "customers.delete", "You do not have permission to delete customers."],

    ["selectCustomer", "transactions.view", "You do not have permission to view customer transactions."],
    ["openTxn", "transactions.add", "You do not have permission to add transactions."],
    ["saveTxn", "transactions.add", "You do not have permission to add transactions."],
    ["editTxn", "transactions.edit", "You do not have permission to edit transactions."],
    ["deleteTxn", "transactions.delete", "You do not have permission to delete transactions."],
    ["deleteSelected", "transactions.delete", "You do not have permission to delete transactions."],

    ["openCashbook", "cashbook.view", "You do not have permission to view Cashbook."],
    ["openCashEntryModal", "cashbook.add", "You do not have permission to add Cashbook entries."],
    ["editCashTxn", "cashbook.edit", "You do not have permission to edit Cashbook entries."],
    ["deleteCashTxn", "cashbook.delete", "You do not have permission to delete Cashbook entries."],
    ["deleteSelectedCash", "cashbook.delete", "You do not have permission to delete Cashbook entries."],
    ["openAddAccount", "cashbook.add", "You do not have permission to add Cashbook accounts."],
    ["editAccount", "cashbook.edit", "You do not have permission to edit Cashbook accounts."],
    ["deleteAccount", "cashbook.delete", "You do not have permission to delete Cashbook accounts."],
    ["deleteSelectedCashAccounts", "cashbook.delete", "You do not have permission to delete Cashbook accounts."],

    ["openDashboard", "dashboard.view", "You do not have permission to view Dashboard."],
    ["openReportPanel", "reports.view", "You do not have permission to view reports."],
    ["downloadPDF", "reports.export", "You do not have permission to export reports."],
    ["exportExcel", "reports.export", "You do not have permission to export reports."],
    ["exportCashbookStatementExcel", "reports.export", "You do not have permission to export reports."],
    ["exportCashbookReportsExcel", "reports.export", "You do not have permission to export reports."],

    ["openBusinessManager", "business.manage", "You do not have permission to manage businesses."],
    ["openUsersAccess", "users.manage", "You do not have permission to manage users."]
  ];

  guards.forEach(([name, permission, message]) => {
    guardGlobalFunction(name, permission, message);
  });

  guardBusinessModal();
  applyPermissionVisibility();
}


let accessVisibilityObserver = null;

function startAccessVisibilityObserver() {

  if (accessVisibilityObserver) return;

  accessVisibilityObserver = new MutationObserver(() => {
    applyPermissionVisibility();
  });

  accessVisibilityObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );
}


document.addEventListener(
  "DOMContentLoaded",
  () => {

    installAccessGuards();
    startAccessVisibilityObserver();

  }
);

/* =========================================================
   ACCESS ENFORCEMENT - COMPLETE FIX
   ========================================================= */

function ledgerAccessDenied(message) {

  const text =
    message ||
    "You do not have permission to perform this action.";

  if (typeof showToast === "function") {
    showToast(text, "error");
  } else {
    alert(text);
  }

}


/* ---------------------------------------------------------
   FUNCTION GUARD
   --------------------------------------------------------- */

function protectLedgerFunction(
  functionName,
  permission,
  message
) {

  const original =
    window[functionName];

  if (
    typeof original !== "function" ||
    original.__ledgerPermissionProtected
  ) {
    return;
  }


  const protectedFunction =
    function (...args) {

      if (!hasAccess(permission)) {

        ledgerAccessDenied(
          message ||
          "You do not have permission to perform this action."
        );

        return;
      }

      return original.apply(
        this,
        args
      );
    };


  protectedFunction.__ledgerPermissionProtected =
    true;


  window[functionName] =
    protectedFunction;

}


/* ---------------------------------------------------------
   INSTALL ALL PERMISSION GUARDS
   --------------------------------------------------------- */

function installLedgerPermissionGuards() {


  /* =========================
     CUSTOMERS
     ========================= */

  protectLedgerFunction(
    "openCustomers",
    "customers.view",
    "You do not have permission to view customers."
  );

  protectLedgerFunction(
    "openAddCustomer",
    "customers.add",
    "You do not have permission to add customers."
  );

  protectLedgerFunction(
    "saveCustomer",
    "customers.add",
    "You do not have permission to add customers."
  );


  /* CUSTOMER EDIT */

  protectLedgerFunction(
    "editCustomer",
    "customers.edit",
    "You do not have permission to edit customers."
  );

  protectLedgerFunction(
    "updateCustomer",
    "customers.edit",
    "You do not have permission to edit customers."
  );

  protectLedgerFunction(
    "saveCustomerExtra",
    "customers.edit",
    "You do not have permission to edit customers."
  );


  /* CUSTOMER DELETE */

  protectLedgerFunction(
    "confirmDeleteCustomer",
    "customers.delete",
    "You do not have permission to delete customers."
  );

  protectLedgerFunction(
    "deleteCustomer",
    "customers.delete",
    "You do not have permission to delete customers."
  );

  protectLedgerFunction(
    "deleteSelectedCustomers",
    "customers.delete",
    "You do not have permission to delete customers."
  );


  /* =========================
     TRANSACTIONS
     ========================= */

  protectLedgerFunction(
    "selectCustomer",
    "transactions.view",
    "You do not have permission to view transactions."
  );

  protectLedgerFunction(
    "openTxn",
    "transactions.add",
    "You do not have permission to add transactions."
  );

  protectLedgerFunction(
    "saveTxn",
    "transactions.add",
    "You do not have permission to add transactions."
  );

  protectLedgerFunction(
    "editTxn",
    "transactions.edit",
    "You do not have permission to edit transactions."
  );

  protectLedgerFunction(
    "updateTxn",
    "transactions.edit",
    "You do not have permission to edit transactions."
  );

  protectLedgerFunction(
    "deleteTxn",
    "transactions.delete",
    "You do not have permission to delete transactions."
  );

  protectLedgerFunction(
    "deleteSelected",
    "transactions.delete",
    "You do not have permission to delete transactions."
  );


  /* =========================
     CASHBOOK
     ========================= */

  protectLedgerFunction(
    "openCashbook",
    "cashbook.view",
    "You do not have permission to view Cashbook."
  );

  protectLedgerFunction(
    "openCashEntryModal",
    "cashbook.add",
    "You do not have permission to add Cashbook entries."
  );

  protectLedgerFunction(
    "editCashTxn",
    "cashbook.edit",
    "You do not have permission to edit Cashbook entries."
  );

  protectLedgerFunction(
    "deleteCashTxn",
    "cashbook.delete",
    "You do not have permission to delete Cashbook entries."
  );

  protectLedgerFunction(
    "deleteSelectedCash",
    "cashbook.delete",
    "You do not have permission to delete Cashbook entries."
  );

  protectLedgerFunction(
    "deleteSelectedCashAccounts",
    "cashbook.delete",
    "You do not have permission to delete Cashbook accounts."
  );


  /* =========================
     DASHBOARD
     ========================= */

  protectLedgerFunction(
    "openDashboard",
    "dashboard.view",
    "You do not have permission to view Dashboard."
  );


  /* =========================
     REPORTS
     ========================= */

  protectLedgerFunction(
    "openReportPanel",
    "reports.view",
    "You do not have permission to view reports."
  );

  protectLedgerFunction(
    "downloadPDF",
    "reports.export",
    "You do not have permission to export reports."
  );

  protectLedgerFunction(
    "exportExcel",
    "reports.export",
    "You do not have permission to export reports."
  );

  protectLedgerFunction(
    "exportCashbookStatementExcel",
    "reports.export",
    "You do not have permission to export reports."
  );

  protectLedgerFunction(
    "exportCashbookReportsExcel",
    "reports.export",
    "You do not have permission to export reports."
  );


  /* =========================
     BUSINESS
     ========================= */

  protectLedgerFunction(
    "openBusinessManager",
    "business.manage",
    "You do not have permission to manage businesses."
  );


  /* =========================
     USER MANAGEMENT
     ========================= */

  protectLedgerFunction(
    "openUsersAccess",
    "users.manage",
    "You do not have permission to manage users."
  );

}


/* ---------------------------------------------------------
   START AFTER ALL DEFERRED JS FILES HAVE LOADED
   --------------------------------------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
     * auth.js loads before several feature files.
     * DOMContentLoaded runs after all deferred scripts,
     * therefore their global functions are available here.
     */

    installLedgerPermissionGuards();

  }
);

/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.logoutUser =
  logoutUser;

window.hasAccess =
  hasAccess;

window.getLoggedInUsername =
  getLoggedInUsername;

window.getLoggedInRole =
  getLoggedInRole;

window.getLoggedInAccess =
  getLoggedInAccess;

window.openUsersAccess =
  openUsersAccess;

window.closeUsersAccess =
  closeUsersAccess;

window.newAccessUser =
  newAccessUser;

window.editAccessUser =
  editAccessUser;

window.saveAccessEditor =
  saveAccessEditor;

window.deleteAccessUser =
  deleteAccessUser;

window.showAccessEmptyState =
  showAccessEmptyState;