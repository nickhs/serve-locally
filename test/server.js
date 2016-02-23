const serveLocally = require('../index.js');

const app = new (require('express'))();
const port = 3000;

app.use('/api', serveLocally({root: 'test_dirs', logger: true}));

app.all('/', (req, res) => {
    res.send('ok');
});

app.listen(port, function(error) {
  if (error) {
    console.error(error);
  } else {
    console.info("==> Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port);
  }
});
