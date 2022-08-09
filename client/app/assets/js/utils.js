/* eslint-disable no-undef */
const firebase = require("firebase");
const crypto = require("crypto");
const request = require("request");
const fs = require("fs");
const _ = require("lodash");
const md5File = require("md5-file");
const util = require("util");
var { isDev } = require("../../../env.js");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const { promisify } = require("util");
const { resolve } = require("path");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const Swal = require("sweetalert2");
const { v4: uuidv4 } = require("uuid");
var Buffer = require("buffer").Buffer;
var isStopAuto = false;
var serialsListForStopAction = [];
// Define trim chars with spec char
String.prototype.trimChars = function (c) {
  var re = new RegExp("^[" + c + "]+|[" + c + "]+$", "g");
  return this.replace(re, "");
};
const PACKAGES = [
  "com.google.android.gms.unstable",
  "com.android.vending",
  "com.android.chrome",
  "com.google.android.gsf",
  "com.google.android.gms",
  "com.google.android.gsf.login",
  "com.google.android.backuptransport",
  "com.android.htmlviewer",
  "com.qualcomm.location",
  "com.google.android.play.games",
  "com.google.android.gm",
  "com.sony.snei.np.android.account",
  "com.android.webview",
  "com.google.android.apps.books",
  "com.google.android.youtube",
];

// const API = 'http://localhost:3000';
const API =
  "http://ec2-13-213-43-116.ap-southeast-1.compute.amazonaws.com:3000";
const SCRCPY_DIR = "C:\\win_scrcpy\\scrcpy.exe";
const adbProductionPath = ".\\resources\\app\\extraResources\\adb.exe";
const adbMd5 = "94226ea671d068461171ec790197adb9";
const convert = (from, to) => (str) => Buffer.from(str, from).toString(to);
const hexToUtf8 = convert("hex", "utf8");
// const utf8ToHex = convert('utf8', 'hex')

// AES API
/**
 * AES API
 * cb88pwleo391bdmp
 * Y2I4OHB3bGVvMzkxYmRtcA==
 */
const keyBase64 = hexToUtf8("593249344f484233624756764d7a6b78596d527463413d3d");

// defind aes for mobile ROM
let romIv = hexToUtf8("64326c7564475668625449774d6a42416447467561773d3d");
let romKey = hexToUtf8("64326c756447566862554230595735725147746c65513d3d");

const Utils = module.exports;

Utils.initFirebase = function () {
  try {
    let firebaseConfig = {
      apiKey: "AIzaSyBkX7gg8qAlZz6x5tjI3mibkhn6otz05UE",
      authDomain: "fir-1d63f.firebaseapp.com",
      projectId: "fir-1d63f",
      storageBucket: "fir-1d63f.appspot.com",
      messagingSenderId: "176879360260",
      appId: "1:176879360260:web:c6725cb4fe6f851397d851",
    };

    // Initialize Firebase
    return firebase.initializeApp(firebaseConfig);
    // Your web app's Firebase configuration
  } catch (er) {
    //ignored
  }
};

const firebaseApp = Utils.initFirebase();

Utils.getFirebase = function () {
  return firebaseApp;
};

