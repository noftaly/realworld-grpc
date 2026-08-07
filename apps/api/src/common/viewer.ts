import { EntityManager } from '@mikro-orm/postgresql';
import { Block } from '../entities/block.entity';
import { Favorite } from '../entities/favorite.entity';
import { Follow } from '../entities/follow.entity';

export async function viewerUserFields(
  em: EntityManager,
  callerId: string | undefined,
  targetId: string,
): Promise<{ following: boolean; blocked: boolean }> {
  if (!callerId || callerId === targetId)
    return { following: false, blocked: false };
  const [following, blocked] = await Promise.all([
    em.count(Follow, { followerId: callerId, followeeId: targetId }),
    em.count(Block, { blockerId: callerId, blockedId: targetId }),
  ]);
  return { following: following > 0, blocked: blocked > 0 };
}

export async function viewerFavorited(
  em: EntityManager,
  callerId: string | undefined,
  articleId: string,
): Promise<boolean> {
  if (!callerId) return false;
  const n = await em.count(Favorite, { userId: callerId, articleId });
  return n > 0;
}

// Ids of users the caller has blocked - used to exclude their content from list results.
export async function blockedAuthorIds(
  em: EntityManager,
  callerId: string | undefined,
): Promise<string[]> {
  if (!callerId) return [];
  const rows = await em.find(Block, { blockerId: callerId });
  return rows.map((r) => r.blockedId);
}
