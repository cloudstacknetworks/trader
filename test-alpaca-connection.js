const apiKey = process.env.ALPACA_API_KEY || 'PKKESSVZW7MYDI4IHLGREVP6VG';
const secretKey = process.env.ALPACA_SECRET_KEY || 'dMPCc5ETJpyvYHgGVLzSfwh5erWKzN62j89eJsVz4Mg';
const baseUrl = 'https://paper-api.alpaca.markets';

async function testAlpacaConnection() {
  try {
    console.log('Testing Alpaca Paper Trading connection...');
    console.log('API Key:', apiKey.substring(0, 10) + '...');
    console.log('Base URL:', baseUrl);
    
    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const account = await response.json();
    
    console.log('\n✅ CONNECTION SUCCESSFUL!\n');
    console.log('Account Details:');
    console.log('- Account ID:', account.id);
    console.log('- Status:', account.status);
    console.log('- Cash:', '$' + parseFloat(account.cash).toLocaleString());
    console.log('- Portfolio Value:', '$' + parseFloat(account.portfolio_value).toLocaleString());
    console.log('- Buying Power:', '$' + parseFloat(account.buying_power).toLocaleString());
    console.log('- Pattern Day Trader:', account.pattern_day_trader ? 'Yes' : 'No');
    console.log('- Trading Blocked:', account.trading_blocked ? 'Yes' : 'No');
    console.log('\nYour Alpaca Paper Trading account is ready to use! 🚀\n');
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nPlease verify:');
    console.error('1. API keys are correct');
    console.error('2. Keys are for Paper Trading (should start with PK)');
    console.error('3. Keys have not been revoked');
    process.exit(1);
  }
}

testAlpacaConnection();
