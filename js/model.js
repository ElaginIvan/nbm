// Основные переменные
let scene, camera, renderer, controls, model;

/**
 * Получает путь к модели из project-data
 * @returns {string} Путь к модели
 */
function getModelPath() {
    const projectData = document.getElementById('project-data');
    return projectData ? projectData.getAttribute('data-model-path') : '';
}

/**
 * Показывает сообщение об ошибке
 * @param {string} message - Сообщение об ошибке
 */
function showErrorMessage(message) {
    const container = document.getElementById('model-container');
    if (container) {
        container.innerHTML = `
            <div class="empty-state empty-state--error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

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

    // Создаем камеру
    camera = new THREE.PerspectiveCamera(26, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(5, 5, 5);

    // Создаем рендерер
    const canvas = document.getElementById('viewer');
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Прозрачный фон

    // Добавляем управление
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Добавляем освещение
    // Основное освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Увеличиваем ambient
    scene.add(ambientLight);

    // 1. Верхний свет
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(0, 50, 0);
    scene.add(directionalLight1);

    // 2. Нижний свет (чтобы было видно снизу)
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight2.position.set(0, -50, 0);
    scene.add(directionalLight2);

    // 3. Свет спереди-слева
    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight3.position.set(-30, 20, 30);
    scene.add(directionalLight3);

    // 4. Свет сзади-справа
    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight4.position.set(30, 10, -30);
    scene.add(directionalLight4);



    // Загружаем модель
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
        // onLoad callback
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

            // 5. Настраиваем камеру ПРОЩЕ:
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);

            // Простая формула для расстояния камеры
            const distance = maxSize * 2;

            camera.position.set(distance, distance * 0.7, distance);
            camera.lookAt(0, 0, 0); // Смотрим точно в центр!

            // 6. Настраиваем контролы - САМОЕ ВАЖНОЕ!
            controls.target.set(0, 0, 0); // Цель - центр сцены (куда мы поместили модель)
            controls.update();

            console.log('Model centered at (0,0,0)');
            console.log('Camera distance:', distance);

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
 * Добавляет ребра к объекту
 * @param {THREE.Object3D} object - Объект для добавления ребер
 * @param {number} edgeColor - Цвет ребер (по умолчанию 0xcccccc)
 */
function addEdgesToObject(object, edgeColor = 0x808080) {
    object.traverse((child) => {
        if (child.isMesh) {
            const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 35);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: edgeColor,
            });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            child.add(edges);

            // Добавляем уникальный идентификатор для каждой детали
            child.userData.isHighlightable = true;
        }
    });
}

/**
 * Обработка изменения размера окна
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

        console.log('Renderer resized to:', width, 'x', height);
    }
}

// Делаем функцию доступной глобально
window.onWindowResize = onWindowResize;

// Добавляем слушатель для выхода из полноэкранного режима
function setupFullscreenListeners() {
    document.addEventListener('fullscreenchange', onWindowResize);
    document.addEventListener('webkitfullscreenchange', onWindowResize);
}

// Инициализируем слушатели после загрузки
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFullscreenListeners);
} else {
    setupFullscreenListeners();
}

/**
 * Анимация
 */
function animate() {
    requestAnimationFrame(animate);

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
    showErrorMessage,
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

// Добавьте в конец model.js
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

