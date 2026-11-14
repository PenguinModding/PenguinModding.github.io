(function (Scratch) {
    'use strict';

    /*
     * Word Filterer
     * Created by Joshuaknowsmaths
     *
     * A text filtering extension with support for:
     * - Profanity and offensive language
     * - Demographic and identity-based slurs
     * - Common spelling variations
     * - Leetspeak and punctuation bypasses
     * - Independently configurable categories
     */

    const DEFAULT_TEXT = 'foo:bar:foo:bar';

    const WORDS = {
        profanity: [
            'fuck', 'shit', 'cunt', 'asshole', 'arsehole',
            'dick', 'cock', 'piss', 'whore', 'slut',
            'douchebag', 'jackass', 'dipshit', 'shithead',
            'fuckwit', 'fuckface', 'shitface', 'bitch',
            'bitchery', 'bitchass', 'sonofabitch',
            'motherfucker', 'motherfuck', 'bullshit',
            'horseshit', 'batshit', 'dumbass', 'smartass',
            'asshat', 'dickhead', 'dickwad', 'cockhead',
            'cocksucker', 'coomer', 'gooner', 'incel'
        ],

        racial: [
            'nigger', 'nigga', 'nigg', 'niggery',
            'niggity', 'chink', 'gook', 'spic',
            'kike', 'wetback', 'coon', 'raghead',
            'beaner', 'cracker'
        ],

        religious: [],

        sexuality: [
            'faggot', 'fag', 'faggoty',
            'dyke', 'tranny', 'trannies', 'homo'
        ],

        disability: [
            'retard', 'mong', 'spastic'
        ],

        gender: [
            'misogynist', 'misogyny'
        ],

        demographic: [
            'xenophobe', 'xenophobia',
            'homophobe', 'homophobia',
            'transphobe', 'transphobia',
            'racist', 'racism'
        ],

        extremism: [
            'nazi', 'nazism', 'neo-nazi',
            'fascist', 'fascism',
            'white supremacist', 'white supremacy',
            'skinhead', 'aryan supremacist',
            'heil hitler'
        ]
    };

    // Additional variants that cannot reliably be generated.
    const EXTRA_VARIANTS = {
        fuck: [
            'fucker', 'fuckers', 'fuckup',
            'fuckups', 'fuckface', 'fuckwit'
        ],

        shit: [
            'shite', 'shites', 'shitter',
            'shitters', 'shitty', 'shitshow'
        ],

        bitch: [
            'bitches', 'bitchy', 'bitching',
            'bitched', 'bitchery', 'bitcher',
            'bitchers', 'bitchiest', 'bitcheries'
        ],

        nigger: ['niggers', 'niggery'],
        nigga: ['niggas', 'niggery'],
        nigg: ['niggs', 'niggity'],

        fag: ['fags', 'faggoty'],
        faggot: ['faggots', 'faggoty'],

        tranny: ['trannies'],
        trannie: ['trannies'],

        coomer: ['coomers'],
        gooner: ['gooners'],

        whore: ['whores', 'whoring'],
        slut: ['sluts', 'slutty', 'sluttier', 'sluttiest'],
        cunt: ['cunts', 'cunty'],

        retard: ['retards', 'retarded', 'retarding'],

        nazi: ['nazis'],
        fascist: ['fascists']
    };

    const CATEGORY_NAMES = Object.keys(WORDS);

    const CHARACTER_REPLACEMENTS = {
        '1': 'i',
        '!': 'i',
        '|': 'i',
        '0': 'o',
        '3': 'e',
        '4': 'a',
        '@': 'a',
        '5': 's',
        '$': 's',
        '7': 't',
        '+': 't',
        '8': 'b',
        '9': 'g'
    };

    const LOOKALIKE_CHARACTERS = {
        'а': 'a',
        'е': 'e',
        'і': 'i',
        'о': 'o',
        'р': 'p',
        'с': 'c',
        'х': 'x',
        'у': 'y',
        'к': 'k',
        'м': 'm',
        'т': 't',
        'в': 'b',
        'н': 'h'
    };

    // Generate common variations of a word.
    function generateVariants(word) {
        const variants = new Set([
            word,
            ...(EXTRA_VARIANTS[word] || [])
        ]);

        // Plurals and spelling changes.
        if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
            variants.add(word.slice(0, -1) + 'ies');
            variants.add(word.slice(0, -1) + 'ier');
            variants.add(word.slice(0, -1) + 'iest');
        } else {
            variants.add(word + 's');
            variants.add(word + 'es');
        }

        // Common endings.
        const suffixes = [
            'ed', 'ing', 'y', 'ie',
            'ish', 'er', 'ers', 'ery'
        ];

        for (const suffix of suffixes) {
            variants.add(word + suffix);
        }

        // Words ending in E.
        if (word.endsWith('e')) {
            variants.add(word.slice(0, -1) + 'ed');
            variants.add(word.slice(0, -1) + 'ing');
        }

        // Doubled consonants.
        if (/[b-df-hj-np-tv-z]$/.test(word)) {
            const lastCharacter = word.slice(-1);

            variants.add(word + lastCharacter + 'ed');
            variants.add(word + lastCharacter + 'ing');
        }

        // Generate second-generation plural forms.
        const firstGeneration = [...variants];

        for (const variant of firstGeneration) {
            if (
                variant.endsWith('ing') ||
                variant.endsWith('er')
            ) {
                variants.add(variant + 's');
            }

            if (variant.endsWith('y') && !/[aeiou]y$/.test(variant)) {
                variants.add(variant.slice(0, -1) + 'ies');
            }

            if (variant.endsWith('ery')) {
                variants.add(variant + 's');
            }
        }

        return [...variants];
    }

    // Prepare the dictionaries once when the extension loads.
    const FILTER_WORDS = Object.fromEntries(
        CATEGORY_NAMES.map(category => [
            category,
            [...new Set(
                WORDS[category].flatMap(generateVariants)
            )].sort((a, b) => b.length - a.length)
        ])
    );

    // Convert individual characters into their normalised forms.
    function normaliseCharacter(character) {
        const lowerCharacter = character.toLowerCase();

        if (CHARACTER_REPLACEMENTS[lowerCharacter]) {
            return CHARACTER_REPLACEMENTS[lowerCharacter];
        }

        if (LOOKALIKE_CHARACTERS[lowerCharacter]) {
            return LOOKALIKE_CHARACTERS[lowerCharacter];
        }

        return lowerCharacter.normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    // Normalise text while remembering the original character positions.
    function normaliseText(text) {
        const original = String(text);
        let normalised = '';
        const positions = [];

        for (let index = 0; index < original.length; index++) {
            const character = original[index];

            if (/\s/.test(character)) {
                normalised += ' ';
                positions.push(index);
                continue;
            }

            for (const converted of normaliseCharacter(character)) {
                if (/[a-z]/.test(converted)) {
                    normalised += converted;
                    positions.push(index);
                }
            }
        }

        return {
            original,
            normalised,
            positions
        };
    }

    // Find filtered words in a piece of text.
    function findFilteredWords(text, enabledCategories) {
        const data = normaliseText(text);
        const matches = [];

        for (const category of CATEGORY_NAMES) {
            if (!enabledCategories[category]) {
                continue;
            }

            for (const word of FILTER_WORDS[category]) {
                let position = 0;

                while (
                    (position = data.normalised.indexOf(word, position)) !== -1
                ) {
                    const previous = data.normalised[position - 1];
                    const next = data.normalised[position + word.length];

                    const validStart =
                        !previous || !/[a-z]/.test(previous);

                    const validEnd =
                        !next || !/[a-z]/.test(next);

                    if (validStart && validEnd) {
                        matches.push({
                            start: data.positions[position],
                            end: data.positions[position + word.length - 1] + 1,
                            category
                        });
                    }

                    position++;
                }
            }
        }

        // Sort matches and combine overlapping results.
        matches.sort((a, b) => a.start - b.start);

        const combined = [];

        for (const match of matches) {
            const previous = combined[combined.length - 1];

            if (previous && match.start < previous.end) {
                previous.end = Math.max(previous.end, match.end);
            } else {
                combined.push({ ...match });
            }
        }

        return combined;
    }

    class WordFilterer {
        constructor() {
            this.enabledCategories = Object.fromEntries(
                CATEGORY_NAMES.map(category => [category, true])
            );
        }

        getInfo() {
            return {
                id: 'wordFilterer',
                name: 'Word Filterer',

                color1: '#9c0000',
                color2: '#700000',
                color3: '#500000',

                blocks: [
                    {
                        opcode: 'filterText',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'filter swear words in [TEXT]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: DEFAULT_TEXT
                            }
                        }
                    },

                    {
                        opcode: 'containsFilteredWords',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'does [TEXT] contain filtered words?',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: DEFAULT_TEXT
                            }
                        }
                    },

                    {
                        opcode: 'countFilteredWords',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'number of filtered words in [TEXT]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: DEFAULT_TEXT
                            }
                        }
                    },

                    {
                        opcode: 'removeFilteredWords',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'remove filtered words from [TEXT]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: DEFAULT_TEXT
                            }
                        }
                    },

                    {
                        opcode: 'setCategory',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set category [CATEGORY] enabled [ENABLED]',
                        arguments: {
                            CATEGORY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'categories'
                            },
                            ENABLED: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'enabled'
                            }
                        }
                    },

                    {
                        opcode: 'isCategoryEnabled',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is category [CATEGORY] enabled?',
                        arguments: {
                            CATEGORY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'categories'
                            }
                        }
                    },

                    {
                        opcode: 'countCategoryWords',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'number of filtered words in [TEXT] category [CATEGORY]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: DEFAULT_TEXT
                            },
                            CATEGORY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'categories'
                            }
                        }
                    }
                ],

                menus: {
                    categories: {
                        acceptReporters: true,
                        items: CATEGORY_NAMES
                    },

                    enabled: {
                        acceptReporters: true,
                        items: ['true', 'false']
                    }
                }
            };
        }

        filterText(args) {
            const text = String(args.TEXT);
            let result = text;

            const matches = findFilteredWords(
                text,
                this.enabledCategories
            );

            for (const match of matches.reverse()) {
                result =
                    result.slice(0, match.start) +
                    '*'.repeat(match.end - match.start) +
                    result.slice(match.end);
            }

            return result;
        }

        containsFilteredWords(args) {
            return findFilteredWords(
                args.TEXT,
                this.enabledCategories
            ).length > 0;
        }

        countFilteredWords(args) {
            return findFilteredWords(
                args.TEXT,
                this.enabledCategories
            ).length;
        }

        removeFilteredWords(args) {
            const text = String(args.TEXT);
            let result = text;

            const matches = findFilteredWords(
                text,
                this.enabledCategories
            );

            for (const match of matches.reverse()) {
                result =
                    result.slice(0, match.start) +
                    result.slice(match.end);
            }

            return result.replace(/\s{2,}/g, ' ').trim();
        }

        setCategory(args) {
            const category = String(args.CATEGORY).toLowerCase();

            if (category in this.enabledCategories) {
                this.enabledCategories[category] =
                    String(args.ENABLED).toLowerCase() === 'true';
            }
        }

        isCategoryEnabled(args) {
            const category = String(args.CATEGORY).toLowerCase();

            return this.enabledCategories[category] === true;
        }

        countCategoryWords(args) {
            const category = String(args.CATEGORY).toLowerCase();

            if (!(category in WORDS)) {
                return 0;
            }

            const selectedCategories = Object.fromEntries(
                CATEGORY_NAMES.map(name => [
                    name,
                    name === category && this.enabledCategories[name]
                ])
            );

            return findFilteredWords(
                args.TEXT,
                selectedCategories
            ).length;
        }
    }

    Scratch.extensions.register(new WordFilterer());

})(Scratch);
