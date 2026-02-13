/**
 * YouTube OAuth Token Generator (youtubei.js v16 native)
 *
 * Run: node packages/bot/src/generate-youtube-token.js
 *
 * 1. It will show a URL and a code
 * 2. Open the URL in browser
 * 3. Enter the code and log in with a throwaway Google account
 * 4. Copy the printed token to your .env as YOUTUBE_OAUTH_TOKEN
 */

const { Innertube } = require('youtubei.js');

(async () => {
  console.log('=== YouTube OAuth Token Generator ===');
  console.log('USE A THROWAWAY ACCOUNT - NOT YOUR MAIN GOOGLE ACCOUNT!\n');

  const yt = await Innertube.create({ retrieve_player: false });

  yt.session.on('auth-pending', (data) => {
    console.log('========================================');
    console.log('Open this URL:', data.verification_url);
    console.log('Enter this code:', data.user_code);
    console.log('========================================\n');
    console.log('Waiting for you to authorize...');
  });

  yt.session.on('auth-error', (err) => {
    console.error('Auth error:', err);
    process.exit(1);
  });

  yt.session.on('auth', (data) => {
    if (!data.credentials) {
      console.error('No credentials received');
      process.exit(1);
    }

    // Format credentials as JSON string for .env
    const token = JSON.stringify(data.credentials);
    console.log('\n========================================');
    console.log('SUCCESS! Add this to packages/bot/.env:\n');
    console.log('YOUTUBE_OAUTH_TOKEN=' + token);
    console.log('========================================');
    process.exit(0);
  });

  await yt.session.signIn();
})().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
