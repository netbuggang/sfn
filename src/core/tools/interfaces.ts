import * as webium from "webium";
import * as SocketIO from "socket.io";
import * as modelar from "modelar";
import * as ExpressSession from "express-session";
import { SSE } from "sfn-sse";
import { Controller } from "../controllers/Controller";
import { HttpController } from "../controllers/HttpController";
import { WebSocketController } from "../controllers/WebSocketController";
import { UploadedFile } from "./upload";

// Add some useful types to the global scope
declare global {
    type FunctionPropertyNames<T> = {
        [K in keyof T]: T[K] extends Function ? K : never
    }[keyof T];
    type NonFunctionPropertyNames<T> = {
        [K in keyof T]: T[K] extends Function ? never : K
    }[keyof T];
    type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;
    type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
}

export interface Locale {
    [statement: string]: string;
}

export interface View {
    render(data?: { [name: string]: any }): string | Promise<string>;
}

export interface Session extends Express.Session {
    uid: number;
}

export abstract class Session {
    static [Symbol.hasInstance](ins: any) {
        return ins instanceof ExpressSession["Session"];
    }
}

export interface Request extends webium.Request {
    /** Gets a DB instance for `modelar`. */
    db: modelar.DB;
    /** The logged-in user of the request. */
    user?: modelar.User;
    /** Whether the request comes from an EventSource.  */
    isEventSource: boolean;
    /** Gets the CSRF token if available. */
    csrfToken?: string;
    /** In an sfn app, the session is shared between HTTP and WebSocket. */
    session: Session;
    /** 
     * A short-version url, when the url contains more than 64 characters,
     * the rest part will be cut off and changed to `...`.
     */
    shortUrl: string;
    /**
     * When in the controller constructor, the files are in uploading state,
     * when in the method bound to the route, the files are uploaded and 
     * stored in disk.
     */
    files?: { [field: string]: UploadedFile[] };
}

export abstract class Request {
    static [Symbol.hasInstance](ins: any) {
        return (ins instanceof webium.RequestConstructor)
            || (ins instanceof webium.Http2RequestConstructor);
    }
}

export interface Response extends webium.Response {
    /** Sends data to the client via XML document. */
    xml(data: { [key: string]: any }, rootTag?: string, headless?: boolean): void;
    /** Whether the response data should be compressed to GZIP. */
    gzip: boolean;
    /**
     * Whether the response has been sent.
     * Because the framework uses package `express-session`, which will delay 
     * changing the property `res.finished`, so after calling `res.end()`, 
     * `res.send()`, `res.redirect()`, the `res.finished` will still be `false`,
     * so if you want to check if the response has been sent, check `res.sent` 
     * instead.
     */
    sent: boolean;
    /** The Sever-Sent Events channel of the response. */
    sse?: SSE;
}

export abstract class Response {
    static [Symbol.hasInstance](ins: any) {
        return (ins instanceof webium.ResponseConstructor)
            || (ins instanceof webium.Http2ResponseConstructor);
    }
}

export interface WebSocket extends SocketIO.Socket {
    /** The domain name of the handshake. */
    domainName?: string;
    /** The subdomain name of the handshake. */
    subdomain?: string;
    /** Gets a DB instance for `modelar`. */
    db: modelar.DB;
    /** The logged-in user of the socket. */
    user?: modelar.User;
    /** In an sfn app, the session is shared between HTTP and WebSocket. */
    session: Session;
    /** * The cookies of handshake. */
    cookies: { [name: string]: any };
    /** The proxy information of handshake. */
    proxy?: {
        protocol: string,
        host: string,
        ips: string[],
        ip: string
    };
    /** The protocol of the socket, either `ws` or `wss`. */
    protocol: string;
    host: string;
    hostname: string;
    port?: number;
    /** The remote IP of the socket. */
    ip: string;
    ips: string[];
    /** The language that the client uses. */
    lang: string;
    /** All languages that the client accepts. */
    langs: string[];
    /** `true` if the protocol is `wss`, `false` otherwise. */
    secure: boolean;
}

export abstract class WebSocket {
    static [Symbol.hasInstance](ins: SocketIO.Socket) {
        return app.ws && ins.server === app.ws;
    }
}

export interface ControllerDecorator extends Function {
    (proto: Controller, prop: string): void;
}

export interface HttpDecorator extends Function {
    (proto: HttpController, prop: string): void;
}

export interface WebSocketDecorator extends Function {
    (proto: WebSocketController, prop: string): void;
}