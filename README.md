Current workflow:
- npm install playwright
- npx playwright install
- start chrome with remote debugging
   - exit all chrome browswers and enter below command. 
   - log into colonist manually
     - catanmttt@gmail.com
     - !abcd1234!

   - /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/colonist-chrome-debug

- then split terminal and run:
- npm run build 
- node bot/bot.js
- or PWDEBUG=1 node bot/bot.js for the debugging window
