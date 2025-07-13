// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ---
const tg = window.Telegram.WebApp;
const spinButton = document.getElementById('spin_button');
const slotMachineContainer = document.getElementById('slot_machine');
const subtitle = document.getElementById('subtitle');

let spinning = false;
let payloadData = null;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

/**
 * Парсит данные из URL-хэша, которые передает бот.
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
 */
function createReel(values) {
    const reelUl = document.createElement('ul');
    reelUl.className = 'reel';
    
    // Дублируем значения для длинной и плавной прокрутки
    const repeatedValues = [];
    for (let i = 0; i < 30; i++) { // Увеличим количество для более надежного поиска
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
 * [НОВАЯ ФУНКЦИЯ] Устанавливает начальное положение барабанов без анимации.
 * Для режима "score" пытается установить на "0", для остальных - на первый элемент.
 */
function setInitialPosition() {
    const reels = document.querySelectorAll('.reel');
    reels.forEach((reel, index) => {
        // 1. Временно отключаем плавную анимацию
        reel.style.transition = 'none';

        const items = Array.from(reel.children);
        const itemHeight = items[0].offsetHeight;
        let targetValue = items[0].textContent; // По умолчанию - первый элемент
        
        // Для точного счета пытаемся найти '0'
        if (payloadData.type === 'score') {
            const zeroExists = items.some(item => item.textContent === '0');
            if (zeroExists) {
                targetValue = '0';
            }
        }
        
        // Ищем индекс целевого элемента где-то в середине ленты
        const targetIndex = items.findIndex((item, idx) => 
            item.textContent === targetValue && idx > items.length / 3
        );
        
        const offset = targetIndex >= 0 ? targetIndex * itemHeight : 0;
        
        // 2. Мгновенно применяем трансформацию
        reel.style.transform = `translateY(-${offset}px)`;

        // 3. Возвращаем плавную анимацию. Используем requestAnimationFrame,
        // чтобы браузер успел обработать мгновенное смещение перед включением анимации.
        requestAnimationFrame(() => {
            reel.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        });
    });
}


/**
 * Строит пользовательский интерфейс в зависимости от типа игры.
 */
function buildUI() {
    // Шаг 1: Полная очистка контейнера от предыдущих запусков.
    slotMachineContainer.innerHTML = '';

    // Определяем текст подзаголовка и данные для барабанов
    let reelsData;
    // ... (блок if/else остается таким же, как в прошлый раз)
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
    } else { // Обработаем новый тип "assessment" для лайва
        subtitle.textContent = "Оценка обстановки в матче:";
        reelsData = [payloadData.options.map(opt => opt.value)];
    }

    // Создаем и добавляем барабаны в контейнер
    reelsData.forEach((values, index) => {
        const reelContainer = document.createElement('div');
        reelContainer.className = 'reel-container';
        
        const reelUl = createReel(values);
        reelContainer.appendChild(reelUl);
        slotMachineContainer.appendChild(reelContainer);
        
        if (payloadData.type === 'score' && index === 0) {
            const separator = document.createElement('div');
            separator.className = 'separator';
            separator.textContent = ':';
            slotMachineContainer.appendChild(separator);
        }
    });

    // Шаг 2: Устанавливаем начальное положение барабанов ПОСЛЕ их создания.
    setInitialPosition();

    // Активируем кнопку
    spinButton.disabled = false;
    spinButton.textContent = 'КРУТИТЬ!';
}


/**
 * Функция, которая запускается по клику на кнопку "КРУТИТЬ!".
 */
function startSpin() {
    if (spinning) return;
    spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = 'ВРАЩАЕТСЯ...';
    
    // 1. ЧЕСТНЫЙ РОЗЫГРЫШ: Определяем результат ЗАРАНЕЕ.
    const finalValue = weightedRandomChoice(payloadData.options);

    // 2. АНИМАЦИЯ: Запускаем прокрутку до нужного результата.
    const reels = document.querySelectorAll('.reel');
    
    reels.forEach((reel, index) => {
        // Определяем целевое значение для текущего барабана
        const targetValue = (payloadData.type === 'score') ? finalValue[index] : finalValue;
        
        const items = Array.from(reel.children);
        const itemHeight = items[0].offsetHeight;
        
        // Ищем индекс целевого элемента в ПОСЛЕДНЕЙ трети списка
        let targetIndex = -1;
        for (let i = items.length - 1; i > items.length / 2; i--) {
            if (items[i].textContent === targetValue) {
                targetIndex = i;
                break;
            }
        }
        
        if (targetIndex === -1) {
            targetIndex = items.findIndex(item => item.textContent === targetValue);
            if (targetIndex === -1) targetIndex = items.length - 1; // Защита от сбоя
        }

        // Вычисляем смещение. Добавляем случайное "перескакивание" для живости
        const randomOffset = (Math.random() - 0.5) * itemHeight * 0.4;
        const offset = (targetIndex * itemHeight) + randomOffset;
        
        reel.style.transform = `translateY(-${offset}px)`;
    });
    
    // 3. ФИНАЛ: Отправляем результат боту ПОСЛЕ окончания анимации.
    reels[0].addEventListener('transitionend', () => {
        const resultText = (payloadData.type === 'score') ? finalValue.join(' : ') : finalValue;
        
        const resultData = {
            type: 'oracle_result',
            value: resultText,
        };
        tg.sendData(JSON.stringify(resultData));
        
        setTimeout(() => { tg.close(); }, 1500);
        
    }, { once: true });
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
window.addEventListener('load', () => {
    tg.expand();
    payloadData = getUrlParams();

    if (!payloadData || !payloadData.type || !payloadData.options || payloadData.options.length === 0) {
        subtitle.textContent = "Не удалось загрузить данные для игры.";
        spinButton.textContent = "ОШИБКА";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    buildUI();
});
