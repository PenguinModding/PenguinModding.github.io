(function (Scratch) {
    "use strict";

    /*
     * The ASCII extension
     * Creator: Joshuaknowsmaths
     */

    class UnicodeExtension {
        getInfo() {
            return {
                id: "unicode",
                name: "The ASCII extension",
                color1: "#5265C9",
                color2: "#4052AC",
                blocks: [
                    {
                        opcode: "characterToID",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "character [CHARACTER] to ASCIIfy",
                        arguments: {
                            CHARACTER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "a"
                            }
                        }
                    },
                    {
                        opcode: "idToCharacter",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "ASCIIfy [ID] to character",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 97
                            }
                        }
                    },
                    {
                        opcode: "characterAt",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "ASCII [INDEX] of [TEXT]",
                        arguments: {
                            INDEX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Hello"
                            }
                        }
                    },
                    {
                        opcode: "unicodeLength",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id length of [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Hello"
                            }
                        }
                    },
                    {
                        opcode: "asciiCheck",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "can [ID] be converted to ASCII?",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 97
                            }
                        }
                    }
                ]
            };
        }

        characterToID(args) {
            const chars = Array.from(String(args.CHARACTER));
            if (chars.length === 0) return -1;
            return chars[0].codePointAt(0);
        }

        idToCharacter(args) {
            const id = Number(args.ID);

            if (!Number.isInteger(id) ||
                id < 0 ||
                id > 0x10FFFF ||
                (id >= 0xD800 && id <= 0xDFFF)) {
                return "";
            }

            return String.fromCodePoint(id);
        }

        characterAt(args) {
            const chars = Array.from(String(args.TEXT));
            const index = Math.floor(Number(args.INDEX)) - 1;

            if (index < 0 || index >= chars.length) return "";
            return chars[index];
        }

        unicodeLength(args) {
            return Array.from(String(args.TEXT)).length;
        }

        asciiCheck(args) {
            const id = Number(args.ID);
            return Number.isInteger(id) && id >= 0 && id <= 127;
        }
    }

    Scratch.extensions.register(new UnicodeExtension());
})(Scratch);
