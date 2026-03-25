import fs from 'fs';

async function test() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
}

test();
