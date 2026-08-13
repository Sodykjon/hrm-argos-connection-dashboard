/* eslint-disable @next/next/no-img-element */

/**
 * Route-transition loader: the animated SSV emblem (drawn stroke by stroke in
 * the GIF) centered on the page. The GIF carries its own navy square
 * background, so it is masked into a circle and given a soft ring — the
 * square edge would otherwise float visibly on the page gradient. A plain
 * <img> on purpose: next/image would lazy-optimize a 200×200 GIF the loader
 * needs INSTANTLY, and the file is served straight from /public.
 */
export default function Loading() {
  return (
    <div className="grid min-h-[60dvh] w-full place-items-center">
      <div className="flex flex-col items-center gap-4">
        <span className="block overflow-hidden rounded-full border border-line shadow-card">
          <img
            src="/gerb-loading.gif"
            alt=""
            width={160}
            height={160}
            className="block h-[160px] w-[160px]"
          />
        </span>
        <span className="eyebrow blink">
          {/* Bilingual-neutral: loading.tsx renders before any i18n context
              is worth waiting for. */}
          HRM ARGOS
        </span>
      </div>
    </div>
  );
}
