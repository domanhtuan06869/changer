const _ = require("lodash");
const fs = require("fs");
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var { isDev } = require('../../../env.js')

window.global.myEventEmitter = eventEmitter


var {
  getSerials,
  backupFiles,
  getBackupAppFiles,
  generateKey,
  getDeviceInfoName,
  decrypt,
  getFileNameByPath,
  wipeAll,
  runAdb,
  mountSystemTwrp,
  createBackupProp,
  clearAll,
  runShell,
  getRootRestoreDir,
  getRootBackupDir,
  getExcludeRestores,
  alertError,
  setSetting,
  getSingleSetting,
  fixPadProps,
  fixMissingDebug,
  getAllPackages
} = require('./utils.js' + (isDev ? '' : 'c'));

const RESTORE_DIR = getRootRestoreDir();
const BACKUP_DIR = getRootBackupDir();

var _backupFiles = [];
var _devices = [];

// eslint-disable-next-line no-undef
var $ = $$;
// eslint-disable-next-line no-undef
var document = window.global.document;
// eslint-disable-next-line no-undef
var localStorage = window.global.localStorage;

// Set menu tab active
setTimeout(() => {
  $("#backup_menu").addClass("active");
}, 1);

const EXCLUDE_RESTORE = getExcludeRestores();
const NUM_PER_PAGE = 11;

function beforeAction(path) {
  let serial = generateKey(path);
  $(`.checkbox-serial[serial="${serial}"]`).addClass("hidden");
  $(`.loading-serial[serial="${serial}"]`).removeClass("hidden");
  $(`.file-row[serial="${serial}"]`).prop("disabled", true);
  $(`.file-row[serial="${serial}"]`).addClass("file-row-processing");
  $(`.file-row[serial="${serial}"] .actions a`).addClass("disabled-link");
  disableMenu();
}

// tat loading, hien check va enable for row
function afterAction(path) {
  let serial = generateKey(path);
  $(`.checkbox-serial[serial="${serial}"]`).removeClass("hidden");
  $(`.loading-serial[serial="${serial}"]`).addClass("hidden");
  $(`.file-row[serial="${serial}"]`).prop("disabled", false);
  $(`.file-row[serial="${serial}"]`).removeClass("file-row-processing");
  $(`.file-row[serial="${serial}"] .actions a`).removeClass("disabled-link");
  disableMenu();
}
function lockDevice(serial) {
  lockOrReleaseDevice(serial, true);
}
function releaseDevice(serial) {
  lockOrReleaseDevice(serial, false);
}
function lockOrReleaseDevice(serial, lock = true) {
  if (!serial) return;
  let device = _devices.find((d) => d.serial == serial);
  if (!device) return;
  device.processing = lock;
}
function checkedAndEnableVipSession() {
  try {
    const loginInfo = JSON.parse(localStorage.getItem("loginInfo"));
    let enabledVip = !!loginInfo.isVip;
    if (enabledVip) {
      $('.vip-only').removeClass('hidden');
    }
  } catch (err) {
    // ignored
  }
}
/**
 * Main Entry
 */
$(async () => {
  showLoading();
  checkedAndEnableVipSession();
  _backupFiles = [...await backupFiles(), ...await getBackupAppFiles()];

  _backupFiles.sort(function (f1, f2) {
    return new Date(f2.time) - new Date(f1.time);
  });
  rerenderListBkFile(_backupFiles);
  initDataUi();
  let serials = await getSerials();
  for (let i = 0; i < serials.length; i++) {
    let s = serials[i];
    _devices.push({
      serial: s,
      key: generateKey(s),
      oldInfo: await getDeviceInfoName(s),
      newInfo: {},
      checked: false,
      processing: false,
    });
  }
  // eslint-disable-next-line no-undef
  window.global._devices = _devices
  reloadTableDevices();
  hideLoading();
});

