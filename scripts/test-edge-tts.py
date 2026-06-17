#!/usr/bin/env python3
"""Тест Edge TTS напрямую через Python API"""
import asyncio
import edge_tts

async def test_voices():
    # Тест мужского голоса
    print("=== Testing ru-RU-DmitryNeural (Male) ===")
    try:
        communicate = edge_tts.Communicate(
            "Здравствуйте! Меня зовут Андрей, я звоню по поводу Haval Jolion.",
            "ru-RU-DmitryNeural"
        )
        await communicate.save("/tmp/dmitry_test.mp3")
        import os
        size = os.path.getsize("/tmp/dmitry_test.mp3")
        print(f"✓ Dmitry saved: {size} bytes")
    except Exception as e:
        print(f"✗ Dmitry failed: {e}")

    # Тест женского голоса
    print("\n=== Testing ru-RU-SvetlanaNeural (Female) ===")
    try:
        communicate = edge_tts.Communicate(
            "Здравствуйте! Меня зовут Елена, я звоню по поводу Chery Tiggo.",
            "ru-RU-SvetlanaNeural"
        )
        await communicate.save("/tmp/svetlana_test.mp3")
        import os
        size = os.path.getsize("/tmp/svetlana_test.mp3")
        print(f"✓ Svetlana saved: {size} bytes")
    except Exception as e:
        print(f"✗ Svetlana failed: {e}")

    # Проверим доступные русские голоса с подробностями
    print("\n=== All Russian voices ===")
    voices = await edge_tts.list_voices()
    ru_voices = [v for v in voices if v['Locale'].startswith('ru')]
    for v in ru_voices:
        print(f"  {v['ShortName']} — {v.get('Gender', '?')} — {v.get('VoiceTag', {})}")

asyncio.run(test_voices())
