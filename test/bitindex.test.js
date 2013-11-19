
'use strict';

var bitindex = require( '../lib/bitindex.js' );

describe( 'bitindex', function() {
  describe( 'bitindex()', function() {
    it( 'should be a function', function() {
      bitindex.should.be.a( 'function' );
    } );
    it( 'should return a function', function() {
      bitindex().should.be.a( 'function' );
    } );
  } );
} );
