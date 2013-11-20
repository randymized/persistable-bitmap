
/*
 * persistable-bitmap
 * https://github.com/randymized/persistable-bitmap
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

var Bitmap= function(persisted) {
  if (persisted != null) {
    if (Buffer.isBuffer(persisted)) {
      this.buffer= persisted;
    } else {
      this.buffer= new Buffer(persisted, 'hex');
    }
  } else {
    this.buffer= new Buffer(Bitmap.chunksize);
    this.buffer.fill(0);
  }
  this.bytes= this.buffer.length;
}

Bitmap.prototype._assure_bytes = function(needed_index) {
  var more = needed_index + 1 - this.bytes;
  if (more <= 0) return;
  var addition = new Buffer(Math.ceil(more / Bitmap.chunksize) * Bitmap.chunksize);
  addition.fill(0);
  this.buffer = Buffer.concat([this.buffer, addition]);
  this.bytes = this.buffer.length;
};

Bitmap.prototype.set = function(bitnumber) {
  if (bitnumber < 0) return;  // Negative bitnumbers are ignored
  var b = bitnumber % 8;
  var i = (bitnumber - b) / 8;
  this._assure_bytes(i);
  this.buffer[i] |= (0x80 >>> b);
  return this;
};

Bitmap.prototype.setRange = function(start,end,value) {
  if (typeof value === "undefined" || !!value) value= true;
  if (end < 0) end= 0;
  if (start >= end) {
    var x= start;
    start= end;
    end= x;
  }
  this._assure_bytes(end);
  // This could be made more efficient by setting entire bytes at one time
  // rather than bit-by-bit.
  if (value) {
    while (start <= end) {
      this.buffer[start/8|0] |= (0x80 >>> start%8);
      start++;
    }
  } else {
    while (start <= end) {
      this.buffer[start/8|0] &= ~(0x80 >>> start%8);
      start++;
    }
  }
  return this;
};

Bitmap.prototype.unset = function(bitnumber) {
  if (bitnumber < 0) return;  // Negative bitnumbers are ignored
  var b = bitnumber % 8;
  var i = (bitnumber - b) / 8;
  this._assure_bytes(i);
  this.buffer[i] &= ~(0x80 >>> b);
  return this;
};

Bitmap.prototype.get = function(bitnumber) {
  if (bitnumber < 0) return false;  // Negative bits cannot be
  var b = bitnumber % 8;
  var i = (bitnumber - b) / 8;
  if (i >= this.bytes) return false;
  return !!(this.buffer[i] & (0x80 >>> b));
};

Bitmap.prototype.toOffsets = function() {
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

Bitmap.prototype.and = function(other) {
  var bytes = Math.min(this.bytes, other.bytes);
  var dest = new Buffer(bytes);
  for (var i= bytes; i--;) {
    dest[i] = this.buffer[i] & other.buffer[i];
  }
  return new Bitmap(dest);
};

Bitmap.prototype.or = function(other) {
  var dest= new Buffer(Math.max(this.bytes,other.buffer.length))
  if (this.bytes > other.buffer.length)
    this.buffer.copy(dest);
  else
    other.buffer.copy(dest);
  for (var i= Math.min(this.bytes,other.buffer.length); i--;) {
    dest[i] = this.buffer[i] | other.buffer[i];
  }
  return new Bitmap(dest);
};

Bitmap.prototype.xor = function(other) {
  var dest= new Buffer(Math.max(this.bytes,other.buffer.length))
  if (this.bytes > other.buffer.length)
    this.buffer.copy(dest);
  else
    other.buffer.copy(dest);
  for (var i= Math.min(this.bytes,other.buffer.length); i--;) {
    dest[i] = this.buffer[i] ^ other.buffer[i];
  }
  return new Bitmap(dest);
};

Bitmap.prototype.persistable = function() {
  var s= this.buffer.toString('hex').replace(TrailingZeros, '')
  if (s.length === 0) s = '00';
  return s;
};

Bitmap.prototype.isEmpty = function() {
  var a= this.buffer
  for (var i= this.bytes; i--;) {
    if (a[i] !== 0) return false;
  }
  return true;
};

Bitmap.prototype.population=
Bitmap.prototype.count = function() {
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

Bitmap.prototype.createAreSetBitsStream = function() {
  return new AreSetBitsStream(this.buffer);
};

Bitmap.chunksize = 16;

module.exports = Bitmap;
