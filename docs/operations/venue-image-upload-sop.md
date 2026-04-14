# Venue Image Upload SOP

Last verified: April 13, 2026 (America/Los_Angeles)

This SOP describes the current production workflow for publishing venue images in PlayBookings.

The source of truth is the Supabase Storage folder:

- `venue-photos/<venue-slug>/`

The app renders venue images from `public.venue_media`, so uploading files to Storage is necessary but not sufficient. After the files are in Storage, run the publish helper to rebuild the venue's `venue_media` rows from the folder contents.

## Current Production Rules

- Storage bucket: `venue-photos`
- Supported publish formats: `.jpg`, `.jpeg`, `.png`, `.webp`
- The publish helper reads whatever supported images are already in the venue folder
- The publish helper does not rename, move, or upload files
- Ordering rule:
  - `hero.*` is first when present
  - all remaining supported images are sorted alphabetically by filename
- The first published image gets `is_primary = true`
- Videos and non-image files are ignored by the publish helper

## Operator Workflow

1. Curate the final gallery locally.
2. Upload the intended gallery images into:

```text
venue-photos/<venue-slug>/
```

3. Confirm that the folder contains only the images you want included in the published gallery.
4. Run a preview:

```bash
npm run venue-media:publish -- --venue "Exact Venue Name"
```

5. Review the printed order carefully.
6. Publish the gallery:

```bash
npm run venue-media:publish -- --venue "Exact Venue Name" --apply
```

7. Optionally publish and open the live venue page:

```bash
npm run venue-media:publish -- --venue "Exact Venue Name" --apply --open-browser
```

## Naming and Ordering Guidance

The command no longer requires canonical filenames like `gallery-02.jpg`, but naming still affects order.

Recommended approach:

- name the intended primary image `hero.jpg`, `hero.jpeg`, `hero.png`, or `hero.webp`
- give the remaining images names that sort the way you want alphabetically
- remove extra images from the folder before publishing if they should not appear in the gallery

Example:

```text
venue-photos/first-presbyterian-hollywood/hero.webp
venue-photos/first-presbyterian-hollywood/gallery-02.jpg
venue-photos/first-presbyterian-hollywood/gallery-03.jpg
venue-photos/first-presbyterian-hollywood/entrance.jpg
```

Published order:

1. `hero.webp`
2. `entrance.jpg`
3. `gallery-02.jpg`
4. `gallery-03.jpg`

Why:

- `hero.*` always comes first
- the rest sort alphabetically

If you want `gallery-02` before `gallery-03`, alphabetical ordering already does that.

## Worked Example: First Presbyterian Church of Hollywood

Venue details:

- `venues.name`: `First Presbyterian Church of Hollywood`
- `venue_slug`: `first-presbyterian-hollywood`
- `venue_id`: `4dcff5d1-df04-4081-97dd-2aad958c0c40`

Preview:

```bash
npm run venue-media:publish -- --venue "First Presbyterian Church of Hollywood"
```

Apply:

```bash
npm run venue-media:publish -- --venue "First Presbyterian Church of Hollywood" --apply
```

## Quality Control Checklist

Before publishing:

- all intended images are present in `venue-photos/<venue-slug>/`
- unwanted images have been removed from the folder
- the preferred primary image is named `hero.*` if you want to force it first
- supported formats only: `.jpg`, `.jpeg`, `.png`, `.webp`
- filenames produce the intended alphabetical order after the hero image

After publishing:

- `venue_media` row count matches the number of supported images in the folder
- `sort_order` is sequential starting at `0`
- exactly one row has `is_primary = true`
- `/venues` shows the correct primary image
- `/venue/<slug>` shows the same primary image and full gallery in the expected order

## Emergency Fallback Only

If the publish helper is unavailable, you can still repair `public.venue_media` manually with SQL in Supabase SQL Editor. This is fallback-only and not the standard workflow.

Manual SQL should mirror the exact files currently present in `venue-photos/<venue-slug>/`, including the derived order and public URLs.

## Legacy Helper Warning

`npm run update:venue-photo -- "Venue Name"` is a legacy single-image helper.

Do not use it after a multi-image gallery is set up, because it clears existing `venue_media` rows and replaces them with one image.
