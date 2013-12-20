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
 * @fileoverview Test cases for the VariableScopeVisitor.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.glsl.parser');



/**
 * Constructor for VariableScopeVisitorTest
 * @constructor
 */
function VariableScopeVisitorTest() {
}
registerTestSuite(VariableScopeVisitorTest);



function assertObjectCount(str, expected, obj) {
  var count = 0;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      count++;
    }
  }
  expectEq(expected, count, str);
}


/**
 * Tests that all of the global variables declared in the root scope are
 * properly collected with getVariablesInScope.
 */
VariableScopeVisitorTest.prototype.testRootCollectScope = function() {
  var testSource =
      'attribute int foo;' +
      'void main() {' +
      '  int x, y, z;' +
      '  {' +
      '    float foo;' +
      '  }' +
      '}';
  var testAST = glslunit.glsl.parser.parse(testSource, 'vertex_start');
  var variables =
      glslunit.VariableScopeVisitor.getVariablesInScope(testAST, testAST);
  assertObjectCount('Root should have only declared one variable',
                    1, variables);
  expectEq(variables['foo'],
      testAST.statements[0], 'foo should be stored as a variable');
};


/**
 * Tests that if a variable is redeclared locally the local definition is the
 * one returned.
 */
VariableScopeVisitorTest.prototype.testVariableOverride = function() {
  var testSource =
      'attribute int foo;' +
      'void main(int a, int b) {' +
      '  int x, y, z;' +
      '  {' +
      '    float foo;' +
      '  }' +
      '}';
  var testAST = glslunit.glsl.parser.parse(testSource, 'vertex_start');
  var innerScope = testAST.statements[1].body.statements[1];
  var variables =
      glslunit.VariableScopeVisitor.getVariablesInScope(testAST, innerScope);
  assertObjectCount('6 variables should have been declared',
                    6, variables);
  expectNe(variables['foo'],
      testAST.statements[0],
          'foo should have been overridden inside of the inner scope');
};


/**
 * Tests that when getting the variables in scope inside of a function that
 * parameters get precedence over local variables.
 */
VariableScopeVisitorTest.prototype.testVariableParameterWins = function() {
  var testSource =
      'attribute int foo;' +
      'void main(int a, int b) {' +
      '  int x, y, b;' +
      '}';
  var testAST = glslunit.glsl.parser.parse(testSource, 'vertex_start');
  var innerScope = testAST.statements[1].body;
  var variables =
      glslunit.VariableScopeVisitor.getVariablesInScope(testAST, innerScope);
  assertObjectCount('5 variables should have been declared',
                    5, variables);
  expectEq(variables['b'],
      testAST.statements[1].parameters[1],
          'b should not have been overridden locally');
};
