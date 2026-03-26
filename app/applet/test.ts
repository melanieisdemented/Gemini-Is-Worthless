import fetch from "node-fetch";

async function run() {
  const res = await fetch("https://api.replicate.com/v1/models/cjwbw/zoedepth", {
    headers: {
      "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`
    }
  });
  const data = await res.json();
  console.log(data);
}
run();
