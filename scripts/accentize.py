#!/usr/bin/env python3
"""
Скрипт для авто-ударений через RUAccent (нейросетевая модель).
Принимает текст на stdin, выводит текст с ударениями (combining acute accent U+0301) на stdout.

Использование:
  echo "Привет" | python3 accentize.py
  python3 accentize.py --text "Привет"
"""
import argparse
import sys
import re
import os

# RUAccent грузится долго (~5 сек), поэтому кэшируем в глобальной переменной
_accentizer = None

def get_accentizer():
    global _accentizer
    if _accentizer is None:
        from ruaccent.ruaccent import RUAccent
        _accentizer = RUAccent()
        _accentizer.load(omograph_model_size='turbo', use_dictionary=True)
    return _accentizer


def add_accents(text: str) -> str:
    """Добавляет ударения (U+0301) к тексту через RUAccent."""
    accentizer = get_accentizer()
    accented = accentizer.process_all(text)

    # RUAccent ставит '+' после ударного слога.
    # Нужно найти следующую гласную после '+' и поставить combining accent на неё.
    vowels = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ'
    result = []
    i = 0
    while i < len(accented):
        ch = accented[i]
        if ch == '+' and i + 1 < len(accented):
            # Найти следующую гласную
            j = i + 1
            while j < len(accented) and accented[j] not in vowels:
                result.append(accented[j])
                j += 1
            if j < len(accented):
                # Поставить combining accent на эту гласную
                # Но только если на ней ещё нет ударения
                if not (j > 0 and accented[j-1] == '\u0301'):
                    result.append(accented[j] + '\u0301')
                else:
                    result.append(accented[j])
                j += 1
            i = j
        else:
            result.append(ch)
            i += 1
    return ''.join(result)


def main():
    parser = argparse.ArgumentParser(description="Auto-accentizer for Russian text")
    parser.add_argument('--text', type=str, help="Text to accentize")
    parser.add_argument('--output', type=str, help="Output file (default: stdout)")
    args = parser.parse_args()

    if args.text is not None:
        text = args.text
    else:
        text = sys.stdin.read().strip()

    if not text:
        print("", end="")
        return

    try:
        accented = add_accents(text)
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(accented)
            print(f"OK: {len(accented)} chars -> {args.output}", file=sys.stderr)
        else:
            print(accented)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        # Если ruaccent не сработал — выводим исходный текст
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(text)
        else:
            print(text)
        sys.exit(1)


if __name__ == "__main__":
    main()
