import {createWriteStream} from "fs";
import {format} from "util";
import {Writable} from "stream";

enum Level {
    debug,
    info,
    warn,
    error,
    fatal
}

export default function Logger(name: string, infoFile?: string, errorFile?: string) {
    infoFile = infoFile || process.env.LOG_FILE_INFO || process.env.LOG_FILE || undefined;
    errorFile = errorFile || process.env.LOG_FILE_ERROR || process.env.LOG_FILE || undefined;
    const infoStream = infoFile ? createWriteStream(infoFile) : process.stdout;
    const errorStream = errorFile ? createWriteStream(errorFile) : process.stderr;
    return {
        debug: log.bind(null, name, Level.debug, infoStream),
        info: log.bind(null, name, Level.info, infoStream),
        warn: log.bind(null, name, Level.warn, errorStream),
        error: log.bind(null, name, Level.error, errorStream),
        fatal: log.bind(null, name, Level.fatal, errorStream),
    };
}

function log(name: string, level: Level, out: Writable, msg: any, ...other: any[]) {
    const message = `${(new Date().toISOString())} - [${Level[level]}] - [${name}] ${format(msg, ...other)}\n`;
    out.write(message, "utf8");
}