// Quick test to verify the service can be parsed
const fs = require('fs');
const path = require('path');

try {
  const content = fs.readFileSync(path.join(__dirname, 'src/services/video/AgoraService.ts'), 'utf-8');
  
  // Check for required methods
  const methods = [
    'generateToken',
    'createChannel',
    'endCall',
    'joinChannel',
    'getCallDetails',
    'markParticipantLeft',
    'updateParticipantMedia'
  ];
  
  let allFound = true;
  methods.forEach(method => {
    if (content.includes(`async ${method}(`) || content.includes(`${method}(`)) {
      console.log(`✓ Method found: ${method}`);
    } else {
      console.log(`✗ Method NOT found: ${method}`);
      allFound = false;
    }
  });
  
  // Check for required imports
  const imports = [
    'agora-access-token',
    'drizzle-orm',
    'shared/schema'
  ];
  
  imports.forEach(imp => {
    if (content.includes(imp)) {
      console.log(`✓ Import found: ${imp}`);
    } else {
      console.log(`✗ Import NOT found: ${imp}`);
      allFound = false;
    }
  });
  
  // Check for error handling
  if (content.includes('try {') && content.includes('catch (error)')) {
    console.log('✓ Error handling (try/catch) found');
  } else {
    console.log('✗ Error handling missing');
    allFound = false;
  }
  
  // Check for token expiration
  if (content.includes('24 * 60 * 60')) {
    console.log('✓ 24-hour token expiration found');
  } else {
    console.log('✗ 24-hour token expiration NOT found');
    allFound = false;
  }
  
  // Check for database operations
  if (content.includes('db.insert') && content.includes('db.update') && content.includes('db.select')) {
    console.log('✓ Database operations found');
  } else {
    console.log('✗ Database operations incomplete');
    allFound = false;
  }
  
  console.log('\n' + (allFound ? 'All requirements met!' : 'Some requirements missing'));
  process.exit(allFound ? 0 : 1);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
