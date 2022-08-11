const fs = require("fs");
const { shell } = require("electron");
var { isDev } = require("../../../env.js");

const {
  runAdb,
  runShell,
  requestNewInfoNew,
  generateKey,
  addKey,
  sleep,
  getLoggedMail,
  getAllBackupPaths,
  cleanBeforeBackup,
  cleanAfterBackup,
  decrypt,
  encryptProp,
  alertError,
  mountSystemTwrp,
  changeProps,
  createBackupProp,
  getRootBackupDir,
  getRootRestoreDir,
  getSerials,
  wipeAll,
  clearAll,
  getDeviceInfo,
  getWinInfo,
  getInstalledPackages,
  getAllPackages,
  getExcludeRestores,
  showVysor,
  setWinName,
  getWinName,
  deleteWinName,
  setProxy,
  clearProxy,
  openDefaultBrowser,
  openChrome,
  getDesktopPath,
  getSingleSetting,
  backupFiles,
  alertInfo,
  getIpLine,
  getIpJson,
  fixMissingDebug,
  exist,
  getDeviceModel,
  waitBootCompleted,
  getRootBackupAppDir,
  getRootRestoreAppDir,
  getWinInfoPaths,
  getAppPaths,
  removeAppCache,
  getBackupAppFiles,
  fixPadProps,
  pickRandom,
  getListProxyRegMail,
} = require("./utils.js" + (isDev ? "" : "c"));
var path = require("path");
const {
  rebootRecovery,
  waitRecovery,
  reboot,
  waitDevice,
  getDeviceProxy,
  back,
} = require("./utils");

const simPropKeys = [
  "SimOperator",
  "SimOperatorName",
  "CountryCode",
  "SimSerial",
  "SubscriberId",
  "PhoneNumber",
];
let _devices = [];
let _listMailBackup = [];
let _listMailChangePass = [];
let _listMailTemp = [];
let _randomBrand = false;
// Global vars
// eslint-disable-next-line no-undef
var $ = $$;
// eslint-disable-next-line no-undef
var document = window.global.document;
// eslint-disable-next-line no-undef
var localStorage = window.global.localStorage;
var alert = alert;

var _backupFiles = [],
  _backupAppFiles = [];

// define action
const RANDOM_INFO = 1;
const WIPE = 2;
const WIPE_MAIL = 3;
const BACKUP = 4;
const RESTORE = 5;
const RESET_INFO = 6;
const RESET_FACTORY = 7;
// const CHANGE_NAME = 8;
// const SEND_TEXT = 9;
// const INSTALL_APK = 10;
const REBOOT = 11;
const OPEN_LINK = 12;
// const SCREEN_CAPTURE = 13;
const AUTO_ADD_MAIL = 14;
const AUTO_ADD_PTTT = 15;
const AUTO_BUY_EBOOK = 16;
const AUTO_ADD_PTTT_BUY_EBOOK = 17;
const AUTO_UNSS_BIGO = 18;
const BACKUP_APP = 19;
const RESTORE_APP = 20;
const AUTO_REG_GMAIL = 21;
const AUTO_BACKUP_GMAIL = 22;
const AUTO_CHANGE_PASS_GMAIL = 23;
// define status for action
// const STATUS_NOT_YET = 1;
const STATUS_PROCESSING = 2;
const STATUS_DONE = 3;
// define screen mode
const MODE_DEFAULT = 1;
const MODE_SINGLE = 2;
const MODE_MULTI = 3;

// other contants
const BACKUP_DIR = getRootBackupDir();
const RESTORE_DIR = getRootRestoreDir();
const EXCLUDE_RESTORE = getExcludeRestores();

// backup, restore app
const BACKUP_APP_DIR = getRootBackupAppDir();
const RESTORE_APP_DIR = getRootRestoreAppDir();

// Set menu tab active
setTimeout(() => {
  $("#changer_menu").addClass("active");
}, 1);

function getDeviceName(serial) {
  try {
    if (!serial) return "";
    let device = _devices.find((x) => x.serial == serial);
    if (!device) return "";
    let deviceName = device.oldInfo.win_name;
    if (!deviceName)
      deviceName = (device.newInfo || {}).model || (device.oldInfo || {}).model;
    return deviceName || "";
  } catch (err) {
    return "";
  }
}

function checkedAndEnableVipSession() {
  try {
    const loginInfo = JSON.parse(localStorage.getItem("loginInfo"));
    let enabledVip = !!loginInfo.isVip;
    if (enabledVip) {
      $(".vip-only").removeClass("hidden");
    }
  } catch (err) {
    // ignored
  }
}

$(async () => {
  showLoading();
  // checkedAndEnableVipSession();
  let deviceSerials = await getSerials();
  await Promise.all(
    deviceSerials.map(async (serial) => {
      return await addNewDevice(serial);
    })
  );
  initDataUi();
  loadDeviceInfo();
  reloadBackupList();
  reloadBackupAppList();
  hideLoading();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(5000);
    try {
      let serials = await getSerials();
      let oldSerials = _devices.map((x) => x.serial);
      let newSerials = serials.filter((s) => !oldSerials.includes(s));
      if (newSerials.length == 0) continue;
      for (let i = 0; i < newSerials.length; i++) {
        await addNewDevice(newSerials[i]);
        // disableInvalidDevice();
      }
    } catch {
      // ignored
    }
  }
});

async function addNewDevice(serial) {
  // check device exist
  if (_devices.find((d) => d.serial == serial)) return;
  let device = {
    serial: serial,
    key: generateKey(serial),
    oldInfo: await getDeviceInfo(serial),
    newInfo: {},
    checked: false,
  };
  _devices.push(device);
  let deviceName = device.oldInfo.win_name;
  if (!deviceName) {
    deviceName = (device.newInfo || {}).model || (device.oldInfo || {}).model;
  }
  // Add to UI
  $("#device-list")
    .append(`<tr class="device-row" serial="${device.serial}" key="${device.key}">
        <th scope="row" style="width: 8%">
            <input type="checkbox" class="checkbox-serial" serial="${device.serial}" key="${device.key}"/>
            <img class="loading-serial hidden" src="assets/images/loading_icon.gif" serial="${device.serial}"/>
        </th>
        <td class="w10 win-device-name" serial="${device.serial}">${deviceName}</td>
        <td class="w25">${device.key}</td>
        <th class="device-status" scope="col w35" serial="${device.serial}" key="${device.key}"></th>
        <td class="w25 actions">
            <a href="#" class="icon-bg bg-blue vysor-btn ignore-loading mg-l-5" data-toggle="tooltip" serial="${device.serial}" title="View Vysor">
                <span class="mdi mdi-eye"></span>
            </a>
            <a href="#" class="icon-bg bg-deep-gray screen-capt-btn hidden ignore-loading mg-l-5" data-toggle="tooltip" serial="${device.serial}" title="Screen Capt">
                <span class="mdi mdi-camera"></span>
            </a>
            <a href="#" class="icon-bg bg-gray wipe-packages-btn hidden" serial="${device.serial}" data-toggle="tooltip" title="Wipe Packages">
                <span class="mdi mdi-replay"></span>
            </a>
            <a href="#" class="icon-bg bg-green change-name-btn ignore-loading mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Change Name">
                <span class="mdi mdi-pencil"></span>
            </a>
            <a href="#" class="icon-bg bg-warning change-proxy-btn  hidden ignore-loading mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Set Proxy">
                <span class="mdi mdi-access-point"></span>
            </a>
            <a href="#" class="icon-bg bg-blue check-ip-action ignore-loading mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Check IP">
                <span class="mdi mdi-satellite-variant"></span>
            </a>
            <a href="#" class="icon-bg bg-green install-apk-btn ignore-loading mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Install Apk">
                <span class="mdi mdi-android"></span>
            </a>
            <a href="#" class="icon-bg bg-blue open-link-action hidden ignore-loading mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Open App">
                <span class="mdi mdi-google-chrome"></span>
            </a>
            <a href="#" class="icon-bg bg-orange reboot-btn hidden mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Reboot">
                <span class="mdi mdi-replay"></span>
            </a>
        </td>
    </tr>`);
  $("#summer-device").text(`${_devices.length}`);
  // Add key
  (async () => {
    for (let i = 0; i < 2; i++) {
      try {
        let model = (device.oldInfo || {}).model;
        if (
          model &&
          !["Mi A1", "Mi A2", "omni_herolte", "Xperia Z3"].includes(model)
        )
          model = undefined;
        await addKey(device.key, model);
        break;
      } catch (err) {
        // ignored
      }
    }
  })();
}

// async function removeDevice (serial) {
//     $(`tr[serial="${serial}"]`).empty();
//     _devices = _devices.filter(d => d.serial != serial);
// }

$(document).on("click", ".device-row", (e) => {
  let ele = e.currentTarget.getElementsByTagName("input")[0];
  const device = _devices.find((d) => d.serial === ele.getAttribute("serial"));
  let checked = !ele.checked;
  if (checked) {
    if (e.currentTarget.className.includes("device-row-invalid")) return;
    e.currentTarget.classList.add("device-row-active");
    Object.assign(device, { checked: true });
  } else {
    e.currentTarget.classList.remove("device-row-active");
    Object.assign(device, { checked: false });
  }
  ele.checked = checked;
  loadDeviceInfo();
});

