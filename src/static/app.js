const isSSL = window.location.href.search("https") === 0;
// const WS = "ws://127.0.0.1:2083";
const WS = "wss://2ch-timeline.tk/ws/";
let activeWS;


const CLEAR_LIMIT = 50;
const VIDEO_EXT = ["mp4", "webm", "gif"];
const STATE = {
    isPause: false,
    countVideos: 0,
    countImages: 0,
    isConnected: false,
    online: 0,
};

const videoContainer = document.getElementById("video-container");
const imageContainer = document.getElementById("image-container");
const pauseBtn = document.getElementById("btn-pause");
const onlineBlock = document.getElementById("online-users");

function append(path, thumbnail, online = 0) {
    if (STATE.isPause) {
        return;
    }
    const link = document.createElement("a");
    const img = document.createElement("img");
    img.className = "img-fluid";
    img.width = "300";
    img.src = `https://2ch.hk${thumbnail}`;
    link.className = "stream-item";
    link.href = `https://2ch.hk${path}`;
    link.target = "_blank";
    link.appendChild(img);

    const ext = /\.(.+)$/.exec(path)[1];
    const isVideo = VIDEO_EXT.includes(ext);
    const container = isVideo ? videoContainer : imageContainer;
    container.prepend(link);

    isVideo ? STATE.countVideos++ : STATE.countImages++;
}


pauseBtn.addEventListener("click", () => {
    STATE.isPause = !STATE.isPause;
    pauseBtn.innerText = STATE.isPause ? "Resume" : "Pause";
});

(function clear() {
    while (STATE.countImages > CLEAR_LIMIT) {
        imageContainer.children[imageContainer.children.length - 1].remove();
        STATE.countImages--;
    }
    while (STATE.countVideos > CLEAR_LIMIT) {
        videoContainer.children[videoContainer.children.length - 1].remove();
        STATE.countVideos--;
    }
    setTimeout(clear, 1000);
})();

function onMessage(msg) {
    STATE.isConnected = true;
    const data = JSON.parse(msg.data);
    STATE.online = data.online || 0;
    append(data.path, data.thumbnail);
    updateOnline();
}

async function onClose() {
    if (activeWS) {
        activeWS.removeEventListener("message", onMessage);
        activeWS.removeEventListener("close", onClose);
        activeWS.close();
        activeWS = undefined;
        STATE.isConnected = false;
    }
    updateOnline();
    await new Promise(resolve => setTimeout(resolve, 5000));
    init();

}

function updateOnline() {
    if (STATE.isConnected) {
        onlineBlock.innerText = STATE.online;
    } else {
        onlineBlock.innerText = "Connecting...";
    }
}

function init() {
    STATE.isConnected = false;
    activeWS && onClose();
    ws = new WebSocket(WS);
    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose);
    activeWS = ws;
    updateOnline();
}

init();