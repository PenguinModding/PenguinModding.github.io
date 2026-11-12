/*
 * Pathfinding
 * Creator: Joshuaknowsmaths
 */

(function (Scratch) {
    "use strict";

    class Pathfinding {
        constructor() {
            this.map = null;
            this.mapAppearance = null;
            this.playerAppearance = null;
            this.playerHitbox = null;

            this.mapX = 0;
            this.mapY = 0;
            this.mapScale = 100;
            this.playerScale = 100;

            this.cellSize = 4;
            this.path = [];
            this.found = false;
            this.status = "Not ready";
        }

        getInfo() {
            return {
                id: "pathcalculator",
                name: "Pathfinding",
                creator: "Joshuaknowsmaths",
                color1: "#4C97FF",
                color2: "#3373CC",
                color3: "#2456A6",

                blocks: [
                    {
                        opcode: "setMap",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set wall appearance [APPEARANCE] mask [MASK]",
                        arguments: {
                            APPEARANCE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "data:image/png;base64,"
                            },
                            MASK: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "data:image/png;base64,"
                            }
                        }
                    },
                    {
                        opcode: "setMapPosition",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set map position X: [X] Y: [Y] size [SIZE] %",
                        arguments: {
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },
                    {
                        opcode: "setPlayer",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set player appearance [APPEARANCE] hitbox [HITBOX]",
                        arguments: {
                            APPEARANCE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "data:image/png;base64,"
                            },
                            HITBOX: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "data:image/png;base64,"
                            }
                        }
                    },
                    {
                        opcode: "setPlayerSize",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set player hitbox size [SIZE] %",
                        arguments: {
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },
                    {
                        opcode: "setAccuracy",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set pathfinding accuracy [SIZE] pixels",
                        arguments: {
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 4
                            }
                        }
                    },
                    {
                        opcode: "findPath",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "find path from X: [SX] Y: [SY] to X: [GX] Y: [GY]",
                        arguments: {
                            SX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: -200
                            },
                            SY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            GX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 200
                            },
                            GY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },
                    {
                        opcode: "pathFound",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "path found?"
                    },
                    {
                        opcode: "pathLength",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "path length"
                    },
                    {
                        opcode: "pathX",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "path X at step [STEP]",
                        arguments: {
                            STEP: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: "pathY",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "path Y at step [STEP]",
                        arguments: {
                            STEP: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: "pathStatus",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "pathfinding status"
                    }
                ]
            };
        }

        loadImage(uri) {
            if (!String(uri).startsWith("data:image/")) {
                return Promise.reject(new Error("Invalid image"));
            }

            return new Promise((resolve, reject) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;

                        const ctx = canvas.getContext("2d", {
                            willReadFrequently: true
                        });

                        ctx.drawImage(img, 0, 0);

                        resolve({
                            width: canvas.width,
                            height: canvas.height,
                            pixels: ctx.getImageData(
                                0, 0, canvas.width, canvas.height
                            ).data
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () => reject(new Error("Couldn't load image"));
                img.src = uri;
            });
        }

        async setMap(args) {
            try {
                const appearance = await this.loadImage(args.APPEARANCE);
                const mask = await this.loadImage(args.MASK);

                this.mapAppearance = appearance;
                this.map = mask;

                this.path = [];
                this.found = false;
                this.status = "Map loaded";
            } catch (error) {
                this.map = null;
                this.status = "Map error: " + error.message;
            }
        }

        setMapPosition(args) {
            this.mapX = Number(args.X) || 0;
            this.mapY = Number(args.Y) || 0;
            this.mapScale = Math.max(1, Number(args.SIZE) || 100);
        }

        async setPlayer(args) {
            try {
                const appearance = await this.loadImage(args.APPEARANCE);
                const hitbox = await this.loadImage(args.HITBOX);

                this.playerAppearance = appearance;
                this.playerHitbox = hitbox;

                this.path = [];
                this.found = false;
                this.status = "Player loaded";
            } catch (error) {
                this.playerHitbox = null;
                this.status = "Player error: " + error.message;
            }
        }

        setPlayerSize(args) {
            this.playerScale = Math.max(
                1,
                Math.min(1000, Number(args.SIZE) || 100)
            );
        }

        setAccuracy(args) {
            this.cellSize = Math.max(
                1,
                Math.min(16, Math.floor(Number(args.SIZE) || 4))
            );
        }

        stageToPixel(x, y) {
            const scale = this.mapScale / 100;

            return {
                x: (x - this.mapX) / scale + this.map.width / 2,
                y: (this.mapY - y) / scale + this.map.height / 2
            };
        }

        pixelToStage(x, y) {
            const scale = this.mapScale / 100;

            return {
                x: this.mapX + (x - this.map.width / 2) * scale,
                y: this.mapY - (y - this.map.height / 2) * scale
            };
        }

        isWalkable(x, y) {
            const map = this.map;

            if (
                x < 0 || y < 0 ||
                x >= map.width || y >= map.height
            ) {
                return false;
            }

            const i = (
                Math.floor(y) * map.width + Math.floor(x)
            ) * 4;

            const alpha = map.pixels[i + 3];

            if (alpha < 128) return true;

            const brightness =
                map.pixels[i] * 0.299 +
                map.pixels[i + 1] * 0.587 +
                map.pixels[i + 2] * 0.114;

            return brightness >= 128;
        }

        getFootprint() {
            const hitbox = this.playerHitbox;
            const ratio = this.playerScale / this.mapScale;

            const stride = Math.max(
                1,
                Math.floor(this.cellSize / ratio)
            );

            const points = [];

            for (let y = 0; y < hitbox.height; y += stride) {
                for (let x = 0; x < hitbox.width; x += stride) {
                    const i = (y * hitbox.width + x) * 4;

                    if (hitbox.pixels[i + 3] < 128) continue;

                    points.push({
                        x: (x + 0.5 - hitbox.width / 2) * ratio,
                        y: (y + 0.5 - hitbox.height / 2) * ratio
                    });
                }
            }

            if (points.length === 0) {
                points.push({ x: 0, y: 0 });
            }

            return points;
        }

        findPath(args) {
            this.path = [];
            this.found = false;

            if (!this.map || !this.playerHitbox) {
                this.status = "Load the map and player first";
                return;
            }

            const size = this.cellSize;
            const cols = Math.ceil(this.map.width / size);
            const rows = Math.ceil(this.map.height / size);

            if (cols * rows > 100000) {
                this.status = "Map too large. Increase accuracy";
                return;
            }

            const startPos = this.stageToPixel(
                Number(args.SX), Number(args.SY)
            );

            const goalPos = this.stageToPixel(
                Number(args.GX), Number(args.GY)
            );

            const start = {
                x: Math.floor(startPos.x / size),
                y: Math.floor(startPos.y / size)
            };

            const goal = {
                x: Math.floor(goalPos.x / size),
                y: Math.floor(goalPos.y / size)
            };

            const footprint = this.getFootprint();

            const canStand = (x, y) => {
                if (
                    x < 0 || y < 0 ||
                    x >= cols || y >= rows
                ) {
                    return false;
                }

                const centerX = x * size + size / 2;
                const centerY = y * size + size / 2;

                for (const point of footprint) {
                    if (!this.isWalkable(
                        centerX + point.x,
                        centerY + point.y
                    )) {
                        return false;
                    }
                }

                return true;
            };

            if (
                !canStand(start.x, start.y) ||
                !canStand(goal.x, goal.y)
            ) {
                this.status = "Start or destination is blocked";
                return;
            }

            const getKey = (x, y) => x + "," + y;

            const getDistance = (x, y) =>
                Math.abs(x - goal.x) + Math.abs(y - goal.y);

            const open = [{
                x: start.x,
                y: start.y,
                g: 0,
                f: getDistance(start.x, start.y)
            }];

            const scores = new Map([
                [getKey(start.x, start.y), 0]
            ]);

            const previous = new Map();
            const closed = new Set();

            const directions = [
                [0, -1],
                [0, 1],
                [-1, 0],
                [1, 0]
            ];

            while (open.length > 0) {
                open.sort((a, b) => a.f - b.f);

                const current = open.shift();
                const currentKey = getKey(current.x, current.y);

                if (closed.has(currentKey)) continue;

                if (
                    current.x === goal.x &&
                    current.y === goal.y
                ) {
                    let node = currentKey;

                    while (node) {
                        const [x, y] = node.split(",").map(Number);

                        this.path.unshift(this.pixelToStage(
                            x * size + size / 2,
                            y * size + size / 2
                        ));

                        node = previous.get(node);
                    }

                    this.path[0] = {
                        x: Number(args.SX),
                        y: Number(args.SY)
                    };

                    this.path[this.path.length - 1] = {
                        x: Number(args.GX),
                        y: Number(args.GY)
                    };

                    this.found = true;
                    this.status = "Path found";
                    return;
                }

                closed.add(currentKey);

                for (const [dx, dy] of directions) {
                    const x = current.x + dx;
                    const y = current.y + dy;
                    const key = getKey(x, y);

                    if (!canStand(x, y) || closed.has(key)) {
                        continue;
                    }

                    const newScore = current.g + 1;

                    if (newScore < (scores.get(key) ?? Infinity)) {
                        scores.set(key, newScore);
                        previous.set(key, currentKey);

                        open.push({
                            x,
                            y,
                            g: newScore,
                            f: newScore + getDistance(x, y)
                        });
                    }
                }
            }

            this.status = "No path found";
        }

        pathFound() {
            return this.found;
        }

        pathLength() {
            return this.path.length;
        }

        pathX(args) {
            return this.path[
                Math.floor(Number(args.STEP)) - 1
            ]?.x ?? 0;
        }

        pathY(args) {
            return this.path[
                Math.floor(Number(args.STEP)) - 1
            ]?.y ?? 0;
        }

        pathStatus() {
            return this.status;
        }
    }

    Scratch.extensions.register(new Pathfinding());
})(Scratch);