function deboundClick(ele) {
  $(ele).addClass("disabled-link");
  setTimeout(() => {
    $(ele).removeClass("disabled-link");
  }, 1500);
}
async function wipePackages(serial) {
  if (!serial) {
    // show error
    return;
  }
  updateProcessStatusForDevice(serial, WIPE, STATUS_PROCESSING);
  beforeAction(serial);
  await wipeAll(serial);
  updateProcessStatusForDevice(serial, WIPE, STATUS_DONE);
  afterActionRemoveChecked(serial, false);
  loadDeviceInfo();
}

$(document).on("click", ".wipe-packages-btn", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  wipePackages(serial);
});

$(document).on("click", ".vysor-btn", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  deboundClick(e.currentTarget);
  let title = [getDeviceName(serial)];
  let checkIp = await getSingleSetting("check-ip-vysor");
  if (checkIp) {
    let ipJson = await getIpJson(serial);
    if (ipJson) {
      title.push(ipJson["countryCode"]);
      title.push(ipJson["query"]);
    }
  }
  showVysor(serial, title.filter((x) => x).join(" - "));
});

$(document).on("click", ".change-name-btn", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  $("#change-name-action").attr("serial", serial);
  $("#delete-name-action").attr("serial", serial);
  $("#change-name-modal").modal("show");
});

$(document).on("click", ".change-proxy-btn", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  $("#change-proxy-action").attr("serial", serial);
  $("#delete-proxy-action").attr("serial", serial);
  $("#change-proxy-modal").modal("show");
});

$(document).on("click", ".screen-capt-btn", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  $("#screen-capt-action").attr("serial", serial);
  $("#screen-capt-modal").modal("show");
});
function setUiDeviceName(serial, name) {
  if (!serial || !name) return;
  let ele = $(`.win-device-name[serial="${serial}"]`)[0];
  if (!ele) return;
  ele.innerText = name;
  _devices.find((x) => x.serial == serial).oldInfo.win_name = name;
}
function setUiProxyName(serial, proxy) {
  if (!serial || !proxy) return;
  let ele = $(`.win-proxy-name[serial="${serial}"]`)[0];
  if (!ele) return;
  ele.innerText = proxy;
}
$(document).on("keypress", "#change-name-input", (e) => {
  if (e.which == 13) {
    $("#change-name-action").click();
    return;
  }
});
$(document).on("keypress", "#change-name-input", (e) => {
  if (e.which == 13) {
    $("#delete-name-action").click();
    return;
  }
});
$(document).on("keypress", "#change-proxy-input", (e) => {
  if (e.which == 13) {
    $("#change-proxy-action").click();
    return;
  }
});
$(document).on("keypress", "#change-proxy-input", (e) => {
  if (e.which == 13) {
    $("#delete-proxy-action").click();
    return;
  }
});
$(document).on("keypress", "#screen-capt-input", (e) => {
  if (e.which == 13) {
    $("#screen-capt-action").click();
    return;
  }
});
$(document).on("click", "#change-name-action", async (e) => {
  $("#change-name-modal").modal("toggle");
  let serial = e.currentTarget.getAttribute("serial");
  let name = $("#change-name-input").val();
  if (!serial || !name) return;
  deboundClick($(`.change-name-btn[serial="${serial}"]`)[0]);
  await setWinName(serial, name);
  let currentName = await getWinName(serial);
  if (currentName) {
    setUiDeviceName(serial, name);
  }
});
$(document).on("click", "#delete-name-action", async (e) => {
  $("#change-name-modal").modal("toggle");
  let serial = e.currentTarget.getAttribute("serial");
  if (!serial) return;
  deboundClick($(`.change-name-btn[serial="${serial}"]`)[0]);
  await deleteWinName(serial);
  let currentName = await getDeviceModel(serial);
  if (currentName) {
    setUiDeviceName(serial, currentName);
  }
});
$(document).on("click", "#change-proxy-action", async (e) => {
  $("#change-proxy-modal").modal("toggle");
  let serial = e.currentTarget.getAttribute("serial");
  let proxy = $("#change-proxy-input").val();
  if (!serial || !proxy) return;
  deboundClick($(`.change-proxy-btn[serial="${serial}"]`)[0]);
  await setProxy(serial, proxy);
  let currentProxy = await getDeviceProxy(serial);
  if (currentProxy) {
    setUiProxyName(serial, proxy);
  }
});
$(document).on("click", "#delete-proxy-action", async (e) => {
  $("#change-proxy-modal").modal("toggle");
  let serial = e.currentTarget.getAttribute("serial");
  if (!serial) return;
  deboundClick($(`.change-proxy-btn[serial="${serial}"]`)[0]);
  await clearProxy(serial);
  let currentProxy = await getDeviceProxy(serial);
  if (!currentProxy) {
    setUiProxyName(serial, "No");
  }
});
$(document).on("click", "#screen-capt-action", async (e) => {
  $("#screen-capt-modal").modal("toggle");
  let serial = e.currentTarget.getAttribute("serial");
  let fileName = $("#screen-capt-input").val();
  if (!serial || !fileName) {
    if (!fileName) {
      alertError("Vui lòng nhập tên file!");
    }
    return;
  }
  let desktop = await getDesktopPath();
  let filePath = `${desktop}\\${fileName}.png`;
  deboundClick($(`.screen-capt-btn[serial="${serial}"]`)[0]);
  await runShell(`rm /sdcard/screencap.png`, serial);
  await runShell(`screencap -p /sdcard/screencap.png`, serial);
  await runAdb(`-s ${serial} pull /sdcard/screencap.png "${filePath}"`);
  await runShell(`rm /sdcard/screencap.png`, serial);
  shell.openItem(filePath);
});

// Install Apk Session
$(document).on("click", ".install-apk-btn", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  let { ipcRenderer } = require("electron");
  ipcRenderer.send("show-folder-apk");
  ipcRenderer.on("select-folder-apk", async (event, files) => {
    if (!files || files.length == 0) return;
    deboundClick(e.currentTarget);
    // updateProcessStatusForDevice(serial, INSTALL_APK, STATUS_PROCESSING);
    // beforeAction(serial);
    for (let i = 0; i < files.length; i++) {
      let path = files[i];
      await runAdb(`-s ${serial} install "${path}"`);
    }
    // afterAction(serial);
    // updateProcessStatusForDevice(serial, INSTALL_APK, STATUS_DONE);
    loadDeviceInfo();
  });
});

// Open Link Session
function addCustomLink(link) {
  if (!link) return;
  let links = localStorage.getItem("custom-links");
  if (!links) links = [];
  else links = JSON.parse(links);
  if (links.includes(link)) return;
  links.push(link);
  localStorage.setItem("custom-links", JSON.stringify(links));
}
function getCustomLinks() {
  let links = localStorage.getItem("custom-links");
  if (!links) {
    links = [
      "https://pay.google.com",
      "https://pay.google.com/gp/w/u/0/home/paymentmethods",
      "https://play.google.com/store/account/orderhistory",
    ];
    localStorage.setItem("custom-links", JSON.stringify(links));
  } else links = JSON.parse(links);
  return links;
}

$(document).on("click", ".check-ip-action", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  if (!serial) return;
  updateProcessStatusForDevice(serial, OPEN_LINK, STATUS_PROCESSING);
  beforeAction(serial);
  let ipResult = await getIpLine(serial);
  if (ipResult) alertInfo("Check Info", ipResult);
  else alertError("Proxy Died!");
  afterAction(serial);
  updateProcessStatusForDevice(serial, OPEN_LINK, STATUS_DONE);
  loadDeviceInfo();
});

$(document).on("click", ".open-link-action", async (e) => {
  e.stopPropagation();
  let serial = e.currentTarget.getAttribute("serial");
  $(".open-link-btn").attr("serial", serial);
  let cusLink = localStorage.getItem("custom-link-input");
  if (cusLink) $("#custom-link-input").val(cusLink);
  let links = getCustomLinks();
  if (links && links.length > 0) {
    $("#choose-links").empty();
    links.forEach((l) => {
      $("#choose-links").append(`<option>${l}</option>`);
    });
  }
  let cusWipe = localStorage.getItem("custom-wipe-input");
  $("#custom-wipe-input").val(cusWipe || "com.roblox.client");
  let packages = await getInstalledPackages(serial);
  $("#choose-packages").empty();
  packages.forEach((l) => {
    $("#choose-packages").append(`<option>${l}</option>`);
  });
  $("#open-link-modal").modal("show");
});
$(document).on("click", ".open-link-btn", async (e) => {
  $("#open-link-modal").modal("toggle");
  let serial = e.currentTarget.getAttribute("serial");
  if (!serial) return;
  let data = e.currentTarget.getAttribute("data");
  updateProcessStatusForDevice(serial, OPEN_LINK, STATUS_PROCESSING);
  beforeAction(serial);
  if (data == "ip") {
    await openDefaultBrowser(serial, "http://ip-api.com/line");
  } else if (data == "ip-api") {
    let ipResult = await getIpLine(serial);
    if (ipResult) alertInfo("Check Info", ipResult);
    else alertError("Proxy Died!");
  } else if (data == "chplay") {
    await runShell(`am start "com.android.vending"`, serial);
  } else if (data == "custom") {
    let cusValue = $("#custom-link-input").val();
    if (cusValue) {
      if (!cusValue.includes("http")) {
        cusValue = "https://" + cusValue;
      }
      localStorage.setItem("custom-link-input", cusValue);
      addCustomLink(cusValue);
      await openChrome(serial, cusValue);
    }
  } else if (data == "wipe") {
    let cusValue = $("#custom-wipe-input").val();
    if (cusValue) {
      localStorage.setItem("custom-wipe-input", cusValue);
      await runShell(`pm clear ${cusValue}`, serial);
    }
  }
  afterAction(serial);
  updateProcessStatusForDevice(serial, OPEN_LINK, STATUS_DONE);
  loadDeviceInfo();
});

