const out = document.getElementById('out');
document.getElementById('load').addEventListener('click', load);
document.getElementById('clear').addEventListener('click', () => chrome.storage.local.clear(load));
function load(){ chrome.storage.local.get(null, data => { out.textContent = JSON.stringify(data, null, 2); }); }
load();
