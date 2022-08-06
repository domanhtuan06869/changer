const fs = require('fs');
const _ = require('lodash');
const dateFormat = require('dateformat');
const express = require('express');
const getRawBody = require('raw-body');
const Busboy = require('busboy');
const cookieParser = require('cookie-parser')();
const cors = require('cors');
const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
})

const { 
  randomNumber, 
  randomItem, 
  random, 
  randomText, 
  getRndInteger, 
  randomAlphaNumberic, 
  randomIMEI, 
  randomPhoneNumber, 
  randomMac ,
} = require('./common');

const badRequest = { code: 400, message: 'Bad Request!' };

app.use(cors());
app.use(cookieParser);

app.use((req, res, next) => {
  if (req.rawBody === undefined
    && req.method === 'POST'
    && req.headers['content-type'].startsWith('multipart/form-data')) {
    getRawBody(req, {
      length: req.headers['content-length'],
      limit: '5mb',
      encoding: contentType.parse(req).parameters.charset
    }, (err, string) => {
      if (err) return next(err);
      req.rawBody = string;
      return next();
    });
  } else {
    next();
    return;
  }
});

app.use((req, res, next) => {
  if (req.method === 'POST' && req.headers['content-type'].startsWith('multipart/form-data')) {
    const busboy = new Busboy({ headers: req.headers });
    let fileBuffer = new Buffer('');
    req.files = {
      file: []
    };

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data])
      })

      file.on('end', () => {
        const file_object = {
          fieldname,
          'originalname': filename,
          encoding,
          mimetype,
          buffer: fileBuffer
        }

        req.files.file.push(file_object)
      })
    })

    busboy.on('finish', () => {
      next()
    })

    busboy.end(req.rawBody)
    req.pipe(busboy)
  } else {
    return next();
  }
});

// Load devices, networks to memory
let networks = JSON.parse(fs.readFileSync(`${__dirname}/wininfo/network.json`));
let macData = JSON.parse(fs.readFileSync(`${__dirname}/wininfo/mac_data.json`));
let androidVersion = JSON.parse(fs.readFileSync(`${__dirname}/wininfo/sdk.json`));
let deviceInfos = JSON.parse(fs.readFileSync(`${__dirname}/wininfo/x_devices.json`));

const DEVICES_ORG = {};
const MANS_ORG = [];
for (let i = 0; i < deviceInfos.length; i++) {
  let item = deviceInfos[i];
  if (!DEVICES_ORG[item['Manufacturer']]) {
    DEVICES_ORG[item['Manufacturer']] = [item];
  } else {
    DEVICES_ORG[item['Manufacturer']].push(item);
  }
  if (!MANS_ORG.includes(item['Manufacturer'])) {
    MANS_ORG.push(item['Manufacturer'])
  }
}

// shorthand version of network
let networkShort = [];
networks.forEach(n => {
  let network = networkShort.find(x => x.code === n.NetworkCountryIso);
  if (!network) {
    networkShort.push({
      code: n.NetworkCountryIso,
      operators: [
        {
          code: n.NetworkOperator,
          name: n.NetworkOperatorName
        }
      ]
    });
    return;
  }
  let code = network.operators.find(x => x.code === n.NetworkOperator);
  network.operators.push({
    code: n.NetworkOperator,
    name: n.NetworkOperatorName
  })
});

// Utils functions
function getNetwork (countryIso, operator) {
  networks.forEach(x => {
    (x.Format || []).forEach(a => {
        if (isNaN(a.PhoneHead)){
          console.log(a.PhoneHead);
        }
    })
  })
  if (!countryIso) return randomItem(networks);
  let byCountry = networks.filter(x => x.NetworkCountryIso === countryIso.toUpperCase());
  if (byCountry.length === 0) return randomItem(networks);
  if (!operator) return randomItem(byCountry);
  let byOperator = byCountry.filter(x => x.NetworkOperator === operator);
  if (byOperator.length === 0) return randomItem(byCountry);
  return randomItem(byOperator);
}
function randomNewMac () {
  let mac = randomItem(macData);
  let macFake = randomMac();
  return `${mac.short}:${macFake.substr(0,8)}`;
}
function randomMacWithPrefix (prefix) {
  let macFake = randomMac();
  return `${prefix}:${macFake.substr(0,8)}`;
}
function randomSsid() {
  let arr = ["TP-", "FAST_", "Tenda_", "TP-LINK_", "MERCURY_"];
  let prefix = randomItem(arr);
  return `${prefix}${random('XX_XX')}`;
}
function randomDateUtc() {
  let year = getRndInteger(2015, 2019);
  let month = getRndInteger(1, 12);
  let day = getRndInteger(1, 28);
  let hour = getRndInteger(1, 23);
  let minute = getRndInteger(1, 60);
  let second = getRndInteger(1, 60);
  let ms = getRndInteger(1,999);
  return new Date(year, month, day, hour, minute, second, ms).getTime();
}
function randomDate(utc) {
  let zones = ["GMT", "UTC", "ECT", "EET", "ART", "EAT", "MET", "NET", "PLT", "IST", "BST", "VST", "CTT", "JST", "ACT",
  "AET", "SST", "NST", "MIT", "HST", "AST", "PST", "PNT", "MST", "CST", "EST", "IET", "PRT", "CNT", "AGT",
  "BET", "CAT"];
  let zone = randomItem(zones);
  return dateFormat(new Date(utc), "dddd mmmm d HH:MM:ss _pp_ yyyy").toString().replace('_pp_', zone);
}
function gen4Props(k, v) {
  let arr = [];
  arr.push(`${k.replace('.*', '')}=${v}`);
  arr.push(`${k.replace('*', 'odm')}=${v}`);
  arr.push(`${k.replace('*', 'system')}=${v}`);
  arr.push(`${k.replace('*', 'vendor')}=${v}`);
  return arr;
}