function setAppLinkUi() {
  let appLink = localStorage.getItem("app-link-input");
  if (!appLink)
    appLink =
      "https://play.google.com/store/books/details/G_Wakeling_Inside_Evil?id=0jANBAAAQBAJ";
  if (appLink) {
    $("#app-link-input").val(appLink);
  }
}

function setGGServicesUi() {
  let type = localStorage.getItem("mail-gg-service-type");
  if (type) {
    $("#mail-gg-service-type").val(type);
  }
}

function setProxyUi() {
  let type = localStorage.getItem("mail-proxy-type");
  if (type) {
    $("#mail-proxy-type").val(type);
  }
  let typeDevice = localStorage.getItem("mail-device-type");
  if (typeDevice) {
    $("#mail-device-type").val(typeDevice);
  }
}

function setNumerMailUi() {
  let type = localStorage.getItem("number-account-mail");
  if (type) {
    $("#number-account-mail").val(type);
  }
}

function setListProxyUi() {
  let type = getListProxyRegMail();
  if (type) {
    $("#input-proxy-mail").val(type.join("\n"));
  }
}

function setSimUi() {
  let type = localStorage.getItem("mail-type-sim-action");
  if (type) {
    $("#mail-type-sim-action").val(type);
  }
}

function setCountryUi() {
  const network = JSON.parse(localStorage.getItem("networks_client"));
  network.forEach((n) => {
    $("#mail-country-action").append(
      `<option value=${n.code}>${n.code}</option>`
    );
  });
  let typeCountry = localStorage.getItem("mail-country-action");
  if (typeCountry) {
    $("#mail-country-action").val(typeCountry);
  }
}

function loadDeviceInfo() {
  let devices = getSelectedAvailDevices();
  let checked = devices.length;
  // $('.app-actions input').val('');
  if (checked == 1) {
    let device = devices[0];
    let info = device.oldInfo;
    if (Object.keys(device.newInfo).length > 0) {
      info = device.newInfo;
    }
    let country, operator;
    if (!info["manufacturer"]) info["manufacturer"] = info["brand"];
    for (const k in info) {
      // if (['sdk', 'release'].includes(k)) continue;
      let v = info[k];
      if (!v) continue;
      v = String(v).replace("\n", "").trim();
      if (k == "CountryCode") country = v;
      else if (k == "SimOperator") {
        operator = v;
        $(`#${k}`).val(v);
      } else if (k == "sdk") $("#sdk").val(v);
      else if (k == "manufacturer") {
        if ($("#man-action").val() == "Random") continue;
        if (v == "lge") v = v.toUpperCase();
        $("#man-action").val(v);
      } else $(`#${k}`).val(v);
    }
    if (country) {
      let oldCountry = $("#country-action").val();
      if (oldCountry != country) {
        $("#country-action").val(country);
        onCountryChange(country);
        if (!isNaN(operator)) {
          $("#operator-name-action").val(operator);
        } else if (operator.startsWith("310016")) {
          $("#operator-name-action").val("310016");
        }
      }
      $("#SimOperator").val(operator);
    }
  }

  updateUiWithMode();
  // disableInvalidDevice();
}

async function reloadBackupList() {
  _backupFiles = await backupFiles();
  let preSelectedPath = $("#backup-list").val();
  $("#backup-list").empty();
  _backupFiles.unshift({ path: "", name: "" });
  _backupFiles.forEach((f) => {
    $("#backup-list").append(
      `<option style="font-size: 12px" value="${f.path}">${f.name}</option>`
    );
  });
  if (preSelectedPath) $("#backup-list").val(preSelectedPath);
}

async function reloadBackupAppList() {
  _backupAppFiles = await getBackupAppFiles();
  let preSelectedPath = $("#backup-app-list").val();
  $("#backup-app-list").empty();
  _backupAppFiles.unshift({ path: "", name: "" });
  _backupAppFiles.forEach((f) => {
    $("#backup-app-list").append(
      `<option style="font-size: 12px" value="${f.path}">${f.name}</option>`
    );
  });
  if (preSelectedPath) $("#backup-app-list").val(preSelectedPath);
}

async function updateStatus(serial, status) {
  if (!serial || !status) return;
  let device = _devices.find((x) => x.serial == serial);
  if (!device) return;
  let ele = $(`.device-status[serial='${serial}']`)[0];
  ele.textContent = status;
}

// Table check all row
$("#selectAll").click(function (e) {
  var table = $(e.target).closest("table");
  $("th input:checkbox", table).prop("checked", this.checked);
  $.each($(".device-row"), (i, ele) => {
    const device = _devices.find(
      (d) => d.serial === ele.getAttribute("serial")
    );
    let checked = !ele.checked;
    if (checked) {
      if (ele.className.includes("device-row-invalid")) return;
      ele.classList.add("device-row-active");
      Object.assign(device, { checked: true });
    } else {
      ele.classList.remove("device-row-active");
      Object.assign(device, { checked: false });
    }
    ele.checked = checked;
  });
  loadDeviceInfo();
});

function getSelectedAvailDevices() {
  let serials = [];
  $.each($(".device-row-active"), (i, v) => {
    if ($(v).hasClass("device-row-processing")) return;
    serials.push(v.getAttribute("serial"));
  });
  return _devices.filter((d) => serials.includes(d.serial));
}

/**
 * Chức năng random info
 * - Request info từ api
 * - Gán vào newInfo của device trong mảng devices
 * - Load lên giao diện info mới
 */
$("#random-info-btn").click(async () => {
  let devices = getSelectedAvailDevices(RANDOM_INFO);
  if (devices.length != 1) return;
  let device = devices[0];
  let serial = device.serial;
  await randomInfo(serial);
  loadDeviceInfo();
});

async function getRandomCarrier(countrySelected) {
  const network = JSON.parse(localStorage.getItem("networks_client"));
  const country = network.find((n) => n.code === countrySelected);
  const operators = (country || {}).operators || [];
  let items = [];
  operators.forEach((o) => {
    items.push(o.code);
  });
  var item = pickRandom(items);
  return item;
}

async function randomInfo(serial, onlySim = false) {
  try {
    let devices = getSelectedAvailDevices();
    if (devices.length != 1) return;
    let device = devices[0];
    serial = device.serial;
    updateProcessStatusForDevice(serial, RANDOM_INFO, STATUS_PROCESSING);
    beforeAction(serial);
    let brand = $("#man-action").val();
    if (_randomBrand) brand = "";
    let country = $("#country-action").val();
    let operator = $("#operator-name-action").val();
    let sdk = $("#sdk").val() || "29";
    let info = await requestNewInfoNew(
      device.key,
      [
        "country=" + country,
        "brand=" + brand,
        "operator=" + operator,
        "sdk=" + sdk,
        "serial=" + serial,
      ].join("&")
    );
    if (!info) return;
    if (!onlySim) {
      device.newInfo = info["fullInfo"];
    } else {
      let fullInfo = info["fullInfo"];
      for (const k in fullInfo) {
        let v = fullInfo[k];
        if (!simPropKeys.includes(k)) continue;
        device.newInfo[k] = v;
      }
    }
    device.props = info["props"];
  } catch (err) {
    console.log(err);
  } finally {
    updateProcessStatusForDevice(serial, RANDOM_INFO, STATUS_DONE);
    afterActionRemoveChecked(serial, false);
  }
}

$("#random-sim-info-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) return;
  let device = devices[0];
  let serial = device.serial;
  await randomInfo(serial, true);
  loadDeviceInfo();
});

$("#save-info-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) return;
  let device = devices[0];
  let serial = device.serial;
  await saveInfo(serial);
  loadDeviceInfo();
});

$("#save-sim-info-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) return;
  let device = devices[0];
  let serial = device.serial;
  await saveInfo(serial, true);
  loadDeviceInfo();
});

$("#random-info-all-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length == 0) {
    return;
  }
  await Promise.all(
    devices.map((x) => {
      return randomInfo(x.serial);
    })
  );
});

$("#save-info-all-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length == 0) {
    return;
  }
  await Promise.all(
    devices.map((x) => {
      return saveInfo(x.serial);
    })
  );
  loadDeviceInfo();
});

$("#random-sim-info-all-btn").click(async () => {
  let devices = getSelectedAvailDevices(RANDOM_INFO);
  if (devices.length == 0) {
    return;
  }
  await Promise.all(
    devices.map((x) => {
      return randomInfo(x.serial, true);
    })
  );
  loadDeviceInfo();
});

$("#save-sim-info-all-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length == 0) {
    return;
  }
  await Promise.all(
    devices.map((x) => {
      return saveInfo(x.serial, true);
    })
  );
});

$("#wipe-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) return;
  let device = devices[0];
  let serial = device.serial;
  updateProcessStatusForDevice(serial, WIPE, STATUS_PROCESSING);
  beforeAction(serial);
  await wipeAll(serial);
  updateProcessStatusForDevice(serial, WIPE, STATUS_DONE);
  afterActionRemoveChecked(serial, false);
  loadDeviceInfo();
});

