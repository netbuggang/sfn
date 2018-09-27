import { DB } from "modelar";
import { config } from "../../bootstrap/ConfigLoader";
import { WebSocket } from "../../tools/interfaces";
import { realDB } from "../../tools/symbols";

export default async function (socket: WebSocket, next: (err?: Error) => void) {
    Object.defineProperty(socket, "db", {
        get: () => {
            if (socket[realDB] === undefined) {
                socket[realDB] = new DB(config.database);
            }
            return socket[realDB];
        },
        set(v: DB) {
            socket[realDB] = v;
        }
    });

    // When the socket is disconnected, recycle the database 
    // connection.
    socket.on("disconnected", () => {
        if (socket[realDB])
            socket[realDB].release();
    });

    await next();
}