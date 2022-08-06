// Modules to control application life and create native browser window
const { app, Menu, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { isDev, name } = require("./env");

let mainWindow;

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.

if (!isDev) {
    const userDataPath = app.getPath("userData");
    app.setPath("userData", `${userDataPath} (${name})`);
}

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 926,
        height: 820,
        minHeight: 820,
        minWidth: 926,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });

    mainWindow.setIcon(path.join(__dirname, "./app/assets/icons/icon.ico"));

    // and load the index.html of the app.
    mainWindow.setMenu(null);
    mainWindow.loadFile("./app/login.html");
    // Open the DevTools.
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    /**
     * Redirect to specify screen
     */
    ipcMain.on("redirect", (event, arg) => {
        if (!arg || !arg.file) return;
        mainWindow.loadFile("./app/" + arg.file);
    });

    ipcMain.on("check-update", () => {
        autoUpdater.checkForUpdatesAndNotify();
    });

    ipcMain.on("show-folder", () => {
        let folder = dialog.showOpenDialogSync(mainWindow, {
            properties: ["openDirectory"],
        });
        mainWindow.send("select-folder", folder);
    });

    ipcMain.on("show-folder-apk", () => {
        let files = dialog.showOpenDialogSync({
            properties: ["openFile", "multiSelections"],
            filters: [{ name: "Apk File", extensions: ["apk"] }],
        });
        mainWindow.send("select-folder-apk", files);
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
