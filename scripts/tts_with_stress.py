#!/usr/bin/env python3
"""TTS через edge-tts + StressRNN.

Принимает JSON из stdin: {"text": "...", "voice": "ru-RU-DmitryNeural", "output_path": "..."}
Генерирует MP3 через edge-tts с автоматической расстановкой ударений через StressRNN.
"""

import sys
import os
import json
import asyncio
import tempfile
import inspect
import re
from collections import namedtuple

# === Patch inspect: getargspec удалён в Python 3.13 ===
_ArgSpec = namedtuple('ArgSpec', ['args', 'varargs', 'keywords', 'defaults'])
if not hasattr(inspect, 'getargspec'):
    def _getargspec(func):
        spec = inspect.getfullargspec(func)
        return _ArgSpec(
            args=spec.args,
            varargs=spec.varargs,
            keywords=spec.varkw,
            defaults=spec.defaults,
        )
    inspect.getargspec = _getargspec

# === Shim: pymorphy2 → pymorphy3 ===
try:
    import pymorphy2  # noqa
except (ImportError, AttributeError):
    try:
        import pymorphy3
        import pymorphy3.analyzer
        import pymorphy3.units
        import pymorphy3.units.base
        sys.modules['pymorphy2'] = pymorphy3
        sys.modules['pymorphy2.analyzer'] = pymorphy3.analyzer
        sys.modules['pymorphy2.units'] = pymorphy3.units
        sys.modules['pymorphy2.units.base'] = pymorphy3.units.base
    except ImportError:
        pass


_stress_model = None
ACCENT = chr(0x0301)


def get_stress_model():
    global _stress_model
    if _stress_model is False:
        return None
    if _stress_model is None:
        try:
            from stressrnn import StressRNN
            _stress_model = StressRNN()
            print("[tts-stress] StressRNN loaded OK", file=sys.stderr)
        except Exception as e:
            print(f"[tts-stress] StressRNN not available: {e}", file=sys.stderr)
            _stress_model = False
            return None
    return _stress_model if _stress_model is not False else None


def apply_stress(text):
    if not text or not text.strip():
        return text
    try:
        model = get_stress_model()
        if model is None:
            return text
        stressed = model.put_stress(text)
        return re.sub(r'([аооуыэяёюиеАОУЫЭЯЁЮИЕ])\+', r'\1' + ACCENT, stressed)
    except Exception as e:
        print(f"[tts-stress] Error: {e}", file=sys.stderr)
        return text


def add_natural_pauses(text):
    result = re.sub(r'([.!?])\s*', r'\1 ... ', text)
    result = re.sub(r'\s+', ' ', result).strip()
    return result


async def generate_tts(text, voice, output_path):
    import edge_tts
    stressed_text = apply_stress(text)
    text_with_pauses = add_natural_pauses(stressed_text)
    communicate = edge_tts.Communicate(text_with_pauses, voice)
    await communicate.save(output_path)


def main():
    input_data = sys.stdin.read()
    if not input_data:
        sys.exit(1)
    try:
        data = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    text = data.get('text', '').strip()
    voice = data.get('voice', 'ru-RU-DmitryNeural')
    output_path = data.get('output_path')
    if not text:
        sys.exit(1)
    if not output_path:
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            output_path = tmp.name
        asyncio.run(generate_tts(text, voice, output_path))
        with open(output_path, 'rb') as f:
            sys.stdout.buffer.write(f.read())
        os.unlink(output_path)
    else:
        asyncio.run(generate_tts(text, voice, output_path))


if __name__ == '__main__':
    main()