app.get('/change', (req, res) => {
  (async () => {
    try {
      let version = randomItem(androidVersion);
      if (req.query.sdk) {
        let tmp = androidVersion.find(x => x.sdk === req.query.sdk);
        if (tmp) version = tmp;
      }
      let sdk = version.sdk;
      let release = version.release;

      let man = req.query.brand;
      if (!MANS_ORG.includes(man)) {
        man = randomItem(MANS_ORG);
      }

      let info = randomItem(DEVICES_ORG[man]);

      let baseband = info["Baseband"]
      let board = info["Board"]
      let bootLoader = info["BootLoader"]
      let brand = info["Brand"]
      let device = info["Device"]
      let displayId = info["DisplayId"]
      let glRenderer = info["GlRenderer"]
      let glVendor = info["GlVendor"]
      let hardware = info["Hardware"]
      let manufacturer = info["Manufacturer"]
      let model = info["Model"]
      let platform = info["Platform"]
      let product = info["Product"]

      let dateUtc = randomDateUtc();
      let date = randomDate(dateUtc);
      dateUtc = Math.floor(dateUtc/1000);

      let buildType = 'user';
      let buildTags = 'release-keys';
      let buildId = randomAlphaNumberic(6, true);
      let buildUser = randomText('XXXXX').toLowerCase();
      let buildHost = randomText('XXXXXXXX');
      let buildIncremental = randomAlphaNumberic(14, true);

      let androidSerialNo = randomAlphaNumberic(18).toLowerCase();

      // {Product}-{BuildType} {Release} {BuildId} {Incremental} {BuildTags}
      let description = `${product}-${buildType} ${release} ${buildId} ${buildIncremental} ${buildTags}`;

      // $(PRODUCT_BRAND)/$(TARGET_PRODUCT)/$(TARGET_DEVICE):$(PLATFORM_VERSION)/$(BUILD_ID)/$(BF_BUILD_NUMBER):$(TARGET_BUILD_VARIANT)/$(BUILD_VERSION_TAGS)
      let fingerPrint = `${brand}/${product}/${device}:${release}/${buildId}/${buildIncremental}:${buildType}/${buildTags}`;

      let props = [];
      props = props.concat(gen4Props('ro.product.*.brand', brand));
      props = props.concat(gen4Props('ro.product.*.manufacturer', manufacturer));
      props = props.concat(gen4Props('ro.product.*.model', model));
      props = props.concat(gen4Props('ro.product.*.name', product));
      props = props.concat(gen4Props('ro.product.*.device', device));
      props = props.concat(gen4Props('ro.*.build.version.incremental', buildIncremental));
      props = props.concat(gen4Props('ro.*.build.id', buildId));
      props = props.concat(gen4Props('ro.*.build.type', buildType));
      props = props.concat(gen4Props('ro.*.build.tags', buildTags));
      props = props.concat(gen4Props('ro.*.build.fingerprint', fingerPrint));
      props.push(`ro.bootimage.build.fingerprint=${fingerPrint}`);
      props.push(`ro.build.product=${product}`);
      props.push(`ro.build.flavor=${product}-user`);
      props.push(`ro.lineage.device=${device}`);

      props.push(`ro.build.description=${description}`);

      props.push(`ro.bootimage.build.date.utc=${dateUtc}`);
      props.push(`ro.build.date.utc=${dateUtc}`);
      props.push(`ro.system.build.date.utc=${dateUtc}`);
      props.push(`ro.vendor.build.date.utc=${dateUtc}`);

      props.push(`ro.bootimage.build.date=${date}`);
      // props.push(`ro.build.date=${date}`);
      // props.push(`ro.system.build.date=${date}`);
      // props.push(`ro.vendor.build.date=${date}`);

      // props.push(`ro.build.user=${buildUser}`);
      // props.push(`ro.build.host=${buildHost}`);
      
      // props.push(`ro.boot.serialno=${androidSerialNo}`);
      // props.push(`ro.serialno=${androidSerialNo}`);
      
      // props.push(`ro.build.display.id=${displayId}`);

      // props.push(`gsm.version.baseband=${baseband}`);
      // props.push(`ro.boot.bootloader=${bootLoader}`);
      // props.push(`ro.bootloader=${bootLoader}`);
      // props.push(`ro.board.platform=${platform}`);
      // props.push(`ro.boot.hardware=${hardware}`);
      // props.push(`ro.hardware=${hardware}`);
      // props.push(`ro.product.board=${board}`);

      let CountryCode = (req.query.country || 'US').toUpperCase();
      let networkInfo = getNetwork(CountryCode, req.query.operator);
      let operator = networkInfo.NetworkOperator;
      CountryCode = networkInfo.NetworkCountryIso;

      let network = {};
      network['Ssid'] = randomSsid();
      network['Bssid'] = randomNewMac();
      network['MacAddress'] = randomNewMac().toLowerCase();

      let sim = {};
      sim['SimOperator'] = networkInfo.NetworkOperator;
      sim['SimOperatorName'] = networkInfo.NetworkOperatorName;
      sim['Mcc'] = operator.substr(0,3);
      sim['Mnc'] = operator.substr(3);
      sim['CountryCode'] = CountryCode;
      sim['IMEI'] = randomIMEI();
      let isoCode = networkInfo.PhoneCode.replace('+', '').substr(0,2);
      if (isoCode.length === 1) isoCode = '0' + isoCode;
      sim['SimSerial'] = `89${isoCode}${operator.substring(3, 5)}${getRndInteger(15, 20)}0${getRndInteger(1, 9)}${randomNumber(9)}`;
      sim['SubscriberId'] = operator + randomNumber(15 - operator.length);
      sim['PhoneNumber'] = randomPhoneNumber(networkInfo);

      let other = {};
      other['serial'] = androidSerialNo;
      other['androidID'] = randomAlphaNumberic(16).toLowerCase();
      other['AndroidSeri'] = randomAlphaNumberic(18).toLowerCase();
      other['GLVendor'] = glVendor;
      other['GLRenderer'] = glRenderer;
      other['release'] = release;
      other['sdk'] = sdk;
      other['BaseBand'] = baseband;
      other['BOOTLOADER'] = bootLoader;
      other['platform'] = platform;
      other['hardware'] = hardware;
      other['board'] = board;

      let wifi = {};
      wifi['wifiMac'] = randomNewMac();
      wifi['wifiName'] = `"${randomSsid()}"`;
      wifi['BSSID'] = randomNewMac();

      let infoResult = _.merge(network, sim, other, wifi);
      let fullInfo = _.clone(infoResult);
      fullInfo['fingerprint'] = fingerPrint;
      fullInfo['UserAgent'] = '';
      fullInfo['description'] = description;
      fullInfo['incremantal'] = buildIncremental;
      fullInfo['security_patch'] = '';
      fullInfo['BuildDate'] = date;
      fullInfo['DateUTC'] = dateUtc;
      fullInfo['lon'] = '';
      fullInfo['lat'] = '';
      fullInfo['displayId'] = displayId;
      fullInfo['radio'] = '';
      fullInfo['board'] = board;
      fullInfo['brand'] = brand;
      fullInfo['model'] = model;
      fullInfo['id'] = buildId;
      fullInfo['btype'] = buildType;
      fullInfo['btags'] = buildTags;
      fullInfo['buser'] = buildUser;
      fullInfo['host'] = buildHost;

      let dataRes = {
        'info': infoResult,
        'fullInfo': fullInfo,
        'props': props.join('\n'),
        // isVip: Boolean(user.isVip),
        // isVip: true,
        // key: req.params.key
      };
      // const iv = "0123456789abcdef";
      // return res.json({ code: 200, data: JSON.stringify(dataRes) });
      // return res.json( JSON.stringify(dataRes) );
      return res.json(dataRes);
    } catch (error) {
      console.log(error);
      return res.json(badRequest);
    }
  })();
})
