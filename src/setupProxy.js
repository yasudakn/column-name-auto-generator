const config = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pkg = require('../package.json')
const target = process.env.PROXY || pkg.proxy
// tslint:disable-next-line:no-console
console.log("setupProxy", target);

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
        target: process.env.REACT_APP_CODIC_API_URL,
        changeOrigin: true,
        secure: false,
        headers: codic_headers,
        logLevel: 'debug'
      })
    );
    app.use(
        '/create',
        createProxyMiddleware({
          target: target,
          changeOrigin: true,
          secure: false,
          logLevel: 'debug'
        })
      );
  };
