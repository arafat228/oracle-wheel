// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let theWheel;
let spinButton = document.getElementById('spin_button');
let wheelSpinning = false;
const segmentColors = ["#3498DB", "#E74C3C", "#2ECC71", "#F1C40F", "#9B59B6", "#1ABC9C", "#E67E22"];

// --- ФУНКЦИИ ---

function getUrlParams() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const dataParam = params.get('payload');
    if (!dataParam) {
        return [];
    }

    try {
        const correctedString = dataParam.replace(/\+/g, ' ');
        const segments = JSON.parse(correctedString);
        if (Array.isArray(segments) && segments.length > 0) {
            return segments;
        }
    } catch (e) {
        console.error("Ошибка парсинга данных из URL:", e);
    }
    return [];
}

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

function alertPrize(indicatedSegment) {
    const tg = window.Telegram.WebApp;
    alert("Вам выпало: " + indicatedSegment.text);
    const resultData = {
        type: 'oracle_wheel_result',
        text: indicatedSegment.text,
        value: indicatedSegment.value
    };
    tg.sendData(JSON.stringify(resultData));
    setTimeout(() => { tg.close(); }, 1500);
}

// Эта функция теперь находится в глобальной области видимости
function startSpin() {
    if (wheelSpinning === false) {
        spinButton.disabled = true;
        spinButton.textContent = 'ВРАЩАЕТСЯ...';
        theWheel.startAnimation();
        wheelSpinning = true;
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
window.addEventListener('load', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    const oddsData = getUrlParams();
    const segments = createSegments(oddsData);

    if (oddsData.length === 0) {
        document.getElementById('subtitle').textContent = 'Не удалось загрузить коэффициенты.';
        spinButton.disabled = true;
        return;
    }

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
});
