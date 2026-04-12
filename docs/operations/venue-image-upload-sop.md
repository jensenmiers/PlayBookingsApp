# Venue Image Upload SOP

Last verified: April 11, 2026 (America/Los_Angeles)

This SOP describes the real production workflow for adding venue images to PlayBookings today. It is designed for a curated 5-image venue gallery that renders correctly on:

- venue cards on `/venues`
- venue detail pages on `/venue/[slug]`
- the venue photo lightbox

Important: uploading files to Supabase Storage is not enough by itself. The app renders venue images from `public.venue_media`, so every uploaded image must also be registered in that table.

The repo also includes a publish helper for the automated half of this workflow:

```bash
npm run venue-media:publish -- --venue "Venue Name" --source "/path/to/final-folder"
```

Run it without `--apply` first to preview the upload and DB changes.

## Current Production Rules

- Storage bucket: `venue-photos`
- Final upload format: `JPEG`
- Standard gallery size: `5` images
- Standard image mix:
  - `1` hero image: strong interior wide shot
  - `3` supporting court images
  - `1` entrance/context image
- Portrait images: excluded by default
- Videos: out of scope for this SOP
- Manual gallery registration method: SQL, not the Supabase table editor

## Before You Start

1. Put the raw venue assets in a Finder folder on your Mac.
2. Confirm every image is downloaded locally from iCloud before editing or uploading.
3. Split the folder into:
   - still photos
   - videos
   - duplicates / near-duplicates
4. Ignore videos for this SOP.
5. Remove exact duplicates and obvious throwaways before choosing finals.

## How To Curate The Final 5 Images

Choose exactly `5` final images in this order:

1. `hero.jpg`
   - Best interior wide shot of the court
   - Should immediately tell a renter what the rentable space looks like
2. `gallery-02.jpg`
   - Supporting court angle with meaningful variation from the hero
3. `gallery-03.jpg`
   - Another useful court view, ideally from a different side or depth
4. `gallery-04.jpg`
   - Final supporting court image
5. `gallery-05.jpg`
   - One strong entrance/context image

Exclude by default:

- portrait photos
- parking-sign-only shots
- close-up rule signs or utility details
- duplicate angles with only tiny composition changes
- any image that does not help a renter understand the facility

## Export Settings

Prepare the final `5` images before upload.

1. Open each chosen image in Preview, Photoshop, Pixelmator, or similar.
2. Rotate it until it is visually correct.
3. Export a fresh JPEG so the orientation is baked into the file.
4. Use a web-ready export target:
   - longest edge around `2400px`
   - comfortably under `5 MB`
5. Check the exported image again after saving.

Why this matters:

- the storage bucket allows only `image/jpeg`, `image/png`, and `image/webp`
- the bucket file limit is `5 MB`
- several iPhone originals can look rotated correctly in Finder but still need a clean exported file with baked orientation

## Final File Names

Rename the final curated exports exactly:

- `hero.jpg`
- `gallery-02.jpg`
- `gallery-03.jpg`
- `gallery-04.jpg`
- `gallery-05.jpg`

Use lowercase names exactly as written above.

## Upload To Supabase Storage

Upload all five final JPEGs to the venue folder in Supabase Storage:

```text
venue-photos/<venue-slug>/hero.jpg
venue-photos/<venue-slug>/gallery-02.jpg
venue-photos/<venue-slug>/gallery-03.jpg
venue-photos/<venue-slug>/gallery-04.jpg
venue-photos/<venue-slug>/gallery-05.jpg
```

Example for First Presbyterian Church of Hollywood:

```text
venue-photos/first-presbyterian-hollywood/hero.jpg
venue-photos/first-presbyterian-hollywood/gallery-02.jpg
venue-photos/first-presbyterian-hollywood/gallery-03.jpg
venue-photos/first-presbyterian-hollywood/gallery-04.jpg
venue-photos/first-presbyterian-hollywood/gallery-05.jpg
```

## Automated Publish Flow

If your final folder already contains `venue-gallery.json` plus the five curated JPEGs referenced by that manifest, you can automate the upload + `venue_media` replacement.

Preview only:

```bash
npm run venue-media:publish -- \
  --venue "First Presbyterian Church of Hollywood" \
  --source "/absolute/path/to/final-folder"
```

Apply the publish:

```bash
npm run venue-media:publish -- \
  --venue "First Presbyterian Church of Hollywood" \
  --source "/absolute/path/to/final-folder" \
  --apply
```

Apply and open the live production page for review:

```bash
npm run venue-media:publish -- \
  --venue "First Presbyterian Church of Hollywood" \
  --source "/absolute/path/to/final-folder" \
  --apply \
  --open-browser
```

Manifest example:

```json
{
  "hero": "selected-hero.jpg",
  "gallery_02": "angle-a.jpg",
  "gallery_03": "angle-b.jpg",
  "gallery_04": "angle-c.jpg",
  "gallery_05": "entrance.jpg"
}
```

## Register The Gallery In `public.venue_media`

After upload, run SQL in Supabase SQL Editor. Replace the placeholders if you are working on a different venue.

