var logger = require('./logger')
var transport = require('./transport')
var utils = require('./utils')

module.exports = {
  normalizeFrame: function normalizeFrame (frame, options) {
    options = options || {}

    if (!frame.url) return

    // normalize the frames data
    var normalized = {
      'filename': this.cleanFileUrl(frame.url),
      'lineno': frame.line,
      'colno': frame.column,
      'function': frame.func || '[anonymous]'
    }

    return normalized
  },

  traceKitStackToOpbeatException: function (stackInfo, options) {
    options = options || {}
    stackInfo.frames = []

    if (stackInfo.stack && stackInfo.stack.length) {
      stackInfo.stack.forEach(function (stack, i) {
        var frame = this.normalizeFrame(stack)
        if (frame) {
          stackInfo.frames.push(frame)
        }
      }.bind(this))
    }

    return stackInfo

  },

  cleanFileUrl: function (fileUrl) {
    if (!fileUrl) {
      fileUrl = ''
    }

    if (fileUrl.indexOf(window.location.href) > -1) {
      fileUrl = fileUrl.replace(window.location.href, '')
    }

    if (!fileUrl) {
      fileUrl = '/'
    }

    return fileUrl
  },

  processException: function processException (exception, options) {
    options = options || {}

    var stacktrace

    var type = exception.type
    var message = String(exception.message) | 'Script error'
    var lineno = exception.lineno
    var frames = exception.frames
    var fileurl = this.cleanFileUrl(exception.fileurl)

    if (frames && frames.length) {
      // Opbeat.com expects frames oldest to newest
      // and JS sends them as newest to oldest
      frames.reverse()

      stacktrace = {
        frames: frames
      }

    } else if (fileurl) {
      stacktrace = {
        frames: [{
          filename: fileurl,
          lineno: lineno
        }]
      }
    }

    // Overrride fileurl from first frame
    if (frames && frames.length && frames[0].filename) {
      fileurl = frames[0].filename
    }

    // Human readable label
    var label = lineno ? message + ' at ' + lineno : message

    var data = {
      message: label,
      culprit: fileurl,
      exception: {
        type: type,
        value: message
      },
      stacktrace: stacktrace,
      user: options.context.user || null,
      timestamp: parseInt((new Date).getTime() / 1000, 10),
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (options.context.extra) {
      data.data = utils.mergeObject(data.extra, options.context.extra)
    }

    logger.log('opbeat.exceptionst.processException', data)
    transport.sendToOpbeat(data, options)

  },

  getBrowserSpecificMetadata: function () {
    var viewportInfo = utils.getViewPortInfo()
    var extra = {
      'environment': {
        'utcOffset': new Date().getTimezoneOffset() / -60.0,
        'browserWidth': viewportInfo.width,
        'browserHeight': viewportInfo.height,
        'screenWidth': window.screen.width,
        'screenHeight': window.screen.height,
        'language': navigator.language,
        'userAgent': navigator.userAgent,
        'platform': navigator.platform
      },
      'page': {
        'referer': document.referrer,
        'host': document.domain,
        'location': window.location.href
      }
    }

    return extra
  }

}
