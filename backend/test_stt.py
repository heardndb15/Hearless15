import asyncio
from openai import AsyncOpenAI
import wave
import struct

async def main():
    client = AsyncOpenAI(api_key="sk-mYDNZTwyeIDNezkbnQDo0g", base_url="https://api.alem.ai/v1")
    
    # Create an empty wav file
    with wave.open("test.wav", "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(44100)
        for _ in range(44100):
            f.writeframes(struct.pack('<h', 0))

    try:
        with open("test.wav", "rb") as audio:
            res = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio
            )
        print("SUCCESS:", res.text)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
