// Основные переменные
let scene, camera, renderer, controls, model, gridHelper;
let isGridVisible = true;
let originalGridOpacity = 0.5; // Сохраняем оригинальную прозрачность

// Импорты
import { getModelPath, showErrorMessage } from './model-utils.js';
import { setupLights } from './model-lights.js';
import { createAdaptiveGrid, updateGridPosition, checkCameraOrientation } from './model-grid.js';
import { addEdgesToObject } from './model-geometry.js';
import { setupCamera } from './model-camera.js';

/**
 * Инициализирует сцену
 */
function init() {
    const container = document.getElementById('model-container');
    if (!container) {
        console.error('Model container not found');
        return;
    }

    // Проверяем путь к модели
    const modelPath = getModelPath();
    console.log('Model path:', modelPath);

    if (!modelPath) {
        showErrorMessage('Путь к модели не указан. Проверьте данные проекта.');
        return;
    }

    // Создаем сцену
    scene = new THREE.Scene();

    // Создаем камеру и рендерер
    const canvas = document.getElementById('viewer');
    ({ camera, renderer, controls } = setupCamera(container, canvas));

    // Добавляем освещение
    setupLights(scene);

    // ИЗМЕНЕНИЕ 1: НЕ создаем сетку сразу, только после загрузки модели
    // createAdaptiveGrid(scene); // Убрали отсюда

    // Загружаем модель - сетка создастся внутри loadModel после загрузки
    loadModel();

    // Обработка изменения размера окна
    window.addEventListener('resize', onWindowResize);

    // Начинаем анимацию
    animate();
}

/**
 * Загружает модель
 */
function loadModel() {
    const modelPath = getModelPath();
    console.log('Loading model from:', modelPath);

    if (!modelPath) {
        showErrorMessage('Путь к модели не указан');
        return;
    }

    const loader = new THREE.GLTFLoader();

    loader.load(
        modelPath,
        function (gltf) {
            console.log('Model loaded successfully');
            model = gltf.scene;

            // ПРОСТОЕ ЦЕНТРИРОВАНИЕ:
            // 1. Находим границы модели
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());

            // 2. Смещаем модель так, чтобы ее центр был в (0,0,0)
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;

            // 3. Добавляем модель в сцену
            scene.add(model);

            // 4. Добавляем ребра
            addEdgesToObject(model);

            // ИЗМЕНЕНИЕ 2: СОЗДАЕМ СЕТКУ ТОЛЬКО ПОСЛЕ ЗАГРУЗКИ МОДЕЛИ
            createAdaptiveGrid(scene);
            
            // Получаем ссылку на gridHelper из глобальной области
            gridHelper = scene.getObjectByName('adaptiveGrid');
            
            // 5. ОБНОВЛЯЕМ ПОЗИЦИЮ СЕТКИ ПОСЛЕ ЗАГРУЗКИ МОДЕЛИ
            if (gridHelper) {
                updateGridPosition(model, gridHelper);
            }

            // 6. Настраиваем камеру
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            const distance = maxSize * 2;

            camera.position.set(distance, distance * 0.7, distance);
            camera.lookAt(0, 0, 0); // Смотрим точно в центр!

            // 7. Настраиваем контролы - САМОЕ ВАЖНОЕ!
            controls.target.set(0, 0, 0);
            controls.update();

            // Передаем структуру модели
            if (window.Specification && typeof window.Specification.saveModelStructure === 'function') {
                window.Specification.saveModelStructure(model);
            }
        },
        // onProgress callback
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // onError callback
        function (error) {
            console.error('Error loading model:', error);
            showErrorMessage('Не удалось загрузить модель. Проверьте путь к файлу: ' + modelPath);
        }
    );
}

/**
 * Обновляем функцию onWindowResize()
 */
function onWindowResize() {
    const container = document.getElementById('model-container');
    if (container && camera && renderer) {
        // Получаем актуальные размеры контейнера
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Обновляем камеру и рендерер
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        // Только обновляем позицию сетки, не меняем прозрачность
        if (gridHelper && model) {
            updateGridPosition(model, gridHelper);
        }
    }
}

// Делаем функцию доступной глобально
window.onWindowResize = onWindowResize;

/**
 * Анимация
 */
function animate() {
    requestAnimationFrame(animate);

    // Проверяем ориентацию камеры для сетки - ТОЛЬКО в анимационном цикле
    if (gridHelper && camera) {
        checkCameraOrientation(gridHelper, camera, isGridVisible, originalGridOpacity);
    }

    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Ждем загрузки THREE.js и других библиотек
function waitForThreeJS() {
    if (typeof THREE !== 'undefined' &&
        typeof THREE.OrbitControls !== 'undefined' &&
        typeof THREE.GLTFLoader !== 'undefined') {

        // Проверяем, установлен ли путь к модели
        const modelPath = getModelPath();
        if (!modelPath) {
            // Ждем еще немного
            setTimeout(waitForThreeJS, 100);
            return;
        }
        init();
    } else {
        setTimeout(waitForThreeJS, 100);
    }
}

// Запускаем инициализацию после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForThreeJS);
} else {
    waitForThreeJS();
}

// Экспортируем функции для использования в других модулях
window.ModelViewer = {
    init,
    loadModel,
    addEdgesToObject,
    showErrorMessage: window.showErrorMessage,
    getModel: () => model,
    getScene: () => scene,
    getCamera: () => camera,
    getControls: () => controls
};

// Делаем основные объекты глобальными для модального окна
setTimeout(() => {
    if (scene) window.scene = scene;
    if (camera) window.camera = camera;
    if (controls) window.controls = controls;
    if (model) window.model = model;
    console.log('Model objects made global');
}, 1000); // Через 1 секунду после загрузки

document.addEventListener('viewModeChanged', (event) => {
    if (event.detail.mode === '3D') {
        // Даем время DOM обновиться
        setTimeout(() => {
            if (typeof onWindowResize === 'function') {
                onWindowResize();
            }
        }, 150);
    }
});