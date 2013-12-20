// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Preprocesses .glsl and .glslib files for use in the compiler.
 *     Takes in the contents of a glsl file and all known library files.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.Preprocessor');

goog.require('glslunit.NodeCollector');
goog.require('glslunit.compiler.ShaderJsConst');
goog.require('glslunit.compiler.ShaderMode');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.glsl.parser');
goog.require('goog.array');



/**
 * The Preprocessor should never be constructed.  Instead, use the static method
 *     ParseFile.
 * @constructor
 */
glslunit.compiler.Preprocessor = function() {
};


/**
 * Regular expression for finding license comments in the code.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_LICENSE_ =
    /\/\*\*\n \* @license[\s\S]*?\*\//g;


/**
 * Regular expression for class declaration.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_CLASS_ = /\/\/!\s*CLASS=(\S*)/;


/**
 * Regular expression for superclass declaration.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_SUPERCLASS_ = /\/\/!\s*SUPERCLASS=(\S*)/;


/**
 * Regular expression for namespace declaration.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_NAMESPACE_ = /\/\/!\s*NAMESPACE=(\S*)/;


/**
 * Regular expression for the start of fragment shader code.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_FRAGMENT_ = /\/\/!\s*FRAGMENT/;


/**
 * Regular expression for the start of vertex shader code.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_VERTEX_ = /\/\/!\s*VERTEX/;


/**
 * Regular expression for the start of common shader code.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_COMMON_ = /\/\/!\s*COMMON/;


/**
 * Regular expression for including libraries.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_INCLUDE_ = /\/\/!\s*INCLUDE\s+(.*)/;

/**
 * Regular expression for requiring a symbol from another shader.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_REQUIRE_ = /\/\/!\s*REQUIRE\s+(.*)/;


/**
 * Regular expression for exporting symbols to other shaders.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_PROVIDE_ = /\/\/!\s*PROVIDE\s+(.*)/;


/**
 * Regular expression for specifying which template to use for this file.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_TEMPLATE_ = /\/\/!\s*TEMPLATE\s+(.*)/;


/**
 * Regular expression for including libraries.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_DEFAULT_MODE_ = /\/\/!\s*MODE\s+(\S+)/;


/**
 * Regular expression for including libraries.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_MODE_ = /\/\/!\s*MODE\s+(\S+)\s+(.*)/;


/**
 * Regular expression for requiring outside javascript libraries.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_JSREQUIRE_ = /\/\/!\s*JSREQUIRE\s+(\S+)/;


/**
 * Regular expression for requiring outside javascript libraries.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_JSCONST_ = /\/\/!\s*JSCONST\s+(\S+)\s+(.*)/;


/**
 * Regular expression for overriding variables.
 * @type {RegExp}
 * @const
 * @private
 */
glslunit.compiler.Preprocessor.RE_OVERRIDE_ =
    /\/\/!\s*OVERRIDE\s+(\S+)\s+(\S+)/;


/**
 * Given a source file and a map of library files, parses the source file into
 *      the object that stores information on how to compile and output this
 *      shader class.
 * @param {string} fileName The name of the file to parse.
 * @param {!Object.<string, string>} libraryFiles A map of filenames to the
 *     contents of the file for all glsl files.
 * @return {glslunit.compiler.ShaderProgram} The parsed program data.
 */
glslunit.compiler.Preprocessor.ParseFile = function(fileName, libraryFiles) {
  var vertexSourceMap = [], fragmentSourceMap = [];
  var provideFileMap = {};
  for (var libraryFileName in libraryFiles) {
    var libraryFile = libraryFiles[libraryFileName];
    goog.array.forEach(libraryFile.split('\n'), function(line) {
      var match;
      if (match = glslunit.compiler.Preprocessor.RE_PROVIDE_.exec(line)) {
        var providedSymbol = match[1];
        if (providedSymbol in provideFileMap) {
          throw new Error('Symbol ' + providedSymbol + ' is provided by two ' +
              'files, ' + libraryFileName + ' and ' +
              provideFileMap[providedSymbol]);
        } else {
          provideFileMap[providedSymbol] = libraryFileName;
        }
      }
    });
  }
  var includedFiles = {};
  var result = glslunit.compiler.Preprocessor.ParseFileSource_(
      fileName, libraryFiles, provideFileMap, includedFiles,
      vertexSourceMap, fragmentSourceMap);
  result.includedFiles = includedFiles;
  try {
    result.vertexAst =
        glslunit.glsl.parser.parse(result.originalVertexSource, 'vertex_start');
  } catch (e) {
    throw glslunit.compiler.Preprocessor.FormatParseError_(e,
                                                           'vertex',
                                                           vertexSourceMap,
                                                           libraryFiles);
  }
  try {
    result.fragmentAst =
        glslunit.glsl.parser.parse(
            result.originalFragmentSource,
            'fragment_start');
  } catch (e) {
    throw glslunit.compiler.Preprocessor.FormatParseError_(e,
                                                           'fragment',
                                                           fragmentSourceMap,
                                                           libraryFiles);
  }
  var licenseSet = {};
  var match;
  var completeSource = result.originalVertexSource +
      result.originalFragmentSource;
  while ((match =
          glslunit.compiler.Preprocessor.RE_LICENSE_.exec(completeSource))) {
    if (!(match[0] in licenseSet)) {
      licenseSet[match[0]] = true;
      result.licenses.push(match[0]);
    }
  }
  result.defaultProgramShortNames();
  return result;
};


