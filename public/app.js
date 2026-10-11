const API = window.location.origin;

function doSearch() {
    const kw = document.getElementById('kw').value.trim();
    if (!kw) return alert('Введи ключевое слово!');

    fetch(API + '/api/search?keyword=' + kw)
        .then(r => r.json())
        .then(data => {
            if (data.error) return alert(data.error);
            showUrls(data.urls);
        })
        .catch(() => alert('Не удалось подключиться к серверу'));
}

function showUrls(urls) {
    const list = document.getElementById('urlsList');
    list.innerHTML = '';
    
    urls.forEach(url => {
        const div = document.createElement('div');
        div.className = 'url-item';
        div.innerHTML = `<a href="${url}" target="_blank">${url}</a> <button>Скачать</button>`;
        div.querySelector('button').onclick = () => startDownload(url);
        list.appendChild(div);
    });
    
    document.getElementById('urlsBlock').classList.remove('d-none');
}

function startDownload(url) {
    const progBlock = document.getElementById('progBlock');
    const pbar = document.getElementById('pbar');
    
    progBlock.classList.add('show');
    pbar.style.width = '0%';
    pbar.innerText = '0%';

    const es = new EventSource(API + '/api/download?url=' + encodeURIComponent(url));

    es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        
        if (data.error) {
            alert(data.error);
            es.close();
            progBlock.classList.remove('show');
            return;
        }
        
        if (data.done) {
            try {
                const saved = JSON.parse(localStorage.getItem('saved') || '{}');
                saved[url] = data.content;
                localStorage.setItem('saved', JSON.stringify(saved));
                alert('Контент сохранен!');
                loadSaved();
            } catch (e) {
                alert('Не хватило места в LocalStorage!');
            }
            es.close();
            progBlock.classList.remove('show');
            return;
        }
        
        pbar.style.width = data.progress + '%';
        pbar.innerText = data.progress + '%';
    };

    es.onerror = () => {
        alert('Ошибка при загрузке');
        es.close();
        progBlock.classList.remove('show');
    };
}

function loadSaved() {
    const list = document.getElementById('savedList');
    list.innerHTML = '';
    const saved = JSON.parse(localStorage.getItem('saved') || '{}');

    if (Object.keys(saved).length === 0) {
        list.innerHTML = '<p style="color: #999;">Пока ничего не сохранено</p>';
        return;
    }

    for (let url in saved) {
        const div = document.createElement('div');
        div.className = 'saved-item';
        div.innerHTML = `<a href="#" onclick="showContent('${url}')">${url}</a>`;
        list.appendChild(div);
    }
}

function showContent(url) {
    const saved = JSON.parse(localStorage.getItem('saved') || '{}');
    const viewer = document.getElementById('viewer');
    const frame = document.getElementById('viewerFrame');
    
    if (saved[url]) {
        fetch('/saved-styles.css')
            .then(r => r.text())
            .then(css => {
                const styleTag = '<style>' + css + '</style>';
                const htmlWithStyles = saved[url].replace('</head>', styleTag + '</head>');
                frame.srcdoc = htmlWithStyles;
                viewer.classList.add('show');
                viewer.scrollIntoView({ behavior: 'smooth' });
            })
            .catch(() => {
                // Если стили не загрузились, показываем как есть
                frame.srcdoc = saved[url];
                viewer.classList.add('show');
                viewer.scrollIntoView({ behavior: 'smooth' });
            });
    } else {
        alert('Контент не найден');
    }
}

loadSaved();