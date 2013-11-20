
/*
 * bitindex
 * https://github.com/randymized/bitindex
 *
 * Copyright (c) 2013 Randy McLaughlin
 * Licensed under the MIT license.
 */

'use strict';

var Readable = require('stream').Readable;

var util = require('util');

util.inherits(AreSetBitsStream, Readable);

function AreSetBitsStream(buffer) {
  Readable.call(this, {objectMode: true});
  this.buffer = buffer;
  this.limit = 8 * this.buffer.length;
  this.i= 0
}

AreSetBitsStream.prototype._read = function() {
  var pause= false;
  while (this.i < this.limit) {
    if ((this.buffer[this.i/8|0] & (0x80 >>> this.i%8)) !== 0) {
      pause= !this.push(this.i);
    }
    this.i++
    if (pause) return;
  }
  return this.push(null)
};

var TrailingZeros = /(00)+$/;

var BitIndex= function(persisted) {
  if (persisted != null) {
    if (Buffer.isBuffer(persisted)) {
      this.buffer= persisted;
    } else {
      this.buffer= new Buffer(persisted, 'hex');
    }
  } else {
    this.buffer= new Buffer(BitIndex.chunksize);
    this.buffer.fill(0);
  }
  this.bytes= this.buffer.length;
}

BitIndex.prototype._assure_bytes = function(needed_index) {
  var more = needed_index + 1 - this.bytes;
  if (more <= 0) return;
  var addition = new Buffer(Math.ceil(more / BitIndex.chunksize) * BitIndex.chunksize);
  addition.fill(0);
  this.buffer = Buffer.concat([this.buffer, addition]);
  this.bytes = this.buffer.length;
};

BitIndex.prototype.set = function(bitnumber) {
  var b = bitnumber % 8;
  var i = (bitnumber - b) / 8;
  this._assure_bytes(i);
  this.buffer[i] |= (0x80 >>> b);
  return this;
};

BitIndex.prototype.unset = function(bitnumber) {
  var b = bitnumber % 8;
  var i = (bitnumber - b) / 8;
  this._assure_bytes(i);
  this.buffer[i] &= ~(0x80 >>> b);
  return this;
};

BitIndex.prototype.get = function(bitnumber) {
  var b = bitnumber % 8;
  var i = (bitnumber - b) / 8;
  return !!(this.buffer[i] & (0x80 >>> b));
};

BitIndex.prototype.toOffsets = function() {
  var buffer = this.buffer;
  var bytes = this.bytes;
  var results= []
  for (var i = 0; i < bytes; i++) {
    for (var b = 0; b < 8; b++) {
      if ((buffer[i] & (0x80 >>> b)) !== 0) {
        results.push(8*i+b)
      }
    }
  }
  return results;
};

BitIndex.prototype.and = function(other) {
  var bytes = Math.min(this.bytes, other.bytes);
  var dest = new Buffer(bytes);
  for (var i= bytes; i--;) {
    dest[i] = this.buffer[i] & other.buffer[i];
  }
  return new BitIndex(dest);
};

BitIndex.prototype.or = function(other) {
  var dest= new Buffer(Math.max(this.bytes,other.buffer.length))
  if (this.bytes > other.buffer.length)
    this.buffer.copy(dest);
  else
    other.buffer.copy(dest);
  for (var i= Math.min(this.bytes,other.buffer.length); i--;) {
    dest[i] = this.buffer[i] | other.buffer[i];
  }
  return new BitIndex(dest);
};

BitIndex.prototype.xor = function(other) {
  var dest= new Buffer(Math.max(this.bytes,other.buffer.length))
  if (this.bytes > other.buffer.length)
    this.buffer.copy(dest);
  else
    other.buffer.copy(dest);
  for (var i= Math.min(this.bytes,other.buffer.length); i--;) {
    dest[i] = this.buffer[i] ^ other.buffer[i];
  }
  return new BitIndex(dest);
};

BitIndex.prototype.persistable = function() {
  var s= this.buffer.toString('hex').replace(TrailingZeros, '')
  if (s.length === 0) s = '00';
  return s;
};

BitIndex.prototype.is_empty = function() {
  var a= this.buffer
  for (var i= this.bytes; i--;) {
    if (a[i] !== 0) return false;
  }
  return true;
};

BitIndex.prototype.population=
BitIndex.prototype.count = function() {
  var total= 0;
  var a= this.buffer;
  var bytes= this.bytes;
  for (var i= this.bytes; i--;) {
    var w= a[i]
    w= ((w & 0xaa) >>> 1) + (w & 0x55)
    w= ((w & 0xcc) >>> 2) + (w & 0x33)
    total += ((w & 0xf0) >>> 4) + (w & 0x0f)
  }
  return total
};

BitIndex.prototype.createAreSetBitsStream = function() {
  return new AreSetBitsStream(this.buffer);
};

BitIndex.chunksize = 16;

module.exports = BitIndex;
