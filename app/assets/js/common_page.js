var { isDev, isVersion } = require("../../../env.js");

// eslint-disable-next-line no-unused-vars
var bytenode = require("bytenode");
var {
    getPackagesToWipe,
    getSettings,
    setSetting,
    decrypt,
    getStoredDrive,
    alertInfo,
    getInstalledPackages,
} = require("./utils.js" + (isDev ? "" : "c"));

// eslint-disable-next-line no-undef
var $ = $$;

/* eslint-disable no-undef */
window.onerror = function (error) {
    let fs = require("fs");
    fs.appendFileSync("error.log", error.toString());
    fs.appendFileSync("error.log", "\n");
};

// Load partial html
$("#menu").load("menu.html");
$("#header").load("header.html");
$("#menu li").removeClass("active");
$("#common-modal").load("modal.html");
// Collapse Menu
$(document).on("click", "#btn-collapse", () => {
    if ($(".navbar-primary").hasClass("collapsed")) {
        $(".navbar-primary").removeClass("collapsed");
    } else {
        $(".navbar-primary").addClass("collapsed");
        $("#submenu1").removeClass("show");
        $(".text-truncate").addClass("collapsed");
    }
});
// define listeners on modals
$(document).on("click", "#logout", () => {
    // let username = localStorage.getItem("username");
    // let password = localStorage.getItem("password");
    // localStorage.clear();
    // localStorage.setItem("username", username || "");
    // localStorage.setItem("password", password || "");
    require("electron").ipcRenderer.send("redirect", { file: "login.html" });
});
$(document).on("click", "#check-update", () => {
    require("electron").ipcRenderer.send("check-update");
});

$(document).ready(function () {
    const username = localStorage.getItem("username");
    $(".avartar").text(username.slice(0, 1).toUpperCase());

    $("#add-pagekage").click(() => {
        let p = getPackagesToWipe();
        $("#package-wipe-input").val(p.join("\n"));
        $("#packagesToWipeModal").modal({
            show: true,
        });
    });

    $("#license").click(() => {
        $("#licenseModal").modal("show");
    });

    $("#key_settings").click(() => {
        if ($(".navbar-primary").hasClass("collapsed")) {
            $(".navbar-primary").removeClass("collapsed");
        }
    });
    $(".input-group > label").on("click", function () {
        $(this).parent().find("input").focus();
    });
    $("input[type='text']").on("focusin", function () {
        if ($(this).parent().find("input").is("#choose-folder-input")) {
            return;
        }
        if ($(this).parent().find("input").is("#file-name")) {
            $(this).parent().find("label").addClass("active-label-backup");
        } else {
            $(this).parent().find("label").addClass("active-label");
        }
    });

    $("input[type='text']").on("focusout", function () {
        if ($(this).parent().find("input").is("#choose-folder-input")) {
            return;
        }
        if (!this.value) {
            if ($(this).parent().find("input").is("#file-name")) {
                $(this)
                    .parent()
                    .find("label")
                    .removeClass("active-label-backup");
            } else {
                $(this).parent().find("label").removeClass("active-label");
            }
        }
    });

    $("#configuration").click(async () => {
        let settings = await getSettings();
        let storedDrive = getStoredDrive();
        $("#check-ip-vysor").prop("checked", !!settings["check-ip-vysor"]);
        $("#fix-pad-fgo").prop("checked", !!settings["fix-pad-fgo"]);
        $("#choose-folder-input").val(storedDrive);

        // apps-list-conf
        $("#apps-list-conf").empty();
        let deviceRows = $(".device-row").toArray();
        if (deviceRows.length > 0) {
            let selectedDevice = deviceRows.find((x) =>
                x.getAttribute("class").includes("device-row-active")
            );
            if (!selectedDevice) selectedDevice = deviceRows[0];
            let serial = selectedDevice.getAttribute("serial");
            if (serial) {
                let app = localStorage.getItem("conf-backup-app") || "";
                let userApps = await getInstalledPackages(serial);
                $("#apps-list-conf").append(`<option value=''></option>`);
                userApps = userApps.filter((x) => x);
                userApps
                    .filter((x) => x)
                    .forEach((p) => {
                        p = p.trim();
                        $("#apps-list-conf").append(
                            `<option value='${p}'>${p}</option>`
                        );
                    });
                // if (!userApps.includes(app) && app) {
                //   $('#apps-list-conf').append(`<option value='${app}'>${app}</option>`)
                // }
                if (app) {
                    $("#apps-list-conf").val(app);
                }
            }
        } else {
            $("#apps-list-conf").append(
                `<option value=''>Chọn device để load Apps</option>`
            );
        }
        $("#clear-app-after-change").prop(
            "checked",
            localStorage.getItem("conf-clear-app-after-change") == "true"
        );
        $("#clear-mail-after-backup").prop(
            "checked",
            localStorage.getItem("conf-clear-mail-after-backup") == "true"
        );
        $("#backup-mail-and-app").prop(
            "checked",
            localStorage.getItem("conf-backup-mail-and-app") == "true"
        );
        $("#settings-modal").modal("show");
    });
    $(".tableFixHead").css({
        height: window.innerHeight - 210 + "px",
    });
    $(".app-content").css({
        height: window.innerHeight - 183 + "px",
    });
    $(".app-buttons").css({
        height: window.innerHeight - 275 - 210 + "px",
    });
    $(window).resize(function () {
        $(".tableFixHead").css({
            height: window.innerHeight - 210 + "px",
        });
        $(".app-content").css({
            height: window.innerHeight - 183 + "px",
        });
        $(".app-buttons").css({
            height: window.innerHeight - 275 - 210 + "px",
        });
    });
    window.innerHeight;
    setInterval(() => {
        $("input[type=text]").each(function () {
            const text_value = $(this).val();
            if (text_value) {
                if ($(this).parent().find("input").is("#file-name")) {
                    $(this)
                        .parent()
                        .find("label")
                        .addClass("active-label-backup");
                } else {
                    $(this).parent().find("label").addClass("active-label");
                }
            }
        });
    }, 100);
});

