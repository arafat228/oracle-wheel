// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ---
const tg = window.Telegram.WebApp;
const spinButton = document.getElementById('spin_button');
const slotMachineContainer = document.getElementById('slot_machine');
const subtitle = document.getElementById('subtitle');

let spinning = false;      // Флаг, предотвращающий повторное нажатие во время анимации
let payloadData = null;    // Здесь будем хранить данные, полученные от бота

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

/**
 * Парсит данные из URL-хэша, которые передает бот.
 * Функция полностью аналогична той, что была в старом коде, но оставлена для ясности.
 * @returns {object|null} - Распарсенный объект payload или null в случае ошибки.
 */
function getUrlParams() {
    try {
        const hash = window.location.hash.substring(1);
        if (!hash) return null;
        
        const params = new URLSearchParams(hash);
        const dataParam = params.get('payload');
        if (!dataParam) return null;
        
        return JSON.parse(decodeURIComponent(dataParam));
    } catch (e) {
        console.error("Ошибка парсинга данных из URL:", e);
        subtitle.textContent = "Ошибка чтения данных.";
        return null;
    }
}

/**
 * Создает и наполняет один барабан (UL элемент) значениями.
 * @param {string[]} values - Массив строк для отображения в барабане.
 * @returns {HTMLUListElement} - Готовый к вставке в DOM элемент UL.
 */
function createReel(values) {
    const reelUl = document.createElement('ul');
    reelUl.className = 'reel';
    
    // Для плавной и долгой прокрутки создаем длинный список,
    // дублируя и перемешивая исходные значения много раз.
    const repeatedValues = [];
    for (let i = 0; i < 20; i++) {
        // Перемешиваем массив на каждой итерации для большей случайности на ленте
        const shuffled = [...values].sort(() => Math.random() - 0.5);
        repeatedValues.push(...shuffled);
    }
    
    repeatedValues.forEach(val => {
        const li = document.createElement('li');
        li.className = 'reel-item';
        li.textContent = val;
        reelUl.appendChild(li);
    });
    
    return reelUl;
}

/**
 * Строит пользовательский интерфейс в зависимости от типа игры ('winner', 'score', 'total').
 */
function buildUI() {
    slotMachineContainer.innerHTML = '';
    // Определяем текст подзаголовка и получаем данные для барабанов
    let reelsData;
    if (payloadData.type === 'winner') {
        subtitle.textContent = "Кто же станет победителем?";
        reelsData = [payloadData.options.map(opt => opt.value)];
    } else if (payloadData.type === 'total') {
        subtitle.textContent = "Какой будет тотал матча?";
        reelsData = [payloadData.options.map(opt => opt.value)];
    } else if (payloadData.type === 'score') {
        subtitle.textContent = "Какой будет точный счет?";
        const reel1Values = [...new Set(payloadData.options.map(opt => opt.value[0]))];
        const reel2Values = [...new Set(payloadData.options.map(opt => opt.value[1]))];
        reelsData = [reel1Values, reel2Values];
    } else {
        subtitle.textContent = "Ошибка: неизвестный тип игры.";
        return;
    }

    // Создаем и добавляем барабаны в контейнер
    reelsData.forEach((values, index) => {
        const reelContainer = document.createElement('div');
        reelContainer.className = 'reel-container';
        
        const reelUl = createReel(values);
        reelContainer.appendChild(reelUl);
        
        slotMachineContainer.appendChild(reelContainer);
        
        // Добавляем разделитель ":" если это второй барабан для режима "score"
        if (payloadData.type === 'score' && index === 0) {
            const separator = document.createElement('div');
            separator.className = 'separator';
            separator.textContent = ':';
            slotMachineContainer.appendChild(separator);
        }
    });

    // Активируем кнопку, когда все готово
    spinButton.disabled = false;
    spinButton.textContent = 'КРУТИТЬ!';
}

/**
 * Выполняет взвешенный случайный выбор из массива опций.
 * Это и есть "честный" розыгрыш, который происходит на клиенте.
 * @param {Array} options - Массив объектов вида { value, weight }.
 * @returns {*} - Выбранное значение (свойство 'value' из объекта).
 */
function weightedRandomChoice(options) {
    let totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let randomNum = Math.random() * totalWeight;

    for (const option of options) {
        if (randomNum < option.weight) {
            return option.value;
        }
        randomNum -= option.weight;
    }
    // На случай математической погрешности, возвращаем последний элемент
    return options[options.length - 1].value;
}


// --- ГЛАВНАЯ ЛОГИКА ---

/**
 * Функция, которая запускается по клику на кнопку "КРУТИТЬ!".
 * Имя `startSpin` сохранено для совместимости с `onclick` в HTML.
 */
function startSpin() {
    if (spinning) return;
    spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = 'ВРАЩАЕТСЯ...';
    
    // 1. ЧЕСТНЫЙ РОЗЫГРЫШ: Определяем результат ЗАРАНЕЕ, до начала анимации.
    const finalValue = weightedRandomChoice(payloadData.options);

    // 2. СРЕЖИССИРОВАННАЯ АНИМАЦИЯ: Запускаем прокрутку барабанов до нужного результата.
    const reels = document.querySelectorAll('.reel');
    
    reels.forEach((reel, index) => {
        // Определяем целевое значение для текущего барабана
        const targetValue = (payloadData.type === 'score') ? finalValue[index] : finalValue;
        
        const items = Array.from(reel.children);
        const itemHeight = items[0].offsetHeight;
        
        // Ищем индекс целевого элемента в ПОСЛЕДНЕЙ трети списка,
        // чтобы прокрутка была достаточно длинной и красивой.
        let targetIndex = -1;
        for (let i = items.length - 1; i >= items.length / 3; i--) {
            if (items[i].textContent === targetValue) {
                targetIndex = i;
                break;
            }
        }
        
        // Если по какой-то причине не нашли, берем первое попавшееся значение
        if (targetIndex === -1) {
            targetIndex = items.findIndex(item => item.textContent === targetValue);
        }

        // Вычисляем необходимое смещение барабана
        const offset = targetIndex * itemHeight;
        
        // Применяем transform. CSS сделает анимацию плавной.
        reel.style.transform = `translateY(-${offset}px)`;
    });
    
    // 3. ФИНАЛ: Отправляем результат боту ПОСЛЕ окончания анимации.
    // Вешаем слушатель события на ПЕРВЫЙ барабан. Он сработает один раз.
    reels[0].addEventListener('transitionend', () => {
        // Собираем итоговый текст результата
        const resultText = (payloadData.type === 'score') ? finalValue.join(' : ') : finalValue;
        
        // Готовим данные для отправки боту
        const resultData = {
            type: 'oracle_result',
            value: resultText,
        };
        tg.sendData(JSON.stringify(resultData));
        
        // Даем пользователю 1.5 секунды, чтобы он успел увидеть результат перед закрытием
        setTimeout(() => { tg.close(); }, 1500);
        
    }, { once: true });
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
window.addEventListener('load', () => {
    tg.expand();
    
    payloadData = getUrlParams();

    // Защита от ошибок: если данные не пришли или они некорректны.
    if (!payloadData || !payloadData.type || !payloadData.options || payloadData.options.length === 0) {
        subtitle.textContent = "Не удалось загрузить данные для игры.";
        spinButton.textContent = "ОШИБКА";
        tg.HapticFeedback.notificationOccurred('error'); // Виброотклик об ошибке
        return;
    }
    
    // Если данные в порядке, строим интерфейс
    buildUI();
});
