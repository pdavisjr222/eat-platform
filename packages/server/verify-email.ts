import { db } from './src/db';
import { users } from '@eat/shared/schema';
import { eq } from 'drizzle-orm';

async function verifyEmail() {
  const result = await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    })
    .where(eq(users.email, 'phillipdavisjunior@gmail.com'))
    .returning();

  if (result.length > 0) {
    console.log('✅ Email verified successfully for:', result[0].email);
    console.log('You can now create listings and perform other actions!');
  } else {
    console.log('❌ User not found');
  }
}

verifyEmail().then(() => process.exit(0));
