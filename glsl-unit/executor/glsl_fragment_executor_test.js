// Copyright 2011 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Test cases for the FragmentExecutor.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.ASTVisitor');
goog.require('glslunit.FragmentExecutor');
goog.require('glslunit.Generator');
goog.require('glslunit.NodeCollector');
goog.require('glslunit.glsl.parser');

/**
 * Constructor for GlslFragmentExecutorTest
 * @constructor
 */
function GlslFragmentExecutorTest() {
}
registerTestSuite(GlslFragmentExecutorTest);



/**
 * Tests that the fragment AST can be fetched and is correct.
 */
GlslFragmentExecutorTest.prototype.testGetVertexAst = function() {
  var testSource =
    'uniform vec2 fooBar;' +
    'varying vec2 raz;';
  var testAst = glslunit.glsl.parser.parse(testSource);
  var testExecutor = new glslunit.FragmentExecutor(null, testAst, null,
                                                   null, null);
  var vertexAst = testExecutor.getVertexAst();
  var attributes = glslunit.NodeCollector.collectNodes(vertexAst,
                                                       function(node) {
    return node.type == 'declarator' &&
           node.typeAttribute.qualifier == 'attribute';
  });
  expectEq(1, attributes.length);
};



/**
 * Tests that the vertex AST is properly instrumented with test code.
 */
GlslFragmentExecutorTest.prototype.testGetFragmentAst = function() {
  var testSource =
    'void main() {' +
    '  someValue = gl_FrontFacing + gl_PointCoord + ' +
    '     gl_FragCoord + vec(1.0,2.0,3.0,4.0);' +
    '}';
  var extractionTargetSource = 'someValue[1]';
  var extractionAst = glslunit.glsl.parser.parse(extractionTargetSource,
                                                 'assignment_expression');
  var testAst = glslunit.glsl.parser.parse(testSource, 'fragment_start');
  var testExecutor = new glslunit.FragmentExecutor(null, testAst, null,
                                                   null, null);

  var fragmentAst = testExecutor.getFragmentAst(extractionAst);
  expectEq(1,
      testAst.statements.length, "Orignal shouldn't have been transformed");

  expectEq('upper_mask',
      fragmentAst.statements[1].name, 'Encoding code not added');

  var uniforms = glslunit.NodeCollector.collectNodes(fragmentAst,
    function(node) {
      return node.type == 'declarator' &&
             node.typeAttribute.qualifier == 'uniform';
    });
  expectEq(3, uniforms.length, 'Mock Uniforms for built-ins not added');

  var assignments = glslunit.NodeCollector.collectNodes(fragmentAst,
    function(node) {
      return node.type == 'binary' &&
             node.operator.operator == '=' && node.left &&
             node.left.name == 'someValue';
    });
  expectEq(1, assignments.length, 'Couldn\t find original assignments.');
  var expectedSource =
    'someValue=_gl_FrontFacing_+_gl_PointCoord_+' +
    '_gl_FragCoord_+vec(1.,2.,3.,4.)';

  expectEq(expectedSource, glslunit.Generator.getSourceCode(assignments[0]));

  var resultSource = glslunit.Generator.getSourceCode(fragmentAst);
  expectNe(-1, resultSource.search('_testMain_'));
};


/**
 * Tests that the vertex AST is properly instrumented with test code.
 */
GlslFragmentExecutorTest.prototype.testNoMainFunction = function() {
  var testSource = 'attribute vec4 someAttr;';
  var testAst = glslunit.glsl.parser.parse(testSource);
  var testExecutor = new glslunit.FragmentExecutor(null, testAst, null,
                                                   null, null);
  var extractionTargetSource = 'someAttr[1]';
  var extractionAst = glslunit.glsl.parser.parse(extractionTargetSource,
                                                 'assignment_expression');
  var transformedAst = testExecutor.getFragmentAst(extractionAst);
  var resultSource = glslunit.Generator.getSourceCode(transformedAst);
  expectEq(-1, resultSource.search('_testMain_'));
};
