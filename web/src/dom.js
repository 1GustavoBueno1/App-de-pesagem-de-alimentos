// Montagem de elementos sem innerHTML: textos sempre entram como textContent,
// então nada digitado pelo usuário vira HTML.

export function el(tag, atributos = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (nome === 'innerHTML' || nome === 'outerHTML') {
      throw new Error('Use textContent: innerHTML não é permitido.');
    }
    if (valor === null || valor === undefined || valor === false) continue;
    if (nome.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(nome.slice(2), valor);
    } else if (nome === 'class') {
      elemento.className = valor;
    } else if (valor === true) {
      elemento.setAttribute(nome, '');
    } else {
      elemento.setAttribute(nome, String(valor));
    }
  }
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    elemento.append(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  }
  return elemento;
}

/** Troca todo o conteúdo de um elemento. */
export function trocar(destino, ...filhos) {
  destino.replaceChildren(...filhos.flat().filter(Boolean));
}
