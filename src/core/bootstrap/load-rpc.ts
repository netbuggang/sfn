import { RpcServer, RpcClient } from "alar";
import { serveTip, inspectAs } from "../tools/internal";
import { green } from "../tools/internal/color";
import { serve as serveRepl } from "../tools/internal/repl";

declare global {
    namespace app {
        namespace rpc {
            /**
             * The RPC server instance, only available when the current process 
             * is an RPC server (and the server started), if it's a web server,
             * the variable will be `null`.
             */
            var server: RpcServer;

            /** @inner reserved portal used by the framework */
            var connections: { [serverId: string]: RpcClient };

            /**
             * Starts an RPC server according to the given `serverId`, which is 
             * set in `config.server.rpc`.
             */
            function serve(serverId: string): Promise<void>;
            /**
             * Connects to an RPC server according to the given `serverId`, 
             * which is set in `config.server.rpc`. If `defer` is `true`, when 
             * the server is not online, the function will hang until it becomes
             * available and finishes the connection.
             */
            function connect(serverId: string, defer?: boolean): Promise<void>;
            /** Connects to all RPC servers. */
            function connectAll(defer?: boolean): Promise<void>;
            /** Checks if the target server is connected. */
            function hasConnect(serverId: string): boolean;
        }
    }
}

const tasks: { [id: string]: number } = {};

app.rpc = {
    server: null,
    connections: inspectAs({}, "[Sealed Object]"),
    async serve(serverId: string) {
        let servers = app.config.server.rpc;
        let { modules, ...options } = servers[serverId];
        let service = await app.services.serve(options);

        for (let mod of modules) {
            service.register(mod);
        }

        app.rpc.server = service;
        app.serverId = serverId;

        // invoke all start-up plugins.
        await app.plugins.lifeCycle.startup.invoke();

        console.log(serveTip("RPC", serverId, service.dsn));

        // self-connect after serving.
        await app.rpc.connect(serverId);

        // try to serve the REPL server.
        await serveRepl(app.serverId);
    },
    async connect(serverId: string, defer = false) {
        // prevent duplicated connect.
        if (app.rpc.hasConnect(serverId))
            return;

        try {
            let servers = app.config.server.rpc;
            let { modules, ...options } = servers[serverId];
            let service = await app.services.connect({
                ...options,
                id: app.serverId
            });

            app.rpc.connections[serverId] = service;

            for (let mod of modules) {
                service.register(mod);

                // If detects the schedule service is served by other processes
                // and being connected, stop the local schedule service.
                if (serverId !== app.serverId && mod === app.services.schedule) {
                    let { local } = app.services;
                    await app.services.schedule.instance(local).stop(true);
                }
            }

            if (tasks[serverId]) {
                app.schedule.cancel(tasks[serverId]);
                delete tasks[serverId];
            }

            // Link all the subscriber listeners from the message channel and to
            // the RPC channel.
            app.message.linkRpcChannel(service);

            console.log(green`RPC server [${serverId}] connected.`);
        } catch (err) {
            if (defer) {
                if (!tasks[serverId]) {
                    tasks[serverId] = app.schedule.create({
                        salt: `connect-${serverId}`,
                        start: Date.now(),
                        repeat: 1000,
                    }, () => {
                        app.rpc.connect(serverId, defer);
                    });
                }
            } else {
                throw err;
            }
        }
    },
    async connectAll(defer = false) {
        let servers = app.config.server.rpc;
        let connections: Promise<void>[] = [];

        for (let serverId in servers) {
            if (serverId !== app.serverId) {
                connections.push(app.rpc.connect(serverId, defer));
            }
        }

        await Promise.all(connections);
    },
    hasConnect(serverId: string) {
        return !!app.rpc.connections[serverId];
    }
}