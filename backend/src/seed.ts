import { prisma } from './database/prisma';

async function main() {
  console.log('Seeding initial database data...');

  const defaultUser = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.ai' },
    update: {},
    create: {
      email: 'demo@reachinbox.ai',
      name: 'Alex Johnson',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    },
  });

  const senders = [
    { email: 'outreach@reachinbox-demo.ai', name: 'ReachInbox Outreach', maxEmailsPerHour: 200 },
    { email: 'sales@reachinbox-demo.ai', name: 'ReachInbox Sales', maxEmailsPerHour: 50 },
    { email: 'growth@reachinbox-demo.ai', name: 'ReachInbox Growth', maxEmailsPerHour: 100 },
  ];

  for (const sender of senders) {
    await prisma.senderAccount.upsert({
      where: { email: sender.email },
      update: { maxEmailsPerHour: sender.maxEmailsPerHour },
      create: sender,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
