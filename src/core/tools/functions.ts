import random = require("lodash/random");
import { App, RouteHandler } from "webium";
import { interceptAsync } from 'function-intercepter';
import { HttpController } from "../controllers/HttpController";
import { WebSocketController } from "../controllers/WebSocketController";
import { StatusException } from './StatusException';
import { routeMap, eventMap } from './RouteMap';
import { traceModulePath } from './internal/module';
import {
    ControllerDecorator,
    WebSocketDecorator,
    HttpDecorator
} from './interfaces';

/** Pauses the execution in an asynchronous operation. */
export function sleep(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

/** 
 * Generates a random string.
 * @param length The string length.
 * @param chars The possible characters.
 */
export function randStr(
    length = 5,
    chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
) {
    var str = "",
        max = chars.length - 1;
    for (let i = 0; i < length; i++) {
        str += chars[random(0, max)];
    }
    return str;
}

/** Injects CSRF Token into forms. */
export function injectCsrfToken(html: string, token: string): string {
    var ele = `<input type="hidden" name="x-csrf-token" value="${token}">`,
        matches = html.match(/<form\s+.*?>/g);

    if (matches) {
        for (let match of matches) {
            let i = html.indexOf(match) + match.length,
                j = html.indexOf("<", i),
                spaces = html.substring(i, j);
            html = html.substring(0, i) + spaces + ele + html.substring(i);
        }
    }
    return html;
}

/** Requires authentication when calling the method. */
export const requireAuth: ControllerDecorator = interceptAsync().before(function () {
    if (!this.authorized) {
        if (this instanceof HttpController && this.fallbackTo) {
            this.res.redirect(this.fallbackTo, 302);
            return false;
        } else {
            throw new StatusException(401);
        }
    }
});

let router: App,
    handle: (route: string) => RouteHandler,
    wsTryImport: (nsp: string) => void;

/** Binds the method to a specified socket event. */
export function event(name: string): WebSocketDecorator {
    return (proto: WebSocketController, prop: string) => {
        let modPath = traceModulePath(app.controllers.path);

        if (!modPath)
            return;

        let { nsp = "/" } = <typeof WebSocketController>proto.ctor;
        let data = {
            prefix: nsp,
            route: name,
            name: app.controllers.resolve(modPath),
        };
        let key = eventMap.keyFor(data);

        eventMap.add(key, prop);

        if (!wsTryImport)
            wsTryImport = require("../handlers/websocket-event").tryImport;

        if (!eventMap.isLocked(key)) {
            eventMap.lock(key);
            wsTryImport(nsp);
        }
    };
}

/** Binds the method to a specified URL route. */
export function route(path: string): HttpDecorator;
export function route(method: string, path: string): HttpDecorator;
export function route(method: string, path?: string): HttpDecorator {
    return (proto: HttpController, prop: string) => {
        let modPath = traceModulePath(app.controllers.path);

        if (!modPath)
            return;

        if (!path) {
            let parts = method.split(/\s+/);
            let { baseURI = "" } = <typeof HttpController>proto.ctor;
            method = parts[0] === "SSE" ? "GET" : parts[0];
            path = baseURI + parts[1];
        } else if (method === "SSE") {
            method = "GET";
        }

        let data = {
            prefix: method,
            route: path,
            name: app.controllers.resolve(modPath),
        };
        let key = routeMap.keyFor(data);

        routeMap.add(key, prop);

        if (!router || !handle) {
            router = require("../bootstrap/index").router;
            handle = require("../handlers/http-route").getRouteHandler;
        }

        if (!routeMap.isLocked(key)) {
            routeMap.lock(key);
            router.method(method, path, handle(key));
        }
    };
}

route.delete = function (path: string) {
    return route("DELETE", path);
};

route.get = function (path: string) {
    return route("GET", path);
}

route.head = function (path: string) {
    return route("HEAD", path);
};

route.patch = function (path: string) {
    return route("PATCH", path);
};

route.post = function (path: string) {
    return route("POST", path);
};

route.put = function (path: string) {
    return route("PUT", path);
};

route.sse = function (path: string) {
    return route("SSE", path);
};