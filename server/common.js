const fs = require('fs');
const _ = require('lodash');
const libphonenumberJs = require("libphonenumber-js");
const crypto = require('crypto');

const keyBase64 = "/1hai030ZIkNAAAAAFlfXg==";
const keyBase64_second = "Y2I4OHB3bGVvMzkxYmRtcA==";

const Common = {}

function getAlgorithm (keyBase64) {
  var key = Buffer.from(keyBase64, 'base64');
  switch (key.length) {
    case 16:
      return 'aes-128-cbc';
    case 32:
      return 'aes-256-cbc';
  }
  throw new Error('Invalid key length: ' + key.length);
}

Common.base64Encode = function (plainText) {
  return Buffer.from(plainText).toString('base64');
}

Common.md5 = function (plainText) {
  return crypto.createHash('md5').update(plainText).digest('hex');
}

Common.genIv = function (id) {
  return Common.base64Encode(Common.md5(id).substr(0, 16));
}

Common.encrypt = function (plainText, ivBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const cipher = crypto.createCipheriv(getAlgorithm(keyBase64), key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64')
  encrypted += cipher.final('base64');
  return encrypted;
};
Common.encrypt2 = function (plainText, ivBase64) {
  const key = Buffer.from(keyBase64_second, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const cipher = crypto.createCipheriv(getAlgorithm(keyBase64_second), key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64')
  encrypted += cipher.final('base64');
  return encrypted;
};

Common.decrypt = function (messagebase64, ivBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv(getAlgorithm(keyBase64), key, iv);
  let decrypted = decipher.update(messagebase64, 'base64');
  decrypted += decipher.final();
  return decrypted;
};
Common.decrypt2 = function (messagebase64, ivBase64) {
  const key = Buffer.from(keyBase64_second, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv(getAlgorithm(keyBase64_second), key, iv);
  let decrypted = decipher.update(messagebase64, 'base64');
  decrypted += decipher.final();
  return decrypted;
};

Common.getRndInteger = function (min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

Common.randomItem = function (arr) {
  try {
    let min = 0;
    let max = arr.length;
    let item = arr[Common.getRndInteger(min, max)];
    if (item) return item;
    return arr[0];
  } catch (err) {
    return null;
  }
}

Common.randomNumber = function (length) {
  let min = Math.pow(10, length - 1)
  let max = Math.pow(10, length) - 1
  return String(Common.getRndInteger(min, max))
}

Common.randomPhoneNumber = function (network) {
  let number;
  for(let i = 0; i < 50; i++) {
    let phoneFormat = Common.randomItem(network.Format);
    let remainLength = phoneFormat.PhoneLength - phoneFormat.PhoneHead.length;
    number = network.PhoneCode + phoneFormat.PhoneHead + Common.randomNumber(remainLength);
    if (libphonenumberJs.isValidNumber(number)) {
      let numberObj = libphonenumberJs.parsePhoneNumberFromString(number);
      if (!numberObj) continue;
      if (!numberObj.country) continue;
      let valid = network.NetworkCountryIso.toLowerCase() === numberObj.country.toLowerCase();
      if (!valid) continue;
      return number;
    }
  }
  return number;
}

Common.randomIMEI = function () {
  var pos;
  var str = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  var sum = 0;
  var final_digit = 0;
  var t = 0;
  var len_offset = 0;
  var len = 15;
  var issuer;
  var rbi = ["01", "10", "30", "33", "35", "44", "45", "49", "50", "51", "52", "53", "54", "86", "91", "98", "99"];
  var arr = rbi[Math.floor(Math.random() * rbi.length)].split("");
  str[0] = Number(arr[0]);
  str[1] = Number(arr[1]);
  pos = 2;
  while (pos < len - 1) {
      str[pos++] = Math.floor(Math.random() * 10) % 10;
  }
  len_offset = (len + 1) % 2;
  for (pos = 0; pos < len - 1; pos++) {
      if ((pos + len_offset) % 2) {
          t = str[pos] * 2;
          if (t > 9) {
              t -= 9;
          }
          sum += t;
      } else {
          sum += str[pos];
      }
  }
  final_digit = (10 - (sum % 10)) % 10;
  str[len - 1] = final_digit;
  t = str.join('');
  t = t.substr(0, len);
  return t;
}

Common.randomIMEI2 = function (tac) {
  var pos;
  var str = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  var sum = 0;
  var final_digit = 0;
  var t = 0;
  var len_offset = 0;
  var len = 15;
  str = tac.split("").map(x => Number(x))
  pos = tac.length;
  while (pos < len - 1) {
    str[pos++] = Math.floor(Math.random() * 10) % 10;
  }
  if (str.length === 14) str.push(0)
  len_offset = (len + 1) % 2;
  for (pos = 0; pos < len - 1; pos++) {
      if ((pos + len_offset) % 2) {
          t = str[pos] * 2;
          if (t > 9) {
              t -= 9;
          }
          sum += t;
      } else {
          sum += str[pos];
      }
  }
  final_digit = (10 - (sum % 10)) % 10;
  str[len - 1] = final_digit;
  t = str.join('');
  t = t.substr(0, len);
  return t;
}

Common.randomMac = function() {
  return "XX:XX:XX:XX:XX:XX".replace(/X/g, () => {
    return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16))
  });
}

Common.randomId = function() {
  return "XXXXXXXXXXXXXXXX".replace(/X/g, () => {
    return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16))
  });
  // let result = "XXXXXXXXXXXXXXXX".replace(/X/g, function() {
  //   return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16))
  // });
  // result = result.substr(1);
  // return Common.randomText('X').toUpperCase() + result;
}

Common.random = function(pattern) {
  return pattern.replace(/X/g, () => {
    return "0123456789ZXCVBNMASDFGHJKLQWERTYUIOP".charAt(Math.floor(Math.random() * 36))
  });
}

Common.randomText = function(pattern) {
  return pattern.replace(/X/g, () => {
    return "ZXCVBNMASDFGHJKLQWERTYUIOP".charAt(Math.floor(Math.random() * 26))
  });
}

Common.randomAlphaNumberic = function (length, letterFirst) {
  let l = '';
  if (letterFirst) {
    l = Common.randomText('X');
    length--;
  }
  let p = '';
  for (let i = 0; i < length; i++) {
    p += 'X';
  }
  return `${l}${Common.random(p)}`;
}
module.exports = Common