```sql
delete from public.venue_media
where venue_id = '<VENUE_ID>';

insert into public.venue_media (
  venue_id,
  media_type,
  storage_provider,
  bucket_name,
  object_path,
  public_url,
  sort_order,
  is_primary,
  migrated_from_legacy_photos
) values
  (
    '<VENUE_ID>',
    'image',
    'supabase',
    'venue-photos',
    '<VENUE_SLUG>/hero.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/<VENUE_SLUG>/hero.jpg',
    0,
    true,
    false
  ),
  (
    '<VENUE_ID>',
    'image',
    'supabase',
    'venue-photos',
    '<VENUE_SLUG>/gallery-02.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/<VENUE_SLUG>/gallery-02.jpg',
    1,
    false,
    false
  ),
  (
    '<VENUE_ID>',
    'image',
    'supabase',
    'venue-photos',
    '<VENUE_SLUG>/gallery-03.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/<VENUE_SLUG>/gallery-03.jpg',
    2,
    false,
    false
  ),
  (
    '<VENUE_ID>',
    'image',
    'supabase',
    'venue-photos',
    '<VENUE_SLUG>/gallery-04.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/<VENUE_SLUG>/gallery-04.jpg',
    3,
    false,
    false
  ),
  (
    '<VENUE_ID>',
    'image',
    'supabase',
    'venue-photos',
    '<VENUE_SLUG>/gallery-05.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/<VENUE_SLUG>/gallery-05.jpg',
    4,
    false,
    false
  );
```

### Worked Example: First Presbyterian Church of Hollywood

Venue details:

- `venue_id`: `4dcff5d1-df04-4081-97dd-2aad958c0c40`
- `venue_slug`: `first-presbyterian-hollywood`

Example SQL:

```sql
delete from public.venue_media
where venue_id = '4dcff5d1-df04-4081-97dd-2aad958c0c40';

insert into public.venue_media (
  venue_id,
  media_type,
  storage_provider,
  bucket_name,
  object_path,
  public_url,
  sort_order,
  is_primary,
  migrated_from_legacy_photos
) values
  (
    '4dcff5d1-df04-4081-97dd-2aad958c0c40',
    'image',
    'supabase',
    'venue-photos',
    'first-presbyterian-hollywood/hero.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/hero.jpg',
    0,
    true,
    false
  ),
  (
    '4dcff5d1-df04-4081-97dd-2aad958c0c40',
    'image',
    'supabase',
    'venue-photos',
    'first-presbyterian-hollywood/gallery-02.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/gallery-02.jpg',
    1,
    false,
    false
  ),
  (
    '4dcff5d1-df04-4081-97dd-2aad958c0c40',
    'image',
    'supabase',
    'venue-photos',
    'first-presbyterian-hollywood/gallery-03.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/gallery-03.jpg',
    2,
    false,
    false
  ),
  (
    '4dcff5d1-df04-4081-97dd-2aad958c0c40',
    'image',
    'supabase',
    'venue-photos',
    'first-presbyterian-hollywood/gallery-04.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/gallery-04.jpg',
    3,
    false,
    false
  ),
  (
    '4dcff5d1-df04-4081-97dd-2aad958c0c40',
    'image',
    'supabase',
    'venue-photos',
    'first-presbyterian-hollywood/gallery-05.jpg',
    'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/gallery-05.jpg',
    4,
    false,
    false
  );
```

## Worked Example: `first-prep-hollywood`

Source folder:

- `/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood`

Observed on April 11, 2026:

- `29` still photos
- `3` `.MOV` files
- exact duplicates:
  - `IMG_2735.JPG` and `IMG_2735 2.JPG`
  - `IMG_2737.JPG` and `IMG_2737 2.JPG`
  - `IMG_2739.JPG` and `IMG_2739 2.JPG`

Recommended editorial direction:

- hero candidate: [IMG_2708.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2708.JPG) or [IMG_2602.jpeg](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2602.jpeg)
- supporting court candidates:
  - [IMG_2710.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2710.JPG)
  - [IMG_2721.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2721.JPG)
  - one additional landscape court angle after export-and-rotation review
- entrance/context candidate: [IMG_2605.jpeg](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2605.jpeg)

Recommended exclusions:

- duplicates:
  - [IMG_2735 2.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2735%202.JPG)
  - [IMG_2737 2.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2737%202.JPG)
  - [IMG_2739 2.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2739%202.JPG)
- parking-sign detail:
  - [IMG_2739.JPG](/Users/jensenmiers/Desktop/venue-media-PB.com/first-prep-hollywood/IMG_2739.JPG)
- videos:
  - `IMG_2603.MOV`
  - `IMG_2604.MOV`
  - `IMG_2606.MOV`

## Quality Control Checklist

Before upload:

- exactly `5` final JPEGs
- all images visually rotated correctly
- no portraits unless there is an exceptional reason
- no duplicates
- no videos
- no low-value detail shots
- each file is under `5 MB`

After upload:

- all `5` files exist in `venue-photos/<venue-slug>/`
- SQL has created exactly `5` `venue_media` rows
- `sort_order` is `0` through `4`
- only `hero.jpg` has `is_primary = true`

After publishing:

- `/venues` shows the correct hero image
- `/venue/<slug>` shows the same hero image
- the venue lightbox shows all `5` images in order
- the entrance/context image appears later in the gallery, not first

## Important Warning About Existing Helper Scripts

Do not use `npm run update:venue-photo -- "Venue Name"` after a manual 5-image gallery has been set up.

Why:

- that helper is designed for a single-image workflow
- it clears existing `venue_media` rows and replaces them with one image
- using it after a curated gallery is live will collapse the gallery back to a single photo
