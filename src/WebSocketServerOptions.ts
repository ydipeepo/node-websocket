import ws from "ws";
import type { Logger } from "@ydipeepo/node-debug";

export default interface WebSocketServerOptions extends ws.ServerOptions {

    /**
     * ログを記録する場合は指定します。
     */
    readonly logger?: Logger;

}
