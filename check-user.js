const { PrismaClient } = require('@prisma/client');

async function checkUser() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://role_ea43962d4:Um49l3uWsSTjSBW1SnaYIITYncwAFx0G@db-ea43962d4.db003.hosteddb.reai.io:5432/ea43962d4?connection_limit=10&pool_timeout=20&connect_timeout=30'
      }
    }
  });

  try {
    console.log('Checking if john@doe.com exists...');
    const user = await prisma.user.findUnique({
      where: { email: 'john@doe.com' },
      select: { id: true, email: true, name: true, password: true }
    });
    
    if (user) {
      console.log('✅ User EXISTS in database:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.name);
      console.log('   Has password:', user.password ? 'Yes (hashed)' : 'No');
    } else {
      console.log('❌ User NOT FOUND in database!');
      console.log('   Need to run seed script again.');
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
