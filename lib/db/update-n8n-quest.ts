import { db } from './drizzle';
import { quests } from './schema';
import { eq } from 'drizzle-orm';

async function update() {
  await db.update(quests)
    .set({ verificationType: 'webhook' })
    .where(eq(quests.slug, 'n8n-setup'));
  console.log('Updated n8n-setup quest to webhook verification');
}

update()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
