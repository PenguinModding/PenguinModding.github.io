(function (Scratch) {
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This extension must be run unsandboxed');
  }

  'use strict';

  let textures = Object.create(null);

  const vm = Scratch.vm;

  function loadExtension(id) {
    if (!vm.extensionManager.isExtensionLoaded(id)) {
      vm.extensionManager.loadExtensionIdSync(id);
    }
  }

  loadExtension('jwArray');
  loadExtension('jwVector');
  loadExtension('jwTargets');

  function createElement(tag, styles = {}) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    return el;
  }

  function rgbaToHex(r, g, b, a) {
    return (
      "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0") +
      a.toString(16).padStart(2, "0")
    );
  }

  class Image {
    constructor(matrix, width, height) {
      this.customId = 'dvImage';
      this.color = matrix;
      this.x = width;
      this.y = height;
    }

    toString() {
      return JSON.stringify(this.color);
    }

    toReporterContent() {
      const Container = createElement("div");
      const canvas = this.toCanvas();
      canvas.style.width = "60px";
      canvas.style.height = `${60 - (this.x - this.y)}px`;
      canvas.style.imageRendering = "pixelated";
      Container.appendChild(canvas);
      const Paragraph = document.createElement("p");
      const TextNode = document.createTextNode(`${this.x}x${this.y}`);
      Paragraph.appendChild(TextNode);
      Container.appendChild(Paragraph);
      Container.style.textAlign = "center";
      return Container;
    }

    toCanvas() {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = this.x;
      canvas.height = this.y;

      for (let y = 0; y < this.y; y++) {
        for (let x = 0; x < this.x; x++) {
          const pixel = this.color[y][x];
          if (!pixel || pixel === "#00000000") continue;
          ctx.fillStyle = pixel;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      return canvas;
    }

    jwArrayHandler() {
      const size = 10;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = this.x;
      canvas.height = this.y;
      for (let y = 0; y < this.y; y++) {
        for (let x = 0; x < this.x; x++) {
          const pixel = this.color[y][x];
          if (!pixel || pixel === "#00000000") continue;
          const r = parseInt(pixel.slice(1, 3), 16);
          const g = parseInt(pixel.slice(3, 5), 16);
          const b = parseInt(pixel.slice(5, 7), 16);
          const a = parseInt(pixel.slice(7, 9), 16) / 255;
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      const imgURL = canvas.toDataURL();
      const container = document.createElement("div");
      container.style.display = "inline-flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.border = "1px solid #ccc";
      container.style.padding = "2px";
      container.style.background = "#fff";
      const img = document.createElement("img");
      img.src = imgURL;
      img.style.width = size + "px";
      img.style.height = size + "px";
      img.style.imageRendering = "pixelated";
      container.appendChild(img);
      return container.outerHTML;
    }
    static toImage(img) {
      if (img instanceof Image) return img
      return new Image([], 1, 1)
    }
  }
  const Template = {
    Block: {
      blockType: Scratch.BlockType.REPORTER,
      blockShape: Scratch.BlockShape.SCRAPPED,
      forceOutputType: 'dvImage',
      disableMonitor: true,
    },
    Argument: {
      shape: Scratch.BlockShape.SCRAPPED,
      check: ['dvImage'],
      exemptFromNormalization: true
    },
    Pause: "---",
    Type: Image
  }

  class ImagesExtension {
    constructor() {
      this.Type = Image;
      vm.runtime.registerSerializer('dvImage', (Image) => {
        return JSON.stringify(Image.color);
      }, (String) => {
        const Matrix = JSON.parse(String);
        return new Image(Matrix, Matrix[0].length, Matrix.length);
      });
    }
    getInfo() {
      return {
        id: 'dvImages',
        name: 'Images',
        menuIconURI: 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCwwLDIwLDIwIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMjMwLC0xNzApIj48ZyBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiPjxwYXRoIGQ9Ik0yMzEsMTgwYzAsLTQuOTcwNTYgNC4wMjk0NCwtOSA5LC05YzQuOTcwNTYsMCA5LDQuMDI5NDQgOSw5YzAsNC45NzA1NiAtNC4wMjk0NCw5IC05LDljLTQuOTcwNTYsMCAtOSwtNC4wMjk0NCAtOSwtOXoiIGZpbGw9IiNjZDA3ZjUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjYmIwMGQ0IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMjM5LjE2NjY3LDE3Ny41NDMxbDEuNjUxMTQsMi43NjI2OWwwLjgzNDUsLTEuMjY4NDNsMS4wMTg3NSwxLjU0ODVjMC4wODI4MSwtMC4xMzIzOSAwLjEzMDY4LC0wLjI4ODg3IDAuMTMwNjgsLTAuNDU2NTR2LTEuNzM2ODdjLTAuMDg5ODYsMC4wMDg0MyAtMC4xODA5MiwwLjAxMjczIC0wLjI3Mjk5LDAuMDEyNzNjLTEuNTIyNDcsMCAtMi43Njk3NywtMS4xNzgxMSAtMi44ODAwMSwtMi42NzI0MWgtMS41ODgzOGMtMC40NzYxMSwwIC0wLjg2MjA3LDAuMzg1OTYgLTAuODYyMDcsMC44NjIwN3YzLjM1Mjc4ek0yMzcuMTU1MTcsMTg1Yy0wLjQ3NjExLDAgLTAuODYyMDcsLTAuMzg1OTYgLTAuODYyMDcsLTAuODYyMDd2LTguMjc1ODZjMCwtMC40NzYxMSAwLjM4NTk2LC0wLjg2MjA3IDAuODYyMDcsLTAuODYyMDdoNS42ODk2NmMwLjQ3NjExLDAgMC44NjIwNywwLjM4NTk2IDAuODYyMDcsMC44NjIwN3Y4LjI3NTg2YzAsMC40NzYxMSAtMC4zODU5NiwwLjg2MjA3IC0wLjg2MjA3LDAuODYyMDd6IiBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIi8+PC9nPjwvZz48L3N2Zz4=',
        color1: '#cd07f5',
        customTypes: ['dvImage'],
        blocks: [
          {
            opcode: 'github',
            text: 'Open GitHub Repository',
            blockType: Scratch.BlockType.BUTTON
          },
          {
            opcode: 'blankImage',
            text: 'blank [X]x[Y] image',
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }
            },
            ...Template.Block
          },
          {
            opcode: 'openCanvas',
            text: 'open canvas',
            ...Template.Block
          },
          Template.Pause,
          {
            opcode: 'widthOf',
            text: 'width of [IMAGE]',
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              IMAGE: Template.Argument
            }
          },
          {
            opcode: 'heightOf',
            text: 'height of [IMAGE]',
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              IMAGE: Template.Argument
            }
          },
          Template.Pause,
          {
            opcode: 'dataurl',
            text: "data url of[IMAGE]",
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              IMAGE: Template.Argument
            }
          },
          {
            opcode: 'fromdataurl',
            text: "from data url [URL]",
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://penguinmod.com/navicon.png'
              }
            },
            ...Template.Block
          },
          Template.Pause,
          {
            opcode: 'settextureof',
            text: 'set texture of [TARGET] to [IMAGE]',
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              TARGET: {
                shape: Scratch.BlockShape.OCTAGONAL,
                check: ["Target"],
                exemptFromNormalization: true
              },
              IMAGE: Template.Argument
            }
          },
          {
            opcode: 'textureof',
            text: 'get texture of [TARGET]',
            arguments: {
              TARGET: {
                shape: Scratch.BlockShape.OCTAGONAL,
                check: ["Target"],
                exemptFromNormalization: true
              }
            },
            ...Template.Block
          },
          {
            opcode: 'removetextureof',
            text: 'remove texture of [TARGET]',
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              TARGET: {
                shape: Scratch.BlockShape.OCTAGONAL,
                check: ["Target"],
                exemptFromNormalization: true
              }
            }
          },
          {
            opcode: 'isusingtexture',
            text: 'is[TARGET]using a texture',
            blockType: Scratch.BlockType.BOOLEAN,
            arguments: {
              TARGET: {
                shape: Scratch.BlockShape.OCTAGONAL,
                check: ["Target"],
                exemptFromNormalization: true
              }
            }
          },
          {
            opcode: 'costumesof',
            text: 'costumes of[TARGET]',
            blockType: Scratch.BlockType.REPORTER,
            blockShape: Scratch.BlockShape.SQUARE,
            forceOutputType: 'Array',
            disableMonitor: true,
            arguments: {
              TARGET: {
                shape: Scratch.BlockShape.OCTAGONAL,
                check: ["Target"],
                exemptFromNormalization: true
              }
            }
          },
          {
            opcode: 'imgof',
            text: 'get image of [COSTUME]',
            arguments: {
              COSTUME: {
                type: Scratch.ArgumentType.COSTUME
              }
            },
            ...Template.Block
          },
          Template.Pause,
          {
            opcode: 'getColorOfPixel',
            text: 'get color of pixel [VECTOR] of [IMAGE]',
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              VECTOR: {
                shape: Scratch.BlockShape.LEAF,
                check: ["Vector"],
                exemptFromNormalization: true
              },
              IMAGE: Template.Argument
            }
          },
          {
            opcode: 'setColorOfPixel',
            text: 'set color of pixel [VECTOR] of [IMAGE] to [COLOR]',
            arguments: {
              VECTOR: {
                shape: Scratch.BlockShape.LEAF,
                check: ["Vector"],
                exemptFromNormalization: true
              },
              IMAGE: Template.Argument,
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ff0000"
              }
            },
            ...Template.Block
          },
          {
            opcode: 'averagepixelcolor',
            text: 'get average pixel of [IMAGE]',
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              IMAGE: Template.Argument
            },
          },
          {
            opcode: 'pixels',
            text: 'pixels of [IMAGE]',
            blockType: Scratch.BlockType.REPORTER,
            blockShape: Scratch.BlockShape.SQUARE,
            disableMonitor: true,
            forceOutputType: 'Array',
            arguments: {
              IMAGE: Template.Argument
            }
          },
          {
            opcode: 'frompixels',
            text: 'from pixels[PIXELS]',
            arguments: {
              PIXELS: {
                shape: Scratch.BlockShape.SQUARE,
                check: ["Array"],
                exemptFromNormalization: true
              }
            },
            ...Template.Block
          },
          Template.Pause,
          {
            opcode: 'invert',
            text: 'invert[IMAGE]',
            arguments: {
              IMAGE: Template.Argument
            },
            ...Template.Block
          },
          {
            opcode: 'brighten',
            text: 'brighten[IMAGE]by[OFFSET]',
            arguments: {
              IMAGE: Template.Argument,
              OFFSET: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            },
            ...Template.Block
          },
          {
            opcode: 'rotate',
            text: 'rotate[IMAGE]by[ANGLE]',
            arguments: {
              IMAGE: Template.Argument,
              ANGLE: {
                type: Scratch.ArgumentType.ANGLE,
                defaultValue: 90
              }
            },
            ...Template.Block
          },
          {
            opcode: 'scale',
            text: 'scale[IMAGE]by[VECTOR]',
            arguments: {
              IMAGE: Template.Argument,
              VECTOR: {
                shape: Scratch.BlockShape.LEAF,
                check: ['Vector'],
                exemptFromNormalization: true
              }
            },
            ...Template.Block
          },
          {
            opcode: 'transparency',
            text: 'change transparency of [IMAGE]by[OFFSET]',
            arguments: {
              IMAGE: Template.Argument,
              OFFSET: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            },
            ...Template.Block
          },
          {
            opcode: 'tint',
            text: 'tint[IMAGE]color[COLOR]',
            arguments: {
              IMAGE: Template.Argument,
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: '#ff0000ff'
              }
            },
            ...Template.Block
          },
          {
            opcode: 'crop',
            text: 'crop[IMAGE]at[V1][V2]',
            arguments: {
              IMAGE: Template.Argument,
              V1: {
                shape: Scratch.BlockShape.LEAF,
                check: ['Vector'],
                exemptFromNormalization: true
              },
              V2: {
                shape: Scratch.BlockShape.LEAF,
                check: ['Vector'],
                exemptFromNormalization: true
              }
            },
            ...Template.Block
          },
          {
            opcode: 'horizontalyflip',
            text: 'horizontally flip[IMAGE]',
            arguments: {
              IMAGE: Template.Argument
            },
            ...Template.Block
          },
          {
            opcode: 'verticalflip',
            text: 'vertically flip[IMAGE]',
            arguments: {
              IMAGE: Template.Argument
            },
            ...Template.Block
          },
          Template.Pause,
          {
            opcode: 'rgbmix',
            text: '[A]rgb[MENU]mix[B]',
            arguments: {
              A: Template.Argument,
              B: Template.Argument,
              MENU: {
                type: Scratch.ArgumentType.STRING,
                menu: 'BlendTypes'
              }
            },
            ...Template.Block
          },
          {
            opcode: 'hsvmix',
            text: '[A]hsv[MENU]mix[B]',
            arguments: {
              A: Template.Argument,
              B: Template.Argument,
              MENU: {
                type: Scratch.ArgumentType.STRING,
                menu: 'BlendTypes'
              }
            },
            ...Template.Block
          },
          Template.Pause,
          {
            opcode: 'lineargradient',
            text: 'linear gradient that goes from[A]to[B]',
            arguments: {
              A: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: '#ff0000'
              },
              B: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: '#0000ff'
              }
            },
            ...Template.Block
          },
          {
            opcode: 'circlegradient',
            text: 'circular gradient that goes from[A]to[B]with radius[R]',
            arguments: {
              A: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: '#ff0000'
              },
              B: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: '#0000ff'
              },
              R: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50
              }
            },
            ...Template.Block
          }
        ],
        menus: {
          BlendTypes: {
            acceptReporters: false,
            items: [
              {
                text: 'add',
                value: 'add'
              },
              {
                text: 'subtract',
                value: 'sub'
              },
              {
                text: 'average',
                value: 'avg'
              },
              {
                text: 'multiply',
                value: 'mul'
              },
              {
                text: 'divide',
                value: 'div'
              },
              {
                text: 'add alpha',
                value: 'addA'
              },
              {
                text: 'subtract alpha',
                value: 'subA'
              },
              {
                text: 'multiply alpha',
                value: 'mulA'
              },
              {
                text: 'divide alpha',
                value: 'divA'
              },
              {
                text: 'alpha composite',
                value: 'alpha'
              }
            ]
          }
        }
      };
    }

    blankImage({ X, Y }) {
      const width = Math.max(1, Math.floor(X));
      const height = Math.max(1, Math.floor(Y));
      const matrix = Array.from({ length: height }, () =>
        new Array(width).fill("#00000000")
      );
      return new Image(matrix, width, height);
    }

    widthOf({ IMAGE }) {
      return Image.toImage(IMAGE).x
    }

    heightOf({ IMAGE }) {
      return Image.toImage(IMAGE).y
    }

    async openCanvas() {
      return new Promise(resolve => {
        const overlay = createElement("div", {
          position: "fixed",
          inset: "0",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        });
        const container = createElement("div", {
          background: "#fff",
          padding: "10px",
          borderRadius: "6px",
          fontFamily: "sans-serif"
        });
        overlay.appendChild(container);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 32;
        canvas.height = 32;
        Object.assign(canvas.style, {
          width: "256px",
          height: "256px",
          border: "2px solid black",
          imageRendering: "pixelated"
        });
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = "#577bfb";
        const widthInput = document.createElement("input");
        widthInput.type = "number";
        widthInput.value = 32;
        widthInput.min = 1;
        widthInput.max = 256;
        const heightInput = document.createElement("input");
        heightInput.type = "number";
        heightInput.value = 32;
        heightInput.min = 1;
        heightInput.max = 256;
        widthInput.oninput = () => canvas.width = Math.floor(widthInput.value);
        heightInput.oninput = () => canvas.height = Math.floor(heightInput.value);
        let drawing = false;
        let erase = false;
        canvas.addEventListener("contextmenu", e => e.preventDefault());
        function paint(e) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = Math.floor((e.clientX - rect.left) * scaleX);
          const y = Math.floor((e.clientY - rect.top) * scaleY);
          if (erase) {
            ctx.clearRect(x, y, 1, 1);
          } else {
            ctx.fillStyle = colorInput.value;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        canvas.addEventListener("mousedown", e => {
          drawing = true;
          erase = (e.button === 2);
          paint(e);
        });
        canvas.addEventListener("mousemove", e => {
          if (drawing) paint(e);
        });
        window.addEventListener("mouseup", () => drawing = false);
        const ok = document.createElement("button");
        ok.textContent = "OK";
        container.append(
          canvas,
          document.createElement("br"),
          colorInput,
          document.createTextNode(" Width "),
          widthInput,
          document.createTextNode(" Height "),
          heightInput,
          document.createElement("br"),
          document.createTextNode("Left click = draw | Right click = erase"),
          document.createElement("br"),
          ok
        );
        document.body.appendChild(overlay);
        ok.onclick = () => {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const matrix = [];
          for (let y = 0; y < canvas.height; y++) {
            const row = [];
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              row.push(rgbaToHex(data[i], data[i+1], data[i+2], data[i+3]));
            }
            matrix.push(row);
          }
          document.body.removeChild(overlay);
          resolve(new Image(matrix, canvas.width, canvas.height));
        };
      });
    }
    dataurl({ IMAGE }) {
      try {
        return Image.toImage(IMAGE).toCanvas().toDataURL();
      } catch(e) {
        return ''
      }
    }
    settextureof({ IMAGE, TARGET }) {
      const Img = Image.toImage(IMAGE)
      const Target = vm.jwTargets.Type.toTarget(TARGET).target;
      const Renderer = vm.renderer;
      const skinId = Renderer.createBitmapSkin(Img.toCanvas());
      Renderer.updateDrawableProperties(Target.drawableID, {skinId: skinId});
      textures[Target] = Img
    }
    async imgof({ COSTUME }, util) {
      const Target = util.target;
      let Index;
      if (COSTUME === 'next costume') {
        Index = (Target.currentCostume + 1) % Target.sprite.costumes.length;
      } else if (COSTUME === 'previous costume') {
        Index = (Target.currentCostume - 1 + Target.sprite.costumes.length) % Target.sprite.costumes.length;
      } else if (COSTUME === 'random costume') {
        Index = Math.floor(Math.random() * Target.sprite.costumes.length);
      } else if (typeof COSTUME == 'number') {
        Index = (COSTUME - 1) % Target.sprite.costumes.length;
      } else {
        Index = Target.getCostumeIndexByName(COSTUME);
        if (Index < 0) return Image.toImage()
      }
      const Costume = Target.sprite.costumes[Index];
      const Img =  document.createElement('img');
      Img.src = Costume.asset.encodeDataURI();
      await new Promise(resolve => Img.onload = resolve);
      const Canvas = document.createElement('canvas');
      const Context = Canvas.getContext('2d');
      Canvas.width = Img.width;
      Canvas.height = Img.height;
      Context.drawImage(Img, 0, 0);
      const ImageData = Context.getImageData(0, 0, Canvas.width, Canvas.height).data;
      const Matrix = [];
      for (let y = 0; y < Canvas.height; y++) {
        const Row = [];
        for (let x = 0; x < Canvas.width; x++) {
          const i = (y * Canvas.width + x) * 4;
          const r = ImageData[i].toString(16).padStart(2, '0');
          const g = ImageData[i + 1].toString(16).padStart(2, '0');
          const b = ImageData[i + 2].toString(16).padStart(2, '0');
          const a = ImageData[i + 3].toString(16).padStart(2, '0');
          Row.push(`#${r}${g}${b}${a}`)
        }
        Matrix.push(Row);
      }
      return new Image(Matrix, Img.width, Img.height);
    }

    async fromdataurl({ URL }) {
      try {
        const Img = document.createElement('img');
        Img.crossOrigin = "anonymous";
        Img.src = URL;
        await new Promise((resolve, reject) => {
          Img.onload = resolve;
          Img.onerror = reject;
        });
        const Canvas = document.createElement('canvas');
        const Context = Canvas.getContext('2d');
        Canvas.width = Img.width;
        Canvas.height = Img.height;
        Context.drawImage(Img, 0, 0);
        const ImageData = Context.getImageData(0, 0, Canvas.width, Canvas.height).data;
        const Matrix = [];
        for (let y = 0; y < Canvas.height; y++) {
          const Row = [];
          for (let x = 0; x < Canvas.width; x++) {
            const i = (y * Canvas.width + x) * 4;
            const r = ImageData[i].toString(16).padStart(2, '0');
            const g = ImageData[i + 1].toString(16).padStart(2, '0');
            const b = ImageData[i + 2].toString(16).padStart(2, '0');
            const a = ImageData[i + 3].toString(16).padStart(2, '0');
            Row.push(`#${r}${g}${b}${a}`)
          }
          Matrix.push(Row);
        }
        return new Image(Matrix, Canvas.width, Canvas.height);
      } catch(e) {
        return Image.toImage()
      }
    }

    getColorOfPixel({ IMAGE, VECTOR }) {
      const v = vm.jwVector.Type.toVector(VECTOR)
      const img = Image.toImage(IMAGE)
      if (v.x > img.x) return '#00000000'
      if (v.y > img.y) return '#00000000'
      const x = Math.max(1, Math.floor(v.x));
      const y = Math.max(1, Math.floor(v.y));
      const Matrix = img.color;
      return Matrix[y - 1][x - 1];
    }

    setColorOfPixel({ VECTOR, IMAGE, COLOR}) {
      const v = vm.jwVector.Type.toVector(VECTOR)
      const img = Image.toImage(IMAGE)
      if (v.x > img.x) return img;
      if (v.y > img.y) return img;
      const x = Math.max(1, Math.floor(v.x));
      const y = Math.max(1, Math.floor(v.y));
      const Matrix = img.color;
      Matrix[y - 1][x - 1] = COLOR + "ff";
      return new Image(Matrix, img.x,img.y);
    }

    textureof({ TARGET }) {
      const t = vm.jwTargets.Type.toTarget(TARGET).target;
      if (!this.isusingtexture({ TARGET })) return Image.toImage();
      return textures[t];
    }

    removetextureof({ TARGET }) {
      const Target = vm.jwTargets.Type.toTarget(TARGET).target;
      const Renderer = vm.renderer;
      Target.updateAllDrawableProperties();
      if (!! this.isusingtexture({TARGET: Target})) delete textures[Target]
    }

    invert({ IMAGE }) {
      const Img = Image.toImage(IMAGE)
      const Matrix = Img.color;
      let Return = [];
      Matrix.forEach(row => {
        let newRow = [];
        row.forEach(cell => {
          if (!cell || cell.length < 9) {
            newRow.push("#00000000");
            return;
          }
          const r = 255 - parseInt(cell.slice(1, 3), 16);
          const g = 255 - parseInt(cell.slice(3, 5), 16);
          const b = 255 - parseInt(cell.slice(5, 7), 16);
          const a = cell.slice(7, 9);
          newRow.push(
            `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}${a}`
          );
        });
        Return.push(newRow);
      });
      return new Image(Return, Img.x, Img.y);
    }

    brighten({ IMAGE, OFFSET }) {
      const Offset = Math.abs(Math.floor(OFFSET))
      const Img = Image.toImage(IMAGE)
      const Matrix = Img.color;
      let Return = [];
      Matrix.forEach(row => {
        let newRow = [];
        row.forEach(cell => {
          if (!cell || cell.length < 9) {
            newRow.push("#00000000");
            return;
          }
          const r = Math.min(parseInt(cell.slice(1, 3), 16) + Offset, 255);
          const g = Math.min(parseInt(cell.slice(3, 5), 16) + Offset, 255);
          const b = Math.min(parseInt(cell.slice(5, 7), 16) + Offset, 255);
          const a = cell.slice(7, 9);
          newRow.push(
            `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}${a}`
          );
        });
        Return.push(newRow);
      });
      return new Image(Return, Img.x, Img.y);
    }

    pixels({ IMAGE }) {
      return new vm.jwArray.Type(Image.toImage(IMAGE).color, false);
    }

    frompixels({ PIXELS }) {
      const a = vm.jwArray.Type.toArray(PIXELS).array;
      for (let index = 0; index < a.length; index++) {
        const element = a[index];
        a[index] = element.array;
      }
      return new Image(a, a[0]?.length || 0, a.length);
    }

    rotate({ IMAGE, ANGLE }) {
      const srcCanvas = Image.toImage(IMAGE).toCanvas();
      const angle = ANGLE * (Math.PI / 180);
      const sin = Math.abs(Math.sin(angle));
      const cos = Math.abs(Math.cos(angle));
      const newWidth = Math.ceil(srcCanvas.width * cos + srcCanvas.height * sin);
      const newHeight = Math.ceil(srcCanvas.width * sin + srcCanvas.height * cos);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(angle);
      ctx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);
      const data = ctx.getImageData(0, 0, newWidth, newHeight).data;
      const matrix = [];
      for (let y = 0; y < newHeight; y++) {
        const row = [];
        for (let x = 0; x < newWidth; x++) {
          const i = (y * newWidth + x) * 4;
          row.push(rgbaToHex(data[i], data[i+1], data[i+2], data[i+3]));
        }
        matrix.push(row);
      }
      return new Image(matrix, newWidth, newHeight);
    }

    scale({ IMAGE, VECTOR }) {
      const img = Image.toImage(IMAGE)
      const src = img.toCanvas()
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const vector = vm.jwVector.Type.toVector(VECTOR);
      vector.x = Math.max(1, vector.x);
      vector.y = Math.max(1, vector.y);
      canvas.width = vector.x * img.x;
      canvas.height = vector.y * img.y;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, vector.x * img.x, vector.y * img.y);
      const data = ctx.getImageData(0, 0, vector.x * img.x, vector.y * img.y).data;
      const matrix = [];
      for (let y = 0; y < vector.y * img.y; y++) {
        const row = [];
        for (let x = 0; x < vector.x * img.x; x++) {
          const i = (y * vector.x * img.x + x) * 4;
          row.push(rgbaToHex(data[i], data[i+1], data[i+2], data[i+3]));
        }
        matrix.push(row);
      }
      return new Image(matrix, canvas.width, canvas.height);
    }

    transparency({ IMAGE, OFFSET }) {
      const img = Image.toImage(IMAGE)
      const Matrix = img.color;
      let Return = [];
      Matrix.forEach(row => {
        let newRow = [];
        row.forEach(cell => {
          if (!cell || cell.length < 9) {
            newRow.push("#00000000");
            return;
          }
          const r = parseInt(cell.slice(1, 3), 16);
          const g = parseInt(cell.slice(3, 5), 16);
          const b = parseInt(cell.slice(5, 7), 16);
          const a = Math.max(0, Math.min(255, parseInt(cell.slice(7, 9), 16) - OFFSET));
          newRow.push(
            `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}${a.toString(16).padStart(2,"0")}`
          );
        });
        Return.push(newRow);
      });
      return new Image(Return, img.x, img.y);
    }

    tint({ IMAGE, COLOR }) {
      const srcCanvas = Image.toImage(IMAGE).toCanvas()
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = srcCanvas.width;
      canvas.height = srcCanvas.height;
      ctx.drawImage(srcCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const matrix = [];
      for (let y = 0; y < canvas.height; y++) {
       const row = [];
       for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          row.push(rgbaToHex(data[i], data[i+1], data[i+2], data[i+3]));
        }
        matrix.push(row);
      }
      return new Image(matrix, canvas.width, canvas.height);
    }

    isusingtexture({ TARGET }) {
      return !!(textures[vm.jwTargets.Type.toTarget(TARGET).target] || false)
    }
    
    crop({ IMAGE, V1, V2 }) {
      const image = Image.toImage(IMAGE).color;
      const v1 = vm.jwVector.Type.toVector(V1);
      const v2 = vm.jwVector.Type.toVector(V2);
      const x1 = Math.max(0, Math.floor(Math.min(v1.x, v2.x)) - 1);
      const y1 = Math.max(0, Math.floor(Math.min(v1.y, v2.y)) - 1);
      const x2 = Math.floor(Math.max(v1.x, v2.x)) - 1;
      const y2 = Math.floor(Math.max(v1.y, v2.y)) - 1;
      const result = [];
      for (let y = y1; y <= y2; y++) {
        const row = [];
        for (let x = x1; x <= x2; x++) {
          row.push(image[y]?.[x] ?? "#00000000");
        }
        result.push(row);
      }
      const newWidth = x2 - x1 + 1;
      const newHeight = y2 - y1 + 1;
      return new Image(result, newWidth, newHeight);
    }

    async costumesof({ TARGET }) {
      const target = vm.jwTargets.Type.toTarget(TARGET).target;
      const costumes = target.sprite.costumes;
      const images = [];
      for (const element of costumes) {
        images.push(await this.fromdataurl({URL: element.asset.encodeDataURI()}));
      }
      return new vm.jwArray.Type(images, false);
    }

    horizontalyflip({ IMAGE }) {
      const img = Image.toImage(IMAGE)
      const matrix = img.color;
      let retrun = [];
      matrix.forEach(element => {
        retrun.push(element.reverse());
      });
      return new Image(retrun, img.x, img.y);
    }

    verticalflip({ IMAGE }) {
      const img = Image.toImage(IMAGE)
      let matrix = img.color;
      matrix.color = matrix.reverse();
      return new Image(matrix, img.x, img.y);
    }


    rgbmix({A, B, MENU}) {
      A = Image.toImage(A);
      B = Image.toImage(B)
      const width = Math.min(A.x, B.x);
      const height = Math.min(A.y, B.y);
      function clamp(v) {
        return Math.max(0, Math.min(Math.round(v), 255));
      }
      function hexToRgb(hex) {
        hex = hex.replace("#", "");
        return {
          r: parseInt(hex.substring(0,2),16),
          g: parseInt(hex.substring(2,4),16),
          b: parseInt(hex.substring(4,6),16),
          a: parseInt(hex.substring(6,8) || "ff",16)
        };
      }
      function rgbToHex(r,g,b,a){
        return "#" +
          clamp(r).toString(16).padStart(2,"0") +
          clamp(g).toString(16).padStart(2,"0") +
          clamp(b).toString(16).padStart(2,"0") +
          clamp(a).toString(16).padStart(2,"0");
      }
      const conversiontypes = {
        add: (A,B)=>A+B,
        sub: (A,B)=>A-B,
        mul: (A,B)=>A*B/255,
        div: (A,B)=>B===0?0:(A/B)*255,
        avg: (A,B)=>(A+B)/2,
        addA: (A,B,aA,aB)=>A*(aA/255)+B*(aB/255),
        subA: (A,B,aA,aB)=>A*(aA/255)-B*(aB/255),
        mulA: (A,B,aA,aB)=>(A*B/255)*((aA+aB)/510),
        divA: (A,B,aA,aB)=>B===0?0:(A/B)*((aA+aB)/510)
      };
      function compositeSourceOver(aPixel,bPixel){
        const aA = aPixel.a/255;
        const bA = bPixel.a/255;
        const outA = aA + bA*(1-aA);
        if(outA===0){
          return {r:0,g:0,b:0,a:0};
        }
        const r = (aPixel.r*aA + bPixel.r*bA*(1-aA))/outA;
        const g = (aPixel.g*aA + bPixel.g*bA*(1-aA))/outA;
        const b = (aPixel.b*aA + bPixel.b*bA*(1-aA))/outA;
        return {
          r:clamp(r),
          g:clamp(g),
          b:clamp(b),
          a:clamp(outA*255)
        };
      }
      const result = [];
      for(let y=0;y<height;y++){
        const row=[];
        for(let x=0;x<width;x++){
          const aPixel = hexToRgb(A.color[y][x]);
          const bPixel = hexToRgb(B.color[y][x]);
          if(MENU==="alpha"){
            const out = compositeSourceOver(aPixel,bPixel);
            row.push(rgbToHex(out.r,out.g,out.b,out.a));
            continue;
         }
         const fn = conversiontypes[MENU];
          let r,g,b,a;
          if(MENU.endsWith("A")){
            r = fn(aPixel.r,bPixel.r,aPixel.a,bPixel.a);
            g = fn(aPixel.g,bPixel.g,aPixel.a,bPixel.a);
            b = fn(aPixel.b,bPixel.b,aPixel.a,bPixel.a);
            a = Math.max(aPixel.a,bPixel.a);
          }else{
            r = fn(aPixel.r,bPixel.r);
            g = fn(aPixel.g,bPixel.g);
            b = fn(aPixel.b,bPixel.b);
            a = fn(aPixel.a,bPixel.a);
          }
          row.push(rgbToHex(r,g,b,a));
        }
        result.push(row);
      }
      return new Image(result,width,height);
    }

    averagepixelcolor({ IMAGE }) {
      let rTotal = 0;
      let gTotal = 0;
      let bTotal = 0;
      let aTotal = 0;
      let count = 0;
      const matrix = Image.toImage(IMAGE).color;
      matrix.forEach(row => {
        row.forEach(cell => {
          if (!cell || cell.length < 9) return;
          const r = parseInt(cell.slice(1, 3), 16);
          const g = parseInt(cell.slice(3, 5), 16);
          const b = parseInt(cell.slice(5, 7), 16);
          const a = parseInt(cell.slice(7, 9), 16);
          rTotal += r;
          gTotal += g;
          bTotal += b;
          aTotal += a;
          count++;
        });
      });
      const r = Math.round(rTotal / count);
      const g = Math.round(gTotal / count);
      const b = Math.round(bTotal / count);
      const a = Math.round(aTotal / count);
      return "#" +
        r.toString(16).padStart(2,"0") +
        g.toString(16).padStart(2,"0") +
        b.toString(16).padStart(2,"0") +
        a.toString(16).padStart(2,"0");
    }

    hsvmix({ A, B, MENU }) {
      A = Image.toImage(A)
      B = Image.toImage(B)
      const width = Math.min(A.x, B.x);
      const height = Math.min(A.y, B.y);
      function clamp(v){
        return Math.max(0, Math.min(Math.round(v),255));
      }
      function hexToRgba(hex){
        hex = hex.replace("#","");
        return {
          r: parseInt(hex.slice(0,2),16),
          g: parseInt(hex.slice(2,4),16),
          b: parseInt(hex.slice(4,6),16),
          a: parseInt(hex.slice(6,8) || "ff",16)
        };
      }
      function rgbaToHex(r,g,b,a){
        return "#" +
          clamp(r).toString(16).padStart(2,"0") +
          clamp(g).toString(16).padStart(2,"0") +
          clamp(b).toString(16).padStart(2,"0") +
          clamp(a).toString(16).padStart(2,"0");
      }
      function rgbToHsv(r,g,b){
        r/=255; g/=255; b/=255;
        const max=Math.max(r,g,b);
        const min=Math.min(r,g,b);
        const d=max-min;
        let h=0;
        if(d!==0){
          switch(max){
            case r: h=((g-b)/d)%6; break;
            case g: h=(b-r)/d+2; break;
            case b: h=(r-g)/d+4; break;
          }
          h*=60;
          if(h<0) h+=360;
        }
        const s = max===0 ? 0 : d/max;
        const v = max;
        return {h,s,v};
      }
      function hsvToRgb(h,s,v){
        const c=v*s;
        const x=c*(1-Math.abs((h/60)%2-1));
        const m=v-c;
        let r=0,g=0,b=0;
        if(h<60){ r=c; g=x; }
        else if(h<120){ r=x; g=c; }
        else if(h<180){ g=c; b=x; }
        else if(h<240){ g=x; b=c; }
        else if(h<300){ r=x; b=c; }
        else { r=c; b=x; }
        return {
          r:(r+m)*255,
          g:(g+m)*255,
          b:(b+m)*255
        };
      }
      const blend = {
        add:(a,b)=>a+b,
        sub:(a,b)=>a-b,
        mul:(a,b)=>a*b,
        div:(a,b)=>b===0?0:a/b,
        avg:(a,b)=>(a+b)/2
      };
      const result=[];
      for(let y=0;y<height;y++){
        const row=[];
        for(let x=0;x<width;x++){
          const pA = hexToRgba(A.color[y][x]);
          const pB = hexToRgba(B.color[y][x]);
          const hsvA = rgbToHsv(pA.r,pA.g,pA.b);
          const hsvB = rgbToHsv(pB.r,pB.g,pB.b);
          const fn = blend[MENU] || blend.avg;
          const h = (fn(hsvA.h,hsvB.h)) % 360;
          const s = Math.max(0,Math.min(fn(hsvA.s,hsvB.s),1));
          const v = Math.max(0,Math.min(fn(hsvA.v,hsvB.v),1));
          const rgb = hsvToRgb(h,s,v);
          const a = fn(pA.a,pB.a);
          row.push(rgbaToHex(rgb.r,rgb.g,rgb.b,a));
        }
        result.push(row);
      }
      return new Image(result,width,height);
    }

    lineargradient({ A, B }) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const linear = ctx.createLinearGradient(0, 0, width, 0);
      linear.addColorStop(0, A);
      linear.addColorStop(1, B);
      ctx.fillStyle = linear;
      ctx.fillRect(0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height).data;
      const nestedHexArray = [];
      for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase();
          row.push(hex);
        }
        nestedHexArray.push(row);
      }
      return new Image(nestedHexArray, width, height);
    }

    circlegradient({A, B, R}) {
      const size = Math.max(1, Math.floor(R * 2));
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      const cx = size / 2;
      const cy = size / 2;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gradient.addColorStop(0, A);
      gradient.addColorStop(1, B);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const matrix = [];
      for (let y = 0; y < canvas.height; y++) {
        const row = [];
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];
          row.push(rgbaToHex(r, g, b, a));
        }
        matrix.push(row);
      }
      return new Image(matrix, canvas.width, canvas.height);
    }

    github() {
      window.open('https://github.com/DashDevmationsDash/Image-Penguinmodxtension/tree/main');
    }
  }

  Scratch.extensions.register(new ImagesExtension());

})(Scratch);