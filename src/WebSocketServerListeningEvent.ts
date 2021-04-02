export default interface WebSocketServerListeningEvent {

	readonly type: "listening";

	readonly port: number;

}
