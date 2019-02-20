import * as path from "path";
import * as fs from "fs-extra";
import { DB, User } from "modelar";
import { EjsEngine } from "sfn-ejs-engine";
import * as SSE from "sfn-sse";
import { CorsOption as CorsOptions } from "sfn-cors";
import { SRC_PATH, isDevMode } from "../../init";
import { config } from "../bootstrap/load-config";
import { Controller } from "./Controller";
import { TemplateEngine } from "../tools/TemplateEngine";
import { MarkdownParser } from "../tools/MarkdownParser";
import { Request, Response, Session } from "../tools/interfaces";
import { HttpError } from "../tools/HttpError";
import { realSSE } from "../tools/symbols";
import { UploadOptions } from "../tools/upload";
import { loadFile } from '../tools/functions-inner';

export { CorsOptions };

const Engine = new EjsEngine();

/**
 * HttpController manages requests come from an HTTP client.
 * 
 * When a request fires, the controller will be automatically instantiated and
 * calling the binding method according to the route.
 * 
 * The parameters of the URL route will be stored in `req.params`, and they 
 * will be auto-injected into the method (as method parameters) accordingly. 
 * Apart from them, you can set `req: Request` and `res: Response` as 
 * parameters as well, they will be auto-injected too, and the sequence and 
 * position of them is arbitrary. Or you can call them from `this`:
 * 
 * `let { req, res } = this;`
 * 
 * You may `return` some data inside a method that bound to a certain route, 
 * when the method is called by a HTTP request, they will be automatically 
 * sent to the client. Actions will be handled in a Promise constructor, so 
 * you can do what ever you want inside the method. Using `async` methods to 
 * do asynchronous operations is recommended.
 * 
 * If you want to send a response manually, you can just call the `res.send()`
 * or `res.end()` to do so, no more data will be sent after sending one.
 * 
 * The decorator function `@route()` is used to set routes. But when you're 
 * coding in JavaScript, there is not decorators, the framework support 
 * another compatible way to allow you doing such things by using the 
 * **jsdoc** block with a `@route` tag, but you need to set 
 * `config.enableDocRoute` to `true`.
 */
export class HttpController extends Controller {
    static viewPath: string = SRC_PATH + "/views";
    static viewExtname: string = ".html";
    static engine: TemplateEngine = Engine;
    /** Sets a specified base URI for route paths. */
    static baseURI: string;

    viewPath = this.Class.viewPath;
    viewExtname = this.Class.viewExtname;
    /** Sets a specified template engine for the controller. */
    engine = this.Class.engine;

    /** If set, when unauthorized, fallback to the given URL. */
    fallbackTo: string;
    /** Whether the response data should be compressed to GZip. */
    gzip: boolean = true;
    /**
     * Sets a query name for jsonp callback, `false` (by default) to disable.
     */
    jsonp: string | false = false;
    /**
     * If `true`, when request method is `DELETE`, `PATCH`, `POST` or `PUT`, 
     * the client must send an `x-csrf-token` field to the server either via 
     * request header, URL query string or request body. You can call 
     * `req.csrfToken` to get the auto-generated token in a `GET` action and 
     * pass it to a view.
     */
    csrfProtection: boolean = false;
    /**
     * Enables Cross-Origin Resource Sharing, set an array to accept multiple 
     * origins, an `*` to accept all, or an object for more complicated needs.
     */
    cors: string | string[] | CorsOptions | false = false;
    /** Configurations for uploading files. */
    uploadOptions: UploadOptions = Object.assign({}, UploadOptions);
    /** Reference to the corresponding request context. */
    readonly req: Request;
    /** Reference to the corresponding response context. */
    readonly res: Response;

    constructor(req: Request, res: Response) {
        super();
        this.authorized = req.user !== null;
        this.req = req;
        this.res = res;
        this.lang = (req.query && req.query.lang)
            || (req.cookies && req.cookies.lang)
            || req.lang
            || config.lang;
    }

    /** Gets the absolute view filename if the given one is relative. */
    protected getAbsFilename(filename: string): string {
        if (!path.isAbsolute(filename))
            filename = `${this.viewPath}/${filename}`;
        return filename;
    }

    /**
     * Sends view contents to the response context.
     * 
     * @param filename The template filename, if no extension presented, the 
     *  `this.viewExtname` will be used. Template files are by default stored 
     *  in `views/`.
     * @param vars Local variables passed to the template.
     */
    view(filename: string, vars: { [name: string]: any } = {}): Promise<string> {
        let ext = path.extname(filename);
        if (ext != this.viewExtname) {
            ext = this.viewExtname;
            filename += ext;
        }
        filename = this.getAbsFilename(filename);

        // Set response type.
        this.res.type = ext;

        // i18n support for the template.
        if (!("i18n" in vars)) {
            vars.i18n = (text, ...replacements) => {
                return this.i18n(text, ...replacements);
            };
        }

        return this.engine.renderFile(filename, vars);
    }

    /**
     * Sends a view file with raw contents to the response context.
     * 
     * @param filename The template file, stored in `views/` by default.
     * @param fromCache Try retrieving contents from cache first.
     */
    viewRaw(filename: string, cache = !isDevMode): Promise<string> {
        filename = this.getAbsFilename(filename);
        this.res.type = path.extname(filename);
        return loadFile(filename, cache);
    }

    /**
     * Sends a view file to the response context, and parse it as a markdown 
     * file.
     * 
     * This method relies on the module `highlightjs`, so when displaying code 
     * snippets, you need to include CSS files to the HTML page manually.
     * 
     * @param filename The template filename, if no extension presented, then 
     *  `.md` will be used. Template files are by default stored in `views/`.
     * @param fromCache Try retrieving contents from cache first.
     */
    viewMarkdown(filename: string, cache = !isDevMode): Promise<string> {
        path.extname(filename) != ".md" && (filename += ".md");
        return this.viewRaw(filename, cache).then(MarkdownParser.parse);
    }

    /** Alias of `res.send()`. */
    send(data: any): void {
        return this.res.send(data);
    }

    get Class(): typeof HttpController {
        return <any>this.constructor;
    }

    /** Gets/Sets the DB instance. */
    get db(): DB {
        return this.req.db;
    }

    set db(v: DB) {
        this.req.db = v;
    }

    /** Alias of `req.session`. */
    get session(): Session {
        return this.req.session;
    }

    /** Alias of `req.user`. */
    get user(): User {
        return this.req.user;
    }

    set user(v: User) {
        this.req.user = v;
    }

    /** Alias of `req.url`. */
    get url(): string {
        return this.req.url;
    }

    /** Gets an SSE instance. */
    get sse(): SSE {
        if (!this[realSSE]) {
            this[realSSE] = new SSE(this.req, this.res);
        }
        return this[realSSE];
    }

    /**
     * Whether the request comes from an EventSource. Will check the header
     * field `accept`, see if it's `text/event-stream`, some clients may not
     * set this right, so be careful to use.
     */
    get isEventSource(): boolean {
        return this.req.isEventSource;
    }

    /** Alias of `req.csrfToken`. */
    get csrfToken(): string {
        return this.req.csrfToken;
    }

    /**
     * By default, the framework will send a view file according to the error 
     * code, and only pass the `err` object to the template, it may not be 
     * suitable for complicated needs. For such a reason, the framework allows
     * you to customize the error view handler by rewriting this method.
     */
    static httpErrorView(err: HttpError, instance: HttpController): Promise<string> {
        return instance.view(instance.res.code.toString(), { err });
    }
}