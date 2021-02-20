import ws from "ws";
import noop from "@ydipeepo/noop";

import WebSocketOptions from "./WebSocketOptions";
import WebSocketEvent from "./WebSocketEvent";
import WebSocketOpenedEvent from "./WebSocketOpenedEvent";
import WebSocketClosedEvent from "./WebSocketClosedEvent";
import WebSocketDataReceivedEvent from "./WebSocketDataReceivedEvent";
import WebSocketErrorEvent from "./WebSocketErrorEvent";

/**
 * ソケットオブジェクトを表します。
 */
interface WebSocket {

	/**
	 * 接続先 URL。
	 */
	readonly endpointUrl: string;

	/**
	 * 指定したデータを送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

	/**
	 * このソケットを閉じます。
	 */
	close(): void;

}

namespace WebSocket {

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
	export function create(endpointUrl: string, callback: (event: WebSocketEvent) => void, options?: WebSocketOptions): WebSocket {

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


}

export default WebSocket;
