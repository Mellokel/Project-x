ВЫШЕ ОБЛАКОВ — поездка на Новый год

Сайт открывается через index.html в корне проекта.
«Поездка», «Дорога», «Участники» и 12 профилей переключаются в одном документе,
без загрузки нового HTML. CSS, JavaScript, шрифты и фотографии — отдельные файлы.

Прямые ссылки:
index.html#trip
index.html#trip/budget
index.html#road
index.html#participants
index.html#person/07
index.html#person/07/housing

Старые road.html, participants.html и participant-XX.html — маленькие страницы
перенаправления для сохранённых ссылок. Для новых ссылок используйте index.html#…

РЕДАКТИРОВАНИЕ
Главная: site-source/home.html
Дорога: site-source/road.html
Участники и расселение: participants.json (housingArkhyz / housingElbrus).
Шаблон карточек и профилей: scripts/build-participants.py
Общие стили: style.css, road.css, participants.css, screens.css
Плавающий таббар и компактная шапка: tab-bar.css
Общая навигация и иконки таббара: scripts/build-site.py
Маршрутизация и переходы: navigation.js
Интерактивные блоки главной: app.js

После изменения содержания или участников:
python3 scripts/build-site.py

Эта команда обновляет index.html и старые адреса. Не редактируйте собранный
index.html вручную: изменения будут перезаписаны при следующей сборке.
Никаких npm-пакетов или сторонних библиотек для сборки не требуется.

Локальный просмотр из корня проекта:
python3 -m http.server 8765 --bind 127.0.0.1
Затем открыть http://127.0.0.1:8765/

ПУБЛИКАЦИЯ
Для GitHub Pages: index.html, файлы CSS/JS и assets находятся в корне.
Оставьте старые страницы-перенаправления, чтобы прежние ссылки продолжали работать.
Изменения в этом сеансе локальные; удалённый сайт автоматически не обновляется.

Оптимизированные фотографии: assets/optimized. Оригиналы сохранены без изменений.
Golos Text хранится локально в assets/fonts (лицензия OFL).
Все данные уже включены в index.html; браузер не загружает participants.json.
Неактивные экраны хранятся в инертных HTML-шаблонах. Фотографии появляются
по мере открытия экранов и прокрутки. Состояние элементов сохраняется между
экранами в текущем сеансе, но не после перезагрузки страницы.

Архивная фотография (больше не используется на сайте): KpokeJlJla, «Winter Elbrus. South slope of Cheget Mountain from the top».
https://commons.wikimedia.org/wiki/File:Winter_Elbrus._South_slope_of_Cheget_Mountain_from_the_top.jpg
CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
Фото уменьшено для веба; на странице применяется кадрирование средствами CSS.

Текущая обложка: предоставленный пользователем beautiful-shot-mountains-trees-covered-snow-fog.jpg.
Веб-копия: assets/optimized/snowy-mountains.jpg.
