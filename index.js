var es = require('event-stream');
var Handlebars = require('handlebars');
var extend = require('xtend');
var gutil = require('gulp-util');

var outputTypes = ['amd', 'commonjs', 'node', 'bare'];

module.exports = function(options) {
  options = extend({
    compilerOptions: {},
    wrapped: false,
    outputType: 'bare' // amd, commonjs, node, bare
  }, options);

  if (outputTypes.indexOf(options.outputType) === -1) {
    throw new Error('Invalid output type: '+options.outputType);
  }

  function onHandlebarsFileModified(file) {
    if (file.isNull()) {
      return this.emit('data', file); // pass along
    }
    
    if (file.isStream()) {
      return this.emit('error', new Error("gulp-handlebars: Streaming not supported"));
    }

    var contents = file.contents.toString('utf8');
    
    var compiled;
    try {
      compiled = Handlebars.precompile(contents.toString(), options.compilerOptions);
    } catch (err) {
      return this.emit('error', new Error(err));
    }
    
    if (options.wrapped) {
      compiled = 'Handlebars.template('+compiled+')';
    }

    // Handle different output times
    if (options.outputType === 'amd') {
      compiled = "define(['handlebars'], function(Handlebars) {return "+compiled+";});";
    }
    else if (options.outputType === 'commonjs') {
      compiled = "module.exports = function(Handlebars) {return "+compiled+";};";
    }
    else if (options.outputType === 'node') {
      compiled = "module.exports = "+compiled+";";

      if (options.wrapped) {
        // Only require Handlebars if wrapped
        compiled = "var Handlebars = global.Handlebars || require('handlebars');"+compiled;
      }
    }

    file.contents = new Buffer(compiled);
    file.path = gutil.replaceExtension(file.path, ".js");
    this.emit('data', file);
  }

  return es.through(onHandlebarsFileModified);
};
