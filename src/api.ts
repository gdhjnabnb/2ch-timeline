import axios from "axios";
import {Readable} from "stream";
import Logger from "./Logger";

const log = Logger("API");

export enum ThreadFileType {
    Image = 1,
}

export interface ThreadFile {
    displayname: string;
    fullname: string;
    name: string;
    path: string;
    size: string;
    thumbnail: string;
    subject: string;
    time: number;
    type: number;
}

interface Thread {
    comment: string;
    date: string;
    files: ThreadFile[];
    num: string;
    timestamp: number;
    posts_count: number;
}

export async function loadAllFiles(exists: string[] = []) {
    const ids: string[] = (await axios.get("https://2ch.hk/b/catalog.json")).data.threads.map((thread: Thread) => thread.num);
    debugger;
    const all = await Promise.all(ids.map(id => axios.get(`https://2ch.hk/b/res/${id}.json`).then(res => res.data)));
    const allIds: string[] = [];
    const result = all
        .map(item => item && item.threads && item.threads[0].posts)
        .flat()
        .filter(item => !!item)
        .filter((item: Thread) => {
            const id = item.num.toString();
            allIds.push(id);
            return !exists.includes(id);
        })
        .filter((item: Thread) => item.files.length)
        .map((item: Thread) => {
            const time = item.timestamp * 1000;
            exists.push(item.num.toString());
            return item.files.map(file => ({...file, time}));
        })
        .flat();
    const resultExists: string[] = exists.filter(id => allIds.includes(id));
    return [result, resultExists] as [ThreadFile[], string[]];
}

async function forceLoadAllFiles(exists: string[] = []) {
    while (true) {
        try {
            log.info("Begin load data");
            const result = await loadAllFiles(exists);
            log.info("Success load data size: ", result[0].length);
            return result;
        } catch (e) {
            log.error("Error load:", e);
        }
    }
}

export function MakeGenerator() {
    let exists: string[] = [];
    let data: any[];
    return new Readable({
        objectMode: true,
        async read(size: number) {
            [data, exists] = await forceLoadAllFiles(exists);
            data.forEach(item => this.push(item));
        }
    });
}

function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}