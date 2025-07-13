// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ---
const tg = window.Telegram.WebApp;
const spinButton = document.getElementById('spin_button');
const slotMachineContainer = document.getElementById('slot_machine');
const subtitle = document.getElementById('subtitle');

let spinning = false;
let payloadData = null;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

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

function createReel(values) {
    const reelUl = document.createElement('ul');
    reelUl.className = 'reel';
    
    // Дублируем значения, чтобы лента была длинной
    const repeatedValues = [];
    // 30 циклов - хороший баланс между длиной и производительностью
    for (let i = 0; i < 30; i++) {
        // Перемешиваем на каждой итерации для визуального разнообразия
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
 * [ИСПРАВЛЕННАЯ И УПРОЩЕННАЯ] Строит UI и устанавливает начальное положение.
 */
function buildUI() {
    // 1. Полностью очищаем контейнер. Это исправляет баг "памяти".
    slotMachineContainer.innerHTML = '';

    // 2. Определяем данные для барабанов.
    let reelsData;
    if (payloadData.type === 'winner' || payloadData.type === 'total' || payloadData.type === 'assessment') {
        subtitle.textContent = payloadData.type === 'winner' ? "Кто же станет победителем?" : 
                               payloadData.type === 'total' ? "Какой будет тотал матча?" : "Оценка обстановки в матче:";
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

    // 3. Создаем и наполняем барабаны.
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

    // 4. Устанавливаем начальное положение БЕЗ АНИМАЦИИ.
    // Оборачиваем в setTimeout(..., 0), чтобы браузер успел отрисовать элементы
    // перед тем, как мы их сдвинем. Это надежнее, чем requestAnimationFrame.
    setTimeout(() => {
        const reels = document.querySelectorAll('.reel');
        reels.forEach(reel => {
            reel.style.transition = 'none'; // Отключаем анимацию
            
            const items = Array.from(reel.children);
            const itemHeight = items[0].offsetHeight;
            let targetValue = items[0].textContent; // Значение по умолчанию

            // Для 'score' пытаемся найти '0'
            if (payloadData.type === 'score' && items.some(item => item.textContent === '0')) {
                targetValue = '0';
            }

            // Ищем индекс где-то в середине ленты
            const targetIndex = items.findIndex((item, idx) => 
                item.textContent === targetValue && idx > items.length / 2
            );

            const offset = targetIndex > 0 ? targetIndex * itemHeight : 0;
            reel.style.transform = `translateY(-${offset}px)`; // Мгновенно сдвигаем
        });

        // Активируем кнопку только после установки начальной позиции
        spinButton.disabled = false;
        spinButton.textContent = 'КРУТИТЬ!';

    }, 0);
}


function weightedRandomChoice(options) {
    let totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let randomNum = Math.random() * totalWeight;
    for (const option of options) {
        if (randomNum < option.weight) return option.value;
        randomNum -= option.weight;
    }
    return options[options.length - 1].value;
}

/**
 * [ИСПРАВЛЕННАЯ И УПРОЩЕННАЯ] Функция запуска вращения.
 */
function startSpin() {
    if (spinning) return;
    spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = 'ВРАЩАЕТСЯ...';
    
    // 1. Розыгрыш результата.
    const finalValue = weightedRandomChoice(payloadData.options);

    // 2. Анимация.
    const reels = document.querySelectorAll('.reel');
    reels.forEach((reel, index) => {
        // ВОЗВРАЩАЕМ АНИМАЦИЮ ПРЯМО ПЕРЕД ТРАНСФОРМАЦИЕЙ
        reel.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        
        const targetValue = (payloadData.type === 'score') ? finalValue[index] : finalValue;
        
        const items = Array.from(reel.children);
        const itemHeight = items[0].offsetHeight;

        // Ищем индекс целевого элемента в ПОСЛЕДНЕЙ трети списка.
        // Используем простой findIndex.
        let targetIndex = -1;
        // Начнем поиск с конца, чтобы найти самый "дальний" подходящий элемент
        for(let i = items.length - 1; i >=0; i--) {
            if (items[i].textContent === targetValue) {
                targetIndex = i;
                // Ищем не в самом конце, а чуть ближе, чтобы избежать рывков
                if (i < items.length - 5) break; 
            }
        }
        
        // Запасной вариант, если ничего не нашлось
        if (targetIndex === -1) targetIndex = items.length - 1;

        const offset = targetIndex * itemHeight;
        reel.style.transform = `translateY(-${offset}px)`;
    });
    
    // 3. Финал (обработка завершения анимации).
    reels[0].addEventListener('transitionend', () => {
        // Отправляем результат боту, как и раньше
        const resultText = (payloadData.type === 'score') ? finalValue.join(' : ') : finalValue;
        const resultData = {
            type: 'oracle_result',
            value: resultText,
        };
        tg.sendData(JSON.stringify(resultData));

        // Убираем автозакрытие
        // setTimeout(() => { tg.close(); }, 1500);

        // Меняем состояние кнопки "Крутить"
        spinButton.disabled = false;
        spinButton.textContent = 'ЕЩЕ РАЗ?';

        // Показываем Главную Кнопку для выхода
        tg.MainButton.show();
        spinning = false;
    }, { once: true });
}

// --- ИНИЦИАЛИЗАЦИЯ ---
window.addEventListener('load', () => {
    tg.expand();
    tg.MainButton.setText('Закрыть');
    tg.MainButton.onClick(() => tg.close());
    payloadData = getUrlParams();

    if (!payloadData || !payloadData.type || !payloadData.options || payloadData.options.length === 0) {
        subtitle.textContent = "Не удалось загрузить данные.";
        spinButton.textContent = "ОШИБКА";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    buildUI();
});
