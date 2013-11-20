# persistable-bitmap [![Build Status](https://secure.travis-ci.org/randymized/persistable-bitmap.png?branch=master)](http://travis-ci.org/randymized/persistable-bitmap)

> A bitmap class that is readily persistable in LevelDB and other databases.

## Getting Started
Install the module with: `npm install persistable-bitmap`

```javascript
var Bitmap = require( 'persistable-bitmap' );
```

## Documentation
The persistable bitmap class includes common bitmap operations and is designed for persisting in a database.  The immediate need that prompted development of this class was a class that be used to build bitmaped indexes to items stored in a LevelDB database.  The `persistable` method returns a hex string representing the bitmap.  That string can later be passed to the bitmap constructor to reconstruct a functionally equivalent bitmap.

Since a bitmap can be created from a hex string, it is possible to define a set of bits in hex and then construct a bitmap from that string.  This would allow preseting a range of bits, for example.  To invert a range of bits, first define the range in hex, construct a bitmap from it and then XOR it against the bits to be inverted.

In addition to methods for setting and getting bits, performing logical operations, counting set bits and returning an array containing the index of each set bit, a readable stream is also provided that streams the index of each set bit.

Bitmaps will grow dynamically to include all set bits.  There is no need to specify a size in advance or to be limited to any given size. Bitmaps are effectively of infinite length (limited by memory and maximum integer size), with all bits beyond the last one set unset.  Attempts to set a negative bit will be ignored.  Getting a negative bit will always return false.

Since all bitmaps are virtually of infinite length, logical operations do not require that the two operands be of the same length. The operation will work as if the shorter bitmap were padded with unset bits to equal the length of the longer bitmap. Since bitmaps are of infinite length, however, a NOT operation is problematic: an array or stream of all set bits would be endless.  It must be limited to a range of bits.

Since this class does not use a sparse representation, it is most suitable for mapping a compact set.  In the database application for which it was designed, an intermediate index might map a compact set of record numbers to records with more diverse keys.

### Methods

#### Constructor
- Given no arguments, the constructor will create an empty bitmap.
- If a hex string is passed as an argument, such as returned by the `persistable` method, the bits of the bitmap will be set to match that pattern.

#### instance.persistable(bitnumber)
- Return a hex representation of the bitmap.
- The hex string will not be prefixed by `\0x`.
- The hex string will only be long enough to include all bytes that contain set bits.  The length of the string may thus vary even when persisting the same bit space.
- The string will always include at least one byte.  An empty bitmap, one with all bits zeroed, will be represented as `00`.

#### instance.set(bitnumber)
- Set one bit to (1/true/set).
- Silently ignores attempts to set a negative bitnumber.
- Returns the bitmap object, allowing chaining.

#### instance.unset(bitnumber)
- Unsets one bit (to 0/false/unset).
- Noop if a negative bitnumber, since negative-numbered bits are already unset.
- Returns the bitmap object, allowing chaining.

#### instance.get(bitnumber)
- Gets the value, true or false, of one bit.
- A negative bitnumber will always result in a false result.

#### instance.setRange(start,end,[value])
- Set a range of bits.
- If value is omitted the range of bits will be set (to 1/true)
- The range is inclusive.
- If start is negative, the range will start at zero.
- If `start` is greater than `end` the two arguments will be reversed.
- Returns the bitmap object, allowing chaining.

#### instance.toOffsets()
- Returns an array that contains the index (bitnumber) of all set bits.
- See also `createAreSetBitsStream` which produces the same results in a stream rather than in an array.

#### instance.createAreSetBitsStream()
- Creates a readable stream that streams the index (bitnumber) of all set bits.

#### instance.and()
- Returns a new bitmap that is the result of a logical AND of the bits in the instance bitmap and the argument bitmap.
- Since the model is of infinite length bitmaps, there is no problem ANDing bitmaps of different apparent length.  Since bits beyond the apparent range are not set, the result will effectively be truncated to the shorter of the two bitmaps.

#### instance.or()
- Returns a new bitmap that is the result of a logical OR of the bits in the instance bitmap and the argument bitmap.
- Since the model is of infinite length bitmaps, there is no problem ORing bitmaps of different apparent length.  Since bits beyond the apparent range are not set, the final bits of the 'longer' bitmap are copied to the new bitmap.

#### instance.xor()
- Returns a new bitmap that is the result of a logical XOR of the bits in the instance bitmap and the argument bitmap.
- XORing a bitmap against one in which a range of bits are all set would result in a NOT operation over that range.
- Since the model is of infinite length bitmaps, there is no problem ORing bitmaps of different apparent length.  Since bits beyond the apparent range are not set, the final bits of the 'longer' bitmap are copied to the new bitmap.

#### instance.isEmpty()
- Returns true if there are no set bits in the bitmap.

#### instance.population()
- Returns the number of set bits in the bitmap.
- Alias: count()

#### instance.count()
- Returns the number of set bits in the bitmap.
- Alias: population()

#### Bitmap.chunksize
- Internally, the bitmap is stored in a Buffer.  An empty bitmap will start with a buffer of `chunksize` bytes.
- If the buffer needs to grow, an additional `chunksize` bytes will be allocated to allow for expansion.
- If a bitmap is constructed from a hex string, the Buffer will start out just long enough to accomodate the bits contained in the hex string.  Should bits be set at the end, `chunksize` additonal bytes will be added beyond the bit to allow for expansion.

## Todo
- Explore using Uint32array or Uint16array representations instead of Buffers.  Are 32 bit logical operations possible in Javascript?  Does the larger word size speed up logic operations?  Is the speed gained worth the extra effort?  Right now, the Buffer-based implementation is good enough.
- Explore sparse storage strategies.  Can a more relistic infinite bit space model be developed without making the class overly heavyweight?
- Implement NOT and range-setting methods.  On the surface, not rocket science, but NOT against an infinite or sparse bit set would be troublesome.  It is not needed for my immediate application, and it can be more safely achieved by XORing against a mask.
- One function to set or unset a given bit.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
0.1.0 - New project

## License
Copyright (c) 2013 Randy McLaughlin
Licensed under the MIT license.
