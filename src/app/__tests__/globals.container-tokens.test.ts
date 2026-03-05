import fs from "node:fs";
import path from "node:path";

function extractThemeInlineBlock(css: string): string {
  const themeStart = css.indexOf("@theme inline");
  if (themeStart === -1) {
    throw new Error("Could not find @theme inline block in globals.css");
  }

  const openBraceIndex = css.indexOf("{", themeStart);
  if (openBraceIndex === -1) {
    throw new Error("Could not find opening brace for @theme inline block");
  }

  let depth = 0;
  for (let i = openBraceIndex; i < css.length; i += 1) {
    const char = css[i];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(openBraceIndex + 1, i);
      }
    }
  }

  throw new Error("Could not find closing brace for @theme inline block");
}

describe("globals @theme container tokens", () => {
  const globalsCssPath = path.join(process.cwd(), "src/app/globals.css");
  const globalsCss = fs.readFileSync(globalsCssPath, "utf8");
  const themeInlineBlock = extractThemeInlineBlock(globalsCss);

  it("defines expected container tokens for max-w container scale", () => {
    const expectedContainerTokens: Record<string, string> = {
      "--container-xs": "20rem",
      "--container-xl": "36rem",
      "--container-2xl": "42rem",
      "--container-3xl": "48rem",
      "--container-4xl": "56rem",
      "--container-5xl": "64rem",
      "--container-6xl": "72rem",
    };

    for (const [token, value] of Object.entries(expectedContainerTokens)) {
      const pattern = new RegExp(`${token}\\s*:\\s*${value.replace(".", "\\.")}\\s*;`);
      expect(themeInlineBlock).toMatch(pattern);
    }
  });

  it("defines container companions for xl spacing tokens to avoid max-w collisions", () => {
    const collisionProneScales = ["xl", "2xl", "3xl", "4xl", "5xl", "6xl"];

    for (const scale of collisionProneScales) {
      expect(themeInlineBlock).toMatch(new RegExp(`--spacing-${scale}\\s*:`));
      expect(themeInlineBlock).toMatch(new RegExp(`--container-${scale}\\s*:`));
    }
  });

  it("overrides collision-prone max-w utilities to container tokens", () => {
    const expectedUtilityOverrides: Record<string, string> = {
      "max-w-xs": "--container-xs",
      "max-w-xl": "--container-xl",
      "max-w-2xl": "--container-2xl",
      "max-w-3xl": "--container-3xl",
      "max-w-4xl": "--container-4xl",
      "max-w-5xl": "--container-5xl",
      "max-w-6xl": "--container-6xl",
    };

    for (const [utilityClass, containerToken] of Object.entries(expectedUtilityOverrides)) {
      const pattern = new RegExp(
        `\\.${utilityClass}\\s*\\{\\s*max-width:\\s*var\\(${containerToken}\\);\\s*\\}`,
        "m",
      );
      expect(globalsCss).toMatch(pattern);
    }
  });
});
