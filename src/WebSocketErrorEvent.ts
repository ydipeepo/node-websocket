export default interface WebSocketErrorEvent {
	
	readonly type: "error";

	readonly error?: Error;

}
