// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Structure for storing information on a shader program to
 *     compile.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.compiler.ShaderAttributeEntry');
goog.provide('glslunit.compiler.ShaderJsConst');
goog.provide('glslunit.compiler.ShaderMode');
goog.provide('glslunit.compiler.ShaderProgram');
goog.provide('glslunit.compiler.ShaderUniformEntry');

goog.require('glslunit.Generator');
goog.require('goog.array');
goog.require('goog.object');


/**
 * Structure for shader modes.
 * @constructor
 */
glslunit.compiler.ShaderJsConst = function() {
  /**
   * The original name of the preprocessor directive for this constant.
   * @type {string}
   */
  this.originalName = '';

  /**
   * The shortened name for the preprocessor directive for this constant.
   * @type {string}
   */
  this.shortName = '';

  /**
   * The Javascript expression to set this constant to.
   * @type {string}
   */
  this.expression = '';
};



/**
 * Structure for shader modes.
 * @constructor
 */
glslunit.compiler.ShaderMode = function() {
  /**
   * The preprocessor name for this mode.
   * @type {string}
   */
  this.preprocessorName = '';

  /**
   * The shortened name for this mode.
   * @type {string}
   */
  this.shortName = '';

  /**
   * The list of options for this mode.
   * @type {Array.<!{name: string, value: number}>}
   */
  this.options = [];
};


/**
 * Clones a ShaderMode
 * @return {glslunit.compiler.ShaderMode} A clone of this ShaderMode.
 */
glslunit.compiler.ShaderMode.prototype.clone = function() {
  var result = /** @type {glslunit.compiler.ShaderMode} */ (
      goog.object.clone(this));
  result.options = goog.array.clone(this.options);
  return result;
};



/**
 * Structure for a shader attribute.
 * @constructor
 */
glslunit.compiler.ShaderAttributeEntry = function() {
  /**
   * The shortened name of the attribute in the compiled glsl code.
   * @type {string}
   */
  this.shortName = '';

  /**
   * The name of the attribute in the original glsl code.
   * @type {string}
   */
  this.originalName = '';

  /**
   * The number of elements in this attribute.  Should be [1, 4]
   * @type {number}
   */
  this.variableSize = 0;

  /**
   * The offset of this attribute declaration in the compiled source code.
   * @type {number}
   */
  this.compiledSourceOffset = 0;

  /**
   * The size of the declaration of the attribute in the compiled source code.
   * @type {number}
   */
  this.compiledSourceSize = 0;

 /**
  * The offset of this attribute declaration in the debug source code.
  * @type {number}
  */
 this.debugSourceOffset = 0;

 /**
  * The size of the declaration of the attribute in the debug source code.
  * @type {number}
  */
 this.debugSourceSize = 0;
};



/**
 * Structure for a shader uniform.
 * @constructor
 */
glslunit.compiler.ShaderUniformEntry = function() {
  /**
   * The shortened name of the attribute in the compiled glsl code.
   * @type {string}
   */
  this.shortName = '';

  /**
   * The name of the attribute in the original glsl code.
   * @type {string}
   */
  this.originalName = '';

  /**
   * The type of this uniform.
   * @type {string}
   */
  this.type = '';
};



/**
 * Structure for a shader program.
 * @constructor
 */
