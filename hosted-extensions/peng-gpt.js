/*
 * Peng.GPT
 * Creator: Joshuaknowsmaths
 */

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Peng.GPT requires unsandboxed mode.');
  }

  const vm = Scratch.vm;
  const ID = 'penggpt-stage-controls';

  const icons = {
    power: `
      <svg viewBox="0 0 24 24" width="19" height="19"
        fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round">
        <path d="M12 2v10"/>
        <path d="M5.6 5.6a9 9 0 1 0 12.8 0"/>
      </svg>`,

    off: `
      <svg viewBox="0 0 24 24" width="19" height="19"
        fill="currentColor">
        <rect x="5" y="5" width="14" height="14" rx="2"/>
      </svg>`,

    restart: `
      <svg viewBox="0 0 24 24" width="19" height="19"
        fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round"
        stroke-linejoin="round">
        <path d="M20 7v5h-5"/>
        <path d="M20 12a8 8 0 1 0 2 5"/>
      </svg>`
  };

  function makeButton(title, color, svg, action) {
    const button = document.createElement('button');
    button.title = title;
    button.setAttribute('aria-label', title);
    button.innerHTML = svg;

    Object.assign(button.style, {
      width: '28px',
      height: '28px',
      padding: '0',
      border: 'none',
      borderRadius: '6px',
      background: color,
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    button.addEventListener('click', action);
    return button;
  }

  function addControls() {
    if (document.getElementById(ID)) return;

    const header =
      document.querySelector(
        '[class*="stage-header_stage-header-wrapper"]'
      ) ||
      document.querySelector('[class*="stage-header"]');

    if (!header) return;

    const controls = document.createElement('div');
    controls.id = ID;

    Object.assign(controls.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      marginLeft: '8px'
    });

    controls.appendChild(makeButton(
      'Power On',
      '#20a65a',
      icons.power,
      () => vm.greenFlag()
    ));

    controls.appendChild(makeButton(
      'Power Off',
      '#d74747',
      icons.off,
      () => vm.stopAll()
    ));

    controls.appendChild(makeButton(
      'Restart',
      '#3985df',
      icons.restart,
      () => {
        vm.stopAll();
        setTimeout(() => vm.greenFlag(), 150);
      }
    ));

    header.appendChild(controls);
  }

  const observer = new MutationObserver(addControls);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  addControls();

  class PengGPT {
    getInfo() {
      return {
        id: 'penggpt',
        name: 'Peng.GPT',
        creator: 'Joshuaknowsmaths',
        color1: '#4C97FF',
        color2: '#3373CC',
        color3: '#2456A6',
        blocks: []
      };
    }
  }

  Scratch.extensions.register(new PengGPT());
})(Scratch);