/**
 * Parses a PEG.js exception and uses the source map to format text for a new
 * exception containg relevant file and line information.
 * @param {{message: string, line: number, column: number}} exception The
 *     exception thrown during parsing.
 * @param {string} shaderType The type of shader that had an error.
 * @param {!Array.<{fileName: string, localLine: number}>} sourceMap The source
 *     map for shader that had the error.
 * @param {!Object.<string, string>} libraryFiles A map of filenames to the
 *     contents of the file for library files.
 * @return {Error} The exception with a formatted message.
 * @private
 */
glslunit.compiler.Preprocessor.FormatParseError_ = function(exception,
                                                            shaderType,
                                                            sourceMap,
                                                            libraryFiles) {
  var result = 'Error while parsing the ' + shaderType + ' shader code\n';
  var errorLocation = sourceMap[exception.line - 1];
  result += errorLocation.fileName + ' ' +
      (errorLocation.localLine + 1) + ':' + exception.message + '\n' +
      libraryFiles[errorLocation.fileName].
          split('\n')[errorLocation.localLine] + '\n' +
          (new Array(exception.column).join(' ')) + '^';
  return new Error(result);
};


/**
 * Helper function for parsing a source file.  Given a source file and a map of
 *      library files, parses the source file into the object that stores
 *      information on how to compile and output this shader class, and returns
 *      the raw source code for the shader.
 * @param {string} fileName The name of the file to parse.
 * @param {!Object.<string, string>} libraryFiles A map of filenames to the
 *     contents of the file for library files.
 * @param {!Object.<string, string>} provideFileMap A map of symbols to the
 *     files that provide those symbols.
 * @param {!Object.<string, boolean>} includedFiles set of files already
 *     included in the result.
 * @param {!Array.<{fileName: string, localLine: number}>} vertexSourceMap Array
 *     mapping line numbers to their source file for the vertex program.
 * @param {!Array.<{fileName: string, localLine: number}>} fragmentSourceMap
 *     Array mapping line numbers to their source file for the vertex program.
 * @return {glslunit.compiler.ShaderProgram} The parsed program data.
 * @private
 */
