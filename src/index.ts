import { createReadStream } from "fs";
import { writeFile} from "fs/promises";
import * as readlinePromises from "node:readline/promises";
import { Kage, Polygons } from "@kurgm/kage-engine";
import * as cliProgress from 'cli-progress'

type Glyph = {
  name: string;
  related: string;
  data: string;
};

const dumpFileName = "dump_newest_only.txt";
const outputDir = "images";

const db: Glyph[] = [];

function findOne(name: string): Glyph | undefined {
  return db.find((glyph) => glyph.name === name);
}

async function genDb() {
  const rs = createReadStream(dumpFileName, {
    encoding: "utf-8",
  });

  const rl = readlinePromises.createInterface({
    input: rs,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const [name, related, data] = line.split("|").map((cell) => cell.trim());
    db.push({ name, related, data });
  }
}

function genSvg(glyphName: string) {
  const kage = new Kage();

  const glyph = findOne(glyphName);
  if (!glyph) return null;

  kage.kBuhin.push(glyphName, glyph.data);

  const containedGlyphs = getContainedGlyphs(glyphName);
  if (!containedGlyphs) return null;

  for (const glyph of containedGlyphs) {
    kage.kBuhin.push(glyph.name, glyph.data);
  }

  const polygons = new Polygons();
  kage.makeGlyph(polygons, glyphName);
  const svg = polygons.generateSVG();
  return svg;
}

function getContainedGlyphs(
  name: string,
  results: Glyph[] = []
): Glyph[] | null {
  const glyph = findOne(name);
  // console.log(name,glyph);
  if (glyph) {
    results.push(glyph);
    const polygons = glyph.data.split("$");
    for (const polygon of polygons) {
      if (polygon.startsWith("99")) {
        const childName = polygon.split(":")[7];
        getContainedGlyphs(childName, results);
      }
    }
    return results;
  } else return null;
}

(async function main() {
  console.log("Generating database...");
  await genDb();
  console.log("Database generated.");

  const glyphNamePattern = /^dkw-/;
  const listToGen = db.filter((glyph) => glyphNamePattern.test(glyph.name));
  // console.log(listToGen.length);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  console.log("Generating SVGs...");
  bar.start(listToGen.length, 0);

  await Promise.all(listToGen.map(async (glyph)=>{
    bar.increment();
    const svg = genSvg(glyph.name);
    if (svg) {
      const filePath = `${outputDir}/${glyph.name}.svg`;
      await writeFile(filePath, svg);
    }
  }))

  bar.stop();
  console.log("Done.");
})();
