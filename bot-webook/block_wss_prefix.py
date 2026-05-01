
from mitmproxy import http, ctx, websocket

TARGET_PREFIX = "api.seatcloud.com:8443/"

class WSSPrefixBlocker:
    def _host_port_path(self, req):
        host = req.host or req.pretty_host or ""
        port = f":{req.port}" if getattr(req, "port", None) else ""
        return f"{host}{port}{req.path}"

    def request(self, flow: http.HTTPFlow) -> None:
        hp = self._host_port_path(flow.request)
        if hp.startswith(TARGET_PREFIX):
            ctx.log.info(f"Blocking request matching prefix: {hp}")
            flow.response = http.Response.make(403, b"Blocked by policy")

    def websocket_handshake(self, flow: websocket.WebSocketFlow) -> None:
        try:
            req = flow.handshake
        except Exception:
            req = flow.request
        hp = self._host_port_path(req)
        if hp.startswith(TARGET_PREFIX):
            ctx.log.info(f"Blocking websocket handshake matching prefix: {hp}")
            flow.response = http.Response.make(403, b"Blocked by policy")

addons = [WSSPrefixBlocker()]
