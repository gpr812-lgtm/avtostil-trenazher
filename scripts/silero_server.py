#!/usr/bin/env python3
"""
Silero TTS HTTP сервер.
Мужские голоса: aidar, eugene
Женские голоса: baya, kseniya, xenia
"""
import sys
import os
import socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler
import io

os.environ['TORCH_HOME'] = '/home/z/.cache/torch'

_model = None

def get_model():
    global _model
    if _model is None:
        print("Loading Silero model...", file=sys.stderr, flush=True)
        import torch
        _model, _ = torch.hub.load(
            repo_or_dir='/home/z/.cache/silero-models',
            model='silero_tts',
            language='ru',
            speaker='v3_1_ru',
            source='local'
        )
        print(f"Model loaded. Voices: {_model.speakers}", file=sys.stderr, flush=True)
    return _model

def generate(text, voice='aidar'):
    import torch
    import numpy as np
    import scipy.io.wavfile as wav

    model = get_model()

    # Маппинг голосов
    voice_map = {
        'male': 'aidar',      # мужской
        'male2': 'eugene',    # второй мужской
        'female': 'kseniya',  # женский
        'female2': 'xenia',   # второй женский
        'female3': 'baya',    # третий женский
    }
    speaker = voice_map.get(voice, voice)

    if speaker not in model.speakers:
        speaker = 'aidar'

    audio = model.apply_tts(text=text, speaker=speaker, sample_rate=24000)
    audio_np = audio.numpy()

    # Конвертируем в WAV bytes
    buf = io.BytesIO()
    wav.write(buf, 24000, audio_np)
    return buf.getvalue()


class SileroHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/tts':
            self.send_error(404)
            return
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')

            # Разбираем JSON
            import json
            data = json.loads(body)
            text = data.get('text', '')
            voice = data.get('voice', 'male')

            if not text.strip():
                self.send_error(400, "Empty text")
                return

            wav_bytes = generate(text, voice)

            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Content-Length', str(len(wav_bytes)))
            self.end_headers()
            self.wfile.write(wav_bytes)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr, flush=True)
            self.send_error(500, str(e))

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        pass


class ThreadingHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    port = 8766
    print(f"Starting Silero TTS server on port {port}...", file=sys.stderr, flush=True)
    get_model()
    server = ThreadingHTTPServer(('127.0.0.1', port), SileroHandler)
    print(f"Server ready on http://127.0.0.1:{port}", file=sys.stderr, flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
