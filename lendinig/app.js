(function(){
  const btn = document.getElementById('addFeatureBtn');
  const container = document.getElementById('features');
  let counter = 1;
  if (!btn || !container) return;

  btn.addEventListener('click', () => {
    counter += 1;
    const el = document.createElement('article');
    el.className = 'feature-card';
    el.innerHTML = `
      <h3>Новая функция ${counter}</h3>
      <p>Описание автоматически добавленной функции. Расширяйте шаблон и стили через CSS-переменные.</p>
      <div class="feature-meta"><span class="pill">Авто</span></div>
    `;
    container.appendChild(el);
    el.scrollIntoView({behavior:'smooth', block:'center'});
  });

})();
