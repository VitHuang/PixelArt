goog.require('glslunit.testing.GlslJstdAdapter');

var rgbConversionMatrix = [0.4124, 0.3576, 0.1805,
						  0.2126, 0.7152, 0.0722,
						  0.0193, 0.1192, 0.9505];

function loadScriptFile(shaderFile, testSuite) {
	var request = new XMLHttpRequest();
	request.overrideMimeType('text/plain');
	request.open('GET', 'http://localhost:9876/test/src/' + shaderFile, false);
	request.send();
	return request.responseText;
}

fragmentTestSuite('Basic shader', loadScriptFile('basic.fs'), function() {
  testMain('Render black', function() {
    expect('gl_FragColor')
      .equal([0, 0, 0, 1])
      .withEpsilonOf(0.01);
  });
});
fragmentTestSuite('cielab to srgb shader', loadScriptFile('cielabtosrgb.fs'), function() {
  testMain('Test inverse lab from below discontinuity', function() {
    expect('invlabf(0.20685)')
      .equal(0.008857)
      .withEpsilonOf(0.00001);
  });
  testMain('Test inverse lab from above discontinuity', function() {
    expect('invlabf(0.20695)')
      .equal(0.008857)
      .withEpsilonOf(0.00001);
  });
});
fragmentTestSuite('pixel shader', loadScriptFile('pixel.fs'), function() {
  testMain('Test RGB white linearisation', function() {
    expect('linearise(1.0)').equal(1.0).withEpsilonOf(0.0001);
  });
  testMain('Test SRGB white to CIEXYZ', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCiexyz(vec3(1.0, 1.0, 1.0))')
	  .equal([0.9505, 1.0, 1.089])
	  .withEpsilonOf(0.0001);
  });
  testMain('Test SRGB pink to CIEXYZ', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCiexyz(vec3(1.0, 0.53333, 0.53333))')
	  .equal([0.54488, 0.40646, 0.28266])
	  .withEpsilonOf(0.00001);
  });
  testMain('Test SRGB black to CIELab', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCielab(vec3(0.0, 0.0, 0.0))')
	  .equal([0.0, 0.0, 0.0])
	  .withEpsilonOf(0.0001);
  });
  testMain('Test SRGB white to CIELab', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCielab(vec3(1.0, 1.0, 1.0))')
	  .equal([100.0, 0.0053, -0.0104])
	  .withEpsilonOf(0.0001);
  });
  testMain('Test SRGB red to CIELab', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCielab(vec3(1.0, 0.0, 0.0))')
	  .equal([53.2329, 80.1093, 67.2201])
	  .withEpsilonOf(0.0001);
  });
  testMain('Test SRGB green to CIELab', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCielab(vec3(0.0, 1.0, 0.0))')
	  .equal([87.7370, -86.1846, 83.1812])
	  .withEpsilonOf(0.0001);
  });
  testMain('Test SRGB pink to CIELab', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('srgbToCielab(vec3(1.0, 0.368627, 0.368627))')
	  .equal([61.718, 61.134, 33.283])
	  .withEpsilonOf(0.001);
  });
  testMain('Test CIEDE2000 white-black', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('ciede2000(srgbToCielab(vec3(1.0, 1.0, 1.0)), srgbToCielab(vec3(0.0, 0.0, 0.0)))')
	  .equal(100.0)
	  .withEpsilonOf(0.0001);
  });
  testMain('Test CIEDE2000 pink-red', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('ciede2000(srgbToCielab(vec3(1.0, 0.368627, 0.368627)), srgbToCielab(vec3(1.0, 0.0, 0.0)))')
	  .equal(13.5348)
	  .withEpsilonOf(0.0020);
  });
  testMain('Test CIEDE2000 red-green', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('ciede2000(srgbToCielab(vec3(1.0, 0.0, 0.0)), srgbToCielab(vec3(0.0, 1.0, 0.0)))')
	  .equal(86.615)
	  .withEpsilonOf(0.0090);
  });
  testMain('Test CIEDE2000', function() {
    set('rgbConversion').asArray(rgbConversionMatrix);
    expect('ciede2000(vec3(50.0, 2.6772, -79.7751), vec3(50.0, 0.0, -82.7485))')
	  .equal(2.0425)
	  .withEpsilonOf(0.0003); // quite a lot of floating point error
  });
  // as2DTexture doesn't work, so commenting this out in case it's ever fixed
  /*testMain('Test closest colour', function() {
    set('rgbConversion').asArray([0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9502]);
	var palette = new Array();
	for (var i = 0; i < 16; i++) {
	  palette.push(i * 16, i * 16, i * 16, 255);
	}
	set('palette').as2DTexture(palette, 1, 16);
    expect('getMatchingColour(vec4(0.5, 0.5, 0.5, 1.0))')
	  .equal([0.5, 0.5, 0.5, 1.0])
	  .withEpsilonOf(0.001);
  });*/
});

fragmentTestSuite('depth shader', loadScriptFile('depth.fs'), function() {
  testMain('pack 0', function() {
    expect('pack(0.0)')
      .equal([0, 0, 0, 0])
      .withEpsilonOf(0.0001);
  });
  testMain('pack 1/256', function() {
    expect('pack(1.0 / 256.0)')
      .equal([0, 0, 0, 1 / 256.0])
      .withEpsilonOf(0.0001);
  });
  testMain('pack 1/512', function() {
    expect('pack(1.0 / 512.0)')
      .equal([0, 0, 0.5, 0])
      .withEpsilonOf(0.0001);
  });
});
