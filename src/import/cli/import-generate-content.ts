import { getLimit } from "./args";

console.log(JSON.stringify({
  status: "ready",
  limit: getLimit(50),
  message: "AI icerik komutu hazir. Supabase game_imports queue baglantisi eklenince scraped kayitlari pending_review durumuna tasir.",
}, null, 2));
