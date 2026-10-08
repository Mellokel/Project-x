"""Rebuild participant pages after editing participants.json. No dependencies."""
from pathlib import Path
import json,re
from html import escape
ROOT=Path(__file__).resolve().parent.parent
people=json.loads((ROOT/'participants.json').read_text())
favicon=re.search(r'<link rel="icon"[^>]+>',(ROOT/'index.html').read_text())[0]
def page(title,sections,body):
 anchors=''.join(f'<a href="#{id}">{label}</a>' for id,label in sections)
 return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(title)} — Выше облаков</title>{favicon}<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="road.css"><link rel="stylesheet" href="participants.css"></head><body><header class="site-header"><div class="header-pages"><a class="brand" href="index.html"><span class="brand-icon" aria-hidden="true">↟</span><span class="brand-name">ВЫШЕ ОБЛАКОВ</span></a><nav class="page-nav" aria-label="Страницы"><a href="index.html">Поездка</a><a href="road.html">Дорога</a><a href="participants.html" aria-current="page">Участники</a></nav></div><div class="header-sections"><nav class="section-nav" aria-label="Разделы страницы">{anchors}</nav></div></header><main class="members-main">{body}</main><footer><a class="brand" href="index.html">↟ ВЫШЕ ОБЛАКОВ</a><a href="participants.html">Все участники</a><span>Москва / Архыз / Эльбрус</span></footer><script src="navigation.js"></script></body></html>'''
def badge(place,state):
 label={'yes':'едет','maybe':'под вопросом','no':'не едет'}[state]
 return f'<span class="trip-status {state}">{place} · {label}</span>'
cards=''
for p in people:
 nick=f'<p class="member-nickname">{escape(p["nickname"])}</p>' if p['nickname'] else ''
 cards+=f'''<a class="member-card" href="participant-{p['id']}.html">{p['avatar']}<h2>{escape(p['name'])}</h2>{nick}<div class="member-statuses">{badge('Архыз',p['arkhyz'])}{badge('Эльбрус',p['elbrus'])}</div><p class="member-transport">{escape(p['transport'])}</p><span class="profile-label">План поездки</span></a>'''
body=f'''<section id="members" class="members-heading"><div class="eyebrow muted">НАША КОМПАНИЯ / 12 УЧАСТНИКОВ</div><h1>Свои люди.</h1><p>Кто куда едет, как добирается и где будет жить — в личных страницах участников.</p></section><div class="members-grid">{cards}</div>'''
(ROOT/'participants.html').write_text(page('Участники',[('members','Участники')],body))
for p in people:
 nick=f'<p class="profile-nickname">{escape(p["nickname"])}</p>' if p['nickname'] else ''
 if 'Самолёт' in p['transport']:
  transport='Москва — Минеральные Воды самолётом, затем трансфер в Архыз. Рейсы и время встречи пока не согласованы.'
  extra='Трансфер: 15 000 ₽ за машину на троих; по 5 000 ₽ с человека при полной посадке.'
 elif p['transport']=='Пока не указано':transport='Способ добраться до Архыза пока не выбран.';extra='Уточним после подтверждения участия.'
 else:
  transport=escape(p['transport'])+'. Из Москвы сразу до места в Архызе.'
  extra='Дата выезда и детали дороги ещё уточняются.'
 if p['arkhyz']=='maybe':extra+=' Участие в поездке под вопросом.'
 def housing(place,status,key):
  if status=='no':return f'<article class="profile-panel"><h3>{place}</h3><p>Не едет. Проживание не планируется.</p></article>'
  detail=escape(p[key]) if p[key] else 'Расселение ещё не определено. Дом, комнату и соседей добавим позже.'
  if status=='maybe':detail='Если участие подтвердится: '+detail[0].lower()+detail[1:]
  dates='29 декабря — 3 января' if place=='Архыз' else '3 — 7 января · по общему плану'
  return f'<article class="profile-panel"><h3>{place}</h3><span class="meta">{dates}</span><p>{detail}</p></article>'
 body=f'''<a class="back-to-members" href="participants.html">Все участники</a><div class="profile-heading">{p['avatar']}<div><div class="eyebrow muted">ЛИЧНЫЙ ПЛАН ПОЕЗДКИ</div><h1>{escape(p['name'])}</h1>{nick}</div></div><section class="profile-section" id="destinations"><div class="eyebrow muted">01 / КУДА ЕДЕТ</div><h2>Маршрут</h2><div class="member-statuses">{badge('Архыз',p['arkhyz'])}{badge('Эльбрус',p['elbrus'])}</div></section><section class="profile-section" id="transport"><div class="eyebrow muted">02 / КАК ДОБИРАЕТСЯ</div><h2>Дорога</h2><div class="profile-columns"><article class="profile-panel"><h3>Москва — Архыз</h3><p>{transport}</p><p class="muted">{extra}</p></article><article class="profile-panel"><h3>После Архыза</h3><p>Ещё на обсуждении. Дальнейший транспорт и обратную дорогу уточним позже.</p><a class="text-link" href="road.html">Общий план дороги</a></article></div></section><section class="profile-section" id="housing"><div class="eyebrow muted">03 / ГДЕ ЖИВЁТ</div><h2>Проживание</h2><div class="profile-columns">{housing('Архыз',p['arkhyz'],'housingArkhyz')}{housing('Эльбрус',p['elbrus'],'housingElbrus')}</div></section>'''
 (ROOT/f'participant-{p["id"]}.html').write_text(page(p['name'],[('destinations','Маршрут'),('transport','Дорога'),('housing','Проживание')],body))
print('Built participant directory and 12 personal pages.')
