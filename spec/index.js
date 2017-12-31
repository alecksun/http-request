const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfigFile('spec/support/jasmine.json');
jasmine.configureDefaultReporter({
  showColors: false
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;
jasmine.jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;


jasmine.execute();