function reloadTableDevices() {
  const loginInfo = JSON.parse(localStorage.getItem("loginInfo"));
  let keyObjs = [];
  if (typeof loginInfo.keys == "string") {
    let iv = loginInfo.secretKey;
    keyObjs = JSON.parse(decrypt(loginInfo.keys, iv));
  } else {
    keyObjs = loginInfo.keys || [];
  }
  let activeDevices = (_devices || []).filter((d) => {
    if (d.processing) return false;
    let key = keyObjs.find((o) => o.key === d.key);
    if (!key) return false;
    return new Date(key.expiredTime._seconds * 1000) > new Date();
  });
  $("#device-list-restore").empty();

  activeDevices.forEach((device) => {
    let deviceName = device.oldInfo.win_name;
    if (!deviceName)
      deviceName = (device.newInfo || {}).model || (device.oldInfo || {}).model;
    $("#device-list-restore")
      .append(`<tr class="device-row" serial="${device.serial}">
      <td>
        <input type="checkbox" class="checkbox-serial" serial="${device.serial}"/>
      </td>
      <td>${deviceName}</td>
      <td>${device.key}</td>
    </tr>`);
  });
}
function updateStatus(path, status) {
  if (!path || !status) return;
  let serial = generateKey(path);
  $(`.file-status[serial="${serial}"]`)[0].textContent = status;
}
$(document).on("click", ".restore-action", (e) => {
  let filePath = e.currentTarget.getAttribute("path");
  if (!filePath) return;
  if (!fs.existsSync(filePath)) {
    alertError("File đã Restore");
    return;
  }
  reloadTableDevices();
  $(".device-row").attr("path", filePath);
  $(".rm-file-title").text(getFileNameByPath(filePath));
  $("#restore-modal .modal-title").text("Select Device Restore");
  $("#restore-modal").modal("toggle");
});
$(document).on("click", ".device-row", (e) => {
  let ele = e.currentTarget.getElementsByTagName("input")[0];
  $(".device-row input").prop("checked", false);
  $(".device-row").removeClass("device-row-active");
  e.currentTarget.classList.add("device-row-active");
  ele.checked = true;
});

function emitEvent(name) {
  eventEmitter.emit(name, "");
}
$(document).on("click", "#device-tools-btn", () => {
  emitEvent("show-modal");
});

function getDeviceName(serial) {
  if (!serial) return "";
  let device = _devices.find((x) => x.serial == serial);
  if (!device) return "";
  let deviceName = device.oldInfo.win_name;
  if (!deviceName)
    deviceName = (device.newInfo || {}).model || (device.oldInfo || {}).model;
  return (deviceName || "").trim();
}
/**
 * Restore function
 */
$(document).on("click", "#restore-modal-action", async () => {
  $("#restore-modal").modal("toggle");
  let ele = $(".device-row-active")[0];
  if (!ele) return;
  let serial = ele.getAttribute("serial");
  let filePath = ele.getAttribute("path");
  if (!serial || !filePath) {
    return;
  }

  let deviceName = getDeviceName(serial);
  let fileName = getFileNameByPath(filePath);
  let allPack = await getAllPackages(serial);
  function showStatus(s) {
    updateStatus(filePath, `${deviceName}: ${s}`);
  }

  beforeAction(filePath);
  lockDevice(serial);
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

  await runAdb(`-s ${serial} push ${filePath} /data/backup/`);

  await runShell(
    `tar -xf /data/backup/${fileName} ${EXCLUDE_RESTORE} -C /`,
    serial
  );

  let fixDetectDebug = await getSingleSetting('fix-pad-fgo')
  if (fixDetectDebug) {
    showStatus("Fix Debug");
    await fixPadProps(serial)
    await fixMissingDebug(serial)
  }

  // Reboot
  showStatus("Reboot");
  await runAdb(`-s ${serial} reboot`);
  await runAdb(`-s ${serial} wait-for-device`);
  showStatus("Restore Done!");
  if (!fs.existsSync(filePath)) {
    // $(`.file-row[serial="${generateKey(filePath)}"]`).remove()
    _.remove(_backupFiles, (file) => file.path == filePath);
  }
  releaseDevice(serial);
  afterAction(filePath);
});

$(document).on("click", ".file-row", (e) => {
  let ele = e.currentTarget.getElementsByTagName("input")[0];
  $(".file-row input").prop("checked", false);
  $(".file-row").removeClass("file-row-active");
  e.currentTarget.classList.add("file-row-active");
  ele.checked = true;
});

// Collapse Menu
$(".btn-expand-collapse").click(function () {
  if ($(".navbar-primary").hasClass("collapsed")) {
    $(".navbar-primary").removeClass("collapsed");
  } else {
    $(".navbar-primary").addClass("collapsed");
  }
});

