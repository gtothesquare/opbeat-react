var utils = require('opbeat-test/webdriverio-utils')

describe('no-init', function () {
  it('should disable when not initialized', function (done) {

    browser.url('/no-init/index.html')

    browser.waitForExist('#hello')
    .executeAsync(
      function(cb) {
        document.getElementById('hello').click()
        cb()
      }
    ).then(function () {
      done()
    },
    utils.handleError(done)).catch(utils.handleError(done))
  })

  afterEach(utils.verifyNoBrowserErrors)
})
