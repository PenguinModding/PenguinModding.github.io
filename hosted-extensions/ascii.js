/**!
 * @file ASCIIfy
 * @author Joshuaknowsmaths
 * @link https://github.com/PenguinModding/PenguinModding.github.io/blob/main/hosted-extensions/ascii.js
 * @copyright Licensed under LGPL-3.0
 */
(function (Scratch) {
    "use strict";

    class ASCIIfy {
        getInfo() {
            return {
                id: "asciify",
                name: "ASCIIfy",
                color1: "#5265C9",
                color2: "#4052AC",
                blocks: [
                    {
                        opcode: "characterToID",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "character [CHARACTER] to Unicode ID",
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
                        text: "Unicode ID [ID] to character",
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
                        text: "character [INDEX] of [TEXT]",
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
                        text: "Unicode length of [TEXT]",
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
                        text: "is [ID] a valid ASCII ID?",
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
            // Use the first Unicode character, including characters outside the basic plane.
            const character = Array.from(String(args.CHARACTER))[0];

            if (character === undefined) return -1;
            return character.codePointAt(0);
        }

        idToCharacter(args) {
            const id = Number(args.ID);

            // Reject invalid Unicode values and the reserved surrogate range.
            if (
                !Number.isInteger(id) ||
                id < 0 ||
                id > 0x10FFFF ||
                (id >= 0xD800 && id <= 0xDFFF)
            ) {
                return "";
            }

            return String.fromCodePoint(id);
        }

        characterAt(args) {
            const characters = Array.from(String(args.TEXT));
            const index = Math.floor(Number(args.INDEX)) - 1;

            if (index < 0 || index >= characters.length) return "";
            return characters[index];
        }

        unicodeLength(args) {
            return Array.from(String(args.TEXT)).length;
        }

        asciiCheck(args) {
            const id = Number(args.ID);
            return Number.isInteger(id) && id >= 0 && id <= 127;
        }
    }

    Scratch.extensions.register(new ASCIIfy());
})(Scratch);