// Table check all row
$("#selectAll, #selectAllRestoreDevice").click(function (e) {
  var table = $(e.target).closest("table");
  $("th input:checkbox", table).prop("checked", this.checked);
});

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

// kiem tra xem co device nao dang thuc hien xu ly action hay khong
// duoc goi trc khi va sau khi thuc hien action
function disableMenu() {
  if ($(".checkbox-serial.hidden").length !== 0) {
    $("#changer_menu").addClass("disabled-link");
    $("#backup_menu").addClass("disabled-link");
    $("#restore_menu").addClass("disabled-link");
    $("#auto_menu").addClass("disabled-link");
    $("#info_menu").addClass("disabled-link");
  } else {
    $("#changer_menu").removeClass("disabled-link");
    $("#backup_menu").removeClass("disabled-link");
    $("#restore_menu").removeClass("disabled-link");
    $("#auto_menu").removeClass("disabled-link");
    $("#info_menu").removeClass("disabled-link");
  }
}

function rerenderListBkFile(files) {
  const currentPage = getCurrentPage(files) || 1;
  let inProcessSerials = [];
  // Keep in-process file on ui
  $.each($(".file-row"), (i, r) => {
    if (!r.classList.contains("file-row-processing")) {
      r.remove();
    } else {
      inProcessSerials.push(r.getAttribute("serial"));
    }
  });
  files = files.filter((f) => !inProcessSerials.includes(generateKey(f.path)));
  files.forEach((f) => {
    let serial = generateKey(f.path);
    const createdDate = new Date(f.time);
    const formatDate =
      createdDate.getDate().toString().padStart(2, "0") +
      "-" +
      (createdDate.getMonth() + 1).toString().padStart(2, "0");
    const formatTime =
      createdDate.getHours().toString().padStart(2, "0") +
      ":" +
      createdDate.getMinutes().toString().padStart(2, "0");
    $("#file-list").append(`<tr class="file-row" serial="${serial}">
        <th scope="row" style="width: 5%">
          <input type="checkbox" class="checkbox-serial" serial="${serial}"/>
          <img class="loading-serial hidden" serial="${serial}" src="assets/images/loading_icon.gif" />
        </th>
        <td>${f.name}</td>
        <td>${f.size}M</td>
        <td>${f.folder}</td>
        <td><span>${formatDate} ${formatTime}</td>
        <td class="file-status" serial="${serial}"></td>
        <td class="actions">
          <a href="javascript:void(0);" class="icon-bg bg-blue restore-action" path="${f.path}" data-toggle="tooltip" title="Restore">
            <span class="mdi mdi-replay"></span>
          </a>
          <a href="javascript:void(0);" class="icon-bg bg-red delete-action" path="${f.path}" data-toggle="tooltip" title="Delete File">
            <span class="mdi mdi-delete"></span>
          </a>
        </td>
    </tr>`);
  });
}

$(document).on("keypress", "#file-name", (e) => {
  if (e.which == 13) {
    $("#search-file").click();
    return;
  }
});

// init country, operatorname, sdk
function initDataUi() {
  const subFolders = getAllSubfolder();
  subFolders.forEach((s) => {
    $("#folder-name-search").append(`<option value='${s}'>${s}</option>`);
  });
}

function getAllSubfolder() {
  let folders = _.uniq(_backupFiles.map((x) => x.folder)).filter((x) => x);
  folders.sort((a, b) => a - b);
  return folders;
}

$("#search-file").click(function () {
  renderFiles();
});

function getSearchedFile(folderSearch, fileNameSearch) {
  let isSearchByFolder = false;
  fileNameSearch = (fileNameSearch || '').split('@')[0]
  const files = _backupFiles.filter((f) => {
    let isFound = true;
    if (folderSearch) {
      // isSearchByFolder = true;
      // const allFolders = f.path.split("/");
      // const idx = allFolders.findIndex(function(e) {
      //     return folderSearch === e;
      // });
      // Object.assign(f, {searchPathIdx: idx});
      // isFound = idx !== -1;
      isFound = folderSearch == f.folder;
    }
    if (fileNameSearch) {
      isFound = isFound && f.name.includes(fileNameSearch.trim());
      if (isFound) return true;
      return removeSpecialChars(f.name || '').includes(removeSpecialChars(fileNameSearch.trim()))
    }
    return isFound;
  });
  if (isSearchByFolder) {
    files.sort(function (f1, f2) {
      return f2.searchPathIdx - f1.searchPathIdx;
    });
  }
  return files;
}