$(document).on("click", "#save-add-pacakge-btn", () => {
    $("#packagesToWipeModal").modal("toggle");
    let text = $("#package-wipe-input").val();
    localStorage.setItem(
        "packages",
        JSON.stringify(
            text
                .split("\n")
                .filter((x) => x)
                .map((x) => x.trim())
        )
    );
});

/**
 * Entry point
 */
(() => {
    // Listeners
    let { ipcRenderer } = require("electron");
    ipcRenderer.on("message", (event, text) => {
        let container = document.getElementById("updater");
        if (container) container.innerHTML = text;
    });

    // show app info
    $(".version-app").text(isVersion);
    $("#app-title").text("xProChanger v" + isVersion);
})();

$(document).on("click", "#save-settings-action", async (e) => {
    $(e.currentTarget).closest(".modal").modal("toggle");
    await setSetting("check-ip-vysor", $("#check-ip-vysor").is(":checked"));
    await setSetting("fix-pad-fgo", $("#fix-pad-fgo").is(":checked"));
    let rootFolder = $("#choose-folder-input").val();
    if (rootFolder) {
        if (rootFolder.includes(" ") || containsUTF8(rootFolder)) {
            return;
        }
        localStorage.setItem("stored-drive", rootFolder);
    }
    localStorage.setItem(
        "conf-clear-app-after-change",
        $("#clear-app-after-change").is(":checked")
    );
    localStorage.setItem(
        "conf-clear-mail-after-backup",
        $("#clear-mail-after-backup").is(":checked")
    );
    localStorage.setItem(
        "conf-backup-mail-and-app",
        $("#backup-mail-and-app").is(":checked")
    );
    localStorage.setItem("conf-backup-app", $("#apps-list-conf").val() || "");
});

$(document).on("click", "#key_menu", () => {
    let loginInfo = JSON.parse(localStorage.getItem("loginInfo"));
    let keyObjs = [];
    if (typeof loginInfo.keys == "string") {
        let iv = loginInfo.secretKey;
        keyObjs = JSON.parse(decrypt(loginInfo.keys, iv));
    } else {
        keyObjs = loginInfo.keys || [];
    }
    $("#key-list").empty();
    keyObjs.forEach((key) => {
        if (!key) return;
        let expiredColor = "color: red";
        let expiredTime = new Date(key.expiredTime._seconds * 1000);
        if (expiredTime == "Invalid Date") expiredTime = "";
        else {
            if (expiredTime > new Date()) expiredColor = "";
            let day = expiredTime.getDate().toString();
            let month = (expiredTime.getMonth() + 1).toString();
            expiredTime = `${day.padStart(2, "0")}-${month.padStart(
                2,
                "0"
            )} ${expiredTime
                .getHours()
                .toString()
                .padStart(2, "0")}:${expiredTime
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
        }
        $("#key-list").append(`<tr class="file-row">
      <td style="width: 60%">${key.key}</td>
      <td style="width: 40%; ${expiredColor}">${expiredTime}</td>
    </tr>`);
    });
    $("#keys-modal").modal("show");
});

function containsUTF8(text) {
    try {
        decodeURIComponent(escape(text));
        return false;
    } catch (e) {
        return true;
    }
}

$(document).on("click", "#choose-folder-btn", () => {
    let { ipcRenderer } = require("electron");
    ipcRenderer.send("show-folder");
    ipcRenderer.on("select-folder", async (event, folders) => {
        let isInvalid = !folders || folders.length == 0;
        if (isInvalid) return alertInfo("Vui lòng chọn folder");
        let rootFolder = folders[0];
        if (
            !rootFolder ||
            rootFolder.includes(" ") ||
            containsUTF8(rootFolder)
        ) {
            return alertInfo(
                "Thư mục không hợp lệ, không được chứa khoảng cách hoặc tiếng việt có dấu!"
            );
        }
        $("#choose-folder-input").val(rootFolder);
    });
});
