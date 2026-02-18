import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "apps/web/public/data/holidays/CN");

function remote(year) {
  return `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`;
}

async function writeIfChanged(filePath, content) {
  try {
    const old = await fs.readFile(filePath, "utf8");
    if (old === content) return false;
  } catch {}
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return true;
}

async function main() {
  const now = new Date();
  const y = now.getFullYear();

  // 同步：今年 + 明年（够用；你也可以改成 y..y+2）
  const years = [y, y + 1];

  let changed = false;

  for (const year of years) {
    const url = remote(year);
    const res = await fetch(url, { headers: { "user-agent": "timewall-sync" } });
    if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
    const text = await res.text();

    const out = path.join(OUT_DIR, `${year}.json`);
    const ok = await writeIfChanged(out, text);
    changed = changed || ok;

    console.log(`${year}: ${ok ? "updated" : "unchanged"}`);
  }

  // 写一个 index 方便你以后扩展其它地区
  const idx = JSON.stringify({ region: "CN", years }, null, 2) + "\n";
  changed = (await writeIfChanged(path.join(OUT_DIR, "index.json"), idx)) || changed;

  if (!changed) console.log("No changes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
