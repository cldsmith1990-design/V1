import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo DM account
  const dmPassword = await bcrypt.hash('password123', 12);
  const dm = await prisma.user.upsert({
    where: { email: 'dm@example.com' },
    update: {},
    create: {
      email: 'dm@example.com',
      name: 'Dungeon Master',
      passwordHash: dmPassword,
      avatarColor: '#d4871a',
    },
  });

  // Create demo player accounts
  const playerEmails = [
    { email: 'fighter@example.com', name: 'Thorin the Fighter', color: '#60a5fa' },
    { email: 'wizard@example.com', name: 'Elara the Wizard', color: '#a78bfa' },
    { email: 'rogue@example.com', name: 'Shadow the Rogue', color: '#34d399' },
  ];

  const players = await Promise.all(
    playerEmails.map(async (p) => {
      const hash = await bcrypt.hash('password123', 12);
      return prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          email: p.email,
          name: p.name,
          passwordHash: hash,
          avatarColor: p.color,
        },
      });
    })
  );

  // Create a demo campaign
  const campaign = await prisma.campaign.upsert({
    where: { inviteCode: 'demo-invite' },
    update: {},
    create: {
      name: 'The Lost Vale',
      description: 'A mysterious valley holds ancient secrets...',
      ownerId: dm.id,
      inviteCode: 'demo-invite',
    },
  });

  // Create campsite map
  await prisma.map.upsert({
    where: { id: 'campsite-demo-map' },
    update: {},
    create: {
      id: 'campsite-demo-map',
      campaignId: campaign.id,
      name: 'Forest Campsite',
      gridWidth: 30,
      gridHeight: 20,
      cellSize: 40,
      metadata: { type: 'campsite', starter: true },
    },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  DM:     dm@example.com / password123');
  console.log('  Player: fighter@example.com / password123');
  console.log('  Player: wizard@example.com / password123');
  console.log('  Player: rogue@example.com / password123');
  console.log('');
  console.log(`Campaign invite code: demo-invite`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
