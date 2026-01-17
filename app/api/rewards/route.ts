import { getUser } from '@/lib/db/queries';
import { getAllRewardsWithStatus } from '@/lib/rewards/check-rewards';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rewards = await getAllRewardsWithStatus(user.id);

  return Response.json({ rewards });
}
