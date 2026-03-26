import fetch from "node-fetch";

async function run() {
  const res = await fetch("https://api.replicate.com/v1/models/cjwbw/zoedepth/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: {
        image: "https://replicate.delivery/pbxt/IPzzqLRb2x6XwGUK28l7dNTFO9MzQG1WmY2sdapZ2tnEdmMF/123.png"
      }
    })
  });
  const data = await res.json();
  console.log(data);
}
run();
