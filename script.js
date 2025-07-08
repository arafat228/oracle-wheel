// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let theWheel;
let spinButton = document.getElementById('spin_button');
let wheelSpinning = false;

// Определяем цвета для секторов.
const segmentColors = ["#3498DB", "#E74C3C", "#2ECC71", "#F1C40F", "#9B59B6", "#1ABC9C", "#E67E22"];

// --- ФУНКЦИИ ---

// Функция для парсинга параметров из URL
function getUrlParams() {
    console.log("1. Начинаю парсинг URL...");
    const params = new URLSearchParams(window.location.hash.substring(1));
    const dataParam = params.get('payload');
    if (!dataParam) {
        console.error("Ошибка: параметр 'data' не найден в URL.");
        return [];
    }

    try {
        const decodedString = atob(dataParam);
        const segments = JSON.parse(decodedString);
        console.log("2. Данные успешно раскодированы:", segments);
        if (Array.isArray(segments) && segments.length > 0) {
            return segments;
        }
    } catch (e) {
        console.error("Ошибка парсинга данных из URL:", e);
    }
    return [];
}

// Функция для создания секторов колеса
function createSegments(oddsData) {
    if (oddsData.length === 0) {
        return [{'fillStyle': '#AAAAAA', 'text': 'Нет данных'}];
    }
    return oddsData.map((odd, index) => ({
        'fillStyle': segmentColors[index % segmentColors.length],
        'text': odd.name,
        'value': odd.value
    }));
}

// Функция, которая вызывается после остановки колеса
function alertPrize(indicatedSegment) {
    console.log("6. Колесо остановилось! Выпало:", indicatedSegment.text);
    
    // Инициализируем Telegram Web App ТОЛЬКО когда он нужен
    const tg = window.Telegram.WebApp;
    
    // Показываем результат пользователю
    alert("Вам выпало: " + indicatedSegment.text);

    // Отправляем данные обратно в бота
    const resultData = {
        type: 'oracle_wheel_result',
        text: indicatedSegment.text,
        value: indicatedSegment.value
    };
    tg.sendData(JSON.stringify(resultData));

    // Закрываем Mini App через 1.5 секунды
    setTimeout(() => {
        tg.close();
    }, 1500);
}

// Функция для запуска вращения
function startSpin() {
    console.log("4. Нажата кнопка 'Крутить'");
    if (wheelSpinning === false) {
        spinButton.disabled = true;
        spinButton.textContent = 'ВРАЩАЕТСЯ...';
        
        console.log("5. Запускаю theWheel.startAnimation()...");
        theWheel.startAnimation();
        
        wheelSpinning = true;
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
// Используем событие 'load' чтобы убедиться, что ВСЕ ресурсы (включая Winwheel) загружены
window.addEventListener('load', () => {
    const oddsData = getUrlParams();
    const segments = createSegments(oddsData);

    if (oddsData.length === 0) {
        document.getElementById('subtitle').textContent = 'Не удалось загрузить коэффициенты.';
        spinButton.disabled = true;
        return; // Прерываем выполнение, если нет данных
    }

    // Создаем объект колеса
    theWheel = new Winwheel({
        'numSegments'  : segments.length,
        'outerRadius'  : 180,
        'innerRadius'  : 40,
        'textFontSize' : 14,
        'textFontFamily': 'Arial',
        'textMargin'   : 10,
        'segments'     : segments,
        'animation'    : {
            'type'     : 'spinToStop',
            'duration' : 7,
            'spins'    : 8,
            'callbackFinished' : alertPrize
        }
    });
    console.log("3. Колесо успешно создано с", segments.length, "секторами.");
});
