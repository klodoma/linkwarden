import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@linkwarden/prisma";
import verifyUser from "@/lib/api/verifyUser";
import { UsersAndCollections } from "@linkwarden/prisma/client";
import getPermission from "@/lib/api/getPermission";
import { removeFiles } from "@linkwarden/filesystem";

export default async function archive(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  const collectionId = Number(req.query.id);

  const collectionIsAccessible = await getPermission({
    userId: user.id,
    collectionId: collectionId,
  });

  if (!collectionIsAccessible) {
    return res.status(404).json({
      response: "Collection not found.",
    });
  }

  const memberHasAccess = collectionIsAccessible.members.some(
    (e: UsersAndCollections) => e.userId === user.id && e.canUpdate
  );

  if (!(collectionIsAccessible.ownerId === user.id || memberHasAccess)) {
    return res.status(401).json({
      response: "Permission denied.",
    });
  }

  if (req.method === "PUT") {
    if (process.env.NEXT_PUBLIC_DEMO === "true")
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });

    // Helper to get all collection IDs recursively (including sub-collections)
    const getSubCollectionIds = async (id: number): Promise<number[]> => {
      const list = [id];
      let currentIds = [id];
      while (currentIds.length > 0) {
        const children = await prisma.collection.findMany({
          where: { parentId: { in: currentIds } },
          select: { id: true },
        });
        currentIds = children.map((c) => c.id);
        list.push(...currentIds);
      }
      return list;
    };

    const collectionIds = await getSubCollectionIds(collectionId);

    const links = await prisma.link.findMany({
      where: { collectionId: { in: collectionIds } },
    });

    if (links.length > 0) {
      await prisma.link.updateMany({
        where: { id: { in: links.map((l) => l.id) } },
        data: {
          image: null,
          pdf: null,
          readable: null,
          monolith: null,
          preview: null,
          lastPreserved: null,
          indexVersion: null,
          clientSide: false,
        },
      });

      for (const link of links) {
        await removeFiles(link.id, link.collectionId);
      }
    }

    return res.status(200).json({
      response: "Collection links are being re-preserved.",
    });
  }
}
