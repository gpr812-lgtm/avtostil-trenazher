#!/usr/bin/env python3
"""
Persistent HTTP-сервер для авто-ударений через RUAccent.
Держит модель в памяти, отвечает на HTTP-запросы быстро.
"""
import sys
import socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler

_accentizer = None


def get_accentizer():
    global _accentizer
    if _accentizer is None:
        print("Loading RUAccent model...", file=sys.stderr, flush=True)
        from ruaccent.ruaccent import RUAccent
        _accentizer = RUAccent()
        _accentizer.load(omograph_model_size='turbo', use_dictionary=True)
        print("Model loaded.", file=sys.stderr, flush=True)
    return _accentizer


def add_accents(text: str) -> str:
    accentizer = get_accentizer()
    accented = accentizer.process_all(text)

    vowels = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ'
    result = []
    i = 0
    while i < len(accented):
        ch = accented[i]
        if ch == '+' and i + 1 < len(accented):
            j = i + 1
            while j < len(accented) and accented[j] not in vowels:
                result.append(accented[j])
                j += 1
            if j < len(accented):
                result.append(accented[j] + '\u0301')
                j += 1
            i = j
        else:
            result.append(ch)
            i += 1
    return ''.join(result)


class AccentizeHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/accentize':
            self.send_error(404, "Not Found")
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            result = add_accents(body)
            response = result.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr, flush=True)
            # Fallback — вернуть исходный текст
            try:
                response = body.encode('utf-8') if 'body' in locals() else b""
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Content-Length', str(len(response)))
                self.end_headers()
                self.wfile.write(response)
            except:
                pass

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_error(404, "Not Found")

    def log_message(self, format, *args):
        pass  # Тихий режим


class ThreadingHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    port = 8765
    if len(sys.argv) > 1 and sys.argv[1] == '--port':
        port = int(sys.argv[2])

    print(f"Starting accentize server on port {port}...", file=sys.stderr, flush=True)
    # Предзагрузка модели
    get_accentizer()

    server = ThreadingHTTPServer(('127.0.0.1', port), AccentizeHandler)
    print(f"Server ready on http://127.0.0.1:{port}", file=sys.stderr, flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down...", file=sys.stderr, flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
