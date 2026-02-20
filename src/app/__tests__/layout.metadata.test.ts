jest.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

import { metadata } from "../layout";

const SHARE_TEXT = "Community courts, unlocked. Find a court. Book it. Go play.";
const OG_IMAGE_PATH = "/og-default-v2.png";

describe("root metadata social defaults", () => {
  it("sets canonical metadata base URL", () => {
    expect(metadata.metadataBase?.toString()).toBe("https://playbookings.vercel.app/");
  });

  it("includes a default Open Graph image", () => {
    const images = metadata.openGraph?.images;
    expect(images).toBeDefined();

    if (!images) {
      return;
    }

    const imageList = Array.isArray(images) ? images : [images];
    expect(imageList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: OG_IMAGE_PATH,
        }),
      ]),
    );
  });

  it("uses a large Twitter card", () => {
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("uses the requested share preview text", () => {
    const title =
      typeof metadata.title === "object" && metadata.title !== null && "default" in metadata.title
        ? metadata.title.default
        : metadata.title;

    expect(title).toBe(SHARE_TEXT);
    expect(metadata.openGraph?.title).toBe(SHARE_TEXT);
    expect(metadata.twitter?.title).toBe(SHARE_TEXT);
    expect(metadata.twitter?.images).toContain(OG_IMAGE_PATH);
  });
});
