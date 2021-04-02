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
	readonly endpoint: string;

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
	 * @param endpoint 接続先 URL。
	 * @param callback イベントを受け取るためのコールバック。
	 * @param options ソケット作成オプション。
	 */
	export function create(endpoint: string, callback: (event: WebSocketEvent) => void, options?: WebSocketOptions): WebSocket {

		const logger = options?.logger;

		let socket: ws | undefined = new ws(endpoint, options);
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
				callback({ type: "closed", error });
			} else if (event instanceof Error) {
				callback({ type: "closed", error: event });
			} else {
				callback({ type: "closed" });
			}

		};

		const send = (data: string | ArrayBuffer) => {
			
			if (socket && socket.readyState === ws.OPEN) {
				logger?.debug("Sending data.");
				socket.send(data);
			} else {
				const error = new Error("Socket is not the OPEN state.");
				callback({ type: "error", error });
			}

		};

		socket.onopen = () => {

			logger?.info(`Connected to endpoint: ${endpoint}`);
			opened = true;
			callback({ type: "opened" });

		};

		socket.onclose = event => {

			if (opened) {
				close();
			} else {
				const error = event instanceof ErrorEvent
					? event.error
					: new Error("There was an error with the socket.");
				callback({ type: "error", error });
			}

		};

		socket.onerror = event => {

			const error = event instanceof ErrorEvent
				? event.error
				: new Error("There was an error with the socket.");
			callback({ type: "error", error });

		};

		socket.onmessage = event => {

			try {
				logger?.debug("Received data.");
				callback({ type: "data_received", data: event.data as string | ArrayBuffer });
			} catch (error) {
				close(error);
			}

		};

		return {
			endpoint,
			send,
			close,
		};

	}

}

export default WebSocket;