$("#wipe-mail-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) return;
  let device = devices[0];
  let serial = device.serial;
  let allPack = await getAllPackages(serial);
  updateProcessStatusForDevice(serial, WIPE_MAIL, STATUS_PROCESSING);
  beforeAction(serial);
  await wipeAll(serial);
  updateStatus(serial, "Reboot Recovery");
  await runAdb(`-s ${serial} reboot recovery`);
  updateStatus(serial, "Wait Recovery");
  await runAdb(`-s ${serial} wait-for-recovery`);

  await mountSystemTwrp(serial);

  // Clear
  updateStatus(serial, "Cleanup...");
  await clearAll(allPack, serial);
  // Reboot
  updateStatus(serial, "Reboot...");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  updateStatus(serial, "Change Done!");
  updateProcessStatusForDevice(serial, WIPE_MAIL, STATUS_DONE);
  afterAction(serial);
  loadDeviceInfo();
});

const IGNORED_PROPS = [
  "brand",
  "model",
  "release_deep",
  "sdk_deep",
  "incremental",
  "BuildDate",
  "DateUTC",
  "id",
  "btype",
  "btags",
  "fingerprint",
  "serial",
  "displayId",
  "board",
  "BOOTLOADER",
  "BaseBand",
  "platform",
  "hardware",
  "security_patch",
  "description",
  "host",
  "device",
  "name",
  "wifiMac",
];

function remakeProp(k, v) {
  if (IGNORED_PROPS.includes(k)) return v;
  return encryptProp(v);
}
/**
 * Chức năng save info
 * - Kiểm tra device có object newInfo (không phải object rỗng) mới enable
 * - Tạo các file vào android
 * adb shell "echo "{value}" > /data/local/tmp/device_info/{key}"
 * adb shell "su -c '/data/local/tmp/change.sh'"
 * call function clearAll(), wipe() đế xóa hết tàn tich dữ liệu cũ
 * adb reboot
 */

async function saveInfo(serial, onlySim = false) {
  // Check serial
  if (!serial) return;
  let device = _devices.find((x) => x.serial == serial);
  if (!device) {
    // Thống báo lỗi, không tìm thấy thiết bị này
    return;
  }
  // Info lấy được từ api
  let newInfo = device.newInfo;
  if (Object.keys(newInfo).length == 0) {
    // Không có info nào cả
    alertError("Info không thay đổi!");
    return;
  }
  // assign to prechange info
  newInfo = Object.assign(newInfo, getUiInfo());
  let allPack = await getAllPackages(serial);
  updateProcessStatusForDevice(serial, RANDOM_INFO, STATUS_PROCESSING);
  beforeAction(serial);

  updateStatus(serial, "Wiping...");
  await wipeAll(serial);

  updateStatus(serial, "Boot Recovery");
  await runAdb(`-s ${serial} reboot recovery`);
  updateStatus(serial, "Wait Recovery");
  await runAdb(`-s ${serial} wait-for-recovery`);

  // Mount system
  await mountSystemTwrp(serial);

  if (onlySim) {
    // Remove only Sim Info
    let simPropS7Paths = simPropKeys.map((x) => `/system/vendor/Utils/${x}`);
    let simPropA1Paths = simPropKeys.map(
      (x) => `/system/system/vendor/Utils/${x}`
    );
    let simPropS9Paths = simPropKeys.map((x) => `/system/etc/Utils/${x}`);
    let simPropA2Paths = simPropKeys.map(
      (x) => `/system/system/etc/Utils/${x}`
    );
    await runShell(
      `rm -rf ${[
        ...simPropS7Paths,
        ...simPropS9Paths,
        ...simPropA1Paths,
        ...simPropA2Paths,
      ].join(" ")}`,
      serial
    );
  } else {
    // Remove all old info
    await runShell(
      "rm -rf /system/vendor/Utils /system/system/vendor/Utils /system/etc/Utils /system/system/etc/Utils",
      serial
    );
  }

  updateStatus(serial, "Change...");

  // Create folder if not exist
  let infoFolderS7 = "/system/system/vendor/Utils";
  let infoFolderS9 = "/system/vendor/Utils";
  let infoFolderA1 = "/system/system/etc/Utils";
  let infoFolderA2 = "/system/etc/Utils";

  await runShell(`mkdir ${infoFolderS7}`, serial);
  await runShell(`mkdir ${infoFolderS9}`, serial);
  await runShell(`mkdir ${infoFolderA1}`, serial);
  await runShell(`mkdir ${infoFolderA2}`, serial);

  let cmdS7 = [];
  let cmdS9 = [];
  let cmdA1 = [];
  let cmdA2 = [];
  for (const k in newInfo) {
    let v = newInfo[k];
    if (onlySim && !simPropKeys.includes(k)) continue;
    v = remakeProp(k, v);
    cmdS7.push(`echo '${v}' > ${infoFolderS7}/${k}`);
    cmdS9.push(`echo '${v}' > ${infoFolderS9}/${k}`);
    cmdA1.push(`echo '${v}' > ${infoFolderA1}/${k}`);
    cmdA2.push(`echo '${v}' > ${infoFolderA2}/${k}`);
  }
  await runShell(`"${cmdS7.join(" && ")}"`, serial);
  await runShell(`"${cmdS9.join(" && ")}"`, serial);
  await runShell(`"${cmdA1.join(" && ")}"`, serial);
  await runShell(`"${cmdA2.join(" && ")}"`, serial);

  if (!onlySim) {
    // Change props
    await changeProps(device.props, serial);
    // Clear
    updateStatus(serial, "Cleanup...");
    await clearAll(allPack, serial);
  }
  // Clear App
  await clearApp(serial);
  // Reboot
  updateStatus(serial, "Changed, reboot...");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  updateStatus(serial, "Change Done!");
  updateProcessStatusForDevice(serial, RANDOM_INFO, STATUS_DONE);
  afterAction(serial);
}

function getBackupRootDir() {
  let dir = localStorage.getItem("backup_root_dir") || BACKUP_DIR;
  if (fs.existsSync(dir)) return dir;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getSubFolderBackup() {
  let path = BACKUP_DIR;
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path + "/" + file).isDirectory();
  });
}

$("#backup-btn").click(async () => {
  showChooseBackupDir();
});
$("#backup-change-btn").click(async () => {
  showChooseBackupDir(true);
});
function showChooseBackupDir(change = false) {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) {
    // show error
    return;
  }
  let device = devices[0];
  let serial = device.serial;
  if (!serial) return;
  let prevBackupDir = localStorage.getItem("prevBackupDir");
  $("#choose-dir-input").val(prevBackupDir || "/");
  // $('#choose-dir-input').attr('disabled', true)
  getBackupRootDir();
  let dirs = getSubFolderBackup();
  dirs.unshift("/");
  $("#choose-dir-select").empty();
  dirs.forEach((d) => {
    $("#choose-dir-select").append(`<option value="${d}">${d}</option>`);
  });
  $("#choose-dir-btn").attr("serial", serial);
  $("#choose-dir-btn").attr("backup-type", change ? "backup-change" : "backup");
  $("#choose-dir-modal").modal("show");
}
$(document).on("click", "#choose-dir-btn", async (e) => {
  $("#choose-dir-modal").modal("toggle");
  let subDir = $("#choose-dir-input").val();
  let serial = e.currentTarget.getAttribute("serial");
  let backupType = e.currentTarget.getAttribute("backup-type");
  let path = `${BACKUP_DIR}/${subDir}`;
  localStorage.setItem("prevBackupDir", subDir);
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
  await backup(serial, { dir: path, change: backupType == "backup-change" });
  loadDeviceInfo();
});

$("#restore-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) {
    // show error
    return;
  }
  let device = devices[0];
  let filePath = $("#backup-list").val();
  if (!filePath) {
    alertError("Vuil lòng chọn mail để restore!");
    return;
  }
  if (!fs.existsSync(`${filePath}`)) {
    alertError("File restore không tồn tại!");
    return;
  }
  await restore(device.serial, filePath);
  loadDeviceInfo();
});
$("#backup-restore-btn").click(async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) {
    // show error
    return;
  }
  let device = devices[0];
  let filePath = $("#backup-list").val();
  if (!filePath) {
    alertError("Vuil lòng chọn mail để restore!");
    return;
  }
  if (!fs.existsSync(`${filePath}`)) {
    alertError("File restore không tồn tại!");
    return;
  }
  let options = { filePath, dir: BACKUP_DIR };
  await backupAndRestore(device.serial, options);
  loadDeviceInfo();
});
function genFileNameTime() {
  let time = new Date();
  return [
    time.getDate(),
    time.getMonth() + 1,
    time.getFullYear(),
    "_",
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
  ]
    .map((x) => String(x))
    .map((x) => (x.length == 1 && x != "_" ? `0${x}` : x))
    .join("");
}

