import { AsyncStream, ConcurrentQueue, Signal } from "@ydipeepo/node-async";

import WebSocket from "./WebSocket";
import WebSocketOptions from "./WebSocketOptions";
import WebSocketEvent from "./WebSocketEvent";

interface WebSocketStream extends AsyncStream<string | ArrayBuffer> {

	/**
	 * 接続先 URL。
	 */
    readonly endpoint: string;

	/**
	 * 指定したデータを送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

}

namespace WebSocketStream {

	/**
	 * 受信したデータのストリームとしてソケットオブジェクトを作成します。
	 * @param endpointUrl 接続先 URL。
	 * @param options ソケット作成オプション。
	 */
	export function create(endpoint: string, options?: WebSocketOptions): WebSocketStream {

		const eventQueue = new ConcurrentQueue<WebSocketEvent>();
		const socket = WebSocket.create(endpoint, event => eventQueue.add(event), options);

		let opened = false;
		let buffer: undefined | (string | ArrayBuffer)[];

		const send = (data: string | ArrayBuffer) => {

			if (opened) {
				socket.send(data);
			} else {
				buffer ??= [];
				buffer.push(data);
			}
			
		};

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

						case "opened":
							if (buffer) {
								for (const data of buffer) {
									socket.send(data);
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
				socket.close();

			}
		
		}

		const stream: any = AsyncStream.from(createGenerator());
		stream.endpoint = endpoint;
		stream.send = send;
		return stream;

	}

}

export default WebSocketStream;
