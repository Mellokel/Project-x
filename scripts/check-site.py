"""Check generated screen routes, unique IDs and asset references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re,json
ROOT=Path(__file__).resolve().parent.parent
html=(ROOT/'index.html').read_text()
config=json.loads(re.search(r'<script type="application/json" id="screen-config">(.*?)</script>',html,re.S)[1])
class Screen(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.refs=[];self.h1=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:assert a['id'] not in self.ids,a['id'];self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  if tag in ('a','img','script','link'):
   v=a.get('href') or a.get('src')
   if v:self.refs.append(v)
screens={}
for main in re.findall(r'<main\b.*?</main>',html,re.S):
 route=re.search(r'data-screen="([^"]+)"',main)[1]
 p=Screen();p.feed(main);assert p.h1==1,route;screens[route]=p
assert len(screens)==16 # 15 screens + not found
for route,screen in screens.items():
 nav=Screen();nav.feed(config[route]['nav'])
 for ref in screen.refs+nav.refs:
  u=urlsplit(ref)
  if u.scheme:continue
  if u.path:assert (ROOT/u.path).is_file(),ref
  if u.fragment:
   parts=u.fragment.split('/');target='/'.join(parts[:2]) if parts[0]=='person' else parts[0]
   anchor='/'.join(parts[2:] if parts[0]=='person' else parts[1:])
   assert target in screens,ref
   if anchor:assert anchor in screens[target].ids,ref
assert len(json.loads((ROOT/'participants.json').read_text()))==12
for f in ('road.html','participants.html',*[f'participant-{i:02}.html' for i in range(1,13)]):
 s=(ROOT/f).read_text();assert 'location.replace' in s and '<main' not in s,f
print('All screens, profile links, anchors, assets and old-address redirects checked.')