function getUiInfo() {
  let uiInfo = {};
  let inputs = $(".app-inputs").find("input");
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    let k = input.id;
    let v = input.value;
    if (!v) continue;
    uiInfo[k] = v;
  }
  uiInfo["CountryCode"] = $("#country-action :selected").text();
  uiInfo["SimOperator"] = $("#SimOperator").val();
  // uiInfo['SimOperator'] = $("#operator-name-action :selected").val();
  uiInfo["SimOperatorName"] = $("#operator-name-action :selected").text();
  uiInfo["sdk"] = $("#sdk :selected").val();
  uiInfo["release"] = $("#sdk :selected").text();
  uiInfo["manufacturer"] = $("#man-action :selected").text();
  if (uiInfo["manufacturer"] == "Random") {
    delete uiInfo["manufacturer"];
  }
  return uiInfo;
}
async function fixDebugS7(serial) {
  let isS7 = !(await exist("/system/system/vendor", serial));
  if (!isS7) return;
  await fixMissingDebug(serial);
}
async function backup(serial, options) {
  let { dir, change } = options;
  dir = dir || BACKUP_DIR;
  // Check serial
  if (!serial) return;
  let device = _devices.find((x) => x.serial == serial);
  if (!device) {
    // Thống báo lỗi, không tìm thấy thiết bị này
    return;
  }
  // Always get new info
  let newInfo = {};
  let props;
  if (change) {
    // Chưa có info thì request từ api
    let needRequestInfo =
      !device.newInfo || Object.keys(device.newInfo).length == 0;
    if (needRequestInfo) {
      let brand = $("#man-action").val();
      if (_randomBrand) brand = "";
      let country = $("#country-action").val();
      let operator = $("#operator-name-action").val();
      let sdk = $("#sdk").val() || "29";
      let info = await requestNewInfoNew(
        device.key,
        [
          "country=" + country,
          "brand=" + brand,
          "operator=" + operator,
          "sdk=" + sdk,
          "serial=" + serial,
        ].join("&")
      );
      let uiInfo = getUiInfo();
      // Nếu edit phone trên ui thì cập nhật vào
      ["PhoneNumber", "SimOperator", "SubscriberId"].forEach((k) => {
        let uiValue = uiInfo[k];
        if (!uiValue) return;
        if (device.oldInfo[k] == uiValue || device.newInfo[k] == uiValue)
          return;
        info["fullInfo"][k] = uiValue;
      });
      newInfo = info["fullInfo"];
      props = info["props"];
    } else {
      newInfo = Object.assign(device.newInfo, getUiInfo());
      props = device.props;
    }
    device.newInfo = {};
  }
  let timeFormat = genFileNameTime();
  let allPack = await getAllPackages(serial);
  updateProcessStatusForDevice(serial, BACKUP, STATUS_PROCESSING);
  beforeAction(serial);

  updateStatus(serial, "Boot Recovery");
  await runAdb(`-s ${serial} reboot recovery`);
  updateStatus(serial, "Wait Recovery");
  await runAdb(`-s ${serial} wait-for-recovery`);

  // Mount system
  await mountSystemTwrp(serial);

  await createBackupProp(serial);

  let mail = await getLoggedMail(serial);
  if (mail) {
    let fileName = `${mail || ""}_${timeFormat}.wbk`;
    let guestPath = `/data/backup/${fileName}`;

    await cleanBeforeBackup(serial);

    // Check folder exist on host and guest
    await runShell("mkdir /data/backup", serial);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let paths = await getAllBackupPaths(serial);
    updateStatus(serial, "Backup...");
    await runShell(`tar -zcvf ${guestPath} ${paths.join(" ")}`, serial);
    await runAdb(`-s ${serial} pull "${guestPath}" "${dir}"`);
    await runShell(`rm -rf ${guestPath}`, serial);

    await cleanAfterBackup();
  }
  let needChange = change && Object.keys(newInfo).length > 0;
  if (needChange) {
    updateStatus(serial, "Change...");
    // Remove all old info
    await runShell(
      "rm -rf /system/vendor/Utils /system/system/vendor/Utils /system/etc/Utils /system/system/etc/Utils",
      serial
    );

    // Create folder if not exist
    let infoFolderS7 = "/system/system/vendor/Utils";
    let infoFolderS9 = "/system/vendor/Utils";
    let infoFolderA1 = "/system/system/etc/Utils";
    let infoFolderA2 = "/system/etc/Utils";

    await runShell(`mkdir ${infoFolderS7}`, serial);
    await runShell(`mkdir ${infoFolderS9}`, serial);
    await runShell(`mkdir ${infoFolderA1}`, serial);
    await runShell(`mkdir ${infoFolderA2}`, serial);

    let cmdS7 = [];
    let cmdS9 = [];
    let cmdA1 = [];
    let cmdA2 = [];
    for (const k in newInfo) {
      let v = newInfo[k];
      v = remakeProp(k, v);
      cmdS7.push(`echo '${v}' > ${infoFolderS7}/${k}`);
      cmdS9.push(`echo '${v}' > ${infoFolderS9}/${k}`);
      cmdA1.push(`echo '${v}' > ${infoFolderA1}/${k}`);
      cmdA2.push(`echo '${v}' > ${infoFolderA2}/${k}`);
    }

    await runShell(`"${cmdS7.join(" && ")}"`, serial);
    await runShell(`"${cmdS9.join(" && ")}"`, serial);
    await runShell(`"${cmdA1.join(" && ")}"`, serial);
    await runShell(`"${cmdA2.join(" && ")}"`, serial);

    await changeProps(props, serial);
    // Clear app
    await clearApp(serial);
  }

  updateStatus(serial, "Wipe Mail...");
  await sleep(7000);
  await clearAll(allPack, serial);

  // Reboot
  updateStatus(serial, "Reboot...");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  await waitBootCompleted(serial);
  await wipeAll(serial);
  updateStatus(serial, "Backup Done!");
  device.oldInfo = await getWinInfo(serial);
  // Load model, manufacturer from build prop
  if (!device.oldInfo["model"]) {
    device.oldInfo["model"] = await getDeviceModel(serial);
  }
  if (!device.oldInfo["manufacturer"]) {
    device.oldInfo["manufacturer"] = (
      await runShell("getprop ro.product.manufacturer", serial)
    ).stdout;
  }
  afterAction(serial);
  updateProcessStatusForDevice(serial, BACKUP, STATUS_DONE);
  reloadBackupList();
  loadDeviceInfo();
}

async function backupMailChangeDevice(serial, typeSim, options) {
  let result = false;
  let { dir, change } = options;
  dir = dir || BACKUP_DIR;
  // Check serial
  if (!serial) return result;
  let device = _devices.find((x) => x.serial == serial);
  if (!device) {
    // Thống báo lỗi, không tìm thấy thiết bị này
    return result;
  }
  // Always get new info
  let newInfo = {};
  let props;
  if (change) {
    var country = "VN";
    var brand = "Random";
    let info = await requestNewInfoNew(
      device.key,
      [
        "country=" + country,
        "brand=" + brand,
        "operator=" + typeSim,
        "serial=" + serial,
      ].join("&")
    );
    if (!info) return result;
    newInfo = info["fullInfo"];
    props = info["props"];
    device.newInfo = {};
  }
  let timeFormat = genFileNameTime();
  let allPack = await getAllPackages(serial);
  updateProcessStatusForDevice(serial, BACKUP, STATUS_PROCESSING);
  beforeAction(serial);

  updateStatus(serial, "Boot Recovery");
  await runAdb(`-s ${serial} reboot recovery`);
  updateStatus(serial, "Wait Recovery");
  await runAdb(`-s ${serial} wait-for-recovery`);

  // Mount system
  await mountSystemTwrp(serial);

  await createBackupProp(serial);

  let mail = await getLoggedMail(serial);
  if (mail) {
    let fileName = `${mail || ""}_${timeFormat}.wbk`;
    let guestPath = `/data/backup/${fileName}`;

    await cleanBeforeBackup(serial);

    // Check folder exist on host and guest
    await runShell("mkdir /data/backup", serial);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let paths = await getAllBackupPaths(serial);
    updateStatus(serial, "Backup...");
    await runShell(`tar -zcvf ${guestPath} ${paths.join(" ")}`, serial);
    await runAdb(`-s ${serial} pull "${guestPath}" "${dir}"`);
    await runShell(`rm -rf ${guestPath}`, serial);

    await cleanAfterBackup();
  }
  let needChange = change && Object.keys(newInfo).length > 0;
  if (needChange) {
    updateStatus(serial, "Change...");
    // Remove all old info
    await runShell(
      "rm -rf /system/vendor/Utils /system/system/vendor/Utils /system/etc/Utils /system/system/etc/Utils",
      serial
    );

    // Create folder if not exist
    let infoFolderS7 = "/system/system/vendor/Utils";
    let infoFolderS9 = "/system/vendor/Utils";
    let infoFolderA1 = "/system/system/etc/Utils";
    let infoFolderA2 = "/system/etc/Utils";

    await runShell(`mkdir ${infoFolderS7}`, serial);
    await runShell(`mkdir ${infoFolderS9}`, serial);
    await runShell(`mkdir ${infoFolderA1}`, serial);
    await runShell(`mkdir ${infoFolderA2}`, serial);

    let cmdS7 = [];
    let cmdS9 = [];
    let cmdA1 = [];
    let cmdA2 = [];
    for (const k in newInfo) {
      let v = newInfo[k];
      v = remakeProp(k, v);
      cmdS7.push(`echo '${v}' > ${infoFolderS7}/${k}`);
      cmdS9.push(`echo '${v}' > ${infoFolderS9}/${k}`);
      cmdA1.push(`echo '${v}' > ${infoFolderA1}/${k}`);
      cmdA2.push(`echo '${v}' > ${infoFolderA2}/${k}`);
    }

    await runShell(`"${cmdS7.join(" && ")}"`, serial);
    await runShell(`"${cmdS9.join(" && ")}"`, serial);
    await runShell(`"${cmdA1.join(" && ")}"`, serial);
    await runShell(`"${cmdA2.join(" && ")}"`, serial);

    await changeProps(props, serial);
    // Clear app
    await clearApp(serial);
  }

  updateStatus(serial, "Wipe Mail...");
  await sleep(7000);
  await clearAll(allPack, serial);

  // Reboot
  updateStatus(serial, "Reboot...");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  await waitBootCompleted(serial);
  await wipeAll(serial);
  updateStatus(serial, "Backup Done!");
  device.oldInfo = await getWinInfo(serial);
  // Load model, manufacturer from build prop
  if (!device.oldInfo["model"]) {
    device.oldInfo["model"] = await getDeviceModel(serial);
  }
  if (!device.oldInfo["manufacturer"]) {
    device.oldInfo["manufacturer"] = (
      await runShell("getprop ro.product.manufacturer", serial)
    ).stdout;
  }
  afterAction(serial);
  updateProcessStatusForDevice(serial, BACKUP, STATUS_DONE);
  reloadBackupList();
  loadDeviceInfo();
  return result;
}

