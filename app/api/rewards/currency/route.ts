import { getUser } from '@/lib/db/queries';
import { getUserCoins } from '@/lib/rewards/check-rewards';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const coins = await getUserCoins(user.id);

  return Response.json({ coins });
}
