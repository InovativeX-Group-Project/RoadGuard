const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function hashAdminPassword() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const users = [
    {
      "id": "admin-1",
      "name": "Council Staff",
      "email": "staff@roadguard.gov.za",
      "role": "admin",
      "password": hashedPassword
    }
  ];

  fs.writeFileSync(path.join(__dirname, 'data', 'users.json'), JSON.stringify(users, null, 2));
  console.log('Admin password hashed and users.json updated');
}

hashAdminPassword().catch(console.error);