async function backupAndRestore(serial, options) {
  let { dir, filePath } = options;
  dir = dir || BACKUP_DIR;
  // Check serial
  if (!serial) return;
  let device = _devices.find((x) => x.serial == serial);
  if (!device) {
    // Thống báo lỗi, không tìm thấy thiết bị này
    return;
  }

  let fileName = path.basename(filePath);
  let nameOnly = fileName.split("_")[0] || "";

  function showStatus(s) {
    updateStatus(serial, `${nameOnly}: ${s}`);
  }

  let timeFormat = genFileNameTime();
  let allPack = await getAllPackages(serial);
  updateProcessStatusForDevice(serial, BACKUP, STATUS_PROCESSING);
  beforeAction(serial);

  showStatus("Boot Recovery");
  await runAdb(`-s ${serial} reboot recovery`);
  showStatus("Wait Recovery");
  await runAdb(`-s ${serial} wait-for-recovery`);

  // Mount system
  await mountSystemTwrp(serial);

  await createBackupProp(serial);

  let mail = await getLoggedMail(serial);
  if (mail) {
    let fileName = `${mail || ""}_${timeFormat}.wbk`;
    let guestPath = `/data/backup/${fileName}`;

    await cleanBeforeBackup(serial);

    // Check folder exist on host and guest
    await runShell("mkdir /data/backup", serial);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let paths = await getAllBackupPaths(serial);
    showStatus("Backup-" + mail);
    await runShell(`tar -zcvf ${guestPath} ${paths.join(" ")}`, serial);
    await runAdb(`-s ${serial} pull "${guestPath}" "${dir}"`);
    await runShell(`rm -rf ${guestPath}`, serial);

    await cleanAfterBackup();
  }

  showStatus("Wipe Mail");
  await sleep(7000);
  await clearAll(allPack, serial);

  showStatus("Restore");
  await runShell("mkdir /data/backup", serial);
  await runAdb(`-s ${serial} push "${filePath}" /data/backup/`);
  await runShell(
    `tar -xf /data/backup/${fileName} ${EXCLUDE_RESTORE} -C /`,
    serial
  );

  let fixDetectDebug = await getSingleSetting("fix-pad-fgo");
  if (fixDetectDebug) {
    showStatus("Fix Debug");
    await fixPadProps(serial);
    await fixMissingDebug(serial);
  }

  // Reboot
  showStatus("Reboot");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  showStatus("Backup Done!");
  await wipeAll(serial);
  device.oldInfo = await getWinInfo(serial);
  // Load model, manufacturer from build prop
  if (!device.oldInfo["model"]) {
    device.oldInfo["model"] = await getDeviceModel(serial);
  }
  if (!device.oldInfo["manufacturer"]) {
    device.oldInfo["manufacturer"] = (
      await runShell("getprop ro.product.manufacturer", serial)
    ).stdout;
  }
  afterAction(serial);
  updateProcessStatusForDevice(serial, BACKUP, STATUS_DONE);
  reloadBackupList();
}

async function restore(serial, filePath) {
  // Check serial
  if (!serial || !filePath) {
    return;
  }
  let fileName = path.basename(filePath);
  let device = _devices.find((x) => x.serial == serial);
  if (!device) {
    // Thống báo lỗi, không tìm thấy thiết bị này
    return;
  }
  let nameOnly = fileName.split("_")[0] || "";
  let allPack = await getAllPackages(serial);
  function showStatus(s) {
    updateStatus(serial, `${nameOnly}: ${s}`);
  }

  updateProcessStatusForDevice(serial, RESTORE, STATUS_PROCESSING);
  beforeAction(serial);

  showStatus("Wiping");
  await wipeAll(serial);

  showStatus("Boot Recovery");
  await runAdb(`-s ${serial} reboot recovery`);
  showStatus("Wait Recovery");
  await runAdb(`-s ${serial} wait-for-recovery`);

  // Mount system
  await mountSystemTwrp(serial);

  await createBackupProp(serial);

  showStatus("Cleanup");
  await clearAll(allPack, serial);

  showStatus("Restore");
  await runShell("mkdir /data/backup", serial);

  await runAdb(`-s ${serial} push "${filePath}" /data/backup/`);

  await runShell(
    `tar -xf /data/backup/${fileName} ${EXCLUDE_RESTORE} -C /`,
    serial
  );
  let fixDetectDebug = await getSingleSetting("fix-pad-fgo");
  if (fixDetectDebug) {
    showStatus("Fix Debug");
    await fixPadProps(serial);
    await fixMissingDebug(serial);
  }

  // Reboot
  showStatus("Reboot");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  showStatus("Restore Done!");
  device.oldInfo = await getWinInfo(serial);
  if (!device.oldInfo["model"]) {
    device.oldInfo["model"] = await getDeviceModel(serial);
  }
  if (!device.oldInfo["manufacturer"]) {
    device.oldInfo["manufacturer"] = (
      await runShell("getprop ro.product.manufacturer", serial)
    ).stdout;
  }
  afterAction(serial);
  updateProcessStatusForDevice(serial, RESTORE, STATUS_DONE);
  reloadBackupList();
}

function disableInvalidDevice() {
  const loginInfo = JSON.parse(localStorage.getItem("loginInfo"));
  let keyObjs = [];
  if (typeof loginInfo.keys == "string") {
    let iv = loginInfo.secretKey;
    keyObjs = JSON.parse(decrypt(loginInfo.keys, iv));
  } else {
    keyObjs = loginInfo.keys || [];
  }
  const curDate = new Date();
  // const oneDay = 24*60*60;
  const oneDay = 0;
  $(".device-row").each(function () {
    const rowKey = this.getAttribute("key");
    const validDevice = keyObjs.find((o) => o.key === rowKey);
    let isValid = false;
    if (validDevice) {
      isValid =
        new Date((validDevice.expiredTime._seconds + oneDay) * 1000) > curDate;
    }
    $(this).prop("disabled", !isValid);
    let deviceStatusEle = null;

    $(".device-status").each(function () {
      if (this.getAttribute("key") === rowKey) {
        deviceStatusEle = $(this);
        return;
      }
    });
    if (isValid) {
      $(this).removeClass("device-row-invalid");
      // if (!$(this).hasClass("device-row-processing")) {
      //   deviceStatusEle.html("");
      // }
    } else {
      $(this).addClass("device-row-invalid");
      deviceStatusEle.html(
        "Hết hạn: " +
          (validDevice
            ? new Date(validDevice.expiredTime._seconds * 1000)
                .toISOString()
                .slice(0, 10)
            : curDate.toISOString().slice(0, 10))
      );
    }
    $(".checkbox-serial").each(function () {
      if (this.getAttribute("key") === rowKey) {
        $(this).prop("disabled", !isValid);
        return;
      }
    });
  });
}

$("#save-package-btn, #reset-pack-default-btn, #reset-info-all-btn").click(
  async () => {
    // Show Loading
    showLoading();
    setTimeout(() => {
      hideLoading();
    }, 3000);
  }
);
function showLoading(serial) {
  showHideLoading(serial, true);
}
function hideLoading(serial) {
  showHideLoading(serial, false);
}
function showHideLoading(serial, show = true) {
  if (serial) {
    // TODO: hiện thị loading cho device cụ thể
  } else {
    // Loading toàn màn hình
    if (show) $("#loading").removeClass("hidden");
    else $("#loading").addClass("hidden");
  }
}

// Xac dinh mode single hay multi hay chua xac dinh
function getModeAction() {
  let devices = getSelectedAvailDevices();
  const devicesChosen = devices.filter((d) => {
    if (!d.checked) {
      return false;
    }
    const processes = d.processes || [];
    if (processes.length === 0) {
      return true;
    }
    const process = processes.find((p) => {
      return p.status !== STATUS_PROCESSING;
    });
    return !!process;
  });
  if (devicesChosen.length === 0) {
    return MODE_DEFAULT;
  } else if (devicesChosen.length === 1) {
    return MODE_SINGLE;
  } else {
    return MODE_MULTI;
  }
}

