import * as Session from "express-session";
import { ServerResponse } from "http";
import { Stats } from "fs";
import serveStatic = require("serve-static");
import { DBConfig } from "modelar";
import { ServerOptions } from "socket.io";
import * as https from "https";
import * as http2 from "http2";
import { RpcOptions } from 'alar';

declare global {
    namespace app {
        interface Config {
            [x: string]: any;
            /** Default language of the application. */
            lang?: string;
            /**
             * The directories that serve static resources.
             * @see https://www.npmjs.com/package/serve-static
             */
            statics?: string[] | { [path: string]: StaticOptions };
            /**
             * When any module file has been modified, rather than restart the 
             * whole server, try to refresh the memory cache instead. NOTE: 
             * **DO NOT** import the module statically in anywhere, otherwise it
             * may not be reloaded as expected.
             * 
             * Currently, these entities can be hot-reloaded:
             * - `controllers`
             * - `services`
             * - `models`
             * - `utils`
             * - `locales`
             * - `views`
             * - `plugins`
             * 
             * During development, when hot-reloading is enabled, you should 
             * start typescript compiler in watch mode (`tsc --watch`).
             * 
             * @see https://github.com/hyurl/alar
             */
            hotReloading?: boolean;
            server: {
                /** Host name(s), used for calculating the sub-domain. */
                hostname?: string | string[];
                /**
                 * Since SFN 0.2.0, when HTTPS or HTTP2 is enabled, will always 
                 * force HTTP request to redirect to the new protocol, and 
                 * setting port for HTTP server is no longer allowed, the 
                 * framework will automatically start a server that listens port
                 * `80` to accept HTTP request and redirect them to HTTPS.
                 */
                http?: {
                    /** Server type, AKA protocol type, default value: `http`. */
                    type?: "http" | "https" | "http2";
                    /** Default value is `80`. */
                    port?: number;
                    /** HTTP request timeout, default value is `120000`. */
                    timeout?: number;
                    /**
                     * These options are mainly for type `http` and type `http2`.
                     * @see https://nodejs.org/dist/latest-v10.x/docs/api/https.html#https_https_createserver_options_requestlistener
                     * @see https://nodejs.org/dist/latest-v10.x/docs/api/http2.html#http2_http2_createserver_options_onrequesthandler
                     * @see https://nodejs.org/dist/latest-v10.x/docs/api/tls.html#tls_tls_createsecurecontext_options
                     */
                    options?: https.ServerOptions & http2.ServerOptions;
                };
                /** Configurations of WebSocket server. */
                websocket?: {
                    enabled?: boolean;
                    /**
                     * By default, this `port` is `0` or `undefined`, that means
                     * it will attach to the HTTP server instead. If you change
                     * it, it will listen to that port instead.
                     */
                    port?: number;
                    /**
                     * Options for SocketIO.
                     * @see https://socket.io
                     */
                    options?: ServerOptions;
                };
                /**
                 * Configurations for RPC services.
                 * @see https://github.com/hyurl/alar
                 */
                rpc?: {
                    [serverId: string]: RpcOptions & {
                        modules: ModuleProxy<any>[]
                    }
                };
            };
            /**
             * Configurations for Express-Session.
             * @see https://www.npmjs.com/package/express-session
             */
            session?: Session.SessionOptions;
            /**
             * Configurations for Modelar ORM.
             * @see https://github.com/hyurl/modelar
             */
            database?: DBConfig;
        }
    }
}

/**
 * @see https://www.npmjs.com/package/serve-static
 */
export interface StaticOptions extends serveStatic.ServeStaticOptions {
    /** 
     * If `true`, the URL must contain the folder name (relative to `SRC_PATH`) 
     * as prefix to reach the static resource. Also you can set a specified 
     * prefix other than the folder name.
     */
    prefix?: boolean | string;
    setHeaders?: (res: ServerResponse, path: string, stat: Stats) => void;
};

/**
 * @deprecated Use `app.Config` instead and share the benefits of declaration
 * merging.
 */
export type SFNConfig = app.Config;

const env = process.env;

/**
 * The configuration of the program.
 * Some of these settings are for their dependencies, you may check out all 
 * supported options on their official websites.
 */
export default <app.Config>{
    lang: "en-US",
    statics: ["assets"],
    hotReloading: true,
    server: {
        hostname: "localhost",
        http: {
            type: <app.Config["server"]["http"]["type"]>env.HTTP_TYPE || "http",
            port: parseInt(env.HTTP_PORT) || 80,
            timeout: 120000, // 2 min.
            options: null
        },
        websocket: {
            enabled: true,
            port: undefined,
            options: {
                pingTimeout: 5000,
                pingInterval: 5000
            },
        },
        rpc: {}
    },
    session: {
        secret: "sfn",
        name: "sid",
        resave: true,
        saveUninitialized: true,
        unset: "destroy",
        cookie: {
            maxAge: 3600 * 24 * 1000 // 24 hours (in milliseconds)
        }
    },
    database: {
        type: env.DB_TYPE || "mysql",
        host: env.DB_HOST || "localhost",
        port: parseInt(env.DB_PORT) || 3306,
        database: env.DB_NAME || "sfn",
        user: env.DB_USER || "root",
        password: env.DB_PASS || "123456"
    }
};