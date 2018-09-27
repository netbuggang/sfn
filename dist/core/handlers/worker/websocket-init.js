"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = require("url");
const endsWith = require("lodash/endsWith");
const parse_accepts_1 = require("parse-accepts");
const ConfigLoader_1 = require("../../bootstrap/ConfigLoader");
function default_1(socket, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            let req = socket.request;
            socket.protocol = socket.handshake.secure ? "wss" : "ws";
            socket.ip = socket.handshake.address;
            socket.host = req.headers.host;
            socket.secure = socket.handshake.secure;
            if (req.headers["x-forwarded-for"] || req.headers["x-forwarded-proto"]
                || req.headers["x-forwarded-host"]) {
                let forIp = req.headers["x-forwarded-for"], proxy = {
                    protocol: req.headers["x-forwarded-proto"] || null,
                    host: req.headers["x-forwarded-host"] || null,
                    ips: forIp && forIp.split(/\s*,\s*/) || [],
                    ip: ""
                };
                proxy.ip = proxy.ips[0];
                socket.proxy = proxy;
            }
            else {
                socket.proxy = null;
            }
            socket.host = req.headers.host;
            socket.ips = socket.proxy ? socket.proxy.ips : [socket.ip];
            socket.langs = parse_accepts_1.parseValue(req.headers["accept-language"]);
            socket.lang = socket.langs[0];
            let urlObj = url.parse(socket.protocol + "://" + socket.host);
            socket.hostname = urlObj.hostname;
            socket.port = urlObj.port && parseInt(urlObj.port);
            let hostname = ConfigLoader_1.config.server.hostname;
            let domains = Array.isArray(hostname) ? hostname : [hostname];
            for (let domain of domains) {
                if (socket.hostname.length > domain.length
                    && endsWith(socket.hostname, domain)) {
                    let i = socket.hostname.length - domain.length - 1;
                    socket.domainName = domain;
                    socket.subdomain = urlObj.hostname.substring(0, i);
                    break;
                }
            }
            yield next();
        }
        catch (err) {
            yield next(err);
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=websocket-init.js.map