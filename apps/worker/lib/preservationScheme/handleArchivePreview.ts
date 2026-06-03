import { Collection, Link, User } from "@linkwarden/prisma/client";
import { Page } from "playwright";
import { generatePreview } from "@linkwarden/lib/generatePreview";
import { createFile } from "@linkwarden/filesystem";
import { prisma } from "@linkwarden/prisma";
import {
  assertUrlIsSafeForServerSideFetch,
  UnsafeUrlError,
} from "@linkwarden/lib/ssrf";

type LinksAndCollectionAndOwner = Link & {
  collection: Collection & {
    owner: User;
  };
};

const getYoutubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const handleArchivePreview = async (
  link: LinksAndCollectionAndOwner,
  page: Page
) => {
  // Direct High-Quality YouTube Thumbnail Fetching
  if (link.url) {
    const youtubeId = getYoutubeId(link.url);
    if (youtubeId) {
      try {
        const maxResUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
        let imgResponse = await fetch(maxResUrl);
        if (!imgResponse.ok) {
          // Fall back to hqdefault
          const hqUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
          imgResponse = await fetch(hqUrl);
        }
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const previewGenerated = await generatePreview(
            buffer,
            link.collectionId,
            link.id
          );
          if (previewGenerated) {
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching YouTube thumbnail directly:", error);
      }
    }
  }

  let ogImageUrl = await page.evaluate(() => {
    const metaTag = document.querySelector('meta[property="og:image"]');
    return metaTag ? (metaTag as any).content : null;
  });

  let previewGenerated = false;

  if (ogImageUrl) {
    if (
      !ogImageUrl.startsWith("http://") &&
      !ogImageUrl.startsWith("https://")
    ) {
      const origin = await page.evaluate(() => document.location.origin);
      ogImageUrl =
        origin + (ogImageUrl.startsWith("/") ? ogImageUrl : "/" + ogImageUrl);
    }

    try {
      await assertUrlIsSafeForServerSideFetch(ogImageUrl);
      const imageResponse = await page.goto(ogImageUrl);

      if (imageResponse && !link.preview?.startsWith("archive")) {
        const buffer = await imageResponse.body();
        previewGenerated = await generatePreview(
          buffer,
          link.collectionId,
          link.id
        );
      }

      await page.goBack();
    } catch (error) {
      if (!(error instanceof UnsafeUrlError)) {
        throw error;
      }
    }
  }

  if (!previewGenerated && !link.preview?.startsWith("archive")) {
    await page
      .screenshot({ type: "jpeg", quality: 80 })
      .then(async (screenshot) => {
        if (
          Buffer.byteLength(screenshot) >
          1024 * 1024 * Number(process.env.PREVIEW_MAX_BUFFER || 10)
        )
          return console.log("Error generating preview: Buffer size exceeded");

        await createFile({
          data: screenshot,
          filePath: `archives/preview/${link.collectionId}/${link.id}.jpeg`,
        });

        await prisma.link.update({
          where: { id: link.id },
          data: {
            preview: `archives/preview/${link.collectionId}/${link.id}.jpeg`,
          },
        });
      });
  }
};

export default handleArchivePreview;