function getAlgorithm(keyBase64) {
  var key = Buffer.from(keyBase64, "base64");
  switch (key.length) {
    case 16:
      return "aes-128-cbc";
    case 32:
      return "aes-256-cbc";
  }
  throw new Error("Invalid key length: " + key.length);
}
Utils.base64Encode = function (plainText) {
  return Buffer.from(plainText).toString("base64");
};
Utils.md5 = function (plainText) {
  return crypto.createHash("md5").update(plainText).digest("hex");
};
Utils.encrypt = function (plainText, ivBase64, k = null) {
  k = k || keyBase64;
  const key = Buffer.from(k, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  const cipher = crypto.createCipheriv(getAlgorithm(k), key, iv);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};
Utils.decrypt = function (messagebase64, ivBase64, k = null) {
  k = k || keyBase64;
  const key = Buffer.from(k, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv(getAlgorithm(k), key, iv);
  let decrypted = decipher.update(messagebase64, "base64");
  decrypted += decipher.final();
  return decrypted;
};

Utils.encryptECB = function (plainText, k) {
  let cipher = crypto.createCipheriv("aes-128-ecb", k, "");
  cipher.setAutoPadding(false);
  let result = cipher.update(plainText).toString("hex");
  result += cipher.final().toString("hex");
  return result;
};

Utils.decryptECB = function (messagebase64, k) {
  let decipher = crypto.createDecipheriv("aes-128-ecb", k, "");
  decipher.setAutoPadding(false);
  let result = decipher.update(messagebase64).toString("hex");
  result += decipher.final().toString("hex");
  return result;
};

Utils.encryptProp = function (prop) {
  try {
    return Utils.encrypt(prop, romIv, romKey);
  } catch (err) {
    // console.log(err);
    return prop;
  }
};

Utils.decryptProp = function (prop) {
  try {
    return Utils.decrypt(prop, romIv, romKey);
  } catch (err) {
    // console.log(err);
    return prop;
  }
};

// run cmd utils
Utils.run = async function (cmd) {
  let r;
  try {
    if (!isDev) {
      let md5 = md5File.sync(adbProductionPath);
      if (md5 != adbMd5) throw new Error("Invalid command!");
    }
    let { stdout, stderr } = await exec(cmd, {
      maxBuffer: 1024 * 1024 * 1024,
    });
    r = { stdout, stderr };
    return r;
  } catch (err) {
    r = { stdout: "", stderr: err.message };
    console.log("ADB ERROR " + err);
    return r;
  } finally {
    // console.log("CMD:", cmd, r);
  }
};
Utils.runAdb = async function (cmd) {
  let adb = "adb";
  if (!isDev) adb = adbProductionPath;
  return Utils.run(`${adb} ${cmd}`);
};
Utils.runShell = async function (cmd, serial) {
  if (!serial) {
    return Utils.runAdb(`shell ${cmd}`);
  } else {
    return Utils.runAdb(`-s ${serial} shell ${cmd}`);
  }
};
Utils.runSu = async function (cmd, serial) {
  return Utils.runShell(`"su -c '${cmd}'"`, serial);
};

Utils.generateKey = function (serial) {
  if (!serial) return "";
  return Utils.md5(serial + "winelex2020");
};

Utils.turnOnWifi = async function (serial) {
  await Utils.runShell("svc wifi enable", serial);
};

Utils.turnOffWifi = async function (serial) {
  await Utils.runShell("svc wifi disable", serial);
};

Utils.sleep = async function (ms) {
  return new Promise((r) => {
    setTimeout(() => {
      r();
    }, ms);
  });
};

Utils.signinWinelex = async function (ac) {
  if (!ac) return null;
  let options = {
    url: API + "/users/signin_f22cd2e4-e3b8-11ea-87d0-0242ac130003",
    headers: {
      Authorization: "Bearer " + ac,
    },
  };
  return new Promise((rs, rj) => {
    request(options, (err, res, body) => {
      if (err) return rj(err);
      body = JSON.parse(body);
      if (body.code != 200) return rj(new Error("code not 200"));
      rs(body.data);
    });
  });
};

Utils.addKey = async function (key, device) {
  let ac = localStorage.getItem("accessToken");
  if (!ac) return null;
  let url = API + "/add_bc9a0286-e0fd-11ea-87d0-0242ac130003/" + key;
  if (device) url += "?device=" + device;
  let options = {
    url,
    headers: {
      Authorization: "Bearer " + ac,
    },
  };
  return new Promise((rs, rj) => {
    request(options, (err, res, body) => {
      if (err) return rj(err);
      body = JSON.parse(body);
      // if (body.code != 200) return rj(new Error('code not 200'));
      if (body.code != 200) return rs();
      rs(body.data);
    });
  });
};

Utils.requestNewInfoNew = async function (key, p) {
  try {
    for (let i = 0; i < 3; i++) {
      let token = localStorage.getItem("accessToken");
      let options = {
        url: "http://localhost:3000/change",
      };
      let res = await new Promise((r) => {
        request(options, function (error, response, body) {
          // console.log("error:", error); // Print the error if one occurred
          // console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
          // console.log("body:", body); // Print the HTML for the Google homepage.
          console.log(response.body);
          return r(JSON.parse(response.body));
          if (error) return r({ code: 401 });
          if (response.statusCode != 200) {
            return r({ code: 401 });
          } else {
            return r(JSON.parse(body));
          }
        });
      });
      // if (res.code == 401) {
      //   await Utils.getNewToken();
      //   continue;
      // }
      // if (res.code != 200) return null;
      // let userInfo = JSON.parse(localStorage.getItem('loginInfo'));
      // let iv = userInfo.secretKey;
      // return JSON.parse(Utils.decrypt(res.data, iv));
      return res;
    }
  } catch (err) {
    // console.log(err);
    return null;
  }
};

Utils.exist = async function (path, serial) {
  let r = await Utils.runShell(`ls ${path}`, serial);
  return !r.stderr;
};
Utils.getLoggedMail = async function (serial) {
  try {
    let text = (
      await Utils.runShell(
        "cat /data/data/com.android.vending/shared_prefs/finsky.xml",
        serial
      )
    ).stdout;
    return text.match(/"account">(.+)</)[1].split("@")[0];
  } catch (err) {
    // console.log(err);
    return "";
  }
};
// find / -type d -name com.google.android.gms 2>/dev/null
Utils.getReletivePaths = function (p) {
  const pattern = [
    "/sdcard/Android/data/",
    "/data/misc/profiles/ref/",
    "/data/misc/profiles/cur/0/",
    "/data/data/",
    "/data/user_de/0/",
    "/data/user/0/",
  ];
  return pattern.map((x) => `${x}${p}`);
};

const winInfoFolders = [
  "/data/adb/modules/wingisk/system.prop",
  "/system/vendor/Utils/*",
  "/system/vendor/odm/etc/build.prop",
  "/system/vendor/build.prop",
  "/system/system/vendor/Utils/*",
  "/system/system/vendor/odm/etc/build.prop",
  "/system/system/vendor/build.prop",
  "/system/etc/Utils/*",
  "/system/system/etc/Utils/*",
  "/system/build.prop",
  "/system/system/build.prop",
  "/system/product/build.prop",
  "/system/system/product/build.prop",
];

Utils.getWinInfoPaths = async function (serial) {
  let cmd =
    "echo " +
    winInfoFolders
      .map((x) => `$(find ${x.replace("/*", "")} -maxdepth 0 2>/dev/null)`)
      .join(" ");
  let existPaths = (await Utils.runShell(`"${cmd}"`, serial)).stdout
    .split(" ")
    .map((x) => x.trim());
  return winInfoFolders.filter((x) => existPaths.includes(x.replace("/*", "")));
};
Utils.getAppPaths = async function (serial, app) {
  let appFolders = [
    "/data/misc/profiles/ref/",
    "/data/misc/profiles/cur/0/",
    "/data/data/",
    "/data/user_de/0/",
    "/data/user/0/",
  ].map((x) => `${x}${app}`);
  let cmd =
    "echo " +
    appFolders.map((x) => `$(find ${x} -maxdepth 0 2>/dev/null)`).join(" ");
  return (await Utils.runShell(`"${cmd}"`, serial)).stdout
    .split(" ")
    .map((x) => x.trim());
};
Utils.removeAppCache = async function (serial, app, paths = null) {
  if (!paths) {
    paths = await Utils.getAppPaths(serial, app);
  }
  let cachePaths = (
    await Utils.runShell(
      `"echo ${paths
        .map((x) => `$(find ${x} -name '*cache*' -maxdepth 1 2>/dev/null)`)
        .join(" ")}"`,
      serial
    )
  ).stdout.trim();
  await Utils.runShell(`rm -rf ${cachePaths}`, serial);
};

Utils.getAllBackupPaths = async function (serial) {
  let paths = [
    "/data/system",
    "/data/system_de",
    "/data/system_ce",
    ...winInfoFolders,
  ];
  paths = paths.concat(Utils.getReletivePaths("com.android.vending"));
  paths = paths.concat(Utils.getReletivePaths("com.google.android.gms"));
  paths = paths.concat(Utils.getReletivePaths("com.google.android.gsf"));
  let finalResult = [];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    let exist = await Utils.exist(p, serial);
    if (!exist) continue;
    finalResult.push(p);
  }
  return finalResult;
};

Utils.cleanBeforeBackup = async function (serial) {
  const pattern = [
    // '/data/system/log-files.xml',
    // '/data/system/last-header.txt',
    // '/data/system/last-fstrim',
    // '/data/system/entropy.dat',
    "/data/system/graphicsstats/*",
    "/data/system/dropbox/*",
    "/data/system/netstats/*",
    "/data/system/procstats/*",
    "/data/system/usagestats/*",
    "/data/system/syncmanager-log/*",
    "/data/data/com.android.vending/cache/*",
    "/data/data/com.android.vending/code_cache",
  ];
  return Promise.all(
    pattern.map((x) => {
      return Utils.runShell(`rm -rf ${x}`, serial);
    })
  );
};

Utils.cleanAfterBackup = async function (serial) {
  const pattern = [
    "/data/system/log-files.xml",
    "/data/system/last-header.txt",
    "/data/system/last-fstrim",
    "/data/system/entropy.dat",
  ];
  return Promise.all(
    pattern.map((x) => {
      return Utils.runShell(`rm -rf ${x}`, serial);
    })
  );
};

Utils.cleanBeforeRestore = async function (serial) {
  const pattern = [
    "/data/data/com.google.android.gms/*",
    "/data/data/com.androd.vending/*",
    "/data/data/com.google.androd.gsf/*",
    "/data/data/com.google.androd.gm/*",
    "/data/data/com.google.androd.gsf.login/*",
    "/data/system_de/* /data/system_ce/*",
  ];
  return Promise.all(
    pattern.map((x) => {
      return Utils.runShell(`rm -rf ${x}`, serial);
    })
  );
};

Utils.downloadFile = async function (fileUrl, output) {
  return new Promise((r) => {
    request({ url: fileUrl, encoding: null }, function (err, resp, body) {
      if (err) return r(false);
      fs.writeFile(output, body, function () {
        r(true);
      });
    });
  });
};

Utils.existMagisk = async function (serial) {
  return Utils.exist("/data/adb/modules/wingisk", serial);
};

Utils.getPcUser = async function () {
  return ((await Utils.run("echo %USERNAME%")).stdout || "").trim();
};

Utils.getDesktopPath = async function () {
  let user = await Utils.getPcUser();
  return `C:\\Users\\${user}\\Desktop`;
};

Utils.isHeroLte = async function (serial) {
  return (
    await Utils.runShell(`getprop ro.product.model`, serial)
  ).stdout.includes("omni_herolte");
};

Utils.fixMissingDebug = async function (serial) {
  let user = await Utils.getPcUser();
  await Utils.runAdb(
    `-s ${serial} push C:\\Users\\${user}\\.android\\adbkey.pub /data/misc/adb/adb_keys`
  );
};

// device, recovery, fastboot
Utils.getDeviceState = async function (serial) {
  let fastboot = (await Utils.run(`fastboot devices`)).stdout;
  if (fastboot.includes(`${serial}\tfastboot`)) return "fastboot";
  let adbOut = (await Utils.run(`adb devices`)).stdout;
  if (adbOut.includes(`${serial}\trecovery`)) return "recovery";
  if (adbOut.includes(`${serial}\tdevice`)) return "device";
  return "";
};
function getFirebase() {
  return (firebase.apps || [])[0];
}
Utils.getNewToken = async function () {
  try {
    let username = localStorage.getItem("username");
    let password = localStorage.getItem("password");
    if (!username || !password) return "";
    let res = await getFirebase()
      .auth()
      .signInWithEmailAndPassword(username + "@gmail.com", password);
    let token = await res.user.getIdToken();
    localStorage.setItem("accessToken", token);
    return token;
  } catch (err) {
    // console.log(err);
    return "";
  }
};

Utils.listDrives = async function () {
  try {
    let result = (await Utils.run(`fsutil fsinfo drives`)).stdout;
    let drives = result.match(/Drives:(.+)/)[1];
    return drives.match(/\w/g);
  } catch (err) {
    return [];
  }
};

Utils.getStoredDrive = function () {
  return localStorage.getItem("stored-drive") || "C:\\";
};
function createDirPath(subDir) {
  let rootDir = Utils.getStoredDrive();
  if (rootDir.length == 1) rootDir += ":";
  if (!rootDir.endsWith("\\")) {
    rootDir = rootDir + "\\";
  }
  if (subDir.startsWith("\\")) {
    subDir = subDir.replace("\\", "");
  }
  return [rootDir, subDir].join("\\");
}
Utils.getRootBackupDir = function () {
  let dir = createDirPath("XPROALL\\xprobackup");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};
Utils.getRootRestoreDir = function () {
  let dir = createDirPath("XPROALL\\xprorestore");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};
Utils.getRootBackupAppDir = function () {
  let dir = createDirPath("XPROALL\\xprobackupapp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};
Utils.getRootRestoreAppDir = function () {
  let dir = createDirPath("XPROALL\\xprorestoreapp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

Utils.getAllFiles = async function (dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? Utils.getAllFiles(res) : res;
    })
  );
  return files.reduce((a, f) => a.concat(f), []);
};
Utils.getFileNameByPath = function (filePath) {
  return path.basename(filePath);
};
Utils.backupFiles = async function () {
  return Utils.getWinBackFiles(Utils.getRootBackupDir());
};
Utils.getRestoredFiles = async function () {
  return Utils.getWinBackFiles(Utils.getRootRestoreDir());
};
Utils.getBackupAppFiles = async function () {
  return Utils.getWinBackFiles(Utils.getRootBackupAppDir());
};
Utils.getRestoreAppFiles = async function () {
  return Utils.getWinBackFiles(Utils.getRootRestoreAppDir());
};
Utils.getWinBackFiles = async function (dir) {
  let files = await Utils.getAllFiles(dir);
  return files
    .map((filePath) => {
      try {
        let stats = fs.statSync(filePath);
        let fileName = path.basename(filePath);
        let folder = filePath.replace(dir, "").replace(fileName, "");
        folder = folder.trimChars("\\\\");
        let mtime = stats["birthtimeMs"];
        let [, d, t] = fileName.replace(".wbk", "").split("_");
        let [day, month, y1, y2] = _.chunk(d.split(""), 2).map((x) =>
          x.join("")
        );
        let [h, m, s] = _.chunk(t.split(""), 2).map((x) => x.join(""));
        return {
          name: fileName,
          path: filePath,
          folder: folder,
          isRuning: false,
          isDie: false,
          isFull: false,
          is30s: false,
          isLike: false,
          isSub: false,
          isComment: false,
          isShare: false,
          size: Math.floor(stats["size"] / (1024 * 1024)),
          time: new Date(`${month}-${day}-${y1}${y2} ${h}:${m}:${s}`),
          mtime,
        };
      } catch (err) {
        return null;
      }
    })
    .filter((x) => x);
};

Utils.random = function (pattern) {
  return pattern.replace(/X/g, () => {
    return "0123456789ZXCVBNMASDFGHJKLQWERTYUIOP".charAt(
      Math.floor(Math.random() * 36)
    );
  });
};

Utils.randomText = function (pattern) {
  return pattern.replace(/X/g, () => {
    return "ZXCVBNMASDFGHJKLQWERTYUIOP".charAt(Math.floor(Math.random() * 26));
  });
};

Utils.randomAlphaNumberic = function (length, letterFirst) {
  let l = "";
  if (letterFirst) {
    l = Utils.randomText("X");
    length--;
  }
  let p = "";
  for (let i = 0; i < length; i++) {
    p += "X";
  }
  return `${l}${Utils.random(p)}`;
};

Utils.reboot = async function (serial) {
  if (!serial) return;
  await Utils.runAdb(`-s ${serial} reboot`);
};
Utils.waitDevice = async function (serial) {
  if (!serial) return;
  await Utils.runAdb(`-s ${serial} wait-for-device`);
};

Utils.rebootRecovery = async function (serial) {
  if (!serial) return;
  await Utils.runAdb(`-s ${serial} reboot recovery`);
};
Utils.waitRecovery = async function (serial) {
  if (!serial) return;
  await Utils.runAdb(`-s ${serial} wait-for-recovery`);
};
Utils.isBootCompleted = async function (serial) {
  return (
    (
      await Utils.runShell(`getprop sys.boot_completed`, serial)
    ).stdout.trim() == 1
  );
};
Utils.waitBootCompleted = async function (serial, timeout = 20) {
  for (let i = 0; i < timeout; i++) {
    let completed = await Utils.isBootCompleted(serial);
    if (completed) break;
    await Utils.sleep(1000);
  }
};
Utils.clearAll = async function (allPackages, serial) {
  if (!serial) return;
  let data = [
    "/data/system/graphicsstats/*",
    "/data/system/dropbox/*",
    "/data/system/netstats/*",
    "/data/system/procstats/*",
    "/data/system/usagestats/*",
    "/data/system/syncmanager-log/*",
    "/data/system/job",
    "/data/system/sync",
    "/data/system/users/0/registered_services",
    "/data/system_ce/0/accounts_ce.db",
    "/data/system_ce/0/accounts_ce.db-journal",
    "/data/system_ce/0/accounts_ce.db-shm",
    "/data/system_ce/0/accounts_ce.db-wal",
    "/data/system_de/0/accounts_de.db-shm",
    "/data/system_de/0/accounts_de.db-wal",
    "/data/system_ce/0/*",
    "/data/system_de/0/accounts_de.db",
    "/data/system_de/0/accounts_de.db-journal",
    "/data/data/com.android.vending",
    "/data/user_de/0/com.android.vending",
    "/data/user/0/com.android.vending",
    "/sdcard/Android/data/com.android.vending",
    "/data/data/com.google.android.gms",
    "/data/user_de/0/com.google.android.gms",
    "/data/user/0/com.google.android.gms",
    "/sdcard/Android/data/com.google.android.gms",
    "/data/data/com.google.android.gsf",
    "/data/user_de/0/com.google.android.gsf",
    "/data/user/0/com.google.android.gsf",
    "/sdcard/Android/data/com.google.android.gsf",
    "/data/data/com.google.android.gsf.login",
    "/data/user_de/0/com.google.android.gsf.login",
    "/data/user/0/com.google.android.gsf.login",
    "/sdcard/Android/data/com.google.android.gsf.login",
    "/data/data/com.android.chrome",
    "/data/user_de/0/com.android.chrome",
    "/data/user/0/com.android.chrome",
    "/sdcard/Android/data/com.android.chrome",
  ];

  await Utils.runShell(`rm -rf ${data.join(" ")}`, serial);

  // wipe all
  await Utils.runShell(`rm -rf /data/misc/keystore/user_0/*`, serial);
  await Utils.runShell(`rm -rf /data/misc/keystore`, serial);
  await Utils.runShell(`rm -rf /data/misc/keychain/metadata/*`, serial);
  await Utils.runShell(`rm -rf /data/misc/profiles/cur/0/`, serial);
  await Utils.runShell(`rm -rf /data/misc/profiles/ref/0/`, serial);
  // xoá nâng cao để làm sạch các gói
  if (!allPackages) return;
  let pack = Utils.getPackagesToWipe().filter((x) => allPackages.includes(x));
  if (pack.length == 0) return;
  while (pack.length) {
    let runCmd = pack.splice(0, 20);
    await Utils.runShell(
      `"${runCmd.map((x) => `rm -rf /data/data/${x}/*`).join(" && ")}"`,
      serial
    );
    await Utils.runShell(
      `"${runCmd.map((x) => `rm -rf /data/user_de/0/${x}/*`).join(" && ")}"`,
      serial
    );
    await Utils.runShell(
      `"${runCmd.map((x) => `rm -rf /data/user/0/${x}/*`).join(" && ")}"`,
      serial
    );
    await Utils.runShell(
      `"${runCmd
        .map((x) => `rm -rf /data/misc/profiles/cur/0/${x}/*`)
        .join(" && ")}"`,
      serial
    );
    await Utils.runShell(
      `"${runCmd
        .map((x) => `rm -rf /data/misc/profiles/ref/0/${x}/*`)
        .join(" && ")}"`,
      serial
    );
  }
};

Utils.getPackagesToWipe = function () {
  try {
    let config = JSON.parse(localStorage.getItem("packages"));
    if (!config || config.length == 0) return PACKAGES;
    return config;
  } catch {
    return PACKAGES;
  }
};

Utils.getListProxyRegMail = function () {
  try {
    return JSON.parse(localStorage.getItem("input-proxy-mail"));
  } catch {
    return null;
  }
};

Utils.getListLinkYoutube = function () {
  try {
    return JSON.parse(localStorage.getItem("auto-youtube-link"));
  } catch {
    return null;
  }
};

Utils.wipe = async function (serial, packageName) {
  await Utils.runShell(`am force-stop ${packageName}`, serial);
  return Utils.runShell(`pm clear ${packageName}`, serial);
};
Utils.wipeAll = async function (serial) {
  let allPackages = await Utils.getAllPackages(serial);
  if (!allPackages) return;
  var data = Utils.getPackagesToWipe().filter((x) => allPackages.includes(x));
  if (data.length == 0) return;
  while (data.length) {
    let runCmd = data.splice(0, 20);
    await Utils.runShell(
      `"${runCmd.map((x) => `am force-stop ${x}`).join(" && ")}"`,
      serial
    );
    await Utils.runShell(
      `"${runCmd.map((x) => `pm clear ${x}`).join(" && ")}"`,
      serial
    );
  }
  // wipe sdcard
  let folder = await Utils.getSdcardFolder(serial);
  for (let i = 0; i < folder.length; i++) {
    if (folder[i].includes("Android")) {
      await Utils.runShell(`rm -rf /sdcard/Android/data`, serial);
      continue;
    }
    await Utils.runShell(`rm -rf /sdcard/${folder[i]}`, serial);
  }
};

Utils.mountSystemTwrp = async function (serial) {
  for (let i = 0; i < 3; i++) {
    let result = await Utils.runShell("twrp mount /system", serial);
    if (result.stdout.includes("Mounted")) {
      break;
    }
    await Utils.sleep(2000);
  }
  // Untick readony
  await Utils.runShell("mount -o rw,remount /system", serial);
};

Utils.getExcludeRestores = function () {
  let excludeFiles = [
    "data/system/packages.list",
    "data/system/package-cstats.list",
    "data/system/package-dex-usage.list",
    "data/system/packages-warnings.xml",
    "data/system/packages.xml",
    "data/system/package_cache",
    "data/system/locksettings.db",
    "data/system/settings_fingerprint.xml",
    "data/system/dropbox",
    "data/system/netstats",
    "data/system/procstats",
    "data/system/usagestats",
    "data/system/syncmanager-log",
    "data/system/graphicsstats",
    "data/system/users/0/runtime-permissions.xml",
  ];
  return excludeFiles.map((x) => `--exclude ${x}`).join(" ");
};

// Define alert
Utils.alertError = function (msg) {
  Swal.fire({
    icon: "error",
    title: "Oops...",
    text: msg || "",
  });
};
Utils.alertInfo = function (title, msg) {
  Swal.fire({
    icon: "info",
    title,
    text: msg,
  });
};
// End Define alert

const PROP_FILES = [
  "/system/system/vendor/odm/etc/build.prop",
  "/system/vendor/odm/etc/build.prop",
  "/system/system/vendor/build.prop",
  "/system/vendor/build.prop",
  "/system/system/build.prop",
  "/system/build.prop",
  "/system/product/build.prop",
  "/system/system/product/build.prop",
];
Utils.createBackupProp = async function (serial) {
  for (let i = 0; i < PROP_FILES.length; i++) {
    let file = PROP_FILES[i];
    let fileBk = file + "_bk";
    let existFileBk = await Utils.exist(fileBk, serial);
    if (existFileBk) continue;
    let existFile = await Utils.exist(file, serial);
    if (!existFile) continue;
    await Utils.runShell(`cp ${file} ${fileBk}`, serial);
  }
};

Utils.createTempFile = async function () {
  return `./` + uuidv4();
};

Utils.getDeviceModel = async function (serial) {
  return (
    await Utils.runShell(`getprop ro.product.model`, serial)
  ).stdout.trim();
};

Utils.fixPadProps = async function (serial) {
  let model = await Utils.getDeviceModel(serial);
  let propPath = "/system/system/build.prop";
  let exists = await Utils.exist("/system/build.prop", serial);
  if (exists) propPath = "/system/build.prop";
  let rawProps = (await Utils.runShell(`cat ${propPath}`, serial)).stdout;
  rawProps = rawProps.replace(/userdebug/g, "user");
  rawProps += "\nro.debuggable=0";
  if (model == "Mi A2") {
    await Utils.runShell(`echo "" > ${propPath}`, serial);
    let batches = _.chunk(rawProps.split("\n"), 20);
    for (let i = 0; i < batches.length; i++) {
      let lines = batches[i];
      await Utils.runShell(
        `"${lines.map((x) => `echo "${x}" >> ${propPath}`).join(" && ")}"`,
        serial
      );
    }
  } else {
    let tmpFile = await Utils.createTempFile();
    fs.writeFileSync(tmpFile, rawProps);
    await Utils.runAdb(`-s ${serial} push ${tmpFile} ${propPath}`);
    fs.unlinkSync(tmpFile);
  }
};

Utils.changeProps = async function (props, serial) {
  if (!props || !serial) return;
  await Utils.createBackupProp(serial);
  props = props.split("\n");
  let odmProps = props.filter((x) => x.includes("odm") || x.includes("gsm"));
  let vendorProps = props.filter(
    (x) => x.includes("vendor") || x.includes("bootimage") || x.includes("gsm")
  );
  let systemProps = props.filter(
    (x) => x.includes("system") || x.includes("gsm")
  );
  let productProps = props.filter(
    (x) =>
      x.includes("ro.product") ||
      x.includes("ro.vendor.build.version.incremental") ||
      x.includes("ro.odm.build.version.incremental") ||
      x.includes("gsm")
  );
  let rawProps = props.filter(
    (x) =>
      (!x.includes("odm") && !x.includes("vendor") && !x.includes("system")) ||
      x.includes("gsm")
  );
  let fixDetectDebug = await Utils.getSingleSetting("fix-pad-fgo");
  let isHero = await Utils.isHeroLte(serial);

  if (fixDetectDebug) {
    rawProps.push("ro.debuggable=0");
  }

  let model = await Utils.getDeviceModel(serial);
  if (model == "Mi A2") {
    // product props
    await Utils.runShell(`rm -rf /system/system/product/build.prop`, serial);
    await Utils.runShell(
      `cp /system/system/product/build.prop_bk /system/system/product/build.prop`,
      serial
    );
    await Utils.runShell(
      `"${[...(odmProps || []), ...(vendorProps || [])]
        .map((x) => `echo "${x}" >> /system/system/product/build.prop`)
        .join(" && ")}"`,
      serial
    );
    // system props
    await Utils.runShell(`rm -rf /system/system/build.prop`, serial);
    await Utils.runShell(
      `cp /system/system/build.prop_bk /system/system/build.prop`,
      serial
    );
    await Utils.runShell(
      `"${[...systemProps, ...rawProps]
        .map((x) => `echo "${x}" >> /system/system/build.prop`)
        .join(" && ")}"`,
      serial
    );
  } else {
    for (let i = 0; i < PROP_FILES.length; i++) {
      let file = PROP_FILES[i];
      let fileBk = file + "_bk";
      let existFileBk = await Utils.exist(fileBk, serial);
      if (!existFileBk) continue;
      let myProps;

      if (file.includes("odm/etc/build.prop")) myProps = odmProps;
      if (file.includes("vendor/build.prop")) myProps = vendorProps;
      if (file.includes("product/build.prop")) myProps = productProps;
      if (file.includes("system/build.prop"))
        myProps = [...systemProps, ...rawProps];

      if (!myProps) continue;
      let orgProps = (await Utils.runShell(`cat ${fileBk}`, serial)).stdout;
      if (fixDetectDebug) {
        orgProps = orgProps.replace(/userdebug/g, "user");
      }
      let finalProps = [
        ...orgProps.split("\n"),
        "# start my props",
        ...myProps,
        "# end my props",
      ];
      let tmpFile = await Utils.createTempFile();
      fs.writeFileSync(tmpFile, finalProps.join("\n"));
      await Utils.runAdb(`-s ${serial} push ${tmpFile} ${file}`);
      fs.unlinkSync(tmpFile);
    }
    if (fixDetectDebug && isHero) {
      await Utils.fixMissingDebug(serial);
    }
  }
};

Utils.resetProps = async function (serial) {
  for (let i = 0; i < PROP_FILES.length; i++) {
    let file = PROP_FILES[i];
    let fileBk = file + "_bk";
    let existFileBk = await Utils.exist(fileBk, serial);
    if (!existFileBk) continue;
    await Utils.runShell(`cp -f ${fileBk} ${file}`);
  }
};

Utils.openUserApp = async function (serial, packageName) {
  return Utils.runShell(
    `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`,
    serial
  );
};

Utils.openApp = async function (serial, packageName) {
  return Utils.runShell(`am start "${packageName}"`, serial);
};

Utils.openChPlay = async function (serial) {
  return Utils.openApp(serial, "com.android.vending");
};

Utils.forceStopApp = async function (serial, packageName) {
  await Utils.runShell(`am force-stop ${packageName}`, serial);
  return Utils.runShell(`am kill ${packageName}`, serial);
};

Utils.stopChPlay = async function (serial) {
  return Utils.forceStopApp(serial, "com.android.vending");
};

Utils.stopSettings = async function (serial) {
  return Utils.forceStopApp(serial, "com.android.settings");
};

Utils.getPointFromUi = function (xml, query) {
  try {
    if (!xml || !query) throw new Error();
    let pattern = new RegExp(`(${query}.+?)>`, "i");
    let node = (xml || "").match(pattern)[1];
    if (!node) throw new Error();
    let values = node
      .match(/\[.*\]/)[0]
      .match(/\d+/g)
      .map((x) => Number(x));
    let point = {
      x: Math.floor((values[0] + values[2]) / 2),
      y: Math.floor((values[1] + values[3]) / 2),
    };
    return point;
  } catch (err) {
    return { x: null, y: null };
  }
};

Utils.getGmailFromUi = function (xml) {
  try {
    if (!xml) throw new Error();
    var user = xml.match(
      /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
    );
    var len = user.length;
    var rGmail = randomInteger(1, len) - 1;
    return user[rGmail];
  } catch (err) {
    return { x: null, y: null };
  }
};

Utils.input = async function (serial, text, isClear = false, lengClear = 12) {
  if (isClear) {
    await Utils.sendkey(serial, "123");
    var clear = "";
    for (let i = 0; i < lengClear; i++) {
      clear = clear + " 67";
    }
    await Utils.sendkey(serial, `--longpress ${clear}`);
  }
  return Utils.runShell(`"input text '${text}'"`, serial);
};

Utils.sendkey = async function (serial, key) {
  return Utils.runShell(`input keyevent ${key}`, serial);
};
Utils.enter = async function (serial) {
  return Utils.sendkey(serial, "KEYCODE_ENTER");
};
Utils.back = async function (serial) {
  return Utils.sendkey(serial, "KEYCODE_BACK");
};
Utils.home = async function (serial) {
  return Utils.sendkey(serial, "KEYCODE_HOME");
};
Utils.tab = async function (serial) {
  return Utils.sendkey(serial, "KEYCODE_TAB");
};
Utils.openAddAccount = async function (serial) {
  await Utils.forceStopApp(serial, "com.google.android.gms");
  return Utils.runShell(
    "am start -n com.google.android.gms/.auth.uiflows.addaccount.AccountIntroActivity",
    serial
  );
};
Utils.openRemoveAccount = async function (serial) {
  return Utils.runShell("am start -a android.settings.SYNC_SETTINGS", serial);
};
function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
Utils.tap = async function (serial, x, y) {
  x += randomInteger(5, 25);
  y += randomInteger(5, 25);
  return Utils.runShell(`input tap ${x} ${y}`, serial);
};
Utils.tapDynamic = async function (serial, xml, query) {
  let { x, y } = Utils.getPointFromUi(xml, query);
  if (!x || !y) return;
  return Utils.tap(serial, x, y);
};

Utils.getPosTapDynamic = async function (xml, query) {
  let { x, y } = Utils.getPointFromUi(xml, query);
  if (!x || !y) return;
  return { x, y };
};

Utils.inputDynamic = async function (serial, xml, query, text) {
  let { x, y } = Utils.getPointFromUi(xml, query);
  if (!x || !y) {
    return Utils.input(serial, text);
  }
  await Utils.tap(serial, x, y);
  await Utils.sleep(500);
  return Utils.input(serial, text);
};

Utils.swipeUp = async function (serial) {
  return Utils.runShell("input swipe 500 1700 50 50", serial);
};

Utils.swipeHorizontal = async function (serial, x1, y1, x2, y2) {
  let rNumber = randomInteger(5, 50);
  x1 += rNumber;
  y1 += rNumber;
  x2 += rNumber;
  y2 += rNumber;
  return Utils.runShell(`input swipe ${x1} ${y1} ${x2} ${y2}`, serial);
};

Utils.swipeVertical = async function (serial, x1, y1, x2, y2) {
  let rNumber = randomInteger(5, 50);
  x1 += rNumber;
  y1 += rNumber;
  x2 += rNumber;
  y2 += rNumber;
  return Utils.runShell(`input swipe ${x1} ${y1} ${x2} ${y2}`, serial);
};

Utils.getUiDump = async function (serial, toLower = true, toError = false) {
  var resutl = await Utils.runShell("uiautomator dump", serial);
  if (toError) {
    if (resutl.stderr.includes("could not get idle state")) {
      return "could not get idle state";
    }
  }
  if (toLower) {
    return (
      await Utils.runShell("cat /sdcard/window_dump.xml", serial)
    ).stdout.toLowerCase();
  }
  return (await Utils.runShell("cat /sdcard/window_dump.xml", serial)).stdout;
};

Utils.getStore = async function (serial, updateStatus) {
  await Utils.home(serial);
  updateStatus(serial, "Open Get Store");
  await Utils.stopChPlay(serial);
  await Utils.CHplayAccount(serial);
  await Utils.sleep(Random(3000, 4000));
  let startTime = new Date().getTime();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (isStopAuto || (await Utils.DeviceCallStopChecker(serial))) {
      Utils.alertError("Stopped Auto");

      return false;
    }
    let currentTime = new Date().getTime();
    if (currentTime - startTime > 120 * 1000) {
      Utils.alertError("Timeout, Stopped");

      updateStatus(serial, "Timeout, Stopped");

      return false;
    }
    let ui = await Utils.getUiDump(serial);
    if (ui.includes("terms of service") && ui.includes("accept")) {
      updateStatus(serial, "Terms Of Service");
      await Utils.tapDynamic(serial, ui, "accept");
      continue;
    }
    if (ui.includes("stay in the loop")) {
      await Utils.tapDynamic(serial, ui, "yes,");
      continue;
    }
    if (ui.includes("account") && ui.includes("payment methods")) {
      updateStatus(serial, "Payment Methods");
      await Utils.tapDynamic(serial, ui, 'text="account"');
      continue;
    }
    if (ui.includes("show navigation drawer")) {
      await Utils.tapDynamic(serial, ui, "show navigation drawer");
      continue;
    }
    if (ui.includes('"preferences"') && ui.includes('"country and profiles"')) {
      if (ui.includes('"united states"')) {
        Utils.alertError("Mail Bị Dính Country US, Stopped");

        updateStatus(serial, "Mail Bị Dính Country US, Stopped");

        return false;
      }

      return true;
    }
    if (
      ui.includes("earn points on everything you buy") ||
      (ui.includes("for you") && ui.includes("top charts")) ||
      ui.includes(
        "you can choose additional search services for your device"
      ) ||
      (ui.includes("try again") && ui.includes("retry")) ||
      (ui.includes('"settings"') && ui.includes('"about google play"'))
    ) {
      updateStatus(serial, "Network Error, Reloading");

      await Utils.stopChPlay(serial);

      await Utils.CHplayAccount(serial);

      await Utils.sleep(Random(3000, 4000));

      continue;
    }
    if (ui.includes("com.android.launcher3")) {
      updateStatus(serial, "Kickout Home, Reloading");

      await Utils.stopChPlay(serial);

      await Utils.CHplayAccount(serial);

      await Utils.sleep(Random(3000, 4000));

      continue;
    }

    await Utils.sleep(Random(1000, 2000));
  }
};
Utils.checkIp = async function (serial) {
  let res = (await Utils.runShell("curl http://ip-api.com/json", serial))
    .stdout;
  res = JSON.parse(res);
  return res.countryCode;
};

Utils.getSerials = async function () {
  try {
    let r = await Utils.runAdb("devices");
    // return r.stdout.match(/(\w+)\tdevice/g).map(x => x.replace('\tdevice', ''));
    return r.stdout
      .match(/(\w+)\t/g)
      .map((x) => x.replace("\t", ""))
      .sort();
  } catch (err) {
    return [];
  }
};
Utils.getProps = async function (serial) {
  let props = {};
  let result = await Utils.runShell('"getprop | grep ro."', serial);
  result.stdout.split("\n").forEach((x) => {
    if (!x) return;
    props[x.split("]: [")[0].replace("[", "")] = x
      .split("]: [")[1]
      .replace("]", "");
  });
  return props;
};
Utils.getWinInfo = async function (serial) {
  let infoFolder = "/system/vendor/Utils";
  if (await Utils.exist("/system/etc/Utils", serial)) {
    infoFolder = "/system/etc/Utils";
  }
  let keys = ((await Utils.runShell(`ls ${infoFolder}`, serial)).stdout || "")
    .split("\n")
    .filter((x) => x)
    .map((x) => x.trim());

  let winInfo = {};
  await Promise.all(
    keys.map(async (k) => {
      let v = (await Utils.runShell(`cat ${infoFolder}/` + k, serial)).stdout;
      winInfo[k] = Utils.decryptProp(v);
    })
  );
  if (!winInfo["model"]) {
    winInfo["model"] = (
      await Utils.runShell("getprop ro.product.model", serial)
    ).stdout;
  }
  if (!winInfo["manufacturer"]) {
    winInfo["manufacturer"] = (
      await Utils.runShell("getprop ro.product.manufacturer", serial)
    ).stdout;
  }
  return winInfo;
};

Utils.getSdcardFolder = async function (serial) {
  let infoFolder = "/sdcard";
  let keys = ((await Utils.runShell(`ls ${infoFolder}`, serial)).stdout || "")
    .split("\n")
    .filter((x) => x)
    .map((x) => x.trim());
  return keys;
};

Utils.getDeviceInfo = async function (serial) {
  let props = await Utils.getProps(serial);
  let mapping = {
    brand: "ro.product.brand",
    model: "ro.product.model",
  };
  let winInfo = await Utils.getWinInfo(serial);
  for (const k in winInfo) {
    let v = winInfo[k];
    if (v) continue;
    winInfo[k] = props[mapping[k]];
  }
  if (Object.keys(winInfo).length == 0) {
    for (const k in mapping) {
      const v = mapping[k];
      winInfo[k] = props[v];
    }
  }
  let nameResult = await Utils.runShell(`cat /data/local/tmp/win_name`, serial);
  winInfo["win_name"] = nameResult.stdout.includes("No such file")
    ? ""
    : nameResult.stdout;
  return winInfo;
};
Utils.getDeviceInfoName = async function (serial) {
  let props = await Utils.getProps(serial);
  let mapping = {
    brand: "ro.product.brand",
    model: "ro.product.model",
  };
  let winInfo = {};
  for (const k in winInfo) {
    let v = winInfo[k];
    if (v) continue;
    winInfo[k] = props[mapping[k]];
  }
  if (Object.keys(winInfo).length == 0) {
    for (const k in mapping) {
      const v = mapping[k];
      winInfo[k] = props[v];
    }
  }
  winInfo["win_name"] = (
    await Utils.runShell(`cat /data/local/tmp/win_name`, serial)
  ).stdout;
  return winInfo;
};
Utils.getInstalledPackages = async function (serial) {
  let res = await Utils.runShell('pm list packages -3"|cut -f 2 -d ":', serial);
  return res.stdout.split("\n");
};

Utils.getAllPackages = async function (serial) {
  let res = await Utils.runShell('pm list packages"|cut -f 2 -d ":', serial);
  if (res.stdout == "") return;
  return res.stdout.split("\n").map((x) => x.trim());
};

// Device utility
Utils.showVysor = async function (serial, title) {
  let cmd = `${SCRCPY_DIR} -s ${serial}`;
  if (title) cmd += ` --window-title "${title.replace(/\n/g, "")}"`;
  return Utils.run(cmd);
};
Utils.getWinName = async function (serial) {
  return (await Utils.runShell(`cat /data/local/tmp/win_name`, serial)).stdout;
};
Utils.setWinName = async function (serial, name) {
  if (!serial || !name) return;
  return Utils.runShell(`"echo "${name}" > /data/local/tmp/win_name"`, serial);
};
Utils.deleteWinName = async function (serial) {
  if (!serial) return;
  return Utils.runShell(`rm -rf /data/local/tmp/win_name`, serial);
};
Utils.openDefaultBrowser = async function (serial, link) {
  if (!serial || !link) return;
  return Utils.runShell(
    `am start -a "android.intent.action.VIEW" -d "${link}"`,
    serial
  );
};
Utils.openChrome = async function (serial, link) {
  if (!serial || !link) return;
  return Utils.runShell(
    `am start -n com.android.chrome/com.google.android.apps.chrome.Main -a android.intent.action.VIEW -d '${link}'`,
    serial
  );
};
Utils.openYoutube = async function (serial, link) {
  if (!serial || !link) return;
  return Utils.runShell(
    `am start -a android.intent.action.VIEW -d '${link}'`,
    serial
  );
};

// End Device utility

Utils.setSetting = async function (k, v) {
  if (!k) return;
  let settings = await Utils.getSettings();
  settings[k] = v;
  localStorage.setItem("settings", JSON.stringify(settings));
};
Utils.getSingleSetting = async function (k) {
  if (!k) return "";
  let settings = await Utils.getSettings();
  return settings[k] || "";
};
Utils.getSettings = async function () {
  let settings = localStorage.getItem("settings");
  if (!settings) return {};
  return JSON.parse(settings);
};

function Random(from, to) {
  return Math.floor(Math.random() * (to - from)) + from;
}

// eslint-disable-next-line no-unused-vars
function RandomString(StringLength) {
  let Chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let CharsLength = Chars.length;

  let CreateString = "";

  for (let index = 0; index < StringLength; index++) {
    CreateString += Chars.substr(Math.floor(Math.random() * CharsLength), 1);
  }

  return CreateString;
}

// eslint-disable-next-line no-unused-vars
function randomNumber(NumberLength) {
  let Chars = "0123456789";

  let CharsLength = Chars.length;

  let CreateNumber = "";

  for (let index = 0; index < NumberLength; index++) {
    CreateNumber += Chars.substr(Math.floor(Math.random() * CharsLength), 1);
  }

  return CreateNumber;
}

Utils.Roll = async function (serial, Scroll, isPress = false) {
  await Utils.runShell(`input roll ${Scroll} ${Scroll}`, serial);

  if (isPress) {
    await Utils.runShell(`input trackball press`, serial);
  }
};

Utils.CheckWifi = async function (serial) {
  for (let index = 0; index < 50; index++) {
    if (await Utils.WifiIsOn(serial)) return true;

    await Utils.sleep(500);
  }

  return false;
};

Utils.WifiIsOn = async function (serial) {
  let res = await Utils.runShell('"dumpsys wifi | grep mNetworkInfo"', serial);
  return res.stdout.includes("CONNECTED/CONNECTED");
};

Utils.ScreenIsDisplay = async function (serial) {
  let res = await Utils.runShell('"dumpsys window | grep screenState"', serial);
  return res.stdout.includes("SCREEN_STATE_ON");
};

Utils.TurnOnScreen = async function (serial) {
  await Utils.runShell("input keyevent KEYCODE_POWER", serial);
};

Utils.TurnOffScreen = async function (serial) {
  await Utils.runShell("input keyevent 26", serial);
};

Utils.GoHomeScreen = async function (serial) {
  await Utils.runShell("input keyevent 82", serial);
};

Utils.CHplayLoadLink = async function (serial, link) {
  await Utils.runShell(
    `am start -n com.android.vending/com.google.android.finsky.activities.MainActivity -a android.intent.action.VIEW -d "${link}"`,
    serial
  );
};

Utils.CHplayPaymentMethods = async function (serial) {
  await Utils.CHplayLoadLink(
    serial,
    "https://play.google.com/store/paymentmethods"
  );
};

Utils.CHplayAccount = async function (serial) {
  await Utils.CHplayLoadLink(serial, "https://play.google.com/store/account");
};

Utils.CHplayOrderHistory = async function (serial) {
  await Utils.CHplayLoadLink(
    serial,
    "https://play.google.com/store/account/orderhistory"
  );
};

Utils.ScanAccountIsDie = async function (serial) {
  let res = await Utils.runShell('"dumpsys notification', serial);
  return res.stdout.includes("Account action required");
};

Utils.ScanGmailAccountInsideDevice = async function (serial) {
  let Result = (await Utils.runShell('"dumpsys account | grep name"', serial))
    .stdout;

  let Regex = /\s*\s*Account\s*{name=(.*?),\s*type=com.google}/g;

  let ArrayTextContent = [];

  while ((C = Regex.exec(Result)))
    ArrayTextContent.push(
      `${C[1]
        .replace(/@googlemail.com/g, "")
        .replace(/@gmail.com/g, "")
        .replace(/\./g, "")
        .replace(/-/g, "")}`
    );

  return ArrayTextContent;
};

Utils.CompareAccountWithAccountInsideDevice = async function (serial, Mail) {
  Mail = `${Mail.replace(/@googlemail.com/g, "")
    .replace(/@gmail.com/g, "")
    .replace(/\./g, "")
    .replace(/-/g, "")}`;

  let ArrayTextContent = await Utils.ScanGmailAccountInsideDevice(serial);

  for (let index = 0; index < ArrayTextContent.length; index++) {
    if (ArrayTextContent[index].toLowerCase().includes(Mail.toLowerCase()))
      return true;
  }

  return false;
};

Utils.CheckGoogleWallet = async function (serial, MaxCheckCounter = 10) {
  for (let index = 0; index < MaxCheckCounter; index++) {
    let Dump = await Utils.getUiDump(serial, false);

    if (
      Dump.includes("Diamonds") &&
      Dump.includes("Beans") &&
      Dump.includes("Coins") &&
      (Dump.includes('index="0" text="Google Wallet"') ||
        Dump.includes('index="1" text="Google Wallet"'))
    )
      return true;

    await Utils.sleep(2000);
  }

  return false;
};

Utils.SetAutoAction = async function (isStopCall) {
  isStopAuto = isStopCall;
};

Utils.GetAutoAction = async function () {
  return isStopAuto;
};

Utils.SetStopForDeviceAction = async function (serial) {
  serialsListForStopAction.push(serial);
};

Utils.DeviceCallStopChecker = async function (serial) {
  for (let index = 0; index < serialsListForStopAction.length; index++) {
    if (serialsListForStopAction[index].includes(serial)) {
      serialsListForStopAction.splice(index, 1);
      return true;
    }
  }
  return false;
};

Utils.getDeviceProxy = async function (serial) {
  try {
    let raw = (await Utils.runShell("settings get global http_proxy", serial))
      .stdout;
    let result = raw.split(":");
    if (!result[0] || !result[1]) return "";
    if (result[0].length > 1) return `${result[0]}:${result[1]}`;
    return "";
  } catch (er) {
    return "";
  }
};

Utils.getSizeScreen = async function (serial) {
  try {
    let raw = (await Utils.runShell("wm size", serial)).stdout;
    let result = raw.match(/\d+/g);
    return result;
  } catch (er) {
    return "";
  }
};

Utils.getIpByApi = async function (serial, api) {
  let proxy = await Utils.getDeviceProxy(serial);
  let cmd = `curl ${api}` + (proxy ? ` -x ${proxy}` : "");
  return (await Utils.runShell(`"${cmd}"`, serial)).stdout;
};

Utils.getIpJson = async function (serial) {
  try {
    let result = await Utils.getIpByApi(serial, "http://ip-api.com/json");
    return JSON.parse(result);
  } catch (er) {
    return {};
  }
};

Utils.getIpLine = async function (serial) {
  return await Utils.getIpByApi(serial, "http://ip-api.com/line");
};

Utils.pickRandom = function (list) {
  return list[Math.floor(Math.random() * list.length)];
};

// clear proxy
Utils.clearProxy = async function (serial) {
  if (!serial) return;
  return Utils.runShell("settings put global http_proxy :0", serial);
};

// set proxy
Utils.setProxy = async function (serial, proxy) {
  if (!serial || !proxy) return;
  const arrProxy = proxy.split(":");
  // clear proxy cũ nếu có
  await Utils.runShell("settings put global http_proxy :0", serial);
  if (arrProxy.length > 1) {
    var ip = arrProxy[0].trim();
    var port = arrProxy[1].trim();
    await Utils.runShell(
      `settings put global http_proxy ${ip}:${port}`,
      serial
    );
  }
  if (arrProxy.length > 3) {
    var user = arrProxy[2].trim();
    var pass = arrProxy[3].trim();
    await Utils.runShell(
      `settings put global global_http_proxy_username ${user}`,
      serial
    );
    await Utils.runShell(
      `settings put global global_http_proxy_password ${pass}`,
      serial
    );
  }
};

Utils.getCountryPhone = async function (serial) {
  if (!serial) return;
  return (
    await Utils.runShell(`getprop gsm.sim.operator.iso-country`, serial)
  ).stdout.trim();
};

Utils.getOperatorName = async function (serial) {
  if (!serial) return;
  return (
    await Utils.runShell(`getprop gsm.sim.operator.alpha`, serial)
  ).stdout.trim();
};

Utils.getCarrierCode = async function (serial) {
  if (!serial) return;
  return (
    await Utils.runShell(`getprop gsm.sim.operator.numeric`, serial)
  ).stdout.trim();
};

Utils.isInternet = async function (serial) {
  if (!serial) return;
  return (
    await Utils.runShell(`ping -c1 www.google.com`, serial)
  ).stdout.includes("bytes of data");
};

Utils.TurnOnAirplane = async function (serial) {
  if (!serial) return;
  await Utils.runShell(`settings put global airplane_mode_on 1`, serial);
};

Utils.TurnOffAirplane = async function (serial) {
  if (!serial) return;
  await Utils.runShell(`settings put global airplane_mode_on 0`, serial);
  await Utils.runShell(
    `am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false`,
    serial
  );
};

// set không cho xoay
Utils.setPortrait = async function (serial) {
  await Utils.runShell(
    "content insert --uri content://settings/system --bind name:s:accelerometer_rotation --bind value:i:0",
    serial
  );
  await Utils.runShell(
    "content insert --uri content://settings/system --bind name:s:user_rotation --bind value:i:0",
    serial
  );
};
