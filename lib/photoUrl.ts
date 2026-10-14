/** True for a photo that lives in Cloud Storage rather than in /public.
 *
 *  Everything a seller uploads is remote; the sample listings and the photo
 *  guide are local files.
 *
 *  Why anything cares: next/image optimises an image by fetching it on the
 *  server, resizing it, and serving the result. For a Storage URL that is the
 *  wrong trade in three ways.
 *
 *    - It fails. The optimiser gives up on a remote fetch after 7 seconds, and
 *      a 330 KB photo over a slow connection takes longer than that. The result
 *      is a 504 and a broken image, which is exactly what it did.
 *    - It is slower even when it works, because the photo travels to our server
 *      and then to her, instead of coming straight from Google's CDN.
 *    - On App Hosting we would be paying Cloud Run to resize images that are
 *      already the right size: lib/photos.ts caps every upload at 1,600px in
 *      the browser, before it is ever sent.
 *
 *  So remote photos are passed through untouched. Local ones still go through
 *  the optimiser, which is where it earns its keep: those are full-size
 *  originals committed to the repo. */
export function isRemotePhoto(url: string | undefined | null): boolean {
  return typeof url === "string" && /^https?:\/\//.test(url);
}
