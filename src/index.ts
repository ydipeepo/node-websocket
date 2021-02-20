import ws from "ws";
import noop from "@ydipeepo/noop";
import { AsyncStream, ConcurrentQueue } from "@ydipeepo/node-async";

import WebSocket from "./WebSocket";
import WebSocketOptions from "./WebSocketOptions";
import WebSocketEvent from "./WebSocketEvent";
import WebSocketOpenedEvent from "./WebSocketOpenedEvent";
import WebSocketClosedEvent from "./WebSocketClosedEvent";
import WebSocketDataReceivedEvent from "./WebSocketDataReceivedEvent";
import WebSocketErrorEvent from "./WebSocketErrorEvent";
import WebSocketStream from "./WebSocketStream";

function isCloseEvent(event?: any): event is CloseEvent {
	return (
		event &&
		typeof event.wasClean === "boolean" &&
		typeof event.code === "number");
}

/**
 * すべてのイベントを `callback` に集約し、切断処理を実装したソケットオブジェクトを作成します。
 * @param endpointUrl 接続先 URL。
 * @param callback イベントを受け取るためのコールバック。
 * @param options ソケット作成オプション。
 */
function createWebSocket(endpointUrl: string, callback: (event: WebSocketEvent) => void, options?: WebSocketOptions): WebSocket {

	const logger = options?.logger;

	let socket: ws | undefined = new ws(endpointUrl, options);
	let opened = false;

	const close = (event?: CloseEvent | Error) => {

		if (socket) {
			socket.onclose = noop;
			socket.onerror = noop;
			socket.onmessage = noop;
			socket.close();
			socket = undefined;
		}

		logger?.info("Closed.");

		if (isCloseEvent(event) && (event.wasClean === false || event.code !== 1000)) {
			const error = new Error(`Socket closed with status code: ${event.code} (${event.reason})`);
			callback({ type: "closed", error } as WebSocketClosedEvent);
		} else if (event instanceof Error) {
			callback({ type: "closed", error: event } as WebSocketClosedEvent);
		} else {
			callback({ type: "closed" } as WebSocketClosedEvent);
		}

	};

	const send = (data: string | ArrayBuffer) => {
		
		if (socket && socket.readyState === ws.OPEN) {
			logger?.debug("Sending data.");
			socket.send(data);
		} else {
			const error = new Error("Socket is not the OPEN state.");
			callback({ type: "error", error } as WebSocketErrorEvent);
		}

	};

	socket.onopen = () => {
		
		logger?.info(`Connected to endpoint: ${endpointUrl}`);
		opened = true;
		callback({ type: "opened" } as WebSocketOpenedEvent);

	};

	socket.onclose = event => {

		if (opened) {
			close();
		} else {
			const error = event instanceof ErrorEvent
				? event.error
				: new Error("There was an error with the socket.");
			callback({ type: "error", error } as WebSocketErrorEvent);
		}

	};

	socket.onerror = event => {

		const error = event instanceof ErrorEvent
			? event.error
			: new Error("There was an error with the socket.");
		callback({ type: "error", error } as WebSocketErrorEvent);

	};

	socket.onmessage = event => {

		try {
			logger?.debug("Received data.");
			callback({ type: "data_received", data: event.data } as WebSocketDataReceivedEvent);
		} catch (error) {
			close(error);
		}

	};

	return {
		endpointUrl,
		send,
		close,
	};

}

/**
 * 受信したデータのストリームとしてソケットオブジェクトを作成します。
 * @param endpointUrl 接続先 URL。
 * @param options ソケット作成オプション。
 */
function createWebSocketStream(endpointUrl: string, options?: WebSocketOptions): WebSocketStream {

	//
	// ソケットとそのイベントを仲介するキューを作成
	//

	const socketEventQueue = new ConcurrentQueue<WebSocketEvent>();
	const socket = createWebSocket(endpointUrl, event => socketEventQueue.add(event), options);

	//
	// 接続を確立するまでの間、送信しようとしたデータは一時的なバッファに蓄える
	//

	let sendDataQueue: undefined | (string | ArrayBuffer)[];
	const send = (data: string | ArrayBuffer) => socket.send(data);
	const sendDeferred = (data: string | ArrayBuffer) => {
		sendDataQueue ??= [];
		sendDataQueue.push(data);
	};

	//
	// イベントキューからデータを受け取るストリームを作成
	//

	async function *createStream(): AsyncStream<string | ArrayBuffer> {

		try {
	
			//
			// イベントをポンプし `data_received` イベントだけ返すよう変形
			// その他のイベントはストリームに合わせてここで処理します
			//

		_PUMP:
			while (true) {
				const event = await socketEventQueue.get();
				switch (event.type) {
					case "data_received":
						yield event.data;
						break;
					case "opened":
						if (sendDataQueue !== undefined) {
							for (const data of sendDataQueue) {
								socket.send(data);
							}
							sendDataQueue = undefined;
						}
						stream.send = send;
						break;
					case "error":
						if (event.error !== undefined) throw event.error;
						break;
					case "closed":
						break _PUMP;
				}
			}
		} finally {
			socket.close();
		}
	
	}

	const stream: any = createStream();
	stream.endpointUrl = endpointUrl;
	stream.send = sendDeferred;
	return stream;

}

export {
	WebSocket,
	WebSocketStream,
	WebSocketOptions,
	WebSocketEvent,
	WebSocketOpenedEvent,
	WebSocketClosedEvent,
	WebSocketDataReceivedEvent,
	WebSocketErrorEvent,
	createWebSocket,
	createWebSocketStream,
}
