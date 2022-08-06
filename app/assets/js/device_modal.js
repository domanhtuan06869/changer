var { shell } = require("electron");

var {isDev} = require('../../../env.js')
// eslint-disable-next-line no-unused-vars
var bytenode = require('bytenode');
const {getDeviceProxy } = require("./utils");

var {
  runAdb,
  runShell,
  showVysor,
  wipeAll,
  alertError,
  getDesktopPath,
  setWinName,
  getWinName,
  deleteWinName,
  openChrome,
  openDefaultBrowser,
  getInstalledPackages,
} = require('./utils.js' + (isDev ? '' : 'c'));

// eslint-disable-next-line no-undef
var $ = $$;
// eslint-disable-next-line no-undef
var document = window.global.document;
// eslint-disable-next-line no-undef
var localStorage = window.global.localStorage;

// Load partial html
$("#device-tool-modal").load("device_modal.html");

function getDevices() {
  // eslint-disable-next-line no-undef
  return window.global._devices || []
}

// eslint-disable-next-line no-undef
window.global.myEventEmitter.addListener("show-modal", function () {
  $("#device-list-tools").empty();
  getDevices().forEach((device) => {
    let deviceName = device.oldInfo.win_name;
    if (!deviceName)
      deviceName = (device.newInfo || {}).model || (device.oldInfo || {}).model;
    $("#device-list-tools")
      .append(`<tr class="device-row" serial="${device.serial}">
      <td style="width: 7%">
        <input type="checkbox" class="checkbox-serial" serial="${device.serial}"/>
      </td>
      <td style="width: 15%" class="win-device-name" serial="${device.serial}">${deviceName}</td>
      <td style="width: 28%">${device.key}</td>
      <td style="width: 55%" class="actions">
        <a href="#" class="icon-bg bg-blue vysor-btn mg-l-5" data-toggle="tooltip" serial="${device.serial}" title="View Vysor">
            <span class="mdi mdi-eye"></span>
        </a>
        <a href="#" class="icon-bg bg-deep-gray screen-capt-btn mg-l-5" data-toggle="tooltip" serial="${device.serial}" title="Screen Capt">
            <span class="mdi mdi-camera"></span>
        </a>
        <a href="#" class="icon-bg bg-red wipe-packages-btn" serial="${device.serial}" data-toggle="tooltip" title="Wipe Packages">
            <span class="mdi mdi-replay"></span>
        </a>
        <a href="#" class="icon-bg bg-green change-name-btn mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Change Name">
            <span class="mdi mdi-pencil"></span>
        </a>
        <a href="#" class="icon-bg bg-warning send-text-btn mg-l-5 hidden" serial="${device.serial}" name="${deviceName}" data-toggle="tooltip" title="Send Text">
            <span class="mdi mdi-send"></span>
        </a>
        <a href="#" class="icon-bg bg-gray install-apk-btn mg-l-5 hidden" serial="${device.serial}" data-toggle="tooltip" title="Install Apk">
            <span class="mdi mdi-rocket"></span>
        </a>
        <a href="#" class="icon-bg bg-blue open-link-action mg-l-5" serial="${device.serial}" data-toggle="tooltip" title="Open App">
            <span class="mdi mdi-google-chrome"></span>
        </a> 
        <a href="#" class="icon-bg bg-red reboot-btn mg-l-5 hidden" serial="${device.serial}" data-toggle="tooltip" title="Reboot">
            <span class="mdi mdi-replay"></span>
        </a>
      </td>
    </tr>`);
  });
  $("#tools-modal").modal("show");
});

function lockToolDevice(serial) {
  $(`#tools-modal .device-row[serial="${serial}"]`).prop("disabled", true);
  $(`#tools-modal .device-row[serial="${serial}"]`).addClass(
    "device-row-processing"
  );
  $(`#tools-modal .device-row[serial="${serial}"] .actions a`).addClass(
    "disabled-link"
  );
}
function releaseToolDevice(serial) {
  $(`#tools-modal .device-row[serial="${serial}"]`).prop("disabled", false);
  $(`#tools-modal .device-row[serial="${serial}"]`).removeClass(
    "device-row-processing"
  );
  $(`#tools-modal .device-row[serial="${serial}"] .actions a`).removeClass(
    "disabled-link"
  );
}

function getDeviceName(serial) {
  try {
    if (!serial) return ''
    let device = getDevices().find(x => x.serial == serial)
    if (!device) return ''
    let deviceName = device.oldInfo.win_name;
    if (!deviceName) deviceName = (device.newInfo || {}).model || (device.oldInfo || {}).model;
    return deviceName || ''
  } catch (err) {
    return ''
  }
}

