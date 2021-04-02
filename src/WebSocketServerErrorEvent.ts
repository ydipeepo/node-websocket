export default interface WebSocketServerErrorEvent {

	readonly type: "error";

	readonly error?: Error;

}
