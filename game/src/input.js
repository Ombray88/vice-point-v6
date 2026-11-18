export function createInput() {
  const down = {};
  const prevDown = {};
  const mouse = { x: 0, y: 0, down: false };

  const targetKeys = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyE', 'Space', 'ShiftLeft', 'KeyM', 'KeyR', 'Escape', 'Enter'
  ]);

  function onKeyDown(e) {
    if (targetKeys.has(e.code)) {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) {
        e.preventDefault();
      }
      down[e.code] = true;
    }
  }

  function onKeyUp(e) {
    if (targetKeys.has(e.code)) {
      down[e.code] = false;
    }
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseDown(e) {
    mouse.down = true;
  }

  function onMouseUp(e) {
    mouse.down = false;
  }

  return {
    down,
    mouse,
    pressed(code) {
      const isDown = !!down[code];
      const wasDown = !!prevDown[code];
      prevDown[code] = isDown;
      return isDown && !wasDown;
    },
    attach() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    }
  };
}
