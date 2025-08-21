import { glob, writeFile } from "node:fs/promises";
import { readFile } from "fs/promises";
import { createRequire } from "node:module";
import { basename, extname, join } from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

async function buildMap() {
  const require = createRequire(import.meta.url);
  const iconSetsPattern = join(
    require.resolve("country-flag-icons"),
    "../3x2/*.svg"
  );

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseTagValue: false,
  });

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    suppressEmptyNode: true,
  });

  const iconContentMap = {};

  for await (const filePath of glob(iconSetsPattern)) {
    const name = basename(filePath, extname(filePath)).toLowerCase();
    const svgStr = await readFile(filePath, "utf-8");
    try {
      const parsed = parser.parse(svgStr);

      if (!parsed.svg) {
        throw new Error("不是有效的 SVG 内容");
      }

      const svgContent = parsed.svg;

      const {
        "@_xmlns": xmlns,
        "@_viewBox": viewBox,
        "@_width": width,
        "@_height": height,
        ...content
      } = svgContent;

      let result = "";

      Object.entries(content).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            result += builder.build({ [key]: item });
          });
        } else if (typeof value === "object" && value !== null) {
          result += builder.build({ [key]: value });
        } else if (typeof value === "string") {
          result += value;
        }
      });

      iconContentMap[name] = result;
    } catch (error) {
      throw new Error("解析 SVG 失败");
    }
  }

  return iconContentMap;
}

async function main() {
  const icons = await buildMap();
  const json = {
    prefix: "country-flag",
    icons,
  };
  
  await writeFile('./icons.json', JSON.stringify(json))
  console.log('build success.');
}

main();
