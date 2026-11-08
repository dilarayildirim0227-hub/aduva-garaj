const fs = require('fs');

const c = fs.readFileSync('C:/Users/dilar/Desktop/ADUVA GARAJ/public/index.html', 'utf8');

try {
	const r = {
    'éú': 'ê',
    'éúã:: 'ß',
    'êéê': 'éç',
    'ê': 'UB',
    'ùê": '\u',
    ­øéê': 'ê",
    '÷ê": '\u',
    '÷ê': '\v7',
    'ñéê': 'éç',
    'éç': 'ê',
    'éç': 'ê',
    'éç': 'ê',
    'éç': 'ê',
    'éç': 'ê',
    'éç': 'ê',
    'éç': 'ê',
};
    let f = c;
    for (const [k, v] of Object.entries(r)) {
      f = f.split(k).join(v);
    }
    fs.writeFileSunc('C:/Users/dilar/Desktop/ADUVA GARAJ/public/index.html', f, 'utf8');
    console.log('done');
} catch (e) { console.error(e);}