glslunit.compiler.Preprocessor.ParseFileSource_ = function(fileName,
                                                           libraryFiles,
                                                           provideFileMap,
                                                           includedFiles,
                                                           vertexSourceMap,
                                                           fragmentSourceMap) {
  var inVertex = true;
  var inFragment = true;
  var result = new glslunit.compiler.ShaderProgram();
  if (!(fileName in libraryFiles)) {
    throw new Error('Library file ' + fileName + ' couldn\'t be found');
  }
  // Remove any line continuations
  var fileSource = libraryFiles[fileName].replace(/\\\n/g, '');
  goog.array.forEach(fileSource.split('\n'), function(line, index) {
    var match;
    if (match = glslunit.compiler.Preprocessor.RE_CLASS_.exec(line)) {
      result.className = match[1];
    } else if (match =
               glslunit.compiler.Preprocessor.RE_SUPERCLASS_.exec(line)) {
      result.superClass = match[1];
    } else if (match =
               glslunit.compiler.Preprocessor.RE_NAMESPACE_.exec(line)) {
      result.namespace = match[1];
    } else if (match = glslunit.compiler.Preprocessor.RE_FRAGMENT_.exec(line)) {
      inFragment = true;
      inVertex = false;
    } else if (match = glslunit.compiler.Preprocessor.RE_VERTEX_.exec(line)) {
      inFragment = false;
      inVertex = true;
    } else if (match = glslunit.compiler.Preprocessor.RE_COMMON_.exec(line)) {
      inFragment = true;
      inVertex = true;
    } else if (match = glslunit.compiler.Preprocessor.RE_MODE_.exec(line)) {
      var mode = new glslunit.compiler.ShaderMode();
      mode.preprocessorName = match[1];
      var options = match[2].split(',');
      if (options.length < 2) {
        throw fileName + ' ' + index + ':0 ' +
            'Mode with less than two options given!\n' +
            '\t' + line;
      }
      goog.array.forEach(options, function(option) {
        var keyVal = option.split(':');
        if (keyVal.length != 2 || !keyVal[1].match(/^[0-9]+$/)) {
          throw fileName + ' ' + index + ':0 ' +
              'Mode option has invalid format!\n' +
              '\t' + line;
        }
        mode.options.push({name: keyVal[0], value: parseInt(keyVal[1], 10)});
      });
      result.shaderModes.push(mode);
    } else if (match =
               glslunit.compiler.Preprocessor.RE_DEFAULT_MODE_.exec(line)) {
      var mode = new glslunit.compiler.ShaderMode();
      mode.preprocessorName = match[1];
      mode.options.push({name: 'OFF', value: 0});
      mode.options.push({name: 'ON', value: 1});
      result.shaderModes.push(mode);
    } else if (match = glslunit.compiler.Preprocessor.RE_OVERRIDE_.exec(line)) {
      if (inFragment) {
        result.originalFragmentSource =
            glslunit.compiler.Preprocessor.OverrideFunction_(
                match[1], match[2], result.originalFragmentSource);
      }
      if (inVertex) {
        result.originalVertexSource =
            glslunit.compiler.Preprocessor.OverrideFunction_(
                match[1], match[2], result.originalVertexSource);
      }
    } else if (match =
               glslunit.compiler.Preprocessor.RE_JSREQUIRE_.exec(line)) {
      result.jsRequires.push(match[1]);
    } else if (match = glslunit.compiler.Preprocessor.RE_JSCONST_.exec(line)) {
      var jsConst = new glslunit.compiler.ShaderJsConst();
      jsConst.originalName = match[1];
      jsConst.expression = match[2];
      result.jsConsts.push(jsConst);
    }
    if (inFragment) {
      result.originalFragmentSource += line + '\n';
      fragmentSourceMap.push({fileName: fileName, localLine: index});
    }
    if (inVertex) {
      result.originalVertexSource += line + '\n';
      vertexSourceMap.push({fileName: fileName, localLine: index});
    }
    if (match = glslunit.compiler.Preprocessor.RE_TEMPLATE_.exec(line)) {
      result.template = match[1];
    }
    // Add in include code after appending comment to source code to keep things
    // in the correct order.
    var includeFile = function(includedFileName) {
      if (!(includedFileName in includedFiles)) {
        // Mark this file as included.
        includedFiles[includedFileName] = true;
        var includedProgram =
          glslunit.compiler.Preprocessor.ParseFileSource_(
            includedFileName,
              libraryFiles,
              provideFileMap,
              includedFiles,
              vertexSourceMap,
              fragmentSourceMap);
        // Copy all of the values from the included file to the parent file.
        result.originalVertexSource += includedProgram.originalVertexSource;
        result.originalFragmentSource += includedProgram.originalFragmentSource;
        Array.prototype.push.apply(result.shaderModes,
                                   includedProgram.shaderModes);
        Array.prototype.push.apply(result.jsRequires,
                                   includedProgram.jsRequires);
        Array.prototype.push.apply(result.jsConsts,
                                   includedProgram.jsConsts);
      }
    }
    if (match = glslunit.compiler.Preprocessor.RE_INCLUDE_.exec(line)) {
      includeFile(match[1]);
    } else if (match = glslunit.compiler.Preprocessor.RE_REQUIRE_.exec(line)) {
      var requireSymbol = match[1];
      if (!(requireSymbol in provideFileMap)) {
        throw new Error('File ' + fileName + 'required symbol ' +
            requireSymbol + ' but it was never provided.');
      }
      includeFile(provideFileMap[requireSymbol]);
    }
  });
  return result;
};


/**
 * Overrides a function by replacing all declarations of a given function with
 *     a replacement.
 * @param {string} original The function name to replace.
 * @param {string} replacement The function name to replace original with.
 * @param {string} source The source code of the shader up to the point of the
 *     override.
 * @return {string} The source code with the original method overridden.
 * @private
 */
glslunit.compiler.Preprocessor.OverrideFunction_ =
    function(original, replacement, source) {
  // TODO(rowillia): We can clearly be much smarter here with the AST than
  // this, implementing as regex for parity.
  var reFunctionDecl = new RegExp(
      '(void|float|int|bool|vec2|vec3|vec4| ivec2|ivec3|ivec4|bvec2|bvec3|' +
      'bvec4|mat2|mat3|mat4)\\s+' + original + '(\\([^)]*\\))\\s*\\{',
      'g');
  var match;
  var result = source;
  while (match = reFunctionDecl.exec(source)) {
    var type = match[1], remainder = match[2];
    source = source.replace(reFunctionDecl,
        type + ' ' + original + remainder + ';' +
        type + ' ' + replacement + remainder + '{');
  }
  return source;
};
