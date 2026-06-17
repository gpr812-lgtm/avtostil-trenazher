#!/usr/bin/env python3
"""
Edge TTS CLI wrapper для использования из Next.js API.
Использование:
  python3 tts_edge.py --voice ru-RU-DmitryNeural --text "Привет" --output /tmp/out.mp3
"""
import argparse
import asyncio
import sys
import os

import edge_tts


async def generate(text: str, voice: str, output_path: str) -> None:
    """Генерация MP3 через Edge TTS с использованием stream() — надёжнее, чем save()."""
    # НЕ передаём rate/pitch — у некоторых голосов они ломаются
    communicate = edge_tts.Communicate(text, voice)
    with open(output_path, 'wb') as f:
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])


def main():
    parser = argparse.ArgumentParser(description="Edge TTS generator")
    parser.add_argument("--voice", required=True, help="Voice name (e.g. ru-RU-DmitryNeural)")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--output", required=True, help="Output MP3 file path")

    args = parser.parse_args()

    try:
        asyncio.run(generate(args.text, args.voice, args.output))
        size = os.path.getsize(args.output)
        if size == 0:
            print(f"ERROR: empty output for voice={args.voice}", file=sys.stderr)
            sys.exit(1)
        print(f"OK: {size} bytes -> {args.output}", file=sys.stderr)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        try:
            os.unlink(args.output)
        except:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