function removeSpecialChars(raw) {
  try {
    if (!raw) return raw
    return raw.replace(/\./g, '').replace(/_/g, '').replace(/ /g, '')
  } catch (er) {
    return ''
  }
}

function createPagination(size, activePage) {
  const totalPage = Math.ceil(size / NUM_PER_PAGE);
  $("#page-pagination").empty();
  $("#page-pagination").append(`<li id="go-first-page" class="page-item">
        <a class="page-link" href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
        <span class="sr-only">Previous</span>
        </a>
    </li>`);
  for (let i = 1; i <= totalPage; i++) {
    $("#page-pagination").append(`<li class="page-item ${i == activePage ? "active" : ""
      }" page="${i}">
            <a class="page-link" href="#">${i}</a></li>`);
  }
  $("#page-pagination").append(`<li id="go-last-page" class="page-item">
        <a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
        <span class="sr-only">Next</span>
        </a>
    </li>`);
}

$(document).on('click', '.page-item', e => {
  $(".page-item").removeClass("active");
  $(e.currentTarget).addClass("active");
  renderFiles();
})
$(document).on('click', '#go-first-page', () => {
  goFirstPage()
})
$(document).on('click', '#go-last-page', () => {
  goLastPage()
})

// eslint-disable-next-line no-unused-vars
function goFirstPage() {
  $(".page-item").each(function () {
    if ($(this).hasClass("active")) {
      const page = $(this).attr("page");
      if (page == 1) {
        return;
      }
      $(this).removeClass("active");
      $(this).prev().addClass("active");
      return;
    }
  });
  renderFiles();
}

// eslint-disable-next-line no-unused-vars
function goLastPage() {
  const folderSearch = $("#folder-name-search").val();
  const fileNameSearch = $("#file-name").val();
  const files = getSearchedFile(folderSearch, fileNameSearch);
  $(".page-item").each(function () {
    if ($(this).hasClass("active")) {
      const page = $(this).attr("page");
      if (page == Math.ceil(files.length / NUM_PER_PAGE)) {
        return;
      }
      $(this).removeClass("active");
      $(this).next().addClass("active");
      return;
    }
  });
  renderFiles();
}

function getCurrentPage(files) {
  let currentPage = 0;
  $(".page-item").each(function () {
    if ($(this).hasClass("active")) {
      const page = $(this).attr("page");
      const maxPage = Math.ceil(files.length / NUM_PER_PAGE);
      if (page > maxPage) {
        currentPage = maxPage;
        return;
      }
      currentPage = page;
      return;
    }
  });
  return currentPage;
}

function renderFiles() {
  const folderSearch = $("#folder-name-search").val();
  const fileNameSearch = $("#file-name").val();
  const files = getSearchedFile(folderSearch, fileNameSearch);
  rerenderListBkFile(files);
}

$(document).on("click", ".delete-action", (e) => {
  // eslint-disable-next-line no-undef
  let yes = confirm("Xác nhận xóa file?");
  if (!yes) return;
  let filePath = e.currentTarget.getAttribute("path");
  fs.unlinkSync(filePath);
  $(`.file-row[serial="${generateKey(filePath)}"]`).remove();
});
$(document).on("click", ".move-restore-action", (e) => {
  let filePath = e.currentTarget.getAttribute("path");
  if (!filePath) return;
  if (!fs.existsSync(filePath)) {
    alertError("File không tồn tại!");
    return;
  }
  let fileName = getFileNameByPath(filePath);
  // eslint-disable-next-line no-undef
  let confirmed = confirm(`Chuyển file ${fileName} sang thư mục restore`)
  if (!confirmed) return;
  let restoreFolder = filePath
    .replace('xprobackup', 'xprorestore')
    .replace(fileName, "");
  let restorePath = `${restoreFolder}${fileName}`;
  if (fs.existsSync(restorePath)) {
    alertError("File đã tồn tại trong Restore");
    return;
  }
  if (!fs.existsSync(restoreFolder))
    fs.mkdirSync(restoreFolder, { recursive: true });
  fs.renameSync(filePath, restorePath);
  $(`.file-row[serial="${generateKey(filePath)}"]`).remove();
});
