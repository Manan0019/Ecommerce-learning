import test from 'node:test';
import assert from 'node:assert/strict';
import { beginFilterScrollPreservation, cancelFilterScrollPreservation, installFilterScrollProtection } from '../src/services/filterScrollProtection.js';

function browserFixture() {
  const listeners = new Map();
  let nextFrame = 0;
  const frames = new Map();
  const body = { style: { minHeight: '' } };
  const root = { scrollHeight: 3000 };
  const documentMock = {
    body,
    documentElement: { style: { overflowAnchor: '' }, scrollHeight: 3000, clientHeight: 600 },
    getElementById(id) { return id === 'root' ? root : null; },
    addEventListener(type, callback) { listeners.set(type, callback); },
    removeEventListener(type, callback) { if (listeners.get(type) === callback) listeners.delete(type); }
  };
  const windowMock = {
    innerHeight: 600, scrollY: 1100, scrollX: 0, scrollCalls: [],
    addEventListener(type, callback) { listeners.set(`window:${type}`, callback); },
    removeEventListener(type, callback) { if (listeners.get(`window:${type}`) === callback) listeners.delete(`window:${type}`); },
    scrollTo(args) { this.scrollX = args.left; this.scrollY = args.top; this.scrollCalls.push(args); }
  };
  Object.assign(globalThis, { window: windowMock, document: documentMock,
    getComputedStyle: () => ({ minHeight: '0px' }),
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    performance: { now: () => 10 }
  });
  return { body, root, frames, listeners, window: windowMock, flush(time) {
    const next = [...frames.values()]; frames.clear(); for (const callback of next) callback(time);
  }};
}

test('reset preservation restores scroll after delayed async result changes', () => {
  const fixture = browserFixture();
  beginFilterScrollPreservation();
  assert.equal(fixture.body.style.minHeight, '3000px');
  fixture.window.scrollY = 0; // browser attempted to jump when filtered rows disappeared
  fixture.root.scrollHeight = 700;
  fixture.flush(40);
  assert.equal(fixture.window.scrollY, 1100);
  fixture.flush(1200);
  assert.equal(fixture.body.style.minHeight, '3000px'); // avoids scroll clamping
  cancelFilterScrollPreservation();
  assert.equal(fixture.body.style.minHeight, '');
});

test('unrelated clicks are ignored; filter actions begin preservation', () => {
  const fixture = browserFixture();
  globalThis.Element = class Element {};
  const outside = new Element(); outside.closest = () => null;
  const inside = new Element(); inside.closest = selector => selector.includes('.nx69-category-toolbar') ? {} : {};
  const cleanup = installFilterScrollProtection();
  fixture.listeners.get('click')({ target: outside });
  assert.equal(fixture.body.style.minHeight, '');
  fixture.listeners.get('click')({ target: inside });
  assert.equal(fixture.body.style.minHeight, '3000px');
  cleanup();
  assert.equal(fixture.body.style.minHeight, '');
});
