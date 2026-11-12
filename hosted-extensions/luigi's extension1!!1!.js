(function (Scratch) {
  'use strict';

  class LuigisExtension1 {
    getInfo() {
      return {
        id: 'luigisExtension1',
        name: "Luigi's Extension1!!1!",
        blocks: []
      };
    }
  }

  console.log('i am angry');
  Scratch.extensions.register(new LuigisExtension1());
})(Scratch);
