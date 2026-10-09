"""Build a single-document site and lightweight redirects for old URLs."""
from pathlib import Path
import subprocess,sys,re,json,hashlib
from html import escape
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'site-source'
subprocess.run([sys.executable,str(ROOT/'scripts/build-participants.py')],check=True)
files={'home.html':'trip','road.html':'road','participants.html':'participants'}
files.update({f'participant-{i:02}.html':f'person/{i:02}' for i in range(1,13)})
file_routes={**files,'index.html':'trip'}
def rewrite(s,route):
 def href(m):
  v=m[1]
  if v.startswith(('https:','http:','mailto:','data:')):return m[0]
  file,_,anchor=v.partition('#')
  if not file:target=route
  elif file in file_routes:target=file_routes[file]
  else:return m[0]
  return 'href="#'+target+('/'+anchor if anchor else '')+'"'
 return re.sub(r'href="([^"]*)"',href,s)
screens={};markup={}
for file,route in files.items():
 s=(SRC/file).read_text()
 main=re.search(r'<main\b.*?</main>',s,re.S)[0]
 main=main.replace('<main ',f'<main data-screen="{route}" ',1) if '<main ' in main else main.replace('<main>',f'<main data-screen="{route}">',1)
 main=main.replace('<main ', '<main id="main-content" tabindex="-1" ', 1)
 markup[route]=rewrite(main,route)
 nav=re.search(r'<nav class="section-nav".*?</nav>',s,re.S)[0]
 screens[route]={'title':re.search(r'<title>(.*?)</title>',s)[1],'nav':rewrite(nav,route),'page':'participants' if route.startswith('person/') else route}
home=(SRC/'home.html').read_text()
head=re.search(r'<head>(.*?)</head>',home,re.S)[1]
head+='\n<link rel="stylesheet" href="road.css"><link rel="stylesheet" href="participants.css"><link rel="stylesheet" href="screens.css">'
header='''<header class="site-header"><div class="header-pages"><a class="brand" href="#trip" aria-label="Выше облаков — главная"><span class="brand-icon" aria-hidden="true">↟</span><span class="brand-name">ВЫШЕ ОБЛАКОВ</span></a><nav class="page-nav" aria-label="Страницы"><a href="#trip" data-page="trip" aria-current="page">Поездка</a><a href="#road" data-page="road">Дорога</a><a href="#participants" data-page="participants">Участники</a></nav></div><div class="header-sections">'''+screens['trip']['nav']+'</div></header>'
footer=rewrite(re.search(r'<footer>.*?</footer>',home,re.S)[0],'trip')
templates='\n'.join(f'<template data-route="{route}">{body}</template>' for route,body in markup.items() if route!='trip')
unknown='<template data-route="not-found"><main id="main-content" tabindex="-1" data-screen="not-found" class="members-main"><div class="members-heading"><h1>Такой страницы нет</h1><p>Ссылка могла измениться.</p><a class="button accent" href="#trip">К поездке</a></div></main></template>'
screens['not-found']={'title':'Страница не найдена — Выше облаков','page':'','nav':'<nav class="section-nav" aria-label="Разделы страницы"><a href="#trip">К поездке</a></nav>'}
data=json.dumps(screens,ensure_ascii=False).replace('</','<\\/')
html='<!doctype html><html lang="ru"><head>'+head+'</head><body><a class="skip-link" href="#trip/main-content">К содержимому</a>'+header+markup['trip']+footer+templates+unknown+'<script type="application/json" id="screen-config">'+data+'</script><script src="app.js"></script><script src="navigation.js"></script><noscript><p class="no-script">Для переключения экранов включите JavaScript.</p></noscript></body></html>'
def version_asset(match):
 path=match[2]
 digest=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()[:10]
 return f'{match[1]}="{path}?v={digest}"'
html=re.sub(r'(href|src)="([^"]+\.(?:css|js))"',version_asset,html)
(ROOT/'index.html').write_text(html)
for file,route in files.items():
 if file=='home.html':continue
 target='index.html#'+route
 # Preserve legacy section links in bookmarked URLs.
 redirect=f"const target={json.dumps(target)};location.replace(target+(location.hash.length>1?'/'+location.hash.slice(1):''));"
 (ROOT/file).write_text(f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Выше облаков</title></head><body><a href="{escape(target)}">Открыть страницу</a><script>{redirect}</script></body></html>')
print('Built index.html with 15 screens and legacy URL redirects.')
