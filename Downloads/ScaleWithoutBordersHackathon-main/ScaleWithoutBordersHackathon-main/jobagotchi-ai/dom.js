(function () {
  'use strict';
  const Dom = {
    el(tag, attrs = {}, children = []) {
      const node = document.createElement(tag);
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') throw new Error('Unsafe html attribute blocked');
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, String(value));
      });
      [].concat(children).filter(Boolean).forEach(child => node.append(child.nodeType ? child : document.createTextNode(String(child))));
      return node;
    },
    debounce(fn, ms) {
      let timer;
      return function debounced(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
    },
    firstText(selectors, root = document) {
      for (const selector of selectors) {
        const node = root.querySelector(selector);
        const text = node?.innerText?.trim();
        if (text) return text;
      }
      return '';
    }
  };
  window.Jobagotchi.Dom = Dom;
}());
