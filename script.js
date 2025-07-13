// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ---
const tg = window.Telegram.WebApp;
const spinButton = document.getElementById('spin_button');
const slotMachineContainer = document.getElementById('slot_machine');
const subtitle = document.getElementById('subtitle');

let spinning = false;
let payloadData = null;

// --- ФУНКЦИИ ---

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
    
    // Единая длина ленты для синхронизации скорости
    const TARGET_LENGTH = 180;
    const repeatedValues = [];
    
    while (repeatedValues.length < TARGET_LENGTH) {
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

// ЭТА ФУНКЦИЯ БЫЛА СЛОМАНА. ВОТ ЕЕ ПРОСТАЯ РАБОЧАЯ ВЕРСИЯ
function buildUI() {
    // 1. Сброс "памяти"
    slotMachineContainer.innerHTML = '';
    tg.MainButton.hide();

    // 2. Определение данных (как в самой первой рабочей версии)
    let reelsData;
    let subtitleText = "Ошибка: неизвестный тип игры.";

    if (payloadData.type === 'winner' || payloadData.type === 'total' || payloadData.type === 'assessment' || payloadData.type === 'markets') {
         reelsData = [payloadData.options.map(opt => opt.value)];
         switch(payloadData.type) {
            case 'winner': subtitleText = "Кто же станет победителем?"; break;
            case 'total': subtitleText = "Какой будет тотал матча?"; break;
            case 'assessment': subtitleText = "Оценка обстановки в матче:"; break;
             case 'markets': subtitleText = "Прогноз на рынки:"; break;
         }
    } else if (payloadData.type === 'score') {
        subtitleText = "Какой будет точный счет?";
        const reel1Values = [...new Set(payloadData.options.map(opt => opt.value[0]))];
        const reel2Values = [...new Set(payloadData.options.map(opt => opt.value[1]))];
        reelsData = [reel1Values, reel2Values];
    }
    
    subtitle.textContent = subtitleText;

    // 3. Создание барабанов
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

    // 4. Активация кнопки - это единственное, что здесь должно происходить в конце.
    spinButton.disabled = false;
    spinButton.textContent = 'КРУТИТЬ!';
}

function setInitialPosition() {
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        // 1. Временно отключаем плавную анимацию
        reel.style.transition = 'none';

        const items = Array.from(reel.children);
        // Защита от пустого барабана
        if (items.length === 0) return;
        
        const itemHeight = items[0].offsetHeight;
        let targetValue = items[0].textContent; 
        
        // Для точного счета пытаемся найти '0'
        if (payloadData.type === 'score' && items.some(item => item.textContent === '0')) {
            targetValue = '0';
        }
        
        // Ищем индекс где-то в середине ленты, чтобы не было "перемотки" при загрузке
        const targetIndex = items.findIndex((item, idx) => 
            item.textContent === targetValue && idx > items.length / 2
        );
        
        const offset = targetIndex >= 0 ? targetIndex * itemHeight : 0;
        
        // 2. Мгновенно применяем трансформацию
        reel.style.transform = `translateY(-${offset}px)`;
    });
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


// ЭТА ФУНКЦИЯ БЫЛА СЛОМАНА. ВОТ ЕЕ ПРОСТАЯ РАБОЧАЯ ВЕРСИЯ
function startSpin() {
    if (spinning) return;
    spinning = true;

    tg.MainButton.hide();
    spinButton.disabled = true;
    spinButton.textContent = 'ВРАЩАЕТСЯ...';
    
    // Просто розыгрыш и запуск анимации. Никаких перезарядок и прочей хуйни.
    const finalValue = weightedRandomChoice(payloadData.options);
    const reels = document.querySelectorAll('.reel');

    reels.forEach((reel, index) => {
        // Устанавливаем анимацию ПЕРЕД трансформацией
        reel.style.transition = 'transform 3s cubic-bezier(.25, .1, .2, 1)';
        
        const targetValue = (payloadData.type === 'score') ? finalValue[index] : finalValue;
        const items = Array.from(reel.children);
        const itemHeight = items[0].offsetHeight;
        
        // Простой и надежный поиск индекса в последней части ленты
        let targetIndex = -1;
        for (let i = Math.floor(items.length * 0.9); i < items.length; i++) {
             if (items[i].textContent === targetValue) {
                targetIndex = i;
                break;
            }
        }
        // Если вдруг не нашли, берем самый последний элемент
        if (targetIndex === -1) targetIndex = items.length - 1; 

        const offset = targetIndex * itemHeight;
        reel.style.transform = `translateY(-${offset}px)`;
    });
    
    // Обработка финала
    reels[0].addEventListener('transitionend', () => {
        const resultText = (payloadData.type === 'score') ? finalValue.join(' : ') : finalValue;
        const resultData = { type: 'oracle_result', value: resultText };
        tg.sendData(JSON.stringify(resultData));

        spinButton.disabled = false;
        spinButton.textContent = 'ЕЩЕ РАЗ?';
        tg.MainButton.show();
        spinning = false; // Починка повторного вращения
        
    }, { once: true });
}


// --- ИНИЦИАЛИЗАЦИЯ ---
window.addEventListener('load', () => {
    tg.expand();
    
    // Настройка MainButton
    tg.MainButton.setText('Закрыть');
    tg.MainButton.onClick(() => tg.close());

    payloadData = getUrlParams();

    if (!payloadData || !payloadData.type || !payloadData.options || payloadData.options.length === 0) {
        subtitle.textContent = "Не удалось загрузить данные.";
        spinButton.textContent = "ОШИБКА";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    // Вызываем простую и рабочую функцию построения UI.
    buildUI();
});
