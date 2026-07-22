import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForSelector("text=2024 Toyota Prius XLE");

await page.click("button:has-text('Update')");
await page.waitForSelector("text=Update Maintenance");

// check miles default value has commas, and date default is real today
const info = await page.evaluate(() => {
  const milesInput = document.querySelector('input[type="text"]');
  const dateInput = document.querySelector('input[type="date"]');
  const milesColor = getComputedStyle(milesInput).color;
  const dateColor = getComputedStyle(dateInput).color;
  return { milesValue: milesInput.value, dateValue: dateInput.value, milesColor, dateColor };
});
console.log("info:", JSON.stringify(info));
console.log("todayReal:", new Date().toISOString().slice(0, 10));

await page.screenshot({ path: "scripts/.output/modal-default.png" });

// focus miles, should clear
await page.click('input[type="text"]');
const afterFocus = await page.evaluate(() => document.querySelector('input[type="text"]').value);
console.log("clearedOnFocus:", afterFocus === "");

// type new value
await page.keyboard.type("24500");
const afterType = await page.evaluate(() => {
  const el = document.querySelector('input[type="text"]');
  return { value: el.value, color: getComputedStyle(el).color };
});
console.log("afterType:", JSON.stringify(afterType));

// blur without keeping value (clear it and blur)
await page.fill('input[type="text"]', "");
await page.locator('[role="dialog"] p:has-text("Update Maintenance")').click();
const afterBlurEmpty = await page.evaluate(() => document.querySelector('input[type="text"]').value);
console.log("restoredOnBlurWhenEmpty:", afterBlurEmpty);

// check trailing item + long label rendering (Battery & Electrical has 3 items -> trailing lone item)
const dialog = page.locator('[role="dialog"]');
await dialog.locator("text=Battery & Electrical").scrollIntoViewIfNeeded();
const wiperBtn = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('[role="dialog"] button')];
  const btn = buttons.find((b) => b.textContent.trim() === "Wiper blades");
  const parent = btn.parentElement;
  const rect = btn.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  return { btnWidth: rect.width, parentWidth: parentRect.width, ratio: rect.width / parentRect.width };
});
console.log("wiperBtnFillsHalf:", JSON.stringify(wiperBtn));

// check overflow on a long label
const longLabelOverflow = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('[role="dialog"] button')];
  const btn = buttons.find((b) => b.textContent.includes("State emissions"));
  if (!btn) return "not found";
  return { scrollWidth: btn.scrollWidth, clientWidth: btn.clientWidth, overflowing: btn.scrollWidth > btn.clientWidth };
});
console.log("longLabelOverflow:", JSON.stringify(longLabelOverflow));

await page.screenshot({ path: "scripts/.output/modal-full.png", fullPage: false });

console.log("ERRORS:", JSON.stringify(errors));
await browser.close();
