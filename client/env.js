const isDev = true;
const isVersion = "2.0.0";
module.exports = {
    isDev,
    name: isDev ? "Development" : "Production",
    isVersion
}