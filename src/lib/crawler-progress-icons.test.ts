import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("crawler ilerleme metriklerinin tamamı Nucleo ikonu taşır", () => {
  const source = readFileSync(path.join(process.cwd(), "src/app/admin/crawler/crawler-runner.tsx"), "utf8");
  const labels = [
    "Bulunan URL",
    "Kontrol edilen",
    "Yeni eklenen",
    "Zaten vardı",
    "Bekleyen discovered",
    "Bilgisi çekilen",
    "AI içerik",
    "Hazırlanan",
    "Hata",
    "URL limiti",
    "İşlem limiti",
  ];

  for (const label of labels) {
    assert.match(
      source,
      new RegExp(`<ProgressStat label="${label}"[^>]+icon=\\{Icon[A-Za-z0-9]+FillDuo18\\}`),
      `${label} metriğinde Nucleo ikonu bulunmalı.`,
    );
  }
});