// cap nhat thong tin processes cho device
function updateProcessStatusForDevice(serial, action, status) {
  const device = _devices.find((d) => d.serial === serial);
  const processes = device.processes || [];
  const process = processes.find((p) => (p.action = action));
  if (!process) {
    processes.push({ action, status });
  } else {
    Object.assign(process, { action, status });
  }
  Object.assign(device, { processes });
}

// set loading va disable row
function beforeAction(serial) {
  updateUiWithMode();
  $(`.checkbox-serial[serial="${serial}"]`).addClass("hidden");
  $(`.loading-serial[serial="${serial}"]`).removeClass("hidden");
  $(`.device-row[serial="${serial}"]`).prop("disabled", true);
  $(`.device-row[serial="${serial}"]`).addClass("device-row-processing");
  $(`.device-row[serial="${serial}"] .actions a`).addClass("disabled-link");
  $(`.device-row[serial="${serial}"] .actions a.ignore-loading`).removeClass(
    "disabled-link"
  );
  disableMenu();
}

// tat loading, hien check va enable for row
function afterAction(serial) {
  afterActionRemoveChecked(serial, true);
}
function afterActionRemoveChecked(serial, removeChecked = true) {
  updateUiWithMode();
  $(`.checkbox-serial[serial="${serial}"]`).removeClass("hidden");
  $(`.loading-serial[serial="${serial}"]`).addClass("hidden");
  $(`.device-row[serial="${serial}"]`).prop("disabled", false);
  $(`.device-row[serial="${serial}"]`).removeClass("device-row-processing");
  $(`.device-row[serial="${serial}"] .actions a`).removeClass("disabled-link");
  if ($(`.device-row`).length > 1 && removeChecked) {
    $(`.device-row[serial="${serial}"]`).removeClass("device-row-active");
    $(`.checkbox-serial[serial="${serial}"]`).prop("checked", false);
  }
  disableMenu();
}

// tuy vao mode ma hien thi ui cho hop ly
function updateUiWithMode() {
  const mode = getModeAction();
  if (mode === MODE_SINGLE) {
    $(".single").removeClass("btn-disable");
    $(".multi").addClass("btn-disable");
    $(".single").prop("disabled", false);
    $(".multi").prop("disabled", true);
  } else if (mode == MODE_MULTI) {
    $(".single").addClass("btn-disable");
    $(".multi").removeClass("btn-disable");
    $(".single").prop("disabled", true);
    $(".multi").prop("disabled", false);
  } else {
    // $('.single').addClass('btn-disable');
    // $('.multi').addClass('btn-disable');
    // $('.single').prop('disabled', true);
    // $('.multi').prop('disabled', true);
  }
}

// init country, operatorname, sdk
function initDataUi() {
  const network = JSON.parse(localStorage.getItem("networks_client"));
  const mans = ["Random"];
  mans.forEach((m) => {
    $("#man-action").append(`<option value=${m}>${m}</option>`);
  });
  $("#man-action").on("change", function () {
    _randomBrand = this.value == "Random";
  });

  network.forEach((n) => {
    $("#country-action").append(`<option value=${n.code}>${n.code}</option>`);
  });
  const androidVersion = ["29"];
  androidVersion.forEach((v) => {
    // let selected = v.release == "10" ? "selected" : "";
    $("#sdk").append(`<option ${"10"} value=${29}>${"29"}</option>`);
  });
}

$("#sdk").on("change", function () {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) return;
  let device = devices[0];
  if (!device.newInfo || Object.keys(device.newInfo).length == 0) return;
  const androidVersion = ["29"];
  device.newInfo["sdk"] = "29";
  device.newInfo["release"] = "10";
});

// event for select country-action
$("#country-action").on("change", function () {
  onCountryChange(this.value);
});

$("#operator-name-action").on("change", function () {
  $("#SimOperator").val(this.value);
});

function onCountryChange(countrySelected) {
  const network = JSON.parse(localStorage.getItem("networks_client"));
  $("#operator-name-action").empty();
  if (!countrySelected) {
    return;
  }
  const country = network.find((n) => n.code === countrySelected);
  const operators = (country || {}).operators || [];
  operators.forEach((o) => {
    $("#operator-name-action").append(
      `<option value=${o.code}>${o.name}</option>`
    );
  });
  $("#SimOperator").val($("#operator-name-action").val());
}

// kiem tra xem co device nao dang thuc hien xu ly action hay khong
// duoc goi trc khi va sau khi thuc hien action
function disableMenu() {
  const isProcessing = $(".checkbox-serial.hidden").length !== 0;
  $("ul.navbar-primary-menu")
    .children()
    .each(function () {
      // if (isProcessing && !$(this).hasClass('active')) {
      if (isProcessing) {
        $(this).addClass("disabled-link");
      } else {
        $(this).removeClass("disabled-link");
      }
    });
}

///////////////////////////////////////////////////////-----------------------------------------///////////////////////////////////////////////////////

$(document).on("keypress", "#backup-quick-search", (e) => {
  if (e.which != 13) {
    return;
  }
  let inputText = $("#backup-quick-search").val();
  if (!inputText) {
    $("#backup-list").val("");
    reloadBackupList();
    return;
  }
  searchBackup(inputText);
});
$(document).on("paste", "#backup-quick-search", (e) => {
  setTimeout(() => {
    let inputText = $("#backup-quick-search").val();
    if (!inputText) return;
    searchBackup(inputText);
  }, 20);
});
function removeSpecialChars(raw) {
  try {
    if (!raw) return raw;
    return raw.trim().replace(/\./g, "").replace(/_/g, "").replace(/ /g, "");
  } catch (er) {
    return "";
  }
}
function searchBackup(text) {
  text = text.split("@")[0];
  text = removeSpecialChars(text);
  let searchResult = _backupFiles;
  if (text) {
    searchResult = _backupFiles.filter((f) => {
      if (!text) return [];
      let name = removeSpecialChars(f.name);
      if (!name) return false;
      return name.includes(text);
    });
  }
  $("#backup-list").empty();
  searchResult.forEach((f) => {
    $("#backup-list").append(
      `<option style="font-size: 12px" value="${f.path}">${f.name}</option>`
    );
  });
}

$(document).on("keypress", "#backup-app-quick-search", (e) => {
  if (e.which != 13) {
    return;
  }
  let inputText = $("#backup-app-quick-search").val();
  if (!inputText) {
    $("#backup-app-list").val("");
    reloadBackupAppList();
    return;
  }
  searchBackupApp(inputText);
});
$(document).on("paste", "#backup-app-quick-search", (e) => {
  setTimeout(() => {
    let inputText = $("#backup-app-quick-search").val();
    if (!inputText) return;
    searchBackupApp(inputText);
  }, 20);
});
function searchBackupApp(text) {
  text = text.split("@")[0];
  text = removeSpecialChars(text);
  let searchResult = _backupAppFiles;
  if (text) {
    searchResult = _backupAppFiles.filter((f) => {
      if (!text) return [];
      let name = removeSpecialChars(f.name);
      if (!name) return false;
      return name.includes(text);
    });
  }
  $("#backup-app-list").empty();
  searchResult.forEach((f) => {
    $("#backup-app-list").append(
      `<option style="font-size: 12px" value="${f.path}">${f.name}</option>`
    );
  });
}

