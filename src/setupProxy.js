const config = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');

config.config(); // load .env

const codic_token = process.env.REACT_APP_CODIC_API_TOKEN;

const codic_headers  = {
    "Content-Type": "application/json;charset=utf-8",
    "Authorization": `Bearer ${codic_token}`
}

module.exports = function(app) {
    app.use(
      '/v1',
      createProxyMiddleware({
        target: "https://api.codic.jp/",
        changeOrigin: true,
        secure: false,
        headers: codic_headers,
        logLevel: 'debug'
      })
    );
  };