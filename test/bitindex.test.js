
'use strict';

require('should');
var util= require('util');

var BitIndex = require( '..' );

describe( 'BitIndex', function() {
  it( 'should have an initial population of zero', function() {
    new BitIndex().population().should.equal(0);
  } );
  it( 'should initially test empty', function() {
    new BitIndex().is_empty().should.be.true
  } );
  it( 'should have a population after a bit is set', function() {
    new BitIndex().set(123).population().should.equal(1);
  } );
  it( 'should not test empty if any bits are set', function() {
    new BitIndex().set(123).is_empty().should.be.false
  } );
  it( 'should expand its underlying buffer dynamically', function() {
    var bi= new BitIndex()
    bi.bytes.should.equal(BitIndex.chunksize)
    bi.set(BitIndex.chunksize*8)
    bi.population().should.equal(1);
    bi.bytes.should.equal(BitIndex.chunksize*2)
  } );
  for (var i= 0; i<33; i++){
    it( 'should count a byte in the '+i+'th bit position', function() {
        new BitIndex().set(i).population().should.equal(1);
    })
  }
  it( 'should count a byte in the last bit of the initial allocation', function() {
    var bi= new BitIndex()
    bi.bytes.should.equal(BitIndex.chunksize)
    bi.set(BitIndex.chunksize*8-1)
    bi.population().should.equal(1);
    bi.bytes.should.equal(BitIndex.chunksize)
  } );
  for (var i= 0; i<33; i++){
    it( 'should report a byte as being set in the '+i+'th bit position', function() {
        var bi= new BitIndex().set(i)
        if (i>0) {
          bi.get(0).should.be.false
          bi.get(i-1).should.be.false
        }
        bi.get(i).should.be.true
        bi.get(i+1).should.be.false
    })
  }
  for (var i= 0; i<33; i++){
    it( 'should unset a bit in the '+i+'th position', function() {
        var bi= new BitIndex().set(i)
        if (i>0) {
          bi.set(0)
          bi.set(i-1)
        }
        bi.set(i+1)
        bi.unset(i)
        if (i>0) {
          bi.get(0).should.be.true
          bi.get(i-1).should.be.true
        }
        bi.get(i).should.be.false
        bi.get(i+1).should.be.true
    })
  }
  it( 'should be able to initialize from a hex string', function() {
    var bi= new BitIndex('8f1200000000000001')
    util.inspect(bi.toOffsets()).should.equal('[ 0, 4, 5, 6, 7, 11, 14, 71 ]')
    bi.get(0).should.be.true
    bi.get(1).should.be.false
    bi.get(70).should.be.false
    bi.get(71).should.be.true
    bi.get(72).should.be.false
  } );
  it( 'toOffsets should report which bits are set', function() {
    var bi= new BitIndex('8f1200000000000001')
    util.inspect(bi.toOffsets()).should.equal('[ 0, 4, 5, 6, 7, 11, 14, 71 ]')
  } );
  it( 'should expose a stream that writes the index of each bit that is set', function(cb) {
    var bi= new BitIndex('8f1200811800188101')
    var results= []
    bi.createAreSetBitsStream()
    .on('data', function(data){
      results.push(data)
    })
    .on('error', function(err){
      assert.ifError(err)
    })
    .on('end', function(){
      util.inspect(results).should.equal('[ 0, 4, 5, 6, 7, 11, 14, 24, 31, 35, 36, 51, 52, 56, 63, 71 ]')
      cb()
    })
  } );
  it( 'should perform an AND operation', function() {
    new       BitIndex('800000111122224444888801')
    .and( new BitIndex('808421842184218421842101')).persistable()
    .should.equal(     '800000000100200400800001')
  } );
  it( 'should perform an AND operation, reversed', function() {
    new       BitIndex('808421842184218421842101')
    .and( new BitIndex('800000111122224444888801')).persistable()
    .should.equal(     '800000000100200400800001')
  } );
  it( 'should perform an AND operation with opposite end bits', function() {
    new       BitIndex('000000111122224444888800')
    .and( new BitIndex('808421842184218421842101')).persistable()
    .should.equal(     '00000000010020040080')  // note: trailing empty bits truncated
  } );
  it( 'should produce a persistable representation that truncates trailing bytes, but always leaves at one byte', function() {
    var bi= new BitIndex('84211248')
    bi.and( new BitIndex('00000000')).persistable()
    .should.equal(       '00')
  } );
  it( 'should mask off all bits with an AND operation', function() {
    var bi= new BitIndex('84211248')
    bi.and( new BitIndex('00000000')).persistable()
    .should.equal(       '00')
  } );
  it( 'should pass all bits through a 0xff AND mask', function() {
    var bi= new BitIndex('84211248')
    bi.and( new BitIndex('ffffffff')).persistable()
    .should.equal(       '84211248')
  } );
  it( 'should perform an AND operation with bitmaps of unequal length', function() {
    new       BitIndex('800000111122224444888801ffffff')
    .and( new BitIndex('808421842184218421842101')).persistable()
    .should.equal(     '800000000100200400800001')
  } );
  it( 'should perform an AND operation with bitmaps of unequal length, in either order', function() {
    new       BitIndex('808421842184218421842101')
    .and( new BitIndex('800000111122224444888801ffffff')).persistable()
    .should.equal(     '800000000100200400800001')
  } );
  it( 'should perform an OR operation', function() {
    var bi=new BitIndex('0000111122228888')
    .or(   new BitIndex('8421842184218421')).persistable()
    .should.equal(      '84219531a6238ca9')
  } );
  it( 'should perform an OR operation with operands reversed', function() {
    var bi=new BitIndex('8421842184218421')
    .or(   new BitIndex('0000111122228888')).persistable()
    .should.equal(      '84219531a6238ca9')
  } );
  it( 'should perform an OR operation with unequal length bitmaps', function() {
    new      BitIndex('00001111222288881111')
    .or( new BitIndex('8421842184218421')).persistable()
    .should.equal(    '84219531a6238ca91111')
  } );
  it( 'should perform an OR operation that sets all bits', function() {
    var bi=new BitIndex('ffffffffffffffff')
    .or(   new BitIndex('8421842184218421')).persistable()
    .should.equal(      'ffffffffffffffff')
  } );
  it( 'should perform an OR operation that changes nothing', function() {
    var bi=new BitIndex('0000000000000000')
    .or(   new BitIndex('8421842184218421')).persistable()
    .should.equal(      '8421842184218421')
  } );
  it( 'should perform an OR operation with unequal length bitmaps, in other order', function() {
    new      BitIndex('8421842184218421')
    .or( new BitIndex('00001111222288881111')).persistable()
    .should.equal(    '84219531a6238ca91111')
  } );
  it( 'should perform an XOR operation', function() {
    new      BitIndex('0000111122228888')
    .xor(new BitIndex('8421842184218421')).persistable()
    .should.equal(    '84219530a6030ca9')
  } );
  it( 'should perform an XOR operation in either order', function() {
    new      BitIndex('8421842184218421')
    .xor(new BitIndex('0000111122228888')).persistable()
    .should.equal(    '84219530a6030ca9')
  } );
  it( 'should perform an XOR operation that toggles every bit', function() {
    new      BitIndex('fedcba9876543210')
    .xor(new BitIndex('ffffffffffffffff')).persistable()
    .should.equal(    '0123456789abcdef')
  } );
  it( 'should perform an XOR operation that changes nothing', function() {
    new      BitIndex('fedcba9876543210')
    .xor(new BitIndex('0000000000000000')).persistable()
    .should.equal(    'fedcba9876543210')
  } );
  it( 'should perform an XOR operation where the first operand is longer', function() {
    new      BitIndex('fedcba9876543210ffff')
    .xor(new BitIndex('ffffffffffffffff')).persistable()
    .should.equal(    '0123456789abcdefffff')
  } );
  it( 'should perform an XOR operation where the second operand is longer', function() {
    new      BitIndex('ffffffffffffffff')
    .xor(new BitIndex('fedcba9876543210ffff')).persistable()
    .should.equal(    '0123456789abcdefffff')
  } );
  it( 'should count the bits properly', function() {
    new BitIndex('ffffffffffffffff').count().should.equal(64)
  } );
  it( 'should count the bits properly', function() {
    new BitIndex('f0e1d2c3b4a5968778695a4b3c2d1e0f').count().should.equal(64)
  } );
  it( 'should count the bits properly', function() {
    new BitIndex('0000000000000000').count().should.equal(0)
  } );
} );