// Backup/Restore App BEGIN
$(document).on(
  "click",
  "#show-backup-app-modal-btn, #show-backup-change-app-modal-btn, #show-backup-restore-app-modal-btn",
  async (e) => {
    let devices = getSelectedAvailDevices();
    if (devices.length != 1) {
      return alertError("Không thể chọn nhiều device");
    }
    // Reset old attributes
    $("#backup-app-btn").removeAttr("serial");
    $("#backup-app-btn").removeAttr("change");
    $("#backup-app-btn").removeAttr("restore");
    $("#backup-app-btn").removeAttr("filePath");
    let change = e.currentTarget.id == "show-backup-change-app-modal-btn";
    let restore = e.currentTarget.id == "show-backup-restore-app-modal-btn";
    let title = "App To Backup";
    title = change ? "App To Backup And Change" : title;
    title = restore ? "App To Backup And Restore" : title;
    $("#backup-app-title-modal").text(title);
    let serial = devices[0].serial;
    if (restore) {
      let filePath = $("#backup-app-list").val();
      if (!filePath) {
        alertError("Vui lòng chọn file để restore!");
        return;
      }
      $("#backup-app-btn").attr("filePath", filePath);
    }
    let app = localStorage.getItem("conf-backup-app") || "";
    $("#apps-list").empty();
    $("#apps-list").append(`<option value=''></option>`);
    let userApps = await getInstalledPackages(serial);
    userApps = userApps.filter((x) => x);
    userApps.forEach((p) => {
      $("#apps-list").append(`<option value='${p}'>${p}</option>`);
    });
    // Not install
    if (!userApps.includes(app)) {
      $("#apps-list").append(`<option value='${app}'>${app}</option>`);
    }
    $("#backup-app-name").val("");
    if (app) {
      $("#apps-list").val(app);
    }
    $("#backup-app-btn").attr("serial", serial);
    $("#backup-app-btn").attr("change", change);
    $("#backup-app-btn").attr("restore", restore);
    $("#backup-app-modal").modal({ show: true });
  }
);
$(document).on("keypress", "#backup-app-name", function (event) {
  var regex = new RegExp("^[a-zA-Z0-9]+$");
  var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
  if (!regex.test(key)) {
    event.preventDefault();
    return false;
  }
});
$(document).on("paste", "#backup-app-name", () => {
  setTimeout(() => {
    let inputText = $("#backup-app-name").val() || "";
    let clearText = (inputText || "").match(/[a-zA-Z0-9]+/g) || "";
    $("#backup-app-name").val(clearText.join(""));
  }, 20);
});
$(document).on("click", "#backup-app-btn", async (e) => {
  let serial = e.currentTarget.getAttribute("serial");
  let change = e.currentTarget.getAttribute("change") == "true";
  let restore = e.currentTarget.getAttribute("restore") == "true";
  let filePath = e.currentTarget.getAttribute("filePath");
  let name = $("#backup-app-name").val() || "";
  let app = $("#apps-list").val() || "";
  if (!serial) {
    return alertError("Device not found");
  }
  if (!app) {
    return alertError("Vui lòng chọn App settings");
  }
  let exists = await isPackageExist(serial, app);
  if (!exists) {
    return alertError(`${app} chưa được cài đặt!`);
  }
  localStorage.setItem("conf-backup-app", app);
  $("#backup-app-modal").modal("toggle");
  // everything ok, let backup app
  await backupApp(serial, {
    app,
    name: name || "",
    change: !!change,
    restore: !!restore,
    filePath,
  });
  loadDeviceInfo();
});
async function isPackageExist(serial, app) {
  return !!(await runShell(`"pm list packages | grep ${app}"`, serial)).stdout;
}
async function clearApp(serial) {
  let allowClear =
    localStorage.getItem("conf-clear-app-after-change") == "true";
  if (!allowClear) return;
  let app = localStorage.getItem("conf-backup-app");
  if (!app) return;
  let appInfoPaths = await getAppPaths(serial, app);
  await runShell(`rm -rf ${appInfoPaths.join(" ")}`, serial);
}
async function clearMail(serial) {
  let allowClear =
    localStorage.getItem("conf-clear-mail-after-backup") == "true";
  if (!allowClear) return;
  await wipeAll(serial);
}
async function backupApp(serial, options) {
  let { app, name, change, restore, filePath } = options || {};
  function status(text) {
    updateStatus(serial, `BK-APP: ${text}`);
  }
  if (!serial || !app) {
    return false;
  }
  let device = _devices.find((x) => x.serial == serial);
  if (!device) {
    // Thống báo lỗi, không tìm thấy thiết bị này
    return;
  }
  let existPackage = await isPackageExist(serial, app);
  let allPack = await getAllPackages(serial);
  let backupMail = localStorage.getItem("conf-backup-mail-and-app") == "true";
  if (!existPackage) return false;
  updateProcessStatusForDevice(serial, BACKUP_APP, STATUS_PROCESSING);
  beforeAction(serial);
  status(app);
  await sleep(2000);

  // Always get new info
  let newInfo = {};
  let props;
  if (change) {
    // Chưa có info thì request từ api
    let needRequestInfo =
      !device.newInfo || Object.keys(device.newInfo).length == 0;
    if (needRequestInfo) {
      let brand = $("#man-action").val();
      if (_randomBrand) brand = "";
      let country = $("#country-action").val();
      let operator = $("#operator-name-action").val();
      let sdk = $("#sdk").val() || "29";
      let info = await requestNewInfoNew(
        device.key,
        [
          "country=" + country,
          "brand=" + brand,
          "operator=" + operator,
          "sdk=" + sdk,
          "serial=" + serial,
        ].join("&")
      );
      let uiInfo = getUiInfo();
      // Nếu edit phone trên ui thì cập nhật vào
      ["PhoneNumber", "SimOperator", "SubscriberId"].forEach((k) => {
        let uiValue = uiInfo[k];
        if (!uiValue) return;
        if (device.oldInfo[k] == uiValue || device.newInfo[k] == uiValue)
          return;
        info["fullInfo"][k] = uiValue;
      });
      newInfo = info["fullInfo"];
      props = info["props"];
    } else {
      newInfo = Object.assign(device.newInfo, getUiInfo());
      props = device.props;
    }
    device.newInfo = {};
  }
  status("Boot Recovery");
  await rebootRecovery(serial);
  status("Wait Recovery");
  await waitRecovery(serial);
  status("Collect Info");
  await mountSystemTwrp(serial);
  // ==== backup
  let winInfoPaths = await getWinInfoPaths(serial);
  let appInfoPaths = await getAppPaths(serial, app);
  status("Remove Cache");
  await removeAppCache(serial, app, appInfoPaths);
  let backupPaths = [...winInfoPaths, ...appInfoPaths];
  if (!name) name = app;
  let timeFormat = genFileNameTime();
  let fileName = `${name}_${timeFormat}.wbk`;
  let guestPath = `/data/backup/${fileName}`;
  // kiểm tra có backup cả gmail không
  if (backupMail) {
    let mail = await getLoggedMail(serial);
    if (mail) {
      await cleanBeforeBackup(serial);
      let paths = await getAllBackupPaths(serial);
      backupPaths = [...backupPaths, ...paths];
      await cleanAfterBackup();
    }
  }
  status("Backup...");
  await runShell(`tar -zcvf ${guestPath} ${backupPaths.join(" ")}`, serial);
  await runAdb(`-s ${serial} pull ${guestPath} ${BACKUP_APP_DIR}`);
  status("Cleanup");
  await runShell(`rm -rf ${guestPath}`);
  await runShell(`rm -rf ${appInfoPaths.join(" ")}`, serial);
  // ==== end backup
  let needChange = change && Object.keys(newInfo).length > 0;
  if (needChange) {
    updateStatus(serial, "Change...");
    // Remove all old info
    await runShell(
      "rm -rf /system/vendor/Utils /system/system/vendor/Utils /system/etc/Utils /system/system/etc/Utils",
      serial
    );

    // Create folder if not exist
    let infoFolderS7 = "/system/system/vendor/Utils";
    let infoFolderS9 = "/system/vendor/Utils";
    let infoFolderA1 = "/system/system/etc/Utils";
    let infoFolderA2 = "/system/etc/Utils";

    await runShell(`mkdir ${infoFolderS7}`, serial);
    await runShell(`mkdir ${infoFolderS9}`, serial);
    await runShell(`mkdir ${infoFolderA1}`, serial);
    await runShell(`mkdir ${infoFolderA2}`, serial);

    let cmdS7 = [];
    let cmdS9 = [];
    let cmdA1 = [];
    let cmdA2 = [];
    for (const k in newInfo) {
      let v = newInfo[k];
      v = remakeProp(k, v);
      cmdS7.push(`echo '${v}' > ${infoFolderS7}/${k}`);
      cmdS9.push(`echo '${v}' > ${infoFolderS9}/${k}`);
      cmdA1.push(`echo '${v}' > ${infoFolderA1}/${k}`);
      cmdA2.push(`echo '${v}' > ${infoFolderA2}/${k}`);
    }

    await runShell(`"${cmdS7.join(" && ")}"`, serial);
    await runShell(`"${cmdS9.join(" && ")}"`, serial);
    await runShell(`"${cmdA1.join(" && ")}"`, serial);
    await runShell(`"${cmdA2.join(" && ")}"`, serial);

    await changeProps(props, serial);
    // Clear app
    await clearApp(serial);
    await sleep(7000);
    await clearAll(allPack, serial);
  }
  if (restore) {
    status("Restore...");
    await restoreAppPure(serial, filePath);
  }
  reloadBackupAppList();
  status("Completed - Reboot");
  await reboot(serial);
  await waitDevice(serial);
  await waitBootCompleted(serial);
  await clearMail(serial);
  updateProcessStatusForDevice(serial, BACKUP_APP, STATUS_DONE);
  afterAction(serial);
  status("DONE");
}

$(document).on("click", "#restore-app-btn", async () => {
  let devices = getSelectedAvailDevices();
  if (devices.length != 1) {
    // show error
    return;
  }
  let device = devices[0];
  let filePath = $("#backup-app-list").val();
  if (!filePath) {
    alertError("Vui lòng chọn file để restore!");
    return;
  }
  if (!fs.existsSync(`${filePath}`)) {
    alertError("File restore không tồn tại!");
    return;
  }
  await restoreApp(device.serial, filePath);
  loadDeviceInfo();
});
async function restoreApp(serial, filePath) {
  function status(text) {
    updateStatus(serial, `RS-APP: ${text}`);
  }
  beforeAction(serial);
  updateProcessStatusForDevice(serial, RESTORE_APP, STATUS_PROCESSING);
  status("Reboot Recovery");
  await rebootRecovery(serial);
  status("Wait Recovery");
  await waitRecovery(serial);
  await mountSystemTwrp(serial);
  status("Restore...");
  await restoreAppPure(serial, filePath);
  status("Completed - Reboot");
  await reboot(serial);
  await waitDevice(serial);
  await waitBootCompleted(serial);
  status("Done");
  updateProcessStatusForDevice(serial, RESTORE_APP, STATUS_DONE);
  afterAction(serial);
}
async function restoreAppPure(serial, filePath) {
  let fileName = path.basename(filePath);
  await runShell("mkdir /data/backup", serial);
  await runAdb(`-s ${serial} push "${filePath}" /data/backup/`);
  await runShell(
    `tar -xf /data/backup/${fileName} ${EXCLUDE_RESTORE} -C /`,
    serial
  );
}
// ## Backup/Restore App END
