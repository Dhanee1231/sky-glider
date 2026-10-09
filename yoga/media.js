// Real-person demo media (self-hosted in ./media, loaded on demand) and their credits.
const KS = { title: '운동후 스트레칭 모음, 이거 하나면 운동효과 2배! 쿨다운 끝! (post-workout stretching collection)', author: '심으뜸 (Shim Eu-ddeum), “심으뜸의 마이너스 라이프” channel', license: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:운동후_스트레칭_모음,_이거_하나면_운동효과_2배!_쿨다운_끝!.webm', site: 'Wikimedia Commons' };
const NM = (file) => ({ title: file, author: 'Kennguru (photographer); model Nina Mel', license: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:' + file.replace(/ /g, '_'), site: 'Wikimedia Commons' });
const C = (file, author, license) => ({ title: file, author, license, url: 'https://commons.wikimedia.org/wiki/File:' + file.replace(/ /g, '_'), site: 'Wikimedia Commons' });
export const MEDIA = {
  tree: { type: 'video', src: 'video/tree.mp4', poster: 'video/tree.jpg', portrait: true, credit: { title: 'Woman Doing Tree Pose (video 6323275)', author: 'Pexels contributor', license: 'Pexels License', url: 'https://www.pexels.com/video/woman-doing-tree-pose-6323275/', site: 'Pexels' } },
  warrior2: { type: 'video', src: 'video/warrior2.mp4', poster: 'video/warrior2.jpg', credit: { title: 'People Doing the Warrior II Pose at a Yoga Class (video 8480549)', author: 'Yan Krukau', license: 'Pexels License', url: 'https://www.pexels.com/video/people-doing-the-warrior-ii-pose-at-a-yoga-class-8480549/', site: 'Pexels' } },
  lunge: { type: 'video', src: 'video/lunge.mp4', poster: 'video/lunge.jpg', credit: { ...KS, part: 'clip 0:06–0:10' } },
  kneeschest: { type: 'video', src: 'video/kneeschest.mp4', poster: 'video/kneeschest.jpg', credit: { ...KS, part: 'clip 5:05–5:10' } },
  downdog: { type: 'video', src: 'video/downdog.mp4', poster: 'video/downdog.jpg', credit: { ...KS, part: 'clip 6:08–6:13' } },
  catcow: { type: 'video', src: 'video/catcow.mp4', poster: 'video/catcow.jpg', credit: { ...KS, part: 'clip 6:40–6:49' } },
  child: { type: 'video', src: 'video/child.mp4', poster: 'video/child.jpg', credit: { ...KS, part: 'clip 7:39–7:46' } },
  mountain: { type: 'photo', src: 'photo/mountain.jpg', portrait: true, credit: NM('Tadasana Yoga-Asana Nina-Mel.jpg') },
  chair: { type: 'photo', src: 'photo/chair.jpg', portrait: true, credit: NM('Utkatasana Yoga-Asana Nina-Mel.jpg') },
  cobra: { type: 'photo', src: 'photo/cobra.jpg', credit: NM('Bhujangasana Yoga-Asana Nina-Mel.jpg') },
  seatedfold: { type: 'photo', src: 'photo/seatedfold.jpg', credit: C('Paschimottanasana.jpg', 'Joseph Renger', 'CC BY-SA 3.0') },
  butterfly: { type: 'photo', src: 'photo/butterfly.jpg', credit: C('Baddha Koṇāsana-bound angle.jpg', 'Jfbongarçon', 'CC BY-SA 3.0') },
  bridge: { type: 'photo', src: 'photo/bridge.jpg', credit: C('Setubandhasana oblique view.JPG', 'Biswarup Ganguly', 'CC BY 3.0') },
  easyseat: { type: 'photo', src: 'photo/easyseat.jpg', portrait: true, credit: C('Cross-legged sitting woman.jpg', 'Chi Chang Wu', 'CC BY-SA 2.0') },
  forwardfold: { type: 'photo', src: 'photo/forwardfold.jpg', credit: C('Uttanasana finita 1300px.jpg', 'Roberto Busconi at Yoga Mon Amour', 'CC BY-SA 4.0') }
};
export const NO_REAL = ['neck', 'shoulder', 'star', 'sidebend'];
export const mediaUrl = rel => new URL('./media/' + rel, import.meta.url).href;
const objUrls = new Map();
// fetch once (the service worker caches it on demand), then play from a blob URL so it works offline without range requests
export function mediaBlob(rel) {
  if (!objUrls.has(rel)) { const p = fetch(mediaUrl(rel)).then(r => { if (!r.ok) throw new Error('media ' + r.status); return r.blob(); }).then(b => URL.createObjectURL(b)); objUrls.set(rel, p); p.catch(() => objUrls.delete(rel)); }
  return objUrls.get(rel);
}
export const LICENSE_TEXT = {
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/', 'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/', 'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/', 'Pexels License': 'https://www.pexels.com/license/', 'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0'
};
