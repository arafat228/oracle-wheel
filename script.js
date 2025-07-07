// Инициализируем Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Расширяем приложение на весь экран

// --- НАСТРОЙКИ КОЛЕСА ---
// Определяем цвета для секторов. Можешь добавить больше цветов.
const segmentColors = ["#3498DB", "#E74C3C", "#2ECC71", "#F1C40F", "#9B59B6", "#1ABC9C", "#E67E22"];

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let theWheel;
let spinButton = document.getElementById('spin_button');
let wheelSpinning = false;

// --- ОСНОВНАЯ ЛОГИКА ---

// 1. Функция для парсинга параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.hash.substring(1)); // Используем hash
    const dataParam = params.get('data');
    if (!dataParam) return [];

    // Декодируем данные из Base64 и парсим как JSON
    try {
        const decodedString = atob(dataParam);
        const segments = JSON.parse(decodedString);
        // Проверяем, что это массив и он не пустой
        if (Array.isArray(segments) && segments.length > 0) {
            return segments;
        }
    } catch (e) {
        console.error("Ошибка парсинга данных из URL:", e);
    }
    return [];
}

// 2. Функция для создания секторов колеса
function createSegments(oddsData) {
    if (oddsData.length === 0) {
        // Если данных нет, создаем заглушку
        return [
            {'fillStyle': '#AAAAAA', 'text': 'Нет данных'}
        ];
    }

    return oddsData.map((odd, index) => ({
        'fillStyle': segmentColors[index % segmentColors.length], // Циклически используем цвета
        'text': odd.name, // Текст сектора (например, "П1 (1.85)")
        'value': odd.value // Значение, которое вернется боту (например, "p1")
    }));
}

// 3. Функция, которая вызывается после остановки колеса
function alertPrize(indicatedSegment) {
    // Показываем результат пользователю
    alert("Вам выпало: " + indicatedSegment.text);

    // Отправляем данные обратно в бота
    // Мы отправляем и текст, и значение для гибкости
    const resultData = {
        type: 'oracle_wheel_result',
        text: indicatedSegment.text,
        value: indicatedSegment.value
    };
    tg.sendData(JSON.stringify(resultData));

    // Закрываем Mini App через 1.5 секунды после отправки данных
    setTimeout(() => {
        tg.close();
    }, 1500);
}

// 4. Функция для запуска вращения
function startSpin() {
    if (wheelSpinning === false) {
        // Блокируем кнопку
        spinButton.disabled = true;
        spinButton.textContent = 'ВРАЩАЕТСЯ...';
        
        // Запускаем анимацию
        theWheel.startAnimation();
        
        // Устанавливаем флаг, что колесо крутится
        wheelSpinning = true;
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
document.addEventListener('DOMContentLoaded', () => {
    const oddsData = getUrlParams();
    const segments = createSegments(oddsData);

    if (oddsData.length === 0) {
        document.getElementById('subtitle').textContent = 'Не удалось загрузить коэффициенты.';
        spinButton.disabled = true;
    }

    // Создаем объект колеса
    theWheel = new Winwheel({
        'numSegments'  : segments.length,   // Количество секторов
        'outerRadius'  : 180,               // Внешний радиус
        'innerRadius'  : 40,                // Внутренний радиус для создания "бублика"
        'textFontSize' : 16,
        'textFontFamily': 'Arial',
        'textMargin'   : 10,
        'segments'     : segments,          // Данные секторов
        'animation'    : {
            'type'     : 'spinToStop',
            'duration' : 7,     // Продолжительность анимации в секундах
            'spins'    : 8,     // Количество оборотов
            'callbackFinished' : alertPrize, // Функция, которая вызывается после остановки
            'callbackSound'    : playSound,   // Функция для звука тиканья (опционально)
            'soundTrigger'     : 'pin'        // Триггер для звука
        },
        'pins': {
            'number' : segments.length * 2, // Количество "колышков" для звука
            'outerRadius': 4,
        }
    });

    // Загружаем звук тиканья
    let tickSound = new Audio('tick.mp3');
    
    // Функция для проигрывания звука
    function playSound() {
        tickSound.pause();
        tickSound.currentTime = 0;
        tickSound.play();
    }
});
