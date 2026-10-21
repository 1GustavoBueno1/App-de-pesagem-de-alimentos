import { describe, it, expect, beforeAll } from 'vitest';
import { parseHTML } from 'linkedom';

let el;
beforeAll(async () => {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.document = document;
  ({ el } = await import('../src/dom.js'));
});

describe('el (montagem segura de HTML)', () => {
  it('texto do usuário nunca vira HTML', () => {
    const p = el('p', {}, '<img src=x onerror=alert(1)>');
    expect(p.children.length).toBe(0);
    expect(p.textContent).toBe('<img src=x onerror=alert(1)>');
  });
  it('aplica atributos, classes e eventos', () => {
    let clicou = false;
    const b = el('button', { type: 'button', class: 'x', onclick: () => (clicou = true) }, 'Ok');
    b.dispatchEvent(new document.defaultView.Event('click'));
    expect([b.getAttribute('type'), b.className, b.textContent, clicou]).toEqual(['button', 'x', 'Ok', true]);
  });
  it('aceita elementos filhos e ignora null/false', () => {
    const d = el('div', {}, el('span', {}, 'a'), null, false, 'b');
    expect(d.textContent).toBe('ab');
  });
  it('recusa atributo innerHTML', () => expect(() => el('div', { innerHTML: '<b>x</b>' })).toThrow());
});
