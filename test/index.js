const { ConsoleLoggerFactory } = require("@ydipeepo/node-debug");
const { expect } = require("chai");

describe("node-websocket", () => {

	const loggerFactory = new ConsoleLoggerFactory();
	const endpointUrl = "ws://localhost:8000";
	const options = { logger: loggerFactory.create("node-websocket") };

	const { WebSocket, WebSocketStream } = require("../dist");

	it("socket", () => {
		let step = 0;
		const socket = WebSocket.create(endpointUrl, event => new Promise((resolve, reject) => {
			switch (event.type) {
				case "opened":
					socket.send("hello");
					step++;
					break;
				case "data_received":
					if (event.data === "hello") {
						socket.send("world");
						step++;
					}
					if (event.data === "world") {
						socket.close();
						step++;
					}
					break;
				case "closed":
					expect(step).to.equal(3);
					resolve();
					break;
				case "error":
					reject(event.error);
					break;
			}
		}), options);
	});

	it("socket stream", async () => {
		let step = 0;
		const stream = WebSocketStream.create(endpointUrl, options);
		stream.send("hello");
		for await (const data of stream) {
			if (data === "hello") {
				stream.send("world");
				step++;
			}
			if (data === "world") {
				await stream.return();
				step++;
			}
		}
		expect(step).is.equal(2);
	});

});