$(document).on("click", "#device-list-tools .icon-bg", async (e) => {
  let serial = e.currentTarget.getAttribute("serial");
  if (!serial) return;
  let device = getDevices().find((x) => x.serial == serial);
  if (!device) return;
  let ele = $(e.currentTarget);
  if (ele.hasClass("vysor-btn")) {
    showVysor(serial, getDeviceName(serial));
  } else if (ele.hasClass("screen-capt-btn")) {
    $("#screen-capt-action").attr("serial", serial);
    $("#screen-capt-modal").modal("show");
  } else if (ele.hasClass("wipe-packages-btn")) {
    lockToolDevice(serial);
    await wipeAll(serial);
    releaseToolDevice(serial);
  } else if (ele.hasClass("change-name-btn")) {
    $("#change-name-action").attr("serial", serial);
    $("#delete-name-action").attr("serial", serial);
    $("#change-name-input").val("");
    $("#change-name-modal").modal("show");
  } else if (ele.hasClass("change-proxy-btn")) {
    $("#change-proxy-action").attr("serial", serial);
    $("#delete-proxy-action").attr("serial", serial);
    $("#change-proxy-input").val("");
    $("#change-proxy-modal").modal("show");
  } else if (ele.hasClass("send-text-btn")) {
    $("#send-text-action").attr("serial", serial);
    $("#send-text-input").val("");
    $("#screen-capt-modal").modal("show");
  } else if (ele.hasClass("install-apk-btn")) {
    // $('#screen-capt-action').attr('serial', serial)
    // $('#screen-capt-modal').modal('show')
  } else if (ele.hasClass("open-link-action")) {
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
  } else if (ele.hasClass("reboot-btn")) {
    // $("#screen-capt-action").attr("serial", serial);
    // $("#screen-capt-modal").modal("show");
  }
});

$(document).on("click", "#screen-capt-action, #change-name-action, #delete-name-action, #change-proxy-action, #delete-proxy-action",
  async (e) => {
    let id = e.currentTarget.getAttribute("id");
    let serial = e.currentTarget.getAttribute("serial");
    $(e.currentTarget).closest(".modal").modal("toggle");
    lockToolDevice(serial);
    if (id == "screen-capt-action") {
      let fileName = $("#screen-capt-input").val();
      if (!serial || !fileName) {
        if (!fileName) {
          alertError("Vui lòng nhập tên file!");
          releaseToolDevice(serial);
        }
        return;
      }
      let desktop = await getDesktopPath();
      let filePath = `${desktop}\\${fileName}.png`;
      await runShell(`rm /sdcard/screencap.png`, serial);
      await runShell(`screencap -p /sdcard/screencap.png`, serial);
      await runAdb(`-s ${serial} pull /sdcard/screencap.png "${filePath}"`);
      await runShell(`rm /sdcard/screencap.png`, serial);
      shell.openItem(filePath);
    } else if (id == "change-name-action") {
      let name = $("#change-name-input").val();
      await setWinName(serial, name);
      let currentName = await getWinName(serial);
      if (currentName) {
        $(
          `#device-list-tools .win-device-name[serial="${serial}"]`
        )[0].innerText = currentName;
      }
    } else if (id == "delete-name-action") {
      await deleteWinName(serial);
      $(
        `#device-list-tools .win-device-name[serial="${serial}"]`
      )[0].innerText = "";
    } else if (id == "change-proxy-action") {
      let proxy = $("#change-proxy-input").val();
      let currentName = await getDeviceProxy(serial);
      if (currentName) {
        $(
          `#device-list-tools .win-device-name[serial="${serial}"]`
        )[0].innerText = currentName;
      }
    }
    releaseToolDevice(serial);
  }
);

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
  let ipResult = await getIpLine(serial)
  if (ipResult) alertInfo("Check Info", ipResult)
  else alertError('Proxy Died!')
  afterAction(serial);
  updateProcessStatusForDevice(serial, OPEN_LINK, STATUS_DONE);
  loadDeviceInfo();
});

$(document).on("click", ".open-link-btn", async (e) => {
  let data = e.currentTarget.getAttribute("data");
  let serial = e.currentTarget.getAttribute("serial");
  $(e.currentTarget).closest(".modal").modal("toggle");
  lockToolDevice(serial);
  if (data == "ip") {
    await openDefaultBrowser(serial, "http://ip-api.com/line");
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
  releaseToolDevice(serial);
});
