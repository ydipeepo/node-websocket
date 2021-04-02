import http from "http";
import { AsyncStream, ConcurrentQueue, Signal } from "@ydipeepo/node-async";

import WebSocket from "./WebSocket";
import WebSocketEvent from "./WebSocketEvent";
import WebSocketServer from "./WebSocketServer";
import WebSocketServerEvent from "./WebSocketServerEvent";
import WebSocketServerOptions from "./WebSocketServerOptions";
import WebSocketStreamWithRequest from "./WebSocketStreamWithRequest";

interface WebSocketServerStream extends AsyncStream<WebSocketStreamWithRequest> {

	/**
	 * サーバーポート。
	 */
	readonly port: number;

	/**
	 * 指定したデータをすべてのクライアントに送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

}

namespace WebSocketServerStream {

	function createClientStream(create: (callback: (event: WebSocketEvent) => void) => WebSocket, url: string, headers: http.IncomingHttpHeaders): WebSocketStreamWithRequest {

		const eventQueue = new ConcurrentQueue<WebSocketEvent>();
		const socket = create(event => eventQueue.add(event));

		async function *createGenerator(): AsyncGenerator<string | ArrayBuffer, void, void> {

			const stopRequest = new Signal();

			try {

			_PUMP:

				while (true) {

					const event = await eventQueue.get(stopRequest);

					switch (event.type) {

						case "data_received":
							yield event.data;
							break;

						case "error":
							if (event.error !== undefined) {
								throw event.error;
							}
							break;

						case "closed":
							break _PUMP;

					}

				}

			} finally {

				stopRequest.trigger();
				socket.close();

			}
		
		}

		const stream: any = AsyncStream.from(createGenerator());
		stream.endpoint = socket.endpoint;
		stream.send = socket.send;
		stream.url = url;
		stream.headers = headers;
		return stream;

	}

	export function create(options: WebSocketServerOptions): WebSocketServerStream {

		const eventQueue = new ConcurrentQueue<WebSocketServerEvent>();
		const socketServer = WebSocketServer.create(event => eventQueue.add(event), options);

		let opened = false;
		let buffer: undefined | (string | ArrayBuffer)[];

		const send = (data: string | ArrayBuffer) => {

			if (opened) {
				socketServer.send(data);
			} else {
				buffer ??= [];
				buffer.push(data);
			}

		};

		async function *createGenerator(): AsyncGenerator<WebSocketStreamWithRequest, void, void> {

			const stopRequest = new Signal();

			try {

			_PUMP:

				while (true) {

					const event = await eventQueue.get(stopRequest);

					switch (event.type) {

						case "connected":
							yield createClientStream(event.create, event.url, event.headers);
							break;

						case "listening":
							if (buffer) {
								for (const data of buffer) {
									socketServer.send(data);
								}
								buffer = undefined;
							}
							opened = true;
							break;
	
						case "error":
							if (event.error) {
								throw event.error;
							}
							break;

						case "closed":
							break _PUMP;

					}

				}

			} finally {

				stopRequest.trigger();
				socketServer.close();

			}

		}

		const stream: any = AsyncStream.from(createGenerator());
		stream.port = options.port;
		stream.send = send;
		return stream;

	}

}

export default WebSocketServerStream;