glslunit.compiler.ShaderProgram = function() {
  /**
   * The name of the Javascript class to be be generated.
   * @type {string}
   */
  this.className = '';

  /**
   * The file name for the template to be used when generating source code.
   * @type {string}
   */
  this.template = '';

  /**
   * The name of the superclass of the Javascript class to be be generated.
   * @type {string}
   */
  this.superClass = '';

  /**
   * The namespace of the generated class.
   * @type {string}
   */
  this.namespace = '';

  /**
   * Array of license comments
   * @type {!Array.<string>}
   */
  this.licenses = [];

  /**
   * Array of required javascript classes.
   * @type {!Array.<string>}
   */
  this.jsRequires = [];

  /**
   * Array of required javascript classes.
   * @type {!Array.<glslunit.compiler.ShaderJsConst>}
   */
  this.jsConsts = [];

  /**
   * Map of properties to be passed down to the template
   * @type {!Object.<string, string>}
   */
  this.templateProperties = {};

  /**
   * When accessing fragmentSource/vertexSource, if prettyPrint is true
   * the source will be pretty printed.
   * @type {boolean}
   */
  this.prettyPrint = false;

  /**
   * The original, unoptimized vertex source code.
   * @type {string}
   */
  this.originalVertexSource = '';

  /**
   * The original, unoptimized fragment source code.
   * @type {string}
   */
  this.originalFragmentSource = '';

  /**
   * Map of the original name of a definition to the ShaderAttributeEntry with
   *     the properties of the shader attribute.
   * @type {Object.<string, glslunit.compiler.ShaderAttributeEntry>}
   */
  this.attributeMap = {};

  /**
   * Map of the original name of a uniform to it's name in the compiled code.
   * @type {Object.<string, glslunit.compiler.ShaderUniformEntry>}
   */
  this.uniformMap = {};

  /**
   * Array of shader modes.
   * @type {Array.<!glslunit.compiler.ShaderMode>}
   */
  this.shaderModes = [];

  /**
   * The source code for the fragment shader for this program.
   * @type {!Object}
   */
  this.fragmentAst = {};

  /**
   * The source code for the vertex shader for this program.
   * @type {!Object}
   */
  this.vertexAst = {};

  /**
   * The set of files that have been included in this shader program.
   * @type {!Object.<string, boolean>}
   */
  this.includedFiles = {};
};


/**
 * Clones a ShaderProgram
 * @return {glslunit.compiler.ShaderProgram} A clone of this ShaderProgram.
 */
glslunit.compiler.ShaderProgram.prototype.clone = function() {
  var result = /** @type {glslunit.compiler.ShaderProgram} */ (
      goog.object.clone(this));
  result.attributeMap = goog.object.clone(this.attributeMap);
  result.uniformMap = goog.object.clone(this.uniformMap);
  result.templateProperties = goog.object.clone(this.templateProperties);
  result.jsRequires = goog.array.clone(this.jsRequires);
  result.includedFiles = goog.object.clone(this.includedFiles);
  result.jsConsts = this.jsConsts.map(function(x) {
    return goog.object.clone(x);
  });
  result.shaderModes = this.shaderModes.map(function(x) {
    return x.clone();
  });
  return result;
};


/**
 * Gets the vertex source code.
 * @param {string=} opt_newline The string to use for line breaks.
 * @return {string} The vertex source code.
 * @export
 */
glslunit.compiler.ShaderProgram.prototype.getVertexSource =
    function(opt_newline) {
  return glslunit.Generator.getSourceCode(this.vertexAst, opt_newline || '\\n',
      this.prettyPrint);
};


/**
 * Gets the fragment source code.
 * @param {string=} opt_newline The string to use for line breaks.
 * @return {string} The vertex source code.
 * @export
 */
glslunit.compiler.ShaderProgram.prototype.getFragmentSource = function(
    opt_newline) {
  return glslunit.Generator.getSourceCode(this.fragmentAst,
      opt_newline || '\\n', this.prettyPrint);
};


/**
 * Escapes a string to be used in a shader template.
 * @param {string} inputString The string to escape.
 * @param {string=} opt_newline The string to use for line breaks.
 * @return {string} The safely escaped string.
 */
glslunit.compiler.ShaderProgram.escapeString = function(inputString,
      opt_newline) {
  return inputString.replace(/\n/g, opt_newline || '\\n').replace(/'/g, '\\\'');
};


/**
 * Gets the original, unoptimized fragment source code.
 * @param {string=} opt_newline The string to use for line breaks.
 * @return {string} The vertex source code.
 * @export
 */
glslunit.compiler.ShaderProgram.prototype.getOriginalFragmentSource = function(
    opt_newline) {
  return glslunit.compiler.ShaderProgram.escapeString(
      this.originalFragmentSource, opt_newline);
};


/**
 * Gets the original, unoptimized vertex source code.
 * @param {string=} opt_newline The string to use for line breaks.
 * @return {string} The vertex source code.
 * @export
 */
glslunit.compiler.ShaderProgram.prototype.getOriginalVertexSource = function(
    opt_newline) {
  return glslunit.compiler.ShaderProgram.escapeString(
      this.originalVertexSource, opt_newline);
};


