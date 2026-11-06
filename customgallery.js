(async function (Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed to run!");
        return;
    }

    class CustomGalleryExtension {
        constructor() {
            this.extensions = [];
            this.filters = new Set();
            this.activeFilters = new Set();
            this.overlay = null;
            this.container = null;
            this.sidebar = null;
            this.isFullscreen = true;

            this._wasFullscreen = this._checkIsFullscreen();
            this._setupFullscreenListeners();
            this._createUI();
        }

        getInfo() {
            return {
                id: 'customgallery',
                name: 'Extension Gallery UI',
                color1: '#9c0000',
                color2: '#700000',
                blocks: [
                    {
                        opcode: 'whenFullscreened',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when fullscreened',
                        isEdgeActivated: false
                    },
                    {
                        opcode: 'whenUnfullscreened',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when unfullscreened',
                        isEdgeActivated: false
                    },
                    {
                        opcode: 'whenGalleryClosed',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when gallery closed',
                        isEdgeActivated: false
                    },
                    {
                        opcode: 'showGallery',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'show extension gallery'
                    },
                    {
                        opcode: 'hideGallery',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'hide extension gallery'
                    },
                    {
                        opcode: 'setGalleryFullscreen',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set gallery fullscreen to [STATE]',
                        arguments: {
                            STATE: {
                                type: Scratch.ArgumentType.BOOLEAN
                            }
                        }
                    },
                    {
                        opcode: 'addFilterTag',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'add filter category [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Graphics'
                            }
                        }
                    },
                    {
                        opcode: 'clearFilters',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'clear all gallery filters'
                    },
                    {
                        opcode: 'addCard',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'add item name: [NAME] author: [AUTHOR] icon: [ICON] desc: [DESC] url: [URL] tags: [TAGS]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'My Mod' },
                            AUTHOR: { type: Scratch.ArgumentType.STRING, defaultValue: 'Coast' },
                            ICON: { type: Scratch.ArgumentType.STRING, defaultValue: 'data:image/png;base64,...' },
                            DESC: { type: Scratch.ArgumentType.STRING, defaultValue: 'Adds awesome blocks!' },
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://example.com/mod.js' },
                            TAGS: { type: Scratch.ArgumentType.STRING, defaultValue: '["Graphics"]' }
                        }
                    },
                    {
                        opcode: 'clearGallery',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'clear all gallery items'
                    }
                ]
            };
        }

        whenFullscreened() { return false; }
        whenUnfullscreened() { return false; }
        whenGalleryClosed() { return false; }

        _checkIsFullscreen() {
            return Boolean(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                (Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.optionFullscreen)
            );
        }

        _setupFullscreenListeners() {
            const handleFullscreenChange = () => {
                const isCurrentlyFS = this._checkIsFullscreen();
                if (isCurrentlyFS !== this._wasFullscreen) {
                    this._wasFullscreen = isCurrentlyFS;
                    if (isCurrentlyFS) {
                        Scratch.vm.runtime.startHats('customgallery_whenFullscreened');
                    } else {
                        Scratch.vm.runtime.startHats('customgallery_whenUnfullscreened');
                    }
                }
                if (this.overlay && this.overlay.style.display !== 'none') {
                    this._applyOverlayStyle();
                }
            };

            document.addEventListener('fullscreenchange', handleFullscreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            window.addEventListener('resize', handleFullscreenChange);
        }

        _triggerCloseHat() {
            Scratch.vm.runtime.startHats('customgallery_whenGalleryClosed');
        }

        _createUI() {
            if (document.getElementById('pm-custom-gallery')) {
                this.overlay = document.getElementById('pm-custom-gallery');
                return;
            }

            this.overlay = document.createElement('div');
            this.overlay.id = 'pm-custom-gallery';

            const header = document.createElement('div');
            Object.assign(header.style, {
                position: 'absolute',
                top: '10px',
                right: '15px',
                display: 'flex',
                gap: '8px',
                zIndex: '1000000'
            });

            const toggleBtn = document.createElement('button');
            toggleBtn.innerText = '🗗 Toggle Mode';
            Object.assign(toggleBtn.style, {
                backgroundColor: '#2b2b2b',
                color: '#fff',
                border: '1px solid #444',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
            });
            toggleBtn.onclick = () => this.setGalleryFullscreen({ STATE: !this.isFullscreen });

            const closeBtn = document.createElement('button');
            closeBtn.innerText = '✕ Close';
            Object.assign(closeBtn.style, {
                backgroundColor: '#ff4d4d',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
            });
            closeBtn.onclick = () => this.hideGallery();

            header.appendChild(toggleBtn);
            header.appendChild(closeBtn);

            const wrapper = document.createElement('div');
            Object.assign(wrapper.style, {
                display: 'flex',
                width: '100%',
                height: '100%',
                padding: '40px 15px 15px 15px',
                gap: '15px',
                boxSizing: 'border-box'
            });

            this.sidebar = document.createElement('div');
            Object.assign(this.sidebar.style, {
                width: '180px',
                backgroundColor: '#181818',
                borderRadius: '8px',
                padding: '12px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflowY: 'auto'
            });

            this._renderSidebarHeader();

            this.container = document.createElement('div');
            Object.assign(this.container.style, {
                flex: '1',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gridAutoRows: '180px',
                gap: '10px',
                overflowY: 'auto',
                paddingRight: '5px'
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                    this.hideGallery();
                }
            });

            wrapper.appendChild(this.sidebar);
            wrapper.appendChild(this.container);
            this.overlay.appendChild(header);
            this.overlay.appendChild(wrapper);

            this.overlay.style.display = 'none';
            document.body.appendChild(this.overlay);
        }

        _renderSidebarHeader() {
            if (!this.sidebar) return;
            const sidebarTitle = document.createElement('h4');
            sidebarTitle.innerText = 'Filters';
            sidebarTitle.style.margin = '0 0 5px 0';
            this.sidebar.appendChild(sidebarTitle);
        }

        _getStageCanvas() {
            if (Scratch.renderer && Scratch.renderer.canvas) {
                return Scratch.renderer.canvas;
            }
            return document.querySelector('canvas');
        }

        _applyOverlayStyle() {
            if (!this.overlay) return;

            if (this.isFullscreen) {
                Object.assign(this.overlay.style, {
                    position: 'fixed',
                    top: '0px',
                    left: '0px',
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    zIndex: '2147483647',
                    boxSizing: 'border-box'
                });
            } else {
                const canvas = this._getStageCanvas();
                let top = 0, left = 0, width = 480, height = 360;

                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        top = rect.top;
                        left = rect.left;
                        width = rect.width;
                        height = rect.height;
                    }
                }

                Object.assign(this.overlay.style, {
                    position: 'fixed',
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: 'rgba(17, 17, 17, 0.95)',
                    color: '#ffffff',
                    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    zIndex: '2147483647',
                    boxSizing: 'border-box',
                    borderRadius: '4px'
                });
            }
        }

        setGalleryFullscreen(args) {
            this.isFullscreen = Boolean(args.STATE);
            if (this.overlay && this.overlay.style.display !== 'none') {
                this._applyOverlayStyle();
            }
        }

        showGallery() {
            if (!this.overlay) this._createUI();
            this._applyOverlayStyle();
            this.overlay.style.display = 'block';
        }

        hideGallery() {
            if (this.overlay && this.overlay.style.display !== 'none') {
                this.overlay.style.display = 'none';
                this._triggerCloseHat();
            }
        }

        addFilterTag(args) {
            const name = String(args.NAME);
            if (this.filters.has(name)) return;
            this.filters.add(name);

            const label = document.createElement('label');
            Object.assign(label.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#ccc'
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.onchange = (e) => {
                if (e.target.checked) this.activeFilters.add(name);
                else this.activeFilters.delete(name);
                this._renderCards();
            };

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(name));
            this.sidebar.appendChild(label);
        }

        clearFilters() {
            this.filters.clear();
            this.activeFilters.clear();
            if (this.sidebar) {
                this.sidebar.innerHTML = '';
                this._renderSidebarHeader();
            }
            this._renderCards();
        }

        addCard(args) {
            let tags = [];
            try { tags = JSON.parse(args.TAGS); } catch (e) { tags = []; }

            const item = {
                name: String(args.NAME),
                author: String(args.AUTHOR),
                icon: String(args.ICON),
                desc: String(args.DESC),
                url: String(args.URL),
                tags: Array.isArray(tags) ? tags : []
            };

            this.extensions.push(item);
            this._renderCards();
        }

        clearGallery() {
            this.extensions = [];
            this._renderCards();
        }

        _renderCards() {
            if (!this.container) return;
            this.container.innerHTML = '';

            const filtered = this.extensions.filter(ext => {
                if (this.activeFilters.size === 0) return true;
                return ext.tags.some(tag => this.activeFilters.has(tag));
            });

            filtered.forEach(ext => {
                const card = document.createElement('div');
                Object.assign(card.style, {
                    backgroundColor: '#9c0000',
                    borderRadius: '6px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'transform 0.1s ease'
                });

                card.onmouseover = () => card.style.transform = 'scale(1.02)';
                card.onmouseout = () => card.style.transform = 'scale(1)';

                card.onclick = () => {
                    navigator.clipboard.writeText(ext.url).then(() => {
                        alert(`Copied extension URL:\n${ext.url}`);
                    });
                };

                const img = document.createElement('img');
                img.src = ext.icon;
                Object.assign(img.style, {
                    width: '100%',
                    height: '70px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    backgroundColor: '#111'
                });

                const title = document.createElement('div');
                title.innerText = ext.name;
                title.style.fontWeight = 'bold';
                title.style.fontSize = '12px';
                title.style.marginTop = '4px';

                const author = document.createElement('div');
                author.innerText = `by ${ext.author}`;
                author.style.fontSize = '10px';
                author.style.opacity = '0.8';

                const desc = document.createElement('div');
                desc.innerText = ext.desc;
                desc.style.fontSize = '10px';
                desc.style.marginTop = '2px';

                const infoWrapper = document.createElement('div');
                infoWrapper.appendChild(title);
                infoWrapper.appendChild(author);
                infoWrapper.appendChild(desc);

                card.appendChild(img);
                card.appendChild(infoWrapper);
                this.container.appendChild(card);
            });
        }
    }

    Scratch.extensions.register(new CustomGalleryExtension());
})(Scratch);