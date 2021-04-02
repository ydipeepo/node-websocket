import http from "http";
import ws from "ws";
import noop from "@ydipeepo/noop";
import { Logger } from "@ydipeepo/node-debug";

import WebSocket from "./WebSocket";
import WebSocketEvent from "./WebSocketEvent";
import WebSocketServerEvent from "./WebSocketServerEvent";
import WebSocketServerOptions from "./WebSocketServerOptions";

/**
 * ソケットオブジェクトを表します。
 */
interface WebSocketServer {

	/**
	 * サーバーポート。
	 */
	readonly port: number;

	/**
	 * 指定したデータをすべてのクライアントに送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

	/**
	 * このソケットを閉じます。
	 */
	close(): void;

}

namespace WebSocketServer {

	function isCloseEvent(event?: any): event is CloseEvent {

		return (
			event &&
			typeof event.wasClean === "boolean" &&
			typeof event.code === "number");

	}

	function createClient(callback: (event: WebSocketEvent) => void, socket: ws, logger?: Logger): WebSocket {

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

		socket.onclose = () => close();

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
			endpoint: "localhost",
			send,
			close,
		};

	}

	export function create(callback: (event: WebSocketServerEvent) => void, options: WebSocketServerOptions): WebSocketServer {

		const logger = options.logger;

		let socketServer = new ws.Server(options);
		let opened = false;

		const close = (event?: CloseEvent | Error) => {

			if (socketServer) {
				socketServer.off("connection", handleConnection);
				socketServer.off("listening", handleListening);
				socketServer.off("close", handleClose);
				socketServer.off("error", handleError);
				socketServer.close();
				socketServer = undefined;
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

			if (opened) {
				for (const socket of socketServer.clients) {
					socket.send(data);
				}
			} else {
				const error = new Error("Socket is not the OPEN state.");
				callback({ type: "error", error });
			}

		};

		const handleListening = () => {

			logger?.info(`Listening on port: ${options.port}`);
			opened = true;
			callback({ type: "listening", port: options.port });

		};

		const handleClose = () => {

			if (opened) {
				close();
			} else {
				const error = new Error("There was an error with the socket.");
				callback({ type: "error", error });
			}

		};

		const handleError = (error: Error) => {

			callback({ type: "error", error });

		};

		const handleConnection = (socket: ws, request: http.IncomingMessage) => {

			callback({
				type: "connected",
				url: request.url,
				headers: request.headers,
				create: (callback: (event: WebSocketEvent) => void) => createClient(callback, socket, logger),
			});

		};

		socketServer.on("connection", handleConnection);
		socketServer.on("listening", handleListening);
		socketServer.on("close", handleClose);
		socketServer.on("error", handleError);

		return {
			port: options.port,
			send,
			close,
		};

	}

}

export default WebSocketServer;
