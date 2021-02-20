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
						socket.close();
						step++;
					}
					break;
				case "closed":
					expect(step).to.equal(2);
					resolve();
					break;
				case "error":
					reject(event.error);
					break;
			}
		}), options);
	});

	it("createWebSocketStream", async () => {
		const stream = createWebSocketStream(endpointUrl, options);
		stream.send("world");
		for await (const data of stream) {
			expect(data).is.equal("world");
			await stream.return();
		}
	});

});
