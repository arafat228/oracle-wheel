// 1. Инициализация приложения Telegram
const tg = window.Telegram.WebApp;
tg.expand(); // Расширяем приложение на весь экран

// 2. Получаем элементы со страницы
const spinButton = document.getElementById('spin-button');
const matchTitleElement = document.getElementById('match-title');
const matchInfoElement = document.getElementById('match-info');

/// 3. Парсим и ДЕКОДИРУЕМ параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const fixtureId = urlParams.get('fixture_id');
// --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
const homeTeam = decodeURIComponent(urlParams.get('home'));
const awayTeam = decodeURIComponent(urlParams.get('away'));
// --- КОНЕЦ ИЗМЕНЕНИЯ ---
const matchType = urlParams.get('type');
const score = urlParams.get('score');
const elapsed = urlParams.get('elapsed');

// 4. Отображаем информацию о матче
matchTitleElement.textContent = `${homeTeam} vs ${awayTeam}`;
if (matchType === 'live') {
    matchInfoElement.textContent = `Live | ${score} | ${elapsed}'`;
} else {
    matchInfoElement.textContent = 'Прематч';
}

// 5. Конфигурация колеса (пока базовая)
// TODO: Динамически формировать сегменты на основе типа матча
let segments = [
    {'fillStyle' : '#eae56f', 'text' : 'П1'},
    {'fillStyle' : '#89f26e', 'text' : 'Ничья'},
    {'fillStyle' : '#7de6ef', 'text' : 'П2'},
    {'fillStyle' : '#e7706f', 'text' : 'ТБ 2.5'},
    {'fillStyle' : '#eae56f', 'text' : 'ОЗ - Да'},
    {'fillStyle' : '#89f26e', 'text' : 'ТМ 2.5'},
];

let theWheel = new Winwheel({
    'numSegments'  : segments.length,
    'outerRadius'  : 180,
    'textFontSize' : 16,
    'segments'     : segments,
    'animation' :
    {
        'type'     : 'spinToStop',
        'duration' : 5,
        'spins'    : 8,
        'callbackFinished' : alertPrize, // Функция, которая вызывается после вращения
    }
});

// 6. Функция, которая срабатывает после остановки колеса
function alertPrize(indicatedSegment) {
    // Получаем результат
    let result = indicatedSegment.text;
    alert("Оракул предсказывает: " + result);

    // TODO: Отправить данные в бот через tg.sendData()
    
    // Снова включаем кнопку
    spinButton.disabled = false;
    spinButton.textContent = "Крутить еще раз!";
}

// 7. Обработчик нажатия на кнопку
spinButton.addEventListener('click', () => {
    if (theWheel.segments.length > 0) {
        theWheel.startAnimation();
        spinButton.disabled = true; // Блокируем кнопку во время вращения
    }
});

// Как только колесо готово, включаем кнопку
if (theWheel.segments.length > 0) {
    spinButton.disabled = false;
}