const https = require('https');

const apiKey = "AIzaSyDyfbZdrEES_M2hMdoZG3sCtzWE-OllScw";
const data = JSON.stringify({
  contents: [{ parts: [{ text: "Reply with 'Valid'" }] }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log("Validation Successful: API Key is working.");
      console.log("Response:", JSON.parse(body).candidates[0].content.parts[0].text);
    } else {
      console.error(`Validation Failed: Status Code ${res.statusCode}`);
      console.error("Error:", body);
    }
  });
});

req.on('error', (error) => {
  console.error("Request Error:", error);
});

req.write(data);
req.end();
