/**
 * Curate local, attributed botanical photos for every server-owned flower.
 * Run explicitly with `node scripts/curate-flower-photos.mjs` when the flower
 * catalogue changes. This never changes reward odds or learner ownership.
 */
import { access, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const cataloguePath = path.join(root, "src/modules/motivation/utils/flower-chests.ts");
const outputDirectory = path.join(root, "public/flower-chests");
const manifestPath = path.join(root, "src/modules/motivation/utils/flower-photos.json");
const userAgent = "KRIN-EdTech/1.0 (educational botanical photo curation)";
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const englishArticle = {
  "pink-lily": "Lilium martagon",
  "white-lily": "Lilium candidum",
  "lady-slipper": "Cypripedium calceolus",
  "fine-leaved-peony": "Paeonia tenuifolia",
  "great-masterwort": "Astrantia major",
  "wood-anemone": "Anemone nemorosa",
  "spring-adonis": "Adonis vernalis",
  "columbine-meadow-rue": "Thalictrum aquilegiifolium",
  "three-lobed-fern": "Gymnocarpium dryopteris",
  "great-mullein": "Verbascum thapsus",
  "fireweed": "Chamaenerion angustifolium",
  "knotgrass": "Polygonum aviculare",
};

const commonsFile = {
  "monkey-orchid": "Orchis simia flower.jpg",
  // A. besserianum is treated within the A. lycoctonum complex; this is a
  // representative relative rather than a documented Besser specimen.
  "bessers-aconite": "Aconitum lycoctonum (flower).jpg",
  "water-chestnut": "Trapa natans Kotewka orzech wodny 2015-05-04 04.jpg",
  "bieberstein-tulip": "Тюльпан дібровний у байраці. Ландшафтний заказник \"Старовишневецький\".jpg",
  "coltsfoot": "Tussilago farfara 20160403 03.JPG",
  "wood-anemone": "Anemone nemorosa close up.jpg",
};

function cleanTitle(value) {
  return value.replace(/\s*\([^)]*\)/gu, "").trim();
}

function plainText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/gu, "")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .trim();
}

async function api(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  for (const [key, value] of Object.entries({ action: "query", format: "json", formatversion: "2", ...params })) {
    url.searchParams.set(key, String(value));
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await pause(1_500);
    const response = await fetch(url, { headers: { "User-Agent": userAgent } });
    if (response.status === 429 && attempt < 3) { await pause(10_000 * (attempt + 1)); continue; }
    if (!response.ok) throw new Error(`${host}: HTTP ${response.status}`);
    return response.json();
  }
  throw new Error(`${host}: rate limited`);
}

function normalizedTitle(value) {
  return value.replaceAll("_", " ").normalize("NFC").toLocaleLowerCase();
}

async function queryPages(host, titles, params) {
  const mapped = new Map();
  for (let start = 0; start < titles.length; start += 50) {
    const requested = titles.slice(start, start + 50);
    const response = await api(host, { ...params, titles: requested.join("|"), redirects: "1" });
    const aliases = new Map([
      ...(response.query?.normalized ?? []).map(({ from, to }) => [normalizedTitle(from), normalizedTitle(to)]),
      ...(response.query?.redirects ?? []).map(({ from, to }) => [normalizedTitle(from), normalizedTitle(to)]),
    ]);
    const pages = new Map((response.query?.pages ?? []).map((page) => [normalizedTitle(page.title), page]));
    for (const title of requested) {
      let current = normalizedTitle(title);
      for (let hop = 0; hop < 4 && aliases.has(current); hop += 1) current = aliases.get(current);
      mapped.set(title, pages.get(current) ?? null);
    }
  }
  return mapped;
}

function licensedImage(page) {
  const info = page?.imageinfo?.[0];
  if (!info || !["image/jpeg", "image/png", "image/webp"].includes(info.mime)) return null;
  const metadata = info.extmetadata ?? {};
  const license = plainText(metadata.LicenseShortName?.value);
  if (!/^(CC0|CC BY(?:-SA)?(?:\s|$)|Public domain|PD-)/iu.test(license)) return null;
  return {
    url: info.thumburl ?? info.url,
    source: info.descriptionurl,
    artist: plainText(metadata.Artist?.value) || "Wikimedia Commons contributor",
    license,
    licenseUrl: plainText(metadata.LicenseUrl?.value) || info.descriptionurl,
  };
}

