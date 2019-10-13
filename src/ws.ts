import Logger from "./Logger";
import {createServer} from "http";

require("dotenv").config();
const PORT = Number(process.env.WS_PORT) || 8000;
const HOST = process.env.WS_HOST || "0.0.0.0";
import * as WebSocket from "ws";
import {MakeGenerator} from "./api";
import {Writable} from "stream";

const log = Logger("WS");

interface WS extends WebSocket {
    isAlive: boolean;
    clientInfo: {
        ip: string;
        ua: string;
    };
}

const server = createServer((req, res) => {
    console.log(req.url);
    res.end("Hello!");
});

const wsPool = new Set<WS>();

const wss = new WebSocket.Server({
    server,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});

wss.on("connection", (ws: WS, req) => {
    const ip = req.headers["true-client-ip"]
        || req.headers["cf-connecting-ip"]
        || req.headers["x-forwarded-for"]
        || req.connection.remoteAddress
        || "UNKNOWN IP";
    const ua = req.headers["user-agent"] || "UNKNOWN UA";
    ws.clientInfo = {ip: ip as string, ua};
    log.info("New connection", ip, ua);
    ws.isAlive = true;
    ws.on("pong", () => ws.isAlive = true);
    wsPool.add(ws);
    ws.on("close", () => {
        wsPool.delete(ws);
        log.warn("Connection close:", ip, ua);
    });
});

wss.on("listening", log.info.bind(null, `Listening at ws://${HOST}:${PORT}`));

(function checkLive() {
    wsPool.forEach(ws => {
        if (!ws.isAlive) {
            ws.terminate();
            wsPool.delete(ws);
            log.warn("disconnect", ws.clientInfo.ip, ws.clientInfo.ua);
            return;
        }
        ws.isAlive = false;
        ws.ping(() => null);
    });
    setTimeout(checkLive, 10000);
})();


function wsWrite(ws: WS, data: any) {
    return new Promise(resolve => {
        ws.send(JSON.stringify(data), resolve);
    });
}

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

const writer = new Writable({
    objectMode: true,
    async write(chunk: any, encoding: string, callback: (error?: (Error | null)) => void) {
        chunk.online = wsPool.size;
        const promises: Promise<any>[] = [];
        wsPool.forEach(ws => promises.push(wsWrite(ws, chunk)));
        await promises;
        await delay(500);
        callback();
    }
});
server.listen(PORT, HOST, () => console.log("LISTEN"));
MakeGenerator().pipe(writer).on("finish", () => log.fatal("GENERATOR FINISHED!!!!"));
