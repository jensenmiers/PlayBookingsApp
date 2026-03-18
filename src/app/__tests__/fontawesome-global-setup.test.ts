import fs from "node:fs";
import path from "node:path";

describe("Font Awesome global setup", () => {
  const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
  const layoutSource = fs.readFileSync(layoutPath, "utf8");

  it("imports the shared Font Awesome stylesheet in the root layout", () => {
    expect(layoutSource).toContain('import "@fortawesome/fontawesome-svg-core/styles.css";');
  });

  it("disables runtime Font Awesome CSS injection in the root layout", () => {
    expect(layoutSource).toContain("config.autoAddCss = false;");
  });
});