/**
 * Gets the list of attributes for this shader program.
 * @return {Array.<glslunit.compiler.ShaderAttributeEntry>} The list of
 *     attributes for this shader program.
 * @export
 */
glslunit.compiler.ShaderProgram.prototype.getAttributes = function() {
  var result = [];
  for (var i in this.attributeMap) {
    result.push(this.attributeMap[i]);
  }
  if (result.length > 0) {
    result[result.length - 1]['last'] = true;
  }
  return result;
};


/**
 * Gets the list of uniforms for this shader program.
 * @return {Array.<glslunit.compiler.ShaderUniformEntry>} The list of uniforms
 *     for this shader program.
 * @export
 */
glslunit.compiler.ShaderProgram.prototype.getUniforms = function() {
  var result = [];
  for (var i in this.uniformMap) {
    result.push(this.uniformMap[i]);
  }
  if (result.length > 0) {
    result[result.length - 1]['last'] = true;
  }
  return result;
};


/**
 * Fills in any jsConst, uniform or attribute entries in this shader program
 * that haven't already been filled in.
 */
glslunit.compiler.ShaderProgram.prototype.defaultProgramShortNames =
    function() {
  goog.array.forEach(this.jsConsts, function(jsConst) {
    if (jsConst.shortName == '') {
      jsConst.shortName = jsConst.originalName;
    }
  });
  var attributeShortNameToEntry = {};
  for (var attributeName in this.attributeMap) {
    var attribute = this.attributeMap[attributeName];
    attributeShortNameToEntry[attribute.shortName] = attribute;
  }
  var uniformShortNameToEntry = {};
  for (var uniformName in this.uniformMap) {
    var uniform = this.uniformMap[uniformName];
    uniformShortNameToEntry[uniform.shortName] = uniform;
  }
  this.defaultProgramVariables_(this.vertexAst, attributeShortNameToEntry,
                                uniformShortNameToEntry);
  this.defaultProgramVariables_(this.fragmentAst, attributeShortNameToEntry,
                                uniformShortNameToEntry);
};


/**
 * Defaults the variable entries for attributes and uniforms for a shader
 * program.
 * @param {!Object} ast The AST we're defaulting program variables for.
 * @param {!Object.<string, glslunit.compiler.ShaderAttributeEntry>}
 *     attributeShortNameToEntry Map of the short name for an attribute to its
 *     entry.
 * @param {!Object.<string, glslunit.compiler.ShaderUniformEntry>}
 *     uniformShortNameToEntry Map of the short name for a uniform to its
 *     entry.
 * @private
 */
glslunit.compiler.ShaderProgram.prototype.defaultProgramVariables_ =
    function(ast, attributeShortNameToEntry, uniformShortNameToEntry) {
  var publicVars = glslunit.NodeCollector.collectNodes(ast,
    function(node) {
    return node.type == 'declarator' &&
        (node.typeAttribute.qualifier == 'attribute' ||
        node.typeAttribute.qualifier == 'uniform');
  });
  goog.array.forEach(publicVars, function(publicVar) {
    goog.array.forEach(publicVar.declarators, function(declarator) {
      var varName = declarator.name.name;
      var varType = publicVar.typeAttribute.name;
      if (publicVar.typeAttribute.qualifier == 'attribute') {
        var entry = attributeShortNameToEntry[varName];
        if (!entry) {
          entry = new glslunit.compiler.ShaderAttributeEntry();
          entry.shortName = varName;
          entry.originalName = varName;
          var attributeSource = glslunit.Generator.getSourceCode(publicVar);
          var attributeLocation = this.originalVertexSource.search(
              attributeSource);
          var parsedSize = parseInt(varType.slice(3, 4), 10);
          entry.variableSize = isNaN(parsedSize) ? 1 : parsedSize;
          entry.debugSourceOffset = attributeLocation;
          entry.debugSourceSize = attributeSource.length;
          this.attributeMap[varName] = entry;
        }
      } else { // Has to be a uniform.
        var entry = uniformShortNameToEntry[varName];
        if (!entry) {
          entry = new glslunit.compiler.ShaderUniformEntry();
          entry.shortName = varName;
          entry.originalName = varName;
          entry.type = varType;
          this.uniformMap[varName] = entry;
        }
      }
    }, this);
  }, this);
};