async function main() {
  const source = await readFile(cataloguePath, "utf8");
  const flowers = Array.from(source.matchAll(/\{\s*id:\s*"([a-z-]+)"[^\n]*?\bru:\s*"([^"]+)"/gu), ([, id, ru]) => ({ id, ru }));
  if (flowers.length < 100 || new Set(flowers.map(({ id }) => id)).size !== flowers.length) {
    throw new Error(`Expected the complete flower catalogue, found ${flowers.length} entries.`);
  }
  const russianTitles = flowers.map(({ ru }) => cleanTitle(ru));
  const russianPages = await queryPages("ru.wikipedia.org", russianTitles, { prop: "pageimages", pithumbsize: "640" });
  const englishIds = flowers.filter((flower) => !russianPages.get(cleanTitle(flower.ru))?.pageimage && englishArticle[flower.id]);
  const englishPages = await queryPages("en.wikipedia.org", englishIds.map((flower) => englishArticle[flower.id]), { prop: "pageimages", pithumbsize: "640" });
  const selectedFiles = new Map(flowers.map((flower) => [flower.id,
    commonsFile[flower.id]
      ?? russianPages.get(cleanTitle(flower.ru))?.pageimage
      ?? englishPages.get(englishArticle[flower.id])?.pageimage
      ?? null]));
  const fileNames = [...new Set([...selectedFiles.values()].filter(Boolean))];
  const commonsPages = await queryPages("commons.wikimedia.org", fileNames.map((name) => `File:${name}`), {
    prop: "imageinfo", iiprop: "url|extmetadata|mime", iiurlwidth: "640",
  });
  await mkdir(outputDirectory, { recursive: true });
  const previousManifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
  const manifest = {};
  const missing = [];
  for (const flower of flowers) {
    try {
      const filePath = path.join(outputDirectory, `${flower.id}.webp`);
      if (previousManifest[flower.id] && await access(filePath).then(() => true, () => false)) {
        manifest[flower.id] = previousManifest[flower.id];
        continue;
      }
      const fileName = selectedFiles.get(flower.id);
      const photo = fileName ? licensedImage(commonsPages.get(`File:${fileName}`)) : null;
      if (!photo) { missing.push(flower); continue; }
      await pause(250);
      const response = await fetch(photo.url, { headers: { "User-Agent": userAgent } });
      if (!response.ok) throw new Error(`photo HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      await sharp(bytes).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(filePath);
      manifest[flower.id] = {
        src: `/flower-chests/${flower.id}.webp`, artist: photo.artist,
        license: photo.license, licenseUrl: photo.licenseUrl, source: photo.source,
      };
      console.log(`${Object.keys(manifest).length}/${flowers.length} ${flower.id}`);
    } catch (error) {
      console.warn(`${flower.id}: ${error instanceof Error ? error.message : error}`);
      missing.push(flower);
    }
  }
  if (manifest["bessers-aconite"]) {
    manifest["bessers-aconite"].note = {
      en: "Photo of a related plant from the Aconitum lycoctonum complex; exact A. besserianum identification is not verified.",
      ru: "На фото близкий вид из группы Aconitum lycoctonum; точное определение аконита Бессера не подтверждено.",
      uk: "На фото споріднений вид із групи Aconitum lycoctonum; точне визначення аконіту Бессера не підтверджено.",
    };
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const credits = Object.entries(manifest).map(([id, photo]) =>
    `- **${id}** — ${photo.artist}; [source](${photo.source}); [${photo.license}](${photo.licenseUrl}). Resized for this site.${photo.note ? ` ${photo.note.en}` : ""}`);
  await writeFile(path.join(outputDirectory, "ATTRIBUTION.md"), `# Flower photography credits\n\n${credits.join("\n")}\n`);
  console.log(`Saved ${Object.keys(manifest).length}/${flowers.length} photos. Missing: ${missing.map((flower) => flower.id).join(", ") || "none"}`);
}

await main();
