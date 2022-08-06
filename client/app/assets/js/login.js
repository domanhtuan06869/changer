/* eslint-disable no-undef */
var {isDev} = require('../../../env.js')
var { getFirebase, signinWinelex } = require(__dirname + '/utils.js' + (isDev ? '' : 'c'));

const firebase = getFirebase();

$(function () {
  $("#username").val(localStorage.getItem("username"));
  $("#password").val(localStorage.getItem("password"));
});

$("#login-btn").click((event) => {
  event.preventDefault();
  let username = $("#username").val();
  let password = $("#password").val();
  if (!username || !password) return alert("Please input username, password");
  if (!usernameIsValid(username)) {
    return alert("username khong hop le");
  }
  let email = username + "@gmail.com";
  showLoading();
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(function (res) {
       console.log("signInWithEmailAndPassword", res);
       saveLoginInfoAndGoToChangerPage(username, password);

      res.user
        .getIdToken()
        .then((token) => {
          localStorage.setItem("accessToken", token);
          return signinWinelex(token);
        })
        .then((res) => {
          // console.log("signinWinelex", res);
          saveLoginInfoAndGoToChangerPage(username, password);

          if (res.uid) {
            // Lưu vào local storage
            localStorage.setItem("loginInfo", JSON.stringify(res));
            saveLoginInfoAndGoToChangerPage(username, password);
          } else {
            // Thông báo đăng nhập thất bại
          }
        })
        .catch((err) => {
          // console.log(err);
        })
        .then(() => hideLoading());
    })
    .catch(function (error) {
      hideLoading();
      alert("Lỗi đăng nhập!");
      // console.log(error);
    });
});

function showLoading() {
  $("#loading").removeClass("hidden");
}

function hideLoading() {
  $("#loading").addClass("hidden");
}

$("#signup-btn").click((event) => {
  event.preventDefault();
  let username = $("#username").val();
  let password = $("#password").val();
  let retypePassword = $("#retype-password").val();
  if (!username || !password) return alert("Please input email, password");
  if (!usernameIsValid(username)) {
    return alert("username invalid");
  }
  if (password !== retypePassword) {
    return alert("password not match");
  }
  let email = username + "@gmail.com";
  $("#loading").removeClass("hidden");
  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then(function (firebaseUser) {
      $("#loading").addClass("hidden");
      // console.log(firebaseUser);
      // console.log("User " + firebaseUser.uid + " created successfully!");
      alert("User created successfully!");
      switchToLoginMode();
      // return firebaseUser;
    })
    .catch(function (error) {
      $("#loading").addClass("hidden");
      // console.log(error);
      alert(error.message);
      $("#login-form").focus();
    });
});

$("#signup-link").click((event) => {
  event.preventDefault();
  $("#form-retype-password").removeClass("hidden");
  $("#signup-link-wrap").addClass("hidden");
  $("#login-link-wrap").removeClass("hidden");
  $("#signup-btn").removeClass("hidden");
  $("#login-btn").addClass("hidden");
});

$("#login-link").click((event) => {
  event.preventDefault();
  switchToLoginMode();
});

function usernameIsValid(username) {
  return /^[0-9a-zA-Z_.-]+$/.test(username);
}

function saveLoginInfoAndGoToChangerPage(username, password) {
  console.log('tsrtdr');
  localStorage.setItem("username", username);
  localStorage.setItem("password", password);
  const { ipcRenderer } = require("electron");
  ipcRenderer.send("redirect", { file: "changer.html" });
}

function switchToLoginMode() {
  $("#form-retype-password").addClass("hidden");
  $("#signup-link-wrap").removeClass("hidden");
  $("#login-link-wrap").addClass("hidden");
  $("#signup-btn").addClass("hidden");
  $("#login-btn").removeClass("hidden");
}
