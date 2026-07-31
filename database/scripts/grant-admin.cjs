const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run admin:grant -- user@example.com");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { email },
    data: { role: "ADMIN" },
  });

  if (updated.count !== 1) {
    throw new Error("No user with this email was found");
  }

  console.log(`Granted ADMIN role to ${email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
