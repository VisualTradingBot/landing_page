const url = "https://api.coingecko.com/api/v3/ping";
const options = {
  method: "GET",
  headers: { "x-cg-demo-api-key": "CG-QimdPsyLSKFzBLJHXU2TtZ4w" },
  body: undefined,
};

try {
  const res = await fetch(url, options);
  const text = await res.text();
  console.log("status", res.status);
  try {
    console.log("body:", JSON.parse(text));
  } catch (e) {
    console.log("body (raw):", text);
  }
} catch (err) {
  console.error("fetch error:", err);
}
