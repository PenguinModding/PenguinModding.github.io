(async function(Scratch) {
    
    let playing = false
    const thing = new SpeechRecognition();
    let thang = "" 
    thing.interimResults = true;
    thing.continuous = true;
    thing.lang = "en-us";
    
    thing.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
            thang = e.results[i][0].transcript;
            thang = thang.trim();
        };
    };
    thing.onend = () => {
        if (playing === true) {
            thing.start();
        }
    }
    
    
    class ext_ {
        getInfo() {
            return {
                "id": "dictation",
                "name": "Continuous Speech To Text",
                "color1": "#dd5050ff",
                "blocks": [{
                    "opcode": "itemsaid",
                    "text": "said item",
                    "blockType": Scratch.BlockType.REPORTER,
                    "arguments": {}
                }, {
                    "opcode": "reset",
                    "text": "reset said item to blank",
                    "blockType": Scratch.BlockType.COMMAND,
                    "arguments": {}
                }, {
                    "opcode": "stoprec",
                    "text": "stop speech to text",
                    "blockType": Scratch.BlockType.COMMAND,
                    "arguments": {}
                }, {
                    "opcode": "startrec",
                    "text": "start speech to text",
                    "blockType": Scratch.BlockType.COMMAND,
                    "arguments": {}
                }, {
                    "opcode": "isrecording",
                    "text": "is recording audio?",
                    "blockType": Scratch.BlockType.BOOLEAN,
                    "arguments": {}
                }]
            }
        }
        async itemsaid() {
            return thang
        }
        async reset() {
            thang = ""
        }
        async stoprec() {
            if (playing) {
                playing = false
                thing.stop()
            }
        }
        async startrec() {
            if (!playing) {
                playing = true
                thing.start()
            }
        }
        async isrecording() {
            return playing
        }
    }
    
    let ext = new ext_();  
    Scratch.extensions.register(ext);
})(Scratch);
