'use strict';
const days = [
 ['29 декабря · Архыз', 'Заселение с 14:00. Собираемся в домах, распаковываем доски и начинаем отпуск.'],
 ['30 декабря — 2 января · Архыз', 'Четыре дня для катания и новогоднего праздника. Конкретные планы по дням решим вместе.'],
 ['3 января · Переезд', 'Выселяемся из домов до 12:00 и едем на Эльбрус. Время выезда и трансфер ещё нужно согласовать.'],
 ['4–6 января · Эльбрус', 'Планируем три полных дня катания. Жильё и дорога до подъёмников пока в работе.'],
 ['7 января · Возвращение', 'Планируем дорогу домой. Рейсы, трансферы и время выезда уточним после выбора транспорта.']
];
document.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => {
 document.querySelectorAll('[data-day]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
 const [label, copy] = days[Number(button.dataset.day)];
 document.getElementById('day-label').textContent = label;
 document.getElementById('day-copy').textContent = copy;
}));
const transport = {
 plane: { label:'САМОЛЁТ + ТРАНСФЕР', route:'Москва <span>→</span> Минводы <span>→</span> Архыз', body:'<p>Летим до Минеральных Вод, дальше едем в горы на трансфере.</p><ul><li>У хозяев домов есть трансфер до Архыза — стоимость уточняем.</li><li>Согласуем рейсы, чтобы по возможности ехать вместе.</li><li>При выборе билета проверяем условия перевозки сноуборда.</li></ul>' },
 car: { label:'НА МАШИНЕ ИЗ МОСКВЫ', route:'Москва <span>→</span> Архыз <span>→</span> Эльбрус', body:'<p>Едем на машине со снаряжением. Экипажи и свободные места ещё нужно подтвердить.</p><ul><li>В заметках пока указан один водитель — Игорь.</li><li>Даты выезда, остановки и распределение пассажиров согласуем отдельно.</li><li>Расходы на топливо и платные дороги посчитаем на экипаж.</li></ul>' }
};
document.querySelectorAll('[data-transport]').forEach(button => button.addEventListener('click', () => {
 document.querySelectorAll('[data-transport]').forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
 const item = transport[button.dataset.transport];
 document.getElementById('transport-label').textContent = item.label;
 document.getElementById('transport-route').innerHTML = item.route;
 document.getElementById('transport-body').innerHTML = item.body;
}));
document.getElementById('elbrus-budget').addEventListener('change', event => {
 document.getElementById('total').innerHTML = event.target.checked ? '210–230 <small>тыс. ₽</small>' : '150 000 <small>₽</small>';
 document.getElementById('budget-caption').textContent = event.target.checked ? 'Архыз + Эльбрус · примерный общий бюджет' : 'Архыз · с перелётом и запасом';
});
