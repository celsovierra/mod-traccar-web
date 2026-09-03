import http.server
import os

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="build", **kwargs)

    def do_GET(self):
        if not os.path.exists(os.path.join("build", self.path.lstrip("/"))) and not self.path.startswith("/assets/"):
            self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    server_address = ("0.0.0.0", 3000)
    httpd = http.server.HTTPServer(server_address, SPAHTTPRequestHandler)
    print("Servidor SPA rodando na porta 3000...")
    httpd.serve_forever()
