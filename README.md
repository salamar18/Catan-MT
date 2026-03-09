Current workflow:
- npm install playwright
- npx playwright install
- start chrome with remote debugging
   - exit all chrome browswers and enter below command. 
   - log into colonist manually 

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/colonist-chrome-debug

- then split terminal and run node bot/bot.js