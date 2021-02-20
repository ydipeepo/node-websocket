const { createLogger } = require("@ydipeepo/node-debug");
const { expect } = require("chai");

describe("node-websocket", () => {

	const endpointUrl = "ws://localhost:8000";
	const options = { logger: createLogger("node-websocket") };

	const {
		createWebSocket,
		createWebSocketStream,
	} = require("../dist");

	it("createWebSocket", () => {
		let step = 0;
		const socket = createWebSocket(endpointUrl, event => new Promise((resolve, reject) => {
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

	it("createWebSocketStream", async () => {
		let step = 0;
		const stream = createWebSocketStream(endpointUrl, options);
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
