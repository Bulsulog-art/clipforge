import { chromium } from "playwright";
import path from "node:path";
const browser = await chromium.launch();
for (const name of ["subscription-paywall", "credits-paywall"]) {
  const page = await browser.newPage({ viewport: { width: 1242, height: 2208 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.resolve(`${name}.html`));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `out/${name}.png` });
  console.log(name, "ok");
  await page.close();
}
await browser.close();
